#pragma once
#include "ui_model.hpp"
#include "ui_fonts.hpp"
#include <cstdio>
#include <algorithm>
namespace vd {
constexpr uint16_t INK=0xffff,MUTED=0x8c92,BG=0x0863,PANEL=0x1927,GREEN=0x4f57,AMBER=0xfdc9,BLUE=0x4ddf,RED=0xf2ed;
inline uint32_t codepoint(const char*& p){uint8_t c=*p++;if(c<128)return c;int n=c<224?1:c<240?2:3;uint32_t v=c&(n==1?31:n==2?15:7);while(n--){if(!*p||(uint8_t(*p)&192)!=128)return '?';v=(v<<6)|(uint8_t(*p++)&63);}return v;}
inline const Glyph* glyph(const Font& f,uint32_t c){for(int i=0;i<f.count;++i)if(f.glyphs[i].code==c)return f.glyphs+i;return f.glyphs+('?' -32);}
inline int textWidth(const Font& f,const char* p){int w=0;while(*p)w+=glyph(f,codepoint(p))->advance;return w;}
inline const Font& titleFont(const char* name){return textWidth(font22,name)<=178?font22:textWidth(font18,name)<=178?font18:font14;}
inline uint16_t blend(uint16_t a,uint16_t b,int coverage){int r=((a>>11)*(15-coverage)+(b>>11)*coverage)/15,g=(((a>>5)&63)*(15-coverage)+((b>>5)&63)*coverage)/15,bl=((a&31)*(15-coverage)+(b&31)*coverage)/15;return r<<11|g<<5|bl;}
inline const char* menuLabel(int i){static const char* a[]={"Zurück","Zieltemperatur","Starttemperatur","Endtemperatur","Füllzeit","Heizschritte","Timer: Sekunden","Timer: Temperatur","Timer starten","Bluetooth","Heizung","Lüftung","Helligkeit","Signaltöne","Hue Automatik","Hue Schwelle","RFID zuordnen","Einrichtungs-WLAN","Geräteinfo","Schlauch beenden","Display aus","Ruhezeit","Ballon bestätigen","Ballonfüllzeit","Ausschalten"};return a[std::clamp(i,0,24)];}
inline int parameter(const UiSnapshot& s,int i){switch(i){case 1:return s.hose?s.hoseTemperature:s.target;case 2:return s.startTemp;case 3:return s.endTemp;case 4:return s.fillTime;case 5:return s.steps;case 6:return s.timerSeconds;case 7:return s.timerTemperature;case 12:return s.brightness;case 15:return s.threshold;case 21:return s.sleepOffSeconds;case 23:return s.globalFillSeconds;default:return 0;}}
inline bool editable(int i){return (i>=1&&i<=7)||i==12||i==15||i==21||i==23;}
inline bool menuAvailable(const UiSnapshot& s,int i){if(i==24)return !s.programActive&&!s.busy&&!s.cooling&&!s.coolingPending&&!s.heat&&!s.fan;if(i==20)return !s.programActive&&(!s.busy||s.hose);if(i==19)return s.hose&&s.busy;if(s.busy)return i==0||(s.phase==UiPhase::Checkpoint&&((i==4&&s.fillEditable)||i==22||i==23))||(s.hose&&i==1)||i==18;if(i==4)return s.fillEditable;if(i>=2&&i<=5)return !s.hose&&s.simple;return true;}
inline int nextMenu(const UiSnapshot& s,int i,int delta){int step=delta<0?-1:1;for(int n=0;n<std::abs(delta);++n)do{i=(i+step+25)%25;}while(!menuAvailable(s,i));return i;}
inline const char* wrapLine(const Font& font,const char* input,char* line,size_t capacity,int width){int used=0;size_t bytes=0;while(*input){const char* start=input;uint32_t cp=codepoint(input);int advance=glyph(font,cp)->advance;size_t n=input-start;if(bytes+n>=capacity||used+advance>width){input=start;break;}if(cp=='\n')break;memcpy(line+bytes,start,n);bytes+=n;used+=advance;}line[bytes]=0;return input;}
template<class Canvas> class Painter {
 Canvas& c;int offset;
public:
 Painter(Canvas& surface,int y):c(surface),offset(y){}
 void rect(int x,int y,int w,int h,uint16_t color){int a=std::max(y,offset),b=std::min(y+h,offset+4);if(b>a)c.fillRect(x,a-offset,w,b-a,color);}
 void rounded(int x,int y,int w,int h,int radius,uint16_t color){for(int py=std::max(y,offset);py<std::min(y+h,offset+4);++py){int d=std::min(py-y,y+h-1-py),in=0;if(d<radius){int t=radius-d;in=radius-int(std::sqrt(radius*radius-t*t));}rect(x+in,py,w-2*in,1,color);}}
 void text(const Font& f,const char* input,int center,int top,int maxWidth,uint16_t color=INK,uint16_t bg=BG){
  char line[160]{};size_t used=0;int width=0;const char* p=input;
  while(*p&&used<sizeof(line)-5){const char* start=p;auto g=glyph(f,codepoint(p));if(width+g->advance+( *p?textWidth(f,"…"):0)>maxWidth){std::memcpy(line+used,"…",3);used+=3;break;}size_t n=p-start;std::memcpy(line+used,start,n);used+=n;width+=g->advance;}line[used]=0;
  int x=center-textWidth(f,line)/2;p=line;
  while(*p){auto g=glyph(f,codepoint(p));int gy=top+g->y;for(int row=std::max(0,offset-gy);row<std::min(int(g->h),offset+4-gy);++row)for(int col=0;col<g->w;++col){int i=row*g->w+col;uint8_t v=f.pixels[g->offset+i/2];int a=i%2?v&15:v>>4;if(a)c.drawPixel(x+g->x+col,gy+row-offset,blend(bg,color,a));}x+=g->advance;}
 }
 void wrapped(const Font& font,const char* input,int top,int rows,uint16_t color=INK,int skip=0){char line[160];for(int i=0;i<skip&&*input;++i)input=wrapLine(font,input,line,sizeof line,168);for(int i=0;i<rows&&*input;++i){input=wrapLine(font,input,line,sizeof line,168);text(font,line,120,top+i*17,168,color);}}
 void button(int x,int w,const char* label,uint16_t color){rounded(x,158,w,40,14,color);text(w>=140?font18:font14,label,x+w/2,w>=140?168:171,w-12,color==PANEL?MUTED:BG,color);}
 void roseWheel(const UiSnapshot& s,const UiState& u){
  constexpr uint16_t ROSE_SELECTED=0x1b6b,ROSE_DIMMED=0x10a4,ROSE_OUTLINE=0x3a6d;
  for(int py=offset;py<offset+4;++py)for(int x=10;x<=230;++x){
   int dx=x-120,dy=py-120,r=dx*dx+dy*dy;
   if(r>=36*36&&r<40*40){c.drawPixel(x,py-offset,ROSE_OUTLINE);continue;}
   if(r<40*40||r>110*110)continue;
   int item=roseSector(dx,dy);bool available=roseAvailable(s,item);
   uint16_t color=available?(item==u.menu?(u.roseHueConfirm&&item==4?RED:ROSE_SELECTED):PANEL):ROSE_DIMMED;
   if(r>=106*106)color=item==u.menu&&available?(u.roseHueConfirm&&item==4?RED:GREEN):ROSE_OUTLINE;
   constexpr int vx[]={0,866,866,0,-866,-866},vy[]={-1000,-500,500,1000,500,-500};
   int best=-2147483647,second=-2147483647;for(int i=0;i<6;++i){int score=dx*vx[i]+dy*vy[i];if(score>best){second=best;best=score;}else if(score>second)second=score;}
   if(best-second<1800)color=BG;
   c.drawPixel(x,py-offset,color);
  }
 }
 void ring(const UiSnapshot& s,uint16_t accent){for(int y=offset;y<offset+4;++y)for(int x=3;x<237;++x){int dx=x-120,dy=y-120,r=dx*dx+dy*dy;if(r<112*112||r>117*117)continue;double angle=std::atan2(double(dx),double(-dy));if(angle<0)angle+=6.283185307;int segments=s.workflow&&s.stages>1?s.stages:1;double seg=angle/6.283185307*segments;if(segments>1&&seg-int(seg)<.035)continue;double progress=s.busy&&s.actions?std::clamp((s.stage-1+(s.action-1.0+(s.actionType==0?s.temperatureProgress/100.0:0))/s.actions)/std::max(s.stages,1),0.0,1.0):1.0;uint16_t color=s.workflow&&segments>1&&!s.busy?(int(seg)+1==s.startStage?accent:PANEL):(angle/6.283185307<=progress?accent:PANEL);c.drawPixel(x,y-offset,color);}}
};
template<class Canvas> void paint(Canvas& c,const UiSnapshot& s,const UiState& u,int y){
 Painter<Canvas> p(c,y);p.rect(0,y,240,4,BG);
 uint16_t accent=s.phase==UiPhase::Error?RED:s.fan?BLUE:s.heat?AMBER:GREEN;if(u.screen!=Screen::Rose)p.ring(s,accent);
 char b[160]{};
 if(u.screen==Screen::Rose){
  p.roseWheel(s,u);
  const int px[]={120,181,181,120,59,59},py[]={30,70,143,176,143,70};
  const char* labels[]={"Füllzeit","Ballon","Display","Temp.","Hue AUS","Mehr"};
  for(int i=0;i<6;++i){bool available=roseAvailable(s,i);uint16_t bg=available?(i==u.menu?(u.roseHueConfirm&&i==4?RED:0x1b6b):PANEL):0x10a4;uint16_t ink=available?INK:MUTED;
   p.text(font12,labels[i],px[i],py[i],i==0||i==3?78:68,ink,bg);
   if(i==0)snprintf(b,sizeof b,"%d s",s.globalFillSeconds);
   else if(i==1)snprintf(b,sizeof b,"%s",s.balloonConfirm?"AN":"AUS");
   else if(i==2)snprintf(b,sizeof b,"%d s",s.sleepOffSeconds);
   else if(i==3)snprintf(b,sizeof b,available?"%d°":"—",s.hose?s.hoseTemperature:s.endTemp);
   else if(i==4)snprintf(b,sizeof b,u.roseHueConfirm?"Erneut":"2x");
   else snprintf(b,sizeof b,"Menü");
   p.text(font14,b,px[i],py[i]+15,i==0||i==3?76:68,ink,bg);
  }
  p.text(font18,"‹",120,94,40,GREEN);p.text(font12,"Zurück",120,117,58,MUTED);
  return;
 }
 if(u.screen==Screen::Menu){
  p.text(font12,"‹ ZURÜCK",120,23,120,MUTED);
  int prev=nextMenu(s,u.menu,-1),next=nextMenu(s,u.menu,1);
  p.text(font14,menuLabel(prev),120,64,172,MUTED);
  p.rounded(24,99,192,48,16,PANEL);p.text(font18,u.menu==24&&u.powerConfirm?"Wirklich aus?":menuLabel(u.menu),120,112,176,u.menu==24&&u.powerConfirm?AMBER:INK,PANEL);
  p.text(font14,menuLabel(next),120,166,174,MUTED);p.text(font12,u.menu==24&&u.powerConfirm?"Nochmals klicken":"Drehen · Klick",120,202,130,MUTED);return;
 }
 if(u.screen==Screen::Edit){
  p.text(font12,"‹ ZURÜCK",120,23,120,MUTED);p.text(font18,menuLabel(u.menu),120,59,192);
  snprintf(b,sizeof b,"%d",u.value);p.text(font40,b,120,91,180);
  const char* unit=(u.menu<=3||u.menu==7||u.menu==15)?"°C":(u.menu==4||u.menu==6||u.menu==21||u.menu==23)?"Sekunden":u.menu==5?"Schritte":"Helligkeit";
  p.text(font14,unit,120,142,180,MUTED);p.button(43,154,"Übernehmen",GREEN);return;
 }
 if(u.screen==Screen::Info){
  p.text(font12,"‹ GERÄTEINFO",120,30,130,MUTED);p.text(font18,s.ap?s.apName:"Volcano Dial",120,61,200);
  p.text(font14,s.ap?"192.168.4.1":s.ip,120,92,200);
  snprintf(b,sizeof b,"PIN  %s",s.pin);p.text(font22,b,120,121,200);
  if(s.ap){snprintf(b,sizeof b,"WLAN: %s",s.apPassword);p.text(font14,b,120,158,200);}
  else p.text(font14,s.keyAlive?"Zusatztaster verbunden":"Ohne Zusatztaster",120,164,202,MUTED);
  p.text(font12,"volcano-dial.local",120,200,126,MUTED);return;
 }
 if(u.screen==Screen::Details){p.text(font12,"‹ ZURÜCK",120,23,120,MUTED);const char* headings[]={"Vollständiger Name","Aktuelles / nächstes Preset","Meldung","Meldung · Fortsetzung"};p.text(font12,headings[u.value%4],120,41,164,MUTED);const char* content=u.value%4==0?s.name:u.value%4==1?s.stageName:s.message;p.wrapped(font14,content[0]?content:"Keine Meldung",58,8,u.value%4>=2&&s.phase==UiPhase::Error?RED:INK,u.value%4==3?8:0);snprintf(b,sizeof b,"%d/4 · Drehen / Tippen",u.value%4+1);p.text(font12,b,120,202,100,MUTED);return;}
 // The top menu target is separate from all start/air/stop targets.
 p.rounded(100,22,40,24,12,PANEL);p.text(font18,"···",120,20,32,MUTED,PANEL);
 p.text(font12,s.connected?"BT":"BT aus",74,43,54,s.connected?GREEN:MUTED);p.text(font12,s.wifi?"WLAN":"OFF",166,43,52,s.wifi?MUTED:AMBER);
 const char* title=s.name[0]?s.name:"Keine Auswahl";p.text(titleFont(title),title,120,54,178);
 if(s.valid)snprintf(b,sizeof b,"%d°",s.current);else snprintf(b,sizeof b,"--");p.text(font40,b,120,76,180);
 if(s.workflow&&(s.busy||s.retryStage)){snprintf(b,sizeof b,s.retryStage?"Erneut: %s":s.phase==UiPhase::Checkpoint?"Weiter: %s":"Preset: %s",s.stageName);p.text(font14,b,120,118,200,MUTED);}else if(s.fillEditable&&!s.busy){snprintf(b,sizeof b,"Ziel %d°",s.target);p.text(font12,b,75,119,78,MUTED);snprintf(b,sizeof b,"Füllzeit %d s",s.fillTime);p.text(font12,b,166,119,86,BLUE);}else{snprintf(b,sizeof b,"Ziel %d °C",s.hose?s.hoseTemperature:s.target);p.text(font14,b,120,118,182,MUTED);}
 const char* line=s.phase==UiPhase::Connecting?"Verbinden …":s.phase==UiPhase::BalloonReady?"Ballon aufsetzen":s.phase==UiPhase::Checkpoint?"Bereit für nächste Stufe":s.phase==UiPhase::Error?"Fehler · Gerät prüfen":s.phase==UiPhase::HoseHeating?"Heizt · danach Luft halten":s.phase==UiPhase::HoseReady?(s.fan?"Luft läuft · loslassen = AUS":"Bereit · für Luft halten"):s.cooling?"Kühlt ab · Hue schaltet aus":s.phase==UiPhase::Complete?"Abgeschlossen":s.workflow?"WORKFLOW":s.hose?"MANUELL · SCHLAUCH":"PRESET";
 if(s.phase==UiPhase::Running){if(s.actionType==0)snprintf(b,sizeof b,"Heizt auf %d °C",s.actionTarget);else snprintf(b,sizeof b,"%s · %d s",s.actionType==2?"Lüftet":"Wartet",s.remaining);line=b;}
 if(s.message[0]&&(s.phase==UiPhase::Error||!s.busy))line=s.message;
 if(s.workflow&&!s.busy&&!s.retryStage&&s.startStage>1&&s.stages>1&&s.phase!=UiPhase::Error){snprintf(b,sizeof b,"Start ab Stufe %d / %d",s.startStage,s.stages);line=b;}
 p.text(font12,line,120,135,204,s.phase==UiPhase::Error?RED:MUTED);
 if(s.hose&&(s.phase==UiPhase::HoseReady||s.phase==UiPhase::HoseHeating)){p.button(29,112,s.phase==UiPhase::HoseReady?"Luft halten":"Heizt …",s.phase==UiPhase::HoseReady?BLUE:PANEL);p.button(147,64,"Ende",RED);}
 else p.button(42,156,s.phase==UiPhase::BalloonReady?"Ballon bereit":s.phase==UiPhase::Checkpoint?"Weiter":s.busy?"Stoppen":s.retryStage?"Preset erneut":s.hose?"Heizen starten":"Starten",s.busy&&s.phase!=UiPhase::Checkpoint&&s.phase!=UiPhase::BalloonReady?RED:GREEN);
 if(s.workflow&&s.busy)snprintf(b,sizeof b,"Stufe %d / %d",s.stage,s.stages);else snprintf(b,sizeof b,"H %s · L %s",s.heat?"AN":"AUS",s.fan?"AN":"AUS");p.text(font12,b,120,202,100,MUTED);
}
}
