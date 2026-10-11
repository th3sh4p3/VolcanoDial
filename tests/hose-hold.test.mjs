import test from 'node:test';import assert from 'node:assert/strict';
import {createHold} from '../web/hose-hold.js';
test('Hold sends heartbeats and always releases on cancel, including an in-flight request',async()=>{
 let interval,clear=0,calls=[];const hold=createHold(async on=>calls.push(on),{setInterval:fn=>(interval=fn,1),clearInterval:()=>clear++});
 hold.start();await new Promise(r=>setTimeout(r,0));interval();await new Promise(r=>setTimeout(r,0));await hold.stop();assert.deepEqual(calls,[true,true,false]);assert.equal(clear,1);interval();await Promise.resolve();assert.deepEqual(calls,[true,true,false]);
});
test('Failed hold stops heartbeat and never retries ON automatically',async()=>{
 let interval,calls=[];const hold=createHold(async on=>{calls.push(on);if(on)throw Error('lost');},{setInterval:fn=>(interval=fn,1),clearInterval:()=>{}});hold.start();await new Promise(r=>setTimeout(r,0));interval();await new Promise(r=>setTimeout(r,0));assert.equal(calls.filter(Boolean).length,1);
});
