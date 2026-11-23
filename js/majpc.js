/* ---------- appli PC (.exe) : mises à jour ---------- */
/*
 * Dans l'appli PC, le serveur intégré répond à /__maj/… (voir electron/main.js).
 * Dans un navigateur ou sur Fire TV, ces adresses n'existent pas : MAJ reste null.
 */
let MAJ=null;
function majRafraichir(){
  if(APP||!location.protocol.startsWith('http'))return Promise.resolve(null);
  return fetch('/__maj/etat',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{MAJ=j&&j.appli?j:null;return MAJ;}).catch(()=>null);
}
majRafraichir().then(m=>{if(m&&m.disponible)setTimeout(()=>toast('Mise à jour disponible : ⚙ Réglages → Mettre à jour'),1500);});

async function majAppliquer(){
  await majRafraichir();
  if(!MAJ)return;
  if(!MAJ.sourceOk){toast('Dossier des mises à jour introuvable : choisis-le dans ⚙ Réglages');return;}
  if(!MAJ.disponible){toast('Déjà à jour');return;}
  toast('Mise à jour…');
  const r=await fetch('/__maj/appliquer',{method:'POST'}).then(r=>r.json()).catch(e=>({ok:false,erreur:e.message}));
  if(r.ok){toast('Mise à jour faite, redémarrage…');setTimeout(()=>location.reload(),900);}
  else toast('Échec de la mise à jour : '+(r.erreur||'?'));
}
async function majChoisirSource(){
  const r=await fetch('/__maj/choisir',{method:'POST'}).then(r=>r.json()).catch(()=>null);
  if(r&&!r.ok)toast('Dossier refusé : '+r.erreur);
  await majRafraichir();
}
