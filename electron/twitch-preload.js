// Injecte le bloqueur de pubs Twitch (Purple AdBlock, voir twitch/LISEZMOI.txt) dans les pages
// twitch.tv, AVANT leurs propres scripts : il doit intercepter les playlists vidéo dès le départ.
const { ipcRenderer, contextBridge } = require('electron');
if (/(^|\.)twitch\.tv$/.test(location.hostname)) {
  const code = ipcRenderer.sendSync('menutv:pub-twitch');
  if (code) {
    contextBridge.executeInMainWorld({
      func: (c) => { try { (0, eval)(c); } catch (e) { console.error('[Menu TV] bloqueur Twitch :', e); } },
      args: [code],
    });
  }
}
