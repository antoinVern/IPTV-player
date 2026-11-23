/* ---------- fenêtres ---------- */
function modal(html,cls){const m=$('#modal');m.innerHTML='<div class="panel'+(cls?' '+cls:'')+'">'+html+'</div>';m.hidden=false;return m.firstChild}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')closeModal()});
function form(title,fields,ok,handler,note){
  const p=modal(`<h2>${esc(title)}</h2><form>${fields.map(f=>`<label>${esc(f.label)}<input name="${f.k}" type="${f.type||'text'}" value="${esc(f.val||'')}" placeholder="${esc(f.ph||'')}" autocomplete="off"></label>`).join('')}${note?`<div class="note">${note}</div>`:''}<div class="msg"></div><div class="row-btns"><button type="button" class="btn" data-x>Annuler</button><button class="btn pri">${esc(ok)}</button></div></form>`);
  const f=p.querySelector('form'),btn=p.querySelector('.pri'),msg=p.querySelector('.msg');
  f.elements[0].focus();
  p.querySelector('[data-x]').onclick=closeModal;
  f.onsubmit=async e=>{e.preventDefault();const v={};fields.forEach(x=>v[x.k]=f.elements[x.k].value);msg.textContent='';btn.disabled=true;
    try{const r=await handler(v,t=>msg.textContent=t);if(r!==false)closeModal();}catch(err){msg.textContent=err.message||String(err);}
    btn.disabled=false;};
}
function confirmBox(text,onYes,ok){
  const p=modal(`<h2>Confirmer</h2><div class="note" style="font-size:16px">${esc(text)}</div><div class="row-btns"><button class="btn" data-n>Annuler</button><button class="btn pri" data-y>${esc(ok||'Supprimer')}</button></div>`);
  p.querySelector('[data-n]').onclick=closeModal;p.querySelector('[data-y]').onclick=()=>{closeModal();onYes()};
}

