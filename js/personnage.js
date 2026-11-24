/* Le bonhomme : silhouettes, outils tenus en main, modèle du joueur */
/* ---------- Silhouette visible derrière les arbres ---------- */
const silMat=new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:0.33,depthWrite:false,depthFunc:T.GreaterDepth});
function markDynamic(root){root.traverse(o=>{if(!o.isMesh||o.userData.sil)return;o.renderOrder=20;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m!==barkM&&m!==endM)m.transparent=true;});});}
function addSilhouette(root){const list=[];root.traverse(o=>{if(o.isMesh&&!o.userData.sil)list.push(o);});list.forEach(o=>{const s=new T.Mesh(o.geometry,silMat);s.userData.sil=true;s.renderOrder=10;o.add(s);});}

/* ---------- Bonhomme ---------- */
function plaidTex(){
  const cv=document.createElement('canvas');cv.width=cv.height=32;const c=cv.getContext('2d');
  c.fillStyle='#b3241f';c.fillRect(0,0,32,32);c.fillStyle='rgba(20,10,10,.85)';
  for(let i=0;i<32;i+=16){c.fillRect(i,0,8,32);c.fillRect(0,i,32,8);}
  const t=new T.CanvasTexture(cv);t.magFilter=T.NearestFilter;t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}
/* Hache et hachette : vraie tête forgée (coin qui s'amincit vers le tranchant) et manche galbé.
   Repère : le manche suit +z (la main est à z≈0), le tranchant est vers -y. */
const AXE_GEO=(()=>{
  // Manche : profil tourné (bout renflé, taille fine, plus épais sous la tête), ovale et légèrement arqué
  const prof=[[0,-0.06],[0.04,-0.056],[0.048,-0.035],[0.038,0.0],[0.031,0.15],[0.03,0.4],[0.034,0.55],[0.038,0.7],[0.03,0.72],[0,0.722]].map(([r,y])=>new T.Vector2(r,y));
  const handle=new T.LatheGeometry(prof,10);handle.rotateX(Math.PI/2);handle.scale(0.78,1,1);
  {const a=handle.attributes.position;for(let i=0;i<a.count;i++){const z=a.getZ(i);a.setY(i,a.getY(i)-0.014*Math.sin(Math.PI*clamp((z+0.06)/0.78,0,1)));}handle.computeVertexNormals();}
  // Tête vue de côté (u : le long du manche, v : vers le haut) : talon en haut, joues, taillant évasé en bas
  const sh=new T.Shape();
  sh.moveTo(0.555,0.05);sh.lineTo(0.655,0.05);sh.lineTo(0.662,0.018);
  sh.quadraticCurveTo(0.648,-0.04,0.705,-0.148);
  sh.quadraticCurveTo(0.6,-0.172,0.505,-0.14);
  sh.quadraticCurveTo(0.56,-0.05,0.55,0.018);sh.lineTo(0.555,0.05);
  const head=new T.ExtrudeGeometry(sh,{depth:0.026,bevelEnabled:true,bevelThickness:0.01,bevelSize:0.006,bevelSegments:2,curveSegments:10});
  head.translate(0,0,-0.013);head.rotateY(-Math.PI/2);
  // Le coin s'amincit vers le tranchant
  {const a=head.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);a.setX(i,a.getX(i)*1.6*(1-0.86*smoothstep(-0.02,-0.15,y)));/* œil assez large pour le manche, puis coin mince */}head.computeVertexNormals();}
  // Bande affûtée, plus claire, le long du tranchant
  const eb=new T.Shape();
  eb.moveTo(0.706,-0.149);eb.quadraticCurveTo(0.6,-0.174,0.503,-0.141);eb.lineTo(0.51,-0.124);eb.quadraticCurveTo(0.6,-0.152,0.692,-0.13);eb.lineTo(0.706,-0.149);
  const edge=new T.ExtrudeGeometry(eb,{depth:0.007,bevelEnabled:false,curveSegments:10});edge.translate(0,0,-0.0035);edge.rotateY(-Math.PI/2);
  // Coin de bois et coin de métal visibles sur le dessus de l'œil
  const wedge=new T.BoxGeometry(0.012,0.006,0.07);wedge.translate(0,0.055,0.605);
  return {handle,head,edge,wedge};
})();
function makeAxeModel(){
  const axe=new T.Group();
  const hm=new T.MeshPhongMaterial({color:0x9a7448,shininess:12});
  const head=new T.MeshPhongMaterial({color:0x8f969b,flatShading:true,shininess:45,specular:0x555555});
  const edge=new T.MeshPhongMaterial({color:0xdfe3e6,flatShading:true,shininess:80,specular:0x999999});
  axe.add(new T.Mesh(AXE_GEO.handle,hm),new T.Mesh(AXE_GEO.head,head),new T.Mesh(AXE_GEO.edge,edge),new T.Mesh(AXE_GEO.wedge,mat(0x3a3a3a)));
  axe.userData.head=head;axe.userData.handle=hm;return axe;
}
/* Sciotte (scie à archet) : arc tubulaire peint, lame dentée tendue, poignée.
   Repère commun des outils : la main est à l'origine, l'outil s'allonge vers +z, le tranchant vers -y. */
