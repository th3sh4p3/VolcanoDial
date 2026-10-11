export function randomUUID() {
  const b=new Uint8Array(16);globalThis.crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
// crypto.randomUUID is unavailable on plain HTTP LAN pages; getRandomValues is available.
if(!globalThis.crypto.randomUUID)globalThis.crypto.randomUUID=randomUUID;
export class EventEmitter {
  #events=new Map();
  on(n,f){const a=this.#events.get(n)||[];a.push(f);this.#events.set(n,a);return this;}
  emit(n,...a){for(const f of this.#events.get(n)||[])f(...a);return true;}
}
