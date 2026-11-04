#pragma once
namespace vd {
// The hardware boundary owns the GPIO and RTC operations. Remaining powered
// after release means an external supply or wake signal, not proven USB power.
template<class IO> class BoardPower {
  IO& io;bool resting=false;
public:
  explicit BoardPower(IO& source):io(source){}
  void begin(){io.latch(true);resting=false;}
  template<class Allowed> bool release(Allowed allowed){if(!io.clearRtc()||!allowed())return false;resting=true;io.latch(false);return true;}
  bool release(){return release([](){return true;});}
  void wake(){io.latch(true);resting=false;}
  bool standby()const{return resting;}
};
}
