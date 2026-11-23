/* Boucle de jeu et caméras */
/* ---------- Boucle ---------- */
const clock=new T.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05);S.time+=dt;
  camAz+=(camAzT-camAz)*(1-Math.exp(-8*dt));
  if(camMode!=='iso'){
    if(S.mode==='vtt')camYawT=camYaw+wrapAng(V.th-camYaw);
    camYaw+=wrapAng(camYawT-camYaw)*(1-Math.exp(-(S.mode==='vtt'?3:10)*dt));
    camFwd.set(Math.sin(camYaw),0,Math.cos(camYaw));camRight.set(-Math.cos(camYaw),0,Math.sin(camYaw));
  }else{
    camRight.set(Math.cos(camAz),0,-Math.sin(camAz));camFwd.set(-Math.sin(camAz),0,-Math.cos(camAz));
  }
  if(S.mode==='foot'||S.mode==='place')updateFoot(dt);
  updatePlacement();
  updateVTT(dt);
  updateFalling(dt);
  updateCamp(dt);tickPlants(dt);
  if(S.mode==='vtt')updateLabels(V.x,V.z);else updateLabels(P.x,P.z);
  updateSugar(dt);updateMarket(dt);
  updateArrow();updateHUD();
  let gx,gz;
  if(S.mode==='foot'||S.mode==='sit'||S.mode==='place'){gx=P.x;gz=P.z;}else if(S.mode==='crane'){const g=gripWorld(P.crTr);gx=(P.x+g.x)/2;gz=(P.z+g.z)/2;}else{gx=V.x+Math.sin(V.th)*V.v*0.35;gz=V.z+Math.cos(V.th)*V.v*0.35;}
  if(camMode!=='iso'&&S.mode!=='crane'){gx=S.mode==='vtt'?V.x:P.x;gz=S.mode==='vtt'?V.z:P.z;}
  const goal=new T.Vector3(gx,H(gx,gz),gz);
  camT.lerp(goal,1-Math.exp(-(camMode!=='iso'?14:6)*dt));
  if(camMode!=='iso'&&S.mode==='crane'){
    const g=gripWorld(P.crTr),ey=H(P.x,P.z)+1.68;
    if(camMode==='fp'){pcam.position.set(P.x,ey,P.z);}
    else{let dx=g.x-P.x,dz=g.z-P.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;pcam.position.set(P.x-dx*5*chaseDist,ey+1.8,P.z-dz*5*chaseDist);}
    pcam.lookAt(g.x,g.y-0.6,g.z);
  }else if(camMode==='fp'){
    if(S.mode==='vtt'){
      const vg=V.mesh.g,e=V.spec.eye;vg.updateMatrixWorld();pcam.position.copy(vg.localToWorld(_v.set(e[0],e[1],e[2])));
      pcam.lookAt(vg.localToWorld(_v.set(e[0],e[1]-0.3,12)));
    }else{
      pcam.position.set(P.x,H(P.x,P.z)+1.68,P.z);
      const cp=Math.cos(camPitch);
      pcam.lookAt(P.x+Math.sin(camYaw)*cp,H(P.x,P.z)+1.68+Math.sin(camPitch),P.z+Math.cos(camYaw)*cp);
    }
  }else if(camMode==='tp'){
    const car=S.mode==='vtt',dist=(car?V.spec.cam[0]:5.5)*chaseDist,ht=(car?V.spec.cam[1]:2.4)*Math.sqrt(chaseDist);
    let cx=camT.x-camFwd.x*dist,cz=camT.z-camFwd.z*dist;
    const cy=Math.max(camT.y+ht,H(cx,cz)+1.2);
    pcam.position.set(cx,cy,cz);
    pcam.lookAt(camT.x+camFwd.x*2,camT.y+(car?1.2:1.5),camT.z+camFwd.z*2);
  }else{
    const D=120;
    camera.position.set(camT.x+Math.sin(camAz)*Math.cos(ELEV)*D,camT.y+Math.sin(ELEV)*D,camT.z+Math.cos(camAz)*Math.cos(ELEV)*D);
    camera.lookAt(camT);
  }
  sun.position.set(camT.x+28,camT.y+50,camT.z+12);sun.target.position.copy(camT);sun.target.updateMatrixWorld();
  renderer.render(scene,activeCam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
