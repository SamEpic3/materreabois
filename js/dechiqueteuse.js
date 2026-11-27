/* Déchiqueteuse à copeaux : remorque qu'on attelle au pick-up (ou au VTT).
   On y passe un billot qu'on porte, ou une tige / une cime couchée près de la goulotte d'entrée (à l'arrière).
   Les copeaux s'accumulent dans la machine (en m³ apparents) : on décidera plus tard comment les entreposer et les vendre. */
const CHIP_BULK=2.6;          // 1 m³ de bois plein ≈ 2,6 m³ de copeaux
function chipVolume(c){const r=(c.ra+c.rb)/2;return c.crown?c.len*0.06:Math.PI*r*r*c.len*CHIP_BULK;}
function fmtM3(v){return (Math.round(v*100)/100).toString().replace('.',',')+' m³';}
function makeChipper(){
  const g=new T.Group(),green=new T.MeshPhongMaterial({color:0x2f6b3a,shininess:50,specular:0x333333}),dark=mat(0x262626),steel=new T.MeshPhongMaterial({color:0x8a9196,shininess:70,specular:0x777777}),blk=mat(0x1b1b1b),yel=mat(0xe8c23a);
  // Châssis et timon
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.2,0.14,2.6).translate(0,0.62,-0.2),new T.BoxGeometry(0.08,0.08,1.5).rotateY(-0.3).translate(0.22,0.6,1.52),new T.BoxGeometry(0.08,0.08,1.5).rotateY(0.3).translate(-0.22,0.6,1.52),
    new T.CylinderGeometry(0.05,0.05,0.06,10).translate(0,0.62,2.25),new T.BoxGeometry(0.06,0.4,0.06).translate(0,0.42,1.9)]),dark));
  // Moteur et capot à l'avant
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.1,0.8,0.95).translate(0,1.1,0.55),new T.BoxGeometry(1.0,0.12,0.85).translate(0,1.56,0.55)]),green));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.02,0.45,0.7).translate(0.56,1.1,0.55),new T.CylinderGeometry(0.05,0.05,0.35,8).translate(0.35,1.78,0.75)]),blk));
  // Tambour (boîtier rond) et goulotte de sortie qui se recourbe
  g.add(new T.Mesh(new T.CylinderGeometry(0.55,0.55,0.55,18).rotateZ(Math.PI/2).translate(0,1.15,-0.35),green));
  const chute=new T.TubeGeometry(new T.CatmullRomCurve3([[0,1.55,-0.35],[0,2.3,-0.3],[0,2.7,0.05],[0,2.75,0.45]].map(a=>new T.Vector3(...a))),16,0.16,10,false);
  g.add(new T.Mesh(chute,green));
  g.add(new T.Mesh(new T.BoxGeometry(0.36,0.12,0.3).rotateX(0.5).translate(0,2.68,0.6),dark));
  // Goulotte d'entrée (table d'alimentation) à l'arrière
  const hop=new T.Shape();hop.moveTo(-0.45,0);hop.lineTo(0.45,0);hop.lineTo(0.7,0.6);hop.lineTo(-0.7,0.6);hop.lineTo(-0.45,0);
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.9,0.06,1.0).translate(0,0.85,-1.3),new T.BoxGeometry(0.06,0.55,1.0).translate(0.47,1.1,-1.3),new T.BoxGeometry(0.06,0.55,1.0).translate(-0.47,1.1,-1.3),
    new T.BoxGeometry(0.9,0.06,0.3).translate(0,1.36,-0.85)]),steel));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.0,0.06,0.06).translate(0,1.42,-1.82),new T.BoxGeometry(0.06,0.06,0.06).translate(0.5,1.2,-1.82),new T.BoxGeometry(0.06,0.06,0.06).translate(-0.5,1.2,-1.82)]),yel));
  g.add(new T.Mesh(new T.BoxGeometry(0.9,0.5,0.04).translate(0,1.05,-0.8),dark));
  // Roues
  const wg=wheelGeo(0.36,0.22);const wheels=[];
  [0.72,-0.72].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(wg.tread,blk),new T.Mesh(wg.rim,green));w.position.set(x,0.36,-0.35);g.add(w);wheels.push(w);});
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();g.add(cargo);
  return {g,wheels,cargo};
}
TSPECS.dechiq={name:'déchiqueteuse',label:'Déchiqueteuse',build:makeChipper,tl:2.25,cols:[[0.45,0.62],[-0.9,0.7]],hl:1.4,hw:0.75,cap:0,r:2.2,wr:0.36,tilt:0.04,chipper:true,slots:[]};
VEH_SHOP.push({id:'dechiq',kind:'trailer',name:'Déchiqueteuse à copeaux',price:9000,desc:'Attelle-la au pick-up ou au VTT. Passe-lui des billots, des tiges ou des cimes par la goulotte arrière : elle en fait des copeaux. (Comment entreposer les copeaux : à venir!)'});

