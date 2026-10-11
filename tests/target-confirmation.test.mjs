import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Exercise the actual target method. Only the external GATT transport, Arduino
// String and clock are substituted so dropped writes are reproducible on a PC.
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/adapters.hpp',import.meta.url),'utf8');
const start=source.indexOf('  bool confirmTarget(double c,bool restoring){');
const end=source.indexOf('  bool refreshTemperature()',start);
assert.ok(start>=0&&end>start);
const method=source.slice(start,end).replaceAll(' override','');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-target-'));
const cpp=path.join(dir,'target.cpp'),exe=path.join(dir,'target.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <cmath>
#include <cstdint>
#include <atomic>
#include <algorithm>
#include <string>
#include <vector>
#include <sstream>
struct String : std::string {using std::string::string;using std::string::operator=;String(const std::string& s):std::string(s){} String(double n,int){std::ostringstream o;o<<n;assign(o.str());}};
uint64_t clockMs=0;std::atomic<bool> stopRequested{false},endHoseRequested{false};
uint64_t nowMs(){return clockMs;}void delay(unsigned n){clockMs+=n;}
struct Target {
 struct Snapshot{bool connected=true,heat=false,fan=false,heatRequested=false,fanRequested=false,interlock=false;};Snapshot snap;
 double cached=195;std::string error;double lastTargetRequested=NAN,lastTargetObserved=NAN;
 unsigned targetFailures=0,targetRetries=0,targetWrites=0,lastTargetMs=0,maxTargetMs=0;
 uint64_t quietUntil=0;void* targetChar=nullptr;unsigned writes=0,reads=0;int mode=0;uint16_t actual=2200;
 std::vector<std::vector<uint8_t>> payloads;
 Snapshot snapshot(){return snap;}
 struct{double target=195;}data;int mux=0;
 bool write(void*,const uint8_t* b,size_t n){++writes;payloads.emplace_back(b,b+n);clockMs+=40;if(mode==3){snap.connected=false;return false;}if(n!=4)return true;uint16_t wanted=b[0]|uint16_t(b[1])<<8;if(mode!=2&&!(mode==1&&writes==1)&&mode!=4&&mode!=5)actual=wanted;return true;}
 bool readU16(void*,uint16_t& v){clockMs+=120;++reads;if(mode==4)stopRequested=true;if(mode==5&&clockMs>=1800&&payloads.back().size()==4)actual=2210;v=actual;return snap.connected;}
 ${method}
};
int main(int argc,char**argv){Target t;t.mode=argc>1?std::stoi(argv[1]):0;
 if(t.mode==6)stopRequested=true;if(t.mode==7){stopRequested=true;t.snap.heat=true;}if(t.mode==8)endHoseRequested=true;
 bool ok=t.mode==6||t.mode==7?t.restoreTarget(221):t.target(221);
 if(t.mode==0){assert(ok);assert(t.payloads.size()==1);assert((t.payloads[0]==std::vector<uint8_t>{0xa2,0x08,0,0}));assert(t.data.target==221);}
 if(t.mode==1){assert(ok);assert(t.writes==2);assert(t.payloads[0]==t.payloads[1]);assert(t.data.target==221);}
 if(t.mode==2){assert(!ok);assert(t.writes<=3);assert(clockMs<10000);assert(t.data.target==195);assert(t.targetFailures==1);}
 if(t.mode==3){assert(!ok);assert(t.writes==1);assert(t.data.target==195);}
 if(t.mode==4){assert(!ok);assert(t.writes==1);assert(t.data.target==195);}
 if(t.mode==5){assert(ok);assert(t.writes==1);assert(t.reads>1);assert(clockMs>=1800);assert(t.data.target==221);}
 if(t.mode==6){assert(ok);assert(t.writes==1);assert(t.data.target==221);assert(stopRequested);}
 if(t.mode==7){assert(!ok);assert(t.writes==0);assert(t.data.target==195);}
 if(t.mode==8){assert(!ok);assert(t.writes==0);assert(t.data.target==195);}
}
`.replaceAll('portENTER_CRITICAL(&mux);','').replaceAll('portEXIT_CRITICAL(&mux);',''));
const compiled=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stderr);
for(const [mode,name] of [[0,'Target write uses the Volcano 32-bit little-endian format'],[1,'ACK without applied target is retried and exact value confirmed'],[2,'Persistent wrong target stays a bounded failure'],[3,'Disconnect prohibits another target write'],[4,'Stop while waiting prohibits retry and success'],[5,'Delayed exact readback succeeds without another write'],[6,'Output-off cleanup restores target with Stop still asserted'],[7,'Cleanup cannot restore a target with active outputs'],[8,'Ending hose mode cancels a normal target command']]){
 test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
}
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
