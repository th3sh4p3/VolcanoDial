#include <M5Dial.h>
#include <M5Chain.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <sys/time.h>
#include "adapters.hpp"
#include "web_assets.hpp"
#include "document_update.hpp"
#include "key_link.hpp"
#include "interaction.hpp"
#include "round_ui.hpp"
#include "display_idle.hpp"
#include "cooling_intent.hpp"
static constexpr size_t LIBRARY_LIMIT=32768;
std::atomic<bool> wifiConfigured{false},wifiRetryRequested{false};std::atomic<int> wifiDisconnectReason{0};std::atomic<uint32_t> wifiRetryAttempts{0};vd::WifiRetry wifiRetry;
std::atomic<bool> keyHeld{false},runLocksKey{false},stopRequested{false},coolCancel{false},apRequested{false},apOn{false};
std::atomic<uint64_t> keySeen{0};std::atomic<int> keyColor{0},keyBrightness{255},keyLedApplied{-1};
std::atomic<int> keyProbeStage{0},keyProbeStatus{0},keyDeviceCount{0},keyDeviceType{0},keyRaw{-1};
std::atomic<uint32_t> keyProbeAttempts{0},keySamples{0},keyStackFree{0};
Volcano volcano;Hue hue;vd::Engine engine(volcano);vd::Cooldown cooldown;vd::HoseSession hose(volcano);
std::atomic<vd::KeyContext> inputContext{vd::KeyContext::Fault},activationContext{vd::KeyContext::Fault};
std::atomic<bool> activationPending{false},uiInhibited{false},endHoseRequested{false},localHeld{false},webHeld{false};
std::atomic<uint64_t> localSeen{0},webSeen{0};std::atomic<int> airOwner{0};
vd::WebHoldLease webLease;portMUX_TYPE webMux=portMUX_INITIALIZER_UNLOCKED;vd::RequestFence requestFence;std::atomic<int> selectionPending{0};
std::atomic<bool> displayWakeRequested{false},displaySleepRequested{false},displayResting{false};std::atomic<int> displayBrightness{160};vd::DisplayIdle displayIdle;
vd::UiSnapshot uiShared;vd::UiState uiState;vd::DirtyFrame dirtyFrame;
alignas(4) uint16_t stripPixels[240*4];M5Canvas strip(&M5Dial.Display);
bool manualDemandValid(){if(uiInhibited||endHoseRequested||stopRequested)return false;uint64_t n=nowMs();switch(airOwner.load()){case 1:return vd::holdFresh(keyHeld,n,keySeen,150);case 2:return vd::holdFresh(localHeld,n,localSeen,150);case 3:return vd::holdFresh(webHeld,n,webSeen,450);default:return false;}}
void inputAction(vd::InputAction a,int owner){
 if(a!=vd::InputAction::None)displayWakeRequested=true;
 if(a==vd::InputAction::FanOn&&!uiInhibited){int none=0;airOwner.compare_exchange_strong(none,owner);}
 if(a==vd::InputAction::FanOff){int mine=owner;airOwner.compare_exchange_strong(mine,0);}
 if(a==vd::InputAction::Stop)stopRequested=true;
 if(a==vd::InputAction::Activate){activationContext=inputContext.load();activationPending=true;}
}
JsonDocument library,config,discoveries,results;
Preferences preferences;WebServer server(80);DNSServer dns;Chain chain;
struct CoolingStore {
 std::string read(){return std::string(preferences.getString("coolOwner","").c_str());}
 bool write(const std::string& value){if(value.empty())return !preferences.isKey("coolOwner")||preferences.remove("coolOwner");return preferences.putString("coolOwner",value.c_str())==value.size();}
} coolingStore;
vd::CoolingIntent<CoolingStore> coolingIntent(coolingStore);
bool coolingRestore=true;uint64_t coolingRecoveryAt=0,coolingRetryAt=0;unsigned coolingFailures=0;
SemaphoreHandle_t stateMutex;QueueHandle_t requests;
std::shared_ptr<const String> stateText=std::make_shared<const String>("{}");
String revision,pin,token,apPassword,apName,notice,operation,rfidSeen,lastRunId,lastRunRevision;
bool fsReady=false,sessionHue=false,wantConnection=false,recoveryOff=false;uint64_t apSince=0;
unsigned reconnectAttempt=0;uint64_t retryAt=0;uint32_t lastGeneration=0;
vd::Phase lastPhase=vd::Phase::Idle;
bool hoseSelected(){return String(config["selectedMode"]|"library")=="hose";}
bool busy(){return engine.busy()||hose.busy();}
bool stageRetryAvailable(){return !hoseSelected()&&engine.canRestartStage()&&String(library["activeRunnable"]["kind"]|"")=="workflow"&&String(library["activeRunnable"]["id"]|"")==lastRunId&&revision==lastRunRevision;}
vd::KeyContext context(){vd::KeyContext base=vd::KeyContext::Idle;
 if(!operation.isEmpty()||recoveryOff)base=vd::KeyContext::Fault;
 else if(hose.busy())base=hose.ready()?vd::KeyContext::HoseReady:vd::KeyContext::HoseHeating;
 else if(engine.phase==vd::Phase::AwaitingNext)base=vd::KeyContext::Checkpoint;
 else if(engine.busy())base=vd::KeyContext::Running;
 else if((!hoseSelected()&&engine.phase==vd::Phase::Error)||(hoseSelected()&&hose.phase==vd::HosePhase::Error))base=vd::KeyContext::Fault;
 return vd::gatedContext(base,uiInhibited);
}
uint32_t nextRequestId=1,catalogVersion=0;long encoderPrevious=0;
struct Request {char* text;uint32_t id,epoch;};
String randomHex(){char b[17];snprintf(b,sizeof b,"%08lx%08lx",(unsigned long)esp_random(),(unsigned long)esp_random());return String(b);}
bool store(const char* name,const String& text){
  if(!fsReady)return false;String temp=String(name)+".tmp",backup=String(name)+".bak";auto f=LittleFS.open(temp,"w");if(!f)return false;
  bool good=f.print(text)==text.length();f.flush();f.close();if(!good){LittleFS.remove(temp);return false;}
  if(LittleFS.exists(name)){LittleFS.remove(backup);if(!LittleFS.rename(name,backup))return false;}
  if(!LittleFS.rename(temp,name)){if(LittleFS.exists(backup))LittleFS.rename(backup,name);return false;}return true;
}
bool load(const char* name,JsonDocument& d){
  for(String p:{String(name),String(String(name)+".bak")}){if(!LittleFS.exists(p))continue;auto f=LittleFS.open(p,"r");if(f.size()>LIBRARY_LIMIT){f.close();continue;}auto e=deserializeJson(d,f);f.close();if(!e&&!d.overflowed())return true;}d.clear();return false;
}
void applyHue(){hue.address=config["bridgeAddress"]|"";hue.bridgeId=config["bridgeId"]|"";hue.key=config["bridgeKey"]|"";hue.plug=config["plug"]|"";hue.enabled=config["hueEnabled"]|false;hue.autoOff=config["autoOff"]|false;hue.threshold=config["threshold"]|50.0;}
// These helpers deliberately cannot energize Hue or start a program on reboot.
std::string coolingIdentity(){
 std::string id=config["volcanoId"]|"";
 if(id.size()!=17||hue.bridgeId.length()!=16||hue.plug.length()!=36)return "";
 return id+"|"+hue.bridgeId.c_str()+"|"+hue.plug.c_str();
}
bool rememberCooling(){
 if(!hue.enabled||!hue.autoOff)return true;
 if(!coolingIntent.begin(coolingIdentity())){notice="Abschaltauftrag nicht speicherbar. Start gesperrt.";return false;}
 preferences.putBool("coolInit",true);coolingRestore=false;coolingFailures=0;coolingRetryAt=0;return true;
}
void acknowledgeCooling(){
 bool cleared=coolingIntent.complete();cooldown.cancel();wantConnection=false;sessionHue=false;volcano.disconnect();
 coolingRestore=!cleared;coolingRecoveryAt=nowMs()+15000;coolingFailures=0;
 notice=cleared?"Abgekühlt. Steckdose aus.":"Steckdose aus. Abschaltauftrag noch gespeichert.";
}
void recoverCooling(bool ready){
 if(!coolingRestore||!ready||busy()||stopRequested||!hue.enabled||!hue.autoOff||nowMs()<coolingRecoveryAt)return;
 if(!coolingIntent.pending()&&preferences.getBool("coolInit",false)){coolingRestore=false;return;}
 std::string id=coolingIdentity();if(id.empty())return;
 if(coolingIntent.pending()&&!coolingIntent.matches(id)){notice="Abschaltauftrag gehört zu anderem Gerät. Einrichtung prüfen.";coolingRecoveryAt=nowMs()+30000;return;}
 coolingRecoveryAt=nowMs()+15000;bool on;
 if(!hue.read(on)){notice=hue.error;return;}
 if(on&&!coolingIntent.begin(id)){notice="Abschaltauftrag nicht speicherbar. Gerät prüfen.";return;}
 preferences.putBool("coolInit",true);
 if(!on){acknowledgeCooling();return;}
 sessionHue=true;wantConnection=true;recoveryOff=true;coolingRestore=false;
 notice="Abkühlüberwachung wird wiederhergestellt.";
}
void syncCooling(){
 bool owned=hue.enabled&&hue.autoOff&&sessionHue&&coolingIntent.matches(coolingIdentity());
 if(!owned)cooldown.cancel();else if(!cooldown.armed&&!busy()&&!coolingRestore)cooldown.arm(std::string(config["volcanoId"]|""));
}
bool saveConfig(){String s;if(config.overflowed()||!vd::serializeComplete(config,s)||!store("/config.json",s)){notice="Einstellungen konnten nicht gespeichert werden";return false;}applyHue();return true;}
bool saveLibrary(){String text,next=randomHex();if(library.overflowed()||next.length()!=16||!vd::serializeComplete(library,text)||text.length()>LIBRARY_LIMIT)return false;
 xSemaphoreTake(stateMutex,portMAX_DELAY);bool ok=store("/library.json",text);if(ok)revision=std::move(next);xSemaphoreGive(stateMutex);if(!ok)notice="Bibliothek konnte nicht gespeichert werden";return ok;}
