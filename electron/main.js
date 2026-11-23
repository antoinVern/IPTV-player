/*
 * Menu TV pour PC (Electron).
 *
 * - Le proxy (proxy.js) tourne DANS l'appli : plus besoin de Node ni de fenêtre à part.
 * - La page est gardée dans %APPDATA%\Menu TV\www. Au 1er lancement, c'est la copie livrée
 *   avec l'installateur ; ensuite, « ⚙ Réglages → Mettre à jour » y recopie la page depuis
 *   le dossier source (par défaut le dossier du projet, ex. C:\dev\menu-tv) et recharge.
 */
const { app, BrowserWindow, dialog, shell, session, ipcMain } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const { demarrer } = require('./proxy.js');

// MENUTV_PROFIL=dossier : profil séparé (tests automatiques, sans gêner l'appli déjà ouverte)
if (process.env.MENUTV_PROFIL) app.setPath('userData', process.env.MENUTV_PROFIL);
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// tests : une fenêtre hors de l'écran doit quand même se croire visible
if (process.env.MENUTV_INVISIBLE === 'horsecran') app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
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

/* ---------- YouTube, Twitch, Spotify ---------- */
// YouTube : interface TV (youtube.com/tv, faite pour la télécommande) → elle demande un navigateur de télé.
const UA_TV = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36';
const APPLIS = {
  youtube: { titre: 'YouTube', url: 'https://www.youtube.com/tv', ua: UA_TV },
  twitch: { titre: 'Twitch', url: 'https://www.twitch.tv/' },
  // le lecteur web de Spotify exige un module DRM absent d'Electron : appli Spotify, sinon navigateur
  spotify: { titre: 'Spotify', protocole: 'spotify:', web: 'https://open.spotify.com/' },
};
let bloqueurPret = null;
// bloqueur de pubs (listes publicitaires et traqueurs de Ghostery / uBlock), gardé en cache sur le disque
function preparerBloqueur(ses) {
  if (!bloqueurPret) bloqueurPret = (async () => {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron');
    const cache = path.join(DONNEES, 'bloqueur-pubs.bin');
    const b = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, { path: cache, read: fs.promises.readFile, write: fs.promises.writeFile });
    // Correctif de la bibliothèque : elle exécute les scripts anti-pub de chaque sous-cadre dans la
    // page principale (event.sender). Sur YouTube (plusieurs cadres), ils s'empilent et JSON.parse
    // finit en boucle infinie. Ici : chaque script va dans le cadre qui l'a demandé, erreurs ignorées.
    const injecter = b.onInjectCosmeticFilters;
    b.onInjectCosmeticFilters = (event, url, msg) => {
      // Twitch : géré par Purple AdBlock (ne pas cumuler deux bloqueurs Twitch)
      try { if (/(^|\.)twitch\.tv$/.test(new URL(url).hostname)) return Promise.resolve(); } catch {}
      const cadre = event.senderFrame, principal = !cadre || !cadre.parent;
      return injecter({
        frameId: event.frameId, processId: event.processId,
        sender: {
          insertCSS: (css, o) => (principal ? event.sender.insertCSS(css, o).catch(() => {}) : Promise.resolve()),
          // chaque script dans sa propre fonction : sinon leurs déclarations globales (JSONPath…)
          // entrent en collision et YouTube plante (boucle infinie, page bloquée sur le logo)
          executeJavaScript: (code, geste) => (cadre || event.sender.mainFrame).executeJavaScript('(function(){\n' + code + '\n})();', geste).catch(() => {}),
        },
      }, url, msg);
    };
    b.enableBlockingInSession(ses);
    return b;
  })().catch((e) => { console.error('Bloqueur de pubs indisponible :', e); bloqueurPret = null; throw e; });
  return bloqueurPret;
}
/* Twitch colle ses pubs dans le flux vidéo : les listes de filtres n'y peuvent rien. On utilise
   Purple AdBlock (libre, ne contacte que Twitch), injecté par twitch-preload.js. Copie livrée dans
   twitch/, et dernière version téléchargée au plus une fois par jour (Twitch change souvent). */
