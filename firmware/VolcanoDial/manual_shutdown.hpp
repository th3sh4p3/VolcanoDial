#pragma once
namespace vd {
enum class ManualOffResult {Done,HueFailed,OutputsUnknown,PersistenceFailed,ReleaseFailed};
// A deliberate shutdown overrides cooling time, never OFF confirmation.
template<class Stop,class HueOff,class Verify,class Retire,class Release>
ManualOffResult manualPowerOff(bool useHue,bool ownedHue,Stop stop,HueOff hueOff,Verify verify,Retire retire,Release release){
 stop();
 if(useHue&&!hueOff())return ManualOffResult::HueFailed;
 bool authoritative=useHue&&ownedHue;
 if(!authoritative&&!verify())return ManualOffResult::OutputsUnknown;
 if(!retire(authoritative))return ManualOffResult::PersistenceFailed;
 return release(authoritative)?ManualOffResult::Done:ManualOffResult::ReleaseFailed;
}
}
