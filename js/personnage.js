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
  const prof=[[0,-0.06],[0.022,-0.056],[0.027,-0.035],[0.021,0.0],[0.016,0.15],[0.0155,0.4],[0.018,0.55],[0.021,0.7],[0.016,0.72],[0,0.722]].map(([r,y])=>new T.Vector2(r,y));
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
  {const a=head.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i);a.setX(i,a.getX(i)*(1-0.78*smoothstep(-0.02,-0.15,y)));}head.computeVertexNormals();}
  // Bande affûtée, plus claire, le long du tranchant
  const eb=new T.Shape();
  eb.moveTo(0.706,-0.149);eb.quadraticCurveTo(0.6,-0.174,0.503,-0.141);eb.lineTo(0.51,-0.124);eb.quadraticCurveTo(0.6,-0.152,0.692,-0.13);eb.lineTo(0.706,-0.149);
  const edge=new T.ExtrudeGeometry(eb,{depth:0.007,bevelEnabled:false,curveSegments:10});edge.translate(0,0,-0.0035);edge.rotateY(-Math.PI/2);
  // Coin de bois et coin de métal visibles sur le dessus de l'œil
  const wedge=new T.BoxGeometry(0.008,0.006,0.07);wedge.translate(0,0.055,0.605);
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
function makeSawModel(){
  const saw=new T.Group(),sawM=mat(0x2d5fa8),blade=mat(0xc9ced2);
  box(0.04,0.04,0.8,sawM,0,0.12,0.35,saw);box(0.04,0.3,0.04,sawM,0,0,0.0,saw);box(0.04,0.3,0.04,sawM,0,0,0.72,saw);box(0.012,0.05,0.76,blade,0,-0.14,0.36,saw);
  return saw;
}
function makeChainModel(old){
  const chain=new T.Group();
  box(0.2,0.24,0.38,mat(old?0xb8732e:0xe06a1a),0,0,0.12,chain);box(0.05,0.09,0.6,mat(0x8f969b),0,-0.04,0.6,chain);box(0.06,0.06,0.3,mat(0x222222),0,0.16,0.08,chain);
  return chain;
}
function makeShovelModel(){
  const g=new T.Group(),wood=mat(0xa77d4c),steel=mat(0x7d858a);
  box(0.045,0.045,1.0,wood,0,0,0.42,g);box(0.14,0.04,0.05,wood,0,0,-0.08,g);
  const bl=box(0.24,0.03,0.3,steel,0,0.02,1.02,g);bl.rotation.x=-0.25;   // palette relevée vers le haut
  return g;
}
// Hachette : vieux fer brun-gris et manche foncé usé; hache : tête peinte en rouge, manche de frêne clair
function axeColors(axe,id){axe.userData.head.color.set(id==='hachette'?0x6f665f:0xb23a2a);axe.userData.handle.color.set(id==='hachette'?0x6e5236:0xb08550);}
function makePlayer(){
  const g=new T.Group();
  const jeans=mat(0x2b3a55),skin=mat(0xe0b48a),boot=mat(0x3a2a1c),tuque=mat(0x2a6e3f),plaid=new T.MeshPhongMaterial({map:plaidTex(),flatShading:true,shininess:4}),eye=new T.MeshBasicMaterial({color:0x1a1a1a}),beard=mat(0x5a3a22);
  const legL=new T.Group(),legR=new T.Group();legL.position.set(0.14,0.9,0);legR.position.set(-0.14,0.9,0);
  [legL,legR].forEach(l=>{box(0.2,0.8,0.22,jeans,0,-0.4,0,l);box(0.22,0.14,0.32,boot,0,-0.83,0.04,l);g.add(l);});
  box(0.56,0.72,0.34,plaid,0,1.26,0,g);
  const armL=new T.Group(),armR=new T.Group();armL.position.set(0.37,1.56,0);armR.position.set(-0.37,1.56,0);
  [armL,armR].forEach(a=>{box(0.17,0.6,0.19,plaid,0,-0.3,0,a);box(0.15,0.13,0.16,skin,0,-0.66,0,a);g.add(a);});
  box(0.36,0.36,0.34,skin,0,1.82,0,g);
  box(0.36,0.14,0.08,beard,0,1.69,0.16,g);
  box(0.06,0.06,0.02,eye,0.09,1.86,0.175,g);box(0.06,0.06,0.02,eye,-0.09,1.86,0.175,g);
  box(0.4,0.2,0.38,tuque,0,2.05,0,g);box(0.14,0.12,0.14,mat(0xd8d0b8),0,2.2,0,g);
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
