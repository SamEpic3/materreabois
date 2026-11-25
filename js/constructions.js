/* Constructions placées librement : feu de camp, abri à bois, bouilloire à sirop, barbecue.
   On peut en avoir plusieurs, les déplacer et les démolir (à partir de « Projets du camp », à la porte de la cabane). */
S.builds=[];                       // {k, x, z, rot, ...état propre au type}
const CAMPFIRE_MAX=900;
// Abri à bois : deux rangées (2 cordes de 3 pi de profond), 8 bûches de large, 5 rangs de haut
const SHED_ROWS=2,SHED_COLS=8,SHED_LAYERS=5,SHED_CAP=SHED_ROWS*SHED_COLS*SHED_LAYERS,SHED_MAXLEN=3*FT+INCH;
const BBQ_TIME=300;

/* ----- Modèles ----- */
function flameGroup(){
  const fl=new T.Group(),fm=[0xff7a1a,0xffb02e,0xffd35a];
  for(let i=0;i<5;i++){const c=new T.Mesh(new T.ConeGeometry(0.16+0.05*(i%2),0.6,6),new T.MeshBasicMaterial({color:fm[i%3]}));c.position.set((i-2)*0.13,0.35,(i%2?0.12:-0.1));fl.add(c);}
  fl.visible=false;return fl;
}
const BENCH_A=[0.4,2.5,4.6];
function makeFeuModel(){
  const g=new T.Group(),bark=logMatsFor('epinette');
  g.add(new T.Mesh(stoneRing(13,0.78,0.2,3),STONE_M));
  g.add(new T.Mesh(new T.CylinderGeometry(0.62,0.66,0.04,16).translate(0,0.02,0),mat(0x2a2522)));
  // Bûches couchées et croisées au centre, comme avant
  g.add(new T.Mesh(mergeGeos([0.6,-0.6,2].map((r,k)=>new T.CylinderGeometry(0.07,0.07,0.8,8).rotateZ(Math.PI/2).rotateY(r).translate(0,0.1+k*0.02,0))),bark));
  // Bancs : billots couchés
  BENCH_A.forEach(a=>{
    const b=new T.Group(),log=new T.Mesh(new T.CylinderGeometry(0.22,0.24,1.5,11),bark);log.rotation.z=Math.PI/2;log.position.y=0.22;b.add(log);
    b.position.set(Math.cos(a)*2.3,0,Math.sin(a)*2.3);b.rotation.y=-a+Math.PI/2;g.add(b);
  });
  return bakeStatic(g);
}
function makeAbriModel(){
  const g=new T.Group(),post=new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3});
  const boards=texMat(sidingTex('#7a5232','#3e2a1a',true),14,1),dark=mat(0x4d3220);
  // Plancher en palettes
  const fl=[];for(let k=0;k<7;k++)fl.push(new T.BoxGeometry(3.4,0.05,0.28).translate(0,0.15,-1.05+k*0.35));fl.push(new T.BoxGeometry(3.3,0.12,0.12).translate(0,0.06,-0.9),new T.BoxGeometry(3.3,0.12,0.12).translate(0,0.06,0.9));
  g.add(new T.Mesh(mergeGeos(fl),mat(0x9a7a55)));
  // Poteaux ronds, fond et côtés en planches
  g.add(new T.Mesh(mergeGeos([[1.65,1.1,2.55],[-1.65,1.1,2.55],[1.65,-1.12,2.0],[-1.65,-1.12,2.0],[0,-1.12,2.0]].map(([x,z,h])=>new T.CylinderGeometry(0.07,0.08,h,8).translate(x,h/2,z))),post));
  g.add(new T.Mesh(new T.BoxGeometry(3.4,1.95,0.06).translate(0,1.05,-1.17),boards));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.06,1.95,2.3).translate(-1.72,1.05,0),new T.BoxGeometry(0.06,1.95,2.3).translate(1.72,1.05,0)]),texMat(sidingTex('#7a5232','#3e2a1a',true),10,1)));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(3.5,0.1,0.1).translate(0,2.5,1.1),new T.BoxGeometry(3.5,0.1,0.1).translate(0,2.0,-1.15)]),dark));
  // Toit de tôle incliné vers l'arrière
  const r=new T.Mesh(new T.BoxGeometry(3.9,0.06,2.8),texMat(tinTex(),12,1,{shininess:30}));r.position.set(0,2.3,0);r.rotation.x=-0.2;g.add(r);
  return bakeStatic(g);
}
function makeBbqModel(){
  const g=new T.Group(),blk=new T.MeshPhongMaterial({color:0x232323,shininess:40,specular:0x444444}),steel=new T.MeshPhongMaterial({color:0xb8bcc0,shininess:80,specular:0x888888}),wood=mat(0x8a6a44);
  // Chariot : pattes, tablette du bas, deux roues
  g.add(new T.Mesh(mergeGeos([[-0.4,-0.2],[0.4,-0.2],[-0.4,0.2],[0.4,0.2]].map(([x,z])=>new T.BoxGeometry(0.05,0.85,0.05).translate(x,0.43,z)).concat([new T.BoxGeometry(0.9,0.04,0.48).translate(0,0.3,0)])),blk));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.1,0.1,0.05,12).rotateZ(Math.PI/2).translate(0.44,0.1,-0.2),new T.CylinderGeometry(0.1,0.1,0.05,12).rotateZ(Math.PI/2).translate(-0.44,0.1,-0.2)]),mat(0x111111)));
  // Cuve et couvercle arrondi, poignée, thermomètre, boutons
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.88,0.3,0.5).translate(0,0.99,0),new T.BoxGeometry(0.88,0.12,0.06).translate(0,0.9,0.27)]),blk));
  const lid=new T.Mesh(new T.CylinderGeometry(0.25,0.25,0.88,16,1,false,0,Math.PI),blk);lid.rotation.z=Math.PI/2;lid.position.set(0,1.14,0);g.add(lid);
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.018,0.018,0.5,8).rotateZ(Math.PI/2).translate(0,1.34,0.3),new T.BoxGeometry(0.03,0.08,0.06).translate(0.22,1.31,0.28),new T.BoxGeometry(0.03,0.08,0.06).translate(-0.22,1.31,0.28),
    new T.CylinderGeometry(0.04,0.04,0.02,12).rotateX(Math.PI/2).translate(0,1.25,0.26)]),steel));
  g.add(new T.Mesh(mergeGeos([-0.25,0,0.25].map(x=>new T.CylinderGeometry(0.03,0.03,0.04,10).rotateX(Math.PI/2).translate(x,0.9,0.31))),steel));
  // Tablettes de côté en lattes
  g.add(new T.Mesh(mergeGeos([0.6,-0.6].flatMap(x=>[0,1,2,3].map(k=>new T.BoxGeometry(0.34,0.035,0.1).translate(x+(x>0?0.04:-0.04),1.0,-0.17+k*0.115)))),wood));
  // Bonbonne de propane
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.15,0.15,0.34,14).translate(0.2,0.5,0),new T.SphereGeometry(0.15,14,6,0,Math.PI*2,0,Math.PI/2).translate(0.2,0.67,0),new T.CylinderGeometry(0.09,0.09,0.08,10).translate(0.2,0.84,0)]),mat(0xe8e4da)));
  const glow=new T.Mesh(new T.BoxGeometry(0.7,0.04,0.02),new T.MeshBasicMaterial({color:0x3a2a20}));glow.position.set(0,0.87,0.27);g.add(glow);
  g.userData.glow=glow;return g;
}
// Passage du repère d'une construction au monde
function lw(b,lx,lz){const c=Math.cos(b.rot||0),s=Math.sin(b.rot||0);return {x:b.x+c*lx+s*lz,z:b.z-s*lx+c*lz};}
// Garage : grande porte ouverte à l'avant (+z), on y entre en véhicule. Déclin vertical rouge grange, toit de tôle.
const GAR_W=6.2,GAR_D=8,GAR_H=3.3;
function makeGarageModel(){
  const g=new T.Group(),W=GAR_W,D=GAR_D,Hh=GAR_H;
  const red=texMat(sidingTex('#7d2f26','#4f1c16',true),1,1),trim=mat(0xece6d8),dark=mat(0x2a2a2a);
  const wall=(w,h,d,x,y,z,rx)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d).translate(x,y,z),red.clone());m.material.map=red.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(rx,1);return m;};
  g.add(wall(W,Hh,0.15,0,Hh/2,-D/2,16),wall(0.15,Hh,D,W/2,Hh/2,0,20),wall(0.15,Hh,D,-W/2,Hh/2,0,20));
  g.add(new T.Mesh(mergeGeos([gable(W,D+0.15,Hh,1.35,W/2),gable(W,D+0.15,Hh,1.35,-W/2)]),texMat(sidingTex('#7d2f26','#4f1c16',true),1,1)));
  // Façade : linteau, poteaux et porte basculante relevée
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(W+0.1,0.4,0.18).translate(0,Hh-0.2,D/2),new T.BoxGeometry(0.28,Hh,0.2).translate(W/2-0.05,Hh/2,D/2),new T.BoxGeometry(0.28,Hh,0.2).translate(-W/2+0.05,Hh/2,D/2),
    new T.BoxGeometry(0.12,Hh,0.12).translate(W/2+0.02,Hh/2,-D/2),new T.BoxGeometry(0.12,Hh,0.12).translate(-W/2-0.02,Hh/2,-D/2)]),trim));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(W-0.6,0.06,2.6).translate(0,Hh-0.42,D/2-1.5),new T.BoxGeometry(0.05,0.05,3.2).translate(W/2-0.35,Hh-0.3,D/2-1.6),new T.BoxGeometry(0.05,0.05,3.2).translate(-W/2+0.35,Hh-0.3,D/2-1.6)]),mat(0xd8d2c4)));
  roofTex(g,W,D,4.05,texMat(tinTex(),18,1,{shininess:30}),0.35,0.55);
  // Fenêtres des côtés
  const wf=[],wg=[];[-1.6,1.6].forEach(z=>[1,-1].forEach(sd=>{const w=windowGeo(0.9,0.7,sd*(W/2+0.09),2.0,z,sd*Math.PI/2);wf.push(w.frame);wg.push(w.glass);}));
  g.add(new T.Mesh(mergeGeos(wf),trim),new T.Mesh(mergeGeos(wg),new T.MeshBasicMaterial({color:0x5c6e7a})));
  // Intérieur : établi avec outils au mur, baril d'huile, pneus, ampoule
  const wood=mat(0x9a7448);
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(2.6,0.08,0.7).translate(-1.4,0.92,-D/2+0.45),new T.BoxGeometry(2.5,0.06,0.6).translate(-1.4,0.3,-D/2+0.45),
    ...[[-2.6,-D/2+0.2],[-2.6,-D/2+0.72],[-0.2,-D/2+0.2],[-0.2,-D/2+0.72]].map(([x,z])=>new T.BoxGeometry(0.08,0.9,0.08).translate(x,0.45,z)),
    new T.BoxGeometry(2.6,1.2,0.04).translate(-1.4,1.75,-D/2+0.1)]),wood));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.05,0.5,0.03).translate(-2.2,1.85,-D/2+0.14),new T.BoxGeometry(0.22,0.08,0.03).translate(-2.2,2.1,-D/2+0.14),
    new T.BoxGeometry(0.04,0.4,0.03).rotateZ(0.3).translate(-1.7,1.8,-D/2+0.14),new T.TorusGeometry(0.18,0.025,5,12).translate(-1.0,1.85,-D/2+0.14),
    new T.BoxGeometry(0.45,0.25,0.3).translate(-0.7,1.08,-D/2+0.45),new T.CylinderGeometry(0.06,0.06,0.18,8).translate(-2.0,1.05,-D/2+0.4)]),mat(0x3d4247)));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.3,0.3,0.9,14).translate(2.45,0.45,-D/2+0.45),new T.TorusGeometry(0.29,0.02,4,14).rotateX(Math.PI/2).translate(2.45,0.3,-D/2+0.45),new T.TorusGeometry(0.29,0.02,4,14).rotateX(Math.PI/2).translate(2.45,0.62,-D/2+0.45)]),mat(0x2f5f8e)));
  g.add(new T.Mesh(mergeGeos([0,1,2].map(k=>new T.TorusGeometry(0.33,0.13,6,14).rotateX(Math.PI/2).translate(2.4,0.13+k*0.26,-D/2+1.5))),mat(0x1d1d1d)));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.01,0.01,0.6,4).translate(0,Hh+0.4,0),new T.ConeGeometry(0.22,0.14,10,1,true).translate(0,Hh+0.07,0)]),dark));
  const bulb=new T.Mesh(new T.SphereGeometry(0.07,8,6).translate(0,Hh,0),new T.MeshBasicMaterial({color:0xfff2c0}));g.add(bulb);
  return bakeStatic(g);
}
function createGarage(b,o){
  const g=makeGarageModel();o.add(g);
  // Plancher de béton qui épouse le terrain
  const nx=8,nz=10,gy=H(b.x,b.z),geo=new T.PlaneGeometry(GAR_W-0.15,GAR_D,nx,nz).rotateX(-Math.PI/2),pa=geo.attributes.position;
  for(let i=0;i<pa.count;i++){const p=lw(b,pa.getX(i),pa.getZ(i));pa.setY(i,H(p.x,p.z)-gy+0.035);}
  geo.computeVertexNormals();
  const fl=new T.Mesh(geo,texMat(canvasTex(64,64,(c,w,h)=>{c.fillStyle='#a3a097';c.fillRect(0,0,w,h);for(let i=0;i<220;i++){c.fillStyle=`rgba(${Math.random()<0.5?'60,60,55':'255,255,250'},0.12)`;c.fillRect(Math.random()*w,Math.random()*h,2,2);}c.fillStyle='rgba(40,40,36,0.5)';c.fillRect(0,h-1,w,1);}),3,4));
  fl.receiveShadow=true;g.add(fl);
  // Murs : une chaîne de petits cercles (on peut entrer par l'avant)
  for(let z=-GAR_D/2;z<=GAR_D/2+0.01;z+=0.55)[1,-1].forEach(sd=>{const p=lw(b,sd*GAR_W/2,z);o.col(p.x,p.z,0.28);});
  for(let x=-GAR_W/2+0.55;x<GAR_W/2-0.3;x+=0.55){const p=lw(b,x,-GAR_D/2);o.col(p.x,p.z,0.28);}
  [[-2.1,-GAR_D/2+0.45,0.4],[-0.8,-GAR_D/2+0.45,0.4],[2.45,-GAR_D/2+0.45,0.36],[2.4,-GAR_D/2+1.5,0.42]].forEach(([x,z,r])=>{const p=lw(b,x,z);o.col(p.x,p.z,r);});
}


