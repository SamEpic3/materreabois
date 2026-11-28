/* Motocross : penche dans les virages comme une vraie, le pilote pose le pied à terre à l'arrêt
   et garde les pieds sur les marchepieds en roulant. Garée sans pilote, elle repose sur sa béquille. */
function makeMoto(){
  const g=new T.Group(),red=new T.MeshPhongMaterial({color:0xc8322b,shininess:60,specular:0x553333}),white=new T.MeshPhongMaterial({color:0xf1f1ee,shininess:50,specular:0x444444}),
        black=mat(0x1c1c1c),steel=new T.MeshPhongMaterial({color:0x2e3134,shininess:40,specular:0x444444}),chrome=new T.MeshPhongMaterial({color:0xb8bcc0,shininess:90,specular:0x888888}),
        gold=new T.MeshPhongMaterial({color:0xc9a23a,shininess:70,specular:0x776633}),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0x8a8e92,shininess:50});
  const R=0.34,ZF=0.74,ZR=-0.7;
  // Cadre, moteur, bras oscillant, échappement, marchepieds
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.06,0.06,0.9).rotateX(0.5).translate(0,0.72,0.2),new T.BoxGeometry(0.06,0.06,0.75).rotateX(-0.25).translate(0,0.55,-0.12),
    new T.BoxGeometry(0.05,0.05,0.62).rotateX(-0.12).translate(0.1,0.4,-0.42),new T.BoxGeometry(0.05,0.05,0.62).rotateX(-0.12).translate(-0.1,0.4,-0.42),
    new T.BoxGeometry(0.34,0.04,0.06).translate(0,0.32,-0.02)]),steel));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.22,0.26,0.32).translate(0,0.42,0.06),new T.CylinderGeometry(0.07,0.07,0.24,10).rotateX(0.5).translate(0,0.6,0.15)]),mat(0x3c3f43)));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.2,0.025,0.05).translate(0.2,0.32,-0.02),new T.BoxGeometry(0.2,0.025,0.05).translate(-0.2,0.32,-0.02)]),chrome));   // marchepieds
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.035,0.035,0.55,8).rotateX(Math.PI/2-0.35).translate(0.15,0.66,-0.32),new T.CylinderGeometry(0.05,0.045,0.3,10).rotateX(Math.PI/2-0.2).translate(0.16,0.8,-0.68)]),chrome));
  // Réservoir, ouïes, selle longue, garde-boue relevés, plaque numéro
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.3,0.2,0.42).translate(0,0.86,0.22),new T.BoxGeometry(0.04,0.2,0.36).rotateY(0.12).translate(0.17,0.78,0.3),new T.BoxGeometry(0.04,0.2,0.36).rotateY(-0.12).translate(-0.17,0.78,0.3)]),red));
  g.add(new T.Mesh(new T.BoxGeometry(0.24,0.08,0.86).translate(0,0.92,-0.25),black));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.26,0.12,0.5).rotateX(-0.12).translate(0,0.84,-0.58),new T.BoxGeometry(0.2,0.03,0.5).rotateX(-0.25).translate(0,0.86,-0.98)]),white));
  g.add(new T.Mesh(new T.BoxGeometry(0.14,0.06,0.06).translate(0,0.8,-1.18),new T.MeshBasicMaterial({color:0xc0261e})));
  // Direction : fourche, garde-boue avant, plaque, guidon
  const bars=new T.Group();bars.position.set(0,0.6,0.5);bars.rotation.x=-0.42;g.add(bars);
  bars.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.035,0.035,0.75,8).translate(0.09,0,0),new T.CylinderGeometry(0.035,0.035,0.75,8).translate(-0.09,0,0)]),gold));
  bars.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.2,0.04,0.12).translate(0,0.4,0),new T.CylinderGeometry(0.02,0.02,0.72,8).rotateZ(Math.PI/2).translate(0,0.5,-0.04)]),steel));
  bars.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.025,0.025,0.12,8).rotateZ(Math.PI/2).translate(0.32,0.5,-0.04),new T.CylinderGeometry(0.025,0.025,0.12,8).rotateZ(Math.PI/2).translate(-0.32,0.5,-0.04)]),black));
  bars.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.26,0.22,0.03).translate(0,0.26,0.1),new T.BoxGeometry(0.14,0.025,0.5).rotateX(0.15).translate(0,0.1,0.22)]),white));
  bars.add(new T.Mesh(new T.CircleGeometry(0.06,12).translate(0,0.27,0.118),new T.MeshBasicMaterial({color:0xfff3b0})));
  // Roues à crampons (étroites), l'avant tourne avec la direction
  const W=wheelGeo(R,0.12),wheels=[],pivots=[];
  const mk=()=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,hub));return w;};
  const pf=new T.Group();pf.position.set(0,R,ZF);const wf=mk();pf.add(wf);g.add(pf);pivots.push(pf);wheels.push(wf);
  const wr=mk();wr.position.set(0,R,ZR);g.add(wr);wheels.push(wr);
  // Béquille latérale (à gauche) : sortie quand la moto est garée
  const stand=new T.Group();stand.position.set(0.12,0.34,-0.08);stand.add(new T.Mesh(new T.BoxGeometry(0.03,0.36,0.03).translate(0,-0.18,0),steel));g.add(stand);
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots,bars,stand};
}
SPECS.moto={name:'Motocross',build:makeMoto,hitch:null,wb:1.44,wr:0.34,maxF:20,maxR:2.2,acc:8,mudLoss:0.35,steer:0.36,steerRate:3.2,alat:5,expo:2.4,hl:0.75,hw:0.12,
  cols:[[0.6,0.42],[-0.55,0.42]],enterR:2.3,ride:true,seat:[0,0.04,-0.24],hide:false,eye:[0,1.9,-0.1],side:1.0,cam:[6.5,2.6],arrowY:2.3};
