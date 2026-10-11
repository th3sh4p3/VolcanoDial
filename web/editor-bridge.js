import {createTransport,download} from './api.js';
import {createLibraryBridge} from './library-bridge.js';
import {normalizeSettings} from './workflow/program-manager.js';
const transport=createTransport();
if(!transport.isLoggedIn())location.replace('/?next=editor');
else{
  const api=createLibraryBridge(transport);
  api.export=async()=>{try{const {library}=await api.get();download('volcano-bibliothek.json',JSON.stringify(library,null,2));}catch(e){alert(e.message);}};
  api.pickImport=()=>new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('cancel',()=>resolve({canceled:true}));input.onchange=async()=>{try{if(!input.files[0])return resolve({canceled:true});if(input.files[0].size>32768)throw Error('Datei groesser als 32 KiB. Bibliothek vorher aufteilen.');const bundle=await input.files[0].text(),lib=normalizeSettings(JSON.parse(bundle));resolve({canceled:false,bundle,summary:{presets:lib.presets.length,workflows:lib.workflows.length,variables:lib.globalVariables.length}});}catch(e){alert(e.message);resolve({canceled:true});}};input.click();});
  const rawImport=api.import;api.import=async(bundle,mode)=>{if(mode==='replace'){const old=await api.get();download(`volcano-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(old.library,null,2));}return rawImport(bundle,mode);};
  window.volcanoLibrary=api;await import('./editor.js');
  let last=false;setInterval(async()=>{try{const s=await transport.status();if(s.busy!==last){last=s.busy;api.notifyLock(last);}}catch(e){document.getElementById('status').textContent=e.message;}},1000);
}
