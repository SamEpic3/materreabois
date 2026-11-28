/* Remorque à véhicule (plateau) : rampes à l'arrière qu'on baisse ou qu'on lève, on y monte en VTT ou en pick-up.
   Un véhicule arrêté sur le plateau, que personne ne conduit, est « soudé » à la remorque : il la suit sans tomber. */
const PLAT={L:5.8,W:2.1,DY:0.62,RL:2.0};          // longueur et largeur du plateau, hauteur du plancher, longueur des rampes
PLAT.A=Math.asin(PLAT.DY/PLAT.RL);PLAT.RH=PLAT.RL*Math.cos(PLAT.A);   // angle et portée au sol des rampes baissées

function makePlateau(){
  const g=new T.Group(),L=PLAT.L,W=PLAT.W,Y=PLAT.DY;
  const steel=new T.MeshPhongMaterial({color:0x2d3338,shininess:40,specular:0x333333}),wood=new T.MeshPhongMaterial({color:0x8a6a44,flatShading:true,shininess:6}),
        alu=new T.MeshPhongMaterial({color:0xb9bec2,shininess:70,specular:0x777777}),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0x8a8e92,shininess:50});
  // Plancher de madriers (petits joints entre les planches)
  const planks=[];const n=9,pw=W/n;for(let k=0;k<n;k++)planks.push(new T.BoxGeometry(pw-0.02,0.06,L).translate(-W/2+pw*(k+0.5),Y-0.03,0));
  g.add(new T.Mesh(mergeGeos(planks),wood));
  // Châssis : longerons, traverses, rives avec pochettes, garde-boue, timon en V et cric
  const st=[new T.BoxGeometry(0.12,0.16,L).translate(W/2-0.06,Y-0.14,0),new T.BoxGeometry(0.12,0.16,L).translate(-W/2+0.06,Y-0.14,0),
    new T.BoxGeometry(0.08,0.1,L+0.04).translate(W/2+0.02,Y-0.02,0),new T.BoxGeometry(0.08,0.1,L+0.04).translate(-W/2-0.02,Y-0.02,0)];
  for(let k=0;k<=6;k++)st.push(new T.BoxGeometry(W,0.08,0.08).translate(0,Y-0.12,-L/2+0.04+k*(L-0.08)/6));
  for(let k=0;k<5;k++){const z=-L/2+0.5+k*(L-1)/4;st.push(new T.BoxGeometry(0.1,0.1,0.08).translate(W/2+0.06,Y-0.01,z),new T.BoxGeometry(0.1,0.1,0.08).translate(-W/2-0.06,Y-0.01,z));}
  [1,-1].forEach(s=>{const fs=new T.Shape();fs.moveTo(-0.95,Y-0.06);fs.lineTo(-0.85,Y+0.12);fs.lineTo(0.85,Y+0.12);fs.lineTo(0.95,Y-0.06);fs.lineTo(-0.95,Y-0.06);st.push(sideExtrude(fs,0.3,0.01).translate(s*(W/2+0.2),0,-0.15));});
  const tl=TSPECS_PLAT_TL;
  st.push(new T.BoxGeometry(0.1,0.1,Math.hypot(tl-L/2,0.9)).rotateY(-Math.atan2(0.9,tl-L/2)).translate(0.45,Y-0.12,(tl+L/2)/2),
          new T.BoxGeometry(0.1,0.1,Math.hypot(tl-L/2,0.9)).rotateY(Math.atan2(0.9,tl-L/2)).translate(-0.45,Y-0.12,(tl+L/2)/2),
          new T.BoxGeometry(0.12,0.08,0.3).translate(0,HITCH_Y-0.02,tl-0.12),new T.CylinderGeometry(0.06,0.06,0.62,10).translate(0.3,Y-0.25,tl-0.9),new T.CylinderGeometry(0.1,0.1,0.04,12).translate(0.3,0.04,tl-0.9));
  // Ridelle avant : arrête les roues
  st.push(new T.BoxGeometry(0.08,0.62,0.08).translate(W/2-0.04,Y+0.31,L/2-0.04),new T.BoxGeometry(0.08,0.62,0.08).translate(-W/2+0.04,Y+0.31,L/2-0.04),new T.BoxGeometry(0.08,0.62,0.08).translate(0,Y+0.31,L/2-0.04),
          new T.BoxGeometry(W,0.08,0.08).translate(0,Y+0.62,L/2-0.04),new T.BoxGeometry(W,0.06,0.06).translate(0,Y+0.32,L/2-0.04));
  g.add(new T.Mesh(mergeGeos(st),steel));
  g.add(new T.Mesh(new T.CylinderGeometry(0.055,0.055,0.06,10).translate(0,HITCH_Y+0.03,tl),steel));
  // Feux arrière
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.14,0.06,0.03).translate(W/2-0.1,Y-0.08,-L/2-0.02),new T.BoxGeometry(0.14,0.06,0.03).translate(-W/2+0.1,Y-0.08,-L/2-0.02)]),new T.MeshBasicMaterial({color:0xc0261e})));
  // Deux essieux sous les garde-boue
  const Wg=wheelGeo(0.31,0.2),wheels=[];
  [W/2+0.2,-W/2-0.2].forEach(x=>[0.3,-0.6].forEach(z=>{const w=new T.Group();w.add(new T.Mesh(Wg.tread,tire),new T.Mesh(Wg.rim,hub));w.position.set(x,0.31,z);g.add(w);wheels.push(w);}));
  // Rampes en aluminium (charnière à l'arrière du plancher)
  const ramps=[];
  [0.62,-0.62].forEach(x=>{const p=new T.Group();p.position.set(x,Y,-L/2);
    const rg=[new T.BoxGeometry(0.6,0.05,PLAT.RL).translate(0,-0.025,-PLAT.RL/2),new T.BoxGeometry(0.05,0.1,PLAT.RL).translate(0.29,-0.03,-PLAT.RL/2),new T.BoxGeometry(0.05,0.1,PLAT.RL).translate(-0.29,-0.03,-PLAT.RL/2)];
    for(let k=1;k<9;k++)rg.push(new T.BoxGeometry(0.56,0.03,0.04).translate(0,0.01,-k*PLAT.RL/9));   // barreaux antidérapants
    p.add(new T.Mesh(mergeGeos(rg),alu));g.add(p);ramps.push(p);});
  const cargo=new T.Group();g.add(cargo);
  shadows(g);addSilhouette(g);
  return {g,wheels,cargo,ramps};
}
const TSPECS_PLAT_TL=PLAT.L/2+1.6;
TSPECS.plateau={name:'remorque à véhicule',label:'Plateau',build:makePlateau,tl:TSPECS_PLAT_TL,cols:[[2.2,1.08],[0.73,1.08],[-0.73,1.08],[-2.2,1.08]],hl:2.9,hw:1.05,cap:0,r:2.6,wr:0.31,tilt:0.02,
  plateau:true,slots:[],stats:'Embarque 2 VTT ou 1 pick-up · rampes à l\'arrière · s\'attache au VTT ou au pick-up'};
