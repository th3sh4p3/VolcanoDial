import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Compile production preparation/start and real compiler/engine/input classes.
// Substitute only the external transport, persistence, Arduino String and clock.
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const adapters=fs.readFileSync(new URL('../firmware/VolcanoDial/adapters.hpp',import.meta.url),'utf8');
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
const prepare=section(ino,'bool prepare(bool bypass','\nbool selectByDelta(');
const run=section(ino,'bool runSelected(bool fromInput','\nbool execute(');
const selectDelta=section(ino,'bool selectByDelta(int delta)','\nbool runSelected(');
const selectBranch=section(ino,'  if(command=="selectStage"){','\n  if(command=="connect")');
const rfidBranch=section(ino,'  if(command=="rfidSeen"){','\n  if(command=="rfidLearn")');
const retryHelper=ino.includes('bool stageRetryAvailable(){')?section(ino,'bool stageRetryAvailable(){','\nvd::KeyContext context()'):'bool stageRetryAvailable(){return false;}';
const previewHelper=section(ino,'void refreshPreview(){','\nvoid normalizeOrder()');
const manual=section(ino,'  if(command=="heat"||command=="fan")','\n  if(command=="timer")');
const disconnect=section(adapters,'  void disconnect(){','\n  bool poll(){').replaceAll('portENTER_CRITICAL(&mux);','').replaceAll('portEXIT_CRITICAL(&mux);','');
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const daily=fs.readFileSync(new URL('../examples/Daily.json',import.meta.url),'utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-power-restart-')),cpp=path.join(dir,'start.cpp'),exe=path.join(dir,'start.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include <ctime>
#include "${firmware}/interaction.hpp"
#include "${firmware}/display_idle.hpp"
struct String:std::string{using std::string::string;using std::string::operator=;bool isEmpty()const{return empty();}};
std::atomic<bool> stopRequested{false},keyHeld{false},runLocksKey{false};
std::atomic<int> selectionPending{0};
uint64_t clockMs=1000;int mode=0;
uint64_t nowMs(){return clockMs;}void delay(unsigned n){clockMs+=n;if(mode==3)stopRequested=true;}
JsonDocument config,library;String notice,operation,revision="revA",lastRunId,lastRunRevision,rfidSeen;vd::KeyContext inputContext;
String previewId,previewRevision,stageChoiceId,stageChoiceRevision;int previewStages=0,stageChoice=0;
bool fsReady=true,sessionHue=false,wantConnection=false,recoveryOff=false,coolingRestore=false,activationPending=false,coolCancel=false;
unsigned airOwner=0,reconnectAttempt=0,lastGeneration=0;uint64_t retryAt=0;
constexpr int WL_CONNECTED=3;struct{int status(){return WL_CONNECTED;}}WiFi;
struct{bool saved=false;bool pending(){return saved;}}coolingIntent;
bool rememberCooling(){coolingIntent.saved=true;coolingRestore=false;return true;}
vd::Cooldown cooldown;void publish(){}
struct{bool enabled=true,plugOn=false;int ons=0;String error="Hue failed";
 bool power(bool on,std::function<bool()> allowed){assert(on);if(!allowed())return false;++ons;if(mode==7)return false;plugOn=true;if(mode==6)stopRequested=true;return true;}
}hue;
struct FakeVolcano:vd::DeviceIO{
 vd::Snapshot s;unsigned generation=0;bool manualHold=false;String error="Bluetooth unavailable";
 int connects=0,polls=0,disconnects=0,heatOns=0,fanOns=0,heatOffs=0,fanOffs=0;
 vd::Snapshot snapshot()override{return s;}
 bool connect(const String&,int){++connects;clockMs+=10;if(mode==4)stopRequested=true;
  bool ok=mode!=2&&((mode!=0&&mode!=3)||connects>=2);s.connected=s.valid=ok;s.target=180;s.current=180;s.sampleAt=s.statusAt=clockMs;if(ok)++generation;return ok;}
 bool poll(){++polls;clockMs+=10;if(mode==1){s.connected=false;return false;}return s.connected;}
 void disconnect(){++disconnects;s.connected=s.valid=false;}
 bool target(double v)override{s.target=v;return true;}
 bool heat(bool on)override{on?++heatOns:++heatOffs;if(!on&&mode==5)return false;s.heat=s.heatRequested=s.interlock=on;s.statusAt=clockMs;return true;}
 bool fan(bool on)override{on?++fanOns:++fanOffs;s.fan=s.fanRequested=on;s.statusAt=clockMs;return true;}
 bool refreshTemperature()override{s.sampleAt=clockMs;return s.connected;}
 uint64_t monotonic()override{return clockMs;}
}volcano;
vd::Engine engine(volcano);vd::HoseSession hose(volcano);
bool hoseSelected(){return String(config["selectedMode"]|"")=="hose";}
${previewHelper}
bool saveConfig(){return true;}bool saveLibrary(){revision="changed";return true;}
${retryHelper}
${prepare}
${selectDelta}
${run}
bool manualExecute(JsonVariant r){String command=r["command"]|"";${manual}return false;}
bool selectionExecute(JsonVariant r){String command=r["command"]|"";${selectBranch}${rfidBranch}return false;}
// Exercise explicit disconnect before a transport callback arrives.
struct CachedLink{bool physicalHeat=true;vd::Snapshot data;int mux=0;std::atomic<unsigned> generation{0};
 struct Client{bool isConnected(){return true;}void disconnect(){}}transport;Client* client=&transport;
 ${disconnect}
};
int main(int argc,char**argv){mode=std::stoi(argv[1]);
 config["volcanoId"]="11:22:33:44:55:66";
 assert(!deserializeJson(library,R"({"settingsVersion":2,"globalVariables":[],"presets":[{"id":"p","name":"Daily first","kind":"simple","startTemp":180,"endTemp":180,"steps":1,"fillTime":5}],"workflows":[],"activeRunnable":{"kind":"preset","id":"p"}})"));
 if(mode==0||mode>=20)assert(!deserializeJson(library,R"daily(${daily})daily"));
 if(mode==1||mode==8||mode==9||mode==10||(mode>=15&&mode<20)){volcano.s.connected=volcano.s.valid=true;volcano.s.target=180;}
 if(mode==9)stopRequested=true;
 if(mode==10){volcano.s.heat=volcano.s.heatRequested=true;assert(prepare());assert(hue.ons==1);assert(volcano.heatOffs==0&&volcano.fanOffs==0);assert(volcano.s.heat);return 0;}
 if(mode==11){CachedLink link;link.data.connected=link.data.valid=true;link.disconnect();assert(!link.data.connected&&!link.data.valid&&!link.physicalHeat);return 0;}
 if(mode==12){config["selectedMode"]="hose";config["hoseTemperature"]=210;}
 if(mode==13){hue.enabled=false;assert(prepare(true));assert(hue.ons==0&&volcano.connects==1);return 0;}
 if(mode==14){config["volcanoId"]="";assert(!runSelected());assert(hue.ons==0&&volcano.connects==0);return 0;}
 if(mode==36){
  library.clear();assert(!deserializeJson(library,R"({"runnableOrder":[{"kind":"workflow","id":"daily"},{"kind":"workflow","id":"a847fe34-93c1-472a-9750-d4b473c5f78d"},{"kind":"preset","id":"ak3-a"}],"activeRunnable":{"kind":"workflow","id":"daily"}})"));
  assert(selectByDelta(1));assert(String(library["activeRunnable"]["id"]|"")=="a847fe34-93c1-472a-9750-d4b473c5f78d");
  assert(selectByDelta(1));assert(hoseSelected());
  assert(selectByDelta(1));assert(!hoseSelected());assert(String(library["activeRunnable"]["id"]|"")=="ak3-a");
  assert(selectByDelta(-1));assert(hoseSelected());
  assert(selectByDelta(-1));assert(String(library["activeRunnable"]["id"]|"")=="a847fe34-93c1-472a-9750-d4b473c5f78d");
  return 0;
 }
 if(mode>=20){
  auto tick=[&](){clockMs+=1000;volcano.s.current=230;volcano.s.sampleAt=volcano.s.statusAt=clockMs;engine.tick(clockMs);};
  auto finishStage=[&](){for(int i=0;i<180&&engine.phase==vd::Phase::Running;++i)tick();assert(engine.phase==vd::Phase::AwaitingNext||engine.phase==vd::Phase::Complete);};
  if(mode==33||mode==34||mode==35){
   if(mode==35){assert(runSelected());finishStage();assert(runSelected());engine.stop(clockMs);assert(engine.canRestartStage());}
   JsonDocument stage;stage["command"]="selectStage";stage["value"]=mode==33?2:3;
   assert(selectionExecute(stage));assert(runSelected());assert(engine.stageIndex==(mode==33?1:2));
   tick();assert(volcano.s.target==(mode==33?221:222));finishStage();
   if(mode==33){assert(engine.phase==vd::Phase::AwaitingNext);assert(runSelected());assert(engine.stageIndex==2);tick();assert(volcano.s.target==222);}
   else assert(engine.phase==vd::Phase::Complete);
   return 0;
  }
  assert(runSelected());
  finishStage();assert(engine.stageIndex==0&&engine.phase==vd::Phase::AwaitingNext);
  if(mode==21){engine.stop(clockMs);assert(engine.phase==vd::Phase::Aborted);assert(runSelected());assert(engine.stageIndex==1&&engine.actionIndex==0);return 0;}
  assert(runSelected());assert(engine.stageIndex==1);tick();assert(volcano.s.target==221);
  if(mode==20){for(int i=0;i<6&&!volcano.s.fan;++i)tick();assert(volcano.s.fan);tick();tick();tick();assert(engine.remaining<53&&engine.remaining>0);}
  if(mode==28){finishStage();assert(runSelected());assert(engine.stageIndex==2);tick();assert(volcano.s.target==222);}
  if(mode==24){finishStage();assert(runSelected());finishStage();assert(engine.phase==vd::Phase::Complete);assert(runSelected());assert(engine.stageIndex==0);return 0;}
  if(mode==25){mode=5;engine.stop(clockMs);assert(engine.phase==vd::Phase::Error);assert(!runSelected());assert(!engine.busy());return 0;}
  engine.stop(clockMs);assert(engine.phase==vd::Phase::Aborted&&!volcano.s.heat&&!volcano.s.fan);
  unsigned heatOns=volcano.heatOns;tick();assert(engine.phase==vd::Phase::Aborted&&volcano.heatOns==heatOns);
  if(mode==22)revision="edited";
  if(mode==23){auto copy=library["workflows"].add<JsonObject>();copy.set(library["workflows"][0]);copy["id"]="another";library["activeRunnable"]["id"]="another";}
  if(mode==26)engine.stop(clockMs);
  if(mode==27)volcano.s.connected=volcano.s.valid=false;
  if(mode==29){mode=7;assert(!runSelected());assert(stageRetryAvailable());mode=29;}
  if(mode==30){volcano.s.connected=volcano.s.valid=false;mode=5;assert(!runSelected());assert(!stageRetryAvailable());mode=30;}
  if(mode==31||mode==32){
   JsonDocument request;request["command"]="select";request["ref"]["kind"]="hose";request["ref"]["id"]="dial-hose";
   if(mode==31)assert(selectionExecute(request));else assert(selectByDelta(-1));
   assert(hoseSelected());request.clear();request["command"]="rfidSeen";request["uid"]="unmapped";assert(selectionExecute(request));assert(!hoseSelected());assert(!stageRetryAvailable());
  }
  bool fresh=mode==22||mode==23||mode==30||mode==31||mode==32;
  assert(runSelected());assert(engine.actionIndex==0);assert(engine.stageIndex==(fresh?0:mode==28?2:1));
  tick();assert(volcano.s.target==(fresh?170:mode==28?222:221));
  if(mode==20){for(int i=0;i<5&&!volcano.s.fan;++i)tick();assert(volcano.s.fan&&engine.remaining>=52);}
  return 0;
 }
 if(mode>=15&&mode<20){
  volcano.s.heat=volcano.s.heatRequested=true;volcano.s.fan=volcano.s.fanRequested=true;
  JsonDocument request;request["command"]=mode==16?"fan":"heat";
  if(mode==17)request["on"]=false;
  if(mode==15||mode==16||mode==17)mode=7; // Hue unavailable, BLE healthy.
  else mode=1; // A cached poll would fail and reconnect would clear outputs.
  assert(manualExecute(request));assert(hue.ons==0&&volcano.connects==0&&volcano.polls==0);
  assert(volcano.heatOns==0&&volcano.fanOns==0);
  if(String(request["command"]|"")=="heat")assert(!volcano.s.heat);else assert(!volcano.s.fan);
  return 0;
 }
 if(mode==8){
  vd::KeyInput input;vd::WakePress wake;bool resting=true;
  auto step=[&](bool held){bool consumed=wake.consume(held,resting);if(consumed)resting=false;
   auto action=input.tick(held,true,consumed?vd::KeyContext::Fault:vd::KeyContext::Idle,clockMs);
   if(action==vd::InputAction::Activate)assert(runSelected(true));clockMs+=50;};
  step(false);step(true);step(true);assert(hue.ons==0&&!engine.busy());
  step(false);step(true);step(true);assert(hue.ons==1&&engine.busy());return 0;
 }
 bool ok=runSelected();
 if(mode==0||mode==1){assert(ok);assert(hue.ons==1&&hue.plugOn);assert(volcano.connects==(mode==0?2:1));assert(engine.busy());
  if(mode==0){assert(engine.currentPlan().workflow&&engine.currentPlan().stages.size()==3);assert(engine.currentPlan().stages[2].actions[0].value==222);}
  engine.tick(clockMs);engine.tick(clockMs);assert(volcano.heatOns==1&&volcano.fanOns==0);}
 if(mode==2){assert(!ok);assert(hue.ons==1&&volcano.connects==3);assert(clockMs<31000);assert(coolingIntent.pending()&&wantConnection&&sessionHue);assert(!engine.busy());
  volcano.s.connected=volcano.s.valid=true;engine.tick(clockMs);assert(!engine.busy()&&volcano.heatOns==0);}
 if(mode==3){assert(!ok);assert(volcano.connects==1);assert(volcano.heatOns==0&&!engine.busy());}
 if(mode==4){assert(!ok);assert(volcano.connects==1);assert(volcano.heatOns==0&&!engine.busy());}
 if(mode==5){assert(!ok);assert(volcano.connects==1);assert(volcano.heatOns==0&&!engine.busy());}
 if(mode==6){assert(!ok);assert(hue.ons==1&&volcano.connects==0);assert(!engine.busy());}
 if(mode==7){assert(!ok);assert(volcano.connects==0&&!engine.busy());assert(coolingIntent.pending());}
 if(mode==9){assert(!ok);assert(hue.ons==0&&volcano.connects==0&&!engine.busy());}
 if(mode==12){assert(ok);assert(hue.ons==1&&hose.busy()&&volcano.heatOns==1&&volcano.fanOns==0);}
}
`);
const result=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu','-I',path.join(process.env.VD_ARDUINO_JSON,'src'),cpp,'-o',exe],{encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
for(const [mode,name]of[
 [0,'Cold Daily start survives first BLE failure, preserves 03 at 222 C and heats once'],
 [1,'Cached link after plug OFF verifies Hue ON and replaces stale BLE'],
 [2,'Permanent failure is bounded and cannot auto-start on later connection'],
 [3,'Stop during retry pause cancels the pending program'],
 [4,'Stop during BLE connect prevents program start'],
 [5,'Failed output OFF confirmation is not a reason to retry start'],
 [6,'Stop after Hue ON prevents Bluetooth and program start'],
 [7,'Hue failure prevents Bluetooth and retains cooling ownership'],
 [8,'Sleeping first press only wakes; second gesture starts once'],
 [9,'Already cancelled start cannot power Hue or reuse cached link'],
 [10,'Preparing a live manual session preserves its active outputs'],
 [11,'Explicit disconnect invalidates cache before asynchronous callback'],
 [12,'Hose start also powers Hue and starts heating once'],
 [13,'Hue bypass can connect without switching a plug'],
 [14,'Missing Volcano identity cannot power a plug'],
 [15,'Manual heat OFF works over healthy BLE when Hue is unavailable'],
 [16,'Manual fan OFF works over healthy BLE when Hue is unavailable'],
 [17,'Explicit output OFF never powers Hue or needs preparation'],
 [18,'Manual OFF intention cannot be inverted by reconnect status changes'],
 [20,'Stopped Daily stage2 restarts at action0 with full air budget'],
 [21,'Stop at a checkpoint targets the next unfinished stage'],
 [22,'Edited library invalidates an aborted stage restart'],
 [23,'Another workflow cannot inherit the old stage index'],
 [24,'Completed workflow starts again at its first stage'],
 [25,'Failed OFF confirmation cannot offer an aborted stage retry'],
 [26,'A second Stop preserves the interrupted workflow stage'],
 [27,'Stage retry survives Hue/BLE preparation after automatic power OFF'],
 [28,'Stopped Daily stage3 restarts only 03 at constant 222 C'],
 [29,'Ordinary Hue failure retains the confirmed interrupted stage'],
 [30,'Preparation OFF failure discards retry even after subsequent recovery'],
 [31,'Selecting hose then an unmapped RFID cannot resurrect a retry point'],
 [32,'Dial rotation to hose invalidates retry before an unmapped RFID'],
 [33,'Ring stage 2 starts Daily at 02 and continues to 03'],
 [34,'Ring stage 3 runs only Daily 03'],
 [35,'Explicit ring choice overrides an interrupted stage retry'],
 [36,'Dial rotation puts hose immediately after Aroma-Kurve 3 in both directions'],
])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
