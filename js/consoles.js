/* ---------- menus façon console : barre croisée (PS3) et tuiles (PS4) ---------- */
/*
 * Deux autres façons d'afficher le même menu (mêmes dossiers, favoris, films…) :
 *   barre  : catégories sur une barre horizontale, contenu en colonne dessous, vagues en fond
 *   tuiles : rangée de grandes tuiles, panneau d'infos, image du programme en arrière-plan
 * Choix dans ⚙ Réglages → Type de menu. Le mode organisation repasse toujours en grille.
 * Visuels et animations originaux (aucun logo, icône ou son de console).
 */
const MENUS={grille:'Grille',barre:'Barre croisée · façon PS3',tuiles:'Tuiles · façon PS4'};
function menuConsole(){const m=prefs.menu;return !edit&&(m==='barre'||m==='tuiles')?m:'';}
function cycleMenu(){const k=Object.keys(MENUS);prefs.menu=k[(k.indexOf(prefs.menu||'grille')+1)%k.length];savePrefs();
  path=[db.root];selStack=[];sel=0;render();toast('Menu : '+MENUS[prefs.menu]);}
const barreLigne={};   // barre croisée : ligne choisie dans chaque catégorie
const cons=$('#console');
let consVer=0;

/* ---------- ce qu'on affiche pour chaque élément ---------- */
const REGLAGES_BARRE=[{t:'act',a:'menu'},{t:'act',a:'theme'},{t:'act',a:'music'},{t:'act',a:'xt'},{t:'set'}];
function infoEl(it){
  if(!it)return{ico:'',titre:'',sous:''};
  if(it.t==='wait')return{ico:'attente',titre:'Chargement…',sous:''};
  if(it.t==='set')return{ico:'reglages',titre:it.cat||(path.length===1&&menuConsole()==='tuiles')?'Réglages':'Tous les réglages',sous:'Thème, menu, son, Xtream…'};
  if(it.t==='act'){
    if(it.a==='menu')return{ico:'manette',titre:'Type de menu',sous:MENUS[prefs.menu||'grille']};
    if(it.a==='theme')return{ico:'palette',titre:'Thème',sous:THEMES[themeActuel()]};
    if(it.a==='music')return{ico:'musique',titre:'Musique de fond',sous:MUSIQUES[musicMode()]};
    return{ico:'signal',titre:'Connecter mon Xtream',sous:!db.xt?'Pas encore connecté':aboCache?texteAbonnement(aboCache.u).txt:'Connecté'};
  }
  if(it.t==='app')return{ico:APPLIS[it.k].ic,titre:APPLIS[it.k].nom,sous:sousAppli(it.k)};
  if(it.t==='all')return{ico:'recherche',titre:'Toutes les chaînes',sous:Object.values(db.channels).filter(c=>!c.kind).length+' chaînes'};
  if(it.t==='epg')return{ico:'guide',titre:'Guide TV',sous:'En ce moment à la télé'};
  if(it.t==='vsearch')return{ico:'recherche',titre:it.k==='vodcats'?'Rechercher un film':'Rechercher une série',sous:'Dans tout le catalogue'};
  if(it.t==='f'){const n=db.nodes[it.id];if(!n)return{ico:'dossier',titre:'?',sous:''};const k=n.children.length+n.channels.length;
    const auto=n.autoLogo&&n.channels.map(c=>db.channels[c]).find(c=>c&&c.logo);
    return{ico:iconeNoeud(n).nom,img:n.logo||(auto?auto.logo:''),affiche:!!n.affiche,titre:n.name,texte:n.plot||'',
      sous:n.lazy&&!charges.has(it.id)?'Ouvrir ›':(n.note?'★ '+n.note+' · ':'')+k+' élément'+(k>1?'s':'')};}
  const c=db.channels[it.id];if(!c)return{ico:'tv',titre:'?',sous:''};
  const pos=positions[c.id],vod=estVod(c);
  return{q:badgeQualite(c),ico:vod?(c.kind==='episode'?'tv':'film'):'tv',img:c.logo,affiche:vod,titre:c.name,texte:c.plot||'',fav:isFav(c.id),
    epg:hasEpg(c.id)?c.id:'',sous:vod?[c.note?'★ '+c.note:'',pos?'▶ reprise '+duree(pos):''].filter(Boolean).join(' · '):''};
}
function icoHtml(f,cls){
  const e=`<span class="${cls}-e">${f.ico?icone(f.ico,f.ico==='lecture'):''}</span>`;
  return f.img?`<img class="${cls}-i" src="${esc(f.img)}" referrerpolicy="no-referrer" alt="" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(e)}">`:e;
}
function elLigne(it){   // ligne de la barre croisée
  const f=infoEl(it),d=document.createElement('div');d.className='xb-it';
  d.innerHTML=`<div class="ic">${icoHtml(f,'ic')}</div><div class="tx"><b>${esc(f.titre)}${f.q?' '+f.q:''}${f.fav?' <i class="fv">'+icone('etoile',true)+'</i>':''}</b><span${f.epg?` data-epg="${esc(f.epg)}"`:''}>${esc(f.sous)}</span></div>`;
  return d;
}
function elTuile(it){   // tuile
  const f=infoEl(it),d=document.createElement('div');d.className='tu-t'+(f.affiche&&f.img?' aff':'');
  d.innerHTML=`<div class="tu-img">${icoHtml(f,'tu')}</div>${f.fav?'<i class="fv">'+icone('etoile',true)+'</i>':''}${f.q?'<div class="tu-q">'+f.q+'</div>':''}<div class="tu-nom">${esc(f.titre)}</div>`;
  return d;
}
/* Affiche les éléments [sel-avant, sel+apres] d'une longue liste en gardant les éléments déjà
   présents (pour que les déplacements soient animés). */