const URL_PUB_TWITCH = 'https://raw.githubusercontent.com/arthurbolsoni/Purple-adblock/main/platform/tampermonkey/dist/purpleadblocker.user.js';
let scriptTwitch = '';
function preparerTwitch(ses) {
  if (ses.menutvTwitch) return;
  ses.menutvTwitch = true;
  const cache = path.join(DONNEES, 'pub-twitch.js');
  try { scriptTwitch = fs.readFileSync(fs.existsSync(cache) ? cache : path.join(__dirname, 'twitch', 'purpleadblocker.user.js'), 'utf8'); } catch { scriptTwitch = ''; }
  let age = Infinity; try { age = Date.now() - fs.statSync(cache).mtimeMs; } catch {}
  if (age > 864e5) fetch(URL_PUB_TWITCH).then((r) => (r.ok ? r.text() : '')).then((t) => {
    if (/@name\s+Purple Adblocker/.test(t) && t.length > 20000) { fs.writeFileSync(cache, t); scriptTwitch = t; }
  }).catch(() => {});
  ses.registerPreloadScript({ type: 'frame', filePath: path.join(__dirname, 'twitch-preload.js') });
}
ipcMain.on('menutv:pub-twitch', (e) => { e.returnValue = scriptTwitch; });
const fenetresApplis = {};
async function ouvrirAppli(nom) {
  const a = APPLIS[nom];
  if (!a) return { ok: false, erreur: 'appli inconnue' };
  if (a.protocole) {
    if (app.getApplicationNameForProtocol(a.protocole + '//')) { await shell.openExternal(a.protocole); return { ok: true, externe: 'appli' }; }
    await shell.openExternal(a.web); return { ok: true, externe: 'navigateur' };
  }
  if (fenetresApplis[nom] && !fenetresApplis[nom].isDestroyed()) { fenetresApplis[nom].show(); fenetresApplis[nom].focus(); return { ok: true }; }
  const ses = session.fromPartition('persist:applis');   // connexions YouTube / Twitch gardées
  let pubs = true;
  // MENUTV_BLOQUEUR=0 : sans bloqueur (diagnostic uniquement)
  if (process.env.MENUTV_TWITCH !== '0') preparerTwitch(ses);   // MENUTV_TWITCH=0 : sans (diagnostic)
  if (process.env.MENUTV_BLOQUEUR === '0') pubs = false;
  else try { await preparerBloqueur(ses); } catch { pubs = false; }
  const w = new BrowserWindow({ width: 1280, height: 800, backgroundColor: '#000000', title: a.titre, icon: path.join(__dirname, 'icone.ico'),
    autoHideMenuBar: true, show: false, webPreferences: { partition: 'persist:applis', contextIsolation: true, nodeIntegration: false } });
  fenetresApplis[nom] = w;
  w.setMenu(null);
  if (a.ua) w.webContents.setUserAgent(a.ua);
  w.once('ready-to-show', () => {
    if (process.env.MENUTV_INVISIBLE === 'horsecran') { w.setPosition(-5000, -5000); w.showInactive(); }   // tests : affichée mais hors de l'écran
    else if (!process.env.MENUTV_INVISIBLE) { w.maximize(); w.show(); }
  });
  w.on('closed', () => { delete fenetresApplis[nom]; if (win && !win.isDestroyed()) win.focus(); });
  w.webContents.setWindowOpenHandler(({ url }) => { w.loadURL(url); return { action: 'deny' }; });
  // Début (Home) ou F10 : retour à Menu TV · F11 : plein écran
  w.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'Home' || i.key === 'F10') { e.preventDefault(); w.close(); }
    else if (i.key === 'F11') { e.preventDefault(); w.setFullScreen(!w.isFullScreen()); }
  });
  w.webContents.on('did-finish-load', () => {
    w.webContents.executeJavaScript(`(()=>{if(document.getElementById('menutv-aide'))return;const d=document.createElement('div');d.id='menutv-aide';
      d.textContent='Touche Début (ou F10) : revenir à Menu TV';d.style.cssText='position:fixed;left:50%;bottom:6vh;transform:translateX(-50%);z-index:2147483647;background:rgba(0,0,0,.8);color:#fff;font:16px Segoe UI,sans-serif;padding:10px 18px;border-radius:999px;pointer-events:none;transition:opacity .6s';
      document.documentElement.appendChild(d);setTimeout(()=>d.style.opacity=0,5000);setTimeout(()=>d.remove(),6000);})()`).catch(() => {});
  });
  w.loadURL(a.url);
  return { ok: true, pubs };
}

/* ---------- routes réservées à ce PC : mises à jour (/__maj/…) et applis (/__appli) ---------- */
async function routesMaj(req, res, u) {
  if (!u.pathname.startsWith('/__maj') && u.pathname !== '/__appli') return false;
  const json = (o) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); return true; };
  if (!/^(::1|127\.|::ffff:127\.)/.test(req.socket.remoteAddress || '')) { res.writeHead(403); res.end(); return true; }
  if (u.pathname === '/__appli') {
    if (req.method !== 'POST') return json({ ok: false, erreur: 'méthode' });
    try { return json(await ouvrirAppli(u.searchParams.get('nom'))); } catch (e) { return json({ ok: false, erreur: e.message }); }
  }
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
