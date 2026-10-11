// The device expires every hold after 450 ms without a new heartbeat.
export function createHold(send,timers=globalThis,onError=()=>{}){
 let held=false,timer=null,pending=null,generation=0;
 const stop=async()=>{held=false;generation++;if(timer!==null){timers.clearInterval(timer);timer=null;}try{await send(false);}catch(e){onError(e);}};
 const pulse=()=>{if(!held||pending)return;const g=generation;pending=Promise.resolve().then(()=>{if(held&&g===generation)return send(true);}).catch(e=>{onError(e);stop();}).finally(()=>{pending=null;});};
 return {start(){if(held)return;held=true;generation++;pulse();timer=timers.setInterval(pulse,150);},stop};
}
export function bindHold(button,hold,window,document){
 button.addEventListener('pointerdown',e=>{if(button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);hold.start();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>hold.stop());
 button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();hold.start();}});
 button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')hold.stop();});
 button.addEventListener('blur',()=>hold.stop());window.addEventListener('blur',()=>hold.stop());window.addEventListener('pagehide',()=>hold.stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)hold.stop();});
}
