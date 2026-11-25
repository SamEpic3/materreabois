/* Chaloupe en aluminium avec rames, vendue sur sa remorque. On recule la remorque près du lac pour la mettre
   à l'eau; on rame (WASD), deux places (rameur et passager), on peut pêcher dedans, puis on la remonte. */

/* ----- Modèle : coque (côtés évasés), fond, bancs, rames ----- */
function boatOutline(){
  const s=new T.Shape();
  s.moveTo(-0.55,-1.75);s.lineTo(0.55,-1.75);s.quadraticCurveTo(0.66,-1.2,0.66,-0.4);s.quadraticCurveTo(0.64,1.0,0,1.85);
  s.quadraticCurveTo(-0.64,1.0,-0.66,-0.4);s.quadraticCurveTo(-0.66,-1.2,-0.55,-1.75);
  return s.getPoints(10);
}
function makeBoatModel(){
  const g=new T.Group(),pts=boatOutline(),n=pts.length,H0=0.0,H1=0.48;
  const alu=new T.MeshPhongMaterial({color:0x9aa3a8,shininess:70,specular:0x777777,side:T.DoubleSide,flatShading:true});
  const inner=new T.MeshPhongMaterial({color:0x7e878c,shininess:40,flatShading:true});
  const pos=[];
  for(let i=0;i<n-1;i++){
    const a=pts[i],b=pts[i+1],k=0.8;   // le fond est plus étroit que le haut
    const A1=[a.x,H1,a.y],B1=[b.x,H1,b.y],A0=[a.x*k,H0,a.y*0.96],B0=[b.x*k,H0,b.y*0.96];
    pos.push(...A0,...B0,...B1,...A0,...B1,...A1);
  }
  const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(pos,3));hull.computeVertexNormals();
  g.add(new T.Mesh(hull,alu));
  const fs=new T.Shape(pts.map(p=>new T.Vector2(p.x*0.8,p.y*0.96)));
  g.add(new T.Mesh(new T.ShapeGeometry(fs).rotateX(Math.PI/2).translate(0,H0+0.02,0),inner));
  // Plat-bord, bancs, tolets
  const rim=[];for(let i=0;i<n-1;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b.x-a.x,b.y-a.y);rim.push(new T.BoxGeometry(0.05,0.05,L+0.02).rotateY(Math.atan2(b.x-a.x,b.y-a.y)).translate((a.x+b.x)/2,H1,(a.y+b.y)/2));}
  rim.push(new T.BoxGeometry(1.24,0.04,0.28).translate(0,0.33,-1.2),new T.BoxGeometry(1.3,0.04,0.28).translate(0,0.33,0.1),new T.BoxGeometry(0.92,0.04,0.26).translate(0,0.33,1.05));
  [-1,1].forEach(sd=>rim.push(new T.CylinderGeometry(0.02,0.02,0.1,5).translate(sd*0.64,H1+0.05,0.2)));
  g.add(new T.Mesh(mergeGeos(rim),new T.MeshPhongMaterial({color:0x6e767a,shininess:50})));
  // Rames : pivot au tolet
  const oars=[-1,1].map(sd=>{const o=new T.Group();o.position.set(sd*0.64,H1+0.06,0.2);
    const m=new T.Mesh(mergeGeos([new T.CylinderGeometry(0.022,0.022,2.1,6).rotateZ(Math.PI/2).translate(sd*0.35,0,0),new T.BoxGeometry(0.42,0.015,0.13).translate(sd*1.42,0,0)]),mat(0xb08a5a));
    o.add(m);g.add(o);return o;});
  g.userData.oars=oars;
  g.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=true;}});
  return g;
}
function makeBoatVehicle(){const g=new T.Group(),b=makeBoatModel();g.add(b);shadows(g);return {g,wheels:[],oars:b.userData.oars,boat:b};}
function makeBoatTrailer(){
  const g=new T.Group(),steel=mat(0x2f3a44),wood=mat(0x6b4a2c),tire=mat(0x1b1b1b),rim=mat(0x9aa0a4);
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.08,0.08,3.4).translate(0.42,0.42,-0.2),new T.BoxGeometry(0.08,0.08,3.4).translate(-0.42,0.42,-0.2),
    new T.BoxGeometry(0.92,0.08,0.08).translate(0,0.42,-1.6),new T.BoxGeometry(0.92,0.08,0.08).translate(0,0.42,0.3),
    new T.BoxGeometry(0.06,0.06,1.2).rotateY(0.33).translate(0.2,0.42,1.85),new T.BoxGeometry(0.06,0.06,1.2).rotateY(-0.33).translate(-0.2,0.42,1.85),
    new T.CylinderGeometry(0.05,0.05,0.06,10).translate(0,0.47,2.4),new T.BoxGeometry(0.06,0.55,0.06).translate(0,0.68,1.5),new T.CylinderGeometry(0.06,0.06,0.12,10).rotateZ(Math.PI/2).translate(0,0.92,1.5),
    new T.BoxGeometry(1.5,0.06,0.06).translate(0,0.3,-0.4)]),steel));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.12,0.08,2.6).translate(0.3,0.5,-0.4),new T.BoxGeometry(0.12,0.08,2.6).translate(-0.3,0.5,-0.4)]),wood));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.5,0.04,0.3).translate(0.62,0.62,-0.4),new T.BoxGeometry(0.5,0.04,0.3).translate(-0.62,0.62,-0.4)]),mat(0x222222)));   // garde-boue
  const W=wheelGeo(0.3,0.18),wheels=[];
  [0.72,-0.72].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,rim));w.position.set(x,0.3,-0.4);g.add(w);wheels.push(w);});
  const boat=makeBoatModel();boat.position.set(0,0.56,-0.3);boat.scale.setScalar(0.95);g.add(boat);
  const cargo=new T.Group();g.add(cargo);
  shadows(g);addSilhouette(g);
  return {g,wheels,cargo,boat};
}
SPECS.chaloupe={name:'Chaloupe',build:makeBoatVehicle,boat:true,hitch:null,wb:2,wr:0.3,maxF:2.4,maxR:1.3,acc:1.6,mudLoss:0,steer:0.6,hl:1.6,hw:0.6,
  cols:[[1.2,0.55],[0,0.7],[-1.2,0.6]],enterR:3.4,seat:[0,-0.52,0.1],pass:[0,-0.52,-1.2],passEye:[0,1.15,-1.15],hide:false,eye:[0,1.15,0.1],side:1.5,cam:[6.5,2.8],arrowY:2.2};
