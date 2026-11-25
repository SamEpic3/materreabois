/* Intérieur de la cabane : on entre par la porte (E). Dedans : le poêle (si acheté), un lit superposé pour
   dormir la nuit, une table pour lire le journal et les prix. En vue de haut, le toit disparaît (maison de poupée). */
S.inside=false;
const CAB_W=6,CAB_D=4.5;
const IN_BOUNDS={x0:-2.45,x1:2.45,z0:-1.75,z1:1.75};      // où le bonhomme peut marcher (repère de la cabane)
const IN_DOOR={x:1.2,z:1.45};                            // juste en dedans de la porte
const IN_STOVE={x:2.1,z:-0.15},IN_TABLE={x:-1.05,z:0.75},IN_BED={x:-1.65,z:-1.62};
const IN_OBST=[[2.1,-0.8,0.42],[2.1,-0.15,0.42],[-1.05,0.75,0.62],[-2.2,-1.7,0.5],[-1.2,-1.7,0.5],[0.75,-1.85,0.42]];   // x, z, rayon
const cabW=(x,z)=>({x:CABIN.x+x,z:CABIN.z+z});
const cabL=(x,z)=>({x:x-CABIN.x,z:z-CABIN.z});
function inCabin(x,z){const l=cabL(x,z);return l.x>IN_BOUNDS.x0-0.2&&l.x<IN_BOUNDS.x1+0.2&&l.z>IN_BOUNDS.z0-0.2&&l.z<IN_BOUNDS.z1+0.2;}
const FLOOR_Y=0.12;

