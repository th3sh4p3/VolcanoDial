import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vd-battery-power-')),cpp=path.join(dir,'power.cpp'),exe=path.join(dir,'power.exe');
const firmware=fileURLToPath(new URL('../firmware/VolcanoDial/',import.meta.url)).replaceAll('\\','/');
fs.writeFileSync(cpp,`#include <cassert>
#include <string>
#include <functional>
#include "${firmware}/power_runtime.hpp"
#include "${firmware}/board_power.hpp"
#include "${firmware}/battery_monitor.hpp"
struct PowerIO{bool high=false,rtc=true;int writes=0;std::function<void()> onClear=[](){};void latch(bool v){high=v;++writes;}bool clearRtc(){onClear();return rtc;}};
struct GaugeIO{bool ok=true;int selects=0;uint16_t voltage=51200,soc=19200,rate=10;bool select(){++selects;return ok;}bool read(uint8_t reg,uint16_t& value){if(!ok)return false;value=reg==8?0x12:reg==2?voltage:reg==4?soc:rate;return true;}};
int main(int argc,char**argv){int mode=std::stoi(argv[1]);
 if(mode==0){vd::BootInputGate b;assert(!b.update(true,0));assert(!b.update(true,5000));assert(!b.update(false,5001));assert(!b.update(false,5100));assert(b.update(false,5101));assert(b.update(true,5200));b.reset();assert(!b.update(true,6000));}
 if(mode==1){vd::PowerIdleClock c;c.observe(0,false);assert(c.elapsed(1800000)==1800000);c.observe(1800000,true);c.observe(2000000,true);c.observe(2100000,false);assert(c.elapsed(2100000)==0);assert(c.elapsed(2160000)==60000);c.activity(2160000);assert(c.elapsed(2160001)==1);}
 if(mode==2){vd::ShutdownRetries r;assert(r.due(1000));assert(!r.due(30999));assert(r.due(31000));assert(!r.due(120999));assert(r.due(121000));assert(!r.due(9999999));r.reset();assert(r.due(9999999));}
 if(mode==3){assert(vd::offEvidenceValid(false,false,2000,0,0,1,2,3));assert(vd::offEvidenceValid(true,true,2499,1000,1,1,2,2));assert(!vd::offEvidenceValid(true,true,2501,1000,1,1,2,2));assert(!vd::offEvidenceValid(true,false,1001,1000,1,1,2,2));assert(!vd::offEvidenceValid(true,true,1001,1000,2,1,2,2));assert(!vd::offEvidenceValid(true,true,1001,1000,1,1,3,2));assert(!vd::offEvidenceValid(true,true,999,1000,1,1,2,2));}
 if(mode==4){PowerIO io;vd::BoardPower<PowerIO> p(io);p.begin();assert(io.high);assert(p.release());assert(!io.high&&p.standby());assert(!io.high);p.wake();assert(io.high&&!p.standby());io.rtc=false;assert(!p.release());assert(io.high&&!p.standby());}
 if(mode==5){GaugeIO io;vd::BatteryMonitor<GaugeIO> m(io);m.sample(0,false,false);assert(io.selects==0&&!m.valid(0,false));m.sample(1,true,false);assert(m.valid(1,false));assert(m.voltageMv()==4000&&m.percent()==75);assert(!m.presenceKnown()&&!m.chargingKnown());assert(!m.valid(15002,false));io.ok=false;m.sample(5001,true,false);assert(!m.valid(5001,false));}
 if(mode==6){GaugeIO io;vd::BatteryMonitor<GaugeIO> m(io);m.sample(1,true,true);m.sample(10000,true,true);assert(io.selects==1);assert(m.valid(89999,true));assert(!m.valid(90002,true));io.soc=25601;m.sample(90003,true,true);assert(!m.valid(90003,true));}
 if(mode==7){GaugeIO io;vd::BatteryMonitor<GaugeIO> m(io);io.soc=2560;m.sample(1,true,false);assert(m.critical());io.soc=3072;m.sample(5001,true,false);assert(m.critical());io.soc=3328;m.sample(10001,true,false);assert(!m.critical());m.sample(10002,false,false);assert(!m.critical()&&!m.valid(10002,false));}
 if(mode==8){PowerIO io;vd::BoardPower<PowerIO> p(io);p.begin();bool allowed=true;io.onClear=[&](){allowed=false;};assert(!p.release([&](){return allowed;}));assert(io.high&&!p.standby());}
 if(mode==9){GaugeIO io;vd::BatteryMonitor<GaugeIO> m(io);io.soc=2560;m.sample(1,true,false);assert(m.critical());io.ok=false;m.sample(5001,true,false);assert(!m.valid(5001,false));assert(m.critical());assert(m.critical()&&!m.valid(90000,false));io.ok=true;io.soc=3328;m.sample(90001,true,false);assert(!m.critical());}
}
`);
const built=spawnSync(process.env.VD_ZIG,['c++','-std=c++17','-target','x86_64-windows-gnu',cpp,'-o',exe],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
for(const[mode,name]of [[0,'Boot and standby wake gestures stay disarmed until a stable release'],[1,'Protected work finishing starts a fresh inactivity interval'],[2,'Shutdown retries stop after the three bounded attempts'],[3,'Managed output OFF requires fresh matching ownership evidence'],[4,'Latch stays LOW while externally powered; failed RTC cleanup retains power'],[5,'Disabled and failed gauges stay unknown; voltage never proves presence or charging'],[6,'Idle sampling is bounded and stale or out-of-range SOC stays unknown'],[7,'Critical SOC uses hysteresis and disabling the monitor clears it']])test(name,()=>{const r=spawnSync(exe,[String(mode)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
test('Activity arriving during RTC cleanup cancels latch release',()=>{const r=spawnSync(exe,['8'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
test('A confirmed critical battery stays inhibited when later telemetry fails or goes stale',()=>{const r=spawnSync(exe,['9'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);});
