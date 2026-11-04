import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/adapters.hpp',import.meta.url),'utf8');
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const hookStart=ino.indexOf('volcano.beforeOutputOn=')+'volcano.beforeOutputOn='.length,hookEnd=ino.indexOf('};',hookStart)+1;
const hook=ino.slice(hookStart,hookEnd),restore=ino.split('\n').find(line=>line.startsWith('void restoreOutputIntent(){'));assert(restore&&hook.startsWith('[]'));
const start=source.indexOf('  bool output(bool heater,bool on){'),end=source.indexOf('\n public:',start);
const hueStart=source.indexOf('  bool power(bool on,'),hueEnd=source.indexOf('\n  void discover(',hueStart);assert(start>=0&&end>start&&hueStart>=0&&hueEnd>hueStart);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-output-')),cpp=path.join(dir,'output.cpp'),exe=path.join(dir,'output.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include <functional>
#include <cstdint>
#include <string>
#include "${firmware}/cooling_intent.hpp"
#include <ArduinoJson.h>
using String=std::string;uint64_t clockMs=1000;uint64_t nowMs(){return clockMs;}void delay(unsigned n){clockMs+=n;}
std::atomic<bool> stopRequested{false};bool manualDemandValid(){return true;}
struct Store{std::string data;bool fail=false;std::string read(){return data;}bool write(const std::string& v){if(fail)return false;data=v;return true;}}store;
vd::CoolingIntent<Store> outputIntent(store);
JsonDocument config;bool fsReady=true,outputRestoring=false,wantConnection=false,recoveryOff=false;String notice;struct{bool criticalValue=false;bool critical(){return criticalValue;}}batteryMonitor;
${restore}
struct Device{
 struct{bool connected=true;}s;auto snapshot(){return s;}
 String error;bool manualHold=false,ownCommand=false;uint64_t quietUntil=0;int writes=0;void *heatOn=this,*heatOff=this,*fanOn=this,*fanOff=this,*stat=this;
 std::function<bool()> beforeOutputOn=[](){return outputIntent.begin("volcano");};
 bool write(void*,const uint8_t*,size_t){++writes;return true;}bool readU16(void*,uint16_t& v){v=0;return true;}void status(uint16_t,bool){}bool confirmed(bool,bool){return true;}
 ${source.slice(start,end)}
};
struct Plug{String error,plug="plug";int allowedCalls=0;bool read(bool& on){clockMs+=2000;on=false;return true;}bool request(const String&,const String&,JsonDocument&,const String&,bool,std::function<bool()>){return true;}
 ${source.slice(hueStart,hueEnd)}
};
int main(int argc,char**argv){int mode=std::stoi(argv[1]);Device d;config["volcanoId"]="volcano";d.beforeOutputOn=${hook};
 if(mode==0){store.fail=true;assert(!d.output(true,true));assert(d.writes==0&&!outputIntent.pending());}
 if(mode==1){assert(d.output(false,true));assert(d.writes==1);vd::CoolingIntent<Store> reboot(store);reboot.load();assert(reboot.pending()&&reboot.matches("volcano"));store.fail=true;assert(!reboot.complete()&&reboot.pending());}
 if(mode==2){store.fail=true;assert(d.output(true,false));assert(d.writes==1&&!outputIntent.pending());}
 if(mode==3){Plug p;int calls=0;assert(!p.power(false,[&](){++calls;return false;}));assert(calls==1);}
 if(mode==4||mode==5){assert(d.output(true,true));if(mode==5)config["volcanoId"]="other";restoreOutputIntent();assert(outputRestoring&&outputIntent.pending());assert(wantConnection==(mode==4)&&recoveryOff==(mode==4));assert(d.writes==1);}
 if(mode==6){batteryMonitor.criticalValue=true;assert(!d.output(false,true));assert(d.writes==0&&!outputIntent.pending());}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu','-I',path.join(process.env.VD_ARDUINO_JSON,'src'),cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Output ON requires durable ownership before its first GATT write'],[1,'Output ownership survives reset and a failed acknowledgement write'],[2,'Emergency OFF remains available when intent storage fails'],[3,'Hue already-OFF shortcut still invokes the cancellation/freshness guard']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const [mode,name]of [[4,'Boot restores an OFF-only obligation without sending any new ON'],[5,'Boot never redirects a stored output obligation to another device'],[6,'Critical battery admission guard also covers direct output ON']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
