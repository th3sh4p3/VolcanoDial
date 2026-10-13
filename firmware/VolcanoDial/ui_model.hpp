#pragma once
#include <cstdint>
#include <algorithm>
#include <cstring>
#include <cmath>
#include <initializer_list>
namespace vd {
enum class Screen:uint8_t {Home,Menu,Edit,Info,Details,Rose};
enum class UiPhase:uint8_t {Idle,Running,Checkpoint,Complete,Stopped,Error,HoseHeating,HoseReady,Connecting,BalloonReady};
struct UiSnapshot {
 char name[97]{},stageName[97]{},message[144]{},ip[20]{},pin[8]{},apName[32]{},apPassword[16]{};
 UiPhase phase=UiPhase::Idle;bool connected=false,wifi=false,keyAlive=false,heat=false,fan=false,valid=false,cooling=false,busy=false,hose=false,workflow=false,simple=false,fillEditable=false,ap=false,sound=true,autoOff=false,sleepEnabled=true,programActive=false,retryStage=false,balloonConfirm=false,hueOffAvailable=false;
 int sleepDimSeconds=30,sleepOffSeconds=90;
 int current=0,target=210,stage=0,stages=0,startStage=1,action=0,actions=0,remaining=0,actionType=0,brightness=160,startTemp=170,endTemp=210,fillTime=55,globalFillSeconds=53,steps=3,timerSeconds=55,timerTemperature=210,threshold=50,hoseTemperature=210,actionTarget=210,temperatureProgress=0;
};
inline int ledMode(const UiSnapshot& s){return s.phase==UiPhase::Error?3:s.phase==UiPhase::Connecting?5:s.phase==UiPhase::BalloonReady?6:s.fan?1:s.phase==UiPhase::Checkpoint?4:s.phase==UiPhase::HoseReady?0:s.heat?2:0;}
struct UiState {Screen screen=Screen::Home;int menu=0,value=0;bool roseHueConfirm=false;};
enum class Hit {None,Menu,Primary,Stop,Temperature,FillTime,Stage,Details,Up,Down,Back,RoseItem};
inline int roseSector(int dx,int dy){
 constexpr int vx[]={0,866,866,0,-866,-866},vy[]={-1000,-500,500,1000,500,-500};
 int best=0,score=dx*vx[0]+dy*vy[0];for(int i=1;i<6;++i){int candidate=dx*vx[i]+dy*vy[i];if(candidate>score){best=i;score=candidate;}}return best;
}
inline int roseAt(int x,int y){
 int dx=x-120,dy=y-120,r=dx*dx+dy*dy;if(r<40*40||r>110*110)return -1;
 return roseSector(dx,dy);
}
inline bool roseAvailable(const UiSnapshot& s,int item){
 if(item<0||item>5)return false;
 if(s.busy)return s.phase==UiPhase::Checkpoint&&(item==0||item==1||item==5);
 if(item==3)return s.simple||s.hose;
 if(item==4)return s.hueOffAvailable;
 return true;
}
// Clockwise sectors from 12 o'clock; use the same geometry as the drawn ring.
inline int ringStageAt(int x,int y,int stages){
 if(stages<2||stages>32)return 0;
 int dx=x-120,dy=y-120,r=dx*dx+dy*dy;if(r<100*100||r>118*118)return 0;
 double angle=std::atan2(double(dx),double(-dy));if(angle<0)angle+=6.283185307179586;
 return std::min(stages,int(angle/6.283185307179586*stages)+1);
}
inline Hit hit(int x,int y,const UiSnapshot& s,const UiState& u){
 if((x-120)*(x-120)+(y-120)*(y-120)>118*118)return Hit::None;
 if(u.screen==Screen::Rose){int dx=x-120,dy=y-120;if(dx*dx+dy*dy<40*40)return Hit::Back;return roseAt(x,y)>=0?Hit::RoseItem:Hit::None;}
 if(u.screen==Screen::Info)return Hit::Back;
 if(u.screen==Screen::Details)return y<46?Hit::Back:Hit::Primary;
 if(u.screen==Screen::Home&&y>=21&&y<47&&x>=95&&x<=145&&((x-120)*(x-120)+(y-120)*(y-120))<100*100)return Hit::Menu;
 if(u.screen!=Screen::Home&&y<46&&x>=70&&x<=170)return Hit::Back;
 if(u.screen==Screen::Menu){if(y<90)return Hit::Up;if(y>155)return Hit::Down;return Hit::Primary;}
 if(u.screen==Screen::Edit){if(y>=156&&y<=200)return Hit::Primary;return Hit::None;}
 if(u.screen==Screen::Home&&s.workflow&&!s.busy&&ringStageAt(x,y,s.stages))return Hit::Stage;
 if(u.screen==Screen::Home&&s.fillEditable&&!s.busy&&!s.retryStage&&x>=126&&x<=211&&y>=113&&y<=132)return Hit::FillTime;
 if(s.hose&&(s.phase==UiPhase::HoseHeating||s.phase==UiPhase::HoseReady)){if(y>=156&&y<=200&&x>=30&&x<143)return Hit::Primary;if(y>=156&&y<=200&&x>=147&&x<=211)return Hit::Stop;}
 else if(y>=156&&y<=200&&x>=38&&x<=202)return Hit::Primary;
 if(y>=46&&y<84&&x>=30&&x<=210)return Hit::Details;
 if(y>=84&&y<=122&&x>=55&&x<=185&&(!s.busy||s.hose))return Hit::Temperature;
 return Hit::None;
}
// A visual fingerprint excludes padding, transient diagnostics and fractional telemetry.
inline uint32_t visualHash(const UiSnapshot& s,const UiState& u){
 uint32_t h=2166136261u;auto add=[&](uint32_t v){h=(h^v)*16777619u;};
 for(auto p:{s.name,s.stageName,s.message,s.ip,s.pin,s.apName,s.apPassword})for(;*p;++p)add(uint8_t(*p));
 add(unsigned(s.phase));add(s.connected|s.wifi<<1|s.keyAlive<<2|s.heat<<3|s.fan<<4|s.valid<<5|s.cooling<<6|s.busy<<7|s.hose<<8|s.workflow<<9|s.ap<<10|s.programActive<<11|s.retryStage<<12|s.fillEditable<<13|s.balloonConfirm<<14|s.hueOffAvailable<<15);
 for(int v:{s.current,s.target,s.stage,s.stages,s.startStage,s.action,s.actions,s.remaining,s.actionType,s.startTemp,s.endTemp,s.fillTime,s.globalFillSeconds,s.steps,s.timerSeconds,s.timerTemperature,s.threshold,s.hoseTemperature,s.actionTarget,s.temperatureProgress,int(u.screen),u.menu,u.value,int(u.roseHueConfirm)})add(v);
 return h;
}
class DirtyFrame {
 uint32_t last=0;bool initialized=false;int row=240;
public:
 void invalidate(){initialized=false;row=240;}
 bool begin(uint32_t hash){if(row<240)return false;if(initialized&&hash==last)return false;last=hash;initialized=true;row=0;return true;}
 int next(){if(row>=240)return -1;int y=row;row+=4;return y;}
 bool pending()const{return row<240;}
};
}
