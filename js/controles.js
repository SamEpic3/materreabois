/* Contrôles : clavier, joystick, toucher, boutons, caméras */
/* ---------- Entrées ---------- */
const keys={};
const joy={active:false,id:null,cx:0,cy:0,x:0,y:0};
const pedal={gas:false,brake:false};
addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;   // on écrit (nom, code, clavardage)
  if((e.code==='Enter'||e.code==='KeyT')&&!e.repeat&&typeof NET!=='undefined'&&NET.on&&NET.ready&&$('help').classList.contains('hidden')&&!CHAT.open){e.preventDefault();openChat();return;}
  if(!$('look').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE'){closeLook();e.preventDefault();}return;}
  if(invOpen()){if(e.code==='Escape'||e.code==='KeyI'||e.code==='Tab'||e.code==='KeyE'){closeInv();e.preventDefault();}return;}
  if(!$('shop').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE')closeShop();return;}
  if(!$('journal').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE'||e.code==='Space'||e.code==='KeyJ')closeJournal();e.preventDefault();return;}
  if(!$('proj').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE'||e.code==='Space')closeProjects();e.preventDefault();return;}
  if(!$('board').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE'||e.code==='Space')closeBoard();e.preventDefault();return;}
  if($('help').classList.contains('hidden')===false&&e.code!=='Escape')return;
  if((e.code==='AltLeft'||e.code==='AltRight')&&!e.repeat){e.preventDefault();toggleCursor();return;}
  keys[e.code]=true;
  if(e.code==='KeyE'&&!e.repeat)doEnter();
  if(e.code==='KeyR'&&!e.repeat){if(S.mode==='place')rotatePlace();else if(S.mode==='pick'){}else doHitch();}
  if(e.code==='KeyF'&&!e.repeat)doAct2();
  if(e.code==='Space'&&!e.repeat){if(S.mode==='foot'&&!context().act)jump();else doAct();}
  if(e.code==='KeyZ')rotateCam(-1);
  if(e.code==='KeyC')rotateCam(1);
  if(e.code==='KeyV'&&!e.repeat)toggleCam();
  if(e.code==='KeyJ'&&!e.repeat)openJournal();
  if(e.code==='KeyM'&&!e.repeat)setSound(!AU.on);
  if((e.code==='KeyI'||e.code==='Tab')&&!e.repeat){e.preventDefault();openInv();}
  if(e.code==='KeyQ'&&!e.repeat)dropHeld();
  const dg=/^Digit([1-9])$/.exec(e.code);if(dg&&!e.repeat)selectSlot(+dg[1]-1);
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;pedal.gas=pedal.brake=false;});

function readInput(normalize){
  let x=0,y=0;
  if(keys.KeyA||keys.ArrowLeft)x-=1;if(keys.KeyD||keys.ArrowRight)x+=1;
  if(keys.KeyW||keys.ArrowUp)y+=1;if(keys.KeyS||keys.ArrowDown)y-=1;
  if(joy.active){x+=joy.x;y+=joy.y;}
  if(normalize){const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}}
  return {x:clamp(x,-1,1),y:clamp(y,-1,1)};
}

const joyEl=$('joy'),knob=$('joyKnob'),JR=55;
const pointers=new Map();let pinch=null,pinchUsed=false;
canvas.addEventListener('pointerdown',e=>{
  const q=toView(e.clientX,e.clientY);
  if(e.pointerType==='touch'&&!joy.active&&q.x<viewW()*0.42&&S.mode!=='place'&&S.mode!=='pick'){
    joy.active=true;joy.id=e.pointerId;joy.cx=q.x;joy.cy=q.y;joy.x=joy.y=0;
    joyEl.style.left=q.x+'px';joyEl.style.top=q.y+'px';joyEl.classList.remove('hidden');
    knob.style.transform='translate(0,0)';P.target=null;
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    return;
  }
  pointers.set(e.pointerId,{x:q.x,y:q.y,sx:q.x,sy:q.y,t:performance.now()});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:zoom,cd:chaseDist};pinchUsed=true;}
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
});
canvas.addEventListener('pointermove',e=>{
  if(mouseLocked())return;          // vue à la souris : gérée par mousemove plus bas
  const q=toView(e.clientX,e.clientY);
  if(joy.active&&e.pointerId===joy.id){
    let dx=q.x-joy.cx,dy=q.y-joy.cy;const l=Math.hypot(dx,dy);if(l>JR){dx*=JR/l;dy*=JR/l;}
    joy.x=dx/JR;joy.y=-dy/JR;knob.style.transform=`translate(${dx}px,${dy}px)`;knob.classList.toggle('run',S.mode==='foot'&&Math.hypot(joy.x,joy.y)>0.95&&!P.carry);return;
  }
  const p=pointers.get(e.pointerId);if(!p)return;
  if((S.mode==='place'||S.mode==='pick')&&pointers.size===1&&(e.pointerType!=='mouse'||e.buttons)&&(p.drag||Math.hypot(q.x-p.sx,q.y-p.sy)>12)){p.drag=true;mapPan(q.x-p.x,q.y-p.y);}
  if(camMode!=='iso'&&pointers.size===1&&(e.pointerType!=='mouse'||e.buttons)&&Math.hypot(q.x-p.sx,q.y-p.sy)>12){
    if(RV()){camVehOff=wrapAng(camVehOff-(q.x-p.x)*0.008);camYaw-=(q.x-p.x)*0.008;}else{camYawT-=(q.x-p.x)*0.008;camYaw=camYawT;}
    if(camMode==='fp')camPitch=clamp(camPitch-(q.y-p.y)*0.006,-1.2,0.9);
    else camTpTilt=clamp(camTpTilt+(q.y-p.y)*0.005,-0.6,1.0);}
  p.x=q.x;p.y=q.y;
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];const r=pinch.d/(Math.hypot(a.x-b.x,a.y-b.y)||1);if(camMode==='tp')chaseDist=clamp(pinch.cd*r,0.5,2.5);else if(camMode==='iso'){zoom=clamp(pinch.z*r,ZMIN,ZMAX);updateProj();}}
});
function endPointer(e){
  if(joy.active&&e.pointerId===joy.id){joy.active=false;joy.x=joy.y=0;knob.classList.remove('run');joyEl.classList.add('hidden');return;}
  const p=pointers.get(e.pointerId);if(!p)return;
  if(e.type==='pointerup'&&!pinchUsed&&pointers.size===1&&Math.hypot(p.x-p.sx,p.y-p.sy)<12&&performance.now()-p.t<500)tap(p.x,p.y);
  pointers.delete(e.pointerId);
  if(pointers.size<2)pinch=null;
  if(pointers.size===0)pinchUsed=false;
}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist*(1+e.deltaY*0.0012),0.5,2.5);return;}zoom=clamp(zoom*(1+e.deltaY*0.0012),ZMIN,ZMAX);updateProj();},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

