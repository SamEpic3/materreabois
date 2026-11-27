/* Débusqueuse : agripper, traîner et relâcher une tige */
/* ---------- Débusqueuse ---------- */
function skidGrip(v){const a=v.th+(v.mesh&&v.mesh.rear?v.mesh.rear.rotation.y:0);return {x:v.x-Math.sin(a)*2.8,z:v.z-Math.cos(a)*2.8};}   // suit la partie arrière articulée
function pieceTop(pc){const b=pieceButt(pc);return {x:b.x+Math.sin(pc.rot)*pc.len,z:b.z+Math.cos(pc.rot)*pc.len};}
function skidCandidate(v){
  const g=skidGrip(v);let best=null,bd=1.8;
  for(const pc of pieces){const b=pieceButt(pc),t=pieceTop(pc);const db=Math.hypot(g.x-b.x,g.z-b.z),dt=Math.hypot(g.x-t.x,g.z-t.z);
    if(db<bd){bd=db;best={pc,end:'butt',p:b};}if(dt<bd){bd=dt;best={pc,end:'top',p:t};}}
  return best;
}
function skidGrab(v,c){
  const pc=c.pc,free=c.end==='butt'?pieceTop(pc):pieceButt(pc);
  removePiece(pc);
  const d={len:pc.len,ra:pc.ra,rb:pc.rb,sp:pc.sp,end:c.end,fx:free.x,fz:free.z,mesh:makePieceMesh(pc)};
  d.mesh.rotation.order='YXZ';scene.add(d.mesh);v.drag=d;updateDrag(v);toast('Tige agrippée');
}
function dragEnds(v){
  const d=v.drag,g=skidGrip(v);
  const A={x:g.x,z:g.z,y:H(g.x,g.z)+0.85},F={x:d.fx,z:d.fz,y:H(d.fx,d.fz)+(d.end==='butt'?d.rb:d.ra)};
  return d.end==='butt'?{butt:A,top:F}:{butt:F,top:A};
}
function updateDrag(v){
  const d=v.drag;if(!d)return;
  const g=skidGrip(v);let dx=d.fx-g.x,dz=d.fz-g.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  d.fx=g.x+dx*d.len;d.fz=g.z+dz*d.len;
  const {butt,top}=dragEnds(v),hz=Math.hypot(top.x-butt.x,top.z-butt.z)||1;
  d.mesh.rotation.set(-Math.atan2(top.y-butt.y,hz),Math.atan2(top.x-butt.x,top.z-butt.z),0);
  d.mesh.position.set((butt.x+top.x)/2,(butt.y+top.y)/2,(butt.z+top.z)/2);
}
function skidRelease(v){
  const d=v.drag;if(!d)return;
  const {butt,top}=dragEnds(v);
  scene.remove(d.mesh);d.mesh.geometry.dispose();v.drag=null;
  addPiece({cx:(butt.x+top.x)/2,cz:(butt.z+top.z)/2,rot:Math.atan2(top.x-butt.x,top.z-butt.z),len:d.len,ra:d.ra,rb:d.rb,sp:d.sp,crown:false});
  toast('Tige relâchée');
}
// Griffes : fermées quand une tige est prise, ouvertes sinon (mouvement progressif)
function skidClaws(v,dt){const m=v.mesh;if(!m||!m.clawL)return;const goal=v.drag?-0.22:0.45;
  const c=m.clawL.rotation.z+(goal-m.clawL.rotation.z)*Math.min(1,(dt||0.016)*6);m.clawL.rotation.z=c;m.clawR.rotation.z=-c;}
/* Arracher une souche d'un coup avec la pince */
function skidStump(v){const g=skidGrip(v);let b=null,bd=2.2;stumpList.forEach(st=>{const d=Math.hypot(g.x-st.x,g.z-st.z);if(d<bd){bd=d;b=st;}});return b;}
function skidPullStump(v,st){if(!stumpList.includes(st))return;for(let k=0;k<3;k++)spawnChips(st.x,H(st.x,st.z)+0.25,st.z,dirtMat);removeStump(st);sfxKnock(st.x,st.z,1.6);}
