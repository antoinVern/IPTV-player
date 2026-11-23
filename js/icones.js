/* ---------- icônes (vectorielles, dessinées pour Menu TV) ---------- */
/*
 * Remplacent les emojis : trait de 2 px, coins arrondis, grille 24×24, couleur = currentColor.
 *   icone(nom, plein)      → <svg>  (plein : forme remplie, ex. étoile des favoris)
 *   pastille(nom, couleurs) → icône blanche dans une pastille dégradée (grille)
 *   iconeNoeud(dossier)     → { nom, coul } d'après le dossier (favoris, films…) ou son ancien emoji
 */
const ICONES={
  recherche:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/>',
  etoile:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3 9h4.5M3 15h4.5M16.5 9H21M16.5 15H21"/>',
  serie:'<rect x="3" y="7.5" width="15" height="11" rx="2"/><path d="M7 4.5h11.5A2.5 2.5 0 0 1 21 7v8.5"/><path d="m9.2 10.6 4.6 2.4-4.6 2.4z"/>',
  applis:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  tv:'<rect x="2.5" y="6.5" width="19" height="13" rx="2.5"/><path d="m8.5 2.5 3.5 4 3.5-4"/>',
  trophee:'<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 3 4.2M17 6h2.5a2.5 2.5 0 0 1-3 4.2M12 14v3.5M8.5 20.5h7M10 17.5h4v3h-4z"/>',
  info:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8.5h10M7 12.5h4.5M7 16h4.5M14 12h3v4h-3z"/>',
  cine:'<rect x="3" y="9.5" width="18" height="10.5" rx="2"/><path d="m3.4 9.5-.9-3.2 16.4-4.4.9 3.2zM7.6 5.2l2.1 3M12.7 3.9l2.1 3"/>',
  enfants:'<path d="M12 3a6 6 0 0 0-6 6c0 4.2 3.6 7.2 6 7.2s6-3 6-7.2a6 6 0 0 0-6-6z"/><path d="m12 16.2-1 2h2zM12 18.2c0 1.8-2 2-2 3.8"/>',
  decouverte:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  musique:'<path d="M9 18V5.5l11-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  regions:'<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  drapeau:'<path d="M5 21V3.5M5 4h12.5l-2.5 4.2 2.5 4.3H5"/>',
  dossier:'<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2.2 2.2h7.3A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
  fournisseur:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
  guide:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.5h3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  attente:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  reglages:'<path d="M4 6h9.5M18.5 6H20M4 12h3.5M12.5 12H20M4 18h11.5"/><circle cx="16" cy="6" r="2.3"/><circle cx="10" cy="12" r="2.3"/><circle cx="18" cy="18" r="2.3"/>',
  manette:'<path d="M7.5 7.5h9a4.5 4.5 0 0 1 4.5 4.5v1.7a3.3 3.3 0 0 1-6 1.9l-1.2-1.6h-3.6L9 15.6a3.3 3.3 0 0 1-6-1.9V12a4.5 4.5 0 0 1 4.5-4.5z"/><path d="M7.5 10.2v3.4M5.8 11.9h3.4M15.8 11.2h.01M17.8 13.2h.01"/>',
  palette:'<path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><path d="M7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01"/>',
  signal:'<path d="M2.5 9.5a13.5 13.5 0 0 1 19 0M5.5 12.8a9 9 0 0 1 13 0M8.6 16a4.6 4.6 0 0 1 6.8 0"/><path d="M12 19.5h.01"/>',
  balle:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.7c3 2.6 3 10 0 12.6M18.4 5.7c-3 2.6-3 10 0 12.6"/>',
  maison:'<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h4.5v-6h4v6h4.5V9.5"/>',
  retour:'<path d="M19 12H5.5M11 6l-6 6 6 6"/>',
  fermer:'<path d="M6 6l12 12M18 6 6 18"/>',
  pleinecran:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  son:'<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 5.8a8.8 8.8 0 0 1 0 12.4"/>',
  sonbas:'<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z"/><path d="M16 8.5a5 5 0 0 1 0 7"/>',
  muet:'<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  lecture:'<path d="M7.5 4.8v14.4L19 12z"/>',
  direct:'<circle cx="12" cy="12" r="2.4"/><path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>',
  telecharger:'<path d="M12 3.5v11.5M7 10l5 5 5-5M5 20h14"/>',
  crayon:'<path d="M4 20h4L19.2 8.8a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  recharger:'<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5L20 15.5M20 20v-4.5h-4.5"/>',
  gauche:'<path d="m15 6-6 6 6 6"/>',
  droite:'<path d="m9 6 6 6-6 6"/>',
  copier:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  clavier:'<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10.2 10h.01M13.8 10h.01M17.5 10h.01M7 14h10"/>',
};
// icônes proposées pour les dossiers perso
const CHOIX_ICONES=['dossier','tv','trophee','balle','film','serie','cine','info','enfants','decouverte','musique','regions','drapeau','etoile','applis','guide'];
const COULEURS={
  tv:['#4f8dff','#2357d9'],trophee:['#ffb547','#e07b00'],info:['#7b8aa8','#46536e'],cine:['#b16bff','#7a2fe0'],
  enfants:['#ff7ab8','#e0357f'],decouverte:['#3ed37a','#14964b'],musique:['#e66bff','#a729c9'],regions:['#ff6b6b','#d62f3a'],
  drapeau:['#4f8dff','#e8434f'],dossier:['#9aa8bf','#66748f'],fournisseur:['#c79a5b','#8a6031'],etoile:['#ffd24a','#f29a00'],
  film:['#8f6bff','#5b33e0'],serie:['#ff9a4d','#e8590c'],applis:['#2fd0bf','#0e8f86'],recherche:['#2fc6ec','#0b85b0'],
  guide:['#7a7dff','#4a46e0'],plus:['#9aa8bf','#66748f'],balle:['#3ed37a','#14964b'],attente:['#9aa8bf','#66748f'],
  reglages:['#7b8aa8','#46536e'],manette:['#7a7dff','#4a46e0'],palette:['#ff6bb0','#d6307a'],signal:['#38b6ff','#0f73c2'],
};
function icone(nom,plein){
  const d=ICONES[nom]||ICONES.dossier;
  return `<svg class="isvg" viewBox="0 0 24 24" aria-hidden="true" fill="${plein?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function pastille(nom,coul){
  const c=coul||COULEURS[nom]||COULEURS.dossier;
  return `<span class="pastille" style="--pa:${c[0]};--pb:${c[1]}">${icone(nom,nom==='lecture')}</span>`;
}
// anciens emojis enregistrés dans les dossiers → icône (les sous-dossiers Sport gardent leur couleur)
const EMOJI_ICONE={'📺':'tv','🏆':'trophee','📰':'info','🎬':'cine','🧸':'enfants','🌍':'decouverte','🎵':'musique','📍':'regions',
  '🇫🇷':'drapeau','📁':'dossier','📂':'dossier','📦':'fournisseur','⭐':'etoile','🍿':'serie','📱':'applis','🔍':'recherche','📅':'guide'};
const EMOJI_SPORT={'🟣':['#a76bff','#6d2fd6'],'🔴':['#ff5a5a','#c91f2c'],'⚫':['#5b6375','#2b303c'],'⚪':['#b9c2d0','#7d8799'],
  '🔵':['#4f9dff','#1f5fd0'],'⚽':['#3ed37a','#14964b'],'🏅':['#ffb547','#e07b00']};
function pastilleNoeud(n){const x=iconeNoeud(n);return pastille(x.nom,x.coul);}
function iconeNoeud(n){
  if(!n)return{nom:'dossier'};
  if(n.id===db.favId)return{nom:'etoile'};
  const v=db.vodIds||{};
  if(n.id===v.films)return{nom:'film'};
  if(n.id===v.series)return{nom:'serie'};
  if(n.id===v.applis)return{nom:'applis'};
  if(n.id===db.provId)return{nom:'fournisseur'};
  if(EMOJI_SPORT[n.icon])return{nom:'balle',coul:EMOJI_SPORT[n.icon]};
  if(ICONES[n.icon])return{nom:n.icon};               // nom d'icône choisi directement
  return{nom:EMOJI_ICONE[n.icon]||'dossier'};
}
