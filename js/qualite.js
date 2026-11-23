/* ---------- qualité d'image des chaînes ---------- */
/*
 * Badge sur chaque chaîne :
 *   - annoncée (contour) : d'après le nom donné par le fournisseur (4K, FHD, HD, SD…)
 *   - mesurée (plein, ✓) : la vraie résolution, retenue quand tu regardes la chaîne
 *     (la meilleure atteinte pendant le dernier visionnage) — elle remplace l'annoncée.
 * Aucune connexion en plus au fournisseur.
 */
const QKEY='menutv.qualite';
let qualitesVues=(()=>{try{return JSON.parse(localStorage.getItem(QKEY))||{}}catch(e){return{}}})();
const libelleHauteur=h=>h>=2000?'4K':h>=1000?'1080p':h>=700?'720p':h?'SD':'';
function qualiteAnnoncee(nom){
  const n=majuscules(nom);
  return /\b(UHD|4K|2160P?)\b/.test(n)?'4K'
    :/\b(FHD|FULL ?HD|1080[PI]?)\b/.test(n)?'1080p'
    :/\b(HD|HQ|720P?)\b/.test(n)?'720p'
    :/\b(SD|LQ|480P?|576P?)\b/.test(n)?'SD':'';
}
function qualiteChaine(c){
  if(!c)return null;
  const h=qualitesVues[c.id];
  if(h)return{l:libelleHauteur(h),vue:true};
  const l=c.kind?'':qualiteAnnoncee(c.name);   // films : seulement la mesure
  return l?{l,vue:false}:null;
}
function badgeQualite(c){
  const q=qualiteChaine(c);if(!q)return'';
  const cls={'4K':'q4k','1080p':'q1080','720p':'q720'}[q.l]||'qsd';
  return `<span class="qb ${cls}${q.vue?' vue':''}" title="${q.vue?'Qualité mesurée quand tu as regardé la chaîne':'Qualité annoncée par le fournisseur'}">${q.l}${q.vue?' ✓':''}</span>`;
}
function retenirQualite(id,h){
  if(!id||!h||qualitesVues[id]===h)return;
  qualitesVues[id]=h;
  const k=Object.keys(qualitesVues);if(k.length>3000)delete qualitesVues[k[0]];
  try{localStorage.setItem(QKEY,JSON.stringify(qualitesVues))}catch(e){}
}
