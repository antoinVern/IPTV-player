/* ---------- outils communs ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let uid=0;const nid=()=>'n'+Date.now().toString(36)+(uid++);
const KEY='menutv.v1';
const APP=/MenuTV-App/.test(navigator.userAgent); // dans l'appli Fire TV

/* ---------- données ---------- */
const DEMO_FR=['TF1','France 2','France 3','Canal+','France 5','M6','Arte','W9','TMC','TFX','NRJ 12','France 4','BFM TV','CNEWS','Gulli',
  "L'Équipe",'6ter','RMC Story','RMC Découverte','Chérie 25','LCI','franceinfo','beIN SPORTS 1','beIN SPORTS 2','beIN SPORTS 3',
  'beIN SPORTS MAX 4','RMC Sport 1','RMC Sport 2','DAZN 1','DAZN 2','Canal+ Sport','Canal+ Foot','Canal+ Sport 360','Eurosport 1',
  'Eurosport 2','Ligue 1+','Golf+','Equidia','France 24','BFM Business','Euronews','Canal+ Cinéma','Canal+ Séries','Ciné+ Frisson',
  'OCS','Paramount Channel','TCM Cinéma','Disney Channel','Canal J','Tiji','Planète+','National Geographic','Ushuaïa TV',
  'MTV','Trace Urban','France 3 Alpes','BFM Paris'];
function demo(){
  const root=nid(),d={nodes:{[root]:{id:root,name:'root',icon:'',children:[],channels:[]}},channels:{},root,xt:null,demo:true};
  DEMO_FR.forEach(n=>{const id=nid();d.channels[id]={id,name:n,logo:'',url:'demo:'+n};});
  ensureFav(d);rangerFr(d,true);
  ['TF1','beIN SPORTS 1','RMC Sport 1'].forEach(n=>{const c=Object.values(d.channels).find(c=>c.name===n);if(c)d.nodes[d.favId].channels.push(c.id);});
  return d;
}

/* ---------- favoris ---------- */
function ensureFav(d){
  const r=d.nodes[d.root];
  if(!d.favId||!d.nodes[d.favId]){d.favId=nid();d.nodes[d.favId]={id:d.favId,name:'Favoris',icon:'⭐',children:[],channels:[]};}
  r.children=[d.favId,...r.children.filter(x=>x!==d.favId)];
}
const isFav=id=>!!(db.favId&&db.nodes[db.favId]&&db.nodes[db.favId].channels.includes(id));
function toggleFav(id){
  if(!db.channels[id])return;
  delete db.channels[id].virt;
  ensureFav(db);const f=db.nodes[db.favId];
  if(f.channels.includes(id)){f.channels=f.channels.filter(x=>x!==id);toast('Retirée des favoris');}
  else{f.channels.push(id);toast('Ajoutée aux favoris');}
  save();render();if(typeof favBtn==='function')favBtn();
}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.nodes&&d.root)return d}catch(e){}return null}
// Les films/séries chargés (virt:true) restent en mémoire : on n'enregistre que le menu,
// plus les films/épisodes rangés dans un dossier enregistré (favoris, dossier perso).
function aEnregistrer(){
  const nodes={},channels={},garde=new Set();
  Object.values(db.nodes).forEach(n=>{if(n.virt)return;
    nodes[n.id]=Object.assign({},n,{children:n.children.filter(k=>db.nodes[k]&&!db.nodes[k].virt)});
    n.channels.forEach(c=>garde.add(c));});
  Object.values(db.channels).forEach(c=>{if(!c.virt)channels[c.id]=c;else if(garde.has(c.id)){const k=Object.assign({},c);delete k.virt;channels[c.id]=k;}});
  return Object.assign({},db,{nodes,channels});
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(aEnregistrer()))}catch(e){toast('Trop volumineux pour la mémoire du navigateur : non sauvegardé')}}
let db=load();
if(!db||(db.demo&&db.frVer!==FR_VERSION))db=demo(); // ancienne démo → nouvelle démo
ensureFav(db);
// règles de rangement modifiées depuis le dernier rangement → on re-range
if(!db.demo&&db.frIds&&db.frVer!==FR_VERSION){const n=rangerFr(db,false);save();setTimeout(()=>toast('Menu mis à jour : '+n+' chaînes françaises re-rangées'),800);}