/* ----- Le décor intérieur (visible seulement quand on est dedans) ----- */
const interior=new T.Group();interior.visible=false;
const stoveGlowMat=new T.MeshBasicMaterial({color:0x2a1a14});
const inWinMat=new T.MeshBasicMaterial({color:0xcfe3f2});
const stoveG=new T.Group();
let inChimney;
{
  const g=interior,W=CAB_W,D=CAB_D;
  const wood=mat(0x8a6440),dark=mat(0x4d3220),iron=new T.MeshPhongMaterial({color:0x2b2b2d,shininess:40,specular:0x333333});
  // Plancher de planches et tapis tressé
  const fl=texMat(sidingTex('#9c7650','#6a4a2e',true),1,1);fl.map.repeat.set(1,10);fl.map.rotation=Math.PI/2;
  g.add(new T.Mesh(new T.BoxGeometry(W-0.3,0.04,D-0.3).translate(0,FLOOR_Y-0.02,0),fl));
  g.add(new T.Mesh(new T.CylinderGeometry(1,1,0.015,24).scale(0.85,1,0.55).translate(0.25,FLOOR_Y+0.01,0.55),mat(0x8e3b2a)));
  g.add(new T.Mesh(new T.CylinderGeometry(1,1,0.017,24).scale(0.62,1,0.38).translate(0.25,FLOOR_Y+0.012,0.55),mat(0xc9a66b)));
  // Cheminée de pierres (partie intérieure, montrée quand le toit est caché)
  inChimney=new T.Mesh(stoneStack(0.62,0.62,2.75,2.1,0,-0.8,9),new T.MeshPhongMaterial({color:0x8d8a84,flatShading:true,vertexColors:true,shininess:3}));g.add(inChimney);
  // Poêle à bois en fonte : pattes, corps, porte vitrée qui rougeoie, tuyau vers la cheminée
  const s=stoveG;
  s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.62,0.5,0.7).translate(0,0.45,0),new T.BoxGeometry(0.7,0.05,0.78).translate(0,0.72,0),
    ...[[-0.25,-0.28],[0.25,-0.28],[-0.25,0.28],[0.25,0.28]].map(([x,z])=>new T.CylinderGeometry(0.03,0.04,0.22,6).translate(x,0.11,z)),
    new T.CylinderGeometry(0.07,0.07,0.85,10).translate(0,1.15,-0.2),new T.CylinderGeometry(0.07,0.07,0.4,10).rotateX(Math.PI/2).translate(0,1.55,-0.38),
    new T.BoxGeometry(0.42,0.32,0.03).translate(0,0.46,0.36),new T.CylinderGeometry(0.025,0.025,0.1,6).rotateZ(Math.PI/2).translate(0.16,0.46,0.4)]),iron));
  const glow=new T.Mesh(new T.PlaneGeometry(0.28,0.2).translate(0,0.46,0.38),stoveGlowMat);s.add(glow);
  s.add(new T.Mesh(new T.CylinderGeometry(0.13,0.15,0.22,12).translate(0.45,FLOOR_Y+0.11,0.35),mat(0x6e6e70)));   // seau à cendre
  s.position.set(IN_STOVE.x,FLOOR_Y,IN_STOVE.z);g.add(s);
  // Petite corde de bois près du poêle
  const lg=[];for(let k=0;k<6;k++)lg.push(new T.CylinderGeometry(0.07,0.07,0.45,8).rotateZ(Math.PI/2).translate(1.35+(k%3)*0.15+(k>2?0.07:0),FLOOR_Y+0.07+(k>2?0.12:0),-1.85));
  g.add(new T.Mesh(mergeGeos(lg),logMatsFor('erable')));
  // Lit superposé (le long du mur du fond), couvertes à carreaux, oreillers
  const bx0=-2.75,bx1=-0.55,bz=IN_BED.z,bw=0.9;
  g.add(new T.Mesh(mergeGeos([[bx0,bz-bw/2],[bx1,bz-bw/2],[bx0,bz+bw/2],[bx1,bz+bw/2]].map(([x,z])=>new T.BoxGeometry(0.08,1.75,0.08).translate(x,FLOOR_Y+0.875,z))
    .concat([0.35,1.25].flatMap(y=>[new T.BoxGeometry(bx1-bx0,0.08,0.06).translate((bx0+bx1)/2,FLOOR_Y+y,bz-bw/2),new T.BoxGeometry(bx1-bx0,0.08,0.06).translate((bx0+bx1)/2,FLOOR_Y+y,bz+bw/2),
      new T.BoxGeometry(bx1-bx0-0.05,0.04,bw).translate((bx0+bx1)/2,FLOOR_Y+y-0.02,bz)]))
    .concat([0,1,2,3].map(k=>new T.BoxGeometry(0.04,0.04,0.36).translate(bx1+0.02,FLOOR_Y+0.45+k*0.27,bz+bw/2-0.2)))
    .concat([new T.BoxGeometry(0.05,1.2,0.05).translate(bx1+0.02,FLOOR_Y+0.75,bz+bw/2-0.02),new T.BoxGeometry(0.05,1.2,0.05).translate(bx1+0.02,FLOOR_Y+0.75,bz+bw/2-0.38)])),wood));
  const plaid=(a,b)=>texMat(canvasTex(32,32,(c,w,h)=>{c.fillStyle=a;c.fillRect(0,0,w,h);c.fillStyle=b;c.fillRect(0,12,w,8);c.fillRect(12,0,8,h);c.fillStyle='rgba(0,0,0,0.35)';c.fillRect(12,12,8,8);}),4,2);
  [[0.35,'#9a2b22','#2a2020'],[1.25,'#2f5a3a','#1d2a1d']].forEach(([y,a,b])=>{
    g.add(new T.Mesh(new T.BoxGeometry(bx1-bx0-0.12,0.16,bw-0.1).translate((bx0+bx1)/2,FLOOR_Y+y+0.08,bz),mat(0xe6dfcf)));
    g.add(new T.Mesh(new T.BoxGeometry(bx1-bx0-0.6,0.05,bw-0.06).translate((bx0+bx1)/2+0.24,FLOOR_Y+y+0.18,bz),plaid(a,b)));
    g.add(new T.Mesh(new T.BoxGeometry(0.4,0.1,0.6).translate(bx0+0.32,FLOOR_Y+y+0.21,bz),mat(0xf4f0e6)));
  });
  // Table, deux chaises, lampe à l'huile, tasses
  const tx=IN_TABLE.x,tz=IN_TABLE.z;
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.2,0.06,0.8).translate(tx,FLOOR_Y+0.75,tz),...[[-0.52,-0.32],[0.52,-0.32],[-0.52,0.32],[0.52,0.32]].map(([x,z])=>new T.BoxGeometry(0.07,0.72,0.07).translate(tx+x,FLOOR_Y+0.36,tz+z)),
    ...[-1,1].flatMap(sd=>{const cx=tx+sd*0.85;return [new T.BoxGeometry(0.42,0.05,0.42).translate(cx,FLOOR_Y+0.45,tz),...[[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]].map(([x,z])=>new T.BoxGeometry(0.04,0.45,0.04).translate(cx+x,FLOOR_Y+0.225,tz+z)),
      new T.BoxGeometry(0.04,0.5,0.4).translate(cx+sd*0.19,FLOOR_Y+0.72,tz),new T.BoxGeometry(0.04,0.06,0.4).translate(cx+sd*0.19,FLOOR_Y+0.95,tz)];})]),wood));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.07,0.08,0.05,10).translate(tx+0.25,FLOOR_Y+0.81,tz-0.1),new T.CylinderGeometry(0.02,0.02,0.12,6).translate(tx+0.25,FLOOR_Y+0.9,tz-0.1),new T.TorusGeometry(0.06,0.008,4,10).translate(tx+0.25,FLOOR_Y+1.05,tz-0.1)]),mat(0xb08a3a)));
  g.add(new T.Mesh(new T.CylinderGeometry(0.05,0.065,0.17,10).translate(tx+0.25,FLOOR_Y+0.96,tz-0.1),new T.MeshBasicMaterial({color:0xffe2a0,transparent:true,opacity:0.85})));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.045,0.04,0.09,10).translate(tx-0.3,FLOOR_Y+0.83,tz+0.15),new T.CylinderGeometry(0.045,0.04,0.09,10).translate(tx-0.1,FLOOR_Y+0.83,tz-0.2)]),mat(0xe8e0cc)));
  // Étagère : pots de sirop et bocaux
  const shx=0.75,shz=-1.95;
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.9,1.5,0.04).translate(shx,FLOOR_Y+0.75,shz-0.16),new T.BoxGeometry(0.04,1.5,0.36).translate(shx-0.45,FLOOR_Y+0.75,shz),new T.BoxGeometry(0.04,1.5,0.36).translate(shx+0.45,FLOOR_Y+0.75,shz),
    ...[0.05,0.55,1.05,1.48].map(y=>new T.BoxGeometry(0.9,0.04,0.36).translate(shx,FLOOR_Y+y,shz))]),wood));
  const jars=[];[0.6,1.1].forEach(y=>[-0.28,-0.08,0.12,0.3].forEach((x,i)=>jars.push(new T.CylinderGeometry(0.06,0.06,0.18,10).translate(shx+x,FLOOR_Y+y+0.11,shz+(i%2?0.04:-0.03)))));
  g.add(new T.Mesh(mergeGeos(jars),new T.MeshPhongMaterial({color:0xb5651d,shininess:60,transparent:true,opacity:0.9})));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.3,0.3,0.25).translate(shx-0.2,FLOOR_Y+0.22,shz),new T.BoxGeometry(0.25,0.2,0.25).translate(shx+0.2,FLOOR_Y+0.17,shz)]),mat(0x7a5a3a)));
  // Fenêtres vues de l'intérieur (la couleur suit le ciel) et porte
  const wf=[],wp=[];
  [[-1.4,D/2-0.16,Math.PI,1.0],[-W/2+0.16,0.4,Math.PI/2,0.7],[W/2-0.16,-0.3,-Math.PI/2,0.7]].forEach(([x,z,ry,w])=>{const ww=windowGeo(w,0.75,x,1.5,z,ry);wf.push(ww.frame);wp.push(ww.glass);});
  g.add(new T.Mesh(mergeGeos(wf),mat(0xe8e0cc)),new T.Mesh(mergeGeos(wp),inWinMat));
  const dg=doorGeo(0.95,1.9,1.2,D/2-0.17,Math.PI);g.add(new T.Mesh(dg.door,mat(0x6a4426)),new T.Mesh(dg.frame,dark),new T.Mesh(dg.knob,mat(0x2a2a2a)));
  // Crochets avec manteau à carreaux et raquettes au mur
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.5,0.75,0.08).translate(2.35,FLOOR_Y+1.35,D/2-0.22),new T.BoxGeometry(0.16,0.55,0.07).translate(2.12,FLOOR_Y+1.4,D/2-0.23).rotateZ(0)]),plaid('#a8322a','#1f1a1a')));
  g.add(new T.Mesh(new T.TorusGeometry(0.22,0.025,5,14).scale(0.7,1.5,1).translate(-W/2+0.2,FLOOR_Y+1.6,-0.7).rotateY(0),mat(0x9a7448)));
  interior.position.set(CABIN.x,CAMP_H,CABIN.z);
  interior.traverse(o=>{if(o.isMesh){o.receiveShadow=true;}});
  scene.add(interior);
}
// Bonhomme couché sur le lit du bas (tête vers le mur de gauche, sur le dos)
const SLEEP_Q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,0,-1),new T.Vector3(-1,0,0),new T.Vector3(0,1,0)));
const SLEEP_POS={x:-0.62,y:FLOOR_Y+0.72,z:IN_BED.z};