const SAW_GEO=(()=>{
  const bow=new T.CatmullRomCurve3([[0,-0.12,-0.02],[0,0.02,-0.05],[0,0.16,0.08],[0,0.22,0.36],[0,0.17,0.64],[0,0.02,0.79],[0,-0.12,0.76]].map(a=>new T.Vector3(...a)));
  const tube=new T.TubeGeometry(bow,32,0.016,7,false);
  const bl=new T.Shape();bl.moveTo(-0.02,-0.1);bl.lineTo(0.78,-0.1);bl.lineTo(0.78,-0.135);
  for(let z=0.78;z>-0.02;z-=0.02){bl.lineTo(z-0.01,-0.152);bl.lineTo(z-0.02,-0.135);}bl.lineTo(-0.02,-0.1);
  const blade=sideExtrude(bl,0.004,0);
  const grip=mergeGeos([new T.CylinderGeometry(0.024,0.024,0.13,8).rotateX(0.5).translate(0,-0.03,-0.04)]);
  const pins=mergeGeos([new T.BoxGeometry(0.03,0.05,0.03).translate(0,-0.115,-0.02),new T.BoxGeometry(0.03,0.05,0.03).translate(0,-0.115,0.76),new T.BoxGeometry(0.04,0.03,0.07).translate(0,0.1,0.7).rotateX(0)]);
  return {tube,blade,grip,pins};
})();
function makeSawModel(){
  const g=new T.Group();
  g.add(new T.Mesh(SAW_GEO.tube,new T.MeshPhongMaterial({color:0xd2551e,shininess:40,specular:0x444444})));
  g.add(new T.Mesh(SAW_GEO.blade,new T.MeshPhongMaterial({color:0xc9ced2,shininess:80,specular:0x888888,side:T.DoubleSide})));
  g.add(new T.Mesh(SAW_GEO.grip,mat(0x1e1e1e)),new T.Mesh(SAW_GEO.pins,mat(0x3a3a3a)));
  return g;
}
/* Scie à chaîne : carter moulé, poignée en arceau, guide-chaîne arrondi avec sa chaîne, lanceur, protège-main */
const CHAIN_GEO=(()=>{
  const bd=new T.Shape();bd.moveTo(-0.08,-0.1);bd.lineTo(0.26,-0.1);bd.quadraticCurveTo(0.33,-0.1,0.33,-0.02);bd.lineTo(0.32,0.08);
  bd.quadraticCurveTo(0.3,0.14,0.2,0.14);bd.lineTo(0.0,0.12);bd.quadraticCurveTo(-0.08,0.1,-0.09,0.02);bd.lineTo(-0.08,-0.1);
  const body=sideExtrude(bd,0.16,0.02);
  const top=new T.TubeGeometry(new T.CatmullRomCurve3([[0,0.1,-0.02],[0,0.22,0.02],[0,0.24,0.16],[0,0.2,0.27],[0,0.12,0.3]].map(a=>new T.Vector3(...a))),20,0.017,6,false);
  const rear=mergeGeos([new T.BoxGeometry(0.04,0.04,0.2).translate(0,-0.06,-0.16),new T.BoxGeometry(0.04,0.12,0.04).translate(0,-0.01,-0.25)]);
  const br=new T.Shape();br.moveTo(0.28,-0.04);br.lineTo(0.86,-0.035);br.absarc(0.86,-0.005,0.03,-Math.PI/2,Math.PI/2,false);br.lineTo(0.28,0.03);br.lineTo(0.28,-0.04);
  const bar=sideExtrude(br,0.018,0);
  const ch=new T.Shape();ch.moveTo(0.28,-0.05);ch.lineTo(0.86,-0.047);ch.absarc(0.86,-0.005,0.042,-Math.PI/2,Math.PI/2,false);ch.lineTo(0.28,0.04);ch.lineTo(0.28,-0.05);
  const chain=sideExtrude(ch,0.008,0);
  const starter=new T.CylinderGeometry(0.075,0.075,0.03,14).rotateZ(Math.PI/2).translate(-0.095,0.01,0.08);
  const guard=new T.BoxGeometry(0.17,0.12,0.02).translate(0,0.14,0.31);
  const fins=mergeGeos([0,1,2,3].map(k=>new T.BoxGeometry(0.17,0.012,0.08).translate(0,0.03+k*0.025,0.2)));
  return {body,top,rear,bar,chain,starter,guard,fins};
})();
function makeChainModel(old){
  const g=new T.Group(),C=CHAIN_GEO,black=mat(0x1e1e1e);
  const body=new T.MeshPhongMaterial({color:old?0xb8732e:0xe86a14,shininess:35,specular:0x333333});
  g.add(new T.Mesh(C.body,body),new T.Mesh(C.top,black),new T.Mesh(C.rear,black),new T.Mesh(C.guard,black));
  g.add(new T.Mesh(C.bar,new T.MeshPhongMaterial({color:0xa9aeb2,shininess:70,specular:0x777777})),new T.Mesh(C.chain,mat(0x3b3b3b)));
  g.add(new T.Mesh(C.starter,mat(0x4a4d50)),new T.Mesh(C.fins,mat(0x55585b)));
  g.position.set(0,0,0);g.userData.body=body;
  return g;
}
/* Pelle ronde : manche de bois tourné, poignée en D, palette creusée en pointe, douille d'acier */
const SHOVEL_GEO=(()=>{
  const prof=[[0,-0.02],[0.022,-0.015],[0.02,0.3],[0.02,0.78],[0.026,0.82],[0,0.84]].map(([r,y])=>new T.Vector2(r,y));
  const handle=new T.LatheGeometry(prof,9);handle.rotateX(Math.PI/2);
  const dg=mergeGeos([new T.TubeGeometry(new T.CatmullRomCurve3([[0,0,-0.01],[0.06,0,-0.08],[0.06,0,-0.16],[0,0,-0.2],[-0.06,0,-0.16],[-0.06,0,-0.08],[0,0,-0.01]].map(a=>new T.Vector3(...a)),true),24,0.014,6,true),
    new T.CylinderGeometry(0.018,0.018,0.12,8).rotateZ(Math.PI/2).translate(0,0,-0.17)]);
  // Palette : contour en pointe (u : vers le bout, v : la largeur), puis creusée
  const sp=new T.Shape();sp.moveTo(0,-0.11);sp.quadraticCurveTo(0.2,-0.13,0.3,-0.06);sp.quadraticCurveTo(0.36,0,0.3,0.06);sp.quadraticCurveTo(0.2,0.13,0,0.11);sp.lineTo(0,-0.11);
  const blade=new T.ExtrudeGeometry(sp,{depth:0.008,bevelEnabled:false,curveSegments:10});
  blade.translate(0,0,-0.004);blade.rotateX(Math.PI/2);blade.rotateY(-Math.PI/2);   // u → +z, v → x
  {const a=blade.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i);a.setY(i,a.getY(i)+x*x*1.6);}blade.computeVertexNormals();}
  blade.rotateX(-0.25);blade.translate(0,0.01,0.82);
  const collar=new T.CylinderGeometry(0.03,0.04,0.1,10).rotateX(Math.PI/2).translate(0,0.005,0.85);
  return {handle,dg,blade,collar};
})();
function makeShovelModel(){
  const g=new T.Group(),S2=SHOVEL_GEO,steel=new T.MeshPhongMaterial({color:0x7d858a,shininess:50,specular:0x555555,side:T.DoubleSide});
  g.add(new T.Mesh(S2.handle,new T.MeshPhongMaterial({color:0xa77d4c,shininess:12})),new T.Mesh(S2.dg,mat(0x232323)),new T.Mesh(S2.blade,steel),new T.Mesh(S2.collar,steel));
  return g;
}
function axeColors(axe,id){axe.userData.head.color.set(id==='hachette'?0x6f665f:0xb23a2a);axe.userData.handle.color.set(id==='hachette'?0x6e5236:0xb08550);}
// Position des jambes : debout, assis sur une chaise, à cheval sur un VTT (pieds sur les repose-pieds)
function legPose(f,mode){
  const kL=f.legL.userData.knee,kR=f.legR.userData.knee;
  if(mode==='ride'){f.legL.rotation.set(-1.2,0,0.32);f.legR.rotation.set(-1.2,0,-0.32);kL.rotation.x=kR.rotation.x=1.5;}
  else if(mode==='drive'){f.legL.rotation.set(-1.35,0,0.1);f.legR.rotation.set(-1.35,0,-0.1);kL.rotation.x=kR.rotation.x=1.2;}
  else if(mode==='sit'){f.legL.rotation.set(-1.45,0,0.08);f.legR.rotation.set(-1.45,0,-0.08);kL.rotation.x=kR.rotation.x=1.45;}
  else{f.legL.rotation.set(0,0,0);f.legR.rotation.set(0,0,0);kL.rotation.x=kR.rotation.x=0;}
}
/* Bûcheron : formes arrondies (boîtes à coins arrondis, membres cylindriques), mêmes articulations
   qu'avant (hanches, genoux, épaules) pour les animations. */
