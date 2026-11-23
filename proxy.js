#!/usr/bin/env node
/*
 * Menu TV — proxy local pour Xtream (sans dépendance, Node 18+).
 *
 *   node proxy.js            → http://localhost:8787  (et http://IP-DU-PC:8787 depuis le Fire Stick)
 *   PORT=9000 node proxy.js  → autre port
 *
 * Rôle :
 *   - sert la page (index.html, css/, js/, img/, musique/)
 *   - /p?u=<url>  relaie une requête HTTP(S) (API player_api.php, EPG, playlists, segments)
 *                 → plus de blocage CORS ni de « contenu mixte » dans le navigateur
 *   - réécrit les playlists .m3u8 pour que les segments passent aussi par le proxy
 *
 * Par sécurité, les adresses locales/privées (127.x, 192.168.x, 10.x…) sont refusées
 * comme cible, sauf si ALLOW_PRIVATE=1 (utile seulement si ton serveur Xtream est sur ton réseau).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Readable } = require('stream');

const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '0.0.0.0';
const ALLOW_PRIVATE = process.env.ALLOW_PRIVATE === '1';
const UA = process.env.UA || 'VLC/3.0.20 LibVLC/3.0.20';
let ROOT = __dirname;   // dossier de la page (modifiable par demarrer())
let EXTRA = null;        // routes en plus (appli PC : mises à jour)

function isPrivateHost(h) {
  h = h.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1' || h === '0.0.0.0') return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    return a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return /^(fc|fd|fe80)/.test(h);
}

function checkTarget(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!ALLOW_PRIVATE && isPrivateHost(u.hostname)) return null;
  return u;
}

const proxied = (u) => '/p?u=' + encodeURIComponent(u);

function rewriteM3u8(text, base) {
  const abs = (s) => { try { return new URL(s, base).href; } catch { return s; } };
  return text.split(/\r?\n/).map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, s) => `URI="${proxied(abs(s))}"`);
    return proxied(abs(t));
  }).join('\n');
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

async function relay(req, res, target) {
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  let url = target, r;
  // redirections suivies à la main pour revérifier chaque destination
  for (let hop = 0; ; hop++) {
    const headers = { 'User-Agent': UA, Accept: '*/*' };
    if (req.headers.range) headers.Range = req.headers.range;
    r = await fetch(url, { headers, redirect: 'manual', signal: ac.signal });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) {
      if (hop >= 5) throw new Error('Trop de redirections');
      const next = checkTarget(new URL(loc, url).href);
      if (!next) throw new Error('Redirection refusée');
      url = next;
      continue;
    }
    break;
  }

  const ct = r.headers.get('content-type') || '';
  const isPlaylist = /mpegurl/i.test(ct) || /\.m3u8?$/i.test(url.pathname);
  if (isPlaylist && r.ok) {
    const body = rewriteM3u8(await r.text(), url.href);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' });
    return res.end(body);
  }

  const out = { ...cors };
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'last-modified']) {
    const v = r.headers.get(h);
    if (v) out[h] = v;
  }
  // fetch décompresse déjà le corps : la longueur d'origine ne vaut plus
  if (r.headers.get('content-encoding')) delete out['content-length'];
  res.writeHead(r.status, out);
  if (!r.body) return res.end();
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.apk': 'application/vnd.android.package-archive', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav' };
// fichiers de la page : index.html + dossiers css/, js/, img/ (rien d'autre, pas de « .. »)
const STATIC = /^\/(index\.html|MenuTV\.apk|(css|js|img|musique)\/[\w.\-\/]+)$/;

function serveFile(res, file, type) {
  if (file.includes('..')) { res.writeHead(404); return res.end('Introuvable'); }
  fs.readFile(path.join(ROOT, file), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Introuvable'); }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

async function repondre(req, res) {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (EXTRA && (await EXTRA(req, res, u))) return;
  if (u.pathname === '/') return serveFile(res, 'index.html', TYPES['.html']);
  if (STATIC.test(u.pathname)) return serveFile(res, u.pathname.slice(1), TYPES[path.extname(u.pathname)] || 'application/octet-stream');
  if (u.pathname === '/__proxy') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
  if (u.pathname === '/p') {
    const target = checkTarget(u.searchParams.get('u') || '');
    if (!target) { res.writeHead(400, cors); return res.end('URL refusée'); }
    try { await relay(req, res, target); }
    catch (e) {
      if (res.headersSent) return res.destroy();
      if (e.name === 'AbortError') return;
      res.writeHead(502, cors);
      res.end('Erreur proxy : ' + e.message);
    }
    return;
  }
  res.writeHead(404); res.end('Introuvable');
}

/** Démarre le serveur. Utilisé tel quel par « node proxy.js », et par l'appli PC (electron/main.js). */
function demarrer({ port = PORT, host = HOST, root = ROOT, extra = null, silencieux = false } = {}) {
  ROOT = root; EXTRA = extra;
  return new Promise((ok, ko) => {
    const server = http.createServer(repondre);
    server.on('error', ko);
    server.listen(port, host, () => {
      if (!silencieux) {
        const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
        console.log(`Menu TV prêt :`);
        console.log(`  sur ce PC        → http://localhost:${server.address().port}`);
        ips.forEach((ip) => console.log(`  sur le Fire Stick → http://${ip}:${server.address().port}`));
        console.log('Ctrl+C pour arrêter.');
      }
      ok(server);
    });
  });
}
module.exports = { demarrer };
if (require.main === module) demarrer().catch((e) => { console.error('Impossible de démarrer :', e.message); process.exit(1); });