VEH_SHOP.push({id:'moto',kind:'veh',name:'Motocross',price:4200,desc:'Moto hors route légère et rapide : la plus vive dans les sentiers. Elle penche dans les virages; à l\'arrêt, le pilote pose le pied par terre. Pas d\'attelage.'});

/* Poses du pilote : pieds sur les marchepieds, ou pied gauche au sol à l'arrêt */
function motoLegs(f,stopped){
  const kL=f.legL.userData.knee,kR=f.legR.userData.knee;
  f.legR.rotation.set(-0.95,0,-0.28);kR.rotation.x=1.35;
  if(stopped){f.legL.rotation.set(-0.12,0,0.38);kL.rotation.x=0.12;}else{f.legL.rotation.set(-0.95,0,0.28);kL.rotation.x=1.35;}
}
const _mq=new T.Quaternion(),_mz=new T.Vector3(0,0,1);
{const _uv=updateVehicle;updateVehicle=function(v,dt){
  _uv(v,dt);if(v.type!=='moto'||v.onTr)return;
  const mine=S.mode==='vtt'&&V===v,ridden=mine||!!v.driver;
  // vitesse et virage mesurés (marche aussi pour la moto conduite par l'autre joueur)
  const sp=mine?v.v:(v.net?v.net.sp||0:0),w=v._pth===undefined?0:wrapAng(v.th-v._pth)/Math.max(dt,1e-3);v._pth=v.th;
  v._w=(v._w||0)+(w-(v._w||0))*Math.min(1,dt*8);
  const stopped=Math.abs(sp)<0.7;
  let target;
  if(!ridden)target=-0.2;                                    // garée : appuyée sur la béquille, à gauche (+x)
  else if(stopped)target=-0.09;                              // le pied gauche à terre
  else target=clamp(-Math.atan(sp*v._w/9.8)*1.15,-0.7,0.7);  // dans le virage, comme une vraie
  v.lean=(v.lean||0)+(target-(v.lean||0))*Math.min(1,dt*(ridden?6:3));
  v.mesh.g.quaternion.copy(v.q).multiply(_mq.setFromAxisAngle(_mz,v.lean));
  v.mesh.stand.rotation.x=ridden?-1.35:0;v.mesh.stand.rotation.z=ridden?0:0.5;
  if(mine)motoLegs(player,stopped);
  else if(v.driver&&typeof NET!=='undefined'){const a=NET.avatars[v.driver];if(a&&a.inVeh===v)motoLegs(a.f,stopped);}
};}