function roundBox(w,h,d,r){
  const sh=new T.Shape(),x=w/2-r,y=h/2-r;
  sh.moveTo(-x,-h/2);sh.lineTo(x,-h/2);sh.quadraticCurveTo(w/2,-h/2,w/2,-y);sh.lineTo(w/2,y);sh.quadraticCurveTo(w/2,h/2,x,h/2);
  sh.lineTo(-x,h/2);sh.quadraticCurveTo(-w/2,h/2,-w/2,y);sh.lineTo(-w/2,-y);sh.quadraticCurveTo(-w/2,-h/2,-x,-h/2);
  const g=new T.ExtrudeGeometry(sh,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r*0.6,bevelSegments:2,curveSegments:3});
  g.translate(0,0,-(d-2*r)/2);g.computeVertexNormals();return g;
}
const BODY_GEO=(()=>{
  const torso=roundBox(0.54,0.72,0.34,0.08);torso.translate(0,1.26,0);
  {const uv=torso.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2.4,uv.getY(i)*2.4);}   // carreaux de la chemise plus petits
  const belt=new T.CylinderGeometry(0.25,0.25,0.08,12).scale(1,1,0.68).translate(0,0.92,0);
  const hips=roundBox(0.5,0.16,0.3,0.06).translate(0,0.95,0);
  const thigh=new T.CylinderGeometry(0.11,0.1,0.44,9).translate(0,-0.22,0);
  const shin=new T.CylinderGeometry(0.1,0.09,0.38,9).translate(0,-0.19,0);
  const bs=new T.Shape();bs.moveTo(-0.13,0);bs.lineTo(0.12,0);bs.quadraticCurveTo(0.22,0,0.21,0.07);bs.quadraticCurveTo(0.18,0.12,0.06,0.12);bs.lineTo(0.06,0.18);bs.lineTo(-0.12,0.18);bs.lineTo(-0.13,0);
  const boot=sideExtrude(bs,0.22,0.02).translate(0,-0.48,0);
  const shoulder=new T.SphereGeometry(0.105,10,8).translate(0,-0.04,0);
  const upper=new T.CylinderGeometry(0.09,0.085,0.34,9).translate(0,-0.2,0);
  const fore=new T.CylinderGeometry(0.085,0.075,0.26,9).translate(0,-0.48,0);
  const hand=new T.SphereGeometry(0.08,10,8).scale(0.9,1.1,1).translate(0,-0.66,0);
  const head=roundBox(0.36,0.37,0.34,0.08).translate(0,1.83,0);
  const neck=new T.CylinderGeometry(0.08,0.09,0.12,8).translate(0,1.66,0);
  const ears=mergeGeos([new T.SphereGeometry(0.045,8,6).scale(0.5,1,1).translate(0.185,1.83,0),new T.SphereGeometry(0.045,8,6).scale(0.5,1,1).translate(-0.185,1.83,0)]);
  const nose=new T.BoxGeometry(0.07,0.09,0.07).translate(0,1.81,0.18);
  const beard=roundBox(0.36,0.17,0.12,0.05).translate(0,1.7,0.13);
  const brows=mergeGeos([new T.BoxGeometry(0.09,0.025,0.02).translate(0.09,1.92,0.17),new T.BoxGeometry(0.09,0.025,0.02).translate(-0.09,1.92,0.17)]);
  const eyes=mergeGeos([new T.SphereGeometry(0.028,8,6).translate(0.09,1.865,0.168),new T.SphereGeometry(0.028,8,6).translate(-0.09,1.865,0.168)]);
  const tuque=mergeGeos([new T.SphereGeometry(0.215,14,8,0,Math.PI*2,0,Math.PI/2).scale(1,0.95,0.98).translate(0,1.97,0)]);
  const brim=new T.CylinderGeometry(0.222,0.222,0.09,14).scale(1,1,0.98).translate(0,1.975,0);
  const pom=new T.SphereGeometry(0.07,10,8).translate(0,2.2,0);
  return {torso,belt,hips,thigh,shin,boot,shoulder,upper,fore,hand,head,neck,ears,nose,beard,brows,eyes,tuque,brim,pom};
})();
function makePlayer(){
  const g=new T.Group(),B=BODY_GEO;
  const jeans=new T.MeshPhongMaterial({color:0x2b3a55,shininess:6}),skin=new T.MeshPhongMaterial({color:0xe0b48a,shininess:10}),boot=new T.MeshPhongMaterial({color:0x3a2a1c,shininess:15});
  const tuque=new T.MeshPhongMaterial({color:0x2a6e3f,shininess:4}),plaid=new T.MeshPhongMaterial({map:plaidTex(),shininess:4});
  const eye=new T.MeshBasicMaterial({color:0x1a1a1a}),beard=new T.MeshPhongMaterial({color:0x5a3a22,shininess:4}),leather=mat(0x4a3220);
  const M=(geo,m,parent)=>{const me=new T.Mesh(geo,m);(parent||g).add(me);return me;};
  // Jambes : cuisse, puis genou qui plie (tibia + botte)
  const legL=new T.Group(),legR=new T.Group();legL.position.set(0.13,0.9,0);legR.position.set(-0.13,0.9,0);
  [legL,legR].forEach(l=>{M(B.thigh,jeans,l);const k=new T.Group();k.position.set(0,-0.42,0);M(B.shin,jeans,k);M(B.boot,boot,k);l.add(k);l.userData.knee=k;g.add(l);});
  M(B.hips,jeans);M(B.belt,leather);M(B.torso,plaid);M(B.neck,skin);
  // Bras : épaule, bras, avant-bras, main (l'outil est tenu à y = -0.68)
  const armL=new T.Group(),armR=new T.Group();armL.position.set(0.36,1.56,0);armR.position.set(-0.36,1.56,0);
  [armL,armR].forEach(a=>{M(B.shoulder,plaid,a);M(B.upper,plaid,a);M(B.fore,plaid,a);M(B.hand,skin,a);g.add(a);});
  // Tête
  M(B.head,skin);M(B.ears,skin);M(B.nose,skin);M(B.beard,beard);M(B.brows,beard);M(B.eyes,eye);
  M(B.tuque,tuque);M(B.brim,new T.MeshPhongMaterial({color:0x245e36,shininess:4}));M(B.pom,new T.MeshPhongMaterial({color:0xd8d0b8,shininess:4}));
  const axe=makeAxeModel();axe.position.set(0,-0.68,0);armR.add(axe);
  const saw=makeSawModel();saw.position.set(0,-0.68,0);armR.add(saw);
  const chain=makeChainModel();chain.position.set(0,-0.68,0);armR.add(chain);
  const shovel=makeShovelModel();shovel.position.set(0,-0.68,0);armR.add(shovel);
  const carryLog=makeLog(logGeoZ);carryLog.position.set(0.24,1.72,0.1);carryLog.visible=false;g.add(carryLog);
  shadows(g);addSilhouette(g);
  return {g,legL,legR,armL,armR,axe,saw,chain,shovel,carryLog};
}
const player=makePlayer();scene.add(player.g);markDynamic(player.g);
function updateToolVisual(){
  const show=S.mode==='foot'&&!P.carry&&!P.pail;
  const k=TOOL?TOOL.kind:null;
  player.axe.visible=show&&k==='axe';player.saw.visible=show&&k==='saw';player.chain.visible=show&&k==='chainsaw';player.shovel.visible=show&&k==='shovel';if(player.plant)player.plant.visible=show&&k==='plant';
  if(TOOL){player.axe.scale.setScalar(TOOL.id==='hachette'?0.78:1);axeColors(player.axe,TOOL.id);}
}