const ray=new T.Raycaster(),ndc=new T.Vector2();
function tap(cx,cy){
  if(S.mode!=='foot'&&S.mode!=='place'&&S.mode!=='pick')return;
  if(S.mode==='foot'&&camMode!=='iso')return;     // en 1re et 3e personne, on ne se déplace pas en cliquant
  ndc.set(cx/viewW()*2-1,-(cy/viewH())*2+1);
  ray.setFromCamera(ndc,activeCam);
  const hit=ray.intersectObjects(TERRAIN_TILES.filter(m=>m.visible))[0];
  if(S.mode!=='foot'){if(hit)mapTap(hit.point.x,hit.point.z);return;}
  if(hit){P.target={x:hit.point.x,z:hit.point.z};marker.position.set(hit.point.x,hit.point.y+0.06,hit.point.z);marker.visible=true;marker.material.opacity=0.8;}
}

function holdBtn(el,prop){
  const on=e=>{e.preventDefault();pedal[prop]=true;el.classList.add('on');};
  const off=()=>{pedal[prop]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);
}
holdBtn($('btnGas'),'gas');holdBtn($('btnBrake'),'brake');
const gripK={l:false,r:false};
[['gripL','l'],['gripR','r']].forEach(([id,k])=>{const el=$(id);const on=e=>{e.preventDefault();gripK[k]=true;el.classList.add('on');};const off=()=>{gripK[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);});
$('btnEnter').addEventListener('pointerdown',e=>{e.preventDefault();doEnter();});
$('btnHitch').addEventListener('pointerdown',e=>{e.preventDefault();doHitch();});
$('btnAct2').addEventListener('pointerdown',e=>{e.preventDefault();doAct2();});
$('btnAct').addEventListener('pointerdown',e=>{e.preventDefault();doAct();});

/* ---------- Caméra ---------- */
let camAz=Math.PI/4,camAzT=camAz;
const camT=new T.Vector3(P.x,H(P.x,P.z),P.z);
function rotateCam(d){if(camMode!=='iso'){if(RV())camVehOff=wrapAng(camVehOff+d*Math.PI/4);else camYawT+=d*Math.PI/4;}else camAzT+=d*Math.PI/2;}
const FOG=new T.Fog(SKY_HORIZON,30,110);
function toggleCam(){
  if(S.mode==='place'||S.mode==='pick'){toast('Vue isométrique pendant la construction');return;}
  applyCamMode(camMode==='iso'?'tp':camMode==='tp'?'fp':'iso');
  toast(camMode==='tp'?'Vue 3e personne':camMode==='fp'?(FINE_PTR?'Vue 1re personne — la souris tourne la vue (Alt : curseur)':'Vue 1re personne'):'Vue isométrique');
}
function applyCamMode(m){
  camMode=m;
  activeCam=camMode==='iso'?camera:pcam;
  scene.fog=camMode==='iso'?null:FOG;sky.visible=camMode!=='iso';
  silMat.visible=camMode==='iso';
  player.g.visible=camMode!=='fp'&&!(RV()&&RV().spec.hide);
  pcam.fov=camMode==='fp'?70:60;pcam.updateProjectionMatrix();camPitch=-0.1;
  camYaw=camYawT=RV()?RV().th+camVehOff:P.rot;
  $('cross').classList.toggle('hidden',camMode!=='fp');
  if(camMode==='fp'){cursorFree=false;tryLock();}else if(mouseLocked())document.exitPointerLock();
}
$('btnCam').addEventListener('click',toggleCam);
$('rotL').addEventListener('click',()=>rotateCam(-1));
$('rotR').addEventListener('click',()=>rotateCam(1));
$('zIn').addEventListener('click',()=>{if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist/1.25,0.5,2.5);return;}zoom=clamp(zoom/1.25,ZMIN,ZMAX);updateProj();});
$('zOut').addEventListener('click',()=>{if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist*1.25,0.5,2.5);return;}zoom=clamp(zoom*1.25,ZMIN,ZMAX);updateProj();});
$('btnHelp').addEventListener('click',()=>{$('helpBody').classList.remove('hidden');$('startForm').classList.toggle('hidden',started);$('help').classList.remove('hidden');});
$('helpClose').addEventListener('click',()=>$('help').classList.add('hidden'));
$('btnStart').addEventListener('click',()=>{if(started){$('help').classList.add('hidden');return;}startClicked();});
const ELEV=0.6155; // 35,26° : vraie isométrique
// Menu ☰ (écrans étroits) : montre/cache les boutons secondaires
$('btnMenu').addEventListener('click',()=>$('camBtns').classList.toggle('open'));

