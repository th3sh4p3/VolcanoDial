import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync}from'node:child_process';import {fileURLToPath}from'node:url';
const ino=fs.readFileSync(new URL('../firmware/VolcanoDial/VolcanoDial.ino',import.meta.url),'utf8');
const off=ino.split('\n').find(s=>s.trim().startsWith('if(i==24){'));assert(off);
const release=ino.split('if(!touchLongHandled&&touchGesture.release')[1].split('{switch(end)')[0];assert(release);
const releaseCondition='!touchLongHandled&&touchGesture.release'+release;
const pressStart=ino.indexOf('  if(!suppressLocal&&touch.wasPressed()){'),pressEnd=ino.indexOf('    touchGesture.press',pressStart);
const pressGlue=ino.slice(ino.indexOf('\n',pressStart)+1,pressEnd);
const moveStart=ino.indexOf('  if(!suppressLocal&&touch.isPressed()&&uiState.screen==vd::Screen::Menu){'),moveEnd=ino.indexOf('  bool held=',moveStart);assert(moveStart>=0&&moveEnd>moveStart);
const moveGlue=ino.slice(moveStart,moveEnd);
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-menu-touch-')),cpp=path.join(dir,'menu.cpp'),exe=path.join(dir,'menu.exe');
fs.writeFileSync(cpp,`#include <cassert>
#include <string>
#include <cstring>
#include <vector>
#include "${firmware}/menu_swipe.hpp"
#include "${firmware}/round_ui.hpp"
#include "${firmware}/power_policy.hpp"
vd::UiState uiState;int requests=0;bool manualRequest=false;void requestPowerOff(bool manual=false){++requests;manualRequest=manual;}
void powerActivity(){}int touchCount=1;struct{struct{int getCount(){return touchCount;}}Touch;}M5Dial;
struct{int x=120,y=120;bool isPressed(){return true;}}touch;
void offAction(const vd::UiSnapshot& u){int i=24;${off}}
int gestureToken(const vd::UiSnapshot&){return 1;}
struct{bool release(int){return true;}}touchGesture;
struct Canvas{uint16_t pixels[960]{};void drawPixel(int x,int y,uint16_t c){if(x>=0&&x<240&&y>=0&&y<4)pixels[y*240+x]=c;}void fillRect(int x,int y,int w,int h,uint16_t c){for(int row=y;row<y+h;++row)for(int col=x;col<x+w;++col)drawPixel(col,row,c);}};
std::vector<uint16_t> render(vd::UiSnapshot s,vd::UiState u,int first,int last){Canvas c;std::vector<uint16_t> result;for(int y=first;y<last;y+=4){vd::paint(c,s,u,y);result.insert(result.end(),c.pixels,c.pixels+960);}return result;}
int main(int argc,char**argv){int mode=std::stoi(argv[1]);vd::MenuSwipe swipe;vd::UiSnapshot u;
 if(mode==0){swipe.press(120,120,true);assert(swipe.move(125,124)==0);assert(!swipe.finish());}
 if(mode==1){swipe.press(120,170,true);assert(swipe.move(120,135)==0);assert(swipe.move(120,134)==1);assert(swipe.move(120,62)==2);assert(swipe.finish());}
 if(mode==2){swipe.press(120,80,true);assert(swipe.move(120,116)==-1);assert(swipe.move(120,80)==1);assert(swipe.finish());}
 if(mode==3){swipe.press(120,120,true);assert(swipe.move(160,122)==0);assert(swipe.finish());swipe.press(120,120,true);assert(swipe.move(120,140)==0);assert(swipe.finish());}
 if(mode==4){swipe.press(120,120,true);swipe.cancel();assert(swipe.move(120,50)==0);assert(swipe.finish());swipe.press(120,120,false);assert(swipe.move(120,50)==0);assert(!swipe.finish());}
 if(mode==5){swipe.press(120,170,true);swipe.move(120,80);assert(swipe.finish());swipe.press(120,120,true);assert(!swipe.finish());}
 if(mode==6){u.coolingPending=true;assert(vd::menuAvailable(u,24));assert(vd::roseAvailable(u,4));assert(!vd::powerOffAvailable(u));assert(std::strstr(vd::powerOffReason(u),"Abk"));assert(vd::nextMenu(u,23,1)==24);u.coolingPending=false;u.outputOffPending=true;assert(!vd::powerOffAvailable(u));assert(vd::menuAvailable(u,24));}
 if(mode==7){swipe.press(120,150,true);swipe.move(120,114);swipe.move(120,150);bool menuDragged=swipe.finish();bool touchLongHandled=false,touchAir=false;vd::Hit end=vd::Hit::Primary,touchOrigin=end;bool activate=false;if(${releaseCondition}{activate=true;}assert(!activate);}
 if(mode==8){u.cooling=true;uiState.screen=vd::Screen::Menu;offAction(u);assert(requests==0&&uiState.powerConfirm);offAction(u);assert(requests==1&&manualRequest&&uiState.screen==vd::Screen::Home);}
 if(mode==9){vd::PowerSafety s;assert(!vd::powerOffBlockReason(s)[0]);for(auto field:{&vd::PowerSafety::programActive,&vd::PowerSafety::busy,&vd::PowerSafety::cooling,&vd::PowerSafety::coolingPending,&vd::PowerSafety::coolingRestore,&vd::PowerSafety::heat,&vd::PowerSafety::fan,&vd::PowerSafety::heatRequested,&vd::PowerSafety::fanRequested,&vd::PowerSafety::interlock,&vd::PowerSafety::operation,&vd::PowerSafety::queued,&vd::PowerSafety::activationPending,&vd::PowerSafety::stopping,&vd::PowerSafety::manualHeld}){s={};s.*field=true;assert(!vd::canPowerOff(s));assert(vd::powerOffBlockReason(s)[0]);}}
 if(mode==10){vd::MenuSwipe& menuSwipe=swipe;uiState.screen=vd::Screen::Menu;uiState.menu=24;uiState.powerConfirm=true;touchCount=2;bool suppressLocal=false;${pressGlue}${moveGlue}bool menuDragged=menuSwipe.finish(),touchLongHandled=false,touchAir=false;vd::Hit end=vd::Hit::Primary,touchOrigin=end;if(${releaseCondition}{offAction(u);}assert(requests==0&&menuDragged);}
 if(mode==11){vd::PowerSafety s;s.manualHeld=true;assert(vd::canPowerOff(vd::uiPowerSafety(s,false)));assert(!vd::canPowerOff(s));assert(!vd::canPowerOff(vd::uiPowerSafety(s,true)));s.stopping=true;assert(!vd::canPowerOff(vd::uiPowerSafety(s,false)));u.shutdownGuardBlocked=true;std::strcpy(u.shutdownReason,"AUS noch unbestaetigt");assert(!vd::powerOffAvailable(u));assert(std::strstr(vd::powerOffReason(u),"unbestaetigt"));uiState.powerConfirm=true;offAction(u);assert(requests==1&&manualRequest&&!uiState.powerConfirm);u.shutdownGuardBlocked=false;u.coolingPending=u.outputRequested=true;assert(!vd::coolingOnly(u)&&!vd::powerOffAvailable(u));}
 if(mode==12){u.busy=u.programActive=u.heat=true;u.valid=true;u.current=180;auto a=render(u,{},200,216);u.coolingPending=true;assert(a==render(u,{},200,216));u.hose=true;assert(a==render(u,{},200,216));u.busy=u.programActive=u.heat=false;assert(a!=render(u,{},200,216));}
 if(mode==13){u.busy=u.programActive=u.heat=true;u.valid=true;u.current=180;uiState.screen=vd::Screen::Menu;uiState.menu=24;auto a=render(u,uiState,100,148);u.coolingPending=true;assert(a==render(u,uiState,100,148));}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const [mode,name]of [[0,'Stationary menu taps stay taps'],[1,'Upward swipes move through bounded menu steps'],[2,'Downward swipes and reversals preserve direction'],[3,'Horizontal drags and short vertical drags never become taps'],[4,'Cancelled/multitouch and disabled wake gestures cannot scroll'],[5,'Each new touch gesture starts with fresh drag state'],[6,'Shutdown stays visible during cooling or OFF obligations'],[7,'Dragging away and back cannot activate a row on release'],[8,'The real menu power action overrides cooling only after two deliberate taps']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
test('Every current worker shutdown guard has an explanatory reason',()=>{const r=spawnSync(exe,['9'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
for(const [mode,name]of [[10,'Initial two-finger menu press cannot confirm shutdown through actual input glue'],[11,'Stable recovery/output blockers reach the UI while a normal touch does not disable its own tap'],[12,'Real home renderer never labels active heating as cooling'],[13,'Real blocked menu renderer prioritizes active work over its future cooling duty']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
