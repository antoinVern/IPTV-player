/* ---------- Xtream ---------- */
function xtDialog(){
  const x=db.xt||{};
  form('Connecter un Xtream',[{k:'server',label:'Serveur',val:x.server||'',ph:'http://monserveur.com:8080'},{k:'user',label:'Identifiant',val:x.user||''},{k:'pass',label:'Mot de passe',type:'password'}],'Importer',doXtream,
    'Les chaînes françaises sont rangées automatiquement (TNT, Sport, Info…) ; le reste de ton fournisseur va dans « 📦 Fournisseur ». '+(PROXY?'🟢 Passage par le proxy local.':'Conseil : lance <b>node proxy.js</b> et ouvre <b>http://localhost:8787</b> pour éviter les blocages du navigateur.'));
}
async function doXtream(v,say){
  let server=v.server.trim().replace(/\/+$/,'');
  if(!server||!v.user.trim()||!v.pass)throw new Error('Remplis les 3 champs.');
  if(!/^https?:\/\//i.test(server))server='http://'+server;
  const u=encodeURIComponent(v.user.trim()),pw=encodeURIComponent(v.pass);
  const base=`${server}/player_api.php?username=${u}&password=${pw}`;
  say('Connexion…');await proxyReady;
  let cats,streams;
  try{[cats,streams]=await Promise.all([fetch(px(base+'&action=get_live_categories')).then(r=>r.json()),fetch(px(base+'&action=get_live_streams')).then(r=>r.json())]);}
  catch(e){throw new Error(PROXY?'Connexion impossible via le proxy : vérifie l’adresse du serveur et regarde la fenêtre du proxy.':'Connexion bloquée par le navigateur (CORS). Lance « node proxy.js » puis ouvre http://localhost:8787.');}
  if(!Array.isArray(streams))throw new Error('Identifiants refusés ou réponse inattendue.');
  say(streams.length+' chaînes…');
  if(db.demo){const root=nid();db={nodes:{[root]:{id:root,name:'root',icon:'',children:[],channels:[]}},channels:{},root,xt:null,demo:false};path=[root];selStack=[];}
  // réimport : on remplace les anciennes catégories du fournisseur
  if(db.provId&&db.nodes[db.provId]){supprimeDossier(db,db.provId);db.nodes[db.root].children=db.nodes[db.root].children.filter(id=>id!==db.provId);db.provId=null;}
  const rootN=db.nodes[db.root],map={};
  (Array.isArray(cats)?cats:[]).forEach(c=>{const id=nid();db.nodes[id]={id,name:String(c.category_name||'Sans nom'),icon:'📺',xt:true,children:[],channels:[]};map[c.category_id]=id;rootN.children.push(id);});
  let misc=null;
  streams.forEach(s=>{
    const id='x'+s.stream_id;
    db.channels[id]={id,name:String(s.name||'?'),logo:s.stream_icon||'',url:`${server}/live/${u}/${pw}/${s.stream_id}.m3u8`};
    let nodeId=map[s.category_id];
    if(!nodeId){if(!misc){misc=nid();db.nodes[misc]={id:misc,name:'Divers',icon:'📦',xt:true,children:[],channels:[]};rootN.children.push(misc);}nodeId=misc;}
    db.nodes[nodeId].channels.push(id);
  });
  db.xt={server,user:v.user.trim(),u,pw};resetVod();ensureVod(db);
  ensureFav(db);const nFr=rangerFr(db,false);path=[db.root];selStack=[];sel=0;save();render();toast(streams.length+' chaînes importées · '+nFr+' françaises rangées · Films et Séries ajoutés');
}