/* ---------- Ordinateur : en 1re personne, la souris tourne la vue sans cliquer (verrouillage du pointeur).
   Alt (ou Échap) libère le curseur ; Alt ou un clic le reprend. ---------- */
const FINE_PTR=matchMedia('(pointer:fine)').matches&&!matchMedia('(pointer:coarse)').matches;
let cursorFree=false,lockTry=0;
function mouseLocked(){return document.pointerLockElement===canvas;}
function uiOpen(){return ['look','shop','journal','proj','board','help'].some(id=>{const el=$(id);return el&&!el.classList.contains('hidden');})||invOpen()||(typeof CHAT!=='undefined'&&CHAT.open);}
function wantLock(){return FINE_PTR&&started&&(camMode==='fp'||SCOPE)&&!cursorFree&&!uiOpen()&&S.mode!=='place'&&S.mode!=='pick';}
function tryLock(){if(!wantLock()||mouseLocked()||performance.now()-lockTry<600)return;lockTry=performance.now();try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(_){}}
function toggleCursor(){
  if(!FINE_PTR||camMode!=='fp')return;
  cursorFree=!cursorFree;
  if(cursorFree){if(mouseLocked())document.exitPointerLock();toast('Curseur libre — Alt ou clic pour reprendre la vue');}
  else tryLock();
}
document.addEventListener('pointerlockchange',()=>{if(!mouseLocked()&&camMode==='fp'&&!uiOpen())cursorFree=true;$('cross').classList.toggle('free',!mouseLocked());});
document.addEventListener('mousemove',e=>{
  if(!mouseLocked())return;
  const dx=e.movementX||0,dy=e.movementY||0;
  if(Math.abs(dx)>300||Math.abs(dy)>300)return;   // sauts parasites de certains navigateurs
  const sens=SCOPE?0.25:1;
  if(RV()){camVehOff=wrapAng(camVehOff-dx*0.0028);camYaw-=dx*0.0028;}else{camYawT-=dx*0.0028*sens;camYaw=camYawT;}
  camPitch=clamp(camPitch-dy*0.0024*sens,-1.2,0.9);
});
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button===2&&(canScope()||SCOPE)){e.stopImmediatePropagation();e.preventDefault();setScope(!SCOPE);return;}   // clic droit : entre / sort de la lunette
  if(e.pointerType!=='mouse'||!FINE_PTR||camMode!=='fp')return;
  if(mouseLocked()){e.stopImmediatePropagation();e.preventDefault();if(e.button===0)fpClick();return;}
  if(cursorFree&&S.mode==='foot'&&!uiOpen()){cursorFree=false;tryLock();}
},true);
function fpClick(){if(typeof huntClick==='function'&&huntClick())return;doAct();}
// En boucle : quitte le verrou quand un panneau s'ouvre, le reprend après (le geste récent du joueur le permet)
function updateMouseLock(){
  if(mouseLocked()&&!wantLock()&&!cursorFree)document.exitPointerLock();
  else if(wantLock()&&!mouseLocked()&&(!navigator.userActivation||navigator.userActivation.isActive))tryLock();
}