/* ----- Fondu au noir pour entrer, sortir et dormir ----- */
const fadeEl=document.createElement('div');fadeEl.id='fade';$('app').appendChild(fadeEl);
function fadeThrough(fn,ms){fadeEl.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>fadeEl.classList.remove('on'),60);},ms||260);}

let savedZoom=null;
function enterCabin(){
  fadeThrough(()=>{
    S.inside=true;const p=cabW(IN_DOOR.x,IN_DOOR.z);P.x=p.x;P.z=p.z;P.rot=Math.PI;P.target=null;marker.visible=false;
    if(camMode==='iso'){savedZoom=zoom;zoom=Math.min(zoom,8);updateProj();}
    if(camMode!=='iso'){camYaw=camYawT=Math.PI;}
    refreshInterior();
  });
}
function exitCabin(){
  fadeThrough(()=>{
    S.inside=false;P.x=CABIN_DOOR.x;P.z=CABIN_DOOR.z+0.5;P.rot=0;P.target=null;marker.visible=false;
    if(savedZoom!==null&&camMode==='iso'){zoom=savedZoom;updateProj();}savedZoom=null;
    if(camMode!=='iso'){camYaw=camYawT=0;}
    refreshInterior();
  });
}
function refreshInterior(){
  interior.visible=S.inside;stoveG.visible=!!S.camp.poele;
  CABIN_ROOF.visible=!(S.inside&&camMode==='iso');inChimney.visible=!CABIN_ROOF.visible;
}
// Déplacement à l'intérieur : on reste entre les murs et on contourne les meubles
function insideMove(p){
  const l=cabL(p.x,p.z);
  IN_OBST.forEach(([x,z,r])=>{const dx=l.x-x,dz=l.z-z,d=Math.hypot(dx,dz),rr=r+0.3;if(d<rr&&d>1e-4){l.x=x+dx/d*rr;l.z=z+dz/d*rr;}});
  l.x=clamp(l.x,IN_BOUNDS.x0,IN_BOUNDS.x1);l.z=clamp(l.z,IN_BOUNDS.z0,IN_BOUNDS.z1);
  const w=cabW(l.x,l.z);p.x=w.x;p.z=w.z;
}
const nearIn=(pt,r)=>{const l=cabL(P.x,P.z);return Math.hypot(l.x-pt.x,l.z-pt.z)<r;};