function fenetre(cont,cle,n,s,avant,apres,creer,placer){
  if(cont.dataset.cle!==cle){cont.innerHTML='';cont.dataset.cle=cle;}
  const garde=new Set();
  for(let i=Math.max(0,s-avant);i<=Math.min(n-1,s+apres);i++){
    garde.add(String(i));
    let el=cont.querySelector(':scope>[data-k="'+i+'"]');
    if(!el){el=creer(i);el.dataset.k=i;el.classList.add('neuf');cont.appendChild(el);placer(el,i);void el.offsetWidth;el.classList.remove('neuf');}
    else placer(el,i);
  }
  [...cont.children].forEach(el=>{if(!garde.has(el.dataset.k))el.remove();});
}

/* ---------- squelettes ---------- */
const SQ_BARRE=`<canvas class="xb-vague"></canvas><div class="c-haut"><img class="c-marque" src="img/favicon.png" alt=""><span class="c-heure"></span><button class="c-gear" title="Réglages">${icone('reglages')}</button></div>
<div class="xb-barre"></div><div class="xb-col"></div>
<div class="xb-sous"><div class="xb-parent"></div><div class="xb-trait"></div><div class="xb-liste"></div></div>
<div class="c-aide">OK  ouvrir   ·   Retour  revenir   ·   ≡  favori</div>`;
const SQ_TUILES=`<div class="tu-fond"><img class="tu-hero" alt=""></div><div class="tu-bulles"></div>
<div class="c-haut"><img class="c-marque" src="img/favicon.png" alt=""><span class="tu-fil"></span><span class="c-heure"></span><button class="c-gear" title="Réglages">${icone('reglages')}</button></div>
<div class="tu-rang"></div><div class="tu-info"></div>
<div class="c-aide">OK  ouvrir   ·   Retour  revenir   ·   ≡  favori</div>`;

function renderConsole(){
  consVer++;$('#app').hidden=true;cons.hidden=false;
  const m=menuConsole();
  if(cons.dataset.mode!==m){cons.dataset.mode=m;cons.className='c-'+m;cons.innerHTML=m==='barre'?SQ_BARRE:SQ_TUILES;demarrerVagues();}
  dessineConsole();
}
function dessineConsole(){
  if(menuConsole()==='barre')dessineBarre();else dessineTuiles();
  heureConsole();
  cons.querySelectorAll('[data-epg]').forEach(el=>{if(el.dataset.ok)return;el.dataset.ok=1;
    getEpg(el.dataset.epg).then(l=>{const{now}=nowNext(l);if(now&&el.isConnected)el.textContent='En ce moment : '+now.title;});});
}
function heureConsole(){const d=new Date(),h=cons.querySelector('.c-heure');
  if(h)h.textContent=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})+'   '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
