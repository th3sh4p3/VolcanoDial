import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Run the real display/LED worker fragments with the UART hardware substituted.
// A missing sleep-to-LED connection must leave the emitted RGB wrong, not just
// change a source-text assertion. DisplayIdle and KeyLink are production code.
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const ledBegin=source.indexOf('uint64_t n=nowMs();if(n-ledAt>=100)'),ledEnd=source.indexOf('bool wakeOnly=',ledBegin);
const displayBegin=source.indexOf('int light=displayIdle.brightness'),displayEnd=source.indexOf('\n  if(light&&dirtyFrame',displayBegin);
assert(ledBegin>=0&&ledEnd>ledBegin&&displayBegin>=0&&displayEnd>displayBegin);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-led-')),cpp=path.join(dir,'led.cpp'),exe=path.join(dir,'led.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <cmath>
#include <atomic>
#include <string>
#include "${firmware}/key_link.hpp"
#include "${firmware}/display_idle.hpp"
uint64_t clockMs=0;uint64_t nowMs(){return clockMs;}
std::atomic<int> keyColor{0},keyBrightness{255},displayBrightness{160};std::atomic<bool> displayResting{false};
struct UI{int brightness=160,sleepDimSeconds=30,sleepOffSeconds=90;bool sleepEnabled=true;}u;
bool keepAwake=false;vd::DisplayIdle displayIdle;
struct {struct {void setBrightness(int){}}Display;}M5Dial;
struct IO{int lastColor=-1,writes=0,reads=0;bool pressed=false;
 bool initialize(){return true;}bool read(bool& value){++reads;value=pressed;return true;}
 bool color(int rgb){lastColor=rgb;++writes;return true;}uint64_t now(){return nowMs();}
}io;
vd::KeyLink<IO> link(io);uint64_t ledAt=0;int rgb=0;
void updateDisplay(){uint64_t n=nowMs();${source.slice(displayBegin,displayEnd)}}
void updateLED(){${source.slice(ledBegin,ledEnd)}}
void cycle(uint64_t at){clockMs=at;updateDisplay();updateLED();}
int main(int argc,char**argv){int mode=std::stoi(argv[1]);displayIdle.wake(0);cycle(100);assert(io.lastColor==0x001800);
 if(mode==0){cycle(35000);assert(displayBrightness==93);assert(io.lastColor==0x000e00);cycle(40000);assert(io.lastColor==0x000400);cycle(90000);assert(io.lastColor==0);}
 if(mode==1){displayIdle.sleepNow();cycle(200);assert(displayBrightness==0);assert(io.lastColor==0);}
 if(mode==2){displayIdle.sleepNow();cycle(200);keyColor=1;cycle(300);assert(io.lastColor==0);displayIdle.wake(400);cycle(400);assert(io.lastColor==0x00283c);}
 if(mode==3){displayIdle.sleepNow();cycle(200);int writes=io.writes,reads=io.reads;keyColor=3;for(unsigned n=300;n<1700;n+=100)cycle(n);assert(io.lastColor==0);assert(io.writes==writes);assert(io.reads>reads&&link.alive);io.pressed=true;cycle(1800);assert(link.held);}
 if(mode==4){u.brightness=40;cycle(200);assert(io.lastColor==0x001800);cycle(90000);assert(io.lastColor==0);keepAwake=true;cycle(91000);assert(displayBrightness==40);assert(io.lastColor==0x001800);}
}
`);
const compiled=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
for(const [mode,name] of [[0,'Accessory LED follows display fading to zero'],[1,'Manual display sleep also switches the accessory LED off'],[2,'Wake restores the current status color'],[3,'Sleeping LED stays off while the button remains polled'],[4,'Configured brightness and active-workflow sleep protection preserve normal LED color']]){
 test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
}
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
