import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Compile the actual Volcano::poll body with controlled BLE reads. A missing
// optional status response is unknown telemetry, not a device fault bit.
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/adapters.hpp',import.meta.url),'utf8');
const start=source.indexOf('  bool poll(){');
const end=source.indexOf('  bool refreshStatus()',start);
assert.ok(start>=0&&end>start);
const method=source.slice(start,end).replaceAll('portENTER_CRITICAL(&mux);','').replaceAll('portEXIT_CRITICAL(&mux);','');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-checkpoint-'));
const cpp=path.join(dir,'checkpoint.cpp'),exe=path.join(dir,'checkpoint.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <cstdint>
#include <atomic>
std::atomic<bool> stopRequested{false},endHoseRequested{false};
bool manualDemandValid(){return true;}
namespace vd {bool optionalReadAllowed(bool,bool,bool,bool){return true;}}
struct Poll {
 struct Snapshot {bool connected=true,valid=true,fault=false;int target=180;};
 Snapshot data;bool status1Fault=false,status2Fault=false,manualHold=false,missSecondary=false;
 int statId=1,stat2Id=2,targetId=3;int *stat=&statId,*stat2=&stat2Id,*targetChar=&targetId;
 Snapshot snapshot(){return data;}
 bool readU16(int* c,uint16_t& v){if(c==stat2&&missSecondary)return false;v=c==stat2?0:c==targetChar?2100:0;return true;}
 void status(uint16_t,bool){data.valid=true;data.fault=status1Fault||status2Fault;}
 bool refreshTemperature(){return true;}
 ${method}
};
int main(){Poll p;p.missSecondary=true;
 assert(!p.poll());assert(!p.data.valid);assert(!p.data.fault);assert(!p.status2Fault);
 p.missSecondary=false;assert(p.poll());assert(p.data.valid&&!p.data.fault);
 p.status2Fault=true;p.data.fault=true;p.missSecondary=true;
 assert(!p.poll());assert(!p.data.valid);assert(p.data.fault&&p.status2Fault);
}
`);
const compiled=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stderr);
test('A missed secondary BLE read preserves actual fault bits and recovers',()=>{
 const r=spawnSync(exe,[],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