TSPECS.chaloupe={name:'remorque à chaloupe',label:'Chaloupe',build:makeBoatTrailer,tl:2.45,cols:[[1.1,0.75],[-0.3,0.85],[-1.6,0.75]],hl:1.4,hw:0.6,cap:0,r:2.4,wr:0.3,tilt:0.04,boatTr:true,slots:[]};

/* ----- Sur l'eau : ramer, rester dans le lac, flotter ----- */
function inBoat(){const r=RV();return !!(r&&r.spec.boat);}
function boatOK(x,z,th,v){
  for(const c of vehCircles(v,x,z,th)){
    if(waterDepth(c[0],c[1])<0.3)return false;
    if(c[0]>DOCK.x0-c[2]&&c[0]<DOCK.x1+c[2]&&c[1]>DOCK.z0-c[2]&&c[1]<DOCK.z1+c[2])return false;
  }
  return !vehicles.some(o=>o!==v&&o.spec.boat&&Math.hypot(o.x-x,o.z-z)<2.4);
}
function updateBoat(v,dt){
  const sp=v.spec,driving=S.mode==='vtt'&&V===v;
  let thr=0,turn=0;
  if(driving){
    const inp=readInput(false);turn=-inp.x;
    thr=clamp(((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)+(pedal.gas?1:0)-(pedal.brake?1:0),-1,1);
    if(P.fishing&&(thr||turn))stopFishing(true);
  }
  if(driving||!v.net){
    v.v+=thr*sp.acc*dt;v.v*=Math.exp(-0.9*dt);v.v=clamp(v.v,-sp.maxR,sp.maxF);
    const yaw=turn*0.9*dt*(0.4+Math.min(1,Math.abs(v.v)));
    const nth=v.th+yaw,nx=v.x+Math.sin(nth)*v.v*dt,nz=v.z+Math.cos(nth)*v.v*dt;
    if(boatOK(nx,nz,nth,v)){v.x=nx;v.z=nz;v.th=nth;}else{v.v*=-0.2;if(boatOK(v.x,v.z,nth,v))v.th=nth;}
  }
  const pr=Math.floor((v.row||0)/Math.PI);
  v.row=(v.row||0)+dt*((driving?Math.abs(thr)+Math.abs(turn)*0.6:(v.net?Math.min(1,Math.abs(v.net.sp||0)):0))*6);
  if(Math.floor(v.row/Math.PI)!==pr)sfxSplash(v.x,v.z,0.12);
  const m=v.mesh,bob=Math.sin(S.time*1.3+v.x)*0.03;
  m.g.position.set(v.x,LAKE_Y-0.14+bob,v.z);
  m.g.rotation.set(Math.sin(S.time*1.1+v.z)*0.025,v.th,Math.sin(S.time*0.9)*0.03-turn*0.04);
  // Coups de rames
  const rowing=driving?(thr||turn):(v.net&&Math.abs(v.net.sp||0)>0.1);
  m.oars.forEach((o,i)=>{const s=i?1:-1;if(rowing){o.rotation.y=s*Math.sin(v.row)*0.55;o.rotation.z=s*(0.15+Math.max(0,Math.cos(v.row))*0.2);}else{o.rotation.y*=0.9;o.rotation.z=s*0.2;}});
  if(driving){P.x=v.x;P.z=v.z;P.rot=v.th;if(rowing&&!P.fishing){player.armR.rotation.x=player.armL.rotation.x=-1.2+Math.sin(v.row)*0.5;}}
}

/* ----- Mettre à l'eau / remonter sur la remorque ----- */
function trailerRear(t){return {x:t.x-Math.sin(t.th)*2.2,z:t.z-Math.cos(t.th)*2.2};}
function launchSpot(t){
  const r=trailerRear(t);
  for(let d=0.5;d<=5;d+=0.5){const x=r.x-Math.sin(t.th)*d,z=r.z-Math.cos(t.th)*d;const th=t.th+Math.PI;
    if(waterDepth(x,z)>0.45&&boatOK(x,z,th,{spec:SPECS.chaloupe}))return {x,z,th};}
  return null;
}
function nearBoatTrailer(){let b=null,bd=3.2;trailers.forEach(t=>{if(!t.spec.boatTr)return;const r=trailerRear(t),d=Math.min(Math.hypot(P.x-r.x,P.z-r.z),Math.hypot(P.x-t.x,P.z-t.z));if(d<bd){bd=d;b=t;}});return b;}
function boatContext(){
  const t=nearBoatTrailer();if(!t)return null;
  if(t.boat){
    const s=launchSpot(t);
    return s?{act:{label:'🛶 Mettre la chaloupe à l\'eau',fn:()=>{t.boat=false;makeVehicle('chaloupe',s.x,s.z,s.th);sfxSplash(s.x,s.z,0.7);toast('La chaloupe est à l\'eau ! Approche-toi et embarque (E)');}}}
      :{info:'Recule la remorque jusqu\'au bord du lac pour mettre la chaloupe à l\'eau'};
  }
  const r=trailerRear(t),b=vehicles.find(v=>v.spec.boat&&!v.driver&&!v.passenger&&Math.hypot(v.x-r.x,v.z-r.z)<6);
  return b?{act:{label:'🛶 Remonter la chaloupe sur la remorque',fn:()=>{removeVehicle(b);t.boat=true;sfxSplash(b.x,b.z,0.4);}}}:{info:'La remorque est vide : amène la chaloupe tout près pour la remonter'};
}
function removeVehicle(v){const i=vehicles.indexOf(v);if(i>=0)vehicles.splice(i,1);scene.remove(v.mesh.g);}
