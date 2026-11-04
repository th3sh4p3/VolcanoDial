import test from 'node:test';
import assert from 'node:assert/strict';
import {powerStatusText} from '../web/power-status.js';

test('No gauge never invents percentage, battery presence or charging status',()=>{
 const text=powerStatusText({powerState:'awake',idleRemainingSeconds:-1,battery:{enabled:false,valid:false}});
 assert.match(text,/Akku unbekannt/);assert.match(text,/Ladestatus unbekannt/);assert.match(text,/Auto AUS deaktiviert/);assert.doesNotMatch(text,/\d+\s*%|wird geladen/);
});
test('A valid gauge is an estimate even at 100 percent; it cannot confirm charger completion',()=>{
 const text=powerStatusText({idleRemainingSeconds:59,battery:{enabled:true,valid:true,percent:100,voltageMv:4200,chargeTrend:'risingEstimate'}});
 assert.match(text,/100 % geschätzt/);assert.match(text,/4.20 V/);assert.match(text,/0:59/);assert.match(text,/Ladestatus unbekannt/);assert.doesNotMatch(text,/voll geladen|USB erkannt/);
});
test('Stale data stays unknown and shutdown failure shows its reason',()=>{
 const text=powerStatusText({powerState:'blocked',shutdownBlockedReason:'Hue nicht erreichbar',idleRemainingSeconds:0,battery:{valid:false,percent:75}});
 assert.match(text,/Hue nicht erreichbar/);assert.match(text,/Akku unbekannt/);assert.doesNotMatch(text,/75/);
});
test('Standby never claims proven USB power or physical cutoff',()=>{
 const text=powerStatusText({powerState:'standby',battery:{valid:false}});
 assert.match(text,/Standby/);assert.match(text,/WAKE/);assert.doesNotMatch(text,/USB erkannt|stromlos/);
});
