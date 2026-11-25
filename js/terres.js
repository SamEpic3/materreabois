/* Terres à vendre (érablière au nord, terre à bois au sud) : clôturées tant qu'on ne les a pas achetées.
   On les achète au panneau « À vendre » à la barrière. Le territoire public (mont du Loup, rivière) est ouvert à tous,
   mais on n'a pas le droit d'y bûcher ni d'y construire. */
S.lands={erab:false,coupe:false};
function landBlocked(x,z){const l=landAt(x,z);return (l==='erab'||l==='coupe')&&!S.lands[l];}
function isPublic(x,z){return landAt(x,z)==='pub';}

/* ----- Clôtures de perches, barrières et panneaux ----- */
const fences={};
function fenceLines(k){
  const L=LANDS[k];
  // côtés qui touchent un endroit où l'on peut aller (pas le bout du territoire)
  if(k==='erab')return [[L.x0,L.z1,L.x1,L.z1],[L.x1,L.z0,L.x1,L.z1]];
  return [[L.x0,L.z0,L.x1,L.z0],[L.x1,L.z0,L.x1,L.z1]];
}
function gateOf(k){return k==='erab'?{x:11.2,z:-80}:{x:0.4,z:80};}
function buildFence(k){
  const g=new T.Group(),posts=[],rails=[],gate=gateOf(k);
  fenceLines(k).forEach(([x0,z0,x1,z1])=>{
    const L=Math.hypot(x1-x0,z1-z0),n=Math.ceil(L/2.6),dx=(x1-x0)/n,dz=(z1-z0)/n,ang=Math.atan2(dx,dz);
    for(let i=0;i<=n;i++){const x=x0+dx*i,z=z0+dz*i;if(Math.hypot(x-gate.x,z-gate.z)<1.6)continue;posts.push([x,z]);}
    for(let i=0;i<n;i++){const x=x0+dx*(i+0.5),z=z0+dz*(i+0.5);if(Math.hypot(x-gate.x,z-gate.z)<2.2)continue;rails.push([x,z,ang,Math.hypot(dx,dz)]);}
  });
  const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3(),UPV=new T.Vector3(0,1,0);
  const pm=new T.InstancedMesh(new T.CylinderGeometry(0.07,0.08,1.3,6).translate(0,0.6,0),new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3}),posts.length);
  posts.forEach(([x,z],i)=>{m4.compose(p.set(x,H(x,z),z),q.identity(),sc.set(1,1,1));pm.setMatrixAt(i,m4);});
  const rm=new T.InstancedMesh(mergeGeos([new T.CylinderGeometry(0.045,0.05,1,5).rotateX(Math.PI/2).translate(0,0.55,0),new T.CylinderGeometry(0.045,0.05,1,5).rotateX(Math.PI/2).translate(0,1.0,0)]),mat(0x8a6a44),rails.length*1);
  rails.forEach(([x,z,a,l],i)=>{q.setFromAxisAngle(UPV,a);m4.compose(p.set(x,H(x,z),z),q,sc.set(1,1,l+0.1));rm.setMatrixAt(i,m4);});
  [pm,rm].forEach(m=>{m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;g.add(m);});
  // Barrière fermée (deux poteaux et une barre) et panneau « À vendre »
  const gx=gate.x,gz=gate.z,gy=H(gx,gz),horiz=k==='erab'||k==='coupe';
  const bar=new T.Group();
  bar.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.1,0.11,1.5,7).translate(-1.7,0.7,0),new T.CylinderGeometry(0.1,0.11,1.5,7).translate(1.7,0.7,0),
    new T.BoxGeometry(3.4,0.1,0.08).translate(0,1.0,0),new T.BoxGeometry(3.4,0.1,0.08).translate(0,0.55,0),new T.BoxGeometry(3.6,0.08,0.08).rotateZ(0.27).translate(0,0.78,0)]),mat(0x9a7448)));
  bar.position.set(gx,gy,gz);g.add(bar);
  const L=LANDS[k];
  const tex=canvasTex(512,300,(c,W,Hh)=>{c.fillStyle='#f3ead2';c.fillRect(0,0,W,Hh);c.strokeStyle='#a52a24';c.lineWidth=14;c.strokeRect(7,7,W-14,Hh-14);
    c.fillStyle='#a52a24';c.font='bold 78px Georgia,serif';c.textAlign='center';c.fillText('À VENDRE',W/2,98);
    c.fillStyle='#2b2418';c.font='bold 38px Georgia,serif';c.fillText(L.name,W/2,170);c.font='bold 48px Georgia,serif';c.fillText(L.price.toLocaleString('fr-CA')+' $',W/2,245);});
  const sign=new T.Group(),sm=new T.MeshBasicMaterial({map:tex});
  sign.add(new T.Mesh(new T.PlaneGeometry(1.5,0.88),sm));const back=new T.Mesh(new T.PlaneGeometry(1.5,0.88),mat(0x7a5a3a));back.rotation.y=Math.PI;sign.add(back);
  sign.children.forEach(m=>m.position.y=1.55);
  sign.add(new T.Mesh(new T.BoxGeometry(0.08,1.6,0.08).translate(0,0.8,-0.02),mat(0x5e4632)));
  const sx=gx+2.6,sz=gz+(k==='erab'?2.0:-2.0);sign.position.set(sx,H(sx,sz),sz);sign.rotation.y=k==='erab'?0:Math.PI;g.add(sign);
  shadows(g);scene.add(g);
  fences[k]={g,sign:{x:sx,z:sz}};
}
for(const k in LANDS)buildFence(k);
function refreshLands(){for(const k in LANDS){const f=fences[k];if(f)f.g.visible=!S.lands[k];}}

/* ----- Acheter une terre au panneau ----- */
function landSignNear(){for(const k in LANDS){if(S.lands[k])continue;const s=fences[k].sign;if(Math.hypot(P.x-s.x,P.z-s.z)<3)return k;}return null;}
function landContext(){
  const k=landSignNear();if(!k)return null;const L=LANDS[k];
  if(S.money<L.price)return {info:`${L.name} : ${L.price.toLocaleString('fr-CA')} $ — ${L.desc} Il te manque ${(L.price-S.money).toLocaleString('fr-CA')} $`};
  return {act:{label:`Acheter ${L.short} (${L.price.toLocaleString('fr-CA')} $)`,fn:()=>confirmSale('terre-'+k,`Acheter ${L.name} pour ${L.price.toLocaleString('fr-CA')} $ ?`,()=>{
    if(S.money<L.price||S.lands[k])return;S.money-=L.price;S.lands[k]=true;refreshLands();sfxCash();sfxBell();J.buy(L.name,L.price);toast(`🌲 ${L.name} est à vous ! La clôture est enlevée.`);})},info:L.desc};
}
