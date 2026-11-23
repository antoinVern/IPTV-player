/* ---------- chaînes françaises : rangement automatique ---------- */
/*
 * Trie les chaînes françaises de l'Xtream (préfixe « FR: », « FR | »… ou catégorie France)
 * dans des dossiers TNT / Sport / Info / Cinéma…, rangés en tête du menu.
 * Les catégories d'origine du fournisseur sont regroupées dans « 📦 Fournisseur ».
 *
 * Règles : [dossier, motif sur le nom nettoyé (majuscules, sans accents ni « HD/FHD »), aussi?]
 * La première règle qui correspond gagne. Avec aussi=1, la chaîne est rangée là ET continue
 * vers les règles suivantes (ex. BFM TV : TNT + Info). L'ordre des règles = l'ordre d'affichage.
 * Pour ajouter une chaîne ou un dossier : ajoute une ligne ici.
 */
// À augmenter à chaque changement des règles : les menus déjà rangés sont re-rangés au chargement.
const FR_VERSION=4;
// note de qualité d'après le nom : 4K > FHD > RAW (flux d'origine) > HD > inconnu > SD
function qualite(nom){const n=majuscules(nom);
  return /\b(UHD|4K|2160P?)\b/.test(n)?5:/\b(FHD|1080P?)\b/.test(n)?4:/\bRAW\b/.test(n)?3:/\b(HD|720P?)\b/.test(n)?2:/\b(SD|LQ|480P?)\b/.test(n)?0:1;}
const FR_ICONES={'TNT':'📺','Sport':'🏆','beIN SPORTS':'🟣','RMC Sport':'🔴','DAZN':'⚫','Canal+ Sport':'⚪','Eurosport':'🔵',
  'Ligue 1+':'⚽','Autres sports':'🏅','Info':'📰','Chaînes ciné & séries':'🎬','Enfants':'🧸','Découverte':'🌍',
  'Musique':'🎵','Régions':'📍','Autres chaînes FR':'🇫🇷'};
