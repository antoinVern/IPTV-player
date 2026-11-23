// Génère toutes les images du logo à partir de logo.svg, logo-petit.svg (≤ 48 px) et banniere.svg (rendu par Chrome, sans dépendance).
//   node outils/logo/generer-logo.js
// Produit : img/menu-tv.ico (Windows : exe, raccourci), img/logo-512.png, img/favicon.png,
//           android/.../drawable-nodpi/icone.png, android/.../drawable-xhdpi/banniere.png
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const RACINE = path.resolve(__dirname, '..', '..');
const CHROMES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const CHROME = process.env.CHROME || CHROMES.find((c) => fs.existsSync(c));
if (!CHROME) { console.error('Chrome ou Edge introuvable (variable CHROME pour indiquer le chemin).'); process.exit(1); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ANDROID = path.join(RACINE, 'android', 'app', 'src', 'main', 'res');

(async () => {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let cible; for (let i = 0; i < 60 && !cible; i++) { await wait(250); try { cible = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const att = {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (att[d.id]) { att[d.id](d.result); delete att[d.id]; } };
  const send = (method, params = {}) => new Promise((ok) => { const i = ++id; att[i] = ok; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });   // fond transparent

  async function rendre(svgFichier, largeur, hauteur) {
    const svg = fs.readFileSync(path.join(__dirname, svgFichier), 'utf8');
    const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${largeur}px;height:${hauteur}px}</style></head><body>${svg}</body></html>`;
    await send('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
    await wait(500);
    const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: largeur, height: hauteur, scale: 1 } });
    return Buffer.from(r.data, 'base64');
  }
  const ecrire = (fichier, data) => { fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(fichier, data); console.log('  ' + path.relative(RACINE, fichier) + '  (' + data.length + ' octets)'); };

  console.log('Logo Menu TV :');
  ecrire(path.join(RACINE, 'img', 'logo-512.png'), await rendre('logo.svg', 512, 512));
  ecrire(path.join(RACINE, 'img', 'favicon.png'), await rendre('logo-petit.svg', 64, 64));
  ecrire(path.join(ANDROID, 'drawable-nodpi', 'icone.png'), await rendre('logo.svg', 512, 512));
  ecrire(path.join(ANDROID, 'drawable-xhdpi', 'banniere.png'), await rendre('banniere.svg', 640, 360));   // 320×180 dp

  // .ico Windows : plusieurs tailles, chacune en PNG (Windows Vista et plus)
  const tailles = [16, 24, 32, 48, 64, 128, 256];
  const images = [];
  // petites tailles : version simplifiée (3 barres), lisible même en 16 px
  for (const t of tailles) images.push(await rendre(t <= 48 ? 'logo-petit.svg' : 'logo.svg', t, t));
  const entete = Buffer.alloc(6 + 16 * images.length);
  entete.writeUInt16LE(0, 0); entete.writeUInt16LE(1, 2); entete.writeUInt16LE(images.length, 4);
  let decalage = entete.length;
  images.forEach((png, i) => {
    const o = 6 + 16 * i, t = tailles[i];
    entete.writeUInt8(t >= 256 ? 0 : t, o); entete.writeUInt8(t >= 256 ? 0 : t, o + 1);
    entete.writeUInt8(0, o + 2); entete.writeUInt8(0, o + 3);
    entete.writeUInt16LE(1, o + 4); entete.writeUInt16LE(32, o + 6);
    entete.writeUInt32LE(png.length, o + 8); entete.writeUInt32LE(decalage, o + 12);
    decalage += png.length;
  });
  ecrire(path.join(RACINE, 'img', 'menu-tv.ico'), Buffer.concat([entete, ...images]));

  ws.close(); chrome.kill();
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch {}
})().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