/* ---------- Lunette de la carabine : clic droit (maintenu) ou bouton 🔭 ; zoom ×4 ---------- */
let SCOPE=false;
function canScope(){return camMode!=='iso'&&S.mode==='foot'&&TOOL&&(TOOL.kind==='rifle'||TOOL.kind==='binoc')&&!P.carry&&!P.pail;}
function setScope(on){
  on=!!on&&canScope();if(on===SCOPE)return;
  SCOPE=on;
  if(on&&camMode==='tp')camPitch=0;
  pcam.fov=on?15:60;pcam.updateProjectionMatrix();scopeTool=TOOL;
  $('cross').classList.toggle('scoped',on);
  const bin=on&&TOOL&&TOOL.kind==='binoc';
  $('scope').classList.toggle('hidden',!on||bin);$('binoc').classList.toggle('hidden',!bin);$('btnScope').classList.toggle('on',on);
  player.g.visible=!on&&camMode!=='fp';
}
$('btnScope').addEventListener('click',()=>setScope(!SCOPE));
let scopeTool=null;
function updateScope(){
  if(SCOPE&&(!canScope()||TOOL!==scopeTool))setScope(false);   // changer d'outil sort de la lunette
  if(!SCOPE)scopeTool=TOOL;
  $('btnScope').classList.toggle('hidden',!canScope());
}
$('btnRescue').addEventListener('click',()=>rescueMine());
