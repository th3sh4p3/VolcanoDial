import {createTransport,download} from './api.js';

import {createHold,bindHold} from './hose-hold.js';
import {runnableItems} from './runnable-items.js';

const api=createTransport(),$=id=>document.getElementById(id);let state=null,boot=true,polling=false,catalogVersion=null,catalog=[];

function message(text,error=false){$('message').textContent=text;$('message').className='message visible'+(error?' error':'');}

async function act(q){try{message('Wird ausgeführt …');const r=await api.command(q);message(r.message==='OK'?'Gespeichert / ausgeführt.':r.message);await poll();return true;}catch(e){message(e.message,true);return false;}}

function options(id,items,value,label,selected){const e=$(id),old=e.value;e.replaceChildren();for(const item of items){const o=document.createElement('option');o.value=value(item);o.textContent=label(item);e.appendChild(o);}e.value=selected||old;if(e.selectedIndex<0&&e.options.length)e.selectedIndex=0;}

async function poll(){if(polling)return;polling=true;try{

 state=await api.status();const hose=state.selected?.kind==='hose';$('hose-air').hidden=!hose||!state.busy;$('hose-air').disabled=state.phase!=='hoseReady';$('login').hidden=true;$('app').hidden=false;$('selected-name').textContent=state.selected?.name||'Volcano';$('current').textContent=state.temperatureValid?state.current.toFixed(1):'—';$('connection').textContent=`${state.connected?'Bluetooth verbunden':'Bluetooth getrennt'} · ${state.wifi?'WLAN verbunden':'WLAN fehlt'}`;

 if(catalogVersion!==state.catalogVersion){const data=await api.getLibrary();catalog=runnableItems(data.library);catalogVersion=state.catalogVersion;}
 if(document.activeElement!==$('runnable'))options('runnable',catalog,x=>JSON.stringify(x.ref),x=>`${x.ref.kind==='workflow'?'Workflow · ':''}${x.name}`,JSON.stringify(state.activeRunnable));

 $('run').textContent=state.phase==='awaitingNext'?'Nächstes Preset':state.busy?(hose?'Schlauch beenden':'Ablauf stoppen'):state.retryAvailable?'Preset erneut starten':'Starten';$('connect').textContent=state.connected?'Trennen & Steckdose AUS':'Verbinden';

 const names={reachTemperature:'Aufheizen',wait:'Warten',air:'Lüften',heaterOff:'Heizung ausschalten'};

 $('progress').textContent=hose&&state.busy?(state.phase==='hoseReady'?'Bereit. Dial oder Zusatztaster für Luft gedrückt halten.':'Heizt auf. Nach Erreichen der Temperatur für Luft halten.'):state.phase==='awaitingNext'?`Zwischenpause nach Preset ${state.stage}/${state.stages}. Mit Dial-Klick, Touch, Zusatztaster oder Start fortsetzen.`:state.busy?`${state.stageName} · Preset ${state.stage}/${state.stages} · Aktion ${state.action}/${state.actions}: ${names[state.actionType]||''} · ${Math.ceil(state.remaining)} s`:state.retryAvailable?`Abgebrochen. ${state.stageName} · Preset ${state.stage}/${state.stages} erneut starten.`:state.cooling?'Abkühlen. Hue schaltet nach bestätigter Temperatur aus.':({complete:'Ablauf abgeschlossen',aborted:'Ablauf abgebrochen',error:'Ablauf gestoppt – Gerät kontrollieren'}[state.phase]||'Bereit');

 $('bar').value=state.actions?Math.min(100,(state.action-1)/state.actions*100):0;$('feedback').textContent=state.error||state.operation||state.notice||'';

 $('heat').textContent=`Heizung ${state.heat?'AUS':'EIN'}`;$('fan').textContent=`Lüftung ${state.fan?'AUS':'EIN'}`;

 for(const id of ['set-target','heat','fan','timer','save-hue','save-volcano','save-display','ble-search','bridge-search','pair','plug-search','bypass'])$(id).disabled=state.busy&&!(id==='set-target'&&hose);

 $('wifi-info').textContent=state.wifi?`Heimnetz verbunden. Browser-Adresse: http://${state.ip} oder http://volcano-dial.local. Das Einrichtungs-WLAN schließt nach zwei Minuten.`:'WLAN noch nicht verbunden. Name und Passwort prüfen.';

 if(boot){for(const [id,key] of Object.entries({ssid:'ssid','bridge-ip':'bridgeAddress',threshold:'threshold',brightness:'brightness','timer-temp':'timerTemperature','timer-seconds':'timerSeconds','sleep-dim':'sleepDimSeconds','sleep-off':'sleepOffSeconds'}))if(state.settings[key]!=null)$(id).value=state.settings[key];for(const [id,key] of Object.entries({'hue-enabled':'hueEnabled','auto-off':'autoOff',sound:'sound','sleep-enabled':'sleepEnabled'}))if(state.settings[key]!=null)$(id).checked=state.settings[key];boot=false;}

 const d=state.discoveries||{};if(d.bridges?.length)options('bridges',d.bridges,x=>x.address,x=>`${x.name} · ${x.address}`);if(d.plugs?.length)options('plug',d.plugs,x=>x.id,x=>x.name,state.settings.plug);if(d.volcano?.length)options('volcano',d.volcano,x=>x.id,x=>`${x.name} · ${x.id}`,state.settings.volcanoId);

 $('device-info').textContent=`Firmware ${state.version} · ${Math.round(state.heap/1024)} KiB frei · Taste ${state.keyAlive?'erkannt':'nicht erkannt'} · RFID ${state.rfid||'noch keine Karte'} · Uhrzeit ${state.clockValid?'bereit':'synchronisieren'}`;

 }catch(e){message(e.message,true);}finally{polling=false;}}

