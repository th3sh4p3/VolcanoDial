import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const latch=ino.split('\n').find(line=>line.trim().startsWith('void latch(bool high){'));assert(latch);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-board-io-')),cpp=path.join(dir,'board.cpp'),exe=path.join(dir,'board.exe');
// Model the installed ESP32 Arduino core: digitalWrite does nothing before
// periman owns the pin. Enabling output with a LOW latch drops battery power.
fs.writeFileSync(cpp,`#include <cassert>
#include <string>
#include "${firmware}/board_power.hpp"
constexpr int HIGH=1,LOW=0,OUTPUT=1,GPIO_NUM_46=46;
bool registered=false,output=false,level=false,powerLost=false;
void enableOutput(){output=true;if(!level)powerLost=true;}
void digitalWrite(int pin,int value){assert(pin==46);if(registered)level=value;}
void pinMode(int pin,int mode){assert(pin==46&&mode==OUTPUT);registered=true;enableOutput();}
namespace m5gfx{enum class pin_mode_t{output};void gpio_hi(int p){assert(p==46);level=true;}void gpio_lo(int p){assert(p==46);level=false;}void pinMode(int p,pin_mode_t){assert(p==46);enableOutput();}}
struct IO{${latch}bool clearRtc(){return true;}}io;
int main(int argc,char**argv){int mode=std::stoi(argv[1]);vd::BoardPower<IO> board(io);
 if(mode==0){board.begin();assert(level&&output&&!powerLost);}
 if(mode==1){level=output=true;assert(!registered);assert(board.release());assert(!level&&board.standby());board.wake();assert(level&&!board.standby());}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Cold boot preloads HOLD high before enabling output without an Arduino GPIO registration'],[1,'Latch release also works after M5 low-level GPIO initialization']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
