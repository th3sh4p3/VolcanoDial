#pragma once
#include <cstdint>
#include <algorithm>
namespace vd {
class WakePress {
 bool suppressed=false;
public:
 bool consume(bool held,bool resting){if(!held){suppressed=false;return false;}if(resting)suppressed=true;return suppressed;}
};
class WakeRotation {
 uint64_t until=0;
public:
 bool consume(int delta,uint64_t now,bool waking){if(!delta)return false;if(waking||now<until){until=now+250;return true;}return false;}
};
class DisplayIdle {
 uint64_t last=0;bool forced=false;
public:
 void wake(uint64_t now){last=now;forced=false;}
 void sleepNow(){forced=true;}
 bool resting(uint64_t now,bool enabled,uint32_t dimSeconds)const{return forced||(enabled&&now>=last&&now-last>=uint64_t(dimSeconds)*1000);}
 int brightness(uint64_t now,int normal,bool enabled,uint32_t dimSeconds,uint32_t offSeconds,bool preventSleep=false)const{
  normal=std::clamp(normal,1,255);if(preventSleep)return normal;if(forced)return 0;if(!enabled||now<last)return normal;uint64_t idle=now-last,dim=uint64_t(dimSeconds)*1000,off=std::max(uint64_t(offSeconds)*1000,dim+10000);
  if(idle>=off)return 0;int low=std::min(normal,std::max(4,normal/6));
  uint64_t fade=std::min<uint64_t>(10000,(off-dim)/2);
  if(idle<dim)return normal;if(idle<dim+fade)return normal-int((normal-low)*(idle-dim)/fade);
  if(idle<off-fade)return low;return int(low*(off-idle)/fade);
 }
};
}