/* ----- Création de chaque type ----- */
function createFeu(b,o){
  const g=makeFeuModel(),fl=flameGroup();g.add(fl);o.add(g);o.fl=fl;
  o.col(b.x,b.z,0.9);
  BENCH_A.forEach(a=>{const p=lw(b,Math.cos(a)*2.3,Math.sin(a)*2.3);o.col(p.x,p.z,0.35);o.seat(p.x,p.z,Math.atan2(b.x-p.x,b.z-p.z),0.45,null,'banc');});
}
function createAbri(b,o){
  const g=makeAbriModel(),stack=new T.Group();stack.position.set(0,0.12,0);g.add(stack);o.add(g);o.stack=stack;
  [-1.1,0,1.1].forEach(lx=>{const p=lw(b,lx,-0.35);o.col(p.x,p.z,0.75);});
  refreshShed(b);
}
function createBbq(b,o){const g=makeBbqModel();o.add(g);o.glow=g.userData.glow;o.col(b.x,b.z,0.7);}
// Bûches rangées le bout vers l'avant : rangée du fond d'abord, puis celle de devant.
function refreshShed(b){
  const o=b._o;if(!o)return;
  const st=o.stack;while(st.children.length)st.remove(st.children[0]);
  const perRow=SHED_COLS*SHED_LAYERS;
  b.logs.forEach((c,i)=>{
    const row=Math.floor(i/perRow),k=i%perRow,layer=Math.floor(k/SHED_COLS),col=k%SHED_COLS;
    const m=makePieceMesh(c);m.position.set((col-(SHED_COLS-1)/2)*0.4+(layer%2)*0.1,0.2+layer*0.36,row===0?-0.55:0.48);st.add(m);
  });
}
const KINDS={
  feu:{name:'Feu de camp',art:'le',price:250,icon:'🔥',dist:4.3,foot:[[0,0,2.7]],model:makeFeuModel,create:createFeu,init:()=>({fuel:0}),near:b=>b,nearR:2.2,
       desc:'Un rond de pierres et trois bûches pour s\'asseoir. On y fait brûler du bois de chauffage.'},
  abri:{name:'Abri à bois',art:'l\'',price:700,icon:'🪵',dist:3.3,foot:[[-0.9,0,1.3],[0.9,0,1.3]],model:makeAbriModel,create:createAbri,init:()=>({logs:[]}),near:b=>lw(b,0,2.1),nearR:1.9,
       desc:`Pour corder des bûches de chauffage de 3 pi maximum, sur deux cordes de profond (${SHED_CAP} bûches).`},
  sucres:{name:'Bouilloire à sirop',art:'la',price:400,icon:'🍁',dist:2.8,foot:[[0,0,1.3]],model:makeSucresModel,create:createSucres,init:()=>({fuel:0,sap:0,syrup:0}),near:b=>b,nearR:2.4,
       desc:'Un foyer avec une bouilloire pour faire bouillir l\'eau d\'érable en sirop.'},
  bbq:{name:'Barbecue',art:'le',price:600,icon:'🍖',dist:2.4,foot:[[0,0,1.0]],model:makeBbqModel,create:createBbq,init:()=>({lit:0}),near:b=>b,nearR:1.7,
       desc:'Un barbecue au propane. Il ne manque plus que la viande… la chasse s\'en vient !'},
  garage:{name:'Garage',art:'le',price:5000,icon:'🛠️',dist:7.5,foot:[[-1.6,-2.1,2.5],[1.6,-2.1,2.5],[-1.6,2.1,2.5],[1.6,2.1,2.5]],model:makeGarageModel,create:createGarage,init:()=>({}),near:b=>b,nearR:0,
       desc:'Un grand garage avec une porte à l\'avant pour rentrer le pick-up ou la débusqueuse à l\'abri, avec un établi au fond.'}
};
const KIND_IDS=['feu','abri','sucres','bbq','garage'];