const FR_ORDRE=['TNT','Sport','Info','Chaînes ciné & séries','Enfants','Découverte','Musique','Régions','Autres chaînes FR'];
const FR_REGLES=[
  // Sport (avant la TNT : « CANAL+ SPORT » ne doit pas finir dans Canal+)
  ['Sport/beIN SPORTS',/\bBEIN ?(SPORTS?|MAX)\b/], // pas beIN MOVIES / SERIES / DRAMA…
  ['Sport/RMC Sport',/\bRMC ?SPORT/],
  ['Sport/DAZN',/\bDAZN\b/],
  ['Sport/Canal+ Sport',/\bCANAL ?\+ ?(SPORT|FOOT|LIVE|PREMIER|MOTO|F1|GOLF|TOP ?14|RUGBY)|\bC ?\+ ?(SPORT|FOOT|LIVE)|\bFOOT ?\+|\bINFOSPORT/],
  ['Sport/Eurosport',/\bEUROSPORT/],
  ['Sport/Ligue 1+',/\bLIGUE ?1\b|\bL1 ?\+/],
  ['Sport/Autres sports',/\b(PRIME|AMAZON)\b.*\b(SPORT|FOOT|LIGUE|MATCH|TENNIS|NBA)/], // Amazon films → pas ici
  ['Sport/Autres sports',/\bL ?EQUIPE\b/,1],
  ['Sport/Autres sports',/SPORT|\bGOLF|EQUIDIA|AUTO ?MOTO|\bMOTORS|\b(OL|OM|PSG) ?TV\b|TENNIS|\bMMA\b|\bUFC\b|\bNBA\b|\bNFL\b|\bFOOT|RUGBY|\bBOXE|CYCLIS|\bFIGHT|EXTREME|\bF1\b/],
  // TNT, dans l'ordre des numéros
  ['TNT',/^TF ?1\b(?! ?SERIES)/],
  ['TNT',/^FRANCE ?2\b/],
  ['TNT',/^FRANCE ?3( NAT(IONAL)?)?$/],
  ['TNT',/^CANAL ?\+( EN CLAIR)?$/],
  ['TNT',/^FRANCE ?5\b/],
  ['TNT',/^M ?6\b(?! ?MUSIC)/],
  ['TNT',/^ARTE\b/],
  ['TNT',/^C ?8\b/],
  ['TNT',/^W ?9\b/],
  ['TNT',/^TMC\b/],
  ['TNT',/^TFX\b/],
  ['TNT',/^NRJ ?12\b/],
  ['TNT',/^LCP\b|^PUBLIC SENAT/,1],
  ['TNT',/^FRANCE ?4\b/],
  ['TNT',/^BFM ?TV\b/,1],
  ['TNT',/^C ?NEWS\b/,1],
  ['TNT',/^C ?STAR\b/],
  ['TNT',/^GULLI\b/,1],
  ['TNT',/^TF ?1 ?SERIES/],
  ['TNT',/^L ?EQUIPE\b/],
  ['TNT',/^6 ?TER\b/],
  ['TNT',/^RMC ?STORY\b/],
  ['TNT',/^RMC ?DECOUVERTE\b/,1],
  ['TNT',/^CHERIE ?25\b/],
  ['TNT',/^LCI\b/,1],
  ['TNT',/^FRANCE ?INFO\b/,1],
  // Régions (France 3 régionales, BFM locales…)
  ['Régions',/^FRANCE ?3 \w|^BFM (?!TV\b|BUSINESS\b)\w|^(TV ?7|TL ?7|TEBEO|TVR|8 MONT BLANC|ALSACE 20|VIA\b)/],
  ['Info',/\bBFM|\bC ?NEWS\b|\bLCI\b|FRANCE ?INFO|FRANCE ?24|EURONEWS|\bTV ?5|\bI ?24|\bLCP\b|PUBLIC SENAT|\bCNN\b|BLOOMBERG|AFRICA ?24|AL JAZEERA|\bINFO\b|\bNEWS\b/],
  ['Enfants',/GULLI|CANAL ?J\b|\bTIJI|\bPIWI|CARTOON|BOOMERANG|DISNEY|\bNICK|TELETOON|\bBOING|MANGAS|GAME ?ONE|\bJ ?ONE\b|CANAL ?\+ ?KIDS|TOONAMI|BABY ?TV|\bANIME|\bKIDS?\b|JUNIOR/],
  ['Découverte',/PLANETE|DISCOVERY|NAT(IONAL)? ?GEO|HISTOIRE|USHUAIA|SCIENCE|ANIMAUX|SEASONS|CHASSE|\bTREK\b|MONTAGNE|CANAL ?\+ ?DOCS?|RMC ?DECOUVERTE|MY ?ZEN|CRIME ?DISTRICT|\bDOCU/],
  ['Musique',/\bMTV|\bMCM\b|M ?6 ?MUSIC|NRJ ?HITS|\bTRACE\b|MELODY|MEZZO|C ?STAR|FUN ?RADIO|\bRFM\b|B ?BLACK|CLUBBING|DJAZZ|OKLM|MUSI[CQ]|\bRTL ?2\b|VIRGIN/],
  ['Chaînes ciné & séries',/\bCANAL ?\+|CINE|\bOCS\b|PARAMOUNT|\bTCM\b|\bACTION\b|POLAR|WARNER|SYFY|13 ?E(ME)? ?RUE|SERIE|COMEDIE|\bAB ?1\b|PARIS PREMIERE|\bTEVA\b|\bRTL ?9\b|NOVELAS|\bFILMS?\b|\bMOVIES?\b|NETFLIX|APPLE ?TV/],
];