/* ---------- organisation ---------- */
function addFolder(){
  form('Nouvelle catégorie',[{k:'name',label:'Nom',ph:'ex. Sport'},{k:'icon',label:'Icône (un emoji)',val:'📁'}],'Créer',v=>{
    if(!v.name.trim())throw new Error('Donne un nom.');
    const id=nid();db.nodes[id]={id,name:v.name.trim(),icon:v.icon.trim()||'📁',children:[],channels:[]};
    cur().children.push(id);save();render();
  });
}
function removeNode(id){const n=db.nodes[id];if(!n)return;n.children.forEach(removeNode);delete db.nodes[id]}
function act(a,it){
  const n=cur();
  if(a==='ren'){
    if(it.t==='f'){const f=db.nodes[it.id];form('Modifier la catégorie',[{k:'name',label:'Nom',val:f.name},{k:'icon',label:'Icône (un emoji)',val:f.icon},{k:'logo',label:'URL du logo (optionnel, remplace l’icône)',val:f.logo||''}],'OK',v=>{if(!v.name.trim())throw new Error('Donne un nom.');f.name=v.name.trim();f.icon=v.icon.trim()||'📁';f.logo=v.logo.trim();save();render();});}
    else{const c=db.channels[it.id];form('Renommer la chaîne',[{k:'name',label:'Nom',val:c.name},{k:'logo',label:'URL du logo (optionnel)',val:c.logo}],'OK',v=>{if(!v.name.trim())throw new Error('Donne un nom.');c.name=v.name.trim();c.logo=v.logo.trim();save();render();});}
  }else if(a==='del'){
    if(it.t==='f')confirmBox(`Supprimer « ${db.nodes[it.id].name} » et tout son contenu ?`,()=>{n.children=n.children.filter(x=>x!==it.id);removeNode(it.id);save();render();});
    else{n.channels=n.channels.filter(x=>x!==it.id);save();render();toast('Retirée de cette catégorie (toujours dans « Toutes les chaînes »)');}
  }else if(a==='l'||a==='r'){
    const arr=it.t==='f'?n.children:n.channels,i=arr.indexOf(it.id),j=i+(a==='l'?-1:1);
    if(j>=0&&j<arr.length){[arr[i],arr[j]]=[arr[j],arr[i]];save();const its=items();sel=its.findIndex(x=>x.t===it.t&&x.id===it.id);render();}
  }else if(a==='cp'){copyPicker(it.id);}
}
function allPaths(){const out=[];(function walk(id,names){db.nodes[id].children.forEach(c=>{const nn=names.concat(db.nodes[c].name);out.push({id:c,label:nn.join(' › ')});walk(c,nn);});})(db.root,[]);return out}
function copyPicker(chId){
  const list=allPaths();
  const p=modal(`<h2>Copier vers…</h2><div class="list">${list.map((x,i)=>`<div class="item" tabindex="0" data-i="${i}"><span>${esc(x.label)}</span></div>`).join('')||'<div class="note">Crée d’abord une catégorie.</div>'}</div><div class="row-btns"><button class="btn" data-x>Fermer</button></div>`);
  p.querySelector('[data-x]').onclick=closeModal;
  p.querySelectorAll('.item').forEach(el=>el.onclick=()=>{const x=list[+el.dataset.i],n=db.nodes[x.id];if(!n.channels.includes(chId))n.channels.push(chId);save();closeModal();toast('Ajoutée à '+x.label);});
}
function searchModal(mode){
  const p=modal(`<h2>${mode==='add'?'Ajouter une chaîne ici':'Toutes les chaînes'}</h2><input id="q" placeholder="Rechercher…" autocomplete="off"><div class="list" id="res"></div><div class="row-btns"><button class="btn" data-x>Fermer</button></div>`);
  const q=p.querySelector('#q'),res=p.querySelector('#res');let shown=[];
  p.querySelector('[data-x]').onclick=closeModal;
  function draw(){
    const s=q.value.trim().toLowerCase();
    shown=Object.values(db.channels).filter(c=>!s||c.name.toLowerCase().includes(s)).slice(0,80);
    res.innerHTML=shown.map((c,i)=>`<div class="item" tabindex="0" data-i="${i}"><span>${esc(c.name)}</span><span>${mode==='add'?(cur().channels.includes(c.id)?'✓':'＋'):'▶'}</span></div>`).join('')||'<div class="note">Aucun résultat.</div>';
  }
  res.onclick=e=>{const el=e.target.closest('.item');if(!el)return;const c=shown[+el.dataset.i];
    if(mode==='add'){const n=cur();if(!n.channels.includes(c.id))n.channels.push(c.id);save();draw();render();}
    else{closeModal();startQueue(shown.map(x=>x.id),+el.dataset.i);}};
  q.oninput=draw;draw();q.focus();
}
function guideModal(ids,title){
  const p=modal(`<h2>📅 Guide TV · ${esc(title)}</h2><div class="list">${ids.map((id,i)=>{const c=db.channels[id];
    const fb=`<div class="ini" style="background:linear-gradient(hsl(${hue(c.name)} 70% 62%),hsl(${hue(c.name)} 65% 45%))">${esc((c.name.trim()[0]||'?').toUpperCase())}</div>`;
    return `<div class="item grow" tabindex="0" data-i="${i}"><div class="gl">${c.logo?`<img src="${esc(c.logo)}" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(fb)}">`:fb}</div><div class="gi"><b>${esc(c.name)} ${badgeQualite(c)}</b><span class="gn">…</span><div class="gbar"><i style="width:0"></i></div><span class="gx"></span></div></div>`;}).join('')||'<div class="note">Aucune chaîne avec guide ici.</div>'}</div><div class="row-btns"><button class="btn" data-x>Fermer</button></div>`,'wide');
  p.querySelector('[data-x]').onclick=closeModal;
  const fill=el=>getEpg(ids[+el.dataset.i]).then(l=>{if(!el.isConnected)return;const{now,next}=nowNext(l);
    el.querySelector('.gn').textContent=now?`${hm(now.start)}–${hm(now.end)}  ${now.title}`:'Pas d’information';
    el.querySelector('.gbar').style.visibility=now?'':'hidden';if(now)el.querySelector('.gbar i').style.width=pct(now)+'%';
    el.querySelector('.gx').textContent=next?`Ensuite ${hm(next.start)} · ${next.title}`:'';});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);fill(e.target);}}),{root:p});
  p.querySelectorAll('.grow').forEach(el=>{io.observe(el);el.onclick=()=>{closeModal();startQueue(ids,+el.dataset.i);};});
  const f=p.querySelector('.item');if(f)f.focus();
}
function settings(){
  if(MAJ&&!settings.frais){settings.frais=1;majRafraichir().then(()=>{settings();settings.frais=0;});return;}
  const p=modal(`<h2>Réglages</h2><div class="note">${APP?'📺 Appli Fire TV : connexion directe à ton Xtream, pas besoin du PC.':MAJ?'💻 Appli Menu TV pour PC (version '+esc(MAJ.version)+') : proxy intégré.':PROXY?'🟢 Proxy actif : l’Xtream, les flux et le guide passent par le PC.':'⚪ Proxy non détecté. Lance <b>node proxy.js</b> dans le dossier, puis ouvre <b>http://localhost:8787</b> (ou l’adresse affichée, depuis le Fire Stick).'}</div>${MAJ?`<button class="btn big" data-a="maj">⬇️ Mettre à jour l’appli ${MAJ.disponible?'· <b>nouvelle version disponible</b>':'· à jour'}</button><button class="btn big" data-a="majsrc">📁 Mises à jour depuis : ${esc(MAJ.source||'(aucun dossier)')}</button>`:''}<button class="btn big" data-a="xt">🔌 Connecter mon Xtream</button><button class="btn big" data-a="fr">🇫🇷 Ranger les chaînes françaises</button><button class="btn big" data-a="menu">🕹️ Type de menu : ${MENUS[prefs.menu||'grille']}</button><button class="btn big" data-a="theme">🎨 Thème : ${THEMES[prefs.theme||'classique']}</button><button class="btn big" data-a="music">🎵 Musique de fond : ${MUSIQUES[musicMode()]}</button><label class="vol">🔊 Volume des chaînes <b>${Math.round(volV()*100)} %</b><input type="range" min="0" max="100" step="5" data-v="vol" value="${Math.round(volV()*100)}"></label><label class="vol">🎵 Volume de la musique <b>${Math.round(musVol()*100)} %</b><input type="range" min="0" max="100" step="5" data-v="mvol" value="${Math.round(musVol()*100)}"></label><button class="btn big" data-a="edit">${edit?'✅ Quitter':'🧩 Activer'} le mode organisation</button><button class="btn big" data-a="demo">♻️ Remettre la démo</button><button class="btn big" data-a="help">⌨️ Raccourcis clavier / télécommande</button><div class="row-btns"><button class="btn" data-a="x">Fermer</button></div>`);
  p.oninput=e=>{const r=e.target.closest('[data-v]');if(!r)return;prefs[r.dataset.v]=r.value/100;if(r.dataset.v==='vol')prefs.mute=false;savePrefs();r.previousElementSibling.textContent=r.value+' %';if(r.dataset.v==='mvol')volMusique();};
  p.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
    if(a==='x')closeModal();
    else if(a==='xt'){closeModal();xtDialog();}
    else if(a==='maj'){closeModal();majAppliquer();}
    else if(a==='majsrc'){majChoisirSource().then(settings);}
    else if(a==='menu'){cycleMenu();settings();}
    else if(a==='theme'){cycleTheme();render();settings();}
    else if(a==='music'){cycleMusic();settings();}
    else if(a==='fr'){closeModal();
      if(db.demo){db=demo();ensureVod(db);path=[db.root];selStack=[];sel=0;save();render();toast('Démo : chaînes françaises rangées');return;}
      confirmBox('Refaire le rangement des chaînes françaises (TNT, Sport, Info…) ? Les dossiers français actuels sont recréés, tes favoris et tes dossiers perso sont gardés.',()=>{const n=rangerFr(db,false);path=[db.root];selStack=[];sel=0;save();render();toast(n+' chaînes françaises rangées');},'Ranger');}
    else if(a==='edit'){edit=!edit;closeModal();render();toast(edit?'Mode organisation activé':'Mode organisation désactivé');}
    else if(a==='demo'){closeModal();confirmBox('Remplacer tout le menu par la démo ?',()=>{db=demo();ensureVod(db);path=[db.root];selStack=[];sel=0;save();render();});}
    else if(a==='help'){p.innerHTML='<h2>Raccourcis</h2><div class="note" style="font-size:15px;line-height:1.8">← ↑ ↓ → : se déplacer (télécommande Fire Stick : croix directionnelle)<br>Entrée / OK : ouvrir ou lancer<br>Échap / Retour : revenir en arrière<br>Menu ≡ (ou S / *) : ajouter / retirer des favoris<br>Films / séries : ← → reculer / avancer · OK pause · ↑ ↓ volume<br>Dans le lecteur : ↑ ↓ chaîne suivante/précédente · ← → volume · M couper le son · F plein écran · ★ favori</div><div class="row-btns"><button class="btn" data-a="x">Fermer</button></div>';}
  };
}

