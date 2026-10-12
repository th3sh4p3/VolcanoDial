#include <cstdio>
#include <string>
#include "../firmware/VolcanoDial/round_ui.hpp"
struct Canvas {
 uint16_t pixels[240*4]{};
 void drawPixel(int x,int y,uint16_t c){if(x>=0&&x<240&&y>=0&&y<4)pixels[y*240+x]=c;}
 void fillRect(int x,int y,int w,int h,uint16_t c){for(int row=y;row<y+h;++row)for(int col=x;col<x+w;++col)drawPixel(col,row,c);}
};
int main(int argc,char** argv){std::string prefix=argc>1?argv[1]:"ui";for(int scene=0;scene<11;++scene){vd::UiSnapshot s;vd::UiState u;s.wifi=s.connected=s.valid=s.keyAlive=true;s.current=201;s.target=220;snprintf(s.name,sizeof s.name,"Daily");snprintf(s.ip,sizeof s.ip,"192.0.2.10");snprintf(s.pin,sizeof s.pin,"123456");s.workflow=true;s.stages=3;s.actions=15;s.stage=1;s.action=6;s.remaining=18;s.fillEditable=true;s.fillTime=53;
 if(scene==1){s.phase=vd::UiPhase::Running;s.busy=s.heat=true;snprintf(s.stageName,sizeof s.stageName,"Preset 03");}
 if(scene==2){s.phase=vd::UiPhase::Checkpoint;s.busy=true;s.stage=2;}
 if(scene==3||scene==4){s.hose=true;s.workflow=false;s.busy=s.heat=true;s.phase=scene==3?vd::UiPhase::HoseHeating:vd::UiPhase::HoseReady;snprintf(s.name,sizeof s.name,"Schlauch");s.hoseTemperature=210;s.fan=scene==4;}
 if(scene==5){u.screen=vd::Screen::Menu;u.menu=4;s.simple=true;}
 if(scene==6){u.screen=vd::Screen::Edit;u.menu=1;u.value=210;}
 if(scene==7){u.screen=vd::Screen::Info;}
 if(scene==8){s.phase=vd::UiPhase::Error;s.valid=false;snprintf(s.name,sizeof s.name,"Sehr langer Workflowname mit Umlauten ÄÖÜ");snprintf(s.message,sizeof s.message,"AUS nicht bestätigt. Gerät prüfen!");}
 if(scene==9){s.startStage=2;}
 if(scene==10){u.screen=vd::Screen::Edit;u.menu=4;u.value=68;}
 auto file=fopen((prefix+std::to_string(scene)+".ppm").c_str(),"wb");fprintf(file,"P6\n240 240\n255\n");Canvas c;for(int y=0;y<240;y+=4){vd::paint(c,s,u,y);for(auto color:c.pixels){uint8_t rgb[]={uint8_t((color>>11)*255/31),uint8_t(((color>>5)&63)*255/63),uint8_t((color&31)*255/31)};fwrite(rgb,1,3,file);}}fclose(file);}
 puts("Actual renderer previews written");}
