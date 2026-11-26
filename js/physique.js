/* Physique des véhicules et des remorques (attelage, portefeuille, collisions) */
/* ---------- Mise à jour : VTT ---------- */
function vehCircles(v,x,z,th){const fx=Math.sin(th),fz=Math.cos(th);return v.spec.cols.map(([o,r])=>[x+fx*o,z+fz*o,r]);}
function trCircles(t,x,z,th){const fx=Math.sin(th),fz=Math.cos(th);return t.spec.cols.map(([o,r])=>[x+fx*o,z+fz*o,r]);}
function bodyCircles(except){
  const a=[];vehicles.forEach(v=>{if(v!==except)a.push(...vehCircles(v,v.x,v.z,v.th));});
  trailers.forEach(t=>{if(!except||t.hitch!==except)a.push(...trCircles(t,t.x,t.z,t.th));});
  return a;
}
function circlesHit(list,others){for(const c of list){if(waterDepth(c[0],c[1])>0.35||landBlocked(c[0],c[1]))return true;if(hits(c[0],c[1],c[2]))return true;for(const o of others){const dx=c[0]-o[0],dz=c[1]-o[1],rr=c[2]+o[2];if(dx*dx+dz*dz<rr*rr)return true;}}return false;}
function trailerFollow(t,hx,hz,th){
  let dx=hx-t.x,dz=hz-t.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  const tth=Math.atan2(dx,dz);
  return {x:hx-Math.sin(tth)*t.spec.tl,z:hz-Math.cos(tth)*t.spec.tl,th:tth,rel:wrapAng(tth-th)};
}
const JACK=110*Math.PI/180;
function updateVehicle(v,dt){
  if(v.spec.boat){updateBoat(v,dt);return;}
  const sp=v.spec,driving=S.mode==='vtt'&&V===v;
  let steerIn=0,thr=0;
  if(driving){
    const inp=readInput(false);
    steerIn=-inp.x;
    const ky=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0);
    thr=clamp(ky+(pedal.gas?1:0)-(pedal.brake?1:0),-1,1);
  }
  const tw=towed(v);
  const mud=mudAt(v.x,v.z),load=(tw?tw.c.load.length*(tw.kind==='loader'?0.8:1):0)+(v.bed?v.bed.load.length*0.6:0);
  const gr=ground(v.x,v.z,v.th,sp.hl,sp.hw,null);
  let maxF=sp.maxF*(1-sp.mudLoss*mud)*(1-0.03*load),maxR=sp.maxR*(1-0.4*mud);
  let acc=sp.acc*(1-Math.max(0,sp.mudLoss-0.05)*mud)/(1+0.1*load);
  if(v.drag){maxF*=0.65;acc*=0.7;}
  if(thr>0.05){if(v.v<-0.2)v.v+=11*thr*dt;else v.v+=acc*thr*dt;}
  else if(thr<-0.05){if(v.v>0.2)v.v-=13*(-thr)*dt;else v.v-=acc*0.6*(-thr)*dt;}
  else{const dec=(2.6+4*mud)*dt;v.v=Math.abs(v.v)<dec?0:v.v-Math.sign(v.v)*dec;}
  v.v-=9.8*gr.slope*0.3*dt;
  if(v.v>maxF)v.v=lerp(v.v,maxF,1-Math.exp(-3*dt));
  if(v.v<-maxR)v.v=lerp(v.v,-maxR,1-Math.exp(-3*dt));
  if(!driving&&Math.abs(v.v)<0.3)v.v=0;
  const maxSt=sp.steer*(1-0.45*Math.min(1,Math.abs(v.v)/sp.maxF));
  v.steer=lerp(v.steer,steerIn*maxSt,1-Math.exp(-(sp.steerRate||8)*dt));
  if(v.v!==0){
    const step=vv=>{const nth=v.th+vv*Math.tan(v.steer)/sp.wb*dt;const nx=clamp(v.x+Math.sin(nth)*vv*dt,WB.x0+3,WB.x1-3),nz=clamp(v.z+Math.cos(nth)*vv*dt,WB.z0+3,WB.z1-3);
      return {nth,nx,nz,tr:tw?trailerFollow(tw,nx-Math.sin(nth)*sp.hitch,nz-Math.cos(nth)*sp.hitch,nth):null};};
    let st=step(v.v);
    if(st.tr&&Math.abs(st.tr.rel)>JACK){
      if(Math.abs(v.v)>1){v.v=Math.sign(v.v);st=step(v.v);}
      if(Math.abs(st.tr.rel)>JACK){
        const sg=Math.sign(st.tr.rel),th2=st.nth+sg*JACK,hx=st.nx-Math.sin(st.nth)*sp.hitch,hz=st.nz-Math.cos(st.nth)*sp.hitch;
        st.tr={x:hx-Math.sin(th2)*tw.spec.tl,z:hz-Math.cos(th2)*tw.spec.tl,th:th2,rel:sg*JACK};
      }
    }
    const others=bodyCircles(v);
    if(circlesHit(vehCircles(v,st.nx,st.nz,st.nth),others)||(st.tr&&circlesHit(trCircles(tw,st.tr.x,st.tr.z,st.tr.th),others))){
      if(driving&&Math.abs(v.v)>4)toast('Bang ! 💥');
      v.v=Math.abs(v.v)<1.5?0:-v.v*0.25;
    }else{v.x=st.nx;v.z=st.nz;v.th=st.nth;if(st.tr){tw.x=st.tr.x;tw.z=st.tr.z;tw.th=st.tr.th;}}
  }
  v.spin+=v.v*dt/sp.wr;
  const g1=ground(v.x,v.z,v.th,sp.hl,sp.hw,_q);
  v.q.slerp(_q,1-Math.exp(-12*dt));
  v.mesh.g.position.set(v.x,g1.h,v.z);v.mesh.g.quaternion.copy(v.q);
  v.mesh.wheels.forEach(w=>w.rotation.x=v.spin);
  v.mesh.pivots.forEach(p=>p.rotation.y=v.steer);if(v.mesh.bars)v.mesh.bars.rotation.y=v.steer*1.3;
  if(v.mesh.front){v.mesh.front.rotation.y=v.steer*0.7;v.mesh.rear.rotation.y=-v.steer*0.7;}
  if(tw)tw.mesh.wheels.forEach(w=>w.rotation.x+=v.v*dt/tw.spec.wr);
  updateDrag(v);
}
const TILT={};
const skidMark=new T.Mesh(new T.RingGeometry(0.45,0.7,24),new T.MeshBasicMaterial({color:0x5fe07a,transparent:true,opacity:0.85,side:T.DoubleSide,depthTest:false}));
skidMark.rotation.x=-Math.PI/2;skidMark.renderOrder=15;skidMark.visible=false;scene.add(skidMark);
function updateVTT(dt){
  vehicles.forEach(v=>updateVehicle(v,dt));
  trailers.forEach(t=>{
    const g2=ground(t.x,t.z,t.th,t.spec.hl,t.spec.hw,_q);
    if(!t.hitch){if(!TILT[t.kind])TILT[t.kind]=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),t.spec.tilt);_q.multiply(TILT[t.kind]);}
    t.q.slerp(_q,1-Math.exp(-(t.hitch?12:5)*dt));
    t.mesh.g.position.set(t.x,g2.h,t.z);t.mesh.g.quaternion.copy(t.q);
    // Cercle du timon : seulement quand un véhicule est prêt à atteler
    const near=Math.hypot(t.x-(S.mode==='vtt'?V.x:P.x),t.z-(S.mode==='vtt'?V.z:P.z))<9;   // seulement de près
    t.mark.visible=!t.hitch&&near&&vehicles.some(v=>canAttach(v,t));
    if(t.mark.visible){const p=tongue(t);t.mark.position.set(p.x,H(p.x,p.z)+0.08,p.z);t.mark.material.color.set(0x5fe07a);}
    if(t.crane)updateCrane(t,dt);
    if(t.mesh.boat)t.mesh.boat.visible=!!t.boat;
  });
  skidMark.visible=false;
  if(S.mode==='vtt'&&V.type==='skid'&&!V.drag){const c=skidCandidate(V);if(c){skidMark.visible=true;skidMark.position.set(c.p.x,H(c.p.x,c.p.z)+0.1,c.p.z);}}
}

