/* Boucle de jeu et caméras */
/* ---------- Boucle ---------- */
const clock=new T.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05);S.time+=dt;
  camAz+=(camAzT-camAz)*(1-Math.exp(-8*dt));
  if(camMode!=='iso'){
    if(S.mode==='vtt')camYawT=camYaw+wrapAng(V.th+camVehOff-camYaw);   // la caméra suit le véhicule, avec le décalage choisi
    camYaw+=wrapAng(camYawT-camYaw)*(1-Math.exp(-(S.mode==='vtt'?3:10)*dt));
    camFwd.set(Math.sin(camYaw),0,Math.cos(camYaw));camRight.set(-Math.cos(camYaw),0,Math.sin(camYaw));
  }else{
    camRight.set(Math.cos(camAz),0,-Math.sin(camAz));camFwd.set(-Math.sin(camAz),0,-Math.cos(camAz));
  }
  if(S.mode==='foot')updateFoot(dt);
  updateMapCursor(dt);updatePlacement();updatePick();
  updateNet(dt);updateVTT(dt);
  updateFalling(dt);updateSplitters(dt);
  updateCamp(dt);tickPlants(dt);
  if(S.mode==='vtt')updateLabels(V.x,V.z);else updateLabels(P.x,P.z);
  updateSugar(dt);updateMarket(dt);
  updateArrow();updateHUD();
  let gx,gz;
  const mc=mapCursor();
  if(mc){gx=mc.cx;gz=mc.cz;}else if(S.mode==='foot'||S.mode==='sit'){gx=P.x;gz=P.z;}else if(S.mode==='crane'){const g=gripWorld(P.crTr);gx=(P.x+g.x)/2;gz=(P.z+g.z)/2;}else{gx=V.x+Math.sin(V.th)*V.v*0.35;gz=V.z+Math.cos(V.th)*V.v*0.35;}
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
      const cp=Math.cos(camPitch+0.075);
      pcam.lookAt(vg.localToWorld(_v.set(e[0]+Math.sin(camVehOff)*cp*12,e[1]+Math.sin(camPitch+0.075)*12-0.3,e[2]+Math.cos(camVehOff)*cp*12)));
    }else{
      const ey=H(P.x,P.z)+1.68+P.jumpY;pcam.position.set(P.x,ey,P.z);
      const cp=Math.cos(camPitch);
      pcam.lookAt(P.x+Math.sin(camYaw)*cp,ey+Math.sin(camPitch),P.z+Math.cos(camYaw)*cp);
    }
  }else if(camMode==='tp'){
    const car=S.mode==='vtt',dist0=(car?V.spec.cam[0]:5.5)*chaseDist,ht0=(car?V.spec.cam[1]:2.4)*Math.sqrt(chaseDist);
    // Hauteur de la caméra réglable (glisser de haut en bas) : on tourne autour du joueur ou du véhicule
    const R=Math.hypot(dist0,ht0),ang=clamp(Math.atan2(ht0,dist0)+camTpTilt,0.03,1.35),dist=R*Math.cos(ang),ht=R*Math.sin(ang);
    let cx=camT.x-camFwd.x*dist,cz=camT.z-camFwd.z*dist;
    const cy=Math.max(camT.y+ht,H(cx,cz)+1.2);
    pcam.position.set(cx,cy,cz);
    // Vue basse : on regarde un peu devant; plus la caméra monte, plus elle vise le joueur lui-même (pivot autour de lui)
    const ahead=2*(1-smoothstep(0.35,1.0,ang));
    pcam.lookAt(camT.x+camFwd.x*ahead,camT.y+(car?1.2:1.5),camT.z+camFwd.z*ahead);
  }else{
    const D=120;
    camera.position.set(camT.x+Math.sin(camAz)*Math.cos(ELEV)*D,camT.y+Math.sin(ELEV)*D,camT.z+Math.cos(camAz)*Math.cos(ELEV)*D);
    camera.lookAt(camT);
  }
  sun.position.set(camT.x+28,camT.y+50,camT.z+12);sun.target.position.copy(camT);sun.target.updateMatrixWorld();
  updateFpTool();
  // Vitres du véhicule : invisibles quand on regarde de l'intérieur
  vehicles.forEach(v=>{const gl=v.mesh.g.userData.glass;if(gl){const hide=camMode==='fp'&&S.mode==='vtt'&&V===v;gl.forEach(m=>m.visible=!hide);}});
  if(sky.visible){sky.position.copy(pcam.position);skyMat.uniforms.uTime.value=S.time;}
  renderer.render(scene,activeCam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
