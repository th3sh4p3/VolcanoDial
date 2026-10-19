#pragma once
#include "core.hpp"

namespace vd {
// Adjust a compiled copy for this run. Stored graphs and preset values stay intact.
inline void tunePlan(Plan& plan,bool requireBalloon,double fillSeconds,bool useGlobalFill,bool aromaFinishCalibration=false){
 for(auto& stage:plan.stages){
  double originalAir=0;
  double confirmTimeout=120;
  for(const auto& action:stage.actions){
   if(action.type==ActionType::Air)originalAir+=action.seconds;
   if(action.type==ActionType::Confirm)confirmTimeout=action.seconds;
  }
  std::vector<Action> actions;
  actions.reserve(stage.actions.size()+1);
  for(auto action:stage.actions){
   if(action.type==ActionType::Confirm)continue;
   if(useGlobalFill&&action.type==ActionType::Air&&originalAir>0){
    action.seconds*=fillSeconds/originalAir;
    // The built-in Finish balloon was reported to overfill by about 4 s at 56 s.
    // Preserve its 20/30/50 profile; the adjusted volume still needs a live test.
    if(aromaFinishCalibration&&stage.name=="AK3 Finish")action.seconds*=13.0/14.0;
   }
   actions.push_back(action);
  }
  if(requireBalloon){
   bool heating=false;
   for(auto it=actions.begin();it!=actions.end();++it){
    if(it->type==ActionType::Heat)heating=true;
    else if(it->type==ActionType::HeatOff)heating=false;
    else if(it->type==ActionType::Air){
     if(heating)actions.insert(it,{ActionType::Confirm,0,confirmTimeout});
     break;
    }
   }
  }
  stage.actions=std::move(actions);
 }
}
}