/* ----- Dormir : la nuit passe quand tout le monde est couché ----- */
function goToBed(){
  fadeThrough(()=>{
    S.mode='sleep';P.swing=0;P.target=null;
    player.g.quaternion.copy(SLEEP_Q);const p=cabW(SLEEP_POS.x,SLEEP_POS.z);player.g.position.set(p.x,CAMP_H+SLEEP_POS.y,p.z);
    legPose(player,'stand');player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);updateToolVisual();
    toast(othersOnline()?'😴 Bonne nuit… la nuit passera quand tout le monde sera couché':'😴 Bonne nuit…');
  });
}
function wakeUp(msg){
  fadeThrough(()=>{
    S.mode='foot';player.g.rotation.set(0,P.rot,0);
    const p=cabW(-0.3,-0.9);P.x=p.x;P.z=p.z;updateToolVisual();
    if(msg)toast(msg);
  });
}
function othersOnline(){return typeof NET!=='undefined'&&NET.on&&Object.keys(NET.online||{}).some(id=>id!==ME.id);}
function everyoneAsleep(){
  if(S.mode!=='sleep')return false;
  if(!othersOnline())return true;
  return Object.keys(NET.online).every(id=>id===ME.id||(NET.avatars[id]&&NET.avatars[id].p&&NET.avatars[id].p.m==='sleep'));
}
let wasNightSleeping=false;
function updateCabin(dt){
  // Le lit : l'hôte (ou le joueur seul) fait lever le soleil quand tout le monde dort
  if(S.mode==='sleep'){
    if(S.wx.clock>=DAY_LEN-20){wasNightSleeping=true;if(leadsWorld()&&everyoneAsleep()&&!fadeEl.classList.contains('on')){fadeThrough(()=>{S.wx.clock=20;S.wx.day=(S.wx.day||0)+1;},500);}}
    else if(wasNightSleeping){wasNightSleeping=false;wakeUp('☀️ Bon matin !');}
  }
  // Couleur des fenêtres (ciel du dehors), lueur du poêle
  inWinMat.color.copy(_c.hor).lerp(_gc.setRGB(0.85,0.92,1),0.25*SKY.day);
  stoveGlowMat.color.setHex(stove.fuel>0?0xff7a24:0x2a1a14);
  if(stove.fuel>0)stoveGlowMat.color.multiplyScalar(0.85+0.15*Math.sin(S.time*11));
  if(CABIN_ROOF.visible===(S.inside&&camMode==='iso'))refreshInterior();
}

