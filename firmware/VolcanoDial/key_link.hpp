#pragma once
#include <cstdint>
#include <algorithm>

namespace vd {
inline int ledBrightness(int display,int normal){return std::clamp((std::clamp(display,0,255)*255+std::clamp(normal,1,255)/2)/std::clamp(normal,1,255),0,255);}
inline int dimLed(int rgb,int brightness){
  int level=std::clamp(brightness,0,255),out=0;
  for(int shift:{0,8,16})out|=(((rgb>>shift)&255)*level+127)/255<<shift;
  return out;
}
// IO owns the serial bus; no heap allocations or accessory-specific setup
// are needed elsewhere. A newly attached held key never starts the fan.
template<class IO> class KeyLink {
  IO& io;bool ready=false,releaseRequired=true;int shownColor=-1;
  uint64_t retryAt=0;
 public:
  bool alive=false,held=false;uint64_t seen=0;
  explicit KeyLink(IO& source):io(source){}
  void tick(int color){
    if(!ready){
      alive=held=false;if(io.now()<retryAt)return;
      retryAt=io.now()+500;if(!io.initialize())return;
      ready=true;releaseRequired=true;shownColor=-1;
    }
    bool pressed=false;
    if(!io.read(pressed)){
      alive=held=ready=false;releaseRequired=true;shownColor=-1;
      retryAt=io.now()+500;return;
    }
    seen=io.now();alive=true;
    if(!pressed)releaseRequired=false;
    held=pressed&&!releaseRequired;
    if(color!=shownColor&&io.color(color))shownColor=color;
  }
};
}
