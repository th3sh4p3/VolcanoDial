import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Connectivity/temperature redraws must not become user activity. Compile the
// actual redraw branch, substituting only the panel and changing telemetry hash.
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const branch=ino.match(/if\(visualInitialized&&visibleHash!=previousVisibleHash&&!sleepAsked\)\{[^\n]+/)[0].split('previousVisibleHash=')[0];
const busyExpression=ino.split('d["busy"]=')[1].split(';')[0];
const connectingExpression=ino.split('u.phase=')[1].split('?vd::UiPhase::Connecting:')[0];
const coolingLine=ino.split('\n').find(s=>s.includes('operation="Abgekühlt: Steckdose AUS";publish();'));assert(coolingLine);
const coolingPublish=coolingLine.slice(0,coolingLine.indexOf('publish();')+'publish();'.length);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-battery-wake-'));
const cpp=path.join(dir,'wake.cpp'),exe=path.join(dir,'wake.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include "${firmware}/display_idle.hpp"
#include <string>
struct String:std::string{using std::string::string;bool isEmpty()const{return empty();}};String operation="Bluetooth wiederverbinden";bool backgroundOperation=true;bool busy(){return false;}
void publish(){assert(!(${busyExpression}));assert(!(${connectingExpression}));}
int main(){vd::DisplayIdle displayIdle;displayIdle.wake(0);bool visualInitialized=true,sleepAsked=false;unsigned visibleHash=2,previousVisibleHash=1;uint64_t n=100000;int displayBrightness=0;struct{void invalidate(){}}dirtyFrame;
${branch}
assert(displayIdle.lastWakeAt()==0);assert(displayIdle.brightness(n,160,true,30,90)==0);
assert(!(${busyExpression}));assert(!(${connectingExpression}));
backgroundOperation=false;assert((${busyExpression}));assert((${connectingExpression}));
${coolingPublish}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});
assert.equal(built.status,0,built.stderr);
test('Background visual changes leave a sleeping display and its idle clock alone',()=>{const r=spawnSync(exe,[],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
