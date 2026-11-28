/* Klaxon : touche H (ou le bouton 📯 au téléphone) quand on conduit. Chaque véhicule a sa voix; l'autre joueur l'entend aussi. */
const HORN={vtt:{f:[440,554],type:'square',vol:0.16,cut:2600},pickup:{f:[349,440],type:'sawtooth',vol:0.17,cut:2000},
  skid:{f:[196,247],type:'sawtooth',vol:0.22,cut:1300},abat:{f:[185,233],type:'sawtooth',vol:0.22,cut:1200},moto:{f:[587],type:'square',vol:0.14,cut:3200}};
const hornVoice=t=>HORN[t]||HORN.pickup;
let hornNow=null;
function hornStart(type,x,z,maxDur){
  if(!ready())return null;const h=hornVoice(type),sp=spatial(x,z,90);if(sp.g<0.01)return null;
  const ctx=AU.ctx,t=ctx.currentTime,o=out(sp.g*h.vol,sp.pan),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=h.cut;lp.connect(o);
  const env=ctx.createGain();env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(1,t+0.02);env.connect(lp);
  const osc=h.f.map(f=>{const s=ctx.createOscillator();s.type=h.type;s.frequency.value=f;s.connect(env);s.start(t);return s;});
  const n={env,osc,stopped:false,stop(){if(this.stopped)return;this.stopped=true;const t2=ctx.currentTime;env.gain.cancelScheduledValues(t2);env.gain.setValueAtTime(env.gain.value,t2);env.gain.linearRampToValueAtTime(0,t2+0.05);osc.forEach(s=>s.stop(t2+0.08));}};
  setTimeout(()=>n.stop(),(maxDur||2.5)*1000);
  return n;
}
function canHorn(){return S.mode==='vtt'&&V&&!V.spec.boat;}
function hornDown(){if(!canHorn()||hornNow)return;hornNow=hornStart(V.type,V.x,V.z,2.5)||{stop(){}};hornNow.t0=performance.now();
  try{if(NET.on)netSend({t:'emote',e:'fx:horn:'+V.type});}catch(e){}}
function hornUp(){if(!hornNow)return;const n=hornNow;hornNow=null;const held=performance.now()-n.t0;
  if(held<250)setTimeout(()=>n.stop(),250-held);else n.stop();}   // un petit coup dure au moins un quart de seconde
addEventListener('keydown',e=>{if(e.code==='KeyH'&&!e.repeat&&!(typeof CHAT!=='undefined'&&CHAT.open))hornDown();});
addEventListener('keyup',e=>{if(e.code==='KeyH')hornUp();});
addEventListener('blur',hornUp);
{const b=$('btnHorn');if(b){const on=e=>{e.preventDefault();b.classList.add('on');hornDown();},off=()=>{b.classList.remove('on');hornUp();};
  b.addEventListener('touchstart',on,{passive:false});b.addEventListener('touchend',off);b.addEventListener('touchcancel',off);b.addEventListener('mousedown',on);b.addEventListener('mouseup',off);b.addEventListener('mouseleave',off);}}
// Le klaxon de l'autre joueur (relayé comme les émoticônes)
{const _fx=onNetFx;onNetFx=function(from,e){const m=/^fx:horn:(\w+)$/.exec(e);if(!m)return _fx(from,e);
  const a=NET.avatars[from];if(!a)return;const v=vehicles.find(v=>v.driver===from);hornStart(m[1],v?v.x:a.x,v?v.z:a.z,0.6);};}
