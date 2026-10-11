import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';
const source=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const begin=source.indexOf('bool enqueue(const String& body'),end=source.indexOf('\nvoid localCommand',begin);
const args=source.match(/enqueue\(server\.arg\("plain"\),id,(.*?)\)\)\{reply/)[1];
assert(begin>=0&&end>begin);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-display-command-')),cpp=path.join(dir,'command.cpp'),exe=path.join(dir,'command.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <atomic>
#include <cstdlib>
#include <cstring>
#include <string>
using String=std::string;std::atomic<bool> displayWakeRequested{false},coolCancel{false};
constexpr int LIBRARY_LIMIT=32768,pdTRUE=1;void* requests=nullptr;
struct Request{char* text;unsigned id,epoch;};Request saved{};
struct{unsigned snapshot(){return 0;}}requestFence;
int xQueueSend(void*,Request* r,int){saved=*r;return pdTRUE;}
${source.slice(begin,end)}
bool command(const String& command){String body="{}";unsigned id=1;return enqueue(body,id,${args});}
int main(int argc,char**argv){int mode=std::stoi(argv[1]);assert(command(mode==0?"sleepDisplay":mode==1?"wakeDisplay":"run"));
 if(mode==0){assert(!displayWakeRequested);assert(!coolCancel);}
 if(mode==1){assert(displayWakeRequested);assert(!coolCancel);}
 if(mode==2){assert(displayWakeRequested);assert(coolCancel);}
 free(saved.text);
}
`);
const compiled=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(compiled.status,0,compiled.stderr);
for(const[mode,name]of [[0,'Queued display-off cannot leave a wake request behind'],[1,'Queued display wake preserves cooling'],[2,'Queued run still wakes the display']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
