/* ---------- affichage ---------- */
const grid=$('#grid');
const cur=()=>db.nodes[path[path.length-1]];
const cols=()=>innerWidth<700?2:innerWidth<1000?3:4;
const rows=()=>innerWidth<700?4:3;
function items(){return itemsDe(cur(),path.length===1);}
// éléments d'un dossier (utilisé aussi par les menus façon console, js/consoles.js)
function itemsDe(n,racine){
  const a=n.children.filter(id=>db.nodes[id]).map(id=>({t:'f',id})).concat(n.channels.filter(id=>db.channels[id]).map(id=>({t:'c',id})));
  if(n.lazy==='vodcats'||n.lazy==='sercats')a.unshift({t:'vsearch',k:n.lazy});
  if(racine)a.unshift({t:'all'});
  else if(!edit&&n.channels.some(hasEpg))a.unshift({t:'epg'});
  if(edit){a.push({t:'add'});if(!racine)a.push({t:'addch'});}
  return a;
}
// image cassée : on essaie le logo suivant, puis l'icône
function logoSuivant(img){let a=[];try{a=JSON.parse(img.dataset.alts||'[]')}catch(e){}
  if(a.length){img.dataset.alts=JSON.stringify(a.slice(1));img.src=a[0];}else img.outerHTML=img.dataset.fb;}
function hue(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h}
function tileHtml(it,i){
  const s=i===sel?' sel':'';
  const eb=(c)=>`<div class="eb"><button data-a="ren" title="Renommer">✎</button><button data-a="del" title="Supprimer">✕</button></div><div class="mv"><button data-a="l">◀</button><button data-a="r">▶</button>${c?'<button data-a="cp" title="Copier vers…">⧉</button>':''}</div>`;
  // films, épisodes, séries : affiche (poster) en grand
  const affiche=(img,nom,sous,fav,boutons)=>`<div class="tile affiche${s}" data-i="${i}">${fav?'<div class="favb">★</div>':''}${it.t==='c'?'<div class="qbw">'+badgeQualite(db.channels[it.id])+'</div>':''}<img class="affb" src="${esc(img)}" referrerpolicy="no-referrer" alt=""><img class="aff" src="${esc(img)}" referrerpolicy="no-referrer" alt="" onerror="this.closest('.tile').classList.add('sansaff')"><div class="ico">${nom.ico}</div><div class="lbl">${esc(nom.t)}</div><div class="sub">${sous}</div>${boutons}</div>`;
  if(it.t==='f'&&db.nodes[it.id].affiche&&db.nodes[it.id].logo){const n=db.nodes[it.id];
    return affiche(n.logo,{t:n.name,ico:esc(n.icon||'🍿')},n.note?'★ '+n.note:'',false,eb(false));}
  if(it.t==='c'&&estVod(db.channels[it.id])){const c=db.channels[it.id],pos=positions[it.id];
    const sous=(c.note?'★ '+c.note:'')+(pos?(c.note?' · ':'')+'▶ reprise '+duree(pos):'');
    if(c.logo)return affiche(c.logo,{t:c.name,ico:'🎬'},sous,isFav(it.id),eb(true));
    return `<div class="tile${s}" data-i="${i}">${isFav(it.id)?'<div class="favb">★</div>':''}<div class="ico">${c.kind==='episode'?'📺':'🎬'}</div><div class="lbl">${esc(c.name)}</div><div class="sub">${sous}</div>${eb(true)}</div>`;}
  if(it.t==='vsearch')return `<div class="tile${s}" data-i="${i}"><div class="ico">🔍</div><div class="lbl">${it.k==='vodcats'?'Rechercher un film':'Rechercher une série'}</div><div class="sub">dans tout le catalogue</div></div>`;
  if(it.t==='f'){const n=db.nodes[it.id];const k=n.children.length+n.channels.length;
    const ico=`<div class="ico">${esc(n.icon||'📁')}</div>`;
    const logos=n.logo?[n.logo]:n.autoLogo?[...new Set(n.channels.map(c=>db.channels[c]&&db.channels[c].logo).filter(Boolean))].slice(0,8):[];
    const vis=logos.length?`<img class="logo" src="${esc(logos[0])}" referrerpolicy="no-referrer" onerror="logoSuivant(this)" data-alts="${esc(JSON.stringify(logos.slice(1)))}" data-fb="${esc(ico)}">`:ico;
    return `<div class="tile${s}" data-i="${i}">${vis}<div class="lbl">${esc(n.name)}</div><div class="sub">${n.lazy&&!charges.has(it.id)?'Ouvrir ›':k+' élément'+(k>1?'s':'')}</div>${eb(false)}</div>`;}
  if(it.t==='c'){const c=db.channels[it.id];
    const fb=`<div class="ini" style="background:linear-gradient(hsl(${hue(c.name)} 70% 62%),hsl(${hue(c.name)} 65% 45%))">${esc((c.name.trim()[0]||'?').toUpperCase())}</div>`;
    const img=c.logo?`<img class="logo" src="${esc(c.logo)}" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(fb)}">`:fb;
    return `<div class="tile${s}" data-i="${i}">${isFav(it.id)?'<div class="favb">★</div>':''}<div class="qbw">${badgeQualite(c)}</div>${img}<div class="lbl">${esc(c.name)}</div><div class="sub now" data-now="${esc(it.id)}"></div>${eb(true)}</div>`;}
  if(it.t==='epg')return `<div class="tile${s}" data-i="${i}"><div class="ico">📅</div><div class="lbl">Guide TV</div><div class="sub">En ce moment</div></div>`;
  if(it.t==='all')return `<div class="tile${s}" data-i="${i}"><div class="ico">🔍</div><div class="lbl">Toutes les chaînes</div><div class="sub">${Object.values(db.channels).filter(c=>!c.kind).length}</div></div>`;
  if(it.t==='add')return `<div class="tile add${s}" data-i="${i}"><div class="ico">＋</div><div class="lbl">Nouvelle catégorie</div></div>`;
  return `<div class="tile add${s}" data-i="${i}"><div class="ico">📺</div><div class="lbl">Ajouter une chaîne</div></div>`;
}
function render(){
  if(menuConsole()){renderConsole();return;}   // barre croisée / tuiles (js/consoles.js)
  $('#console').hidden=true;$('#app').hidden=false;
  const its=items(),pp=cols()*rows();
  if(sel>=its.length)sel=Math.max(0,its.length-1);
  const pages=Math.max(1,Math.ceil(its.length/pp)),page=Math.floor(sel/pp);
  grid.style.setProperty('--cols',cols());grid.style.setProperty('--rows',rows());
  let h='';for(let i=0;i<pp;i++){const idx=page*pp+i;h+=its[idx]?tileHtml(its[idx],idx):'<div class="tile empty"></div>';}
  grid.innerHTML=h;fillNow();
  $('#prev').hidden=page===0;$('#next').hidden=page>=pages-1;
  const names=path.slice(1).map(id=>db.nodes[id].name);
  $('#crumb').textContent=(edit?'Mode organisation · ':'Menu TV')+(names.length?(edit?'':' › ')+names.join(' › '):'')+(pages>1?`  ·  page ${page+1}/${pages}`:'');
  $('#home').textContent=path.length>1?'←':'⌂';
  document.body.classList.toggle('edit',edit);
}
function updateSel(){grid.querySelectorAll('.tile[data-i]').forEach(t=>t.classList.toggle('sel',+t.dataset.i===sel))}
function setSel(n){
  const pp=cols()*rows(),old=Math.floor(sel/pp);sel=n;
  if(Math.floor(sel/pp)!==old)render();else updateSel();
}
function tick(){try{const a=tick.a||(tick.a=new (window.AudioContext||window.webkitAudioContext)());const o=a.createOscillator(),g=a.createGain();o.frequency.value=1100;o.type='sine';g.gain.value=.03;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.06);o.stop(a.currentTime+.07)}catch(e){}}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
function clock(){const d=new Date();$('#clock').textContent=d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})+'  '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
setInterval(clock,1000);clock();

