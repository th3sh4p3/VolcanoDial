#pragma once
#include <algorithm>
#include <cstdlib>
namespace vd {
// Menu-only, no inertia. A moved/cancelled gesture can never become a tap.
class MenuSwipe {
 bool active=false,moved=false;int startX=0,startY=0,anchorY=0;
public:
 void press(int x,int y,bool enabled){active=enabled;moved=false;startX=x;startY=anchorY=y;}
 int move(int x,int y){
  if(!active)return 0;
  int dx=x-startX,dy=y-startY;
  if(std::abs(dx)>12||std::abs(dy)>12)moved=true;
  if(std::abs(dx)>20&&std::abs(dx)>std::abs(dy)){active=false;return 0;}
  int steps=(anchorY-y)/36;if(!steps)return 0;
  int bounded=std::clamp(steps,-4,4);anchorY-=bounded*36;if(bounded!=steps)anchorY=y;
  return bounded;
 }
 void cancel(){if(active)moved=true;active=false;}
 bool finish(){bool consumed=moved;active=moved=false;return consumed;}
};
}
