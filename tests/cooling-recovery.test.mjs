import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const start=source.indexOf('std::string coolingIdentity()'),end=source.indexOf('\nbool saveConfig()',start);
assert(start>=0&&end>start);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-cooling-')),cpp=path.join(dir,'cooling.cpp'),exe=path.join(dir,'cooling.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <cstdint>
#include <string>
#include "${fileURLToPath(new URL('../firmware/VolcanoDial/cooling_intent.hpp',import.meta.url)).replaceAll('\\','/')}"
using String=std::string;
struct Field{const char* value;const char* operator|(const char*)const{return value;}};
struct {Field operator[](const char*){return {"11:22:33:44:55:66"};}}config;
struct Store{std::string value;bool fail=false;std::string read(){return value;}bool write(const std::string& v){if(fail)return false;value=v;return true;}}coolingStore;
vd::CoolingIntent<Store> coolingIntent(coolingStore);
struct {bool initialized=false;bool getBool(const char*,bool){return initialized;}int putBool(const char*,bool v){initialized=v;return 1;}}preferences;
struct {String bridgeId="0123456789abcdef",plug="01234567-0123-0123-0123-0123456789ab",error="Hue unavailable";bool enabled=true,autoOff=true,on=true,ok=true;int reads=0;bool read(bool& v){++reads;v=on;return ok;}}hue;
struct {bool armed=false;void cancel(){armed=false;}void arm(const std::string&){armed=true;}}cooldown;
struct {int disconnects=0;void disconnect(){++disconnects;}}volcano;
String notice;bool sessionHue=false,wantConnection=false,recoveryOff=false,coolingRestore=true,stopRequested=false;
uint64_t coolingRecoveryAt=0,coolingRetryAt=0,clockMs=1000;unsigned coolingFailures=0;
bool active=false;bool busy(){return active;}uint64_t nowMs(){return clockMs;}
${source.slice(start,end)}
int main(int argc,char**argv){int mode=std::stoi(argv[1]);
 if(mode==1)hue.on=false;if(mode==2)hue.ok=false;if(mode==3)active=true;if(mode==4)hue.autoOff=false;
 if(mode==5){coolingStore.value="other|bridge|plug";coolingIntent.load();}
 if(mode==6){assert(coolingIntent.begin(coolingIdentity()));preferences.initialized=true;}
 if(mode==7){coolingStore.fail=true;assert(!rememberCooling());assert(!sessionHue);return 0;}
 if(mode==8){assert(rememberCooling());cooldown.armed=true;acknowledgeCooling();assert(!coolingIntent.pending());assert(!cooldown.armed);assert(!sessionHue&&!wantConnection);assert(volcano.disconnects==1);return 0;}
 if(mode==9){assert(rememberCooling());coolingStore.fail=true;acknowledgeCooling();assert(coolingIntent.pending());assert(coolingRestore);assert(!wantConnection);return 0;}
 if(mode==11||mode==12){assert(rememberCooling());sessionHue=true;cooldown.cancel();active=mode==12;syncCooling();assert(coolingIntent.pending());assert(cooldown.armed==(mode==11));return 0;}
 recoverCooling(mode!=10);
 if(mode==0||mode==6){assert(coolingIntent.matches(coolingIdentity()));assert(sessionHue&&wantConnection&&recoveryOff);assert(!coolingRestore);assert(preferences.initialized);}
 if(mode==1){assert(!coolingIntent.pending());assert(!wantConnection&&!sessionHue);assert(!coolingRestore);assert(preferences.initialized);}
 if(mode==2){assert(coolingRestore);assert(!wantConnection);assert(!preferences.initialized);}
 if(mode==3||mode==4||mode==5||mode==10){assert(!wantConnection);assert(!sessionHue);assert(hue.reads==0);}
}
`);
const compiled=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
for(const[mode,name]of [[0,'Legacy powered plug adopts cooling without energizing outputs'],[1,'Legacy plug already off does not connect or start anything'],[2,'Hue failure keeps bootstrap recovery pending'],[3,'Active workflow cannot be interrupted by startup recovery'],[4,'Disabled auto-off cannot switch the plug'],[5,'Stored different device cannot control the selected plug'],[6,'Stored request resumes after reboot without program restart'],[7,'NVS failure prevents managed start'],[8,'Confirmed OFF clears ownership and disconnects'],[9,'Failed NVS clear retains recovery after confirmed OFF'],[10,'Recovery waits for network and verified clock'],[11,'Stop or browsing resumes cooling without losing ownership'],[12,'Workflow checkpoint blocks cooling cutoff']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
