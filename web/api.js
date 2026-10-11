export function download(name,text,type='application/json') {const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export function createTransport(){
  let holdSequence=Date.now()*1000,holdGesture=0,wasHolding=false;let token=sessionStorage.getItem('volcano-token')||'';
  async function request(path,body){const r=await fetch(`/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok){if(r.status===401)sessionStorage.removeItem('volcano-token');throw Error(d.error||`HTTP ${r.status}`);}return d;}
  const status=()=>request('status');
  return {status,getLibrary:()=>request('library'),hold:on=>{if(on&&!wasHolding)holdGesture=++holdSequence;wasHolding=on;return request('hold',{on,sequence:++holdSequence,gesture:holdGesture||++holdSequence});},isLoggedIn:()=>!!token,
    login:async pin=>{const d=await request('login',{pin});token=d.token;sessionStorage.setItem('volcano-token',token);},
    command:async q=>{const {id}=await request('command',q);const end=Date.now()+90000;while(Date.now()<end){await new Promise(r=>setTimeout(r,250));const s=await status();const result=(s.results||[]).find(x=>x.id===id);if(result){if(!result.ok)throw Error(result.message);return result;}}throw Error('Antwort fehlt. Status am Dial pruefen, EIN-Befehl nicht automatisch wiederholen.');}
  };
}
