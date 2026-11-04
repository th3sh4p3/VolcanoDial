import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-manual-off-')),cpp=path.join(dir,'manual.cpp'),exe=path.join(dir,'manual.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <string>
#include "${firmware}/manual_shutdown.hpp"
int main(int argc,char**argv){int mode=std::stoi(argv[1]);std::string events;bool hue=mode!=1,owned=mode!=3;auto result=vd::manualPowerOff(hue,owned,[&](){events+='S';},[&](){events+='H';return mode!=2;},[&](){events+='V';return mode!=3;},[&](bool authoritative){events+='C';assert(authoritative==(hue&&owned));return mode!=4;},[&](bool){events+='L';return mode!=5;});
 if(mode==0||mode==1){assert(result==vd::ManualOffResult::Done);assert(events==(mode==0?"SHCL":"SVCL"));}
 if(mode==2){assert(result==vd::ManualOffResult::HueFailed&&events=="SH");}
 if(mode==3){assert(result==vd::ManualOffResult::OutputsUnknown&&events=="SHV");}
 if(mode==4){assert(result==vd::ManualOffResult::PersistenceFailed&&events=="SHC");}
 if(mode==5){assert(result==vd::ManualOffResult::ReleaseFailed&&events=="SHCL");}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Confirmed manual shutdown overrides cooling: Stop, owned Hue OFF, retire duty, latch LOW'],[1,'No configured Hue skips outlet control but still requires output OFF proof'],[2,'Unconfirmed Hue OFF retains power'],[3,'An unowned plug cannot replace failed output OFF proof'],[4,'Failed saved-duty retirement cannot falsely report shutdown'],[5,'Failed RTC/latch release is reported as failure']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
