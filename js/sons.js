/* Sons : tout est synthétisé avec Web Audio (aucun fichier à télécharger).
   Ambiance (vent, oiseaux, grillons, pluie, feu), moteurs, outils, arbres qui tombent, ventes. Bouton 🔊 pour couper. */
const AU={ctx:null,master:null,on:true,noise:null,amb:null,eng:{},lastCash:0,birdT:3,owlT:40,listener:{x:0,z:0}};
try{AU.on=localStorage.getItem('terre-a-bois-son')!=='0';}catch(e){}

function audioInit(){
  if(AU.ctx){if(AU.ctx.state!=='running')AU.ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const ctx=AU.ctx=new AC();
  AU.master=ctx.createGain();AU.master.gain.value=AU.on?0.7:0;
  const comp=ctx.createDynamicsCompressor();AU.master.connect(comp);comp.connect(ctx.destination);
  // Bruit blanc partagé (2 s en boucle)
  const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=b;
  // Couches d'ambiance continues
  const loop=(type,freq,q)=>{const s=ctx.createBufferSource();s.buffer=AU.noise;s.loop=true;s.loopStart=Math.random();const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q||0.7;const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AU.master);s.start();return {f,g};};
  AU.amb={wind:loop('lowpass',380,0.6),rain:loop('highpass',1400,0.5),rainLow:loop('lowpass',500,0.5),fire:loop('bandpass',700,0.8)};
  // Grillons : une note aiguë modulée par impulsions
  const cr=ctx.createOscillator();cr.type='sine';cr.frequency.value=4300;const crg=ctx.createGain();crg.gain.value=0;
  const am=ctx.createOscillator();am.type='square';am.frequency.value=28;const amg=ctx.createGain();amg.gain.value=0.5;
  const cm=ctx.createGain();cm.gain.value=0.5;am.connect(amg);amg.connect(cm.gain);
  const ch=ctx.createGain();ch.gain.value=0.5;const lf=ctx.createOscillator();lf.type='square';lf.frequency.value=1.6;const lfg=ctx.createGain();lfg.gain.value=0.5;lf.connect(lfg);lfg.connect(ch.gain);
  cr.connect(cm);cm.connect(ch);ch.connect(crg);crg.connect(AU.master);cr.start();am.start();lf.start();
  AU.amb.crick={g:crg};
}
['pointerdown','touchend','keydown','click'].forEach(ev=>window.addEventListener(ev,audioInit,{passive:true}));
$('btnSound').addEventListener('click',()=>setSound(!AU.on));
$('btnSound').textContent=AU.on?'🔊':'🔇';

function setSound(on){
  AU.on=on;try{localStorage.setItem('terre-a-bois-son',on?'1':'0');}catch(e){}
  if(AU.master)AU.master.gain.setTargetAtTime(on?0.7:0,AU.ctx.currentTime,0.05);
  const b=$('btnSound');if(b)b.textContent=on?'🔊':'🔇';
}

/* ----- Utilitaires : gain selon la distance, panoramique gauche/droite ----- */
function spatial(x,z,maxD){
  if(x===undefined)return {g:1,pan:0};
  const L=AU.listener,dx=x-L.x,dz=z-L.z,d=Math.hypot(dx,dz);
  const g=clamp(1-d/(maxD||35),0,1);
  const pan=d<0.5?0:clamp((dx*camRight.x+dz*camRight.z)/d,-1,1)*0.7;
  return {g:g*g,pan};
}
function out(gain,pan){
  const ctx=AU.ctx,g=ctx.createGain();g.gain.value=gain;
  if(ctx.createStereoPanner&&pan){const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(AU.master);}else g.connect(AU.master);
  return g;
}
function ready(){return AU.ctx&&AU.on&&AU.ctx.state==='running';}
// Bruit filtré bref (enveloppe percussive)
function burst(dest,t,dur,type,freq,q,vol,attack){
  const ctx=AU.ctx,s=ctx.createBufferSource();s.buffer=AU.noise;
  const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q||1;
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(attack||0.004));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur+0.05);return f;
}
function tone(dest,t,dur,type,f0,f1,vol,attack){
  const ctx=AU.ctx,o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(attack||0.005));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+0.05);return o;
}

