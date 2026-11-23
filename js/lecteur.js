/* ---------- lecteur ---------- */
const vid=$('#vid'),tc=$('#tc'),player=$('#player');
let queue=[],qi=0,hls=null,raf=0,hideT;
function startQueue(list,i){queue=list.slice();qi=Math.max(0,i);player.hidden=false;ambiance();startChannel();bar();}
function bar(){player.classList.remove('idle');clearTimeout(hideT);hideT=setTimeout(()=>player.classList.add('idle'),4000);info();}
function info(){
  const id=queue[qi],box=$('#pinfo');box.innerHTML='';
  if(estVod(db.channels[id])){infoVod(db.channels[id],box);return;}
  if(!hasEpg(id))return;
  getEpg(id).then(l=>{if(queue[qi]!==id)return;const{now,next}=nowNext(l);
    box.innerHTML=now?`<div class="pt">${hm(now.start)} – ${hm(now.end)}</div><div class="pn">${esc(now.title)}</div><div class="gbar"><i style="width:${pct(now)}%"></i></div>${now.desc?`<div class="pd">${esc(now.desc)}</div>`:''}${next?`<div class="px">Ensuite ${hm(next.start)} · ${esc(next.title)}</div>`:''}`
      :next?`<div class="px">Ensuite ${hm(next.start)} · ${esc(next.title)}</div>`:'';});
}
player.addEventListener('mousemove',bar);
// résolution réelle affichée dans la barre du lecteur (4K / 1080p / 720p / SD)
let hMax=0;
function resolution(){const h=vid.videoHeight,b=$('#pres');if(!b)return;
  if(h&&!player.hidden&&db.channels[queue[qi]]&&!db.channels[queue[qi]].url.startsWith('demo:')){hMax=Math.max(hMax,h);retenirQualite(queue[qi],hMax);}
  b.textContent=!h?'':h>=2000?'4K':h>=1000?'1080p':h>=700?'720p':h+'p';b.className=h>=1000?'top':h>=700?'ok':h?'bas':'';}
