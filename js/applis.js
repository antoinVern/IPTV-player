/* ---------- YouTube, Twitch, Spotify ---------- */
/*
 * Dossier « 📱 Applis » à l'accueil. Ce qui se passe à l'ouverture dépend de l'appareil :
 *   - appli PC (.exe)  : fenêtre dédiée, YouTube en interface TV, pubs bloquées (electron/main.js) ;
 *                        Spotify : appli Spotify si installée, sinon navigateur
 *   - appli Fire TV    : lance l'appli installée (SmartTube d'abord pour YouTube : sans pub),
 *                        sinon ouvre l'Appstore (MainActivity.java)
 *   - navigateur       : nouvel onglet
 */
const APPLIS={
  youtube:{nom:'YouTube',ico:'▶️',glyphe:'▶',coul:'#e62117',web:'https://www.youtube.com/'},
  twitch:{nom:'Twitch',ico:'🎮',glyphe:'◆',coul:'#9146ff',web:'https://www.twitch.tv/'},
  spotify:{nom:'Spotify',ico:'🎵',glyphe:'♫',coul:'#1db954',web:'https://open.spotify.com/'},
};
const ITEMS_APPLIS=Object.keys(APPLIS).map(k=>({t:'app',k}));
let appliOuverte=false;   // la musique de fond se tait pendant qu'une appli est ouverte

function sousAppli(k){
  if(window.MenuTVAndroid)return k==='youtube'?'SmartTube (sans pub) ou YouTube':'Appli '+APPLIS[k].nom;
  if(MAJ)return k==='spotify'?'Appli Spotify ou navigateur':k==='youtube'?'Interface TV · pubs bloquées':'Pubs bloquées';
  return'Nouvel onglet';
}
async function ouvrirAppli(k){
  const a=APPLIS[k];if(!a)return;
  if(window.MenuTVAndroid){                                     // Fire TV
    const r=MenuTVAndroid.ouvrirAppli(k);
    if(r==='store')toast(a.nom+' n’est pas installé : installe-le depuis l’Appstore');
    else if(r==='absent')toast(a.nom+' n’est pas installé sur cet appareil');
    else if(k==='youtube'&&!/teamsmart|smarttube/.test(r))setTimeout(()=>toast('Astuce : installe SmartTube pour YouTube sans pub'),300);
    return;
  }
  if(MAJ){                                                      // appli PC
    toast('Ouverture de '+a.nom+'…');
    const r=await fetch('/__appli?nom='+k,{method:'POST'})
      .then(x=>x.ok?x.json():{ok:false,erreur:x.status===404?'installe la nouvelle version de l’appli PC (Installer Menu TV.exe)':'erreur '+x.status})
      .catch(e=>({ok:false,erreur:e.message}));
    if(!r.ok){toast('Impossible d’ouvrir '+a.nom+' : '+(r.erreur||'?'));return;}
    if(r.externe==='navigateur')toast('Spotify s’ouvre dans ton navigateur (installe l’appli Spotify pour l’ouvrir directement)');
    else if(r.externe==='appli')toast('Spotify s’ouvre dans son appli');
    else{appliOuverte=true;ambiance();if(r.pubs===false)toast('Bloqueur de pubs indisponible pour l’instant (pas d’internet ?)');}
    return;
  }
  window.open(a.web,'_blank');                                  // navigateur
  toast(a.nom+' ouvert dans un nouvel onglet · pour bloquer les pubs : extension uBlock Origin');
}
// retour dans Menu TV (fenêtre de l'appli fermée) : la musique peut reprendre
addEventListener('focus',()=>{if(appliOuverte){appliOuverte=false;ambiance();}});
