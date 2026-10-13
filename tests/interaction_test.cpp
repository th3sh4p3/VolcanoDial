#include "../firmware/VolcanoDial/interaction.hpp"
#include <cassert>
#include <iostream>
#include "../firmware/VolcanoDial/memory_window.hpp"
using namespace vd;
struct IO:DeviceIO{
 Snapshot s{true,true,false,false,false,false,false,180,180,0,0};
 bool failOff=false,cancelOn=false;int fanOn=0;uint64_t clock=0;
 bool manualAirCancelled()override{return cancelOn;}
 Snapshot snapshot()override{return s;}uint64_t monotonic()override{return clock;}
 bool target(double v)override{s.target=v;return true;}
 bool heat(bool v)override{s.heat=s.heatRequested=s.interlock=v;return true;}
 bool fan(bool v)override{if(v&&cancelOn)return false;if(!v&&failOff)return false;s.fan=s.fanRequested=v;if(v)++fanOn;return true;}
 void at(uint64_t n){clock=n;s.sampleAt=s.statusAt=n;}
};
int main(){
 int leaseCalls=0,workCalls=0;bool suspended=false;auto memoryLease=[&](bool enter){++leaseCalls;suspended=enter;return true;};assert(withMemoryWindow(memoryLease,[&](){++workCalls;assert(suspended);return true;}));assert(!suspended&&leaseCalls==2&&workCalls==1);assert(!withMemoryWindow(memoryLease,[](){return false;}));assert(!suspended);assert(!withMemoryWindow([](bool){return false;},[&](){++workCalls;return true;}));assert(workCalls==1);assert(!withMemoryWindow([](bool enter){return enter;},[](){return true;}));

 WifiRetry wifi;assert(!wifi.tick(false,true,9999));assert(wifi.tick(false,true,10000));assert(!wifi.tick(false,true,19999));assert(wifi.tick(false,true,20000));assert(!wifi.tick(true,true,25000));assert(!wifi.tick(false,true,30000));assert(wifi.tick(false,true,35000));assert(!wifi.tick(false,false,50000));
 assert(startReadiness(false,true,false,100)==Readiness::Waiting);assert(startReadiness(true,true,false,2000)==Readiness::Ready);assert(startReadiness(false,true,false,30000)==Readiness::TimedOut);assert(startReadiness(true,true,true,100)==Readiness::Cancelled);
 assert(gatedContext(KeyContext::HoseReady,true)==KeyContext::Fault);
 WebHoldLease lease;assert(lease.update(true,1,1,1000,true));assert(lease.demand(1400,true));assert(!lease.demand(1451,true));
 assert(!lease.update(true,2,1,1500,true)); // late heartbeat cannot restart the same held gesture
 assert(!lease.update(false,3,1,1501,true));assert(lease.update(true,4,2,1600,true));
 assert(!lease.demand(1601,false));assert(!lease.update(true,5,2,1602,true));
 assert(!lease.update(true,6,3,1700,false));assert(!lease.update(true,7,3,1701,true));
 ReleaseGesture release;release.press(1);assert(!release.release(2));release.press(2);assert(release.release(2));assert(!release.release(2));
 RequestFence fence;auto stamp=fence.snapshot();assert(fence.accepts(stamp));fence.invalidate();assert(!fence.accepts(stamp));assert(fence.accepts(stamp,true));assert(fence.accepts(fence.snapshot()));
 assert(!optionalReadAllowed(true,false,false,true));assert(!optionalReadAllowed(false,true,false,true));assert(!optionalReadAllowed(false,false,true,false));assert(optionalReadAllowed(false,false,false,false));
 KeyInput editKey;editKey.tick(false,true,KeyContext::HoseReady,1);editKey.tick(true,true,gatedContext(KeyContext::HoseReady,true),2);assert(editKey.tick(true,true,gatedContext(KeyContext::HoseReady,true),100)==InputAction::None);assert(editKey.tick(true,true,gatedContext(KeyContext::HoseReady,false),200)==InputAction::None);
 KeyInput k;
 assert(k.tick(true,true,KeyContext::Idle,0)==InputAction::None); // held attach
 assert(k.tick(false,true,KeyContext::Idle,10)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Idle,40)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Idle,80)==InputAction::Activate);
 assert(k.tick(true,true,KeyContext::Running,100)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Running,2000)==InputAction::None); // initial hold is not STOP
 k.tick(false,true,KeyContext::Running,2010);k.tick(true,true,KeyContext::Running,2050);
 assert(k.tick(true,true,KeyContext::Running,2090)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Running,2891)==InputAction::Stop);
 assert(k.tick(true,true,KeyContext::Running,4000)==InputAction::None);
 k.tick(false,true,KeyContext::Checkpoint,4010);k.tick(true,true,KeyContext::Checkpoint,4050);
 assert(k.tick(true,true,KeyContext::Checkpoint,4090)==InputAction::Activate);
 assert(k.tick(true,true,KeyContext::Running,4100)==InputAction::None);
 k.tick(false,true,KeyContext::BalloonReady,4200);k.tick(true,true,KeyContext::BalloonReady,4240);
 assert(k.tick(true,true,KeyContext::BalloonReady,4280)==InputAction::Activate);
 assert(k.tick(true,true,KeyContext::BalloonReady,4300)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Running,4310)==InputAction::None);
 assert(k.tick(true,true,KeyContext::Checkpoint,8000)==InputAction::None);
 k.tick(false,true,KeyContext::HoseHeating,8100);k.tick(true,true,KeyContext::HoseHeating,8140);k.tick(true,true,KeyContext::HoseHeating,8180);
 assert(k.tick(true,true,KeyContext::HoseReady,8200)==InputAction::None);
 k.tick(false,true,KeyContext::HoseReady,8210);k.tick(true,true,KeyContext::HoseReady,8250);
 assert(k.tick(true,true,KeyContext::HoseReady,8290)==InputAction::FanOn);
 assert(k.tick(false,true,KeyContext::HoseReady,8291)==InputAction::FanOff); // no release debounce
 k.tick(true,true,KeyContext::HoseReady,8330);assert(k.tick(true,true,KeyContext::HoseReady,8370)==InputAction::FanOn);
 assert(k.tick(true,false,KeyContext::HoseReady,8371)==InputAction::FanOff);
 assert(k.tick(true,true,KeyContext::HoseReady,9000)==InputAction::None);
 assert(holdFresh(true,1000,1000,150));assert(!holdFresh(true,1151,1000,150));assert(!holdFresh(true,999,1000,150));
 IO io;HoseSession hose(io);io.at(10000);assert(hose.start(210,10000));assert(io.s.heat&&!io.s.fan);
 io.at(10100);hose.tick(10100,true);assert(!io.s.fan&&!hose.ready());
 io.s.current=210;io.at(10200);hose.tick(10200,false);assert(hose.ready());
 io.at(10300);hose.tick(10300,true);assert(io.s.fan);
 io.at(10301);hose.tick(10301,false);assert(!io.s.fan&&io.s.heat);
 io.cancelOn=true;io.at(10302);hose.tick(10302,true);assert(hose.ready()&&io.s.heat&&!io.s.fan);io.cancelOn=false;
 assert(hose.changeTarget(222,10302));assert(!hose.ready());assert(io.s.target==222);
 io.s.current=222;io.at(10400);hose.tick(10400,false);assert(hose.ready());
 assert(hose.stop(10401));assert(!io.s.heat&&!io.s.fan);assert(hose.phase==HosePhase::Complete);
 struct StopRestore : IO {bool cancelled=false;bool target(double c)override{return !cancelled&&IO::target(c);}bool restoreTarget(double c)override{assert(!s.heat&&!s.fan);return IO::target(c);}} stopped;
 HoseSession stoppedHose(stopped);assert(stoppedHose.start(210,0));stopped.cancelled=true;assert(stoppedHose.stop(1));assert(stoppedHose.phase==HosePhase::Complete);assert(stopped.s.target==180);
 io.at(11000);assert(!hose.start(231,11000));assert(hose.start(210,11000));
 io.at(11010);io.s.connected=false;hose.tick(11010,false);assert(hose.phase==HosePhase::Error);io.s.connected=true;
 io.at(12000);assert(hose.start(230,12000));io.at(373000);hose.tick(373000,false);assert(hose.phase==HosePhase::Error);assert(!io.s.heat&&!io.s.fan);
 io.at(400000);assert(hose.start(210,400000));io.at(400100);io.s.current=210;hose.tick(400100,false);io.failOff=true;assert(!hose.stop(400101));assert(hose.phase==HosePhase::Error);
 std::cout<<"Input edges, mode transitions, release leases and hose session tests passed\n";
}
