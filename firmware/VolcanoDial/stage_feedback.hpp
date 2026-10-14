#pragma once
#include "ui_model.hpp"
#include <cstdint>

namespace vd {
enum class StageTone : uint8_t {None, First, Second};
class StageFeedback {
  bool activeStage=false, secondPending=false;
  uint64_t secondAt=0;
 public:
  StageTone tick(UiPhase phase, bool workflow, bool sound, uint64_t now) {
    if(!workflow||phase==UiPhase::Idle||phase==UiPhase::Stopped||phase==UiPhase::Error){
      activeStage=false;secondPending=false;return StageTone::None;
    }
    if(phase==UiPhase::Running)activeStage=true;
    if((phase==UiPhase::Checkpoint||phase==UiPhase::Complete)&&activeStage){
      activeStage=false;
      if(sound){secondPending=true;secondAt=now+170;return StageTone::First;}
    }
    if(!sound){secondPending=false;return StageTone::None;}
    if(secondPending&&now>=secondAt){secondPending=false;return StageTone::Second;}
    return StageTone::None;
  }
};
}