vid.addEventListener('resize',resolution);vid.addEventListener('loadedmetadata',resolution);
function stopMedia(){vid.onerror=null;$('#pres').textContent='';if(hls){hls.destroy();hls=null}cancelAnimationFrame(raf);try{vid.pause()}catch(e){}vid.removeAttribute('src');vid.load();$('#perr').hidden=true}
function err(t){const e=$('#perr');e.textContent=t;e.hidden=false}
let hlsP=null;
function loadHls(){return hlsP||(hlsP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';s.onload=ok;s.onerror=ko;document.head.appendChild(s);}))}
function startChannel(){
  const c=db.channels[queue[qi]];if(!c)return;
  $('#pname').textContent=c.name;hMax=0;favBtn();appliqueVolume();stopMedia();bar();
  if(c.url.startsWith('demo:')){vid.style.display='none';tc.style.display='block';testCard(c.name);return;}
  tc.style.display='none';vid.style.display='block';
  const id=queue[qi];let src;
  // film / épisode en fichier (mp4, mkv…) : lecture directe par le lecteur vidéo (pas besoin du proxy),
  // et si le serveur refuse, nouvel essai via le proxy
  if(estVod(c)&&!/\.m3u8(\?|$)/i.test(c.url)){
    let essai=0;
    vid.onerror=()=>{if(queue[qi]!==id||player.hidden)return;
      if(!essai&&PROXY){essai=1;vid.src=px(c.url);vid.play().catch(()=>{});return;}
      err('Lecture impossible : film indisponible, ou format ('+(c.url.split('.').pop()||'?')+') non lu par cet appareil.');};
    reprise(c);vid.src=c.url;vid.play().catch(()=>{});return;
  }
  if(estVod(c))reprise(c);
  const native=()=>{vid.src=src;vid.play().catch(()=>{});};
  proxyReady.then(()=>{src=px(c.url);return loadHls();}).then(()=>{
    if(queue[qi]!==id||player.hidden)return;
    if(window.Hls&&Hls.isSupported()){
      // qualité : on part de l'estimation d'un bon débit (20 Mb/s) et on ne bride pas la résolution
      // à la taille du lecteur ; tampon plus long pour éviter les coupures et les chutes de qualité
      hls=new Hls({capLevelToPlayerSize:false,abrEwmaDefaultEstimate:20e6,startLevel:-1,
        maxBufferLength:30,maxMaxBufferLength:60,backBufferLength:30,enableWorker:true,lowLatencyMode:false});
      hls.loadSource(src);hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED,(e,d)=>{
        if(d.levels&&d.levels.length>1){const best=d.levels.reduce((b,l,i)=>(l.height||0)*1e9+(l.bitrate||0)>(d.levels[b].height||0)*1e9+(d.levels[b].bitrate||0)?i:b,0);hls.startLevel=best;hls.nextLevel=best;}
        vid.play().catch(()=>{});});
      hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)err(PROXY?'Flux illisible : chaîne hors ligne ou format non pris en charge.':'Flux illisible : le navigateur bloque probablement le serveur. Lance « node proxy.js » puis ouvre http://localhost:8787.');});
    }else native();
  }).catch(()=>{if(queue[qi]===id&&!player.hidden){src=src||px(c.url);native();}});
}
function testCard(name){
  const g=tc.getContext('2d'),W=tc.width,H=tc.height,cl=['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'];
  let t=0;(function f(){
    const w=W/7;cl.forEach((c,i)=>{g.fillStyle=c;g.fillRect(i*w,0,w+1,H*.7)});
    g.fillStyle='#111';g.fillRect(0,H*.7,W,H*.3);
    g.fillStyle='#4fc3f7';g.fillRect((t*6)%(W+200)-200,H*.7,200,H*.3);
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(W/2-300,H*.25,600,170);
    g.fillStyle='#fff';g.textAlign='center';g.font='bold 64px sans-serif';g.fillText(name,W/2,H*.25+85);
    g.font='28px sans-serif';g.fillText('MODE DÉMO · '+new Date().toLocaleTimeString('fr-FR'),W/2,H*.25+135);
    t++;raf=requestAnimationFrame(f);
  })();
}
function closePlayer(){const vod=estVod(db.channels[queue[qi]]);stopMedia();player.hidden=true;ambiance();render();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
function zap(d){if(queue.length<2)return;qi=(qi+d+queue.length)%queue.length;startChannel()}
function fs(){try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();if(p&&p.catch)p.catch(()=>toast('Plein écran refusé par le navigateur'));}catch(e){}}
function favBtn(){const b=$('#pfav');if(!b)return;const on=isFav(queue[qi]);b.innerHTML=icone('etoile',on);b.classList.toggle('on',on);}
/* ---------- son ---------- */
const volV=()=>prefs.vol==null?1:prefs.vol;
function appliqueVolume(){
  vid.volume=volV();vid.muted=!!prefs.mute;const v=Math.round(volV()*100);
  $('#pvolr').value=prefs.mute?0:v;$('#pvol').innerHTML=icone(prefs.mute||!v?'muet':v<50?'sonbas':'son');
}
function volume(delta){prefs.mute=false;prefs.vol=Math.max(0,Math.min(1,Math.round((volV()+delta)*20)/20));savePrefs();appliqueVolume();toast('Volume '+Math.round(prefs.vol*100)+' %');}
function muet(){prefs.mute=!prefs.mute;savePrefs();appliqueVolume();toast(prefs.mute?'Son coupé':'Son remis');}
$('#pvol').onclick=muet;
$('#pvolr').oninput=e=>{prefs.vol=e.target.value/100;prefs.mute=false;savePrefs();appliqueVolume();};
$('#pfav').onclick=()=>toggleFav(queue[qi]);
$('#pclose').innerHTML=icone('fermer');$('#pfull').innerHTML=icone('pleinecran');$('#pvol').innerHTML=icone('son');$('#pfav').innerHTML=icone('etoile');
$('#pclose').onclick=closePlayer;$('#pfull').onclick=fs;

