#pragma once

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
}