/* ---------- navigation ---------- */
function activate(it){
  if(!it)return;
  if(it.t==='f'&&db.nodes[it.id].lazy&&!charges.has(it.id)){   // films / séries : chargement à la demande
    const depuis=cur().id,s=sel;
    chargerDossier(it.id).then(ok=>{if(ok&&cur().id===depuis&&player.hidden&&$('#modal').hidden){selStack.push(s);path.push(it.id);sel=0;render();}});
    return;
  }
  if(it.t==='vsearch'){rechercheVod(it.k);return;}
  if(it.t==='f'){selStack.push(sel);path.push(it.id);sel=0;render();if(it.id===db.favId&&!cur().channels.length)toast('Pas encore de favoris : bouton ★ dans le lecteur, ou touche Menu ≡ sur une chaîne');}
  else if(it.t==='c'){startQueue(cur().channels,cur().channels.indexOf(it.id));}
  else if(it.t==='all')searchModal('play');
  else if(it.t==='epg')guideModal(cur().channels.filter(hasEpg),cur().name);
  else if(it.t==='add')addFolder();
  else if(it.t==='addch')searchModal('add');
}
function back(){if(path.length>1){path.pop();sel=selStack.pop()||0;
    // barre croisée : la catégorie s'affiche sur la barre, on remonte donc jusqu'à l'accueil
    if(menuConsole()==='barre'&&path.length===2){barreLigne[path[1]]=sel;path.pop();sel=selStack.pop()||0;}
    render();}else{sel=0;render();toast('Tu es déjà à l’accueil');}}
function home(){if(path.length>1){path=[db.root];selStack=[];sel=0;render();}else back();}
grid.addEventListener('click',e=>{
  const t=e.target.closest('.tile[data-i]');if(!t)return;
  const it=items()[+t.dataset.i],b=e.target.closest('button');
  if(b){act(b.dataset.a,it);return;}
  sel=+t.dataset.i;tick();activate(it);
});
grid.addEventListener('mouseover',e=>{const t=e.target.closest('.tile[data-i]');if(t&&+t.dataset.i!==sel){sel=+t.dataset.i;updateSel();}});
$('#prev').onclick=()=>{const pp=cols()*rows();setSel(Math.max(0,(Math.floor(sel/pp)-1)*pp));tick()};
$('#next').onclick=()=>{const pp=cols()*rows();setSel(Math.min(items().length-1,(Math.floor(sel/pp)+1)*pp));tick()};
$('#home').onclick=back;
$('#gear').onclick=()=>settings(); // settings est dans fenetres.js, chargé après
addEventListener('resize',render);

