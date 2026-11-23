/* ---------- films et séries (VOD Xtream) ---------- */
/*
 * « 🎬 Films » et « 🍿 Séries » à l'accueil. Les catalogues peuvent faire des dizaines de milliers
 * de titres : ils sont chargés à la demande (catégorie par catégorie) et gardés en mémoire seulement
 * (virt:true → pas enregistrés, voir save()). Un film mis en favori, lui, est enregistré.
 *
 * Dossiers « paresseux » (lazy) :
 *   vodcats      → catégories de films (françaises d'abord, les autres dans « Autres langues »)
 *   vod:<cat>    → films de la catégorie
 *   sercats      → catégories de séries
 *   ser:<cat>    → séries de la catégorie
 *   serie:<id>   → saisons / épisodes
 */
const charges=new Set();   // dossiers déjà chargés pendant cette session
const catalogues={};       // listes complètes, pour la recherche
const FR_CAT=/(^|[^A-Z])(FR|FRA|FRANCE|FRENCH|FRANCAIS|VF|VFF|VFQ|VOSTFR|TRUEFRENCH)([^A-Z]|$)/;
const tab=x=>Array.isArray(x)?x:[];
const deux=n=>String(n||0).padStart(2,'0');
const estVod=c=>!!c&&(c.kind==='film'||c.kind==='episode');

function xtCreds(){
  if(db.xt&&db.xt.u&&db.xt.pw)return db.xt;
  for(const c of Object.values(db.channels)){const x=xtParts(c);if(x)return{server:x.server,u:x.u,pw:x.pw};}
  return null;
}
function xtApi(action,extra){
  const x=xtCreds();
  if(!x)return Promise.reject(new Error('connecte d’abord ton Xtream (⚙ Réglages)'));
  return proxyReady
    .then(()=>fetch(px(`${x.server}/player_api.php?username=${x.u}&password=${x.pw}&action=${action}${extra||''}`)))
    .then(r=>{if(!r.ok)throw new Error('erreur du serveur ('+r.status+')');return r.json();});
}

/* « Films » et « Séries » à l'accueil, juste après les favoris */
function ensureVod(d){
  if(!d.xt&&!d.demo)return;
  d.vodIds=d.vodIds||{};
  [['films','Films','🎬','vodcats'],['series','Séries','🍿','sercats']].forEach(([k,name,icon,lazy])=>{
    if(!d.vodIds[k]||!d.nodes[d.vodIds[k]]){const id=nid();d.nodes[id]={id,name,icon,lazy,children:[],channels:[]};d.vodIds[k]=id;}
  });
  const r=d.nodes[d.root],v=[d.vodIds.films,d.vodIds.series];
  r.children=[...r.children.filter(id=>id===d.favId),...v,...r.children.filter(id=>id!==d.favId&&!v.includes(id))];
}
// réimport : on oublie ce qui a été chargé
function resetVod(){
  Object.keys(db.nodes).forEach(id=>{if(db.nodes[id].virt)delete db.nodes[id];});
  Object.keys(db.channels).forEach(id=>{if(db.channels[id].virt)delete db.channels[id];});
  Object.values(db.vodIds||{}).forEach(id=>{const n=db.nodes[id];if(n){n.children=[];n.channels=[];}});
  charges.clear();Object.keys(catalogues).forEach(k=>delete catalogues[k]);
}

/* ---------- création des éléments (en mémoire) ---------- */
function vNode(name,icon,extra){const id=nid();db.nodes[id]=Object.assign({id,name,icon,children:[],channels:[],virt:true},extra);return id;}
function vChan(id,o){if(!db.channels[id]||db.channels[id].virt)db.channels[id]=Object.assign({id,virt:true},o);return id;}
const nomCat=s=>String(s||'Sans nom').replace(/^[^A-Za-z0-9]*(FR|FRA|FRANCE|VF|VFF)\s*[|:\-–]+\s*/i,'').trim()||String(s);

