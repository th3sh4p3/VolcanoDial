import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const a=source.indexOf('    if(powerOffRequested.exchange(false)){'),b=source.indexOf('\n    if(powerStandby)continue;',a);assert(a>=0&&b>a);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-shutdown-')),cpp=path.join(dir,'shutdown.cpp'),exe=path.join(dir,'shutdown.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include "${firmware}/core.hpp"
#include "${firmware}/interaction.hpp"
#include "${firmware}/power_runtime.hpp"
#include "${firmware}/power_policy.hpp"
#include "${firmware}/board_power.hpp"
struct String:std::string{using std::string::string;using std::string::operator=;bool isEmpty()const{return empty();}};
int mode=0;uint64_t clockMs=1000;uint64_t nowMs(){return clockMs;}
std::atomic<bool> powerOffRequested{true},powerOffInProgress{false},powerStandby{false},powerUiQuiesced{true},powerKeyQuiesced{true},activationPending{false},displayResting{false};
std::atomic<unsigned> powerActivityEpoch{0},powerOffActivityEpoch{0};std::atomic<int> displayBrightness{160},keyBrightness{255},selectionPending{0};
bool wantConnection=false,recoveryOff=false,sessionHue=false,apOn=false;String notice,powerBlock;
String sessionHueIdentity="bridge|plug";String managedPlugIdentity(){return "bridge|plug";}
vd::KeyContext inputContext=vd::KeyContext::Idle;
vd::PowerSafety safety;vd::PowerSafety powerSafety(){return safety;}
struct{unsigned epoch=0;unsigned snapshot(){return epoch;}void invalidate(){++epoch;}}requestFence;
void publish(){}constexpr int WIFI_OFF=0;struct{void mode(int){}}WiFi;
struct{struct{void setBrightness(int){}}Display;struct{void end(){}}Speaker;}M5Dial;
void vTaskDelay(unsigned n){clockMs+=n;if(mode!=5)powerUiQuiesced=powerKeyQuiesced=true;}
#define pdMS_TO_TICKS(n) (n)
struct{vd::Snapshot s;unsigned generation=1;int polls=0;vd::Snapshot snapshot(){return s;}bool poll(){++polls;if(mode==3)return false;s.statusAt=nowMs();return true;}void disconnect(){s.connected=false;++generation;}}volcano;
struct IO{bool high=true;int cuts=0;bool clearRtc(){if(mode==4)++powerActivityEpoch;if(mode==7)clockMs+=1600;if(mode==9)safety.manualHeld=true;return mode!=11;}void latch(bool v){high=v;if(!v)++cuts;}}io;
vd::BoardPower<IO> boardPower(io);
struct{bool enabled=false;int offs=0;String error="Hue fehlt";bool power(bool on,std::function<bool()> allowed){assert(!on);++offs;if(mode==2)return false;clockMs+=2000;if(mode==12){++volcano.generation;return true;}if(!allowed())return false;clockMs+=2000;if(!allowed())return false;if(mode!=13){volcano.s.connected=false;++volcano.generation;}return true;}}hue;
void shutdown(){${source.slice(a,b)}}
int main(int argc,char**argv){mode=std::stoi(argv[1]);
 if(mode==1)safety.busy=true;
 if(mode==2||mode==6||mode==8||mode==12||mode==13)hue.enabled=true;
 if(mode==6||mode==8)sessionHue=true;
 if(mode==3||mode==6||mode==7||mode==8||mode==12||mode==13){wantConnection=true;volcano.s.connected=volcano.s.valid=true;volcano.s.statusAt=nowMs();}
 if(mode==3)volcano.s.connected=false;
 if(mode==5)powerUiQuiesced=false;
 if(mode==10)++powerActivityEpoch;
 shutdown();
 bool expected=mode==0||mode==6||mode==8||mode==13;assert(powerStandby==expected);assert((io.cuts==1)==expected);assert(io.high!=expected);
 if(expected){assert(!wantConnection&&!sessionHue);assert(displayBrightness==0&&keyBrightness==0);}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu','-I',path.join(process.env.VD_ARDUINO_JSON,'src'),cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Unowned idle boot may shut down without opening a Volcano connection'],[1,'Active operation prevents power cutoff'],[2,'Hue failure retains the power latch'],[3,'Lost owned BLE link is never false OFF evidence'],[4,'New activity during RTC cleanup cancels shutdown'],[5,'UI that has not stopped rendering prevents cutoff'],[6,'Confirmed managed Hue OFF tolerates the expected BLE disconnect'],[7,'OFF evidence expiring during RTC cleanup prevents cutoff'],[8,'Hue network delays require refreshed pre-switch OFF evidence'],[9,'A newly held control cancels cutoff'],[10,'Activity after a queued shutdown request cancels the old request'],[11,'RTC verification failure retains power']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
test('An unrelated already-OFF plug never waives stale BLE evidence',()=>{const r=spawnSync(exe,['12'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test('Bypass sessions still require fresh final BLE OFF evidence',()=>{const r=spawnSync(exe,['13'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
