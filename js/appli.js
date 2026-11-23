/* ---------- appli Fire TV (Android) ---------- */
/*
 * Ces fonctions sont appelées par l'appli Android (MainActivity.java) pour les touches
 * qui n'arrivent pas jusqu'à la page : Retour, Menu ≡, lecture/pause, avance/retour rapide.
 * Dans un navigateur normal, elles ne servent pas.
 */
if(APP)document.documentElement.classList.add('appli');

const touche=k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
let retourT=0;
window.appKey=function(k){
  if(k==='back'){
    if(!$('#modal').hidden||!player.hidden||path.length>1){touche('Escape');return 'ok';}
    if(Date.now()-retourT<2500)return 'exit';            // 2e appui à l'accueil : on quitte
    retourT=Date.now();toast('Appuie encore sur Retour pour quitter');return 'ok';
  }
  if(k==='menu'){touche('ContextMenu');return 'ok';}
  if(!player.hidden&&estVod(db.channels[queue[qi]])){   // film : ⏩ ⏪ = avancer / reculer
    if(k==='next')avance(30);else if(k==='prev')avance(-10);else if(k==='playpause')pauseLecture();
    return 'ok';
  }
  if(!player.hidden){
    if(k==='next')zap(1);
    else if(k==='prev')zap(-1);
    else if(k==='playpause'){if(vid.paused)vid.play().catch(()=>{});else vid.pause();bar();}
  }
  return 'ok';
};
// appli mise en arrière-plan (bouton Accueil) : on coupe la chaîne et la musique
window.appPause=function(){if(!player.hidden)closePlayer();synth.stop();fichier.stop();};
window.appResume=function(){ambiance();};