function rangeCats(cats,prefixe,n){
  const fr=[],autres=[];
  tab(cats).forEach(c=>(FR_CAT.test(majuscules(c.category_name))?fr:autres).push(c));
  const mk=c=>vNode(nomCat(c.category_name),'📁',{lazy:prefixe+':'+c.category_id});
  n.children=(fr.length?fr:autres).map(mk);
  if(fr.length&&autres.length){const a=vNode('Autres langues','🌍');db.nodes[a].children=autres.map(mk);charges.add(a);n.children.push(a);}
}
function film(s){
  const x=xtCreds(),note=parseFloat(s.rating);
  return vChan('m'+s.stream_id,{name:String(s.name||'?'),logo:s.stream_icon||'',kind:'film',sid:s.stream_id,note:note>0?note:0,
    url:`${x.server}/movie/${x.u}/${x.pw}/${s.stream_id}.${s.container_extension||'mp4'}`});
}
function serie(s){
  const note=parseFloat(s.rating);
  return vNode(String(s.name||'?'),'🍿',{lazy:'serie:'+s.series_id,logo:s.cover||'',affiche:true,plot:s.plot||'',note:note>0?note:0});
}
function remplirSerie(n,j){
  const x=xtCreds();let ep=j&&j.episodes||{};
  if(Array.isArray(ep)){const o={};ep.flat().forEach(e=>(o[e.season||1]=o[e.season||1]||[]).push(e));ep=o;}
  const saisons=Object.keys(ep).sort((a,b)=>a-b);
  const episode=(e,s)=>{
    const t=String(e.title||''),i=e.info||{};
    const nom=/S\d+\s*E\d+/i.test(t)?t:`S${deux(s)}E${deux(e.episode_num)}${t?' · '+t:''}`;
    return vChan('e'+e.id,{name:nom,logo:i.movie_image||n.logo||'',kind:'episode',plot:i.plot||'',
      url:`${x.server}/series/${x.u}/${x.pw}/${e.id}.${e.container_extension||'mp4'}`});
  };
  const liste=s=>tab(ep[s]).sort((a,b)=>(a.episode_num||0)-(b.episode_num||0)).map(e=>episode(e,s));
  if(saisons.length===1)n.channels=liste(saisons[0]);
  else n.children=saisons.map(s=>{const id=vNode('Saison '+s,'📂',{logo:n.logo,affiche:!!n.logo});db.nodes[id].channels=liste(s);charges.add(id);return id;});
}

const CHARGEURS={
  vodcats:n=>xtApi('get_vod_categories').then(c=>rangeCats(c,'vod',n)),
  sercats:n=>xtApi('get_series_categories').then(c=>rangeCats(c,'ser',n)),
  vod:(n,cat)=>xtApi('get_vod_streams','&category_id='+encodeURIComponent(cat)).then(l=>{n.channels=tab(l).map(film);}),
  ser:(n,cat)=>xtApi('get_series','&category_id='+encodeURIComponent(cat)).then(l=>{n.children=tab(l).map(serie);}),
  serie:(n,sid)=>xtApi('get_series_info','&series_id='+encodeURIComponent(sid)).then(j=>remplirSerie(n,j)),
};