VEH_SHOP.push({id:'plateau',kind:'trailer',name:'Remorque à véhicule',price:2400,desc:'Plateau de 19 pi avec rampes : baisse les rampes, monte ton VTT ou ton pick-up dessus et arrête-toi. Une fois débarqué, le véhicule reste attaché pendant le transport.'});

/* ----- Géométrie : où est-on par rapport au plateau ----- */
const _pv=new T.Vector3();
function platLocal(t,x,z){const o=t.mesh.g.position,dx=x-o.x,dz=z-o.z,s=Math.sin(t.th),c=Math.cos(t.th);return {lz:dx*s+dz*c,lat:dx*c-dz*s};}
function deckY(t,lat,lz){t.mesh.g.updateMatrixWorld();return t.mesh.g.localToWorld(_pv.set(lat,PLAT.DY,lz)).y;}
function onDeck(t,l,m){return Math.abs(l.lat)<PLAT.W/2+(m||0)&&l.lz>-PLAT.L/2-(m||0)&&l.lz<PLAT.L/2+(m||0);}
function onRamp(t,l){return t.ramps&&Math.abs(l.lat)<PLAT.W/2&&l.lz<=-PLAT.L/2&&l.lz>-PLAT.L/2-PLAT.RH;}
const plats=()=>trailers.filter(t=>t.spec.plateau);
// Hauteur sous les roues d'un véhicule : le sol, le plateau ou les rampes
function surfH(x,z){
  let h=H(x,z);
  for(const t of trailers){if(!t.spec.plateau||Math.abs(x-t.x)>8||Math.abs(z-t.z)>8)continue;
    const l=platLocal(t,x,z);
    if(onDeck(t,l,0.02))h=Math.max(h,deckY(t,l.lat,l.lz));
    else if(onRamp(t,l)){const f=(l.lz+PLAT.L/2+PLAT.RH)/PLAT.RH,end=-PLAT.L/2-PLAT.RH,s=Math.sin(t.th),c=Math.cos(t.th),o=t.mesh.g.position;
      const ex=o.x+s*end+c*l.lat,ez=o.z+c*end-s*l.lat;h=Math.max(h,lerp(H(ex,ez),deckY(t,l.lat,-PLAT.L/2),f));}
  }
  return h;
}
// Le véhicule arrive par l'arrière (ou est déjà dessus) : le plateau ne le bloque pas comme un obstacle
function boarding(v,t){
  if(!v||!t.spec.plateau||t.hitch===v)return false;
  const l=platLocal(t,v.x,v.z);
  if(onDeck(t,l,0.1))return true;
  return !!t.ramps&&Math.abs(l.lat)<PLAT.W/2+0.4&&l.lz<-PLAT.L/2&&l.lz>-PLAT.L/2-PLAT.RH-v.spec.hl-2.2&&Math.abs(Math.sin(wrapAng(v.th-t.th)))<0.62;
}
// Sur le plateau : on ne tombe pas par les côtés, la ridelle arrête à l'avant et, rampes levées, on ne recule pas dans le vide
function platBlock(v,x,z,th){
  const fx=Math.sin(th),fz=Math.cos(th),sx=Math.cos(th),sz=-Math.sin(th),hl=v.spec.hl+0.15,hw=v.spec.hw+0.05;
  for(const t of trailers){if(!t.spec.plateau||t.hitch===v||Math.abs(x-t.x)>9||Math.abs(z-t.z)>9)continue;
    const c=platLocal(t,x,z);
    const onIt=onDeck(t,c,0.1),onR=onRamp(t,c);if(!onIt&&!onR)continue;
    for(const [a,b] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const l=platLocal(t,x+fx*hl*a+sx*hw*b,z+fz*hl*a+sz*hw*b);
      if(Math.abs(l.lat)>PLAT.W/2+(onR?0.7:0.35))return true;
      if(l.lz>PLAT.L/2+0.05)return true;
      if(l.lz<-PLAT.L/2-0.1&&!t.ramps)return true;}
  }
  return false;
}