$('login-form').onsubmit=async e=>{e.preventDefault();try{await api.login($('pin').value);await api.command({command:'clock',epoch:Math.floor(Date.now()/1000)});if(new URLSearchParams(location.search).get('next')==='editor'){location.href='/editor.html';return;}poll();}catch(e){message(e.message,true);}};

$('runnable').onchange=()=>act({command:'select',ref:JSON.parse($('runnable').value)});$('run').onclick=()=>act({command:'run'});$('stop').onclick=()=>act({command:'stop'});$('connect').onclick=()=>act({command:state?.connected?'disconnect':'connect'});

$('set-target').onclick=()=>act({command:state?.selected?.kind==='hose'?'hoseTarget':'target',value:Number($('target').value)});

$('heat').onclick=()=>act({command:'heat'});$('fan').onclick=()=>act({command:'fan'});

$('timer').onclick=async()=>{if(await act({command:'configure',settings:{timerSeconds:Number($('timer-seconds').value),timerTemperature:Number($('timer-temp').value)}}))await act({command:'timer'});};

$('wifi-form').onsubmit=e=>{e.preventDefault();act({command:'configure',settings:{ssid:$('ssid').value,password:$('password').value}}).then(ok=>{if(ok)$('password').value='';});};

$('bridge-search').onclick=()=>act({command:'hueDiscover'});$('bridges').onchange=()=>{$('bridge-ip').value=$('bridges').value;};$('pair').onclick=()=>act({command:'huePair',address:$('bridge-ip').value});$('plug-search').onclick=()=>act({command:'hueDevices'});

$('save-hue').onclick=()=>act({command:'configure',settings:{plug:$('plug').value,hueEnabled:$('hue-enabled').checked,autoOff:$('auto-off').checked,threshold:Number($('threshold').value)}});

$('ble-search').onclick=()=>act({command:'bleScan'});$('save-volcano').onclick=()=>{const v=state?.discoveries.volcano?.find(v=>v.id===$('volcano').value);if(v)act({command:'configure',settings:{volcanoId:v.id,volcanoType:v.addressType}});};

$('bypass').onclick=()=>act({command:'connect',bypassHue:true});$('save-display').onclick=()=>act({command:'configure',settings:{brightness:Number($('brightness').value),sound:$('sound').checked,sleepEnabled:$('sleep-enabled').checked,sleepDimSeconds:Number($('sleep-dim').value),sleepOffSeconds:Number($('sleep-off').value)}});$('clock').onclick=()=>act({command:'clock',epoch:Math.floor(Date.now()/1000)});$('rfid').onclick=()=>act({command:'rfidLearn'});$('diagnostics').onclick=()=>download('volcano-dial-diagnose.json',JSON.stringify(state,null,2));

if(api.isLoggedIn())poll();setInterval(()=>{if(api.isLoggedIn())poll();},1000);



const hold=createHold(on=>api.hold(on),globalThis,e=>message(e.message,true));bindHold($('hose-air'),hold,window,document);


$('display-sleep').onclick=()=>act({command:'sleepDisplay'});$('display-wake').onclick=()=>act({command:'wakeDisplay'});
