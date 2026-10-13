import fs from 'node:fs/promises';
import {mergeAroma,AROMA_ID} from './aroma_library.mjs';

const [base,backupPath]=process.argv.slice(2);
if(!base||!backupPath||!process.env.VD_PIN)throw Error('Aufruf: VD_PIN setzen; node tools/transfer_aroma.mjs http://Dial-IP Sicherung.json');
const login=await fetch(base+'/api/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:process.env.VD_PIN}),signal:AbortSignal.timeout(15000)});
if(!login.ok)throw Error('Anmeldung fehlgeschlagen');
const {token}=await login.json(),headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
async function get(path){const response=await fetch(base+'/api/v1/'+path,{headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`Lesen fehlgeschlagen: ${path}`);return response.json();}
const status=await get('status');if(status.busy||status.heat||status.fan||status.operation)throw Error('Dial ist aktiv; später erneut versuchen');
const before=await get('library');await fs.writeFile(backupPath,JSON.stringify(before,null,2),{flag:'wx'});
const library=mergeAroma(before.library);
if(JSON.stringify(library)===JSON.stringify(before.library)){console.log('Aroma-Kurve 3 ist bereits vorhanden.');process.exit(0);}
const reply=await fetch(base+'/api/v1/command',{method:'POST',headers,body:JSON.stringify({command:'library',revision:before.revision,library}),signal:AbortSignal.timeout(15000)});
if(!reply.ok)throw Error('Übertragung abgelehnt');const {id}=await reply.json();
let completed=false;for(let i=0;i<200;++i){await new Promise(r=>setTimeout(r,300));const s=await get('status');const result=s.results?.find(x=>x.id===id);if(result){if(!result.ok)throw Error(result.message);completed=true;break;}}
if(!completed)throw Error('Keine Bestätigung; vor erneutem Übertragen Bibliothek prüfen');
const after=await get('library');if(JSON.stringify(after.library)!==JSON.stringify(library))throw Error('Zurückgelesene Bibliothek weicht ab');
const daily=after.library.runnableOrder.findIndex(x=>x.kind==='workflow'&&x.id==='d481293f-38db-4ebf-82de-126375debbde');
if(daily>=0&&after.library.runnableOrder[daily+1]?.id!==AROMA_ID)throw Error('Aroma-Kurve 3 liegt nicht hinter Daily');
console.log(JSON.stringify({workflow:'Aroma-Kurve 3',presets:after.library.presets.length,workflows:after.library.workflows.length,backup:backupPath}));
