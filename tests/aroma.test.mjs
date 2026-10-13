import test from 'node:test';import assert from 'node:assert/strict';
import {mergeAroma,AROMA_ID,AROMA_BUNDLE} from '../tools/aroma_library.mjs';
import {compileWorkflow,compilePreset} from '../web/workflow/compiler.js';

test('Aroma-Kurve 3 adds three independent balloons directly after Daily without changing existing programs',()=>{
 const daily={kind:'workflow',id:'d481293f-38db-4ebf-82de-126375debbde'};
 const old={settingsVersion:2,presets:[{id:'keep',name:'Keep'}],workflows:[{id:daily.id,name:'Daily'}],globalVariables:[],runnableOrder:[{kind:'preset',id:'keep'},daily],activeRunnable:daily};
 const one=mergeAroma(old);assert.deepEqual(old.presets,[{id:'keep',name:'Keep'}]);assert.deepEqual(one.activeRunnable,daily);assert.deepEqual(one.runnableOrder.slice(1,3),[daily,{kind:'workflow',id:AROMA_ID}]);assert.deepEqual(mergeAroma(one),one);
 const plan=compileWorkflow(one.workflows.find(x=>x.id===AROMA_ID),one.presets,[]);
 assert.equal(plan.stages.length,3);
 for(let i=0;i<3;i++){const actions=plan.stages[i].actions;assert.deepEqual(actions.filter(x=>x.type==='reachTemperature').map(x=>x.temperature),AROMA_BUNDLE.presets[i].graph.nodes.filter(x=>x.type==='reachTemperature').map(x=>x.config.temperature.value));assert.equal(actions.filter(x=>x.type==='confirmBalloon').length,1);assert.equal(actions.findIndex(x=>x.type==='confirmBalloon')+1,actions.findIndex(x=>x.type==='air'));assert.ok(Math.abs(actions.filter(x=>x.type==='air').reduce((n,a)=>n+a.durationSeconds,0)-53)<1e-8);}
 const longer=structuredClone(one.workflows.find(x=>x.id===AROMA_ID));longer.fillTime=68;for(const stage of compileWorkflow(longer,one.presets,[]).stages)assert.ok(Math.abs(stage.actions.filter(x=>x.type==='air').reduce((n,a)=>n+a.durationSeconds,0)-68)<1e-8);
 for(const preset of AROMA_BUNDLE.presets)assert.equal(compilePreset(preset).actions.filter(x=>x.type==='confirmBalloon').length,1);
});
