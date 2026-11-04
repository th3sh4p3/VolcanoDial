#pragma once
#include <cstdint>
#include <algorithm>
namespace vd {
// Optional MAX17048 behind PaHub channel 0. No charger or presence inference.
template<class IO> class BatteryMonitor {
  IO& io;bool enabled=false,good=false,sampled=false,criticalLevel=false,lowLevel=false;
  uint64_t sampledAt=0,attemptAt=0;int mv=0,pct=0;double rate=0;
public:
  explicit BatteryMonitor(IO& source):io(source){}
  void sample(uint64_t now,bool on,bool idle){
    if(!on){enabled=good=sampled=criticalLevel=lowLevel=false;return;}
    enabled=true;uint64_t interval=idle?30000:5000;
    if(sampled&&now>=attemptAt&&now-attemptAt<interval)return;
    sampled=true;attemptAt=now;uint16_t version=0,v=0,s=0,r=0;
    good=io.select()&&io.read(8,version)&&version>=0x10&&version<0x100&&
         io.read(2,v)&&io.read(4,s)&&io.read(0x16,r)&&s<=25600;
    if(!good)return;
    mv=int(uint32_t(v)*78125/1000000);if(mv<2500||mv>4350){good=false;return;}
    pct=int(s/256);rate=int16_t(r)*0.208;sampledAt=now;
    criticalLevel=criticalLevel?pct<13:pct<=10;
    lowLevel=lowLevel?pct<23:pct<=20;
  }
  bool valid(uint64_t now,bool idle)const{return enabled&&good&&now>=sampledAt&&now-sampledAt<=(idle?90000u:15000u);}
  int voltageMv()const{return mv;}int percent()const{return pct;}
  double chargeRate()const{return rate;}
  // A failed/stale sample makes telemetry unknown, not a proven recovery.
  bool critical()const{return enabled&&criticalLevel;}
  bool low()const{return enabled&&good&&lowLevel;}
  bool presenceKnown()const{return false;}bool chargingKnown()const{return false;}
};
}
