import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const a=source.indexOf('bool prepare(bool bypass'),b=source.indexOf('\nbool selectByDelta(',a);
const c=source.indexOf('  if(command=="bleScan")'),d=source.indexOf('\n  if(command=="hueDiscover")',c);
assert(a>=0&&b>a&&c>=0&&d>c);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-cooling-start-')),cpp=path.join(dir,'start.cpp'),exe=path.join(dir,'start.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include <cstdint>
#include <string>
#include <ctime>
#include <functional>
struct String:std::string{using std::string::string;using std::string::operator=;bool isEmpty()const{return empty();}};
namespace vd{enum class KeyContext{Fault};enum class Readiness{Ready,Waiting,Cancelled};Readiness startReadiness(bool,bool,bool,uint64_t){return Readiness::Ready;}}
bool missing=false;struct Field{const char* operator|(const char*){return missing?"":"11:22:33:44:55:66";}int operator|(int){return 0;}};struct{Field operator[](const char*){return {};}}config;
struct JsonArray{};struct FieldArray{template<class T>T to(){return {};}template<class T>T as(){return {};}};struct{FieldArray operator[](const char*){return {};}}discoveries;
std::atomic<bool> stopRequested{false};bool stopAfterPower=false;
struct {bool enabled=true;String error="Hue error";int ons=0;bool power(bool on,std::function<bool()> check){assert(on);if(!check())return false;++ons;if(stopAfterPower)stopRequested=true;return true;}}hue;
struct {bool connected=false,connectOK=false,manualHold=false;unsigned generation=0;String error="BLE error";int connects=0,scans=0;struct Snapshot{bool connected;};Snapshot snapshot(){return {connected};}bool connect(String,int){++connects;connected=connectOK;return connected;}bool poll(){return connected;}void disconnect(){connected=false;}bool heat(bool on){assert(!on);return true;}bool fan(bool on){assert(!on);return true;}void scan(JsonArray){++scans;}}volcano;
struct{void cancel(){}}cooldown;
struct{void discardStageRestart(){}}engine;
bool fsReady=true,sessionHue=false,wantConnection=false,recoveryOff=false,coolingRestore=true,activationPending=false;
bool coolCancel=false;unsigned airOwner=0,reconnectAttempt=0,lastGeneration=0;
uint64_t retryAt=0,clockMs=1000;uint64_t nowMs(){return clockMs;}void delay(int n){clockMs+=n;}
String notice,operation;vd::KeyContext inputContext;
constexpr int WL_CONNECTED=3;struct{int status(){return WL_CONNECTED;}}WiFi;
void publish(){}std::string coolingIdentity(){return missing?"":"valid";}
struct{bool saved=false;bool pending(){return saved;}bool matches(const std::string& id){return saved&&id=="valid";}}coolingIntent;
bool rememberCooling(){if(missing)return false;coolingIntent.saved=true;coolingRestore=false;return true;}
${source.slice(a,b)}
bool scan(){String command="bleScan";${source.slice(c,d)}return false;}
int main(int argc,char**argv){int mode=std::stoi(argv[1]);
 if(mode==0){assert(!prepare());assert(hue.ons==1);assert(coolingIntent.pending());assert(sessionHue&&wantConnection);assert(recoveryOff);}
 if(mode==1){missing=true;assert(scan());assert(hue.ons==0);assert(volcano.scans==1);assert(!coolingIntent.pending());}
 if(mode==2){missing=true;assert(!prepare());assert(hue.ons==0);assert(volcano.connects==0);}
 if(mode==3){stopAfterPower=true;assert(!prepare());assert(hue.ons==1);assert(coolingIntent.pending());assert(sessionHue&&wantConnection&&recoveryOff);assert(volcano.connects==0);}
}
`);
const r=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
for(const[mode,name]of [[0,'Initial BLE failure retains reconnect and OFF recovery ownership'],[1,'First-time discovery scans without energizing an unidentified Volcano'],[2,'Managed connect without Volcano identity never powers Hue'],[3,'Stop immediately after Hue ON retains cooling recovery']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
