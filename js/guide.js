/* ---------- proxy (node proxy.js) ---------- */
let PROXY=false;
const px=u=>PROXY&&/^https?:/i.test(u)?location.origin+'/p?u='+encodeURIComponent(u):u;
const proxyReady=location.protocol.startsWith('http')
  ?fetch('/__proxy',{cache:'no-store'}).then(r=>r.ok&&r.json()).then(j=>{PROXY=!!(j&&j.ok)}).catch(()=>{})
  :Promise.resolve();

/* ---------- guide TV (EPG) ---------- */
const epgCache={};
let epgRun=0;const epgQ=[];
function slot(fn){return new Promise((ok,ko)=>{const go=()=>{epgRun++;fn().then(ok,ko).finally(()=>{epgRun--;const n=epgQ.shift();if(n)n();})};epgRun<4?go():epgQ.push(go);})}
function b64(s){if(!s)return'';try{return new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)))}catch(e){return String(s)}}
function xtParts(c){const m=/^(https?:\/\/.+?)\/live\/([^/]+)\/([^/]+)\/(\d+)\.\w+$/.exec(c&&c.url||'');return m&&{server:m[1],u:m[2],pw:m[3],sid:m[4]}}
function demoEpg(name){
  const T=['Journal','Magazine','Le grand direct','Documentaire','Film du soir','Série','Débat','Jeu','Concert','Reportage','Météo','Talk-show'];
  const h=hue(name),d=new Date();d.setMinutes(0,0,0);let t=d.getTime()-36e5*(h%2);
  return Array.from({length:6},(_,i)=>{const dur=(30+((h+i*17)%4)*30)*6e4;const e={title:T[(h+i*5)%T.length],desc:'Programme de démonstration.',start:t,end:t+dur};t+=dur;return e;});
}
function hasEpg(id){const c=db.channels[id];return !!c&&!c.kind&&(c.url.startsWith('demo:')||!!xtParts(c))}
function getEpg(id){
  const c=db.channels[id];if(!c)return Promise.resolve([]);
  const k=epgCache[id];if(k&&Date.now()-k.t<6e5)return k.p;
  let p;
  if(c.url.startsWith('demo:'))p=Promise.resolve(demoEpg(c.name));
  else{const x=xtParts(c);
    p=!x?Promise.resolve([]):proxyReady.then(()=>slot(()=>fetch(px(`${x.server}/player_api.php?username=${x.u}&password=${x.pw}&action=get_short_epg&stream_id=${x.sid}&limit=8`)).then(r=>r.json())))
      .then(j=>(j&&Array.isArray(j.epg_listings)?j.epg_listings:[]).map(e=>({title:b64(e.title),desc:b64(e.description),start:(+e.start_timestamp*1000)||Date.parse(e.start),end:(+e.stop_timestamp*1000)||Date.parse(e.end)})).filter(e=>e.title&&e.end>0).sort((a,b)=>a.start-b.start))
      .catch(()=>{if(epgCache[id])epgCache[id].t=Date.now()-54e4;return[];});}
  epgCache[id]={t:Date.now(),p};return p;
}
function nowNext(l){const n=Date.now(),f=l.filter(e=>e.end>n);const now=f[0]&&f[0].start<=n?f[0]:null;return{now,next:now?f[1]:f[0]}}
const hm=t=>new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const pct=e=>Math.max(0,Math.min(100,(Date.now()-e.start)/(e.end-e.start)*100));
function fillNow(){grid.querySelectorAll('[data-now]').forEach(el=>{const id=el.dataset.now;if(!hasEpg(id))return;getEpg(id).then(l=>{const{now}=nowNext(l);if(now&&el.isConnected)el.textContent=now.title;});});}
let path=[db.root],selStack=[],sel=0,edit=false;

