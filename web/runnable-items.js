export function runnableItems(library){
 const presets=new Map((library.presets||[]).map(p=>[p.id,p]));
 const workflows=new Map((library.workflows||[]).map(w=>[w.id,w]));
 const items=[];
 for(const ref of library.runnableOrder||[]){
  const item=(ref.kind==='workflow'?workflows:ref.kind==='preset'?presets:new Map()).get(ref.id);
  if(item)items.push({ref:{kind:ref.kind,id:ref.id},name:item.name});
 }
 items.push({ref:{kind:'hose',id:'dial-hose'},name:'Schlauch'});return items;
}
