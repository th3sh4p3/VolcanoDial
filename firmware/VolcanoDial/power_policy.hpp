#pragma once
#include <cstdint>

namespace vd {
struct PowerSafety {
  bool programActive=false, busy=false, cooling=false, coolingPending=false;
  bool coolingRestore=false, heat=false, fan=false, heatRequested=false;
  bool fanRequested=false, interlock=false, operation=false, queued=false;
  bool activationPending=false, stopping=false, manualHeld=false;
};

inline bool canPowerOff(const PowerSafety& s) {
  return !s.programActive && !s.busy && !s.cooling && !s.coolingPending &&
         !s.coolingRestore && !s.heat && !s.fan && !s.heatRequested &&
         !s.fanRequested && !s.interlock && !s.operation && !s.queued &&
         !s.activationPending && !s.stopping && !s.manualHeld;
}

inline bool autoPowerOffDue(uint64_t idleMs,int minutes,bool eligible,bool attempted) {
  return eligible && !attempted && minutes>=1 && minutes<=240 &&
         idleMs>=uint64_t(minutes)*60000;
}

// The power latch may be released only after Hue reports the configured plug
// OFF and the safety conditions still hold at the end of that network call.
template<class Safe, class HueOff, class CutPower>
bool confirmedPowerOff(bool hueEnabled, Safe safe, HueOff hueOff, CutPower cutPower) {
  if (!safe()) return false;
  if (hueEnabled && !hueOff()) return false;
  if (!safe()) return false;
  cutPower();
  return true;
}
}
