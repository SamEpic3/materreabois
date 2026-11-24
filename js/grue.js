/* Grue de la remorque chargeuse */
/* ---------- Grue de la remorque chargeuse ---------- */
const CR_COLZ=2.35,CR_TOP=2.81,CR_IDLE=1.9;
function craneCol(t){return {x:t.x+Math.sin(t.th)*CR_COLZ,z:t.z+Math.cos(t.th)*CR_COLZ};}
function trH(t){return t.mesh.g.position.y;}
function gripWorld(t){const c=craneCol(t),cr=t.crane,a=t.th+cr.slew;return {x:c.x+Math.sin(a)*cr.reach,z:c.z+Math.cos(a)*cr.reach,y:trH(t)+cr.y};}
function nearestCrane(){
  let best=null,bd=2.6;
  trailers.forEach(t=>{if(!t.crane)return;if(t.hitch&&Math.abs(t.hitch.v)>0.5)return;const c=craneCol(t),d=Math.hypot(P.x-c.x,P.z-c.z);if(d<bd){bd=d;best={t,d};}});
  return best;
}
function overBed(t){const cr=t.crane,lx=Math.sin(cr.slew)*cr.reach,lz=CR_COLZ+Math.cos(cr.slew)*cr.reach;return Math.abs(lx)<0.75&&lz>-1.9&&lz<1.9;}
function craneAligned(t){return Math.abs(Math.sin(t.crane.slew+t.crane.grip))<0.26;}
function pieceUnder(x,z){
  let best=null,bd=0.8;
  for(const pc of pieces){const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot);const d=clamp((x-b.x)*fx+(z-b.z)*fz,0,pc.len);const dist=Math.hypot(x-(b.x+fx*d),z-(b.z+fz*d));if(dist<bd){bd=dist;best=pc;}}
  return best;
}
function containerUnder(t,x,z){
  if(overBed(t)&&t.c.load.length)return t.c;
  let best=null,bd=1.4;
  containers().forEach(c=>{if(c===t.c||!c.load.length)return;const p=c.center(),d=Math.hypot(x-p.x,z-p.z);if(d<bd){bd=d;best=c;}});
  return best;
}
function craneContext(){
  const t=P.crTr,cr=t.crane;let act=null,info='';
  if(cr.phase==='idle'){
    const g=gripWorld(t);
    if(cr.held){
      const c=cr.held;
      if(overBed(t)){
        if(t.c.load.length>=t.c.cap)info='La remorque chargeuse est pleine';
        else if(!craneAligned(t))info='Tourne le billot (Q/R) pour l\'aligner avec la remorque';
        else act={label:`Déposer dans la remorque (${t.c.load.length}/${t.c.cap})`,fn:()=>craneDrop(t,'bed')};
      }
      else if(pointInYard(g.x,g.z))act={label:`Corder à la cour (+${priceOf(c)} $)`,fn:()=>craneDrop(t,'yard')};
      else act={label:'Déposer au sol',fn:()=>craneDrop(t,'ground')};
      if(!info)info=`Billot de ${ftin(c.len)} dans la pince`;
    }else{
      const pc=pieceUnder(g.x,g.z);
      if(pc){if(pc.len>CRANE_MAX)info=`Trop long pour la grue (${ftin(pc.len)}) : recoupe-le`;else act={label:`Prendre le billot (${ftin(pc.len)})`,fn:()=>craneGrab(t,{piece:pc})};}
      else{const cont=containerUnder(t,g.x,g.z);if(cont)act={label:`Prendre dans la ${cont.name}`,fn:()=>craneGrab(t,{cont})};else info='Place la pince au-dessus d\'un billot (W/A/S/D ou joystick)';}
    }
  }
  return {enter:'Quitter la grue',act,act2:null,full:false,info};
}
function craneMove(t,worldY,onDone){const cr=t.crane;cr.phase='down';cr.target=clamp(worldY-trH(t),0.1,CR_IDLE);cr.onDone=onDone;}
function setHeld(t,c,worldYaw){
  const cr=t.crane;cr.held=c;
  if(cr.heldMesh){cr.heldMesh.parent.remove(cr.heldMesh);cr.heldMesh.geometry.dispose();cr.heldMesh=null;}
  if(c){const m=makePieceMesh(c);t.mesh.crane.hold.add(m);cr.heldMesh=m;if(worldYaw!==undefined)cr.grip=wrapAng(worldYaw-(t.th+cr.slew));}
}
function craneGrab(t,o){
  if(o.piece){const pc=o.piece;craneMove(t,H(pc.cx,pc.cz)+pc.ra*2+0.32,()=>{if(!pieces.includes(pc))return;removePiece(pc);setHeld(t,{sp:pc.sp,len:pc.len,ra:pc.ra,rb:pc.rb},pc.rot);});}
  else{const c=o.cont;craneMove(t,trH(t)+1.7,()=>{if(!c.load.length)return;const m=c.load.pop();c.cargo.remove(m);setHeld(t,m.userData.c,c.yaw());});}
}
function craneDrop(t,mode){
  const cr=t.crane,g=gripWorld(t);
  if(mode==='bed'){
    const sl=t.spec.slots[t.c.load.length];
    craneMove(t,trH(t)+0.87+sl[1]+0.32,()=>{const c=cr.held;if(!c||t.c.load.length>=t.c.cap)return;setHeld(t,null);
      const s2=t.spec.slots[t.c.load.length],m=makePieceMesh(c);m.position.set(s2[0],s2[1],0);m.userData.c=c;t.c.cargo.add(m);t.c.load.push(m);
      toast(`Dans la remorque chargeuse (${t.c.load.length}/${t.c.cap})`);});
  }else if(mode==='yard'){
    craneMove(t,H(g.x,g.z)+0.9,()=>{const c=cr.held;if(!c)return;setHeld(t,null);sellPiece(c);});
  }else{
    craneMove(t,H(g.x,g.z)+cr.held.ra*2+0.32,()=>{const c=cr.held;if(!c)return;const yaw=t.th+cr.slew+cr.grip,g2=gripWorld(t);setHeld(t,null);
      addPiece({cx:g2.x,cz:g2.z,rot:yaw,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,crown:false});});
  }
}
function updateCrane(t,dt){
  const cr=t.crane,m=t.mesh.crane;
  if(S.mode==='crane'&&P.crTr===t&&cr.phase==='idle'){
    const inp=readInput(true);
    cr.slew-=inp.x*0.9*dt;cr.reach=clamp(cr.reach+inp.y*2.2*dt,1.4,6.5);
    const gr=((keys.KeyQ||gripK.l)?1:0)-((keys.KeyR||gripK.r)?1:0);
    cr.grip+=gr*1.6*dt;
  }
  if(cr.phase==='down'){cr.y-=3*dt;if(cr.y<=cr.target){cr.y=cr.target;const f=cr.onDone;cr.onDone=null;if(f)f();cr.phase='up';}}
  else if(cr.phase==='up'){cr.y+=3*dt;if(cr.y>=CR_IDLE){cr.y=CR_IDLE;cr.phase='idle';}}
  m.slew.rotation.y=cr.slew;
  m.boom.position.z=cr.reach/2;m.boom.scale.z=cr.reach;
  const drop=Math.max(0.05,CR_TOP-cr.y);
  m.link.scale.y=drop;m.link.position.set(0,1.95-drop/2,cr.reach);
  m.grapple.position.set(0,1.95-drop,cr.reach);m.grapple.rotation.y=cr.grip;
  const cl=cr.held?-0.06:0.45;m.clawL.rotation.z=cl;m.clawR.rotation.z=-cl;   // griffes pivotant en haut : ouvertes vers l'extérieur
}
