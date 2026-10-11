import {ProgramManager} from './workflow/program-manager.js';
export function createLibraryBridge(transport){
  let manager=null,revision='',changed=()=>{},lockChanged=()=>{};
  async function get(){const [data,state]=await Promise.all([transport.getLibrary(),transport.status()]);manager=new ProgramManager();manager.loadFromSettings(data.library);revision=data.revision;return {library:manager.toSettings(),locked:state.busy};}
  async function mutate(fn){if(!manager)await get();if((await transport.status()).busy)throw Error('Bibliothek waehrend Ablauf/Zwischenpause gesperrt');const candidate=new ProgramManager();candidate.loadFromSettings(manager.toSettings());const result=fn(candidate);const library=candidate.toSettings();if(new TextEncoder().encode(JSON.stringify(library)).length>32768)throw Error('Bibliothek ist groesser als 32 KiB. Bitte aufteilen.');await transport.command({command:'library',revision,library});const fresh=await get();changed(fresh.library);return result;}
  return {get,
    create:kind=>mutate(m=>kind==='workflow'?m.createWorkflow():kind==='variable'?m.createVariable():m.createPreset(kind)),
    save:(kind,draft)=>mutate(m=>m.saveEntity(kind,draft)),duplicate:(kind,id)=>mutate(m=>m.duplicate(kind,id)),convert:id=>mutate(m=>m.convertSimple(id)),delete:(kind,id)=>mutate(m=>m.delete(kind,id)),reorder:order=>mutate(m=>m.reorder(order)),import:(bundle,mode)=>mutate(m=>m.importBundle(bundle,mode)),
    validate:async(kind,draft)=>{if(!manager)await get();const m=new ProgramManager();m.loadFromSettings(manager.toSettings());try{m.saveEntity(kind,draft);return {errors:[]};}catch(e){return {errors:[e.message]};}},
    onChanged:f=>{changed=f;},onLock:f=>{lockChanged=f;},notifyLock:value=>lockChanged(value),
    appearance:{get:async()=>({theme:'default'}),onChanged:()=>{}},
  };
}
