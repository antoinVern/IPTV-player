/*
 * Menu TV pour PC (Electron).
 *
 * - Le proxy (proxy.js) tourne DANS l'appli : plus besoin de Node ni de fenêtre à part.
 * - La page est gardée dans %APPDATA%\Menu TV\www. Au 1er lancement, c'est la copie livrée
 *   avec l'installateur ; ensuite, « ⚙ Réglages → Mettre à jour » y recopie la page depuis
 *   le dossier source (par défaut le dossier du projet, ex. C:\dev\menu-tv) et recharge.
 */
const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const { demarrer } = require('./proxy.js');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (!app.requestSingleInstanceLock()) app.quit();

const PAGE = ['index.html', 'css', 'js', 'img', 'musique'];
const EMBARQUEE = app.isPackaged ? path.join(process.resourcesPath, 'www') : path.join(__dirname, 'www');
const DONNEES = app.getPath('userData');            // %APPDATA%\Menu TV
const WWW = path.join(DONNEES, 'www');
const CONFIG = path.join(DONNEES, 'config.json');
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
let config = lireJson(CONFIG) || {};
const sauverConfig = () => fs.writeFileSync(CONFIG, JSON.stringify(config, null, 1));
const source = () => config.source || (lireJson(path.join(EMBARQUEE, 'maj.json')) || {}).source || '';
let win = null;

/* ---------- fichiers de la page ---------- */
function lister(dir) {
  const out = [];
  const parcourir = (rel) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) fs.readdirSync(abs).sort().forEach((n) => parcourir(path.join(rel, n)));
    else out.push(rel);
  };
  PAGE.forEach(parcourir);
  return out;
}
function empreinte(dir) {
  const h = crypto.createHash('sha1');
  for (const f of lister(dir)) { h.update(f.replace(/\\/g, '/')); h.update(fs.readFileSync(path.join(dir, f))); }
  return h.digest('hex');
}
// copie complète dans un dossier temporaire, puis échange : jamais de page à moitié copiée
function copier(de, vers) {
  const tmp = vers + '.nouveau';
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const f of lister(de)) {
    fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
    fs.copyFileSync(path.join(de, f), path.join(tmp, f));
  }
  if (!fs.existsSync(path.join(tmp, 'index.html'))) throw new Error('index.html manquant dans ' + de);
  fs.rmSync(vers, { recursive: true, force: true });
  fs.renameSync(tmp, vers);
}
function preparerPage() {
  // 1er lancement, ou nouvel installateur (page livrée différente de la dernière installée)
  const livree = empreinte(EMBARQUEE);
  if (!fs.existsSync(path.join(WWW, 'index.html')) || config.livree !== livree) {
    copier(EMBARQUEE, WWW);
    config.livree = livree; sauverConfig();
  }
}

/* ---------- routes de mise à jour (/__maj/…), réservées à ce PC ---------- */
async function routesMaj(req, res, u) {
  if (!u.pathname.startsWith('/__maj')) return false;
  const json = (o) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); return true; };
  if (!/^(::1|127\.|::ffff:127\.)/.test(req.socket.remoteAddress || '')) { res.writeHead(403); res.end(); return true; }
  const src = source(), srcOk = !!src && fs.existsSync(path.join(src, 'index.html'));
  if (u.pathname === '/__maj/etat')
    return json({ appli: true, version: app.getVersion(), source: src, sourceOk: srcOk, disponible: srcOk && empreinte(src) !== empreinte(WWW) });
  if (req.method !== 'POST') return json({ ok: false, erreur: 'méthode' });
  if (u.pathname === '/__maj/appliquer') {
    if (!srcOk) return json({ ok: false, erreur: 'dossier source introuvable : ' + src });
    try { copier(src, WWW); return json({ ok: true }); } catch (e) { return json({ ok: false, erreur: e.message }); }
  }
  if (u.pathname === '/__maj/choisir') {
    const r = await dialog.showOpenDialog(win, { title: 'Dossier de Menu TV (celui qui contient index.html)', properties: ['openDirectory'], defaultPath: src || undefined });
    if (r.canceled || !r.filePaths[0]) return json({ ok: true, source: src });
    if (!fs.existsSync(path.join(r.filePaths[0], 'index.html'))) return json({ ok: false, erreur: 'pas de index.html dans ce dossier' });
    config.source = r.filePaths[0]; sauverConfig();
    return json({ ok: true, source: config.source });
  }
  return json({ ok: false, erreur: 'inconnu' });
}

/* ---------- démarrage ---------- */
async function lancer() {
  preparerPage();
  let serveur;
  // 127.0.0.1 : le proxy n'est visible que de ce PC (pas d'alerte du pare-feu)
  try { serveur = await demarrer({ port: 8787, host: '127.0.0.1', root: WWW, extra: routesMaj, silencieux: true }); }
  catch { serveur = await demarrer({ port: 0, host: '127.0.0.1', root: WWW, extra: routesMaj, silencieux: true }); }
  const port = serveur.address().port;

  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 640, minHeight: 400, backgroundColor: '#000000', title: 'Menu TV',
    icon: path.join(__dirname, 'icone.ico'), autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.setMenu(null);
  // MENUTV_INVISIBLE=1 : fenêtre cachée (tests automatiques uniquement)
  win.once('ready-to-show', () => { if (!process.env.MENUTV_INVISIBLE) { win.maximize(); win.show(); } });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (i.key === 'F5' || (i.control && i.key.toLowerCase() === 'r')) { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
    else if (i.control && i.shift && i.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });
  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(lancer).catch((e) => { dialog.showErrorBox('Menu TV', 'Démarrage impossible : ' + e.message); app.quit(); });
app.on('window-all-closed', () => app.quit());