setInterval(()=>{if(!cons.hidden)heureConsole();},10000);

/* ---------- barre croisée ---------- */
const racineBarre=()=>itemsDe(db.nodes[db.root],true).concat([{t:'set',cat:1}]);
const cleCat=c=>c.id||c.t;
function colonne(cat){
  if(!cat)return[];
  if(cat.t==='set')return REGLAGES_BARRE;
  if(cat.t!=='f')return[cat];
  const n=db.nodes[cat.id];
  if(n.lazy&&!charges.has(cat.id)){   // Films / Séries : chargés quand on passe dessus
    chargerDossier(cat.id).then(ok=>{if(ok&&menuConsole()==='barre'&&path.length===1)renderConsole();});
    return[{t:'wait'}];
  }
  return itemsDe(n,false);
}
function dessineBarre(){
  const racine=path.length===1;cons.classList.toggle('xb-niveau',!racine);
  if(racine){
    const cats=racineBarre();sel=Math.max(0,Math.min(sel,cats.length-1));
    const bar=cons.querySelector('.xb-barre'),cle=consVer+':'+cats.length;
    if(bar.dataset.cle!==cle){bar.dataset.cle=cle;
      bar.innerHTML=cats.map((c,i)=>{const f=infoEl(c);return`<div class="xb-cat" data-c="${i}"><div class="xb-ico">${icoHtml(f,'xb')}</div><b>${esc(f.titre)}</b></div>`;}).join('');}
    bar.querySelectorAll('.xb-cat').forEach(el=>{const i=+el.dataset.c;el.style.transform=`translateX(${(i-sel)*100}%)`;el.classList.toggle('on',i===sel);});
    const cat=cats[sel],col=colonne(cat),k=cleCat(cat);
    const r=Math.max(0,Math.min(barreLigne[k]||0,col.length-1));barreLigne[k]=r;
    fenetre(cons.querySelector('.xb-col'),consVer+':'+k+':'+col.length+':'+(col[0]&&col[0].t),col.length,r,5,8,i=>elLigne(col[i]),(el,i)=>{
      const d=i-r;el.style.transform=`translateY(${d<0?d*100-185:d*100+(d>0?35:0)}%)`;el.classList.toggle('on',i===r);el.classList.toggle('haut',d<0);});
  }else{
    const n=cur(),its=items();sel=Math.max(0,Math.min(sel,its.length-1));
    const par=cons.querySelector('.xb-parent'),cle=consVer+':'+n.id;
    if(par.dataset.cle!==cle){par.dataset.cle=cle;const f=infoEl({t:'f',id:n.id});
      par.innerHTML=`<div class="xbp">${icoHtml(f,'xbp')}</div><b>${esc(n.name)}</b><span>${esc(path.slice(1,-1).map(id=>db.nodes[id].name).join(' › '))}</span>`;}
    fenetre(cons.querySelector('.xb-liste'),cle+':'+its.length,its.length,sel,5,8,i=>elLigne(its[i]),(el,i)=>{
      const d=i-sel;el.style.transform=`translateY(${d*100+(d>0?35:0)}%)`;el.classList.toggle('on',i===sel);});
  }
}
// OK sur une ligne de la colonne (accueil de la barre croisée)
function ouvrirColonne(){
  const cats=racineBarre(),cat=cats[sel],col=colonne(cat),it=col[barreLigne[cleCat(cat)]||0];
  if(!it||it.t==='wait')return;
  if(it.t==='act'||it.t==='set'){actionConsole(it);return;}
  if(cat.t!=='f'){activate(it);return;}
  if(it.t==='f'&&db.nodes[it.id].lazy&&!charges.has(it.id)){chargerDossier(it.id).then(ok=>{if(ok)ouvrirColonne();});return;}
  selStack.push(sel);path.push(cat.id);sel=barreLigne[cleCat(cat)]||0;
  activate(it);
  if(it.t!=='f'){path.pop();sel=selStack.pop()||0;dessineConsole();}   // chaîne, guide, recherche : on reste sur la barre
}

