// Avant de lancer / fabriquer l'appli PC : copie la page et le proxy du dossier principal ici.
const fs = require('fs'), path = require('path');
const racine = path.resolve(__dirname, '..');
const www = path.join(__dirname, 'www');
fs.rmSync(www, { recursive: true, force: true });
for (const f of ['index.html', 'css', 'js', 'img', 'musique']) {
  const de = path.join(racine, f);
  if (fs.existsSync(de)) fs.cpSync(de, path.join(www, f), { recursive: true });
}
// dossier où l'appli ira chercher les mises à jour (modifiable dans l'appli)
fs.writeFileSync(path.join(www, 'maj.json'), JSON.stringify({ source: racine }, null, 1));
fs.copyFileSync(path.join(racine, 'proxy.js'), path.join(__dirname, 'proxy.js'));
fs.copyFileSync(path.join(racine, 'img', 'menu-tv.ico'), path.join(__dirname, 'icone.ico'));
console.log('Page copiée depuis', racine);
