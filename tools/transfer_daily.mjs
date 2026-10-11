import fs from 'node:fs/promises';import {mergeDaily,DAILY_ID} from './daily_library.mjs';
const [base,bundlePath,backupPath]=process.argv.slice(2);
if(!base||!bundlePath||!backupPath||!process.env.VD_PIN)throw Error('Aufruf: VD_PIN setzen; node transfer_daily.mjs http://Dial-IP Daily.json Sicherung.json');
const bundle=JSON.parse((await fs.readFile(bundlePath,'utf8')).replace(/^\uFEFF/,''));
const auth=await fetch(base+'/api/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.VD_PIN})});if(!auth.ok)throw Error('Anmeldung fehlgeschlagen');
const {token}=await auth.json(),headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
async function get(path){const response=await fetch(base+'/api/v1/'+path,{headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Lesen fehlgeschlagen');return response.json();}
const before=await get('library');await fs.writeFile(backupPath,JSON.stringify(before,null,2),{flag:'wx'});
const library=mergeDaily(before.library,bundle),reply=await fetch(base+'/api/v1/command',{method:'POST',headers,body:JSON.stringify({command:'library',revision:before.revision,library})});if(!reply.ok)throw Error('Übertragung abgelehnt');const {id}=await reply.json();
let completed=false;for(let i=0;i<100;++i){await new Promise(r=>setTimeout(r,300));const s=await get('status');const result=s.results?.find(x=>x.id===id);if(result){if(!result.ok)throw Error(result.message);completed=true;break;}}
if(!completed)throw Error('Keine Bestätigung; vor erneutem Übertragen Bibliothek prüfen');
const after=await get('library');if(JSON.stringify(after.library)!==JSON.stringify(library))throw Error('Zurückgelesene Bibliothek weicht ab');
console.log(JSON.stringify({daily:after.library.workflows.find(x=>x.id===DAILY_ID)?.name,presets:after.library.presets.length,workflows:after.library.workflows.length,thirdTemperature:after.library.presets.find(x=>x.id==='fec0626b-e05e-480b-b5ee-e9f913dc718f').startTemp,backup:backupPath}));