/* ----- Guidage : en montant, le véhicule se recentre et s'aligne sur le plateau (comme des rails) ----- */
function guideOnPlat(v,dt){
  if(Math.abs(v.v)<0.1)return;
  for(const t of trailers){if(!t.spec.plateau||!boarding(v,t))continue;
    const l=platLocal(t,v.x,v.z);if(l.lz<-PLAT.L/2-PLAT.RH-v.spec.hl-1.2)continue;
    const k=Math.min(1,Math.abs(v.v)*dt*1.4),s=Math.sin(t.th),c=Math.cos(t.th);
    const want=Math.cos(wrapAng(v.th-t.th))>=0?t.th:t.th+Math.PI;   // en marche avant ou à reculons
    v.th+=wrapAng(want-v.th)*k;v.x-=c*l.lat*k;v.z+=s*l.lat*k;return;}
}
{const _uv=updateVehicle;updateVehicle=function(v,dt){_uv(v,dt);if(!v.onTr&&!v.spec.boat&&(v.driver||(S.mode==='vtt'&&V===v)))guideOnPlat(v,dt);};}

/* ----- Soudé à la remorque ----- */
function deckUnder(v){
  for(const t of trailers){if(!t.spec.plateau||t.hitch===v)continue;const l=platLocal(t,v.x,v.z);if(onDeck(t,l))return {t,l};}
  return null;
}
function weldIfParked(v,driving){
  if(driving||v.driver||v.onTr||v.spec.boat||Math.abs(v.v)>0.05)return;
  const d=deckUnder(v);if(!d)return;
  v.onTr={tid:d.t.id,lz:d.l.lz,lat:d.l.lat,dth:wrapAng(v.th-d.t.th)};v.v=0;
}
const _wq=new T.Quaternion(),_wy=new T.Vector3(0,1,0);
function placeWelded(){
  vehicles.forEach(v=>{if(!v.onTr)return;
    const t=trailers.find(t=>t.id===v.onTr.tid);if(!t){v.onTr=null;return;}
    const o=v.onTr,g=t.mesh.g;g.updateMatrixWorld();const p=g.localToWorld(_pv.set(o.lat,PLAT.DY,o.lz));
    v.x=p.x;v.z=p.z;v.th=t.th+o.dth;
    v.q.copy(g.quaternion).multiply(_wq.setFromAxisAngle(_wy,o.dth));
    v.mesh.g.position.copy(p);v.mesh.g.quaternion.copy(v.q);
  });
}
{const _mt=makeTrailerObj;makeTrailerObj=function(kind,x,z,th,id){const t=_mt(kind,x,z,th,id);if(t.spec.plateau){t.ramps=true;t.mesh.ramps.forEach(r=>r.rotation.x=-PLAT.A);}return t;};}
function weldedOn(v,t){return !!(v.onTr&&v.onTr.tid===t.id);}

