import test from 'node:test';import assert from 'node:assert/strict';
import {ProgramManager} from '../web/workflow/program-manager.js';
import {createLibraryBridge} from '../web/library-bridge.js';
import {runnableItems} from '../web/runnable-items.js';
test('Compact status catalog keeps explicit order, updated names and optional hose',()=>{
 const lib={presets:[{id:'p',name:'210 °C'},{id:'q',name:'Zweiter'}],workflows:[{id:'w',name:'Daily'}],runnableOrder:[{kind:'workflow',id:'w'},{kind:'preset',id:'p'},{kind:'preset',id:'missing'},{kind:'preset',id:'q'}]};
 assert.deepEqual(runnableItems(lib).map(x=>x.name),['Daily','210 °C','Zweiter','Schlauch']);
 lib.presets[0].name='Neuer Name';assert.equal(runnableItems(lib)[1].name,'Neuer Name');assert.deepEqual(runnableItems({}).map(x=>x.ref),[{kind:'hose',id:'dial-hose'}]);
});
test('Hose appears directly after Aroma-Kurve 3, before its individual presets',()=>{
 const aromaId='a847fe34-93c1-472a-9750-d4b473c5f78d';
 const lib={presets:[{id:'ak3-a',name:'AK3 Aroma'},{id:'ak3-b',name:'AK3 Balance'}],workflows:[{id:'daily',name:'Daily'},{id:aromaId,name:'Aroma-Kurve 3'}],runnableOrder:[{kind:'workflow',id:'daily'},{kind:'workflow',id:aromaId},{kind:'preset',id:'ak3-a'},{kind:'preset',id:'ak3-b'}]};
 assert.deepEqual(runnableItems(lib).map(x=>x.name),['Daily','Aroma-Kurve 3','Schlauch','AK3 Aroma','AK3 Balance']);
});
test('Graph editor saves through revision-checked device storage',async()=>{let saved;const transport={getLibrary:async()=>({revision:'r1',library:new ProgramManager().toSettings()}),status:async()=>({busy:false}),command:async q=>{saved=q;}};const api=createLibraryBridge(transport);const initial=await api.get();assert.equal(initial.locked,false);const e=await api.create('simple');assert.equal(saved.command,'library');assert.equal(saved.revision,'r1');assert.ok(saved.library.presets.some(p=>p.id===e.id));});
test('Editor cannot alter running workflow, including checkpoints',async()=>{const transport={getLibrary:async()=>({revision:'r1',library:new ProgramManager().toSettings()}),status:async()=>({busy:true}),command:async()=>{throw Error('should not send');}};const api=createLibraryBridge(transport);await assert.rejects(()=>api.create('simple'),/gesperrt/);});
test('Import/export round trip retains workflows and excludes device credentials',()=>{const m=new ProgramManager();const w=m.createWorkflow('Kette');const b=m.exportBundle();const n=new ProgramManager();n.importBundle(b,'replace');assert.equal(n.workflows[0].id,w.id);assert.equal(JSON.parse(b).settingsVersion,2);assert.equal(JSON.parse(b).bridgeKey,undefined);});