const FR_PREFIXE=/^[^A-Z0-9]*(?:(?:FR|FRA|FRENCH|VF)(?=[^A-Z0-9]|$)|FRANCE(?=\s*[^A-Z0-9\s]))[^A-Z0-9]*/;
const AUTRE_PREFIXE=/^[^A-Z0-9]*[A-Z]{2,3}\s*[|:]/; // « BE: », « UK | »… (un autre pays)
const QUALITE=/\b(FHD|UHD|HD|SD|HQ|LQ|4K|8K|HEVC|H ?26[45]|1080P?|720P?|\d+ ?FPS|RAW|VIP|PREMIUM|BACKUP|MULTI(SUB)?|VOSTFR|VF|FR|SAT|TNT|DTT|IPTV)\b/g;
const majuscules=s=>String(s).normalize('NFKD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/['’`´]/g,'');
function frNettoie(nom){
  return majuscules(nom).replace(FR_PREFIXE,'').replace(/\bPLUS\b/g,'+').replace(/[^A-Z0-9+& ]/g,' ').replace(/\bBE ?IN\b/g,'BEIN').replace(QUALITE,' ').replace(/\s+/g,' ').trim();
}
// éditions étrangères (beIN arabe, DAZN Espagne, Canal+ Afrique…) : pas françaises
const ETRANGER=/\b(AR|ARAB|ARABIC|ARABE|MENA|TURK|TURKIYE|TR|USA?|UK|ENG|ENGLISH|ES|ESP|ESPANA|IT|ITALIA|GER|PT|NL|AFRICA|AFRIQUE|AFR|MAGHREB|ASIA|AUS|QC|QUEBEC|CANADA|CH|SUISSE|BE|BELGIQUE|BELGIUM|PL|RO)\b/;
function estFr(nom,categories){
  const n=majuscules(nom);
  if(ETRANGER.test(frNettoie(nom)))return false;
  if(/^[\W_]*[#=*~-]{3,}/.test(n)||/[#=*]{3,}/.test(n))return false; // fausses chaînes « ##### FR SPORT ##### »
  if(FR_PREFIXE.test(n))return true;
  return !AUTRE_PREFIXE.test(n)&&categories.some(c=>/(^|[^A-Z])(FR|FRA|FRANCE|FRENCH|FRANCAIS)([^A-Z]|$)/.test(majuscules(c)));
}

function supprimeDossier(d,id){const n=d.nodes[id];if(!n)return;n.children.forEach(k=>supprimeDossier(d,k));delete d.nodes[id];}

// tout=true : toutes les chaînes sont considérées françaises (démo)
function rangerFr(d,tout){
  const racine=d.nodes[d.root];
  // 1. enlever l'ancien rangement
  (d.frIds||[]).forEach(id=>supprimeDossier(d,id));
  racine.children=racine.children.filter(id=>d.nodes[id]);
  // 2. regrouper les catégories du fournisseur
  if(!tout){
    const issues=racine.children.filter(id=>id!==d.favId&&id!==d.provId&&(d.nodes[id].xt||/^[📺📦]/u.test(d.nodes[id].icon)));
    if(issues.length){
      if(!d.provId||!d.nodes[d.provId]){d.provId=nid();d.nodes[d.provId]={id:d.provId,name:'Fournisseur',icon:'📦',children:[],channels:[]};racine.children.push(d.provId);}
      d.nodes[d.provId].children.push(...issues);
      racine.children=racine.children.filter(id=>!issues.includes(id));
    }
  }
  // 3. classer
  const cats={};
  Object.values(d.nodes).forEach(n=>n.channels.forEach(c=>(cats[c]=cats[c]||[]).push(n.name)));
  const dossiers={}; // 'Sport/DAZN' → [{id,rang,cle}]
  let total=0;
  Object.values(d.channels).forEach(c=>{
    if(c.virt||c.kind)return;   // films / épisodes : pas des chaînes
    if(!tout&&!estFr(c.name,cats[c.id]||[]))return;
    const cle=frNettoie(c.name).replace(/\bSPORTS\b/g,'SPORT');let range=false;total++;
    for(let i=0;i<FR_REGLES.length;i++){
      const[dos,motif,aussi]=FR_REGLES[i];
      if(motif.test(cle)){(dossiers[dos]=dossiers[dos]||[]).push({id:c.id,rang:i,cle});range=true;if(!aussi)break;}
    }
    if(!range)(dossiers['Autres chaînes FR']=dossiers['Autres chaînes FR']||[]).push({id:c.id,rang:0,cle});
  });
  const liste=dos=>{const v=dossiers[dos]||[],vus=new Set();
    // même chaîne en plusieurs versions : la meilleure qualité d'abord
    return v.sort((a,b)=>a.rang-b.rang||a.cle.localeCompare(b.cle,'fr',{numeric:true})||qualite(d.channels[b.id].name)-qualite(d.channels[a.id].name)).map(x=>x.id).filter(id=>!vus.has(id)&&vus.add(id));};
  const cree=(nom,enfants,chaines)=>{const id=nid();d.nodes[id]={id,name:nom,icon:FR_ICONES[nom]||'📁',children:enfants,channels:chaines};return id;};
  const nouveaux=[];
  FR_ORDRE.forEach(haut=>{
    const sous=[...new Set(FR_REGLES.map(r=>r[0]).filter(p=>p.startsWith(haut+'/')))]
      .filter(p=>dossiers[p]).map(p=>{const l=liste(p),id=cree(p.split('/')[1],[],l);
        // logo du dossier = logos de ses chaînes (fournis par ton Xtream), calculé à l'affichage
        if(!p.endsWith('/Autres sports'))d.nodes[id].autoLogo=true;return id;});
    const ch=liste(haut);
    if(sous.length||ch.length)nouveaux.push(cree(haut,sous,ch));
  });
  d.frIds=nouveaux;d.frVer=FR_VERSION;
  // ordre de l'accueil : Favoris, Films, Séries, dossiers français, le reste
  const vod=d.vodIds?Object.values(d.vodIds):[],devant=[d.favId,...vod];
  racine.children=[...devant.filter(id=>racine.children.includes(id)),...nouveaux,...racine.children.filter(id=>!devant.includes(id)&&!nouveaux.includes(id))];
  return total;
}