/* ----- Les obstacles : le plateau ne gêne pas celui qui embarque; les véhicules soudés suivent leur remorque ----- */
{const _bc=bodyCircles;bodyCircles=function(except){
  const a=[];vehicles.forEach(v=>{if(v===except)return;if(v.onTr&&except){const t=trailers.find(t=>t.id===v.onTr.tid);if(t&&t.hitch===except)return;}a.push(...vehCircles(v,v.x,v.z,v.th));});
  trailers.forEach(t=>{if(except&&(t.hitch===except||boarding(except,t)))return;a.push(...trCircles(t,t.x,t.z,t.th));});
  return a;};}
{const _bb=buildBodies;buildBodies=function(v,tw){
  const B=_bb(v,tw);
  return B.filter(b=>{
    if(b.kind==='tr'&&boarding(v,b.o))return false;
    if(b.kind==='tr'&&b.o.spec.plateau)b.locked=true;   // une remorque à véhicule dételée ne se pousse pas (elle est lourde et sur son cric)
    if(b.kind==='tr'&&b.o.spec.plateau&&vehicles.some(o=>weldedOn(o,b.o)))b.locked=true;   // chargée : on ne la pousse pas
    if(b.kind==='veh'&&b.t&&b.t.spec.plateau){b.locked=true;   // véhicule attelé à un plateau qu'on charge : il ne bouge pas
      if(boarding(v,b.t)){const o=b.o;b.circles=()=>vehCircles(o,o.x,o.z,o.th);b.cur=b.circles();}}
    if(b.kind==='veh'&&b.o.onTr){const t=trailers.find(t=>t.id===b.o.onTr.tid);if(t&&(t===tw||t.hitch===v))return false;b.locked=true;}
    return true;});};}
{const _u=updateVTT;updateVTT=function(dt){
  _u(dt);
  plats().forEach(t=>{const a=t.ramps?-PLAT.A:Math.PI/2;t.mesh.ramps.forEach(r=>{r.rotation.x+=(a-r.rotation.x)*Math.min(1,dt*5);});});
  placeWelded();};}

/* ----- Baisser ou lever les rampes ----- */
function rampEnd(t){const s=Math.sin(t.th),c=Math.cos(t.th),d=PLAT.L/2+PLAT.RH*0.6;return {x:t.x-s*d,z:t.z-c*d};}
function nearRamp(x,z,r){let best=null,bd=r;plats().forEach(t=>{const e=rampEnd(t),d=Math.hypot(x-e.x,z-e.z);if(d<bd){bd=d;best=t;}});return best;}
function toggleRamps(t){t.ramps=!t.ramps;toast(t.ramps?'Rampes baissées : monte dessus et arrête-toi':'Rampes levées');if(typeof sfxThud==='function')sfxThud(t.x,t.z);}
{const _ctx=context;context=function(){
  const r=_ctx();if(!r)return r;
  let t=null;
  if(S.mode==='foot'&&!S.inside&&!P.carry&&!P.pail)t=nearRamp(P.x,P.z,2.6);
  else if(S.mode==='vtt'&&V&&!V.spec.boat&&Math.abs(V.v)<0.8){t=nearRamp(V.x,V.z,V.spec.hl+3.2);if(t&&t.hitch===V)t=null;}
  if(t){const a={label:t.ramps?'Lever les rampes':'Baisser les rampes',fn:()=>toggleRamps(t)};
    if(!r.act)r.act=a;else if(!r.act2)r.act2=a;}
  return r;};}