/* ---------- Véhicule coincé : le replacer à l'endroit libre le plus proche ---------- */
function vehSpotFree(v,x,z,th){
  if(outW(x,z,3))return false;
  const list=vehCircles(v,x,z,th).map(c=>[c[0],c[1],c[2]+0.25]);
  return !circlesHit(list,bodyCircles(v));
}
function rescueVehicle(v,quiet){
  if(!v||v.spec.boat)return false;
  for(let r=0;r<=24;r+=0.75)for(let k=0,n=Math.max(1,Math.round(r*3));k<n;k++){
    const a=k/n*Math.PI*2,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;
    for(const dth of [0,Math.PI/2,-Math.PI/2,Math.PI]){const th=v.th+dth;
      if(!vehSpotFree(v,x,z,th))continue;
      const dx=x-v.x,dz=z-v.z;v.x=x;v.z=z;v.th=th;v.v=0;
      trailers.forEach(t=>{if(t.hitch===v){const f=trailerFollow(t,x-Math.sin(th)*(v.spec.hitch?v.spec.hitch:2),z-Math.cos(th)*(v.spec.hitch?v.spec.hitch:2),th);t.x=f.x;t.z=f.z;t.th=f.th;}});
      if(V===v){P.x=x;P.z=z;}
      if(!quiet)toast(r<0.1?'Le véhicule n\'est pas coincé':`${v.spec.name} replacé à ${Math.round(r)} m`);
      return true;}
  }
  if(!quiet)toast('Aucun endroit libre trouvé autour');return false;
}
// Remorques dételées : même chose
function trSpotFree(t,x,z,th){
  if(outW(x,z,3))return false;
  const list=trCircles(t,x,z,th).map(c=>[c[0],c[1],c[2]+0.2]);
  const others=[];vehicles.forEach(v=>others.push(...vehCircles(v,v.x,v.z,v.th)));trailers.forEach(o=>{if(o!==t)others.push(...trCircles(o,o.x,o.z,o.th));});
  return !circlesHit(list,others);
}
// Il faut aussi de la place devant le timon pour y reculer un véhicule et atteler
function hitchRoom(t,x,z,th){
  const fx=Math.sin(th),fz=Math.cos(th),tl=t.spec.tl||2;
  const list=[1.6,3.4,5.2,7.0].map(d=>[x+fx*(tl+d),z+fz*(tl+d),1.25]);
  if(list.some(c=>outW(c[0],c[1],2)))return false;
  const others=[];vehicles.forEach(v=>others.push(...vehCircles(v,v.x,v.z,v.th)));trailers.forEach(o=>{if(o!==t)others.push(...trCircles(o,o.x,o.z,o.th));});
  return !circlesHit(list,others);
}
function rescueTrailer(t,quiet){
  if(t.hitch){if(!quiet)toast('Dételle la remorque ou replace le véhicule qui la tire');return false;}
  for(let r=0;r<=24;r+=0.75)for(let k=0,n=Math.max(1,Math.round(r*3));k<n;k++){
    const a=k/n*Math.PI*2,x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;
    for(const dth of [0,Math.PI/2,-Math.PI/2,Math.PI]){const th=t.th+dth;
      if(!trSpotFree(t,x,z,th)||!hitchRoom(t,x,z,th))continue;
      t.x=x;t.z=z;t.th=th;
      if(!quiet)toast(r<0.1?'La remorque n\'est pas coincée':`Remorque replacée à ${Math.round(r)} m`);
      return true;}
  }
  if(!quiet)toast('Aucun endroit libre trouvé autour');return false;
}
// Bouton 🛟 : ton véhicule, sinon le véhicule ou la remorque dételée le plus proche (moins de 15 m)
function rescueMine(){
  if(S.mode==='vtt'&&V){rescueVehicle(V);return;}
  let best=null,bd=15,kind='';
  vehicles.forEach(o=>{if(o.spec.boat||o.driver&&o.driver!==ME.id)return;const d=Math.hypot(o.x-P.x,o.z-P.z);if(d<bd){bd=d;best=o;kind='v';}});
  trailers.forEach(o=>{if(o.hitch)return;const d=Math.hypot(o.x-P.x,o.z-P.z);if(d<bd){bd=d;best=o;kind='t';}});
  if(!best){toast('Aucun véhicule ni remorque à moins de 15 m');return;}
  if(kind==='v')rescueVehicle(best);else rescueTrailer(best);
}
// Au chargement : véhicules et remorques pris dans un bâtiment sont replacés tout seuls
function rescueStuckAll(){
  vehicles.forEach(v=>{if(!v.spec.boat&&!vehSpotFree(v,v.x,v.z,v.th))rescueVehicle(v,true);});
  trailers.forEach(t=>{if(!t.hitch&&!trSpotFree(t,t.x,t.z,t.th))rescueTrailer(t,true);});
}
