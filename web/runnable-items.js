export function runnableItems(library){
 const presets=new Map((library.presets||[]).map(p=>[p.id,p]));
 const workflows=new Map((library.workflows||[]).map(w=>[w.id,w]));
 const items=[];
 const hose={ref:{kind:'hose',id:'dial-hose'},name:'Schlauch'};
 let hoseInserted=false;
 for(const ref of library.runnableOrder||[]){
  const item=(ref.kind==='workflow'?workflows:ref.kind==='preset'?presets:new Map()).get(ref.id);
  if(item)items.push({ref:{kind:ref.kind,id:ref.id},name:item.name});
  if(ref.kind==='workflow'&&ref.id==='a847fe34-93c1-472a-9750-d4b473c5f78d'){
   items.push(hose);hoseInserted=true;
  }
 }
 if(!hoseInserted)items.push(hose);
 return items;
}