/* Outil en main en vue 1re personne : un bras et l'outil accrochés à la caméra */
const fpTool=(()=>{
  const g=new T.Group(),arm=new T.Group();g.add(arm);
  const plaid=mat(0xa33a2a),skin=mat(0xe2b08a);
  box(0.13,0.13,0.42,plaid,0,0,0.12,arm);box(0.12,0.11,0.12,skin,0,0,-0.12,arm);
  const tools={axe:makeAxeModel(),saw:makeSawModel(),chainsaw:makeChainModel(),shovel:makeShovelModel()};
  for(const k in tools){const t=tools[k];t.rotation.y=Math.PI;t.position.set(0,0,-0.12);arm.add(t);}
  g.position.set(0.32,-0.36,-0.42);scene.add(pcam);pcam.add(g);g.visible=false;
  g.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  return {g,arm,tools};
})();
function updateFpTool(){
  const show=camMode==='fp'&&S.mode==='foot'&&TOOL&&TOOL.kind!=='plant'&&!P.carry&&!P.pail;
  fpTool.g.visible=!!show;if(!show)return;
  for(const k in fpTool.tools)fpTool.tools[k].visible=k===TOOL.kind;
  if(TOOL.kind==='axe'){fpTool.tools.axe.scale.setScalar(TOOL.id==='hachette'?0.78:1);axeColors(fpTool.tools.axe,TOOL.id);}
  const r=player.armR.rotation.x,k=TOOL.kind;
  // r : 0 au repos, -2.7 hache levée; on le traduit en mouvement vu de face
  if(k==='axe'||k==='shovel'){fpTool.arm.rotation.x=0.35-r*0.5;fpTool.arm.position.z=0;}
  else{fpTool.arm.rotation.x=0.2;fpTool.arm.position.z=P.swing>0?Math.sin(S.time*(k==='saw'?18:60))*(k==='saw'?0.08:0.01):0;}
  fpTool.arm.position.y=P.swing>0?0:Math.sin(P.phase*2)*0.01;
}