/* ----- Apparition et retrait ----- */
function spawnBuild(b){
  const o={meshes:[],cols:[],seats:[],labels:[]};b._o=o;
  o.add=g=>{g.position.set(b.x,H(b.x,b.z),b.z);g.rotation.y=b.rot||0;shadows(g);scene.add(g);o.meshes.push(g);return g;};
  o.col=(x,z,r)=>{o.cols.push(addCol(x,z,r));};
  o.seat=(x,z,rot,y,grp,kind)=>{const s={x,z,rot,y,grp,kind};seats.push(s);o.seats.push(s);};
  o.label=(text,h)=>{o.labels.push(label(text,b.x,H(b.x,b.z)+h,b.z));};
  KINDS[b.k].create(b,o);
}
function despawnBuild(b){
  const o=b._o;if(!o)return;
  o.meshes.forEach(m=>scene.remove(m));o.cols.forEach(removeCol);
  o.seats.forEach(s=>{const i=seats.indexOf(s);if(i>=0)seats.splice(i,1);});
  o.labels.forEach(l=>{scene.remove(l);const i=labels.indexOf(l);if(i>=0)labels.splice(i,1);});
  delete b._o;
}
function addBuild(k,pos,state){
  const b=Object.assign({k,x:pos.x,z:pos.z,rot:pos.rot||0},KINDS[k].init(),state||{});b.id=b.id||uid();
  S.builds.push(b);spawnBuild(b);refreshCampDirt();return b;
}
function nearestBuild(k,maxD){
  let best=null,bd=maxD;
  S.builds.forEach(b=>{if(b.k!==k||!b._o)return;const p=KINDS[k].near(b),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;best=b;}});
  return best;
}
const buildNear=(k)=>nearestBuild(k,KINDS[k].nearR);

