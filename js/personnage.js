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
function makeAxeModel(){
  const axe=new T.Group(),hm=mat(0x9a7448),head=mat(0x8f969b);
  box(0.05,0.05,0.75,hm,0,0,0.3,axe);box(0.05,0.2,0.16,head,0,-0.04,0.64,axe);
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
function axeColors(axe,id){axe.userData.head.color.set(id==='hachette'?0x7d6a5c:0xb23a2a);axe.userData.handle.color.set(id==='hachette'?0x6e5236:0xa77d4c);}
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
  const carryLog=makeLog(logGeoZ);carryLog.position.set(0.24,1.72,0.1);carryLog.visible=false;g.add(carryLog);
  shadows(g);addSilhouette(g);
  return {g,legL,legR,armL,armR,axe,saw,chain,carryLog};
}
const player=makePlayer();scene.add(player.g);markDynamic(player.g);
function updateToolVisual(){
  const show=S.mode==='foot'&&!P.carry;
  const k=TOOL?TOOL.kind:null;
  player.axe.visible=show&&k==='axe';player.saw.visible=show&&k==='saw';player.chain.visible=show&&k==='chainsaw';
  if(TOOL){player.axe.scale.setScalar(TOOL.id==='hachette'?0.78:1);axeColors(player.axe,TOOL.id);}
}
