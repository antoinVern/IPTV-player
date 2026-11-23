/* ---------- clavier / télécommande ---------- */
document.addEventListener('keydown',e=>{
  if(!$('#modal').hidden){
    if(e.key==='Escape'){closeModal();return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      const els=[...$('#modal').querySelectorAll('input,.item,.btn')],i=els.indexOf(document.activeElement);
      const n=els[Math.max(0,Math.min(els.length-1,i+(e.key==='ArrowDown'?1:-1)))];
      if(n){e.preventDefault();n.focus();n.scrollIntoView({block:'nearest'});}
    }else if(e.key==='Enter'&&document.activeElement.classList.contains('item')){e.preventDefault();document.activeElement.click();}
    return;
  }
  if(!player.hidden){
    bar();
    if(e.key==='Escape'||e.key==='Backspace'){closePlayer();return;}
    if(estVod(db.channels[queue[qi]])){   // film / épisode
      if(e.key==='ArrowRight'||e.key==='MediaFastForward'){e.preventDefault();avance(30);return;}
      if(e.key==='ArrowLeft'||e.key==='MediaRewind'){e.preventDefault();avance(-10);return;}
      if(e.key==='ArrowUp'){e.preventDefault();volume(.1);return;}
      if(e.key==='ArrowDown'){e.preventDefault();volume(-.1);return;}
      if(e.key==='Enter'||e.key===' '||e.key==='MediaPlayPause'){e.preventDefault();pauseLecture();return;}
    }
    if(e.key==='ArrowUp'||e.key==='PageUp'||e.key==='ChannelUp')zap(-1);
    else if(e.key==='ArrowDown'||e.key==='PageDown'||e.key==='ChannelDown')zap(1);
    else if(e.key==='f'||e.key==='F')fs();
    else if(e.key==='ArrowRight'||e.key==='AudioVolumeUp'||e.key==='+'){e.preventDefault();volume(.1);}
    else if(e.key==='ArrowLeft'||e.key==='AudioVolumeDown'||e.key==='-'){e.preventDefault();volume(-.1);}
    else if(e.key==='m'||e.key==='M'||e.key==='AudioVolumeMute'){e.preventDefault();muet();}
    else if(e.key==='ContextMenu'||e.key==='*'||e.key==='s'||e.key==='S'){e.preventDefault();toggleFav(queue[qi]);}
    return;
  }
  const its=items(),C=cols();let n=sel;
  switch(e.key){
    case'ArrowRight':n=Math.min(its.length-1,sel+1);break;
    case'ArrowLeft':n=Math.max(0,sel-1);break;
    case'ArrowDown':if(sel+C<=its.length-1)n=sel+C;break;
    case'ArrowUp':if(sel-C>=0)n=sel-C;break;
    case'Enter':case' ':e.preventDefault();tick();activate(its[sel]);return;
    case'Escape':case'Backspace':back();return;
    case'Home':case'GoHome':e.preventDefault();home();return;
    case'ContextMenu':case'*':case's':case'S':{e.preventDefault();const it=its[sel];if(it&&it.t==='c')toggleFav(it.id);return;}
    default:return;
  }
  e.preventDefault();if(n!==sel){setSel(n);tick();}
});


/* ---------- démarrage ---------- */
render();
