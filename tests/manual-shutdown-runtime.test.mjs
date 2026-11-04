import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const start=source.indexOf('bool performManualShutdown(){'),end=source.indexOf('\nvoid worker(',start);assert(start>0&&end>start);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-manual-runtime-')),cpp=path.join(dir,'manual.cpp'),exe=path.join(dir,'manual.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include <ArduinoJson.h>
#include "${firmware}/manual_shutdown.hpp"
#include "${firmware}/core.hpp"
#include "${firmware}/interaction.hpp"
#include "${firmware}/power_policy.hpp"
#include "${firmware}/power_runtime.hpp"
#include "${firmware}/board_power.hpp"
#include "${firmware}/cooling_intent.hpp"
struct String:std::string{using std::string::string;using std::string::operator=;String()=default;String(std::string s):std::string(s){}bool isEmpty()const{return empty();}};
int mode;uint64_t clockMs=1000;uint64_t nowMs(){return clockMs;}std::string events;
std::atomic<bool> powerUiQuiesced{false},powerKeyQuiesced{false},powerOffInProgress{false},powerStandby{false},activationPending{true},localPowerHeld{false};
bool sessionHue=true,wantConnection=true,recoveryOff=true,localHeld=true,webHeld=true,stopRequested=false,runLocksKey=true,coolingRestore=true,outputRestoring=true,coolCancel=true,displayResting=false,apOn=true;
int inputContextDummy,selectionPending=2,airOwner=1,webMux=0,requests=0,displayBrightness=160,keyBrightness=255;
String notice,powerBlock,operation="old",sessionHueIdentity="bridge|plug";JsonDocument config;
vd::KeyContext inputContext=vd::KeyContext::Idle;
struct{unsigned n=0;void invalidate(){++n;}unsigned snapshot(){return n;}}requestFence;
struct Store{std::string data;bool fail=false;std::string read(){return data;}bool write(const std::string& v){if(fail)return false;data=v;return true;}}coolStore,outStore;
vd::CoolingIntent<Store> coolingIntent(coolStore),outputIntent(outStore);
std::string coolingIdentity(){return "cool-owner";}String managedPlugIdentity(){return "bridge|plug";}
struct{void cancel(){events+='C';}}cooldown;
vd::WebHoldLease webLease;
#define portENTER_CRITICAL(x)
#define portEXIT_CRITICAL(x)
#define pdMS_TO_TICKS(x) (x)
constexpr int pdTRUE=1,WIFI_OFF=0;
struct Request{char* text;};int xQueueReceive(int,Request*,int){return 0;}unsigned uxQueueMessagesWaiting(int){return 0;}
void publish(){}void vTaskDelay(unsigned n){clockMs+=n;if(mode!=8)powerUiQuiesced=powerKeyQuiesced=true;}
struct Device{
 vd::Snapshot s;unsigned generation=1;bool manualHold=true;int connects=0,polls=0;
 auto snapshot(){return s;}bool poll(){++polls;s.statusAt=nowMs();return mode!=4;}
 bool connect(const String&,int){++connects;s.connected=true;return true;}
 bool fan(bool on){assert(!on);events+='F';s.fan=s.fanRequested=false;return true;}
 bool heat(bool on){assert(!on);events+='H';s.heat=s.heatRequested=false;return true;}
 void disconnect(){events+='D';s.connected=false;++generation;}
}volcano;
struct Engine{bool active=true;bool busy(){return active;}void stop(uint64_t){events+='S';active=false;}}engine,hose;
bool busy(){return engine.busy()||hose.busy();}
struct {bool enabled=false,autoOff=false;String plug="12345678-1234-1234-1234-123456789012",key="key",bridgeId="bridge",error="offline";int offs=0;
 bool power(bool on,std::function<bool()> allowed){assert(!on);++offs;events+='P';if(mode==2||!allowed())return false;volcano.s.connected=false;++volcano.generation;return true;}
}hue;
struct IO{int cuts=0;bool clearRtc(){return mode!=7;}void latch(bool high){if(!high){++cuts;events+='L';}}}io;vd::BoardPower<IO> boardPower(io);
struct{void mode(int){events+='W';}}WiFi;
struct{struct{void setBrightness(int){}}Display;struct{void end(){}}Speaker;}M5Dial;
${source.slice(start,end)}
int main(int argc,char**argv){mode=std::stoi(argv[1]);config["volcanoId"]="volcano";config["volcanoType"]=0;
 volcano.s.connected=volcano.s.valid=true;volcano.s.heat=volcano.s.heatRequested=true;volcano.s.statusAt=nowMs();
 assert(coolingIntent.begin("cool-owner"));assert(outputIntent.begin("volcano"));
 if(mode==1||mode==4||mode==5){hue.plug="";coolingIntent.complete();sessionHue=false;}
 if(mode==9){hue.key="";sessionHue=false;}
 if(mode==3)outStore.fail=true;
 if(mode==5)volcano.s.connected=false;
 if(mode==6){wantConnection=recoveryOff=false;sessionHue=false;engine.active=hose.active=false;volcano.s.connected=false;coolingIntent.complete();outputIntent.complete();hue.plug="";}
 bool ok=performManualShutdown(),expected=mode==0||mode==1||mode==5||mode==6;
 assert(ok==expected);assert(powerStandby==expected);assert((io.cuts==1)==expected);
 if(expected){assert(!wantConnection&&!recoveryOff&&!sessionHue&&!coolingIntent.pending()&&!outputIntent.pending()&&!busy()&&!activationPending&&selectionPending==0&&!volcano.manualHold);assert(displayBrightness==0&&keyBrightness==0);if(mode==0){assert(hue.offs==1);assert(events.find('S')<events.find('P')&&events.find('P')<events.find('L'));assert(volcano.connects==0);}if(mode==5)assert(volcano.connects==1);if(mode==6)assert(volcano.connects==0);}
 else{assert(!powerOffInProgress);assert(!powerBlock.empty());if(mode==2||mode==3||mode==8)assert(outputIntent.pending());}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu','-I',path.join(process.env.VD_ARDUINO_JSON,'src'),cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Real manual worker overrides active cooling and switches configured Hue OFF even with enabled/autoOff false'],[1,'Real manual worker stops active outputs without a Hue socket'],[2,'Real manual worker reports failed Hue OFF and retains power/duties'],[3,'Real manual worker retains power on failed persisted output-duty retirement'],[4,'Real manual worker requires confirmed outputs without authoritative socket OFF'],[5,'Manual shutdown may make one OFF-only connection before cutoff'],[6,'Unowned idle manual shutdown never opens a Volcano connection'],[7,'Real manual worker reports RTC release failure'],[8,'Real manual worker cannot cut power before UI/key quiescence'],[9,'Incomplete Hue configuration never erases an unfulfilled saved socket OFF duty']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