/* ---------- tuiles ---------- */
function itemsConsole(){const a=items();if(menuConsole()==='tuiles'&&path.length===1)a.push({t:'set'});return a;}
function dessineTuiles(){
  const its=itemsConsole();sel=Math.max(0,Math.min(sel,its.length-1));
  fenetre(cons.querySelector('.tu-rang'),consVer+':'+cur().id+':'+its.length,its.length,sel,2,9,i=>elTuile(its[i]),(el,i)=>{
    const d=i-sel;el.style.transform=`translateX(${d<=0?d*112:d*112+45}%) scale(${d===0?1.42:1})`;el.classList.toggle('on',d===0);el.style.opacity=d<-1?0:1;});
  cons.querySelector('.tu-fil').textContent=path.length>1?path.slice(1).map(id=>db.nodes[id].name).join('  ›  '):'Accueil';
  const it=its[sel],f=infoEl(it),info=cons.querySelector('.tu-info');
  info.innerHTML=`<h1>${esc(f.titre)}${f.q?' '+f.q:''}</h1><div class="tu-sous"${f.epg?` data-epg="${esc(f.epg)}"`:''}>${esc(f.sous)}</div>${f.texte?`<p>${esc(f.texte)}</p>`:''}<div class="tu-ensuite"></div>`;
  if(f.epg)getEpg(f.epg).then(l=>{const{now,next}=nowNext(l),e=info.querySelector('.tu-ensuite');if(!e||!e.isConnected)return;
    e.innerHTML=(now?`<div class="tu-prog"><b>${hm(now.start)} – ${hm(now.end)}</b> ${esc(now.title)}<div class="gbar"><i style="width:${pct(now)}%"></i></div>${now.desc?`<p>${esc(now.desc)}</p>`:''}</div>`:'')+(next?`<div class="tu-prog suite">Ensuite ${hm(next.start)} · ${esc(next.title)}</div>`:'');});
  const hero=cons.querySelector('.tu-hero');
  if(f.img&&f.affiche){if(hero.getAttribute('src')!==f.img){hero.classList.remove('on');hero.onload=()=>hero.classList.add('on');hero.onerror=()=>hero.classList.remove('on');hero.src=f.img;}else hero.classList.add('on');}
  else hero.classList.remove('on');
}

/* ---------- actions ---------- */
function actionConsole(it){
  if(it.t==='set'){settings();return;}
  if(it.a==='menu')cycleMenu();
  else if(it.a==='theme'){cycleTheme();renderConsole();}
  else if(it.a==='music'){cycleMusic();renderConsole();}
  else if(it.a==='xt')xtDialog();
}
function activerConsole(it){if(!it)return;if(it.t==='set'||it.t==='act')actionConsole(it);else activate(it);}