/* ----- Alimenter la machine ----- */
function chipIntake(t){return {x:t.x-Math.sin(t.th)*1.9,z:t.z-Math.cos(t.th)*1.9};}
function nearestChipper(r){let b=null,bd=r;trailers.forEach(t=>{if(!t.spec.chipper)return;const p=chipIntake(t),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;b=t;}});return b;}
function chipBusy(t){if(t.chipping)return {info:'La déchiqueteuse travaille…'};if(t.hitch&&Math.abs(t.hitch.v)>0.3)return {info:'Arrête-toi avant de déchiqueter'};return null;}
function chipCarryContext(){
  const t=nearestChipper(2.2);if(!t)return null;const b=chipBusy(t);if(b)return b;
  const c=P.carry;return {act:{label:`Passer le billot dans la déchiqueteuse (+${fmtM3(chipVolume(c))})`,fn:()=>{setCarry(null);startChip(t,c);}}};
}
function chipFreeContext(){
  const t=nearestChipper(2.6);if(!t)return null;const b=chipBusy(t);if(b)return b;
  const p=chipIntake(t);let best=null,bd=1.8;pieces.forEach(pc=>{const d=distToPiece(p,pc);if(d<bd){bd=d;best=pc;}});
  const tot=`Copeaux dans la machine : ${fmtM3(t.chips||0)}`;
  if(best){const pc=best;return {act:{label:`Déchiqueter ${pc.crown?'la cime':'la tige'} (${ftin(pc.len)}, +${fmtM3(chipVolume(pc))})`,fn:()=>{const c={len:pc.len,ra:pc.ra,rb:pc.rb,sp:pc.sp,crown:pc.crown};removePiece(pc);startChip(t,c);}},info:tot};}
  return {info:tot+' · apporte un billot, ou couche une tige ou une cime près de la goulotte arrière'};
}
function startChip(t,c){
  const m=makePieceMesh(Object.assign({},c,{crown:false}));m.position.set(0,1.1,-1.3-Math.min(c.len,3)/2);t.mesh.cargo.add(m);
  t.chipping={time:0,dur:clamp(0.8+c.len*0.35,1,4),c,mesh:m,len:c.len};
  sfxSwing('chainsaw',t.x,t.z,t.chipping.dur);
}
const chipParts=[],chipPGeo=new T.BoxGeometry(0.06,0.03,0.08),chipPMat=mat(0xe3c28e);
function updateChippers(dt){
  trailers.forEach(t=>{
    const s=t.chipping;if(!s)return;
    s.time+=dt;const k=Math.min(1,s.time/s.dur);
    // le bois avance dans la goulotte et disparaît
    const vis=Math.max(0.05,1-k);s.mesh.scale.set(1,1,vis);s.mesh.position.z=-0.95-Math.min(s.len,3)*vis/2;
    // copeaux qui sortent de la goulotte
    if(chipParts.length<60&&Math.random()<dt*40){
      const p=new T.Mesh(chipPGeo,chipPMat),fx=Math.sin(t.th),fz=Math.cos(t.th);
      const y=H(t.x,t.z)+2.75;p.position.set(t.x+fx*0.6,y,t.z+fz*0.6);scene.add(p);
      chipParts.push({m:p,vx:fx*(2.5+Math.random()*1.5)+(Math.random()-0.5)*0.8,vy:1+Math.random()*1.2,vz:fz*(2.5+Math.random()*1.5)+(Math.random()-0.5)*0.8,life:1.1});
    }
    if(k>=1){t.mesh.cargo.remove(s.mesh);t.chipping=null;const v=chipVolume(s.c);t.chips=(t.chips||0)+v;
      if(Math.hypot(P.x-t.x,P.z-t.z)<6)toast(`🪵 +${fmtM3(v)} de copeaux · total : ${fmtM3(t.chips)}`);}
  });
  for(let i=chipParts.length-1;i>=0;i--){const p=chipParts[i];p.life-=dt;p.vy-=9.8*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.rotation.x+=dt*9;
    if(p.life<=0||p.m.position.y<H(p.m.position.x,p.m.position.z)){scene.remove(p.m);chipParts.splice(i,1);}}
}
