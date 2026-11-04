import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const dialog=ino.split('\n').find(s=>s.startsWith('void powerDialogAction('))||'void powerDialogAction(const vd::UiSnapshot&,bool){}';
const open=ino.split('\n').find(s=>s.startsWith('void openPowerDialog('))||'void openPowerDialog(){}';
const hold=ino.split('\n').find(s=>s.trim().startsWith('if(powerHold.tick('))||'';
const release=ino.match(/if\(knobGesture\.release\(gestureToken\(u\)\)&&!longHandled&&!knobAir\)/)[0];
const primary=ino.slice(ino.indexOf('void primary('),ino.indexOf('void setup(){'));
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-power-shortcut-')),cpp=path.join(dir,'shortcut.cpp'),exe=path.join(dir,'shortcut.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <string>
#include "${firmware}/power_runtime.hpp"
#include "${firmware}/interaction.hpp"
#include "${firmware}/round_ui.hpp"
#include "${firmware}/menu_swipe.hpp"
vd::UiState uiState;int requests=0;bool manualRequest=false;void requestPowerOff(bool manual=false){++requests;manualRequest=manual;}
${dialog}
${open}
bool stopRequested=false;void roseAction(const vd::UiSnapshot&){}void menuAction(const vd::UiSnapshot&){}void finishEdit(const vd::UiSnapshot&){}void localCommand(const char*){}
${primary}
int gestureToken(const vd::UiSnapshot&){return int(uiState.screen);}
bool rawHeld=true;struct{struct{bool isPressed(){return rawHeld;}}BtnA;}M5Dial;
int main(int argc,char**argv){int mode=std::stoi(argv[1]);vd::ShutdownHold powerHold;vd::UiSnapshot u;
 if(mode==7){openPowerDialog();primary(u);assert(requests==0);openPowerDialog();uiState.menu=1;u.busy=u.coolingPending=true;primary(u);assert(requests==1&&manualRequest);}
 if(mode==0){powerHold.press(1000,true);assert(!powerHold.tick(true,true,3999));assert(powerHold.tick(true,true,4000));assert(!powerHold.tick(true,true,10000));}
 if(mode==1){assert(!powerHold.tick(true,true,9999));powerHold.press(1000,false);assert(!powerHold.tick(true,true,9999));powerHold.press(1000,true);assert(!powerHold.tick(true,false,2000));assert(!powerHold.tick(true,true,9999));}
 if(mode==2){powerHold.press(1000,true);assert(!powerHold.tick(false,true,4000));assert(!powerHold.tick(true,true,5000));powerHold.press(5000,true);assert(powerHold.tick(true,true,8000));}
 if(mode==3){uiState.screen=vd::Screen::PowerConfirm;assert(vd::hit(75,180,u,uiState)==vd::Hit::PowerCancel);assert(vd::hit(166,180,u,uiState)==vd::Hit::PowerAccept);assert(vd::hit(120,120,u,uiState)==vd::Hit::None);}
 if(mode==4){openPowerDialog();assert(uiState.screen==vd::Screen::PowerConfirm&&uiState.menu==0);powerDialogAction(u,false);assert(requests==0&&uiState.screen==vd::Screen::Home);openPowerDialog();u.coolingPending=true;powerDialogAction(u,true);assert(requests==1&&manualRequest&&uiState.screen==vd::Screen::Home);}
 if(mode==5||mode==6){powerHold.press(1000,mode!=6);bool suppressLocal=false,knobAir=mode==6,longHandled=false,touchLongHandled=false;int selectionPending=2;uint64_t n=4000;vd::ReleaseGesture knobGesture,touchGesture;vd::MenuSwipe menuSwipe;knobGesture.press(gestureToken(u));${hold}int activations=0;${release}{++activations;}if(mode==5){assert(uiState.screen==vd::Screen::PowerConfirm&&uiState.menu==0);assert(longHandled&&activations==0&&requests==0&&selectionPending==0);}else assert(uiState.screen==vd::Screen::Home&&requests==0);}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu','-I',path.join(process.env.VD_ARDUINO_JSON,'src'),cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const[mode,name]of [[0,'Shutdown shortcut fires once at exactly three seconds'],[1,'Boot/no-new-press and disabled holds cannot open shutdown'],[2,'Release cancels an old hold and a new press is required'],[3,'Shutdown dialog has separate cancel and accept touch targets'],[4,'Dialog defaults to Cancel and explicit acceptance overrides cooling'],[5,'Actual hold input opens the dialog but its release cannot activate or confirm'],[6,'A manual AIR hold cannot turn into a shutdown gesture'],[7,'Actual primary action respects dialog Cancel and deliberate acceptance']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