/* ----- Contexte (boutons) à l'intérieur ----- */
function insideContext(){
  let act=null,act2=null,info='',enter=null;
  if(nearIn(IN_DOOR,0.9)&&!P.pail)enter='Sortir';
  if(P.carry){
    if(nearIn(IN_STOVE,1.4)&&S.camp.poele)act={label:`Mettre la bûche dans le poêle (+${fuelOf(P.carry)} s)`,fn:()=>feed(stove,STOVE_MAX,'Poêle')};
    else info=S.camp.poele?'Apporte la bûche au poêle':'Pas de poêle : achète-le dans les projets du camp';
  }else if(P.pail){info='Va porter le seau dehors';}
  else if(nearIn(IN_STOVE,1.3)){info=S.camp.poele?`Poêle à bois : ${fmtFire(stove.fuel)} · apporte une bûche pour le chauffer`:'Ici, on mettrait bien un poêle à bois (projets du camp, à la porte)';}
  else if(nearIn({x:IN_BED.x,z:IN_BED.z+0.6},1.2)){
    if(S.wx.clock>=DAY_LEN-20)act={label:'Dormir jusqu\'au matin',fn:goToBed};
    else info=`Il est ${clockText()} : trop tôt pour se coucher (la nuit tombe vers 20 h)`;
  }else if(nearIn(IN_TABLE,1.3)){act={label:'Lire le journal de la terre',fn:openJournal};act2={label:'Prix du bois',fn:openBoard};}
  else if(!enter)info='La cabane 🏠';
  return {enter,exitCabin:!!enter,act,act2,full:false,preview:null,info};
}
function sleepContext(){return {enter:'Se lever',wake:true,info:othersOnline()&&!everyoneAsleep()?'😴 En attente que tout le monde soit couché…':'😴 Zzz…'};}