/* ---------- télécommande / clavier ---------- */
function toucheConsole(e){
  const m=menuConsole(),k=e.key,bouge=()=>{e.preventDefault();tick();dessineConsole();return true;};
  const fav=it=>{e.preventDefault();if(it&&it.t==='c')toggleFav(it.id);return true;};
  if(k==='Home'||k==='GoHome'){e.preventDefault();home();return true;}
  if(m==='barre'&&path.length===1){
    const cats=racineBarre(),cat=cats[sel],col=colonne(cat),c=cleCat(cat),r=barreLigne[c]||0;
    if(k==='ArrowRight'){if(sel<cats.length-1)sel++;return bouge();}
    if(k==='ArrowLeft'){if(sel>0)sel--;return bouge();}
    if(k==='ArrowDown'){if(r<col.length-1)barreLigne[c]=r+1;return bouge();}
    if(k==='ArrowUp'){if(r>0)barreLigne[c]=r-1;return bouge();}
    if(k==='Enter'||k===' '){e.preventDefault();tick();ouvrirColonne();return true;}
    if(k==='Escape'||k==='Backspace'){e.preventDefault();toast('Tu es déjà à l’accueil');return true;}
    if(k==='ContextMenu'||k==='*'||k==='s'||k==='S')return fav(col[r]);
    return false;
  }
  const its=itemsConsole(),barre=m==='barre';
  if(k===(barre?'ArrowDown':'ArrowRight')){if(sel<its.length-1)sel++;return bouge();}
  if(k===(barre?'ArrowUp':'ArrowLeft')){if(sel>0)sel--;return bouge();}
  if(!barre&&(k==='ArrowDown'||k==='ArrowUp')){sel=Math.max(0,Math.min(its.length-1,sel+(k==='ArrowDown'?5:-5)));return bouge();}
  if(barre&&k==='ArrowRight'){const it=its[sel];if(it&&it.t==='f'){e.preventDefault();tick();activerConsole(it);}return true;}
  if(barre&&k==='ArrowLeft'){e.preventDefault();back();return true;}
  if(k==='Enter'||k===' '){e.preventDefault();tick();activerConsole(its[sel]);return true;}
  if(k==='Escape'||k==='Backspace'){e.preventDefault();back();return true;}
  if(k==='ContextMenu'||k==='*'||k==='s'||k==='S')return fav(its[sel]);
  return false;
}
// souris
cons.addEventListener('click',e=>{
  if(e.target.closest('.c-gear')){settings();return;}
  const cat=e.target.closest('.xb-cat');if(cat){sel=+cat.dataset.c;tick();dessineConsole();return;}
  const el=e.target.closest('[data-k]');if(!el)return;const i=+el.dataset.k;
  if(el.closest('.xb-col')){const c=cleCat(racineBarre()[sel]);if((barreLigne[c]||0)===i)ouvrirColonne();else{barreLigne[c]=i;tick();dessineConsole();}return;}
  if(i===sel)activerConsole(itemsConsole()[i]);else{sel=i;tick();dessineConsole();}
});

/* ---------- fond animé de la barre croisée : rubans lumineux ---------- */
// teinte selon l'heure (nuit bleu nuit, matin bleu clair, soir orangé, soirée violette) ou thème Néon Vice
function teinte(){
  if(themeActuel()==='vice')return{h:318,s:70};
  const h=new Date().getHours();
  return h<6?{h:228,s:55}:h<10?{h:198,s:60}:h<17?{h:210,s:65}:h<20?{h:24,s:70}:{h:268,s:50};
}
let vagueRaf=0;
function demarrerVagues(){
  cancelAnimationFrame(vagueRaf);
  const cv=cons.querySelector('.xb-vague');if(!cv)return;
  const g=cv.getContext('2d');let dernier=0,W=0,H=0;
  const boucle=ts=>{
    vagueRaf=requestAnimationFrame(boucle);
    if(cons.hidden||!player.hidden||document.hidden||ts-dernier<40)return;   // ~25 images/s, en pause sinon
    dernier=ts;
    const w=Math.round(innerWidth/2),h=Math.round(innerHeight/2);
    if(w!==W||h!==H){W=cv.width=w;H=cv.height=h;}
    const c=teinte(),t=ts/1000;
    const fond=g.createLinearGradient(0,0,0,H);
    fond.addColorStop(0,`hsl(${c.h},${c.s}%,30%)`);fond.addColorStop(.55,`hsl(${c.h},${c.s}%,18%)`);fond.addColorStop(1,`hsl(${c.h},${c.s}%,7%)`);
    g.globalCompositeOperation='source-over';g.fillStyle=fond;g.fillRect(0,0,W,H);
    g.globalCompositeOperation='lighter';
    for(let k=0;k<4;k++){
      const base=H*(.52+k*.035),amp=H*(.05+k*.018),f=(1.6+k*.45)/W,v=t*(.18+k*.07),ep=H*(.01+k*.012);
      g.beginPath();
      for(let x=0;x<=W;x+=6)g.lineTo(x,base+Math.sin(x*f*Math.PI+v+k)*amp+Math.sin(x*f*2.3+v*1.7)*amp*.35);
      for(let x=W;x>=0;x-=6)g.lineTo(x,base+ep+Math.sin(x*f*Math.PI+v+k+.6)*amp*.92+Math.sin(x*f*2.1+v*1.5)*amp*.3);
      g.closePath();
      g.fillStyle=`hsla(${c.h},80%,85%,${.07+k*.02})`;g.fill();
    }
  };
  vagueRaf=requestAnimationFrame(boucle);
}
