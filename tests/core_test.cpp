#include "../firmware/VolcanoDial/core.hpp"
#include "../firmware/VolcanoDial/plan_tuning.hpp"
#include "../firmware/VolcanoDial/key_link.hpp"
#include <cassert>
#include <fstream>
#include <iostream>
using namespace vd;
struct Fake : DeviceIO {
  Snapshot s{true, true, false, false, false, false, false, 180, 180, 0, 0};
  bool held=false, failOff=false; int ons=0, offs=0;
  Snapshot snapshot() override { return s; }
  bool target(double c) override { s.target=c; return true; }
  bool heat(bool v) override { s.heat=s.heatRequested=s.interlock=v; return true; }
  bool fan(bool v) override { if(!v && failOff)return false; s.fan=s.fanRequested=v; if(v)ons++;else offs++; return true; }
};
int main(int argc,char**argv) {
 if(argc==2){std::ifstream f(argv[1]); JsonDocument d; if(deserializeJson(d,f))return 2; Compiler c; Plan p; bool ok=c.compile(d["library"], d["ref"], p); JsonDocument out;out["ok"]=ok;out["error"]=c.error; if(ok){auto stages=out["stages"].to<JsonArray>();for(auto& st:p.stages){auto j=stages.add<JsonObject>();j["name"]=st.name;auto a=j["actions"].to<JsonArray>();for(auto& ac:st.actions){auto x=a.add<JsonObject>();x["type"]=actionName(ac.type);if(ac.type==ActionType::Heat){x["temperature"]=ac.value;x["timeoutSeconds"]=ac.seconds;}else if(ac.type!=ActionType::HeatOff)x["durationSeconds"]=ac.seconds;}}}serializeJson(out,std::cout);return 0;}
 Fake io; Engine e(io); Plan p; p.workflow=true;p.stages={{"A",{{ActionType::Heat,180,360},{ActionType::Air,0,1}}},{"B",{{ActionType::Wait,0,1}}}};
 assert(e.start(p,0)); assert(!e.manualFan(true));
 for(uint64_t t=0;t<1200;t+=20){io.s.sampleAt=io.s.statusAt=t;e.tick(t);}
 assert(e.phase==Phase::AwaitingNext);assert(!io.s.fan&&!io.s.heat);assert(!e.manualFan(true));assert(e.next(1200));
 for(uint64_t t=1200;t<2400;t+=20){io.s.sampleAt=io.s.statusAt=t;e.tick(t);}
 assert(e.phase==Phase::Complete);assert(io.s.target==180);
 assert(e.start(p,3000));io.s.connected=false;e.tick(3020);assert(e.phase==Phase::Error);io.s.connected=true;e.tick(3040);assert(e.phase==Phase::Error);
 // A cleanup failure must retain the cause of the interrupted action.
 struct FailRestore : Fake {bool target(double)override{return false;}std::string failureDetail()override{return "Solltemperatur 208 / 195 C";}} restoreFailure;
 Engine restoreEngine(restoreFailure);Plan restorePlan;restorePlan.stages={{"failure",{{ActionType::Heat,220,1}}}};
 assert(restoreEngine.start(restorePlan,0));restoreEngine.tick(0);
 assert(restoreEngine.phase==Phase::Error);
 assert(restoreEngine.error.find("Solltemperatur nicht bestaetigt")!=std::string::npos);
 assert(restoreEngine.error.find("Zieltemperatur nicht wiederhergestellt")!=std::string::npos);
 assert(restoreEngine.error.find("Solltemperatur 208 / 195 C")!=std::string::npos);
 assert(e.start(p,4000));io.s.target=220;io.failOff=true;e.stop(4010);assert(e.phase==Phase::Error);assert(io.s.target==220);io.failOff=false;
 // The worker keeps cancellation asserted until cleanup returns. An output-off
 // restoration is a separate operation and must still restore the old target.
 struct StopRestore : Fake {bool cancelled=false;bool target(double c)override{return !cancelled&&Fake::target(c);}bool restoreTarget(double c)override{assert(!s.heat&&!s.fan);return Fake::target(c);}} stopped;
 Engine stopEngine(stopped);assert(stopEngine.start(p,0));stopped.s.target=221;stopped.cancelled=true;stopEngine.stop(1);
 assert(stopEngine.phase==Phase::Aborted);assert(stopped.s.target==180);assert(!stopped.s.heat&&!stopped.s.fan);
 Plan heat;heat.stages={{"timeout",{{ActionType::Heat,220,1}}}};assert(e.start(heat,5000));
 for(uint64_t t=5000;t<6200;t+=20){io.s.sampleAt=io.s.statusAt=t;e.tick(t);}assert(e.phase==Phase::Error);
 Cooldown cd;Snapshot s=io.s;s.connected=s.valid=true;s.heat=s.fan=s.heatRequested=s.fanRequested=s.interlock=false;s.current=49.9;s.sampleAt=s.statusAt=10000;
 cd.arm("a");assert(!cd.observe(s,"a",10000,50,false));assert(!cd.observe(s,"a",12000,50,false)); // stale sample
 s.sampleAt=s.statusAt=12000;assert(!cd.observe(s,"a",12000,50,false));s.sampleAt=s.statusAt=14000;assert(cd.observe(s,"a",14000,50,false));
 // A ready request is not an acknowledged Hue OFF. Failure must leave it armed.
 assert(cd.armed);s.sampleAt=s.statusAt=15000;assert(cd.observe(s,"a",15000,50,false));
 cd.cancel();assert(!cd.armed);
 cd.arm("a");s.sampleAt=s.statusAt=15500;assert(!cd.observe(s,"a",15500,50,false));
 assert(!cd.observe(s,"a",15500,50,false)); // one sample is never two confirmations
 s.sampleAt=s.statusAt=15600;assert(!cd.observe(s,"a",15600,50,true)); // checkpoint/busy resets evidence
 s.sampleAt=s.statusAt=15700;s.heat=true;assert(!cd.observe(s,"a",15700,50,false));s.heat=false;
 s.sampleAt=s.statusAt=15800;s.fanRequested=true;assert(!cd.observe(s,"a",15800,50,false));s.fanRequested=false;
 s.sampleAt=s.statusAt=15900;assert(!cd.observe(s,"a",15900,50,false));s.sampleAt=s.statusAt=16000;assert(cd.observe(s,"a",16000,50,false));
 cd.arm("a");s.sampleAt=s.statusAt=16000;assert(!cd.observe(s,"b",16000,50,false));assert(!cd.armed);
 cd.arm("a");s.current=50.1;s.sampleAt=s.statusAt=18000;assert(!cd.observe(s,"a",18000,50,false));
 s.current=49;s.sampleAt=18000;s.statusAt=22000;assert(!freshCool(s,22000,50));s.sampleAt=22000;assert(freshCool(s,22000,50));s.heatRequested=true;assert(!freshCool(s,22000,50));s.heatRequested=false;
 HoldGate gate;assert(!gate.update(true,true,0,0));assert(!gate.update(true,false,20,20));assert(!gate.update(false,false,40,40));assert(gate.update(true,false,60,60));assert(!gate.update(true,false,300,60));
 // Native ready pulses count against the same cumulative physical air budget.
 Fake pulses;pulses.s.fanTotalMs=0;Engine pe(pulses);Plan pp;pp.stages={{"pulse",{{ActionType::Wait,0,0.1},{ActionType::Air,0,1}}}};assert(pe.start(pp,0));pe.tick(0);pulses.s.fanTotalMs=400;pe.tick(100);pe.tick(120);assert(pulses.ons==1);pulses.s.fanTotalMs=1000;pe.tick(720);pe.tick(740);assert(pe.phase==Phase::Complete);
 Fake stale;Engine se(stale);Plan sp;sp.stages={{"stale",{{ActionType::Wait,0,10}}}};assert(se.start(sp,0));se.tick(0);se.tick(2000);assert(se.phase==Phase::Error);assert(!stale.s.heat&&!stale.s.fan);
 // A missed optional status read at a workflow checkpoint must not erase the
 // completed stage. No next stage may start until status is fresh again.
 Fake checkpoint;Engine ce(checkpoint);Plan cp;cp.workflow=true;cp.stages={{"01",{}},{"02",{{ActionType::Heat,210,90}}}};
 assert(ce.start(cp,100));checkpoint.s.statusAt=100;ce.tick(100);assert(ce.phase==Phase::AwaitingNext);
 checkpoint.s.valid=false;ce.tick(200);assert(ce.phase==Phase::AwaitingNext);
 assert(!ce.next(200));assert(ce.phase==Phase::AwaitingNext&&ce.stageIndex==0);
 checkpoint.s.valid=true;checkpoint.s.statusAt=250;assert(ce.next(250));assert(ce.phase==Phase::Running&&ce.stageIndex==1);
 Fake oldCheckpoint;Engine oce(oldCheckpoint);assert(oce.start(cp,100));oldCheckpoint.s.statusAt=100;oce.tick(100);
 oce.tick(2000);assert(oce.phase==Phase::AwaitingNext);assert(!oce.next(2000));
 Fake faultCheckpoint;Engine fce(faultCheckpoint);assert(fce.start(cp,100));faultCheckpoint.s.statusAt=100;fce.tick(100);
 faultCheckpoint.s.fault=true;fce.tick(200);assert(fce.phase==Phase::Error);
 Fake unexpectedOutput;Engine uoe(unexpectedOutput);assert(uoe.start(cp,100));unexpectedOutput.s.statusAt=100;uoe.tick(100);
 unexpectedOutput.s.valid=false;unexpectedOutput.s.heat=true;uoe.tick(200);assert(uoe.phase==Phase::Error);
 // Real command acknowledgements can consume the cached temperature's lifetime.
 struct SlowHeat : Fake {
   uint64_t clock=0;bool fresh=true;
   uint64_t monotonic()override{return clock;}
   bool target(double v)override{clock+=600;return Fake::target(v);}
   bool heat(bool v)override{clock+=1100;s.statusAt=clock;return Fake::heat(v);}
   bool refreshTemperature()override{if(!fresh)return false;s.sampleAt=clock;return true;}
 } slow;
 slow.s.current=20;slow.s.sampleAt=slow.s.statusAt=0;Engine slowEngine(slow);Plan lowHeat;lowHeat.stages={{"40 C",{{ActionType::Heat,40,90}}}};
 assert(slowEngine.start(lowHeat,0));slow.s.sampleAt=slow.s.statusAt=slow.clock;slowEngine.tick(slow.clock);assert(slowEngine.phase==Phase::Running);assert(slow.s.heat);
 slowEngine.stop(slow.clock);slow.fresh=false;slow.s.sampleAt=slow.s.statusAt=slow.clock;assert(slowEngine.start(lowHeat,slow.clock));slow.s.sampleAt=slow.s.statusAt=slow.clock;slowEngine.tick(slow.clock);assert(slowEngine.phase==Phase::Error);assert(!slow.s.heat&&!slow.s.fan);
 // Optional accessory: retry absent modules, initialise each attachment,
 // refresh unchanged LED colour and require release after (re)attachment.
 struct KeyIO {
   bool present=false,pressed=false,readOK=true,colorOK=true;uint64_t clock=0;
   int setups=0,colors=0;bool initialize(){++setups;return present;}
   bool read(bool& v){v=pressed;return present&&readOK;}
   bool color(int){++colors;return colorOK;}
   uint64_t now(){return clock;}
 } keyIO;
 KeyLink<KeyIO> link(keyIO);
 link.tick(0);assert(!link.alive&&!link.held&&keyIO.setups==1);
 keyIO.clock=100;link.tick(0);assert(keyIO.setups==1);
 keyIO.present=true;keyIO.pressed=true;keyIO.clock=500;link.tick(0);
 assert(link.alive&&!link.held&&keyIO.setups==2&&keyIO.colors==1);
 keyIO.pressed=false;keyIO.clock=520;link.tick(0);assert(!link.held);
 keyIO.pressed=true;keyIO.clock=540;link.tick(0);assert(link.held&&link.seen==540);
 keyIO.present=false;keyIO.clock=560;link.tick(0);assert(!link.alive&&!link.held);
 keyIO.present=true;keyIO.clock=1060;link.tick(0);assert(link.alive&&!link.held&&keyIO.colors==2);
 keyIO.pressed=false;keyIO.clock=1080;link.tick(0);
 keyIO.colorOK=false;keyIO.clock=1100;link.tick(1);assert(keyIO.colors==3);
 keyIO.colorOK=true;keyIO.clock=1120;link.tick(1);assert(keyIO.colors==4);
 keyIO.clock=1140;link.tick(1);assert(keyIO.colors==4);
 keyIO.readOK=false;keyIO.pressed=true;keyIO.clock=1160;link.tick(1);assert(!link.alive&&!link.held);
 // A balloon may only be filled after a fresh, explicit confirmation.
 Fake balloon;Engine be(balloon);Plan bp;bp.workflow=true;
 bp.stages={{"balloon",{{ActionType::Heat,180,360},{ActionType::Wait,0,5},{ActionType::Confirm,0,120},{ActionType::Air,0,1}}}};
 assert(be.start(bp,100));balloon.s.sampleAt=balloon.s.statusAt=100;be.tick(100);
 balloon.s.sampleAt=balloon.s.statusAt=120;be.tick(120);
 balloon.s.sampleAt=balloon.s.statusAt=5140;be.tick(5140);
 balloon.s.sampleAt=balloon.s.statusAt=5160;be.tick(5160);
 assert(be.awaitingBalloon()&&balloon.ons==0&&!balloon.s.fan&&balloon.s.heat);
 assert(be.confirmBalloon(5170));assert(!be.awaitingBalloon()&&balloon.ons==0);
 balloon.s.sampleAt=balloon.s.statusAt=5180;be.tick(5180);assert(balloon.ons==1);
 be.stop(5200);assert(!balloon.s.fan&&!balloon.s.heat);
 assert(be.start(bp,6000));balloon.s.sampleAt=balloon.s.statusAt=6000;be.tick(6000);balloon.s.sampleAt=balloon.s.statusAt=6020;be.tick(6020);
 balloon.s.sampleAt=balloon.s.statusAt=11040;be.tick(11040);balloon.s.sampleAt=balloon.s.statusAt=11060;be.tick(11060);
 balloon.s.sampleAt=balloon.s.statusAt=131061;be.tick(131061);
 assert(be.phase==Phase::Error&&balloon.ons==1&&!balloon.s.heat&&!balloon.s.fan);
 // Runtime settings alter execution plans, never the stored preset graph.
 Plan tuned; tuned.workflow=true;tuned.stages={{"01",{{ActionType::Heat,175,360},{ActionType::Wait,0,5},{ActionType::Confirm,0,120},{ActionType::Air,0,13.25},{ActionType::Air,0,39.75}}},{"02",{{ActionType::Heat,195,360},{ActionType::Air,0,20}}}};
 Plan stored=tuned;
 tunePlan(tuned,false,60,true);
 assert(tuned.stages[0].actions.size()==4);
 assert(tuned.stages[0].actions[2].type==ActionType::Air);
 assert(tuned.stages[0].actions[2].seconds==15&&tuned.stages[0].actions[3].seconds==45);
 assert(tuned.stages[1].actions.back().seconds==60);
 assert(stored.stages[0].actions[2].type==ActionType::Confirm);
 tunePlan(tuned,true,60,true);
 assert(std::count_if(tuned.stages[0].actions.begin(),tuned.stages[0].actions.end(),[](const Action& a){return a.type==ActionType::Confirm;})==1);
 assert(std::count_if(tuned.stages[1].actions.begin(),tuned.stages[1].actions.end(),[](const Action& a){return a.type==ActionType::Confirm;})==1);
 // The reported third-balloon overfill is about four seconds at a 56 s
 // shared setting. Preserve the first two balloons and the 20/30/50 split.
 Plan aroma;aroma.name="Aroma-Kurve 3";aroma.workflow=true;
 aroma.stages={{"AK3 Aroma",{{ActionType::Air,0,13.25},{ActionType::Air,0,26.5},{ActionType::Air,0,13.25}}},
               {"AK3 Balance",{{ActionType::Air,0,13.25},{ActionType::Air,0,26.5},{ActionType::Air,0,13.25}}},
               {"AK3 Finish",{{ActionType::Air,0,10.6},{ActionType::Air,0,15.9},{ActionType::Air,0,26.5}}}};
 tunePlan(aroma,false,56,true,true);
 for(size_t i=0;i<2;++i){double total=0;for(auto a:aroma.stages[i].actions)total+=a.seconds;assert(std::abs(total-56)<0.001);}
 assert(std::abs(aroma.stages[2].actions[0].seconds-10.4)<0.001);
 assert(std::abs(aroma.stages[2].actions[1].seconds-15.6)<0.001);
 assert(std::abs(aroma.stages[2].actions[2].seconds-26.0)<0.001);
 Plan single;single.stages={{"preset",{{ActionType::Heat,180,360},{ActionType::Air,0,7}}}};tunePlan(single,false,80,false);assert(single.stages[0].actions.back().seconds==7);tunePlan(single,true,80,false);assert(single.stages[0].actions[1].type==ActionType::Confirm);
 Fake upcoming;Engine ue(upcoming);Plan two;two.workflow=true;two.stages={{"done",{}},{"next",{{ActionType::Heat,200,360},{ActionType::Air,0,53}}}};
 assert(ue.start(two,100));upcoming.s.statusAt=100;ue.tick(100);assert(ue.phase==Phase::AwaitingNext);
 Stage replacement={"next",{{ActionType::Heat,200,360},{ActionType::Confirm,0,120},{ActionType::Air,0,68}}};
 assert(ue.replaceUpcomingStage(replacement));assert(ue.currentPlan().stages[1].actions.back().seconds==68);
 assert(ue.currentPlan().stages[0].actions.empty());assert(ue.next(100));
 std::cout<<"Engine / cooldown / optional key tests passed\n";
}
