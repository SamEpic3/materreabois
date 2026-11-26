/* Boucle de jeu et caméras */
/* ---------- Boucle ---------- */
const clock=new T.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05);S.time+=dt;
  camAz+=(camAzT-camAz)*(1-Math.exp(-8*dt));
  if(camMode!=='iso'){
    const rv=RV();if(rv)camYawT=camYaw+wrapAng(rv.th+camVehOff-camYaw);   // la caméra suit le véhicule, avec le décalage choisi
    camYaw+=wrapAng(camYawT-camYaw)*(1-Math.exp(-(RV()?3:10)*dt));
    camFwd.set(Math.sin(camYaw),0,Math.cos(camYaw));camRight.set(-Math.cos(camYaw),0,Math.sin(camYaw));
  }else{
    camRight.set(Math.cos(camAz),0,-Math.sin(camAz));camFwd.set(-Math.sin(camAz),0,-Math.cos(camAz));
  }
  if(S.mode==='foot')updateFoot(dt);
  if(S.mode==='pass')updatePassenger();
  updateFishing(dt);updateDrops(dt);
  updateMapCursor(dt);updatePlacement();updatePick();updateMouseLock();updateScope();
  updateNet(dt);updateVTT(dt);
  updateFalling(dt);updateSplitters(dt);updateYardSales(dt);
  updateCamp(dt);updateCabin(dt);tickPlants(dt);
  if(S.mode==='vtt')updateLabels(V.x,V.z);else updateLabels(P.x,P.z);
  const RVc=RV();
  updateSugar(dt);updateMarket(dt);updateOrders(dt);updateHunt(dt);updateHarvesters(dt);updateChippers(dt);updateDrone(dt);
  updateArrow();updateHUD();
  let gx,gz;
  const mc=mapCursor();
  if(mc){gx=mc.cx;gz=mc.cz;}else if(S.mode==='foot'||S.mode==='sit'||S.mode==='sleep'){gx=P.x;gz=P.z;}else if(S.mode==='crane'){const g=gripWorld(P.crTr);gx=(P.x+g.x)/2;gz=(P.z+g.z)/2;}else{const W=RVc||V;gx=W.x+Math.sin(W.th)*W.v*0.35;gz=W.z+Math.cos(W.th)*W.v*0.35;}
  if(camMode!=='iso'&&S.mode!=='crane'){gx=RVc?RVc.x:P.x;gz=RVc?RVc.z:P.z;}
  if(S.mode==='drone'){gx=DRONE.x;gz=DRONE.z;}
  const goal=new T.Vector3(gx,RVc&&RVc.spec.boat?RVc.mesh.g.position.y:walkH(gx,gz),gz);   // en chaloupe : niveau de l'eau, pas le fond du lac
  camT.lerp(goal,1-Math.exp(-(camMode!=='iso'?14:6)*dt));
  if(S.mode==='drone'){activeCam=pcam;droneCamera();}
  else if(camMode!=='iso'&&S.mode==='crane'){
    const g=gripWorld(P.crTr),ey=H(P.x,P.z)+1.68;
    if(camMode==='fp'){pcam.position.set(P.x,ey,P.z);}
    else{let dx=g.x-P.x,dz=g.z-P.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;pcam.position.set(P.x-dx*5*chaseDist,ey+1.8,P.z-dz*5*chaseDist);}
    pcam.lookAt(g.x,g.y-0.6,g.z);
  }else if(camMode==='fp'||SCOPE){
    if(RVc&&!SCOPE){
      const vg=RVc.mesh.g,e=S.mode==='pass'?RVc.spec.passEye:RVc.spec.eye;vg.updateMatrixWorld();pcam.position.copy(vg.localToWorld(_v.set(e[0],e[1],e[2])));
      const cp=Math.cos(camPitch+0.075);
      pcam.lookAt(vg.localToWorld(_v.set(e[0]+Math.sin(camVehOff)*cp*12,e[1]+Math.sin(camPitch+0.075)*12-0.3,e[2]+Math.cos(camVehOff)*cp*12)));
    }else{
      const ey=walkH(P.x,P.z)+1.68+P.jumpY+(S.inside?FLOOR_Y:0);pcam.position.set(P.x,ey,P.z);
      const cp=Math.cos(camPitch);
      pcam.lookAt(P.x+Math.sin(camYaw)*cp,ey+Math.sin(camPitch),P.z+Math.cos(camYaw)*cp);
    }
  }else if(camMode==='tp'){
    const car=!!RVc,dist0=(car?RVc.spec.cam[0]:5.5)*chaseDist,ht0=(car?RVc.spec.cam[1]:2.4)*Math.sqrt(chaseDist);
    // Hauteur de la caméra réglable (glisser de haut en bas) : on tourne autour du joueur ou du véhicule
    const R=Math.hypot(dist0,ht0),ang=clamp(Math.atan2(ht0,dist0)+camTpTilt,0.03,1.35),dist=R*Math.cos(ang),ht=R*Math.sin(ang);
    let cx=camT.x-camFwd.x*dist,cz=camT.z-camFwd.z*dist;
    let cy=Math.max(camT.y+ht,H(cx,cz)+1.2);
    if(S.inside){const l=cabL(cx,cz),w=cabW(clamp(l.x,-2.7,2.7),clamp(l.z,-2.0,2.0));cx=w.x;cz=w.z;cy=Math.min(cy,CAMP_H+2.45);}   // la caméra reste dans la cabane
    pcam.position.set(cx,cy,cz);
    // Vue basse : on regarde un peu devant; plus la caméra monte, plus elle vise le joueur lui-même (pivot autour de lui)
    const ahead=2*(1-smoothstep(0.35,1.0,ang));
    pcam.lookAt(camT.x+camFwd.x*ahead,camT.y+(car?1.2:1.5),camT.z+camFwd.z*ahead);
  }else{
    const D=120;
    camera.position.set(camT.x+Math.sin(camAz)*Math.cos(ELEV)*D,camT.y+Math.sin(ELEV)*D,camT.z+Math.cos(camAz)*Math.cos(ELEV)*D);
    camera.lookAt(camT);
  }
  updateSky(dt,camT);updateBirds(dt,S.mode==='vtt'?V:P);updateAnimals(dt,S.mode==='vtt'?V:P);updateSound(dt,S.mode==='vtt'?V:P);
  if(window.PHOTO){const f=window.PHOTO;activeCam=pcam;pcam.position.set(...f.pos);pcam.lookAt(...f.at);}   // caméra libre pour les captures de test
  updateFpTool();
  // Vitres du véhicule : invisibles quand on regarde de l'intérieur
  vehicles.forEach(v=>{const gl=v.mesh.g.userData.glass;if(gl){const hide=camMode==='fp'&&RVc===v;gl.forEach(m=>m.visible=!hide);}});
  if(sky.visible){sky.position.copy(pcam.position);skyMat.uniforms.uTime.value=S.time;}
  updateCulling(camT);
  if(!(typeof CARTE!=='undefined'&&CARTE.open))renderer.render(scene,activeCam);   // la carte couvre tout l'écran
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