/* ----- Terre battue sous les feux de camp (le terrain d'origine revient quand le feu part) ----- */
let dirtAttr=null,dirtOrig=null,dirtTouched=[];
function refreshCampDirt(){
  if(!dirtAttr){dirtAttr=terrain.geometry.attributes.aDirt;dirtOrig=Float32Array.from(dirtAttr.array);}
  dirtTouched.forEach(i=>{dirtAttr.array[i]=dirtOrig[i];});dirtTouched=[];
  const fires=S.builds.filter(b=>b.k==='feu'&&b._o),pa=terrain.geometry.attributes.position;
  if(fires.length)for(let i=0;i<pa.count;i++){
    const x=pa.getX(i),z=pa.getZ(i);let v=0;
    for(const f of fires){const d=Math.hypot(x-f.x,z-f.z);if(d<3.4)v=Math.max(v,smoothstep(3.4,2.3,d));}
    if(v>0){dirtAttr.array[i]=Math.max(dirtOrig[i],v);dirtTouched.push(i);}
  }
  dirtAttr.needsUpdate=true;
}

/* ----- Modes « carte » : placer, choisir quoi déplacer ou démolir (vue isométrique, curseur libre) ----- */
let prevCam=null;
function enterMapMode(){prevCam=camMode;if(camMode!=='iso')applyCamMode('iso');for(const k in keys)keys[k]=false;P.target=null;marker.visible=false;updateToolVisual();}
function exitMapMode(){if(prevCam&&prevCam!==camMode)applyCamMode(prevCam);prevCam=null;S.mode='foot';updateToolVisual();}
function mapCursor(){return S.mode==='place'?P.placing:S.mode==='pick'?P.pick:null;}
function updateMapCursor(dt){
  const c=mapCursor();if(!c)return;
  const inp=readInput(true),sp=9;
  c.cx+=(camRight.x*inp.x+camFwd.x*inp.y)*sp*dt;c.cz+=(camRight.z*inp.x+camFwd.z*inp.y)*sp*dt;
  c.cx=clamp(c.cx,WB.x0+3,WB.x1-3);c.cz=clamp(c.cz,WB.z0+3,WB.z1-3);
}
// Glisser sur l'écran déplace la vue (et le curseur au centre)
function mapPan(dx,dy){
  const c=mapCursor();if(!c)return;const k=2*zoom/viewH();
  c.cx+=(-camRight.x*dx+camFwd.x*dy/Math.sin(ELEV))*k;c.cz+=(-camRight.z*dx+camFwd.z*dy/Math.sin(ELEV))*k;
}
function mapTap(x,z){const c=mapCursor();if(c){c.cx=x;c.cz=z;}}

