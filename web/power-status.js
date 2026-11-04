export function powerStatusText(state={}) {
 const b=state.battery||{};
 const battery=b.valid&&Number.isFinite(b.percent)&&Number.isFinite(b.voltageMv)
  ?`Akku ${b.percent} % geschätzt · ${(b.voltageMv/1000).toFixed(2)} V`
  :'Akku unbekannt';
 let power='Auto AUS deaktiviert';
 if(state.powerState==='standby')power='Standby bei externer Versorgung · WAKE zum Einschalten';
 else if(state.powerState==='confirming')power='Ausschalten wird sicher geprüft';
 else if(state.powerState==='blocked')power=`AUS gesperrt: ${state.shutdownBlockedReason||'Sicherheitsprüfung'}`;
 else if(state.busy||state.cooling||state.coolingPending||state.heat||state.fan)power='Auto AUS pausiert während Betrieb / Abkühlung';
 else if(Number.isFinite(state.idleRemainingSeconds)&&state.idleRemainingSeconds>=0){
  const t=Math.ceil(state.idleRemainingSeconds);power=`Auto AUS in ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
 }
 const previous=state.lastShutdownError&&state.powerState==='awake'?` · Letztes AUS: ${state.lastShutdownError}`:'';
 return `${battery} · Ladestatus unbekannt · ${power}${previous}`;
}
