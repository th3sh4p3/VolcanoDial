// Library-only merge. Device credentials never enter this module.
export const DAILY_ID='d481293f-38db-4ebf-82de-126375debbde';
export function mergeDaily(existing,bundle){
 const daily=bundle.workflows?.find(x=>x.id===DAILY_ID);if(!daily)throw Error('Daily fehlt');
 const library=structuredClone(existing),presets=structuredClone(bundle.presets);
 const third=presets.find(x=>x.id==='fec0626b-e05e-480b-b5ee-e9f913dc718f');if(!third)throw Error('Daily Preset 03 fehlt');third.startTemp=third.endTemp=222;
 for(const [key,rows] of [['presets',presets],['workflows',[daily]]]){library[key]??=[];for(const row of rows){const at=library[key].findIndex(x=>x.id===row.id);if(at<0)library[key].push(structuredClone(row));else library[key][at]=structuredClone(row);}}
 library.runnableOrder??=[];for(const ref of [...presets.map(x=>({kind:'preset',id:x.id})),{kind:'workflow',id:DAILY_ID}])if(!library.runnableOrder.some(x=>x.kind===ref.kind&&x.id===ref.id))library.runnableOrder.push(ref);
 library.activeRunnable={kind:'workflow',id:DAILY_ID};return library;
}
