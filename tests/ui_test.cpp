#include <cassert>
#include <cstdio>
#include "../firmware/VolcanoDial/ui_model.hpp"
#include "../firmware/VolcanoDial/round_ui.hpp"
#include "../firmware/VolcanoDial/display_idle.hpp"
int main(){vd::UiSnapshot s;vd::UiState u;
 vd::DisplayIdle display;display.wake(1000);assert(display.brightness(31000,160,true,30,90)==160);assert(display.brightness(36000,160,true,30,90)<160);assert(display.brightness(41000,160,true,30,90)>0);assert(display.brightness(91000,160,true,30,90)==0);display.wake(92000);assert(display.brightness(92000,160,true,30,90)==160);display.sleepNow();assert(display.brightness(92000,160,false,30,90)==0);display.wake(93000);assert(display.brightness(200000,160,false,30,90)==160);
 assert(display.brightness(95000,1,true,30,30)==1);assert(display.brightness(133000,1,true,30,30)==0);
 vd::WakePress wakePress;assert(wakePress.consume(true,true));assert(wakePress.consume(true,false));assert(!wakePress.consume(false,false));assert(!wakePress.consume(true,false));
 vd::WakeRotation rotation;assert(rotation.consume(1,1000,true));assert(rotation.consume(1,1100,false));assert(!rotation.consume(1,1400,false));
 display.sleepNow();assert(display.resting(94000,true,30));assert(display.brightness(94000,160,true,30,90,true)==160);display.wake(95000);assert(!display.resting(96000,true,30));assert(display.resting(125000,true,30));
 s.programActive=true;assert(!vd::menuAvailable(s,20));s.programActive=false;assert(vd::menuAvailable(s,20));
 s.phase=vd::UiPhase::HoseReady;s.heat=true;assert(vd::ledMode(s)==0);s.fan=true;assert(vd::ledMode(s)==1);s={};
 char original[97],line[160],joined[200]{};memset(original,'W',96);original[96]=0;const char* remaining=original;int rows=0;while(*remaining){remaining=vd::wrapLine(vd::font14,remaining,line,sizeof line,168);strcat(joined,line);++rows;}assert(rows<=8&&strcmp(original,joined)==0);
 const char* unicode="😀Z";vd::codepoint(unicode);assert(vd::codepoint(unicode)=='Z');
 assert(vd::glyph(vd::font12,0xB7)->code==0xB7);assert(vd::glyph(vd::font40,0x2014)->code==0x2014);assert(vd::glyph(vd::font12,0x2039)->code==0x2039);
 assert(vd::hit(0,0,s,u)==vd::Hit::None);assert(vd::hit(120,24,s,u)==vd::Hit::Menu);
 assert(vd::hit(120,80,s,u)==vd::Hit::Details);assert(vd::hit(120,95,s,u)==vd::Hit::Temperature);
 assert(vd::hit(120,185,s,u)==vd::Hit::Primary);assert(vd::hit(20,150,s,u)==vd::Hit::None);
 s.workflow=true;s.stages=3;s.fillEditable=true;s.fillTime=53;
 assert(vd::menuAvailable(s,4));
 assert(vd::hit(170,120,s,u)==vd::Hit::FillTime);
 assert(vd::hit(120,24,s,u)==vd::Hit::Menu);
 assert(vd::hit(215,70,s,u)==vd::Hit::Stage);
 assert(vd::ringStageAt(215,70,3)==1);
 assert(vd::ringStageAt(120,232,3)==2);
 assert(vd::ringStageAt(25,70,3)==3);
 s.stages=5;assert(vd::ringStageAt(215,70,5)==1);assert(vd::ringStageAt(120,232,5)==3);
 s.stages=32;assert(vd::hit(125,6,s,u)==vd::Hit::Stage);assert(vd::ringStageAt(125,6,32)==1);assert(vd::hit(120,24,s,u)==vd::Hit::Menu);
 s.busy=true;assert(vd::hit(215,70,s,u)!=vd::Hit::Stage);
 s.busy=false;s.workflow=false;s.fillEditable=false;assert(!vd::menuAvailable(s,4));assert(vd::hit(215,70,s,u)!=vd::Hit::Stage);assert(vd::hit(170,120,s,u)!=vd::Hit::FillTime);
 s={};
 s.hose=s.busy=true;s.phase=vd::UiPhase::HoseReady;assert(vd::hit(70,185,s,u)==vd::Hit::Primary);assert(vd::hit(180,185,s,u)==vd::Hit::Stop);
 vd::DirtyFrame f;assert(f.begin(vd::visualHash(s,u)));int strips=0;while(f.next()>=0)++strips;assert(strips==60);assert(!f.begin(vd::visualHash(s,u)));
 s.current=201;assert(f.begin(vd::visualHash(s,u)));while(f.next()>=0){};u.screen=vd::Screen::Menu;assert(f.begin(vd::visualHash(s,u)));
 s={};u={};auto beforeRetry=vd::visualHash(s,u);s.retryStage=true;assert(vd::visualHash(s,u)!=beforeRetry);assert(vd::hit(120,185,s,u)==vd::Hit::Primary);
 s.retryStage=false;auto beforeStage=vd::visualHash(s,u);s.startStage=2;assert(vd::visualHash(s,u)!=beforeStage);
 assert(vd::textWidth(vd::font18,"Preset erneut")<=144);
 puts("Circle hit regions and stable dirty-frame tests passed");}
