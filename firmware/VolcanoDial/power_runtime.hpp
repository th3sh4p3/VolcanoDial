#pragma once
#include <cstdint>

namespace vd {
class BootInputGate {
  bool armed=false,released=false;uint64_t since=0;
public:
  void reset(){armed=released=false;since=0;}
  bool update(bool held,uint64_t now){
    if(armed)return true;
    if(held){released=false;return false;}
    if(!released||now<since){released=true;since=now;}
    if(now-since>=100)armed=true;
    return armed;
  }
};
class PowerIdleClock {
  uint64_t last=0;bool initialized=false,protectedBefore=false;
public:
  void activity(uint64_t now){last=now;initialized=true;}
  void observe(uint64_t now,bool protectedNow){
    if(!initialized||protectedNow||protectedBefore||now<last)activity(now);
    protectedBefore=protectedNow;
  }
  uint64_t elapsed(uint64_t now)const{return now>=last?now-last:0;}
};
class ShutdownRetries {
  unsigned count=0;uint64_t first=0;
public:
  void reset(){count=0;first=0;}
  bool due(uint64_t now){
    if(count>=3)return false;
    if(!count){first=now;++count;return true;}
    if(now<first||now-first<(count==1?30000u:120000u))return false;
    ++count;return true;
  }
};
inline bool offEvidenceValid(bool obligation,bool off,uint64_t now,uint64_t statusAt,
                            uint32_t generation,uint32_t expectedGeneration,
                            uint32_t epoch,uint32_t expectedEpoch){
  return !obligation||(off&&now>=statusAt&&now-statusAt<=1500&&
                      generation==expectedGeneration&&epoch==expectedEpoch);
}
}
