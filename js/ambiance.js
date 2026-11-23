/* ---------- ambiance : thème + musique de fond ---------- */
/*
 * Réglages perso (gardés à part du menu) : thème et musique.
 *   theme : 'classique' | 'vice'
 *   music : false | 'synth' (boucle synthwave originale générée par le navigateur)
 *                   | 'file'  (ton fichier musique/fond.mp3, servi par le proxy)
 */
const PKEY='menutv.prefs';
let prefs=(()=>{try{return JSON.parse(localStorage.getItem(PKEY))||{}}catch(e){return{}}})();
function savePrefs(){try{localStorage.setItem(PKEY,JSON.stringify(prefs))}catch(e){}}
const THEMES={classique:'Classique',sombre:'Sombre',vice:'Néon Vice'};
// sans choix : suit le réglage clair / sombre de l'appareil
const themeActuel=()=>prefs.theme||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'sombre':'classique');
const MUSIQUES={false:'Coupée',synth:'Synthwave (originale)',file:'Mon fichier musique/fond.mp3'};
const musVol=()=>prefs.mvol==null?0.45:prefs.mvol;
const musicMode=()=>prefs.music===undefined?(themeActuel()==='vice'?'synth':false):prefs.music;

function applyTheme(){document.documentElement.dataset.theme=themeActuel();}
function cycleTheme(){const k=Object.keys(THEMES);prefs.theme=k[(k.indexOf(themeActuel())+1)%k.length];savePrefs();applyTheme();ambiance();}
function cycleMusic(){const k=[false,'synth','file'];prefs.music=k[(k.indexOf(musicMode())+1)%k.length];savePrefs();ambiance();}
applyTheme();

/* Boucle synthwave originale : la mineur, Am – F – C – G, 100 BPM.
   Nappe (2 dents de scie désaccordées), basse en croches, arpège en doubles-croches avec écho,
   grosse caisse, caisse claire et charleston en bruit filtré. */
const synth=(()=>{
  let ctx,master,echo,noiseBuf,timer=0,step=0,next=0;
  const S=60/100/4,PROG=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function init(){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=0;
    const comp=ctx.createDynamicsCompressor();master.connect(comp);comp.connect(ctx.destination);
    echo=ctx.createDelay(1);echo.delayTime.value=S*3;
    const fb=ctx.createGain(),wet=ctx.createGain();fb.gain.value=.38;wet.gain.value=.3;
    echo.connect(fb);fb.connect(echo);echo.connect(wet);wet.connect(master);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  function note(type,f,t,dur,vol,cut,att,rel,toEcho){
    const o=ctx.createOscillator(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
    o.type=type;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=cut;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);
    g.gain.setValueAtTime(vol,t+Math.max(att,dur-rel));g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(fl);fl.connect(g);g.connect(master);if(toEcho)g.connect(echo);
    o.start(t);o.stop(t+dur+.05);
  }
  function bruit(t,dur,vol,type,f){
    const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=noiseBuf;fl.type=type;fl.frequency.value=f;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(fl);fl.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.05);
  }
  function grosseCaisse(t){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);
    g.gain.setValueAtTime(.8,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+.4);
  }
  function joue(st,t){
    const s=st%16,ch=PROG[Math.floor(st/16)%4];
    if(s===0)ch.forEach(m=>[-9,9].forEach(c=>note('sawtooth',hz(m)*Math.pow(2,c/1200),t,S*16,.03,1500,.5,.6,true)));
    if(s%2===0)note('sawtooth',hz(ch[0]-24),t,S*1.7,.14,s%4?500:800,.005,.08);
    note('square',hz(ch[[0,1,2,1][s%4]]+12+(s>=8&&s%4===2?12:0)),t,S*.9,.022,2600,.005,.05,true);
    if(s===0||s===8)grosseCaisse(t);
    if(s===4||s===12)bruit(t,.22,.3,'bandpass',1800);
    if(s%2===0)bruit(t,.05,.06,'highpass',8000);
  }
  function planifie(){while(next<ctx.currentTime+.3){joue(step++,next);next+=S;}}
  return{
    start(){if(!ctx)init();ctx.resume();if(timer)return;
      next=ctx.currentTime+.08;timer=setInterval(planifie,60);
      master.gain.cancelScheduledValues(ctx.currentTime);master.gain.linearRampToValueAtTime(musVol(),ctx.currentTime+1.5);},
    vol(){if(ctx&&timer){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(musVol(),ctx.currentTime,.1);}},
    stop(){if(!ctx||!timer)return;clearInterval(timer);timer=0;
      master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(master.gain.value,ctx.currentTime);
      master.gain.linearRampToValueAtTime(0,ctx.currentTime+.4);},
  };
})();

const fichier=(()=>{let a=null,erreur=false;return{
  start(){if(!a){a=new Audio('musique/fond.mp3');a.loop=true;
      a.onerror=()=>{if(!erreur){erreur=true;toast('Fichier musique/fond.mp3 introuvable (il faut lancer node proxy.js)');}};}
    a.volume=musVol();a.play().catch(()=>{});},
  vol(){if(a)a.volume=musVol();},
  stop(){if(a)a.pause();},
};})();

function volMusique(){synth.vol();fichier.vol();}

// la musique ne démarre qu'après un premier clic / touche (règle des navigateurs)
let geste=false;
function ambiance(){
  const m=musicMode(),joue=geste&&player.hidden&&!document.hidden&&!(typeof appliOuverte!=='undefined'&&appliOuverte);
  if(joue&&m==='synth')synth.start();else synth.stop();
  if(joue&&m==='file')fichier.start();else fichier.stop();
}
const premierGeste=()=>{if(geste)return;geste=true;ambiance();};
addEventListener('pointerdown',premierGeste,true);
addEventListener('keydown',premierGeste,true);
document.addEventListener('visibilitychange',ambiance);
