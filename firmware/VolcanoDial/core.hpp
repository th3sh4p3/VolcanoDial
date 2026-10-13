#pragma once
#include <ArduinoJson.h>
#include <algorithm>
#include <cmath>
#include <cctype>
#include <cstdlib>
#include <functional>
#include <map>
#include <set>
#include <string>
#include <vector>

namespace vd {
inline std::string str(JsonVariantConst v) { const char* p=v.as<const char*>(); return p?p:""; }
enum class ActionType { Heat, Wait, Air, HeatOff, Confirm };
inline const char* actionName(ActionType t) { switch(t){case ActionType::Heat:return "reachTemperature";case ActionType::Wait:return "wait";case ActionType::Air:return "air";case ActionType::Confirm:return "confirmBalloon";default:return "heaterOff";} }
struct Action { ActionType type; double value=0,seconds=0; };
struct Stage { std::string name; std::vector<Action> actions; };
struct Plan { bool workflow=false; std::string name; std::vector<Stage> stages; };
struct Value { double n=NAN; std::string type="scalar"; };

// Same deliberately small arithmetic language and unit rules as the desktop app.
class Expression {
  std::string s; size_t pos=0; unsigned depth=0; std::string& err;
  std::function<Value(const std::string&)> resolve;
  void ws(){while(pos<s.size()&&std::isspace((unsigned char)s[pos]))++pos;}
  char peek(){ws();return pos<s.size()?s[pos]:0;}
  Value bad(const char* m){if(err.empty())err=m;return {};}
  Value primary(){
    if(++depth>32){--depth;return bad("Formel zu tief verschachtelt");}
    Value v;char c=peek();
    if(c=='+'||c=='-'){++pos;v=primary();if(c=='-')v.n=-v.n;}
    else if(c=='('){++pos;v=add();if(peek()!=')')v=bad("Schliessende Klammer fehlt");else ++pos;}
    else if(c>='0'&&c<='9'){
      size_t begin=pos;while(pos<s.size()&&std::isdigit((unsigned char)s[pos]))++pos;
      if(pos<s.size()&&s[pos]=='.'){++pos;size_t dec=pos;while(pos<s.size()&&std::isdigit((unsigned char)s[pos]))++pos;if(pos==dec)v=bad("Dezimalzahl unvollstaendig");}
      if(err.empty())v.n=std::strtod(s.substr(begin,pos-begin).c_str(),nullptr);
    }else if(std::isalpha((unsigned char)c)||c=='_'){
      size_t begin=pos++;while(pos<s.size()&&(std::isalnum((unsigned char)s[pos])||s[pos]=='_'))++pos;v=resolve(s.substr(begin,pos-begin));
    }else v=bad("Zahl, Variable oder Klammer erwartet");
    --depth;return v;
  }
  Value combine(Value a,Value b,char op){
    std::string t;
    if(op=='+'||op=='-'){if(a.type==b.type)t=a.type;else if(a.type=="scalar")t=b.type;else if(b.type=="scalar")t=a.type;}
    else if(op=='*'){if(a.type=="scalar")t=b.type;else if(b.type=="scalar")t=a.type;}
    else {if(b.n==0)return bad("Division durch null");if(b.type=="scalar")t=a.type;else if(a.type==b.type)t="scalar";}
    if(t.empty())return bad("Unvereinbare Variablentypen");
    return {op=='+'?a.n+b.n:op=='-'?a.n-b.n:op=='*'?a.n*b.n:a.n/b.n,t};
  }
  Value mul(){Value a=primary();while(err.empty()&&(peek()=='*'||peek()=='/')){char c=s[pos++];a=combine(a,primary(),c);}return a;}
  Value add(){Value a=mul();while(err.empty()&&(peek()=='+'||peek()=='-')){char c=s[pos++];a=combine(a,mul(),c);}return a;}
 public:
  Expression(std::string source,std::string& error,std::function<Value(const std::string&)> resolver):s(std::move(source)),err(error),resolve(std::move(resolver)){}
  Value eval(){if(s.empty()||s.size()>512)return bad("Formel leer oder zu lang");Value v=add();if(peek())return bad("Ungueltiges Formelzeichen");if(!std::isfinite(v.n))return bad("Formelergebnis ist nicht endlich");return v;}
};

class Compiler {
  std::map<std::string,JsonVariantConst> definitions;
  std::map<std::string,Value> resolved;
  std::set<std::string> resolving;
  size_t count=0;
  bool fail(const std::string& e){if(error.empty())error=e;return false;}
  bool number(double n,double lo,double hi,const char* label){return std::isfinite(n)&&n>=lo&&n<=hi?true:fail(std::string(label)+": Wert ausserhalb des Bereichs");}
  static bool nameOK(const std::string& n){if(n.empty()||n.size()>64||!(std::isalpha((unsigned char)n[0])||n[0]=='_'))return false;return std::all_of(n.begin(),n.end(),[](char c){return std::isalnum((unsigned char)c)||c=='_';});}
  Value resolve(const std::string& name){
    if(resolved.count(name))return resolved[name];
    if(!definitions.count(name)){fail("Unbekannte Variable: "+name);return {};}
    if(resolving.count(name)||resolving.size()>=32){fail("Zyklische oder zu tiefe Variablen: "+name);return {};}
    resolving.insert(name);auto d=definitions[name];std::string type=str(d["valueType"]);if(type.empty())type="scalar";
    JsonVariantConst b=d["binding"];double n=b.isNull()?d["value"].as<double>():binding(b,type);
    if(b.isNull()&&!d["value"].is<double>())fail("Variablenwert fehlt");
    resolving.erase(name);return resolved[name]={n,type};
  }
  double binding(JsonVariantConst b,const std::string& type){
    std::string mode=str(b["mode"]);if(mode.empty()||mode=="literal"){
      if(!b["value"].is<double>()){fail("Numerischer Wert fehlt");return NAN;}double n=b["value"].as<double>();if(!std::isfinite(n))fail("Numerischer Wert ungueltig");return n;
    }
    if(mode!="expression"){fail("Unbekannter Formelmodus");return NAN;}
    auto v=Expression(str(b["expression"]),error,[this](const std::string& n){return resolve(n);}).eval();
    if(v.type!=type&&v.type!="scalar")fail("Formel hat falsche Einheit");return v.n;
  }
  bool variables(JsonVariantConst globals,JsonVariantConst locals,int air){
    definitions.clear();resolved.clear();resolving.clear();
    for(auto list:{globals,locals}){
      if(!list.isNull()&&!list.is<JsonArrayConst>())return fail("Variablenliste ungueltig");
      if(list.size()>32)return fail("Maximal 32 Variablen je Liste");
      for(auto d:list.as<JsonArrayConst>()){
        auto n=str(d["name"]);auto t=str(d["valueType"]);
        if(!nameOK(n)||definitions.count(n))return fail("Variablenname ungueltig oder doppelt: "+n);
        if(!t.empty()&&t!="scalar"&&t!="duration"&&t!="temperature")return fail("Variablentyp ungueltig");definitions[n]=d;
      }
    }
    resolved["airActionCount"]={double(air),"scalar"};
    for(auto& d:definitions){resolve(d.first);if(!error.empty())return false;}return true;
  }
  bool graph(JsonVariantConst g,bool workflow,std::vector<JsonVariantConst>& order){
    if(!g["nodes"].is<JsonArrayConst>()||!g["edges"].is<JsonArrayConst>())return fail("Graph benoetigt nodes und edges");
    if(g["nodes"].size()>128)return fail("Maximal 128 Knoten je Graph");
    std::map<std::string,JsonVariantConst> nodes;std::map<std::string,std::string> next,prev;std::string start,end;
    for(auto n:g["nodes"].as<JsonArrayConst>()){
      std::string id=str(n["id"]),t=str(n["type"]);
      if(id.empty()||id.size()>80||nodes.count(id))return fail("Knoten-ID fehlt oder doppelt");nodes[id]=n;
      if(t=="start"){if(!start.empty())return fail("Mehrere Startknoten");start=id;}
      else if(t=="end"){if(!end.empty())return fail("Mehrere Endknoten");end=id;}
      else if(workflow?t!="preset":(t!="reachTemperature"&&t!="wait"&&t!="air"&&t!="heaterOff"&&t!="confirmBalloon"))return fail("Unbekannter Knotentyp: "+t);
    }
    if(start.empty()||end.empty())return fail("Start oder Ende fehlt");
    for(auto e:g["edges"].as<JsonArrayConst>()){
      auto a=str(e["source"]),b=str(e["target"]);
      if(!nodes.count(a)||!nodes.count(b)||next.count(a)||prev.count(b))return fail("Ungueltige oder verzweigte Verbindung");next[a]=b;prev[b]=a;
    }
    if(prev.count(start)||next.count(end))return fail("Start/Ende falsch verbunden");
    std::set<std::string> visited;std::string id=start;
    while(true){if(visited.count(id))return fail("Graph enthaelt Zyklus");visited.insert(id);order.push_back(nodes[id]);if(id==end)break;if(!next.count(id))return fail("Graph erreicht Ende nicht");id=next[id];}
    if(visited.size()!=nodes.size())return fail("Graph enthaelt unverbundene Knoten");return true;
  }
  bool action(Stage& st,Action a){if(++count>512)return fail("Maximal 512 Aktionen im gewaehlten Ablauf");st.actions.push_back(a);return true;}
  bool preset(JsonVariantConst p,JsonVariantConst globals,Stage& st){
    st.name=str(p["name"]);std::string kind=str(p["kind"]);if(st.name.empty())return fail("Presetname fehlt");
    if(kind.empty()||kind=="simple"){
      double a=p["startTemp"].as<double>(),b=p["endTemp"].as<double>(),fill=p["fillTime"].as<double>(),n=p["steps"].as<double>();
      for(auto field:{"startTemp","endTemp","fillTime","steps"})if(!p[field].is<double>())return fail("Presetparameter fehlt");
      if(!number(a,40,230,"Starttemperatur")||!number(b,a,230,"Endtemperatur")||!number(fill,5,300,"Fuellzeit")||!number(n,1,20,"Schritte")||n!=std::floor(n))return fail("Ungueltiges einfaches Preset");
      for(int i=0;i<int(n);++i){double t=n==1?b:std::floor(a+(b-a)*i/(n-1)+0.5);if(!action(st,{ActionType::Heat,t,360})||!action(st,{ActionType::Wait,0,2})||!action(st,{ActionType::Air,0,fill/n}))return false;}return true;
    }
    if(kind!="advanced")return fail("Unbekannter Presettyp");
    std::vector<JsonVariantConst> nodes;if(!graph(p["graph"],false,nodes))return false;
    int air=0;for(auto n:nodes)if(str(n["type"])=="air")air++;
    if(!variables(globals,p["variables"],air))return false;
    for(auto n:nodes){auto t=str(n["type"]);auto cfg=n["config"];
      if(t=="reachTemperature"){
        double temp=binding(cfg["temperature"],"temperature"),timeout=cfg["timeout"].isNull()?360:binding(cfg["timeout"],"duration");
        if(!number(temp,40,230,"Temperatur")||!number(timeout,1,1800,"Heizzeitlimit")||!action(st,{ActionType::Heat,temp,timeout}))return false;
      }else if(t=="air"||t=="wait"){
        double secs=binding(cfg["duration"],"duration");if(!number(secs,0.1,3600,"Dauer")||!action(st,{t=="air"?ActionType::Air:ActionType::Wait,0,secs}))return false;
      }else if(t=="confirmBalloon"){
        double secs=cfg["timeout"].isNull()?120:binding(cfg["timeout"],"duration");
        if(!number(secs,1,600,"Ballon-Bestaetigungszeit")||!action(st,{ActionType::Confirm,0,secs}))return false;
      }else if(t=="heaterOff"&&!action(st,{ActionType::HeatOff}))return false;
      if(!error.empty())return false;
    }return true;
  }
 public:
  std::string error;
  bool compile(JsonVariantConst lib,JsonVariantConst ref,Plan& out){
    error.clear();count=0;out=Plan{};
    if(lib["settingsVersion"].as<int>()!=2)return fail("Bibliotheksversion 2 erforderlich");
    auto kind=str(ref["kind"]),id=str(ref["id"]);if(kind!="preset"&&kind!="workflow")return fail("Auswahltyp ungueltig");
    JsonVariantConst entity;for(auto e:lib[kind=="workflow"?"workflows":"presets"].as<JsonArrayConst>())if(str(e["id"])==id)entity=e;
    if(entity.isNull())return fail("Auswahl nicht gefunden");out.name=str(entity["name"]);out.workflow=kind=="workflow";
    if(!out.workflow){Stage st;if(!preset(entity,lib["globalVariables"],st))return false;out.stages.push_back(std::move(st));}
    else{
      std::vector<JsonVariantConst> nodes;if(!graph(entity["graph"],true,nodes))return false;
      std::string source=str(entity["fillTimeSource"]);if(source.empty())source="presets";
      if(source!="presets"&&source!="ui")return fail("Fuellzeitquelle ungueltig");double fill=entity["fillTime"].as<double>();
      if(source=="ui"&&!number(fill,5,300,"Workflow-Fuellzeit"))return false;
      for(auto n:nodes)if(str(n["type"])=="preset"){
        JsonVariantConst found;for(auto p:lib["presets"].as<JsonArrayConst>())if(str(p["id"])==str(n["config"]["presetId"]))found=p;
        if(found.isNull())return fail("Workflow referenziert fehlendes Preset");Stage st;if(!preset(found,lib["globalVariables"],st))return false;
        if(source=="ui"){double total=0;for(auto a:st.actions)if(a.type==ActionType::Air)total+=a.seconds;if(total>0)for(auto& a:st.actions)if(a.type==ActionType::Air)a.seconds*=fill/total;}
        out.stages.push_back(std::move(st));if(out.stages.size()>32)return fail("Maximal 32 Presets je Workflow");
      }if(out.stages.empty())return fail("Workflow ist leer");
    }return error.empty();
  }
  bool validate(JsonVariantConst lib){
    error.clear();std::set<std::string> ids;
    if(lib["settingsVersion"].as<int>()!=2)return fail("Bibliotheksversion 2 erforderlich");
    if(!lib["presets"].is<JsonArrayConst>()||!lib["workflows"].is<JsonArrayConst>()||!lib["globalVariables"].is<JsonArrayConst>())return fail("Bibliothek unvollstaendig");
    if(lib["presets"].size()>32||lib["workflows"].size()>16)return fail("Maximal 32 Presets und 16 Workflows");
    if(!variables(lib["globalVariables"],JsonVariantConst{},0))return false;
    for(auto list:{"presets","workflows","globalVariables"})for(auto e:lib[list].as<JsonArrayConst>()){
      auto id=str(e["id"]);if(id.empty()||id.size()>80||ids.count(id)||str(e["name"]).empty()||str(e["name"]).size()>96)return fail("Name oder ID ungueltig/doppelt");ids.insert(id);
    }
    for(auto list:{"presets","workflows"})for(auto e:lib[list].as<JsonArrayConst>()){
      JsonDocument r;r["id"]=e["id"];r["kind"]=std::string(list)=="presets"?"preset":"workflow";Plan p;if(!compile(lib,r,p))return false;
    }return true;
  }
};

struct Snapshot {
  bool connected=false,valid=false,heat=false,fan=false,heatRequested=false,fanRequested=false,interlock=false;
  double current=NAN,target=NAN;uint64_t sampleAt=0,statusAt=0;bool fault=false;double fanTotalMs=NAN;
};
inline bool safe(const Snapshot& s,uint64_t now){return s.connected&&s.valid&&!s.fault&&now>=s.statusAt&&now-s.statusAt<=1500&&!s.heat&&!s.fan&&!s.heatRequested&&!s.fanRequested&&!s.interlock;}
inline bool freshCool(const Snapshot& s,uint64_t now,double threshold){return safe(s,now)&&std::isfinite(s.current)&&s.current>=0&&s.current<=250&&s.current<=threshold&&now>=s.sampleAt&&now-s.sampleAt<=1000;}
struct DeviceIO { virtual ~DeviceIO()=default;virtual Snapshot snapshot()=0;virtual bool target(double)=0;virtual bool restoreTarget(double c){return target(c);}virtual bool heat(bool)=0;virtual bool fan(bool)=0;virtual bool refreshTemperature(){return true;}virtual bool refreshStatus(){return false;}virtual uint64_t monotonic(){return 0;}virtual bool manualAirCancelled(){return false;}virtual std::string failureDetail(){return {};} };
enum class Phase { Idle,Running,AwaitingNext,Complete,Aborted,Error };
inline const char* phaseName(Phase p){switch(p){case Phase::Running:return "running";case Phase::AwaitingNext:return "awaitingNext";case Phase::Complete:return "complete";case Phase::Aborted:return "aborted";case Phase::Error:return "error";default:return "idle";}}
class Engine {
  DeviceIO& io;Plan plan;double previousTarget=NAN;bool active=false,airOn=false;
  uint64_t began=0,deadline=0,lastTick=0;double airGoalMs=0,airElapsedMs=0,fanBaseline=0;
  bool restartPending=false;size_t stoppedStage=0;
  uint64_t stamp(uint64_t n){return std::max(n,io.monotonic());}
  bool outputsOff(){bool a=io.fan(false);bool b=io.heat(false);return a&&b;}
  void finish(Phase p,uint64_t now,const std::string& why=""){
    error=why;bool off=outputsOff();bool restored=true;if(off&&io.snapshot().connected&&std::isfinite(previousTarget))restored=io.restoreTarget(previousTarget);
    active=false;airOn=false;phase=off&&restored?p:Phase::Error;
    if(!off||!restored){if(!error.empty())error+="; ";error+=!off?"AUS nicht bestaetigt. Geraet kontrollieren!":"Ausgaenge AUS; vorherige Zieltemperatur nicht wiederhergestellt";}lastTick=stamp(now);
  }
  void failed(uint64_t now,const std::string& e){auto detail=io.failureDetail();finish(Phase::Error,now,e+(detail.empty()?"":": "+detail));}
 public:
  Phase phase=Phase::Idle;size_t stageIndex=0,actionIndex=0;std::string error;double remaining=0;uint64_t checkpointAt=0;
  explicit Engine(DeviceIO& device):io(device){}
  bool busy()const{return phase==Phase::Running||phase==Phase::AwaitingNext;}
  bool awaitingBalloon()const{return phase==Phase::Running&&active&&stageIndex<plan.stages.size()&&actionIndex<plan.stages[stageIndex].actions.size()&&plan.stages[stageIndex].actions[actionIndex].type==ActionType::Confirm;}
  bool confirmBalloon(uint64_t now){
    if(!awaitingBalloon())return false;
    now=stamp(now);auto s=io.snapshot();
    if(!s.connected||!s.valid||s.fault||now<s.statusAt||now-s.statusAt>1500||!s.heat||!s.heatRequested||s.fan||s.fanRequested||s.interlock==false){failed(now,"Ballon-Bestaetigung: Volcano-Status ungueltig");return false;}
    if(now>=deadline){failed(now,"Ballon nicht bestaetigt (Zeitlimit)");return false;}
    ++actionIndex;active=false;remaining=0;lastTick=now;return true;
  }
  const Plan& currentPlan()const{return plan;}
  bool replaceUpcomingStage(const Stage& next){
    if(phase!=Phase::AwaitingNext||stageIndex+1>=plan.stages.size()||plan.stages[stageIndex+1].name!=next.name)return false;
    plan.stages[stageIndex+1]=next;return true;
  }
  bool canRestartStage()const{return restartPending&&phase==Phase::Aborted&&plan.workflow&&stoppedStage<plan.stages.size();}
  size_t restartStageIndex()const{return stoppedStage;}
  void discardStageRestart(){restartPending=false;}
  bool start(const Plan& p,uint64_t now,size_t firstStage=0){
    if(busy()||p.stages.empty()||firstStage>=p.stages.size()||!io.snapshot().connected)return false;
    restartPending=false;plan=p;previousTarget=io.snapshot().target;phase=Phase::Running;stageIndex=firstStage;actionIndex=0;active=airOn=false;error.clear();airGoalMs=airElapsedMs=0;remaining=0;lastTick=stamp(now);
    if(!outputsOff()){failed(now,"Ausgangszustand nicht bestaetigt");return false;}fanBaseline=io.snapshot().fanTotalMs;return true;
  }
  bool next(uint64_t now){
    if(phase!=Phase::AwaitingNext)return false;
    auto s=io.snapshot();uint64_t n=stamp(now);
    // A missed optional read may leave the idle checkpoint temporarily
    // unverified. Refresh once before accepting an explicit next-stage press.
    if(!safe(s,n)&&s.connected&&!s.fault&&io.refreshStatus()){s=io.snapshot();n=stamp(now);}
    if(s.fault){failed(n,"Volcano-Status ungueltig oder Geraetefehler");return false;}
    if(!safe(s,n))return false;
    if(!outputsOff()){failed(n,"AUS nicht bestaetigt");return false;}
    ++stageIndex;actionIndex=0;active=airOn=false;airGoalMs=airElapsedMs=0;fanBaseline=io.snapshot().fanTotalMs;phase=Phase::Running;lastTick=stamp(n);return true;
  }
  void stop(uint64_t now){
    if(busy()){
      // A checkpoint's current preset is already complete. A deliberate next
      // start targets the first unfinished preset, never replays completed ones.
      size_t candidate=stageIndex+(phase==Phase::AwaitingNext?1:0);bool workflow=plan.workflow;
      finish(Phase::Aborted,now);stoppedStage=candidate;restartPending=workflow&&phase==Phase::Aborted&&candidate<plan.stages.size();
    }else if(!outputsOff()){restartPending=false;phase=Phase::Error;error="AUS nicht bestaetigt";}
  }
  bool manualFan(bool on){return !busy()&&io.snapshot().connected&&io.fan(on);}
  void tick(uint64_t now){
    if(!busy())return;auto s=io.snapshot();now=stamp(now);
    if(!s.connected){phase=Phase::Error;error="Bluetooth getrennt. Ausgaenge unbekannt!";active=false;return;}
    // At a confirmed OFF checkpoint, a single missed status read is not an
    // active-output failure. Keep the checkpoint; next() demands fresh OFF
    // evidence before any subsequent stage can run.
    if(phase==Phase::AwaitingNext&&!s.fault&&!s.heat&&!s.fan&&!s.heatRequested&&!s.fanRequested&&!s.interlock&&(!s.valid||now<s.statusAt||now-s.statusAt>1500)){lastTick=now;return;}
    if(!s.valid||s.fault||now<s.statusAt||now-s.statusAt>1500){failed(now,"Volcano-Status ungueltig oder Geraetefehler");return;}
    if(std::isfinite(s.fanTotalMs)&&std::isfinite(fanBaseline))airElapsedMs=std::max(0.0,s.fanTotalMs-fanBaseline);else if(airOn)airElapsedMs+=double(now-lastTick);lastTick=now;
    if(phase==Phase::AwaitingNext)return;
    auto& st=plan.stages[stageIndex];
    if(actionIndex>=st.actions.size()){
      if(!outputsOff()){failed(now,"AUS nicht bestaetigt");return;}
      if(stageIndex+1<plan.stages.size()){phase=Phase::AwaitingNext;checkpointAt=stamp(now);remaining=0;}
      else finish(Phase::Complete,now);return;
    }
    const auto& a=st.actions[actionIndex];
    if(!active){
      began=now;
      if(a.type==ActionType::Heat){if(!io.target(a.value)){failed(now,"Solltemperatur nicht bestaetigt");return;}if(!io.heat(true)){failed(now,"Heizen nicht bestaetigt");return;}deadline=stamp(now)+uint64_t(a.seconds*1000);if(!io.refreshTemperature()){failed(now,"Temperaturmessung nicht bestaetigt");return;}}
      else if(a.type==ActionType::Wait||a.type==ActionType::Confirm){deadline=now+uint64_t(a.seconds*1000);if(a.type==ActionType::Confirm&&(s.fan||s.fanRequested||!s.heat||!s.heatRequested)){failed(now,"Ballon-Bestaetigung: Ausgangszustand ungueltig");return;}}
      else if(a.type==ActionType::Air){airGoalMs+=a.seconds*1000;if(airElapsedMs<airGoalMs){if(!io.fan(true)){failed(now,"Lueftung EIN nicht bestaetigt");return;}airOn=true;lastTick=stamp(now);}}
      else if(!io.heat(false)){failed(now,"Heizung AUS nicht bestaetigt");return;}
      active=true;now=stamp(now);s=io.snapshot();if(std::isfinite(s.fanTotalMs)&&std::isfinite(fanBaseline))airElapsedMs=std::max(0.0,s.fanTotalMs-fanBaseline);
    }
    bool done=false;
    if(a.type==ActionType::Heat){if(!std::isfinite(s.current)||now-s.sampleAt>1500){failed(now,"Temperaturmessung veraltet");return;}done=s.current>=a.value-1;remaining=double(deadline>now?deadline-now:0)/1000;if(!done&&now>=deadline){failed(now,"Heizzeitlimit ueberschritten");return;}}
    else if(a.type==ActionType::Wait){done=now>=deadline;remaining=double(deadline>now?deadline-now:0)/1000;}
    else if(a.type==ActionType::Confirm){remaining=double(deadline>now?deadline-now:0)/1000;if(!s.heat||!s.heatRequested||s.fan||s.fanRequested){failed(now,"Ballon-Bestaetigung: Ausgangszustand ungueltig");return;}if(now>=deadline){failed(now,"Ballon nicht bestaetigt (Zeitlimit)");return;}}
    else if(a.type==ActionType::Air){remaining=std::max(0.0,airGoalMs-airElapsedMs)/1000;done=remaining<=0;if(!done&&!s.fan){failed(now,"Lueftung vorzeitig ausgefallen");return;}if(done){if(!io.fan(false)){failed(now,"Lueftung AUS nicht bestaetigt");return;}auto after=io.snapshot();if(std::isfinite(after.fanTotalMs)&&std::isfinite(fanBaseline))airElapsedMs=std::max(0.0,after.fanTotalMs-fanBaseline);else airElapsedMs+=double(stamp(now)-lastTick);airOn=false;}}
    else done=true;
    if(done){++actionIndex;active=false;remaining=0;}
  }
};

class Cooldown {
  std::string identity;int below=0;uint64_t lastSample=0;
 public:
  bool armed=false;
  void arm(const std::string& id){identity=id;below=0;lastSample=0;armed=true;}
  void cancel(){armed=false;below=0;lastSample=0;}
  bool observe(const Snapshot& s,const std::string& id,uint64_t now,double threshold,bool busy){
    if(!armed)return false;if(id!=identity){cancel();return false;}
    if(!s.connected||busy||!safe(s,now)||!std::isfinite(s.current)||s.current<0||s.current>250||now<s.sampleAt||now-s.sampleAt>1000){below=0;return false;}
    if(s.sampleAt==lastSample)return false;lastSample=s.sampleAt;
    if(s.current>threshold){below=0;return false;}
    // Observation authorizes an OFF attempt; only its acknowledgement cancels.
    below=std::min(below+1,2);return below>=2;
  }
};
class HoldGate {
  bool releaseRequired=false;
 public:
  bool update(bool held,bool locked,uint64_t now,uint64_t seen){
    if(locked){releaseRequired=true;return false;}
    if(now<seen||now-seen>150){releaseRequired=true;return false;}
    if(!held){releaseRequired=false;return false;}return !releaseRequired;
  }
};
} // namespace vd
