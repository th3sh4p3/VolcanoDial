import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {compilePreset,compileWorkflow} from '../web/workflow/compiler.js';
test('Context button and manual hose retain fresh input and confirmed output rules',()=>{assert.match(execFileSync(process.env.VD_INTERACTION_TEST,[],{encoding:'utf8'}),/tests passed/);});
const here=path.dirname(fileURLToPath(import.meta.url));const exe=process.env.VD_CORE_TEST||path.resolve(here,'../../../work/core_test.exe');
function close(a,b){if(typeof b==='number'){assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);return;}if(Array.isArray(b)){assert.equal(a.length,b.length);a.forEach((x,i)=>close(x,b[i]));return;}if(b&&typeof b==='object'){for(const k of Object.keys(b))close(a[k],b[k]);return;}assert.equal(a,b);}
for(const f of fs.readdirSync(path.join(here,'fixtures')).filter(f=>f.endsWith('.json'))){test(`PC/C++ parity: ${f}`,()=>{const file=path.join(here,'fixtures',f),d=JSON.parse(fs.readFileSync(file));const out=JSON.parse(execFileSync(exe,[file],{encoding:'utf8'}));assert.equal(out.ok,!d.invalid,out.error);if(!d.invalid)close(out.stages,d.expected);});}
test('C++ execution and cooldown behavior',()=>{assert.match(execFileSync(exe,[],{encoding:'utf8'}),/tests passed/);});
test('Browser compiler retains original workflow semantics',()=>{for(const f of fs.readdirSync(path.join(here,'fixtures'))){const d=JSON.parse(fs.readFileSync(path.join(here,'fixtures',f)));const run=()=>d.ref.kind==='workflow'?compileWorkflow(d.library.workflows[0],d.library.presets,d.library.globalVariables):compilePreset(d.library.presets[0],d.library.globalVariables);if(d.invalid)assert.throws(run);else{const p=run();close((p.stages||[p]).map(s=>({name:s.presetName,actions:s.actions})),d.expected);}}});

test('HTTP response decoding: chunked, extensions, limits and truncation',()=>{const httpExe=process.env.VD_HTTP_TEST||path.resolve(here,'../../../work/http_body_test.exe');assert.match(execFileSync(httpExe,[],{encoding:'utf8'}),/tests passed/);});
test('Library import preserves existing data on allocation or save failure',()=>{const documentExe=process.env.VD_DOCUMENT_TEST||path.resolve(here,'../../../work/document_test.exe');assert.match(execFileSync(documentExe,[],{encoding:'utf8'}),/tests passed/);});

test('Round UI circle targets and unchanged-frame suppression',()=>{assert.match(execFileSync(process.env.VD_UI_TEST,[],{encoding:'utf8'}),/tests passed/);});