bool refreshLibrary(){return saveLibrary();}
void defaults(){
  library.clear();library["settingsVersion"]=2;auto p=library["presets"].to<JsonArray>();library["workflows"].to<JsonArray>();library["globalVariables"].to<JsonArray>();auto order=library["runnableOrder"].to<JsonArray>();
  for(int i=0;i<10;++i){auto e=p.add<JsonObject>();String id="p"+String(i+1);e["id"]=id;e["name"]="Preset "+String(i+1);e["kind"]="simple";e["startTemp"]=170;e["endTemp"]=190+(i%5)*10;e["fillTime"]=i<5?55:75;e["steps"]=3+i%5;auto r=order.add<JsonObject>();r["kind"]="preset";r["id"]=id;}
  library["activeRunnable"]["kind"]="preset";library["activeRunnable"]["id"]="p1";
}
JsonVariant selected(){auto r=library["activeRunnable"];const char* list=String(r["kind"]|"")=="workflow"?"workflows":"presets";for(auto e:library[list].as<JsonArray>())if(String(e["id"]|"")==String(r["id"]|""))return e;return JsonVariant{};}
void normalizeOrder(){
  JsonDocument order;auto a=order.to<JsonArray>();std::set<std::string> seen;
  auto add=[&](const char* kind,const std::string& id){auto key=std::string(kind)+":"+id;if(seen.count(key))return;seen.insert(key);auto r=a.add<JsonObject>();r["kind"]=kind;r["id"]=id;};
  for(auto r:library["runnableOrder"].as<JsonArray>()){auto kind=vd::str(r["kind"]);for(auto e:library[kind=="workflow"?"workflows":"presets"].as<JsonArray>())if(vd::str(e["id"])==vd::str(r["id"]))add(kind=="workflow"?"workflow":"preset",vd::str(e["id"]));}
  for(auto k:{"presets","workflows"})for(auto e:library[k].as<JsonArray>())add(String(k)=="presets"?"preset":"workflow",vd::str(e["id"]));
  library["runnableOrder"].set(a);if(selected().isNull()&&a.size())library["activeRunnable"].set(a[0]);
}
void setupAP(){
  if(apOn)return;WiFi.mode(WIFI_AP_STA);WiFi.softAP(apName.c_str(),apPassword.c_str());dns.start(53,"*",WiFi.softAPIP());apOn=true;apSince=nowMs();
}
void publish(){
  JsonDocument d;auto s=volcano.snapshot();d["version"]="0.2.7";d["connected"]=s.connected;d["current"]=std::isfinite(s.current)?s.current:0;d["target"]=std::isfinite(s.target)?s.target:210;d["temperatureValid"]=s.connected&&std::isfinite(s.current)&&nowMs()>=s.sampleAt&&nowMs()-s.sampleAt<1500;
  d["heat"]=s.heat;d["fan"]=s.fan;d["fault"]=s.fault;d["statusValid"]=s.valid;d["phase"]=hose.busy()?(hose.ready()?"hoseReady":"hoseHeating"):hoseSelected()&&hose.phase==vd::HosePhase::Error?"error":hoseSelected()&&hose.phase==vd::HosePhase::Complete?"complete":vd::phaseName(engine.phase);d["busy"]=busy()||!operation.isEmpty();d["stage"]=engine.stageIndex+1;d["action"]=engine.actionIndex+1;d["remaining"]=engine.remaining;
  auto& plan=engine.currentPlan();d["stages"]=plan.stages.size();if(engine.stageIndex<plan.stages.size()){d["stageName"]=plan.stages[engine.stageIndex].name;d["actions"]=plan.stages[engine.stageIndex].actions.size();if(engine.actionIndex<plan.stages[engine.stageIndex].actions.size())d["actionType"]=vd::actionName(plan.stages[engine.stageIndex].actions[engine.actionIndex].type);}
  bool retryStage=stageRetryAvailable();d["retryAvailable"]=retryStage;
  if(retryStage){size_t i=engine.restartStageIndex();d["stage"]=i+1;d["retryStage"]=i+1;d["stageName"]=plan.stages[i].name;d["action"]=1;d["actions"]=plan.stages[i].actions.size();}
  d["planName"]=hose.busy()?"Schlauch":plan.name;d["error"]=hoseSelected()?hose.error:engine.error;d["notice"]=notice;d["operation"]=operation;d["cooling"]=cooldown.armed;d["coolingPending"]=coolingIntent.pending();d["coolingRestoring"]=coolingRestore;d["coolingRetries"]=coolingFailures;d["keyHeld"]=keyHeld.load();d["keyAlive"]=nowMs()-keySeen<200;auto choice=selected();for(auto k:{"id","name","kind","startTemp","endTemp","fillTime","steps","fillTimeSource"})d["selected"][k].set(choice[k]);d["activeRunnable"].set(library["activeRunnable"]);
  if(hoseSelected()){d["selected"].clear();d["selected"]["name"]="Schlauch";d["selected"]["kind"]="hose";d["selected"]["id"]="dial-hose";d["selected"]["startTemp"]=config["hoseTemperature"]|210;d["activeRunnable"]["kind"]="hose";d["activeRunnable"]["id"]="dial-hose";}
  // Names/order change only with a library replacement, not every status poll.
  d["catalogVersion"]=catalogVersion;
  d["results"].set(results);d["discoveries"].set(discoveries);d["wifi"]=WiFi.status()==WL_CONNECTED;d["ip"]=WiFi.localIP().toString();d["ap"]=apOn.load();d["clockValid"]=time(nullptr)>=1735689600;d["heap"]=ESP.getFreeHeap();d["largestHeapBlock"]=ESP.getMaxAllocHeap();d["minimumHeap"]=ESP.getMinFreeHeap();d["workerStackFree"]=uxTaskGetStackHighWaterMark(nullptr);
  d["bleReadMs"]=volcano.lastReadMs;d["bleMaxReadMs"]=volcano.maxReadMs;d["bleReadTimeouts"]=volcano.readTimeouts;d["bleDisconnectReason"]=volcano.disconnectReason.load();d["bleError"]=volcano.error;d["bleIntervalMs"]=volcano.connectionIntervalMs();
  d["bleGattStatus"]=volcano.lastGattStatus;d["bleGattFailures"]=volcano.gattFailures;d["targetFailures"]=volcano.targetFailures;d["lastTargetRequested"]=volcano.lastTargetRequested;d["lastTargetObserved"]=volcano.lastTargetObserved;
  d["targetWrites"]=volcano.targetWrites;d["targetRetries"]=volcano.targetRetries;d["lastTargetMs"]=volcano.lastTargetMs;d["maxTargetMs"]=volcano.maxTargetMs;
  d["keyLedBrightness"]=keyBrightness.load();d["keyLedColor"]=keyLedApplied.load();
  auto settings=d["settings"].to<JsonObject>();for(auto k:{"ssid","volcanoId","volcanoType","bridgeAddress","bridgeId","plug","hueEnabled","autoOff","threshold","brightness","sound","timerSeconds","timerTemperature","hoseTemperature","sleepEnabled","sleepDimSeconds","sleepOffSeconds"})settings[k].set(config[k]);
  d["hueTLSCalls"]=hue.tlsCalls;d["hueTLSBeforeHeap"]=hue.tlsBeforeHeap;d["hueTLSAfterHeap"]=hue.tlsAfterHeap;d["inputContext"]=int(context());d["wifiStatus"]=int(WiFi.status());d["wifiDisconnectReason"]=wifiDisconnectReason.load();d["wifiRetryAttempts"]=wifiRetryAttempts.load();d["displayBrightness"]=displayBrightness.load();settings["paired"]=hue.key.length()>0;d["rfid"]=rfidSeen;
  d["keyProbeStage"]=keyProbeStage.load();d["keyProbeStatus"]=keyProbeStatus.load();d["keyDeviceCount"]=keyDeviceCount.load();d["keyDeviceType"]=keyDeviceType.load();d["keyRaw"]=keyRaw.load();d["keyProbeAttempts"]=keyProbeAttempts.load();d["keySamples"]=keySamples.load();d["keyStackFree"]=keyStackFree.load();
  vd::UiSnapshot u;auto copy=[](char* dest,size_t size,const char* src){snprintf(dest,size,"%s",src?src:"");};
  copy(u.name,sizeof u.name,d["selected"]["name"]|"Keine Auswahl");copy(u.stageName,sizeof u.stageName,d["stageName"]|"");if(engine.phase==vd::Phase::AwaitingNext&&engine.stageIndex+1<plan.stages.size())copy(u.stageName,sizeof u.stageName,plan.stages[engine.stageIndex+1].name.c_str());
  copy(u.message,sizeof u.message,!operation.isEmpty()?operation.c_str():!d["error"].as<String>().isEmpty()?d["error"].as<const char*>():notice.c_str());
  copy(u.ip,sizeof u.ip,d["ip"]|"");copy(u.pin,sizeof u.pin,pin.c_str());copy(u.apName,sizeof u.apName,apName.c_str());copy(u.apPassword,sizeof u.apPassword,apPassword.c_str());
  String phase=d["phase"]|"idle";u.phase=!operation.isEmpty()?vd::UiPhase::Connecting:phase=="running"?vd::UiPhase::Running:phase=="awaitingNext"?vd::UiPhase::Checkpoint:phase=="complete"?vd::UiPhase::Complete:phase=="aborted"?vd::UiPhase::Stopped:phase=="error"?vd::UiPhase::Error:phase=="hoseHeating"?vd::UiPhase::HoseHeating:phase=="hoseReady"?vd::UiPhase::HoseReady:vd::UiPhase::Idle;
  u.programActive=engine.busy();u.retryStage=retryStage;u.connected=s.connected;u.wifi=d["wifi"];u.keyAlive=d["keyAlive"];u.heat=s.heat;u.fan=s.fan;u.valid=d["temperatureValid"];u.cooling=cooldown.armed;u.busy=d["busy"].as<bool>();u.hose=hoseSelected();u.workflow=String(library["activeRunnable"]["kind"]|"")=="workflow"&&!u.hose;u.simple=String(choice["kind"]|"")=="simple";u.ap=apOn;u.sound=config["sound"]|true;u.autoOff=hue.autoOff;
  u.current=std::isfinite(s.current)?int(std::round(s.current)):0;u.target=std::isfinite(s.target)?int(std::round(s.target)):210;u.stage=d["stage"];u.stages=d["stages"];u.action=d["action"];u.actions=d["actions"];u.remaining=int(std::ceil(engine.remaining));if(engine.stageIndex<plan.stages.size()&&engine.actionIndex<plan.stages[engine.stageIndex].actions.size()){u.actionTarget=int(plan.stages[engine.stageIndex].actions[engine.actionIndex].value);u.temperatureProgress=std::clamp(int((s.current-40)/std::max(1.0,u.actionTarget-40.0)*100),0,100);}
  u.actionType=String(d["actionType"]|"")=="air"?2:String(d["actionType"]|"")=="reachTemperature"?0:1;
  u.sleepEnabled=config["sleepEnabled"]|true;u.sleepDimSeconds=config["sleepDimSeconds"]|30;u.sleepOffSeconds=config["sleepOffSeconds"]|90;u.brightness=config["brightness"]|160;u.startTemp=choice["startTemp"]|170;u.endTemp=choice["endTemp"]|210;u.fillTime=choice["fillTime"]|55;u.steps=choice["steps"]|3;u.timerSeconds=config["timerSeconds"]|55;u.timerTemperature=config["timerTemperature"]|210;u.threshold=hue.threshold;u.hoseTemperature=config["hoseTemperature"]|210;
  String text;serializeJson(d,text);xSemaphoreTake(stateMutex,portMAX_DELAY);stateText=std::make_shared<const String>(std::move(text));uiShared=u;xSemaphoreGive(stateMutex);
  inputContext=context();keyColor=vd::ledMode(u);
}
void done(uint32_t id,bool ok,const String& message,bool updateNotice=true){
  if(updateNotice)notice=message;if(!id)return;auto a=results.as<JsonArray>();if(a.size()>=8)a.remove(0);auto r=a.add<JsonObject>();r["id"]=id;r["ok"]=ok;r["message"]=message;
}
bool prepare(bool bypass=false){
  if(stopRequested){notice="Start abgebrochen";return false;}
  if(!fsReady){notice="Speicherfehler. Installation pruefen.";return false;}
  String address=config["volcanoId"]|"";if(address.isEmpty()){notice="Zuerst Volcano in der Einrichtung suchen und auswaehlen";return false;}
  cooldown.cancel();coolCancel=false;
  auto confirmOff=[&](){airOwner=0;volcano.manualHold=false;bool f=volcano.fan(false),h=volcano.heat(false);recoveryOff=!(f&&h);if(recoveryOff){engine.discardStageRestart();notice="Ausgänge unbekannt. Volcano prüfen!";}return !recoveryOff;};
  bool cached=volcano.snapshot().connected;
  if(!cached)sessionHue=false;
  operation="Verbinden …";inputContext=vd::KeyContext::Fault;activationPending=false;airOwner=0;publish();
  if(hue.enabled&&!bypass){
    uint64_t began=nowMs(),published=0;vd::Readiness readiness;
    do{uint64_t n=nowMs();bool wifi=WiFi.status()==WL_CONNECTED;readiness=vd::startReadiness(wifi,time(nullptr)>=1735689600,stopRequested,n-began);
      if(readiness!=vd::Readiness::Waiting)break;
      operation=wifi?"Uhrzeit synchronisieren …":"WLAN verbinden …";if(n-published>=250){publish();published=n;}delay(20);
    }while(true);
    if(readiness!=vd::Readiness::Ready){notice=readiness==vd::Readiness::Cancelled?"Start abgebrochen":WiFi.status()!=WL_CONNECTED?"WLAN fehlt. Geräteinfo öffnen.":"Uhrzeit fehlt. Browser öffnen.";operation="";return false;}
    operation="Hue / Bluetooth verbinden …";publish();
  }
  // A cached BLE flag does not prove that Hue still supplies power. Verify ON
  // for this explicit request before reusing the link; preserve live manual
  // outputs on a healthy link unless OFF recovery was already required.
  if(hue.enabled&&!bypass){if(!rememberCooling()){operation="";return false;}if(!hue.power(true,[&](){return !stopRequested.load();})){notice=hue.error;coolingRestore=coolingIntent.pending();operation="";return false;}sessionHue=true;wantConnection=true;if(!cached)recoveryOff=true;retryAt=0;}
  auto cancelled=[&](){notice="Start abgebrochen";operation="";return false;};
  if(stopRequested)return cancelled();
  if(cached){
    bool live=volcano.poll();if(stopRequested)return cancelled();
    if(live&&volcano.snapshot().connected){bool ok=!recoveryOff||confirmOff();operation="";return ok&&!stopRequested;}
    volcano.disconnect();recoveryOff=true;
  }
  // Keep intent only on this call stack. Retry connection, never a program or
  // an output ON. Background reconnect after this returns remains OFF-only.
  uint64_t began=nowMs();
  for(unsigned attempt=0;attempt<3&&nowMs()-began<30000;++attempt){
    if(stopRequested)return cancelled();
    operation="Bluetooth verbinden …";publish();
    bool connected=volcano.connect(address,config["volcanoType"]|0);
    if(connected){wantConnection=true;reconnectAttempt=0;lastGeneration=volcano.generation;bool ok=confirmOff();operation="";if(stopRequested)return cancelled();return ok;}
    // Connect can fail after service/status discovery. Clear any partial cache
    // synchronously before retrying or returning to OFF-only supervision.
    volcano.disconnect();
    if(stopRequested)return cancelled();
    if(attempt==2)break;
    operation="Volcano startet …";publish();uint64_t pause=nowMs();
    while(nowMs()-pause<1000&&nowMs()-began<30000){if(stopRequested)return cancelled();delay(20);}
  }
  operation="";notice=volcano.error;return false;
}
bool selectByDelta(int delta){auto order=library["runnableOrder"].as<JsonArray>();if(!order.size())return false;int i=0;for(size_t k=0;k<order.size();++k)if(vd::str(order[k]["id"])==vd::str(library["activeRunnable"]["id"]))i=k;int n=order.size()+1;if(hoseSelected())i=n-1;i=((i+delta)%n+n)%n;
    config["selectedMode"]=i==n-1?"hose":"library";if(!saveConfig())return false;if(i<n-1){library["activeRunnable"].set(order[i]);bool ok=saveLibrary();if(ok)engine.discardStageRestart();return ok;}engine.discardStageRestart();return true;}