/* ----- Outils ----- */
function sfxSwing(kind,x,z,dur){   // scies : le son dure tout le mouvement
  if(!ready())return;const sp=spatial(x,z);if(sp.g<0.01)return;
  const ctx=AU.ctx,t=ctx.currentTime,o=out(sp.g,sp.pan);
  if(kind==='chainsaw'){
    const os=ctx.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(95,t);os.frequency.linearRampToValueAtTime(150,t+0.15);os.frequency.linearRampToValueAtTime(128,t+dur);
    const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1700;f.Q.value=2;
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.16,t+0.05);g.gain.setValueAtTime(0.16,t+dur-0.08);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.1);
    os.connect(f);f.connect(g);g.connect(o);os.start(t);os.stop(t+dur+0.15);
    burst(o,t,dur,'bandpass',3200,1.2,0.05,0.04);
  }else if(kind==='saw'){
    for(let i=0;i<4;i++)burst(o,t+i*dur/4,dur/4.5,'bandpass',2400+(i%2)*700,1.5,0.12,0.03);
  }
}
function sfxStrike(kind,x,z){
  if(!ready())return;const sp=spatial(x,z);if(sp.g<0.01)return;
  const t=AU.ctx.currentTime,o=out(sp.g,sp.pan);
  if(kind==='axe'){burst(o,t,0.09,'bandpass',1900,1.4,0.5);tone(o,t,0.16,'sine',170,95,0.35);burst(o,t+0.01,0.22,'lowpass',500,0.7,0.12);}
  else if(kind==='shovel'){burst(o,t,0.18,'lowpass',700,0.8,0.35,0.01);burst(o,t+0.03,0.12,'bandpass',2600,2,0.08);tone(o,t,0.06,'triangle',600,420,0.06);}
}
function sfxKnock(x,z,v){if(!ready())return;const sp=spatial(x,z);if(sp.g<0.01)return;const t=AU.ctx.currentTime,o=out(sp.g*(v||1),sp.pan);tone(o,t,0.14,'sine',210,150,0.3);burst(o,t,0.07,'bandpass',900,1.5,0.18);}
function sfxThud(x,z){if(!ready())return;const sp=spatial(x,z,45);if(sp.g<0.01)return;const t=AU.ctx.currentTime,o=out(sp.g,sp.pan);tone(o,t,0.5,'sine',75,38,0.7,0.01);burst(o,t,0.6,'lowpass',260,0.8,0.5,0.01);burst(o,t+0.05,0.5,'bandpass',1400,0.8,0.08,0.02);}
function sfxCreak(x,z){   // l'arbre craque avant de tomber
  if(!ready())return;const sp=spatial(x,z,45);if(sp.g<0.01)return;
  const ctx=AU.ctx,t=ctx.currentTime,o=out(sp.g,sp.pan);
  const os=ctx.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(70,t);os.frequency.linearRampToValueAtTime(48,t+1.2);
  const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=6;f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(260,t+1.2);
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.2,t+0.15);g.gain.exponentialRampToValueAtTime(0.0001,t+1.3);
  os.connect(f);f.connect(g);g.connect(o);os.start(t);os.stop(t+1.4);
  for(let i=0;i<5;i++)burst(o,t+0.6+i*0.12+Math.random()*0.05,0.05,'highpass',2500,1,0.12);   // branches qui cassent
}
function sfxCash(){
  if(!ready())return;const now=performance.now();if(now-AU.lastCash<250)return;AU.lastCash=now;
  const t=AU.ctx.currentTime,o=out(0.5,0);tone(o,t,0.25,'triangle',1320,0,0.18);tone(o,t+0.08,0.45,'triangle',1760,0,0.16);burst(o,t,0.05,'highpass',5000,1,0.05);
}
function sfxSplitter(x,z,dur){
  if(!ready())return;const sp=spatial(x,z);if(sp.g<0.01)return;
  const ctx=AU.ctx,t=ctx.currentTime,o=out(sp.g,sp.pan);
  const os=ctx.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(62,t);os.frequency.linearRampToValueAtTime(48,t+dur*0.7);os.frequency.linearRampToValueAtTime(66,t+dur);
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=420;
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.2,t+0.1);g.gain.setValueAtTime(0.2,t+dur-0.1);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  os.connect(f);f.connect(g);g.connect(o);os.start(t);os.stop(t+dur+0.05);
  tone(o,t,dur*0.7,'sine',900,1300,0.025,0.2);
}
function sfxCrack(x,z){if(!ready())return;const sp=spatial(x,z);if(sp.g<0.01)return;const t=AU.ctx.currentTime,o=out(sp.g,sp.pan);burst(o,t,0.12,'highpass',1500,0.8,0.45,0.002);tone(o,t,0.12,'sine',260,120,0.25);}

