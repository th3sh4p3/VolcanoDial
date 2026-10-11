#pragma once
#include "core.hpp"
#include <atomic>
namespace vd {
enum class KeyContext {Idle,Running,Checkpoint,HoseHeating,HoseReady,Fault};
enum class InputAction {None,Activate,Stop,FanOn,FanOff};
enum class Readiness {Waiting,Ready,Cancelled,TimedOut};
inline Readiness startReadiness(bool wifi,bool clock,bool stop,uint64_t elapsed){if(stop)return Readiness::Cancelled;if(wifi&&clock)return Readiness::Ready;return elapsed>=30000?Readiness::TimedOut:Readiness::Waiting;}
inline KeyContext gatedContext(KeyContext base,bool inhibited){return inhibited?KeyContext::Fault:base;}
class WifiRetry {
 uint64_t last=0;
public:
 bool tick(bool connected,bool configured,uint64_t now){if(connected||!configured||now<last){last=now;return false;}if(now-last<10000)return false;last=now;return true;}
};
class WebHoldLease {
 uint64_t lastSequence=0,currentGesture=0,blockedGesture=0,seen=0;bool enabled=false;
public:
 bool demand(uint64_t now,bool allowed){if(enabled&&(!allowed||now<seen||now-seen>450)){enabled=false;blockedGesture=currentGesture;}return enabled;}
 bool update(bool on,uint64_t sequence,uint64_t gesture,uint64_t now,bool allowed){
  demand(now,allowed);if(!sequence||!gesture||sequence<=lastSequence)return enabled;
  lastSequence=sequence;if(!on||!allowed){enabled=false;blockedGesture=gesture;currentGesture=gesture;return false;}
  if(gesture==blockedGesture)return false;currentGesture=gesture;seen=now;enabled=true;return true;
 }
};
class ReleaseGesture {
 uint64_t started=0;bool active=false;
public:
 void press(uint64_t token){started=token;active=true;}
 bool release(uint64_t token){bool valid=active&&started==token;active=false;return valid;}
};
class RequestFence {
 std::atomic<uint32_t> epoch{0};
public:
 uint32_t snapshot()const{return epoch.load();}
 void invalidate(){++epoch;}
 bool accepts(uint32_t stamp,bool stop=false)const{return stop||stamp==epoch.load();}
};
inline bool optionalReadAllowed(bool stop,bool end,bool manual,bool demand){return !stop&&!end&&(!manual||demand);}
class KeyInput {
 bool initialized=false,armed=false,lastRaw=false,fired=false,fan=false;
 KeyContext context=KeyContext::Fault;uint64_t changedAt=0,pressedAt=0;
public:
 InputAction tick(bool held,bool alive,KeyContext next,uint64_t now){
  if(!alive){bool off=fan;fan=false;initialized=armed=fired=false;return off?InputAction::FanOff:InputAction::None;}
  if(!initialized||next!=context){
   bool off=fan;fan=false;initialized=true;context=next;armed=!held;fired=false;lastRaw=held;changedAt=now;
   if(off)return InputAction::FanOff;
  }
  if(!held){bool off=fan;fan=false;armed=true;fired=false;lastRaw=false;changedAt=now;return off?InputAction::FanOff:InputAction::None;}
  if(!lastRaw){lastRaw=true;changedAt=now;}
  if(!armed||now<changedAt||now-changedAt<35)return InputAction::None;
  if(!fired){fired=true;pressedAt=now;
   if(context==KeyContext::Idle||context==KeyContext::Checkpoint)return InputAction::Activate;
   if(context==KeyContext::HoseReady){fan=true;return InputAction::FanOn;}
  }
  if(context==KeyContext::Running&&pressedAt&&now>=pressedAt&&now-pressedAt>=800){armed=false;return InputAction::Stop;}
  return InputAction::None;
 }
};
inline bool holdFresh(bool h,uint64_t n,uint64_t s,uint64_t lease){return h&&n>=s&&n-s<=lease;}
enum class HosePhase {Off,Heating,Ready,Complete,Error};
class HoseSession {
 DeviceIO& io;double goal=210,previousTarget=NAN;uint64_t deadline=0;
 bool fail(uint64_t now,const char* why){error=why;bool f=io.fan(false),h=io.heat(false);phase=HosePhase::Error;if(!f||!h)error="AUS nicht bestätigt. Volcano kontrollieren!";return false;}
public:
 HosePhase phase=HosePhase::Off;std::string error;
 explicit HoseSession(DeviceIO& device):io(device){}
 bool ready()const{return phase==HosePhase::Ready;}
 bool busy()const{return phase==HosePhase::Heating||ready();}
 double target()const{return goal;}
 bool start(double value,uint64_t now){
  if(busy()||!std::isfinite(value)||value<40||value>230||!io.snapshot().connected)return false;
  previousTarget=io.snapshot().target;goal=value;error.clear();
  bool f=io.fan(false),h=io.heat(false);if(!f||!h)return fail(now,"Ausgangszustand nicht bestätigt");
  if(!io.target(goal)||!io.heat(true)||!io.refreshTemperature())return fail(now,"Heizen nicht bestätigt");
  phase=HosePhase::Heating;deadline=std::max(now,io.monotonic())+360000;return true;
 }
 bool changeTarget(double value,uint64_t now){
  if(!busy()||!std::isfinite(value)||value<40||value>230)return false;
  if(!io.fan(false)||!io.target(value))return fail(now,"Temperaturänderung nicht bestätigt");
  goal=value;phase=HosePhase::Heating;deadline=std::max(now,io.monotonic())+360000;return true;
 }
 void tick(uint64_t now,bool demand){
  if(!busy())return;auto s=io.snapshot();now=std::max(now,io.monotonic());
  if(!s.connected){fail(now,"Bluetooth getrennt");return;}
  if(!s.valid||s.fault||now<s.statusAt||now-s.statusAt>1500||!std::isfinite(s.current)||now<s.sampleAt||now-s.sampleAt>1500){fail(now,"Gerätestatus veraltet oder fehlerhaft");return;}
  if(!s.heat||!s.heatRequested){fail(now,"Heizung wurde ausgeschaltet");return;}
  if(phase==HosePhase::Heating){
   if(s.current>=goal-1){phase=HosePhase::Ready;demand=false;}
   else if(now>=deadline){fail(now,"Heizzeitlimit überschritten");return;}
  }
  bool on=ready()&&demand;if(s.fan!=on&&!io.fan(on)){
   if(on&&io.manualAirCancelled()){if(!io.fan(false))fail(now,"Luft AUS nicht bestätigt");}
   else fail(now,on?"Luft EIN nicht bestätigt":"Luft AUS nicht bestätigt");
  }
 }
 bool stop(uint64_t now){
  bool f=io.fan(false),h=io.heat(false);if(!f||!h)return fail(now,"AUS nicht bestätigt");
  if(io.snapshot().connected&&std::isfinite(previousTarget)&&!io.restoreTarget(previousTarget))return fail(now,"Zieltemperatur nicht wiederhergestellt");
  phase=HosePhase::Complete;error.clear();return true;
 }
};
}
