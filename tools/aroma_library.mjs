// Additive, deterministic program bundle; no device credentials or user library data.
export const AROMA_ID='a847fe34-93c1-472a-9750-d4b473c5f78d';
export const AROMA_PRESETS=[
 ['4b555acd-7c41-4cac-a287-f151ed561c84','AK3 Aroma',[175,180,185],[13.25,26.5,13.25]],
 ['3d9052c2-6f49-46b0-8f0b-d9c480e40f7d','AK3 Balance',[195,200,205],[13.25,26.5,13.25]],
 ['7dbb94d1-f467-418e-bb30-ed94bd8c590b','AK3 Finish',[220,225,230],[10.6,15.9,26.5]],
];
const literal=value=>({mode:'literal',value});
const graph=nodes=>({nodes:nodes.map((node,i)=>({id:`n${i}`,type:node.type,...(node.config?{config:node.config}:{})})),edges:nodes.slice(1).map((_,i)=>({id:`e${i}`,source:`n${i}`,target:`n${i+1}`}))});
function makePreset([id,name,temps,times]){
 const nodes=[{type:'start'}];
 for(let i=0;i<3;i++){
  nodes.push({type:'reachTemperature',config:{temperature:literal(temps[i]),timeout:literal(360)}});
  if(i===0){nodes.push({type:'wait',config:{duration:literal(5)}});nodes.push({type:'confirmBalloon',config:{timeout:literal(120)}});}
  nodes.push({type:'air',config:{duration:literal(times[i])}});
 }
 nodes.push({type:'end'});
 return {id,name,kind:'advanced',variables:[],graph:graph(nodes)};
}
export const AROMA_BUNDLE={
 presets:AROMA_PRESETS.map(makePreset),
 workflow:{id:AROMA_ID,name:'Aroma-Kurve 3',fillTimeSource:'ui',fillTime:53,graph:graph([
  {type:'start'},...AROMA_PRESETS.map(([id])=>({type:'preset',config:{presetId:id}})),{type:'end'}
 ])}
};
export function mergeAroma(existing){
 const library=structuredClone(existing),ids=new Set([...library.presets,...library.workflows].map(x=>x.id));
 for(const preset of AROMA_BUNDLE.presets){if(ids.has(preset.id)){if(!library.presets.some(x=>x.id===preset.id&&JSON.stringify(x)===JSON.stringify(preset)))throw Error(`ID-Konflikt: ${preset.id}`);}else{library.presets.push(structuredClone(preset));ids.add(preset.id);}}
 const wf=AROMA_BUNDLE.workflow;if(ids.has(wf.id)){if(!library.workflows.some(x=>x.id===wf.id&&JSON.stringify(x)===JSON.stringify(wf)))throw Error(`ID-Konflikt: ${wf.id}`);}else{library.workflows.push(structuredClone(wf));ids.add(wf.id);}
 library.runnableOrder??=[];
 const ref={kind:'workflow',id:wf.id};
 if(!library.runnableOrder.some(x=>x.kind===ref.kind&&x.id===ref.id)){
  const daily=library.runnableOrder.findIndex(x=>x.kind==='workflow'&&x.id==='d481293f-38db-4ebf-82de-126375debbde');
  library.runnableOrder.splice(daily>=0?daily+1:library.runnableOrder.length,0,ref);
 }
 for(const preset of AROMA_BUNDLE.presets){const ref={kind:'preset',id:preset.id};if(!library.runnableOrder.some(x=>x.kind===ref.kind&&x.id===ref.id))library.runnableOrder.push(ref);}
 return library;
}
