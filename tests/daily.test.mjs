import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {mergeDaily,DAILY_ID} from '../tools/daily_library.mjs';import {compileWorkflow} from '../web/workflow/compiler.js';
const bundle=JSON.parse(fs.readFileSync(new URL('./data/daily.json',import.meta.url),'utf8'));
test('Daily merge keeps existing programs, is idempotent and fixes stage 03 to constant 222',()=>{
 const old={settingsVersion:2,presets:[{id:'keep',name:'Existing'}],workflows:[],runnableOrder:[],globalVariables:[]};const copy=structuredClone(old),one=mergeDaily(old,bundle),two=mergeDaily(one,bundle);assert.deepEqual(old,copy);assert.deepEqual(one,two);assert.equal(one.presets[0].id,'keep');assert.equal(one.presets.length,4);
 const plan=compileWorkflow(one.workflows.find(x=>x.id===DAILY_ID),one.presets,one.globalVariables);assert.equal(plan.stages.length,3);for(const stage of plan.stages)assert.ok(Math.abs(stage.actions.filter(a=>a.type==='air').reduce((n,a)=>n+a.durationSeconds,0)-53)<1e-8);
 one.workflows.find(x=>x.id===DAILY_ID).fillTime=68;
 const longer=compileWorkflow(one.workflows.find(x=>x.id===DAILY_ID),one.presets,one.globalVariables);
 for(const stage of longer.stages)assert.ok(Math.abs(stage.actions.filter(a=>a.type==='air').reduce((n,a)=>n+a.durationSeconds,0)-68)<1e-8);
 const heats=plan.stages[2].actions.filter(a=>a.type==='reachTemperature');assert.ok(heats.length);assert.ok(heats.every(a=>a.temperature===222));
});