/* ----- Oiseaux, hibou ----- */
function bird(){
  const t=AU.ctx.currentTime,a=Math.random()*6.28,o=out(0.08+Math.random()*0.08,Math.cos(a)*0.8),kind=Math.floor(Math.random()*3);
  if(kind===0){   // mésange : « ti-dou »
    tone(o,t,0.16,'sine',4100,3900,0.5,0.01);tone(o,t+0.22,0.26,'sine',3100,3000,0.5,0.01);
  }else if(kind===1){   // trille
    const n=5+Math.floor(Math.random()*6);for(let i=0;i<n;i++)tone(o,t+i*0.07,0.06,'sine',3300+Math.random()*900,4300,0.35,0.005);
  }else{   // petit sifflet montant
    tone(o,t,0.35,'sine',2400,3600,0.4,0.03);tone(o,t+0.45,0.2,'sine',3600,3400,0.3,0.02);
  }
}
function owl(){const t=AU.ctx.currentTime,o=out(0.12,(Math.random()-0.5)*1.2);[0,0.45,0.75].forEach((dt,i)=>tone(o,t+dt,i?0.28:0.4,'sine',i?360:390,i?330:370,0.5,0.06));}

/* ----- Moteurs : un son par véhicule conduit (le mien ou celui de l'autre joueur) ----- */
const ENG_BASE={vtt:[58,1.6],pickup:[42,1.0],skid:[34,0.9]};
function engineFor(v){
  let e=AU.eng[v.id];if(e)return e;
  const ctx=AU.ctx,o1=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=500;f.Q.value=3;g.gain.value=0;
  const p=ctx.createStereoPanner?ctx.createStereoPanner():null;
  o1.connect(f);o2.connect(f);f.connect(g);if(p){g.connect(p);p.connect(AU.master);}else g.connect(AU.master);
  o1.start();o2.start();
  return AU.eng[v.id]={o1,o2,f,g,p};
}
function updateEngines(){
  const t=AU.ctx.currentTime,live={};
  vehicles.forEach(v=>{
    const mine=S.mode==='vtt'&&V===v,driven=mine||(v.driver&&v.net);
    if(!driven&&!AU.eng[v.id])return;
    const e=engineFor(v);live[v.id]=1;
    const sp=Math.abs(mine?v.v:(v.net?v.net.sp:0)),[b,k]=ENG_BASE[v.type]||[45,1];
    const s=spatial(v.x,v.z,45),f=b+sp*k*6;
    e.o1.frequency.setTargetAtTime(f,t,0.08);e.o2.frequency.setTargetAtTime(f*0.5,t,0.08);e.f.frequency.setTargetAtTime(300+sp*55,t,0.1);
    e.g.gain.setTargetAtTime(driven?(0.05+Math.min(sp,12)*0.007)*(mine?1:s.g):0,t,0.12);
    if(e.p)e.p.pan.setTargetAtTime(mine?0:s.pan,t,0.1);
  });
  for(const id in AU.eng)if(!live[id]){const e=AU.eng[id];e.g.gain.setTargetAtTime(0,t,0.1);}
}

/* ----- Mise à jour par image : ambiance selon l'heure, la météo et les feux proches ----- */
function updateSound(dt,focus){
  AU.listener.x=focus.x;AU.listener.z=focus.z;
  if(!AU.ctx||AU.ctx.state!=='running')return;
  const t=AU.ctx.currentTime,a=AU.amb,day=SKY.day;
  const gust=0.5+0.5*Math.sin(S.time*0.23)*Math.sin(S.time*0.071+1);
  a.wind.g.gain.setTargetAtTime(0.035+0.05*gust*(0.6+SKY.cloud)+0.05*SKY.snow,t,0.5);a.wind.f.frequency.setTargetAtTime(260+260*gust,t,0.5);
  a.rain.g.gain.setTargetAtTime(0.11*SKY.rain,t,0.4);a.rainLow.g.gain.setTargetAtTime(0.08*SKY.rain,t,0.4);
  const fr=nearestFire(focus.x,focus.z);let fg=0;
  if(fr){fg=spatial(fr[0],fr[2],14).g*0.1;if(Math.random()<dt*7*(fg>0.01?1:0)){const o=out(fg*3,0);burst(o,t,0.03,'highpass',2000+Math.random()*3000,1,0.4,0.001);}}
  a.fire.g.gain.setTargetAtTime(fg,t,0.3);
  a.crick.g.gain.setTargetAtTime(0.012*(1-day)*(1-SKY.rain)*(1-SKY.snow),t,1);
  // Oiseaux le jour quand il fait beau; hibou la nuit
  AU.birdT-=dt;if(AU.birdT<=0){AU.birdT=2+Math.random()*7;if(day>0.6&&SKY.rain<0.3&&SKY.snow<0.3)bird();}
  AU.owlT-=dt;if(AU.owlT<=0){AU.owlT=35+Math.random()*50;if(day<0.3)owl();}
  updateEngines();
}