const ghostOk=new T.MeshBasicMaterial({color:0x5fe07a,transparent:true,opacity:0.45,depthWrite:false});
const ghostBad=new T.MeshBasicMaterial({color:0xe05a4a,transparent:true,opacity:0.45,depthWrite:false});
function startPlace(k,moving){
  closeProjects();
  const g=KINDS[k].model();g.traverse(o=>{if(o.isMesh){o.material=ghostOk;o.castShadow=false;o.renderOrder=30;}});scene.add(g);
  const d=KINDS[k].dist;
  S.mode='place';
  P.placing={k,ghost:g,ok:false,why:'',moving:moving||null,
    rot:moving?moving.rot:wrapAng(P.rot+Math.PI),cx:moving?moving.x:P.x+Math.sin(P.rot)*d,cz:moving?moving.z:P.z+Math.cos(P.rot)*d};
  if(moving){despawnBuild(moving);refreshCampDirt();}
  enterMapMode();
}
function closePlace(){if(P.placing){scene.remove(P.placing.ghost);P.placing=null;}exitMapMode();}
function cancelPlace(){const m=P.placing&&P.placing.moving;if(m){spawnBuild(m);refreshCampDirt();}closePlace();toast(m?'Déplacement annulé':'Construction annulée');}
function placeProblem(k,pos,moving){
  const kd=KINDS[k];
  if(!moving&&S.money<kd.price)return `Il te manque ${kd.price-S.money} $`;
  const others=bodyCircles(null);
  for(const [lx,lz,r] of kd.foot){
    const c=lw(pos,lx,lz);
    if(outW(c.x,c.z,r+2))return 'Trop près du bout de la terre';
    if(waterDepth(c.x,c.z)>-0.15||onDock(c.x,c.z))return 'Pas dans l\'eau';
    if(Math.hypot(c.x-VILLAGE.x,c.z-VILLAGE.z)<VILLAGE.r+r||inSale(c.x,c.z))return 'Pas au village';
    if(Math.hypot(c.x-YARD.x,c.z-YARD.z)<YARD.r+r)return 'Pas dans la cour à bois';
    if(trailDist(c.x,c.z)<r*0.5+1.4)return 'Pas sur un chemin';
    if(others.some(o=>Math.hypot(o[0]-c.x,o[1]-c.z)<r+o[2]))return 'Un véhicule ou une remorque est dans le chemin';
    if(hits(c.x,c.z,r))return 'Il y a déjà quelque chose ici';
    if(pieces.some(pc=>{const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),d=clamp((c.x-b.x)*fx+(c.z-b.z)*fz,0,pc.len);return Math.hypot(c.x-(b.x+fx*d),c.z-(b.z+fz*d))<r;}))return 'Il y a du bois par terre';
    if(pails.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<r))return 'Il y a un seau par terre';
    if(Math.hypot(P.x-c.x,P.z-c.z)<r+0.3)return 'Ton bonhomme est dans le chemin';
    let lo=1e9,hi=-1e9;for(let q=0;q<8;q++){const a=q/8*Math.PI*2,h=H(c.x+Math.cos(a)*r,c.z+Math.sin(a)*r);lo=Math.min(lo,h);hi=Math.max(hi,h);}
    if(hi-lo>0.8)return 'Terrain trop en pente';
  }
  return '';
}
function rotatePlace(){if(P.placing)P.placing.rot=wrapAng(P.placing.rot+Math.PI/4);}
function confirmPlace(){
  const pl=P.placing;if(!pl)return;
  const pos={x:pl.cx,z:pl.cz,rot:pl.rot},why=placeProblem(pl.k,pos,pl.moving);if(why){toast(why);return;}
  const kd=KINDS[pl.k],m=pl.moving;
  pl.moving=null;closePlace();
  if(m){Object.assign(m,pos);spawnBuild(m);refreshCampDirt();J.move(kdName(m.k));toast(`${kd.icon} ${kd.name} : déplacé !`);}
  else{S.money-=kd.price;sfxCash();addBuild(pl.k,pos);J.build(kdName(pl.k));toast(`${kd.icon} ${kd.name} : c'est construit !`);}
}
function updatePlacement(){
  const pl=P.placing;if(!pl)return;
  const pos={x:pl.cx,z:pl.cz,rot:pl.rot};pl.why=placeProblem(pl.k,pos,pl.moving);pl.ok=!pl.why;
  pl.ghost.position.set(pos.x,H(pos.x,pos.z),pos.z);pl.ghost.rotation.y=pos.rot;
  const m=pl.ok?ghostOk:ghostBad;pl.ghost.traverse(o=>{if(o.isMesh)o.material=m;});
}
function placeContext(){
  const pl=P.placing,kd=KINDS[pl.k];
  return {enter:'Annuler',act:pl.ok?{label:pl.moving?'Déplacer ici':`Construire ici (${kd.price} $)`,fn:confirmPlace}:null,act2:{label:'Tourner',fn:rotatePlace},full:false,
    info:pl.why||`${kd.icon} ${kd.name} : déplace l'aperçu (WASD, flèches ou glisser), F ou R pour tourner`};
}
// Choisir une construction à déplacer ou à démolir
const pickRing=new T.Mesh(new T.RingGeometry(0.85,1,32),new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.9,side:T.DoubleSide,depthTest:false}));
pickRing.rotation.x=-Math.PI/2;pickRing.renderOrder=31;pickRing.visible=false;scene.add(pickRing);
const pickDot=new T.Mesh(new T.RingGeometry(0.12,0.25,16),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,side:T.DoubleSide,depthTest:false}));
pickDot.rotation.x=-Math.PI/2;pickDot.renderOrder=31;pickDot.visible=false;scene.add(pickDot);
function startPick(action){
  closeProjects();
  if(!S.builds.length){toast('Aucune construction à '+(action==='move'?'déplacer':'démolir'));return;}
  S.mode='pick';P.pick={action,cx:P.x,cz:P.z,sel:null};enterMapMode();
}
function closePick(){P.pick=null;pickRing.visible=pickDot.visible=false;exitMapMode();}
function footR(b){return KINDS[b.k].foot.reduce((m,f)=>Math.max(m,Math.hypot(f[0],f[1])+f[2]),0);}
function updatePick(){
  const pk=P.pick;if(!pk){pickRing.visible=pickDot.visible=false;return;}
  let best=null,bd=1e9;S.builds.forEach(b=>{const d=Math.hypot(pk.cx-b.x,pk.cz-b.z);if(d<footR(b)+0.5&&d<bd){bd=d;best=b;}});
  pk.sel=best;
  pickDot.visible=true;pickDot.position.set(pk.cx,H(pk.cx,pk.cz)+0.1,pk.cz);
  pickRing.visible=!!best;
  if(best){const r=footR(best);pickRing.scale.setScalar(r);pickRing.position.set(best.x,H(best.x,best.z)+0.12,best.z);pickRing.material.color.set(pk.action==='demolish'?0xe05a4a:0xffd27a);}
}
function kdName(k){const kd=KINDS[k];return (kd.art==='l\''?'un ':kd.art==='la'?'une ':'un ')+kd.name.toLowerCase();}
function refundOf(b){return Math.round(KINDS[b.k].price*0.5);}
let pendingDemo=null;
function demolish(b){
  if(b.k==='abri'&&b.logs.length){toast('Vide l\'abri avant de le démolir');return;}
  const kd=KINDS[b.k];
  if(!pendingDemo||pendingDemo.b!==b||S.time-pendingDemo.t>3){pendingDemo={b,t:S.time};toast(`Démolir ${kd.art}${kd.art.endsWith('\'')?'':' '}${kd.name.toLowerCase()} pour ${refundOf(b)} $ ? Appuie encore pour confirmer`);return;}
  pendingDemo=null;
  despawnBuild(b);S.builds.splice(S.builds.indexOf(b),1);refreshCampDirt();
  S.money+=refundOf(b);J.demo(kdName(b.k),refundOf(b));toast(`${kd.icon} ${kd.name} démoli : +${refundOf(b)} $`);
  if(!S.builds.length)closePick();
}
function pickContext(){
  const pk=P.pick,b=pk.sel;let act=null;
  if(b){
    const kd=KINDS[b.k];
    act=pk.action==='move'?{label:`Déplacer : ${kd.name}`,fn:()=>{closePick();startPlace(b.k,b);}}
                          :{label:`Démolir : ${kd.name} (+${refundOf(b)} $)`,fn:()=>demolish(b)};
  }
  return {enter:'Annuler',act,act2:null,full:false,info:b?'':`Touche ou clique la construction à ${pk.action==='move'?'déplacer':'démolir'} (WASD, flèches ou glisser pour bouger la vue)`};
}