/* démo : quelques faux films / séries (mire), et un vrai court-métrage libre (Big Buck Bunny) */
function demoVod(n,type,arg){
  const faux=(id,nom,kind,extra)=>vChan(id,Object.assign({name:nom,logo:'',kind,url:'demo:'+nom},extra));
  if(type==='vodcats')n.children=[['Animation','anim'],['Action','action'],['Comédie','comedie']].map(([nom,k])=>vNode(nom,'📁',{lazy:'vod:'+k}));
  else if(type==='sercats')n.children=[vNode('Séries françaises','📁',{lazy:'ser:fr'})];
  else if(type==='vod'){
    const t={anim:['Big Buck Bunny','Le Petit Robot','Voyage en Ballon'],action:['Course Poursuite','Le Dernier Agent','Opération Minuit'],comedie:['Les Vacances','Mon Voisin','Le Grand Mariage']}[arg]||[];
    n.channels=t.map((nom,i)=>nom==='Big Buck Bunny'
      ?vChan('m-bbb',{name:nom,logo:'',kind:'film',note:7.8,plot:'Court-métrage d’animation libre (Blender Foundation).',url:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'})
      :faux('m-'+arg+i,nom,'film',{note:6+i/2,plot:'Film de démonstration.'}));
  }
  else if(type==='ser')n.children=['La Série Démo','Les Enquêtes'].map((nom,i)=>vNode(nom,'🍿',{lazy:'serie:d'+i}));
  else if(type==='serie')n.children=[1,2].map(s=>{const id=vNode('Saison '+s,'📂');charges.add(id);
    db.nodes[id].channels=[1,2,3].map(e=>faux(`e-${arg}-${s}-${e}`,`S${deux(s)}E${deux(e)} · Épisode ${e}`,'episode',{plot:'Épisode de démonstration.'}));return id;});
}

let enChargement=false;
async function chargerDossier(id){
  const n=db.nodes[id];
  if(!n||!n.lazy||charges.has(id))return true;
  if(enChargement)return false;
  const i=n.lazy.indexOf(':'),type=i<0?n.lazy:n.lazy.slice(0,i),arg=i<0?'':n.lazy.slice(i+1);
  if(db.demo){demoVod(n,type,arg);charges.add(id);return true;}
  enChargement=true;toast('Chargement de « '+n.name+' »…');
  try{
    await CHARGEURS[type](n,arg);charges.add(id);
    if(!n.children.length&&!n.channels.length)toast('Rien dans « '+n.name+' »');
    return true;
  }catch(e){toast('Impossible de charger : '+(e.message||e));return false;}
  finally{enChargement=false;}
}

/* ---------- recherche dans tout le catalogue ---------- */
async function rechercheVod(type){
  const films=type==='vodcats',titre=films?'🔍 Rechercher un film':'🔍 Rechercher une série';
  const p=modal(`<h2>${titre}</h2><input id="q" placeholder="Titre…" autocomplete="off"><div class="list" id="res"><div class="note">Chargement du catalogue…</div></div><div class="row-btns"><button class="btn" data-x>Fermer</button></div>`);
  p.querySelector('[data-x]').onclick=closeModal;
  const q=p.querySelector('#q'),res=p.querySelector('#res');q.focus();
  let tout;
  try{
    if(db.demo)tout=films?['anim','action','comedie'].flatMap(k=>{const n={children:[],channels:[]};demoVod(n,'vod',k);return n.channels.map(id=>({id,name:db.channels[id].name}));})
      :['La Série Démo','Les Enquêtes'].map((name,i)=>({series_id:'d'+i,name}));
    else tout=catalogues[type]||(catalogues[type]=tab(await xtApi(films?'get_vod_streams':'get_series')));
  }catch(e){res.innerHTML=`<div class="note">Impossible de charger : ${esc(e.message||e)}</div>`;return;}
  if(!p.isConnected)return;
  let vus=[];
  const dessine=()=>{
    const s=majuscules(q.value.trim());
    vus=s.length<2?[]:tout.filter(x=>majuscules(x.name).includes(s)).slice(0,60);
    res.innerHTML=s.length<2?`<div class="note">Tape au moins 2 lettres (${tout.length} titres).</div>`
      :vus.map((x,i)=>`<div class="item" tabindex="0" data-i="${i}"><span>${esc(x.name)}</span><span>${films?'▶':'›'}</span></div>`).join('')||'<div class="note">Aucun résultat.</div>';
  };
  q.oninput=dessine;dessine();
  res.onclick=async e=>{
    const el=e.target.closest('.item');if(!el)return;const x=vus[+el.dataset.i];closeModal();
    if(films){startQueue([x.id||film(x)],0);return;}
    const id=db.demo?vNode(x.name,'🍿',{lazy:'serie:'+x.series_id}):serie(x);
    if(await chargerDossier(id)){selStack.push(sel);path.push(id);sel=0;render();}
  };
}

/* ---------- lecture : reprise, avance rapide, épisode suivant ---------- */
const POSKEY='menutv.pos';
let positions=(()=>{try{return JSON.parse(localStorage.getItem(POSKEY))||{}}catch(e){return{}}})();
function savePos(){try{localStorage.setItem(POSKEY,JSON.stringify(positions))}catch(e){}}
function duree(s){s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+deux(m):m)+':'+deux(x);}
function reprise(c){
  const p=positions[c.id];if(!(p>=30))return;
  const f=()=>{vid.removeEventListener('loadedmetadata',f);
    if(queue[qi]===c.id&&vid.duration&&p<vid.duration-120){vid.currentTime=p;toast('▶ Reprise à '+duree(p));}};
  vid.addEventListener('loadedmetadata',f);
}
function avance(s){
  if(!isFinite(vid.duration)||!vid.duration)return;
  vid.currentTime=Math.max(0,Math.min(vid.duration-1,vid.currentTime+s));
  toast((s>0?'⏩ +':'⏪ ')+s+' s · '+duree(vid.currentTime)+' / '+duree(vid.duration));majProgres();
}
function pauseLecture(){if(vid.paused)vid.play().catch(()=>{});else vid.pause();toast(vid.paused?'⏸ Pause':'▶ Lecture');}
function majProgres(){
  const i=$('#pinfo .vodbar i'),t=$('#pinfo .vt');if(!i||!vid.duration||!isFinite(vid.duration))return;
  i.style.width=(vid.currentTime/vid.duration*100)+'%';t.textContent=duree(vid.currentTime)+' / '+duree(vid.duration);
}
function infoVod(c,box){
  box.innerHTML=`<div class="pn">${esc(c.name)}${c.note?` <span class="pnote">★ ${c.note}</span>`:''}</div><div class="gbar vodbar"><i></i></div><div class="pt vt"></div>${c.plot?`<div class="pd">${esc(c.plot)}</div>`:''}<div class="px">← → reculer / avancer · OK pause · ↑ ↓ volume</div>`;
  majProgres();
  if(c.kind==='film'&&c.sid&&!c.plot&&!c.plotDemande){c.plotDemande=1;
    xtApi('get_vod_info','&vod_id='+c.sid).then(j=>{const i=j&&j.info||{};c.plot=i.plot||i.description||'';if(c.plot&&queue[qi]===c.id)info();}).catch(()=>{});}
}
vid.addEventListener('timeupdate',()=>{
  const c=db.channels[queue[qi]];if(player.hidden||!estVod(c)||!vid.duration||!isFinite(vid.duration))return;
  if(!player.classList.contains('idle'))majProgres();
  const t=Math.floor(vid.currentTime);
  if(Math.abs(t-(positions[c.id]||0))>=10){
    if(t>vid.duration*0.95||t<30)delete positions[c.id];else positions[c.id]=t;
    const k=Object.keys(positions);if(k.length>300)delete positions[k[0]];
    savePos();
  }
});
vid.addEventListener('ended',()=>{const c=db.channels[queue[qi]];
  if(c&&c.kind==='episode'&&qi<queue.length-1){toast('▶ Épisode suivant');zap(1);}});

ensureVod(db);