bool runSelected(bool fromInput=false){
  int pending=selectionPending.exchange(0);if(pending&&!selectByDelta(pending))return false;
  if(keyHeld&&!fromInput){notice="Lueftungstaste zuerst loslassen";return false;}
  if(hoseSelected()){
    if(hose.busy())return hose.stop(nowMs());if(engine.busy())return false;
    if(!prepare())return false;engine.discardStageRestart();airOwner=0;volcano.manualHold=false;runLocksKey=false;
    return hose.start(config["hoseTemperature"]|210.0,nowMs());
  }
  if(engine.phase==vd::Phase::AwaitingNext){cooldown.cancel();bool ok=engine.next(nowMs());if(!ok&&engine.phase==vd::Phase::AwaitingNext)notice="Volcano-Status pruefen; erneut druecken";return ok;}
  if(engine.busy())return false;vd::Compiler compiler;vd::Plan plan;
  if(!compiler.compile(library,library["activeRunnable"],plan)){notice=compiler.error.c_str();return false;}
  // Resolve the requested stage before Hue temporarily releases/reloads the
  // library. Only this same workflow/revision may reuse a confirmed Stop point.
  size_t firstStage=stageRetryAvailable()?engine.restartStageIndex():0;
  String runId=library["activeRunnable"]["id"]|"",runRevision=revision;
  if(!prepare())return false;runLocksKey=true;volcano.manualHold=false;bool ok=engine.start(plan,nowMs(),firstStage);
  if(ok){lastRunId=runId;lastRunRevision=runRevision;}runLocksKey=engine.busy();return ok;
}
bool execute(JsonVariant r){
  String command=r["command"]|"";
  if(command=="sleepDisplay"){if(engine.busy()){notice="Display bleibt während Ablauf an";return false;}displaySleepRequested=true;return true;}
  if(command=="wakeDisplay"){displayWakeRequested=true;return true;}
  notice="";
  if(command=="wifiRetry"){wifiRetryRequested=true;return true;}
  if(command=="stop"){cooldown.cancel();airOwner=0;activationPending=false;volcano.manualHold=false;if(hose.busy())hose.stop(nowMs());else engine.stop(nowMs());stopRequested=false;runLocksKey=engine.busy();return hoseSelected()?hose.phase!=vd::HosePhase::Error:engine.phase!=vd::Phase::Error;}
  if(command=="run"||command=="next"){if(hose.busy()){bool ok=hose.stop(nowMs());airOwner=0;if(ok&&hue.enabled&&hue.autoOff&&sessionHue){coolCancel=false;cooldown.arm(std::string(config["volcanoId"]|""));}return ok;}if(engine.busy()&&engine.phase!=vd::Phase::AwaitingNext){engine.stop(nowMs());return engine.phase!=vd::Phase::Error;}return runSelected();}
  if(command=="hoseTarget"){
    if(engine.busy())return false;
    double value=r["value"].as<double>();if(!r["value"].is<double>()||!std::isfinite(value)||value<40||value>230)return false;
    airOwner=0;inputContext=vd::KeyContext::HoseHeating;if(hose.busy()&&!hose.changeTarget(value,nowMs()))return false;config["hoseTemperature"]=value;return saveConfig();
  }
  if(busy()){notice="Während Ablauf/Zwischenpause gesperrt";return false;}
  if(keyHeld&&command!="select"){notice="Lueftungstaste zuerst loslassen";return false;}
  if(command=="select"){
    if(String(r["ref"]["kind"]|"")=="hose"){config["selectedMode"]="hose";bool ok=saveConfig();if(ok)engine.discardStageRestart();return ok;}
    if(!r["ref"].isNull()){config["selectedMode"]="library";saveConfig();}
    if(!r["ref"].isNull()){for(auto ref:library["runnableOrder"].as<JsonArray>())if(vd::str(ref["id"])==vd::str(r["ref"]["id"])&&vd::str(ref["kind"])==vd::str(r["ref"]["kind"])){library["activeRunnable"].set(ref);bool ok=saveLibrary();if(ok)engine.discardStageRestart();return ok;}return false;}
    return selectByDelta(r["delta"]|1);
  }
  if(command=="connect")return prepare(r["bypassHue"]|false);
  if(command=="disconnect"){
    cooldown.cancel();wantConnection=false;bool a=false;if(volcano.snapshot().connected){bool f=volcano.fan(false),h=volcano.heat(false);a=f&&h;}
    if(!a){engine.discardStageRestart();notice="AUS nicht bestaetigt";wantConnection=sessionHue;return false;}if(hue.enabled&&sessionHue){if(!hue.power(false)){notice=hue.error;wantConnection=true;return false;}acknowledgeCooling();}else volcano.disconnect();sessionHue=false;return true;
  }
  if(command=="bleScan"){operation="Volcano suchen";publish();if(hue.enabled&&!volcano.snapshot().connected&&!coolingIdentity().empty()){if(!rememberCooling()){operation="";return false;}if(!hue.power(true,[&](){return !stopRequested.load();})){notice=hue.error;coolingRestore=coolingIntent.pending();operation="";return false;}sessionHue=true;wantConnection=coolingIntent.pending();}if(coolingIdentity().empty())notice="Zur ersten Suche Volcano/Steckdose manuell einschalten.";discoveries["volcano"].to<JsonArray>();volcano.scan(discoveries["volcano"].as<JsonArray>());operation="";return true;}
  if(command=="hueDiscover"){operation="Hue Bridge suchen";publish();discoveries["bridges"].to<JsonArray>();hue.discover(discoveries["bridges"].as<JsonArray>());operation="";return true;}
  if(command=="huePair"){
    operation="Hue koppeln";publish();Hue candidate=hue;bool ok=candidate.pair(r["address"]|"");operation="";if(!ok){notice=candidate.error;return false;}if(coolingIntent.pending()&&candidate.bridgeId!=hue.bridgeId){notice="Zuerst laufende Abkühlüberwachung abschließen.";return false;}config["bridgeAddress"]=candidate.address;config["bridgeId"]=candidate.bridgeId;config["bridgeKey"]=candidate.key;return saveConfig();
  }
  if(command=="hueDevices"){
    operation="Steckdosen suchen";publish();JsonDocument devices;bool ok=hue.devices(devices);operation="";if(!ok){notice=hue.error;return false;}
    auto a=discoveries["plugs"].to<JsonArray>();for(auto l:devices["data"].as<JsonArray>())if(l["on"].is<JsonObject>()&&l["dimming"].isNull()){auto x=a.add<JsonObject>();x["id"]=l["id"];x["name"]=l["metadata"]["name"]|"Steckdose";}return true;
  }
  if(command=="clock"){
    double seconds=r["epoch"].as<double>();if(!std::isfinite(seconds)||seconds<1735689600||seconds>4102444800.0){notice="Uhrzeit ungueltig";return false;}timeval tv{time_t(seconds),0};settimeofday(&tv,nullptr);time_t epoch=time_t(seconds);tm t;gmtime_r(&epoch,&t);M5Dial.Rtc.setDateTime(&t);return true;
  }
  if(command=="setupAP"){apRequested=true;return true;}
  if(command=="info"){notice="Browser: volcano-dial.local";return true;}
  if(command=="configure"){
    auto v=r["settings"];if(!v.is<JsonObject>())return false;
    for(auto k:{"volcanoId","plug"})if(coolingIntent.pending()&&!v[k].isNull()&&String(v[k]|"")!=String(config[k]|"")){notice="Zuerst laufende Abkühlüberwachung abschließen.";return false;}
    for(auto k:{"threshold","brightness","timerSeconds","timerTemperature","sleepDimSeconds","sleepOffSeconds"})if(!v[k].isNull()&&!v[k].is<double>()){notice="Numerischer Einstellungswert erforderlich";return false;}
    double threshold=v["threshold"]|hue.threshold,brightness=v["brightness"]|(config["brightness"]|160),seconds=v["timerSeconds"]|(config["timerSeconds"]|55),temp=v["timerTemperature"]|(config["timerTemperature"]|210);
    if(threshold<30||threshold>100||brightness<20||brightness>255||seconds<1||seconds>3600||temp<40||temp>230){notice="Einstellung ausserhalb des erlaubten Bereichs";return false;}
    int dim=v["sleepDimSeconds"]|(config["sleepDimSeconds"]|30),off=v["sleepOffSeconds"]|(config["sleepOffSeconds"]|90);if(dim<5||dim>600||off<dim+10||off>3600){notice="Display-Ruhe: Dimmen 5–600 s, AUS mindestens 10 s später (max. 3600 s)";return false;}
    if(!v["bridgeAddress"].isNull()&&!Hue::localIP(v["bridgeAddress"]|"")){notice="Lokale Bridge-IP erforderlich";return false;}
    if(!v["volcanoId"].isNull()){String id=v["volcanoId"]|"";if(id.length()!=17){notice="Volcano aus der Suchliste auswaehlen";return false;}}
    if(!v["plug"].isNull()){String id=v["plug"]|"";if(id.length()!=36){notice="Steckdose aus der Suchliste auswaehlen";return false;}}
    bool network=!v["ssid"].isNull();if(network){String ssid=v["ssid"]|"",pwd=v["password"]|"";if(ssid.isEmpty()||ssid.length()>32||pwd.length()>63||(pwd.length()>0&&pwd.length()<8)){notice="WLAN-Name/Passwort ungueltig";return false;}}
    for(auto k:{"ssid","password","volcanoId","volcanoType","bridgeAddress","plug","hueEnabled","autoOff","threshold","brightness","sound","timerSeconds","timerTemperature","sleepEnabled","sleepDimSeconds","sleepOffSeconds"})if(!v[k].isNull())config[k].set(v[k]);
    if(!saveConfig())return false;if(network){wifiConfigured=true;apRequested=true;WiFi.begin(config["ssid"]|"",config["password"]|"");}return true;
  }
  if(command=="library"){
    String expect=r["revision"]|"";if(expect!=revision){notice="Bibliothek wurde inzwischen geaendert. Neu laden.";return false;}
    if(measureJson(r["library"])>LIBRARY_LIMIT){notice="Bibliothek ueber 32 KiB";return false;}
    vd::Compiler compiler;if(!compiler.validate(r["library"])){notice=compiler.error.c_str();return false;}
    bool ok=vd::updateDocument(library,r["library"],[&](){normalizeOrder();return !library.overflowed()&&saveLibrary();});if(ok)++catalogVersion;if(!ok&&notice.isEmpty())notice="Zu wenig Speicher fuer Bibliothek; bisherige Daten erhalten";return ok;
  }
  if(command=="target"){double value=r["value"].as<double>();if(!r["value"].is<double>()||!std::isfinite(value)||value<40||value>230){notice="Temperatur muss zwischen 40 und 230 C liegen";return false;}if(!prepare())return false;cooldown.cancel();return volcano.target(value);}
  if(command=="setParameter"){
    String param=r["param"]|"";double value=r["value"].as<double>();auto p=selected();if(!r["value"].is<double>()||!std::isfinite(value)||p.isNull())return false;
    if(param=="fillTime"){if(value<5||value>300)return false;if(String(library["activeRunnable"]["kind"]|"")=="workflow"&&String(p["fillTimeSource"]|"presets")!="ui")return false;}
    else if(param=="steps"){if(value<1||value>20||String(p["kind"]|"")!="simple")return false;}
    else if(param=="startTemp"){if(value<40||value>(p["endTemp"]|230)||String(p["kind"]|"")!="simple")return false;}
    else if(param=="endTemp"){if(value<(p["startTemp"]|40)||value>230||String(p["kind"]|"")!="simple")return false;}
    else return false;p[param]=value;return saveLibrary();
  }
  if(command=="adjust"){
    String param=r["param"]|"";int delta=r["delta"]|0;if(delta==0||delta<-20||delta>20)return false;
    if(param=="target"){if(!prepare())return false;cooldown.cancel();return volcano.target(std::clamp(volcano.snapshot().target+delta,40.0,230.0));}
    auto p=selected();if(p.isNull())return false;
    if(param=="fillTime"&&String(library["activeRunnable"]["kind"]|"")=="workflow"){if(String(p["fillTimeSource"]|"presets")!="ui"){notice="Workflow verwendet Preset-Fuellzeiten";return false;}p[param]=std::clamp((p[param]|55)+delta,5,300);}
    else if(String(p["kind"]|"")=="simple"){
      int n=p[param]|0;if(param=="startTemp")n=std::clamp(n+10*delta,40,p["endTemp"]|230);else if(param=="endTemp")n=std::clamp(n+10*delta,p["startTemp"]|40,230);else if(param=="fillTime")n=std::clamp(n+delta,5,300);else if(param=="steps")n=std::clamp(n+delta,1,20);else return false;p[param]=n;
    }else{notice="Erweitertes Preset im Browser bearbeiten";return false;}return saveLibrary();
  }
  if(command=="heat"||command=="fan"){
    // Resolve a toggle before preparation can change the output snapshot.
    auto initial=volcano.snapshot();bool on=r["on"]|(command=="heat"?!initial.heat:!initial.fan);
    if(!on){
      // OFF must work through BLE even without Wi-Fi/Hue. Never energize the
      // plug to satisfy an OFF request; failed confirmation gets OFF recovery.
      cooldown.cancel();bool ok=command=="heat"?volcano.heat(false):volcano.fan(false);
      if(!ok){engine.discardStageRestart();recoveryOff=true;wantConnection=true;notice="AUS nicht bestaetigt. Volcano pruefen!";}return ok;
    }
    if(!prepare())return false;cooldown.cancel();return command=="heat"?volcano.heat(true):volcano.fan(true);
  }
  if(command=="timer"){
    if(!prepare())return false;vd::Plan p;p.name="Lueftungstimer";vd::Stage st;st.name=p.name;st.actions={{vd::ActionType::Heat,config["timerTemperature"]|210.0,360},{vd::ActionType::Air,0,config["timerSeconds"]|55.0}};p.stages.push_back(st);runLocksKey=true;bool ok=engine.start(p,nowMs());runLocksKey=engine.busy();return ok;
  }
  if(command=="rfidSeen"){rfidSeen=r["uid"]|"";config["selectedMode"]="library";engine.discardStageRestart();if(!config["rfid"][rfidSeen].isNull())library["activeRunnable"].set(config["rfid"][rfidSeen]);return true;}
  if(command=="rfidLearn"){if(rfidSeen.isEmpty()){notice="Zuerst RFID-Karte an Dial halten";return false;}config["rfid"][rfidSeen].set(library["activeRunnable"]);return saveConfig();}
  notice="Unbekannter Befehl";return false;
}
void worker(void*){
  uint64_t polled=0,published=0,coolAt=0;vd::KeyInput webInput;volcano.begin();coolingIntent.load();results.to<JsonArray>();publish();
  for(;;){
    uint64_t n=nowMs();inputContext=context();
    if(endHoseRequested.exchange(false)&&hose.busy()){
      requestFence.invalidate();activationPending=false;inputContext=vd::KeyContext::Fault;
      airOwner=0;volcano.manualHold=false;bool ok=hose.stop(n);if(ok&&hue.enabled&&hue.autoOff&&sessionHue){coolCancel=false;cooldown.arm(std::string(config["volcanoId"]|""));}
    }
    if(stopRequested){requestFence.invalidate();inputContext=vd::KeyContext::Fault;cooldown.cancel();airOwner=0;activationPending=false;volcano.manualHold=false;if(hose.busy())hose.stop(n);else engine.stop(n);stopRequested=false;}
    // Confirmed shutdown intentionally disconnects with wantConnection=false.
    // Only an unexpected link change leaves a recovery OFF pending.
    if(volcano.generation!=lastGeneration){recoveryOff=wantConnection||volcano.snapshot().connected;airOwner=0;activationPending=false;inputContext=vd::KeyContext::Fault;lastGeneration=volcano.generation;}
    // Physical release and expired leases precede optional BLE reads.
    if(volcano.manualHold&&!manualDemandValid()){
      airOwner=0;volcano.manualHold=false;if(!volcano.fan(false)){engine.discardStageRestart();recoveryOff=true;notice="Luft AUS nicht bestätigt!";}
    }
    if(volcano.snapshot().connected&&n-polled>=500){volcano.poll();polled=nowMs();}
    if(recoveryOff&&volcano.snapshot().connected){airOwner=0;volcano.manualHold=false;bool a=volcano.fan(false),b=volcano.heat(false);recoveryOff=!(a&&b);if(recoveryOff){engine.discardStageRestart();notice="Ausgänge unbekannt. Volcano prüfen!";}}
    engine.tick(nowMs());runLocksKey=engine.busy();
    bool webAllowed=context()==vd::KeyContext::HoseReady;portENTER_CRITICAL(&webMux);bool demand=webLease.demand(nowMs(),webAllowed);portEXIT_CRITICAL(&webMux);webHeld=demand;
    inputAction(webInput.tick(demand,true,webAllowed?vd::KeyContext::HoseReady:vd::KeyContext::Fault,nowMs()),3);
    if(hose.busy()){volcano.manualHold=manualDemandValid()&&hose.ready();hose.tick(nowMs(),volcano.manualHold);if(!hose.busy())airOwner=0;}
    if(engine.phase!=lastPhase){
      if(engine.phase==vd::Phase::Complete&&hue.enabled&&hue.autoOff&&sessionHue){coolCancel=false;cooldown.arm(std::string(config["volcanoId"]|""));}
      if(engine.phase==vd::Phase::Aborted||engine.phase==vd::Phase::Error)cooldown.cancel();lastPhase=engine.phase;
    }
    inputContext=context();
    Request q;
    if(xQueueReceive(requests,&q,0)==pdTRUE){
      JsonDocument req;auto err=deserializeJson(req,q.text);free(q.text);String command=req["command"]|"";
      bool stale=!requestFence.accepts(q.epoch,command=="stop");if(stale)notice="Befehl durch Stop verworfen";
      bool ok=!err&&!stale&&execute(req);bool displayCommand=command=="sleepDisplay"||command=="wakeDisplay";
      String message=ok?(displayCommand||notice.isEmpty()?"OK":notice):(notice.isEmpty()?"Befehl nicht bestätigt":notice);
      done(q.id,ok,message,!ok||!displayCommand);
    }
    if(uxQueueMessagesWaiting(requests)==0&&activationPending.exchange(false)&&activationContext.load()==context()){
      if(context()==vd::KeyContext::Idle||context()==vd::KeyContext::Checkpoint){bool ok=runSelected(true);if(!ok&&notice.isEmpty())notice="Start nicht bestätigt";}
    }
    if(coolCancel){cooldown.cancel();coolCancel=false;}
    recoverCooling(WiFi.status()==WL_CONNECTED&&time(nullptr)>=1735689600);
    // Stop/error/browsing may suspend sampling, but never erase the saved owner.
    syncCooling();
    if(cooldown.armed&&!recoveryOff&&uxQueueMessagesWaiting(requests)==0&&!activationPending&&nowMs()>=coolingRetryAt&&nowMs()-coolAt>=2000){
      coolAt=nowMs();if(volcano.snapshot().connected)volcano.poll();
      if(cooldown.observe(volcano.snapshot(),std::string(config["volcanoId"]|""),nowMs(),hue.threshold,busy())){
        operation="Abgekühlt: Steckdose AUS";publish();uint32_t generation=volcano.generation;
        bool off=hue.power(false,[&](){if(coolCancel||stopRequested||keyHeld||busy()||generation!=volcano.generation)return false;if(!volcano.poll())return false;auto s=volcano.snapshot();return generation==volcano.generation&&vd::freshCool(s,nowMs(),hue.threshold);});
        operation="";if(off)acknowledgeCooling();else{notice=hue.error;coolingFailures=std::min(coolingFailures+1,6u);coolingRetryAt=nowMs()+std::min(5000u*coolingFailures,30000u);}
      }
    }
    if(wantConnection&&!volcano.snapshot().connected&&!busy()&&nowMs()>=retryAt){
      static const uint32_t delays[]={1000,2000,5000,10000,30000};uint32_t wait=delays[std::min(reconnectAttempt,4u)];retryAt=nowMs()+wait+esp_random()%(wait/5+1);++reconnectAttempt;
      operation="Bluetooth wiederverbinden";publish();bool ok=volcano.connect(config["volcanoId"]|"",config["volcanoType"]|0);operation="";
      if(ok){lastGeneration=volcano.generation;reconnectAttempt=0;bool a=volcano.fan(false),b=volcano.heat(false);notice=a&&b?"Verbunden. Ablauf bleibt gestoppt.":"Ausgänge unbekannt. Volcano prüfen!";recoveryOff=!(a&&b);if(recoveryOff)engine.discardStageRestart();}
    }
    // BLE heater telemetry is not a user gesture. Delayed/cycled status bits
    // must never start or advance a workflow, especially following a fault.
    volcano.physicalHeat=false;
    if(nowMs()-published>=100){publish();published=nowMs();}vTaskDelay(pdMS_TO_TICKS(10));
  }
}
void keyWorker(void*){
  // Chain-Key IN: white = module TX, yellow = module RX.
  // Dial PORT.B: white GPIO1 receives; yellow GPIO2 transmits.
  chain.begin(&Serial1,115200,1,2,SERIAL_8N1,false,20);
  struct KeyIO {
    uint64_t now(){return nowMs();}
    bool initialize(){
      uint16_t count=0;chain_device_type_t type=CHAIN_UNKNOWN_TYPE_CODE;uint8_t op=0;
      // Enumeration assigns the first node address 1, including after hot-plug.
      ++keyProbeAttempts;keyProbeStage=1;
      auto status=chain.getDeviceNum(&count,60);keyProbeStatus=status;keyDeviceCount=count;
      if(status!=CHAIN_OK||count!=1)return false;
      keyProbeStage=2;status=chain.getDeviceType(1,&type,40);keyProbeStatus=status;keyDeviceType=type;
      if(status!=CHAIN_OK||type!=CHAIN_KEY_TYPE_CODE)return false;
      keyProbeStage=3;status=chain.setKeyButtonMode(1,CHAIN_BUTTON_NONE_REPORT_MODE,&op,40);keyProbeStatus=status;
      return status==CHAIN_OK&&op==1;
    }
    bool read(bool& pressed){uint8_t value=0;keyProbeStage=4;auto status=chain.getKeyButtonStatus(1,&value,20);keyProbeStatus=status;if(status!=CHAIN_OK||value>1)return false;keyRaw=value;++keySamples;pressed=value==1;return true;}
    bool color(int color){uint8_t op=0;uint8_t rgb[3]={uint8_t((color>>16)&255),uint8_t((color>>8)&255),uint8_t(color&255)};bool ok=chain.setRGBValue(1,0,1,rgb,3,&op,20)==CHAIN_OK&&op==1;if(ok)keyLedApplied=color;return ok;}
  } io;
  vd::KeyLink<KeyIO> link(io);vd::KeyInput keyInput;vd::WakePress wakeKey;uint64_t ledAt=0;int rgb=0;
  for(;;){
    uint64_t n=nowMs();if(n-ledAt>=100){ledAt=n;int intensity=8+int((std::sin(double(n%2400)/2400*6.283)+1)*10);switch(keyColor.load()){case 1:rgb=0x00283c;break;case 2:rgb=(intensity<<16)|(intensity/2<<8);break;case 3:rgb=(n%800<400?0x380000:0x080000);break;case 4:rgb=intensity<<8;break;case 5:rgb=intensity*0x010101;break;default:rgb=0x001800;}}
    link.tick(vd::dimLed(rgb,keyBrightness.load()));bool wakeOnly=wakeKey.consume(link.held,displayResting.load());if(wakeOnly)displayWakeRequested=true;keyHeld=link.held;if(link.alive)keySeen=link.seen;
    inputAction(keyInput.tick(link.held,link.alive,wakeOnly?vd::KeyContext::Fault:inputContext.load(),nowMs()),1);keyStackFree=uxTaskGetStackHighWaterMark(nullptr);
    vTaskDelay(pdMS_TO_TICKS(15));
  }
}
bool enqueue(const String& body,uint32_t id,bool interruptCooling=true,bool wake=true){
  if(wake)displayWakeRequested=true;
  if(body.length()>LIBRARY_LIMIT+1024)return false;char* p=(char*)malloc(body.length()+1);if(!p)return false;memcpy(p,body.c_str(),body.length()+1);Request r{p,id,requestFence.snapshot()};if(xQueueSend(requests,&r,0)!=pdTRUE){free(p);return false;}if(interruptCooling)coolCancel=true;return true;
}
void localCommand(const char* command,const char* param=nullptr,int delta=0){JsonDocument d;d["command"]=command;if(param)d["param"]=param;if(delta)d["delta"]=delta;String s;serializeJson(d,s);enqueue(s,0,String(command)!="sleepDisplay"&&String(command)!="wakeDisplay",String(command)!="sleepDisplay");}
void reply(int code,const String& text){server.sendHeader("Cache-Control","no-store");server.send(code,"application/json",text);}
bool authorized(){if(server.header("Authorization")!="Bearer "+token){reply(401,"{\"error\":\"PIN am Dial eingeben\"}");return false;}return true;}
void httpSetup(){
  const char* headers[]={"Authorization","Origin"};server.collectHeaders(headers,2);
  server.on("/api/v1/login",HTTP_POST,[](){
    static int failures=0;static uint64_t window=0;if(nowMs()-window>60000){failures=0;window=nowMs();}if(failures>=6){reply(429,"{\"error\":\"Eine Minute warten\"}");return;}
    JsonDocument d;if(server.arg("plain").length()>128||deserializeJson(d,server.arg("plain"))||String(d["pin"]|"")!=pin){++failures;reply(403,"{\"error\":\"PIN falsch\"}");return;}reply(200,"{\"token\":\""+token+"\"}");
  });
  server.on("/api/v1/status",HTTP_GET,[](){if(!authorized())return;xSemaphoreTake(stateMutex,portMAX_DELAY);auto s=stateText;xSemaphoreGive(stateMutex);reply(200,*s);});
  server.on("/api/v1/library",HTTP_GET,[](){
    if(!authorized())return;xSemaphoreTake(stateMutex,portMAX_DELAY);auto file=LittleFS.open("/library.json","r");String rev=revision;xSemaphoreGive(stateMutex);
    if(!file){reply(503,"{\"error\":\"Bibliothek nicht lesbar\"}");return;}
    String prefix="{\"revision\":\""+rev+"\",\"library\":";server.sendHeader("Cache-Control","no-store");server.setContentLength(prefix.length()+file.size()+1);server.send(200,"application/json","");server.sendContent(prefix);
    char buffer[1024];while(file.available()){size_t n=file.readBytes(buffer,sizeof buffer);server.sendContent(buffer,n);}server.sendContent("}");file.close();
  });
  server.on("/api/v1/hold",HTTP_POST,[](){
    if(!authorized())return;JsonDocument d;if(server.arg("plain").length()>128||deserializeJson(d,server.arg("plain"))||!d["on"].is<bool>()||!d["sequence"].is<uint64_t>()||!d["gesture"].is<uint64_t>()){reply(400,"{\"error\":\"Ungültiger Haltezustand\"}");return;}
    displayWakeRequested=true;uint64_t n=nowMs();portENTER_CRITICAL(&webMux);bool demand=webLease.update(d["on"],d["sequence"],d["gesture"],n,inputContext.load()==vd::KeyContext::HoseReady&&!uiInhibited);webHeld=demand;if(demand)webSeen=n;portEXIT_CRITICAL(&webMux);reply(200,"{\"ok\":true}");
  });
  server.on("/api/v1/command",HTTP_POST,[](){
    if(!authorized())return;if(server.arg("plain").length()>LIBRARY_LIMIT+1024){reply(413,"{\"error\":\"Daten zu gross\"}");return;}
    JsonDocument d,filter;filter["command"]=true;if(deserializeJson(d,server.arg("plain"),DeserializationOption::Filter(filter))){reply(400,"{\"error\":\"Ungueltiges JSON\"}");return;}
    String command=d["command"]|"";if(command=="stop")stopRequested=true;uint32_t id=nextRequestId++;
    if(!enqueue(server.arg("plain"),id,command!="sleepDisplay"&&command!="wakeDisplay",command!="sleepDisplay")){reply(503,"{\"error\":\"Warteschlange voll\"}");return;}reply(202,"{\"id\":"+String(id)+"}");
  });
  server.onNotFound([](){
    String path=server.uri();if(path=="/")path="/index.html";
    for(auto& asset:WEB_ASSETS)if(path==asset.path){server.sendHeader("Content-Encoding","gzip");server.sendHeader("Cache-Control","no-cache");server.sendHeader("Content-Security-Policy","default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");server.send_P(200,asset.type,(const char*)asset.data,asset.size);return;}
    server.sendHeader("Location","/");server.send(302,"text/plain","");
  });server.begin();
}
void sendValue(const char* command,const char* param,int value){JsonDocument q;q["command"]=command;if(param)q["param"]=param;q["value"]=value;String text;serializeJson(q,text);enqueue(text,0);}
void openEdit(const vd::UiSnapshot& u,int menu){uiInhibited=true;uiState.screen=vd::Screen::Edit;uiState.menu=menu;uiState.value=vd::parameter(u,menu);airOwner=0;}
void finishEdit(const vd::UiSnapshot& u){int i=uiState.menu,v=uiState.value;
 if(i==1)sendValue(u.hose?"hoseTarget":"target",nullptr,v);
 else if(i>=2&&i<=5){const char* fields[]={"startTemp","endTemp","fillTime","steps"};sendValue("setParameter",fields[i-2],v);}
 else{JsonDocument q;q["command"]="configure";const char* field=i==6?"timerSeconds":i==7?"timerTemperature":i==12?"brightness":"threshold";q["settings"][field]=v;String t;serializeJson(q,t);enqueue(t,0);}
 uiState.screen=vd::Screen::Home;
}
void menuAction(const vd::UiSnapshot& u){int i=uiState.menu;if(i==0){uiState.screen=vd::Screen::Home;return;}if(vd::editable(i)){openEdit(u,i);return;}
 if(i==20){displaySleepRequested=true;uiState.screen=vd::Screen::Home;return;}if(i==18){uiState.screen=vd::Screen::Info;return;}if(i==19){endHoseRequested=true;uiState.screen=vd::Screen::Home;return;}
 if(i==8)localCommand("timer");if(i==9)localCommand(u.connected?"disconnect":"connect");if(i==10)localCommand("heat");if(i==11)localCommand("fan");if(i==16)localCommand("rfidLearn");if(i==17){localCommand("setupAP");uiState.screen=vd::Screen::Info;return;}
 if(i==13||i==14){JsonDocument q;q["command"]="configure";q["settings"][i==13?"sound":"autoOff"]=i==13?!u.sound:!u.autoOff;String t;serializeJson(q,t);enqueue(t,0);}uiState.screen=vd::Screen::Home;
}
void primary(const vd::UiSnapshot& u){if(uiState.screen==vd::Screen::Menu)menuAction(u);else if(uiState.screen==vd::Screen::Edit)finishEdit(u);else if(uiState.screen==vd::Screen::Details)uiState.value=(uiState.value+1)%4;else if(uiState.screen!=vd::Screen::Home)uiState.screen=vd::Screen::Home;else if(u.busy&&u.phase!=vd::UiPhase::Checkpoint&&u.phase!=vd::UiPhase::HoseHeating&&u.phase!=vd::UiPhase::HoseReady){stopRequested=true;localCommand("stop");}else if(!u.hose||!u.busy)localCommand("run");}
void setup(){
  auto cfg=M5.config();M5Dial.begin(cfg,true,true);auto speaker=M5Dial.Speaker.config();speaker.dma_buf_len=128;speaker.dma_buf_count=2;M5Dial.Speaker.config(speaker);M5Dial.Display.setBrightness(160);Serial.begin(115200);
  stateMutex=xSemaphoreCreateMutex();requests=xQueueCreate(8,sizeof(Request));preferences.begin("volcano-dial",false);
  pin=preferences.getString("pin","");if(pin.isEmpty()){pin=String(100000+esp_random()%900000);preferences.putString("pin",pin);}token=randomHex()+randomHex();apPassword=preferences.getString("apPassword","");if(apPassword.isEmpty()){apPassword=randomHex().substring(0,10);preferences.putString("apPassword",apPassword);}apName="VolcanoDial-"+pin.substring(3);
  fsReady=LittleFS.begin(false);if(!fsReady&&!preferences.getBool("fsReady",false)){fsReady=LittleFS.format()&&LittleFS.begin(false);}if(fsReady)preferences.putBool("fsReady",true);
  if(!load("/config.json",config)){config["brightness"]=160;config["sound"]=true;config["timerSeconds"]=55;config["timerTemperature"]=210;config["threshold"]=50;config["autoOff"]=false;config["hueEnabled"]=false;}
  vd::Compiler c;if(!load("/library.json",library)||!c.validate(library)){defaults();notice="Standardbibliothek geladen";}normalizeOrder();refreshLibrary();applyHue();
  if(revision.isEmpty()){fsReady=false;notice="Bibliothek nicht lesbar: zu wenig Speicher";}if(!fsReady)notice="Speicherfehler: nicht starten, USB-Installation pruefen";
  hue.memoryWindow=[](bool enter){
    static bool suspended=false;if(enter){if(suspended)return false;library.clear();suspended=true;return true;}
    // Reload the exact current file: falling back to an older backup here would violate its revision.
    auto file=LittleFS.open("/library.json","r");bool ok=false;if(file&&file.size()<=LIBRARY_LIMIT){auto err=deserializeJson(library,file);ok=!err&&!library.overflowed();}file.close();
    suspended=false;if(!ok){library.clear();fsReady=false;stopRequested=true;}return ok;
  };
  M5Dial.Rtc.setSystemTimeFromRtc();String ssid=config["ssid"]|"";wifiConfigured=!ssid.isEmpty();WiFi.onEvent([](WiFiEvent_t event,WiFiEventInfo_t info){if(event==ARDUINO_EVENT_WIFI_STA_DISCONNECTED)wifiDisconnectReason=info.wifi_sta_disconnected.reason;});WiFi.setAutoReconnect(true);WiFi.mode(ssid.isEmpty()?WIFI_AP_STA:WIFI_STA);WiFi.setSleep(false);if(ssid.isEmpty()){setupAP();uiState.screen=vd::Screen::Info;}else WiFi.begin(ssid.c_str(),config["password"]|"");MDNS.begin("volcano-dial");MDNS.addService("http","tcp",80);configTime(0,0,"pool.ntp.org","time.cloudflare.com");
  strip.setBuffer(stripPixels,240,4,16);
  httpSetup();xTaskCreatePinnedToCore(worker,"volcano",8192,nullptr,1,nullptr,0);xTaskCreatePinnedToCore(keyWorker,"chainkey",3072,nullptr,2,nullptr,1);
}
void usbConsole(){
  static String line;static bool discarded=false;
  while(Serial.available()){
    char c=Serial.read();if(c=='\r')continue;
    if(c!='\n'){if(line.length()<512)line+=c;else discarded=true;continue;}
    JsonDocument q;if(discarded||deserializeJson(q,line)){Serial.println("{\"error\":\"USB JSON ungueltig/zu lang\"}");}
    else if(String(q["command"]|"")=="info"){
      JsonDocument d;d["device"]="VolcanoDial";d["version"]="0.2.7";d["pin"]=pin;d["apName"]=apName;d["apPassword"]=apPassword;d["ip"]=WiFi.localIP().toString();d["ap"]=apOn.load();d["heap"]=ESP.getFreeHeap();d["filesystem"]=fsReady;serializeJson(d,Serial);Serial.println();
    }else if(String(q["command"]|"")=="status"){
      xSemaphoreTake(stateMutex,portMAX_DELAY);auto s=stateText;xSemaphoreGive(stateMutex);Serial.println(*s);
    }else{if(String(q["command"]|"")=="stop")stopRequested=true;Serial.println(enqueue(line,0,String(q["command"]|"")!="sleepDisplay"&&String(q["command"]|"")!="wakeDisplay",String(q["command"]|"")!="sleepDisplay")?"{\"accepted\":true}":"{\"error\":\"Warteschlange voll\"}");}
    line="";discarded=false;
  }
}
uint64_t gestureToken(const vd::UiSnapshot& u){uint64_t h=uint64_t(inputContext.load())|(uint64_t(u.phase)<<4)|(uint64_t(u.stage)<<8)|(uint64_t(u.connected)<<16)|(uint64_t(u.hose)<<17)|(uint64_t(uiState.screen)<<18)|(uint64_t(uiState.menu)<<22);for(const char* p=u.name;*p;++p)h=h*1099511628211ull^uint8_t(*p);return h;}
void loop(){
  M5Dial.update();static vd::UiSnapshot u,frame;static vd::UiState frameState;static vd::KeyInput localInput;
  xSemaphoreTake(stateMutex,portMAX_DELAY);u=uiShared;xSemaphoreGive(stateMutex);
  uint64_t n=nowMs();auto touch=M5Dial.Touch.getDetail();static bool suppressLocal=false;bool wasResting=displayResting.load();bool keepAwake=u.programActive||(u.busy&&!u.hose)||u.phase==vd::UiPhase::Connecting;static vd::WakeRotation wakeRotation;
  long raw=M5Dial.Encoder.read()/4;int delta=std::clamp(int(raw-encoderPrevious),-10,10);encoderPrevious=raw;
  static uint64_t selectionAt=0;static bool previousKey=false;
  bool key=keyHeld.load();bool activity=delta||M5Dial.BtnA.wasPressed()||touch.wasPressed()||key!=previousKey||displayWakeRequested.exchange(false);previousKey=key;
  if(activity||M5Dial.BtnA.isPressed()||touch.isPressed()||key||keepAwake){displayIdle.wake(n);if(wasResting){dirtyFrame.invalidate();if(M5Dial.BtnA.isPressed()||touch.isPressed())suppressLocal=true;}}
  if(wakeRotation.consume(delta,n,wasResting)||suppressLocal)delta=0;

  if(delta){
    if(uiState.screen==vd::Screen::Details)uiState.value=(uiState.value+delta%4+4)%4;
    else if(uiState.screen==vd::Screen::Menu)uiState.menu=vd::nextMenu(u,uiState.menu,delta);
    else if(uiState.screen==vd::Screen::Edit){int i=uiState.menu;int low=i==4?5:i==5||i==6?1:i==12?20:i==15?30:40;int high=i==4?300:i==5?20:i==6?3600:i==12?255:i==15?100:230;if(i==2)high=u.endTemp;if(i==3)low=u.startTemp;uiState.value=std::clamp(uiState.value+delta*(i==12?5:1),low,high);}
    else if(uiState.screen==vd::Screen::Home&&u.hose&&u.busy)openEdit(u,1);
    else if(uiState.screen==vd::Screen::Home&&!u.busy){selectionPending.fetch_add(delta);selectionAt=n;}
  }
  if(selectionPending&&n-selectionAt>=120){int pending=selectionPending.exchange(0);if(pending)localCommand("select",nullptr,pending);}
  static bool longHandled=false,knobAir=false,touchAir=false;static vd::ReleaseGesture knobGesture,touchGesture;static vd::Hit touchOrigin=vd::Hit::None;
  if(!suppressLocal&&M5Dial.BtnA.wasPressed()){knobGesture.press(gestureToken(u));longHandled=false;knobAir=uiState.screen==vd::Screen::Home&&u.phase==vd::UiPhase::HoseReady;}
  if(!suppressLocal&&touch.wasPressed()){
    touchGesture.press(gestureToken(u));
    touchOrigin=vd::hit(touch.x,touch.y,u,uiState);touchAir=touchOrigin==vd::Hit::Primary&&uiState.screen==vd::Screen::Home&&u.phase==vd::UiPhase::HoseReady;
    if(touchOrigin==vd::Hit::Stop){if(u.hose&&u.busy)endHoseRequested=true;else{stopRequested=true;localCommand("stop");}}
  }
  bool held=!suppressLocal&&((knobAir&&M5Dial.BtnA.isPressed())||(touchAir&&touch.isPressed()&&vd::hit(touch.x,touch.y,u,uiState)==vd::Hit::Primary));
  localHeld=held;localSeen=n;inputAction(localInput.tick(held,true,inputContext.load(),n),2);
  if(!suppressLocal&&M5Dial.BtnA.wasReleased()){
    if(knobGesture.release(gestureToken(u))&&!longHandled&&!knobAir){if(selectionPending){int pending=selectionPending.exchange(0);if(pending)localCommand("select",nullptr,pending);}primary(u);}knobAir=false;
  }
  if(!suppressLocal&&!longHandled&&!knobAir&&M5Dial.BtnA.pressedFor(700)){longHandled=true;selectionPending=0;
    if(u.busy&&u.phase!=vd::UiPhase::HoseHeating&&u.phase!=vd::UiPhase::HoseReady){stopRequested=true;localCommand("stop");}
    else{uiState.screen=uiState.screen==vd::Screen::Home?vd::Screen::Menu:vd::Screen::Home;uiState.menu=0;}}
  if(!suppressLocal&&touch.wasReleased()){
    auto end=vd::hit(touch.x,touch.y,u,uiState);
    if(touchGesture.release(gestureToken(u))&&!touchAir&&end==touchOrigin){switch(end){case vd::Hit::Menu:uiState.screen=vd::Screen::Menu;uiState.menu=0;break;case vd::Hit::Back:uiState.screen=vd::Screen::Home;break;case vd::Hit::Primary:if(selectionPending){int pending=selectionPending.exchange(0);if(pending)localCommand("select",nullptr,pending);}primary(u);break;case vd::Hit::Details:uiState.screen=vd::Screen::Details;uiState.value=u.phase==vd::UiPhase::Error?2:0;break;case vd::Hit::Temperature:openEdit(u,1);break;case vd::Hit::Up:uiState.menu=vd::nextMenu(u,uiState.menu,-1);break;case vd::Hit::Down:uiState.menu=vd::nextMenu(u,uiState.menu,1);break;default:break;}}touchAir=false;touchOrigin=vd::Hit::None;
  }
  if(suppressLocal&&!M5Dial.BtnA.isPressed()&&!touch.isPressed()){suppressLocal=false;knobAir=touchAir=false;knobGesture.release(0);touchGesture.release(0);}
  uiInhibited=uiState.screen!=vd::Screen::Home;
  // Holds and Stop are sampled before browser, USB and rendering work.
  usbConsole();server.handleClient();if(apRequested.exchange(false)){apSince=nowMs();setupAP();}if(apOn)dns.processNextRequest();static uint64_t wifiLost=0;
  if((wifiRetry.tick(WiFi.status()==WL_CONNECTED,wifiConfigured,n)||wifiRetryRequested.exchange(false))&&WiFi.status()!=WL_CONNECTED&&wifiConfigured){++wifiRetryAttempts;WiFi.reconnect();}
  if(WiFi.status()!=WL_CONNECTED){if(!wifiLost)wifiLost=n;if(n-wifiLost>30000)setupAP();}else{wifiLost=0;if(apOn&&n-apSince>120000){dns.stop();WiFi.softAPdisconnect(true);apOn=false;}}
  if(M5Dial.Rfid.PICC_IsNewCardPresent()&&M5Dial.Rfid.PICC_ReadCardSerial()){
    bool wakeOnly=displayResting.load();displayIdle.wake(n);dirtyFrame.invalidate();String uid;for(byte i=0;i<M5Dial.Rfid.uid.size;++i){if(M5Dial.Rfid.uid.uidByte[i]<16)uid+='0';uid+=String(M5Dial.Rfid.uid.uidByte[i],HEX);}JsonDocument q;q["command"]="rfidSeen";q["uid"]=uid;String text;serializeJson(q,text);if(!wakeOnly)enqueue(text,0);M5Dial.Rfid.PICC_HaltA();
  }
  static vd::UiPhase previous=vd::UiPhase::Idle;if(u.phase!=previous&&(u.phase==vd::UiPhase::Complete||u.phase==vd::UiPhase::Checkpoint||u.phase==vd::UiPhase::HoseReady||u.phase==vd::UiPhase::Error)){displayIdle.wake(n);dirtyFrame.invalidate();}if(u.phase!=previous&&(u.phase==vd::UiPhase::Complete||u.phase==vd::UiPhase::Checkpoint||u.phase==vd::UiPhase::HoseReady||u.phase==vd::UiPhase::Error)&&u.sound)M5Dial.Speaker.tone(u.phase==vd::UiPhase::Error?400:1500,120);previous=u.phase;
  if(M5Dial.Speaker.isRunning()&&!M5Dial.Speaker.isPlaying())M5Dial.Speaker.end();
  bool sleepAsked=displaySleepRequested.exchange(false);if(sleepAsked&&!keepAwake){displayIdle.sleepNow();uiState.screen=vd::Screen::Home;}
  uint32_t visibleHash=vd::visualHash(u,uiState);static uint32_t previousVisibleHash=0;static bool visualInitialized=false;
  if(visualInitialized&&visibleHash!=previousVisibleHash&&!sleepAsked){displayIdle.wake(n);if(displayBrightness==0)dirtyFrame.invalidate();}previousVisibleHash=visibleHash;visualInitialized=true;
  int light=displayIdle.brightness(n,u.brightness,u.sleepEnabled,u.sleepDimSeconds,u.sleepOffSeconds,keepAwake);keyBrightness=vd::ledBrightness(light,u.brightness);displayResting=displayIdle.resting(n,u.sleepEnabled,u.sleepDimSeconds)&&!keepAwake;if(displayBrightness.exchange(light)!=light)M5Dial.Display.setBrightness(light);
  if(light&&dirtyFrame.begin(visibleHash)){frame=u;frameState=uiState;}
  // Each strip is complete before transfer. The panel never shows a cleared frame.
  for(int k=0;light&&k<4;++k){int y=dirtyFrame.next();if(y<0)break;vd::paint(strip,frame,frameState,y);strip.pushSprite(&M5Dial.Display,0,y);}
  delay(2);
}

