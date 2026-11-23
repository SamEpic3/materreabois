/* Le monde : relief, chemins, rendu, terrain, collisions, camp, village, billots et forêt */
/* ---------- Monde ---------- */
const WORLD=80;
const CAMP={x:0,z:0,r:14};
const TRAILS=[
  [[0,0],[8,-14],[22,-28],[30,-46],[18,-62]],
  [[8,-14],[-12,-30],[-32,-42],[-46,-30]],
  [[22,-28],[44,-24],[58,-6]],
  [[0,0],[-4,12],[-20,26],[-36,38],[-44,41]]
];
const MUD=[{x:22,z:-28,r:4.5},{x:-20,z:-35,r:4},{x:38,z:-25.5,r:3.6},{x:29,z:-42,r:3.2}];
const PILE_DEF=[{x:18,z:-65},{x:-49,z:-28},{x:60,z:-3}];
const YARD={x:8,z:6,r:4.5};
const CABIN={x:-7,z:2};
const VILLAGE={x:-50,z:46,r:13};
const CAP=6;

const SEGS=[];
TRAILS.forEach(tr=>{for(let i=0;i<tr.length-1;i++)SEGS.push([tr[i][0],tr[i][1],tr[i+1][0],tr[i+1][1]]);});
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;let t=l2?((px-ax)*dx+(pz-az)*dz)/l2:0;t=clamp(t,0,1);return Math.hypot(px-(ax+t*dx),pz-(az+t*dz));}
function trailDist(x,z){let m=1e9;for(const s of SEGS){const d=segDist(x,z,s[0],s[1],s[2],s[3]);if(d<m)m=d;}return m;}
function mudAt(x,z){let m=0;for(const p of MUD){m=Math.max(m,smoothstep(p.r,p.r*0.55,Math.hypot(x-p.x,z-p.z)));}return m;}
function baseH(x,z){return 1.7*Math.sin(x*0.045+0.5)*Math.cos(z*0.038)+0.8*Math.sin(x*0.1+1.3)*Math.sin(z*0.085+0.7);}
function detailH(x,z){return 0.32*Math.sin(x*0.33)*Math.cos(z*0.29)+0.15*Math.sin(x*0.7+z*0.5);}
const CAMP_H=baseH(CAMP.x,CAMP.z),VIL_H=baseH(VILLAGE.x,VILLAGE.z);
function H(x,z){
  let h=baseH(x,z);
  const tc=smoothstep(CAMP.r+8,CAMP.r,Math.hypot(x-CAMP.x,z-CAMP.z));
  const tt=smoothstep(4,1.8,trailDist(x,z));
  const tv=smoothstep(VILLAGE.r+8,VILLAGE.r,Math.hypot(x-VILLAGE.x,z-VILLAGE.z));
  h+=detailH(x,z)*(1-Math.max(tc,tt,tv));
  h=lerp(h,CAMP_H,tc);h=lerp(h,VIL_H,tv);
  h-=0.18*mudAt(x,z);
  return h;
}

/* ---------- Rendu ---------- */
const canvas=$('c');
const renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(viewW(),viewH());
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();
scene.background=new T.Color(0xc9d6dc);

let zoom=isTouch?11:14;const ZMIN=6,ZMAX=32;
const camera=new T.OrthographicCamera(-1,1,1,-1,1,500);
const pcam=new T.PerspectiveCamera(60,viewW()/viewH(),0.1,400);
let camMode='iso',activeCam=camera,camYaw=0,camYawT=0,chaseDist=1,camPitch=-0.1;
function updateProj(){const a=viewW()/viewH();camera.left=-zoom*a;camera.right=zoom*a;camera.top=zoom;camera.bottom=-zoom;camera.updateProjectionMatrix();pcam.aspect=a;pcam.updateProjectionMatrix();}
updateProj();

scene.add(new T.HemisphereLight(0xe4ecf2,0x4a4030,0.75));
const sun=new T.DirectionalLight(0xfff0d4,0.85);
sun.castShadow=true;
const SM=isTouch?1024:2048;
sun.shadow.mapSize.set(SM,SM);
Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:150});
sun.shadow.bias=-0.0006;sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);scene.add(sun.target);

function mat(c){return new T.MeshPhongMaterial({color:c,flatShading:true,shininess:4});}
function box(w,h,d,m,x,y,z,parent){const me=new T.Mesh(new T.BoxGeometry(w,h,d),m);me.position.set(x,y,z);if(parent)parent.add(me);return me;}
function shadows(o){o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});}

/* ---------- Terrain ---------- */
function tileTex(base,draw,seed){
  const N=256,cv=document.createElement('canvas');cv.width=cv.height=N;const c=cv.getContext('2d');
  c.fillStyle=base;c.fillRect(0,0,N,N);const r=mulberry32(seed);
  draw(c,r,(fn)=>{for(const ox of [-N,0,N])for(const oy of [-N,0,N]){c.save();c.translate(ox,oy);fn();c.restore();}},N);
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const grassTex=tileTex('#6c7337',(c,r,wrap,N)=>{
  for(let k=0;k<1400;k++){const x=r()*N,y=r()*N,w=3+r()*5,h=3+r()*5,col=pick(r,['#5f6830','#7a7f40','#66702f','#83813f']);wrap(()=>{c.fillStyle=col;c.globalAlpha=0.5;c.fillRect(x,y,w,h);});}
  c.globalAlpha=1;c.lineCap='round';
  for(let k=0;k<3200;k++){
    const x=r()*N,y=r()*N,a=r()*Math.PI*2,l=3+r()*7,col=pick(r,['#4e5a26','#7d8842','#9a8c4b','#5b6a2c','#b0a060','#3f4a1f']),w=0.8+r()*1.2;
    wrap(()=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();});
  }
  for(let k=0;k<70;k++){
    const x=r()*N,y=r()*N,a=r()*Math.PI,col=pick(r,['#b5452a','#c9682b','#d28a2f','#9c3b25','#d8b23a','#8a5a2a']),rx=2.5+r()*2.5;
    wrap(()=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,rx*0.6,a,0,Math.PI*2);c.fill();});
  }
},11);
const dirtTex=tileTex('#86674a',(c,r,wrap,N)=>{
  for(let k=0;k<900;k++){const x=r()*N,y=r()*N,s=4+r()*14,col=pick(r,['#7a5c40','#93734f','#6f5339','#9a7a55']);wrap(()=>{c.fillStyle=col;c.globalAlpha=0.35;c.beginPath();c.arc(x,y,s,0,Math.PI*2);c.fill();});}
  c.globalAlpha=1;
  for(let k=0;k<4000;k++){c.fillStyle=pick(r,['#5e4630','#a5875f','#715640','#b39a72']);c.fillRect(r()*N,r()*N,1+r()*1.5,1+r()*1.5);}
  for(let k=0;k<140;k++){
    const x=r()*N,y=r()*N,rx=1.5+r()*3.5,ry=rx*(0.6+r()*0.4),a=r()*Math.PI,col=pick(r,['#9b927f','#7d756a','#a89c84','#6a5e50']);
    wrap(()=>{c.fillStyle='rgba(40,28,18,.45)';c.beginPath();c.ellipse(x+0.8,y+0.8,rx,ry,a,0,Math.PI*2);c.fill();c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,a,0,Math.PI*2);c.fill();});
  }
},23);
{
  const SIZE=WORLD*2,SEG=SIZE*1.5,TILE=4;
  const g=new T.PlaneGeometry(SIZE,SIZE,SEG,SEG);g.rotateX(-Math.PI/2);
  const pos=g.attributes.position,cols=new Float32Array(pos.count*3),dirt=new Float32Array(pos.count);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    pos.setY(i,H(x,z));
    const n=0.5+0.5*Math.sin(x*0.21+Math.cos(z*0.17)*2)*Math.cos(z*0.13);
    const dc=Math.hypot(x-CAMP.x,z-CAMP.z),campF=smoothstep(CAMP.r+3,CAMP.r-3,dc);
    const mud=mudAt(x,z),tr=smoothstep(2.9,1.6,trailDist(x,z));
    const vilF=smoothstep(VILLAGE.r+2,VILLAGE.r-4,Math.hypot(x-VILLAGE.x,z-VILLAGE.z));
    const patch=Math.max(campF,vilF)*(0.38+0.25*Math.sin(x*0.55+1.7)*Math.cos(z*0.47));
    dirt[i]=Math.max(tr,mud,patch);
    let r=0.88+0.22*n,gg=0.88+0.2*n,b=0.86+0.18*n;
    r*=1+0.06*campF;b*=1-0.08*campF;
    r=lerp(r,0.55,mud);gg=lerp(gg,0.48,mud);b=lerp(b,0.42,mud);
    cols[i*3]=r;cols[i*3+1]=gg;cols[i*3+2]=b;
  }
  g.setAttribute('color',new T.BufferAttribute(cols,3));
  g.setAttribute('aDirt',new T.BufferAttribute(dirt,1));
  g.computeVertexNormals();
  grassTex.repeat.set(SIZE/TILE,SIZE/TILE);
  dirtTex.repeat.set(SIZE/TILE,SIZE/TILE);
  const tm=new T.MeshLambertMaterial({vertexColors:true,map:grassTex});
  tm.onBeforeCompile=sh=>{
    sh.uniforms.tDirt={value:dirtTex};
    sh.vertexShader='attribute float aDirt;\nvarying float vDirt;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vDirt=aDirt;');
    sh.fragmentShader='uniform sampler2D tDirt;\nvarying float vDirt;\n'+sh.fragmentShader.replace('#include <map_fragment>',
      'vec4 tg=texture2D(map,vUv);vec4 td=texture2D(tDirt,vUv*1.3);\n  float m=smoothstep(0.42,0.58,vDirt+(tg.g-0.42)*0.55);\n  diffuseColor*=mix(tg,td,m);');
  };
  var terrain=new T.Mesh(g,tm);
  terrain.receiveShadow=true;scene.add(terrain);
}

/* ---------- Collisions (grille) ---------- */
const CELL=5,grid=new Map();
const gk=(ix,iz)=>ix*1000+iz;
function addCol(x,z,r){const c={x,z,r},k=gk(Math.floor(x/CELL),Math.floor(z/CELL));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(c);return c;}
function eachNear(x,z,fn){const ix=Math.floor(x/CELL),iz=Math.floor(z/CELL);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const arr=grid.get(gk(ix+a,iz+b));if(arr)for(const c of arr)if(fn(c))return true;}return false;}
function hits(x,z,r){return eachNear(x,z,c=>{const dx=x-c.x,dz=z-c.z,rr=r+c.r;return dx*dx+dz*dz<rr*rr;});}
function pushCircle(p,r,cx,cz,cr){const dx=p.x-cx,dz=p.z-cz,rr=r+cr,d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);p.x=cx+dx/d*rr;p.z=cz+dz/d*rr;}}
function pushOut(p,r){eachNear(p.x,p.z,c=>{pushCircle(p,r,c.x,c.z,c.r);return false;});}

/* ---------- Camp : cabane, cour à bois, souches ---------- */
{
  const g=new T.Group();
  const plank=mat(0x7a5232),dark=mat(0x4d3220),roof=mat(0x5a2a22),win=new T.MeshBasicMaterial({color:0xf4d27a});
  box(6,2.6,4.5,plank,0,1.3,0,g);
  const r1=box(6.6,0.18,2.9,roof,0,3.15,1.05,g);r1.rotation.x=0.62;
  const r2=box(6.6,0.18,2.9,roof,0,3.15,-1.05,g);r2.rotation.x=-0.62;
  box(0.9,1.7,0.08,dark,1.2,0.85,2.27,g);            // porte
  box(0.9,0.7,0.08,win,-1.4,1.5,2.27,g);              // fenêtre
  box(0.5,1.4,0.5,mat(0x6d6a66),2.1,3.4,-0.8,g);      // cheminée
  box(6.2,0.15,1.4,dark,0,0.08,2.95,g);               // galerie
  g.position.set(CABIN.x,CAMP_H,CABIN.z);
  shadows(g);scene.add(g);
  [[-1.6,-1.1],[1.6,-1.1],[-1.6,1.1],[1.6,1.1]].forEach(([a,b])=>addCol(CABIN.x+a,CABIN.z+b,1.55));
}
// Cour à bois : anneau au sol
// Anneau posé au sol qui suit le relief
function groundRing(cx,cz,r0,r1,seg,color,opacity){
  const g=new T.RingGeometry(r0,r1,seg,1);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i)+cx,z=p.getZ(i)+cz;p.setXYZ(i,x,H(x,z)+0.1,z);}
  const m=new T.Mesh(g,new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false}));
  m.renderOrder=5;scene.add(m);return m;
}
const yardRing=groundRing(YARD.x,YARD.z,YARD.r-0.35,YARD.r,48,0xffd27a,0.55);
const yardStack=new T.Group();yardStack.position.set(YARD.x+5.6,CAMP_H,YARD.z-1);yardStack.rotation.y=0.2;scene.add(yardStack);
addCol(YARD.x+5.6,YARD.z-1,1.5);addCol(YARD.x+5.6,YARD.z+1.8,1.5);

/* ---------- Étiquettes ---------- */
const labels=[];
function label(text,x,y,z,range){
  const cv=document.createElement('canvas');cv.width=512;cv.height=96;const ctx=cv.getContext('2d');
  ctx.font='bold 52px system-ui,sans-serif';const w=ctx.measureText(text).width+48;
  ctx.fillStyle='rgba(30,28,22,0.75)';const x0=(512-w)/2;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x0,8,w,80,24);else ctx.rect(x0,8,w,80);ctx.fill();
  ctx.fillStyle='#ffe7b0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,50);
  const tex=new T.CanvasTexture(cv);
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  s.scale.set(6,1.125,1);s.position.set(x,y,z);s.renderOrder=20;scene.add(s);
  s.userData.range=range||10;s.visible=false;labels.push(s);return s;
}
// Les étiquettes n'apparaissent que lorsqu'on s'approche (fondu sur 3 m).
function updateLabels(fx,fz){
  labels.forEach(s=>{const d=Math.hypot(s.position.x-fx,s.position.z-fz),o=clamp((s.userData.range+3-d)/3,0,1);s.visible=o>0.01;s.material.opacity=o;});
}
label('Camp',CABIN.x,CAMP_H+5.4,CABIN.z,14);
/* ---------- Village ---------- */
const VROT=Math.atan2(CAMP.x-VILLAGE.x,CAMP.z-VILLAGE.z);
const VF={x:Math.sin(VROT),z:Math.cos(VROT)},VR={x:Math.cos(VROT),z:-Math.sin(VROT)};
function vpos(lx,lz){return {x:VILLAGE.x+VR.x*lx+VF.x*lz,z:VILLAGE.z+VR.z*lx+VF.z*lz};}
function bldCols(lx,lz,hw,hd){for(let a=-hw+1.4;a<=hw-1.39;a+=Math.max(0.01,(2*hw-2.8)/Math.max(1,Math.round((2*hw-2.8)/2.4))))for(let b=-hd+1.4;b<=hd-1.39;b+=Math.max(0.01,(2*hd-2.8)/Math.max(1,Math.round((2*hd-2.8)/2.4)))){const p=vpos(lx+a,lz+b);addCol(p.x,p.z,1.55);}}
function gableRoof(g,w,d,y,m){const r1=box(w+0.6,0.18,d/2+0.5,m,0,y,d/4+0.1,g);r1.rotation.x=0.62;const r2=box(w+0.6,0.18,d/2+0.5,m,0,y,-d/4-0.1,g);r2.rotation.x=-0.62;}
let STORE_DOOR;
{
  // Magasin général
  const g=new T.Group(),cream=mat(0xe8e0cc),red=mat(0x8e2b22),green=mat(0x2f5a3a),dark=mat(0x3b2a1e),win=new T.MeshBasicMaterial({color:0xf4d27a}),wood=mat(0x7a5232);
  box(8,3.6,6,cream,0,1.8,0,g);gableRoof(g,8,6,4.05,red);
  box(8.2,1.6,0.2,cream,0,4.2,3.05,g);box(5.4,0.8,0.08,green,0,4.25,3.18,g);
  box(1.3,2.2,0.08,dark,0,1.1,3.04,g);box(1.6,1.0,0.08,win,-2.6,1.8,3.04,g);box(1.6,1.0,0.08,win,2.6,1.8,3.04,g);
  box(8.6,0.15,1.8,wood,0,0.08,3.9,g);box(0.15,2.9,0.15,wood,-4.1,1.5,4.7,g);box(0.15,2.9,0.15,wood,4.1,1.5,4.7,g);box(8.6,0.12,1.9,red,0,3.0,3.95,g);
  const p=vpos(0,-3);g.position.set(p.x,VIL_H,p.z);g.rotation.y=VROT;shadows(g);scene.add(g);bldCols(0,-3,4,3);
  STORE_DOOR=vpos(0,1.9);
  label('Magasin général',p.x,VIL_H+6.6,p.z);
  // Église
  const c=new T.Group(),white=mat(0xf1eee6),grey=mat(0x5b5f63),silver=mat(0xc7ccd0);
  box(5,4,8,white,0,2,0,c);
  const rr1=box(3.2,0.18,8.4,grey,1.25,4.85,0,c);rr1.rotation.z=-0.62;const rr2=box(3.2,0.18,8.4,grey,-1.25,4.85,0,c);rr2.rotation.z=0.62;
  box(1.8,3.2,1.8,white,0,5.4,3.2,c);
  const sp=new T.Mesh(new T.ConeGeometry(1.2,3.4,4),silver);sp.position.set(0,8.7,3.2);sp.rotation.y=Math.PI/4;c.add(sp);
  box(1.2,2.2,0.08,dark,0,1.1,4.04,c);
  const pc=vpos(12,-5);c.position.set(pc.x,VIL_H,pc.z);c.rotation.y=VROT;shadows(c);scene.add(c);bldCols(12,-5,2.5,4);
  // Maisons
  [[-12,-3,0x9b3b2c,0x3b3f44],[-10,-10,0x4f6f8f,0x2e2a26]].forEach(([lx,lz,wc,rc])=>{
    const h=new T.Group();box(5,2.8,4.5,mat(wc),0,1.4,0,h);gableRoof(h,5,4.5,3.15,mat(rc));
    box(1,1.9,0.08,dark,0,0.95,2.27,h);box(1,0.8,0.08,win,1.5,1.5,2.27,h);box(1,0.8,0.08,win,-1.5,1.5,2.27,h);
    const q=vpos(lx,lz);h.position.set(q.x,VIL_H,q.z);h.rotation.y=VROT;shadows(h);scene.add(h);bldCols(lx,lz,2.5,2.25);
  });
  label('Village',VILLAGE.x,VIL_H+10,VILLAGE.z,26);
}
label('Cour à bois',YARD.x,CAMP_H+3.2,YARD.z);

/* ---------- Billots ---------- */
const barkM=mat(0x5e4630),endM=mat(0xd9b27c);
const LOG_LEN=2.44; // 8 pieds
const logGeoX=new T.CylinderGeometry(0.22,0.24,LOG_LEN,8);logGeoX.rotateZ(Math.PI/2);
const logGeoZ=new T.CylinderGeometry(0.22,0.24,LOG_LEN,8);logGeoZ.rotateX(Math.PI/2);
const logMats=[barkM,endM,endM];
const PILE_SLOTS=[[-0.46,0.22],[0,0.22],[0.46,0.22],[-0.23,0.6],[0.23,0.6],[0,0.98]];
function makeLog(geo){const m=new T.Mesh(geo,logMats);m.castShadow=true;m.receiveShadow=true;return m;}

const piles=[];

const stumpList=[];   // souches qu'on peut arracher à la pelle
/* ---------- Forêt ---------- */
const SPECIES={epinette:{n:'Épinette',p:30},sapin:{n:'Sapin',p:25},erable:{n:'Érable',p:45},bouleau:{n:'Bouleau',p:35}};
const treeList=[];
for(let k=0;k<5200&&treeList.length<900;k++){
  const x=(rnd()*2-1)*(WORLD-1),z=(rnd()*2-1)*(WORLD-1);
  const dc=Math.hypot(x-CAMP.x,z-CAMP.z);
  if(dc<CAMP.r+1.5)continue;
  if(Math.hypot(x-VILLAGE.x,z-VILLAGE.z)<VILLAGE.r+4)continue;
  if(trailDist(x,z)<3.4)continue;
  if(Math.hypot(x-YARD.x,z-YARD.z)<9)continue;
  const p=0.1+0.85*smoothstep(CAMP.r+2,CAMP.r+28,dc);
  if(rnd()>p)continue;
  if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<2.3))continue;
  const r=rnd();
  const type=r<0.33?'epinette':r<0.52?'sapin':r<0.82?'erable':'bouleau';
  const s=0.8+rnd()*0.5;
  const t={x,z,y:H(x,z),type,s,rot:rnd()*6.28,alive:true,work:0,base:Math.round(5+s*5)};
  t.col=addCol(x,z,0.32*s);t.col.tree=t;
  treeList.push(t);
}
const TREE_GEO={
  trunk:(()=>{const g=new T.CylinderGeometry(0.2,0.28,1,6);g.translate(0,0.5,0);return g;})(),
  cone:(()=>{const g=new T.ConeGeometry(1,1,7);g.translate(0,0.5,0);return g;})(),
  blob:new T.IcosahedronGeometry(1,0)
};
const TREE_INST={};
const ZERO_M=new T.Matrix4().makeScale(0,0,0);
{
  const maple=[0xb5452a,0xc9682b,0xd28a2f,0x9c3b25,0xa8532a],birch=[0xd8b23a,0xc9a83a,0xbfa045];
  treeList.forEach(t=>{
    const s=t.s,parts=[];t.parts=parts;
    const add=(g,dx,dy,dz,sx,sy,sz,rot,c)=>parts.push({g,dx,dy,dz,sx,sy,sz,rot,c});
    if(t.type==='epinette'||t.type==='sapin'){
      const sap=t.type==='sapin',w=sap?0.8:1,hh=sap?1.15:1;
      add('trunk',0,0,0,s,1.3*s,s,t.rot,0x5b4330);
      add('cone',0,0.9*s,0,1.55*s*w,3.0*s*hh,1.55*s*w,t.rot,sap?0x27412f:0x2f4a2c);
      add('cone',0,2.7*s*hh,0,1.05*s*w,2.7*s*hh,1.05*s*w,t.rot+0.5,sap?0x2c4a35:0x36553a);
    }else{
      const er=t.type==='erable',pal=er?maple:birch,top=er?2.8:3.0;
      if(er)add('trunk',0,0,0,1.1*s,2.8*s,1.1*s,t.rot,0x5b4330);else add('trunk',0,0,0,0.85*s,3.0*s,0.85*s,t.rot,0xe8e4da);
      add('blob',0,(top+0.9)*s,0,1.8*s,1.5*s,1.8*s,t.rot,pal[Math.floor(rnd()*pal.length)]);
      const a=rnd()*6.28;
      add('blob',Math.cos(a)*0.6*s,(top+1.8)*s,Math.sin(a)*0.6*s,1.2*s,1.1*s,1.2*s,t.rot+1,pal[Math.floor(rnd()*pal.length)]);
    }
  });
  const counts={trunk:0,cone:0,blob:0};
  treeList.forEach(t=>t.parts.forEach(pp=>{pp.idx=counts[pp.g]++;}));
  var ph=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:3});
  var m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3(),UP=new T.Vector3(0,1,0),col=new T.Color();
  var put=function(mesh,i,x,y,z,sx,sy,sz,rot,c){q.setFromAxisAngle(UP,rot);m4.compose(p.set(x,y,z),q,sc.set(sx,sy,sz));mesh.setMatrixAt(i,m4);mesh.setColorAt(i,col.set(c));};
  for(const k in counts)TREE_INST[k]=new T.InstancedMesh(TREE_GEO[k],ph,counts[k]);
  treeList.forEach(t=>t.parts.forEach(pp=>put(TREE_INST[pp.g],pp.idx,t.x+pp.dx,t.y+pp.dy,t.z+pp.dz,pp.sx,pp.sy,pp.sz,pp.rot,pp.c)));
  Object.values(TREE_INST).forEach(m=>{m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m);});

  // Roches
  const rocks=[];
  for(let k=0;k<400&&rocks.length<55;k++){
    const x=(rnd()*2-1)*(WORLD-2),z=(rnd()*2-1)*(WORLD-2);
    if(Math.hypot(x,z)<CAMP.r+3||trailDist(x,z)<3.5||Math.hypot(x-VILLAGE.x,z-VILLAGE.z)<VILLAGE.r+3)continue;
    if(PILE_DEF.some(pp=>Math.hypot(x-pp.x,z-pp.z)<6))continue;
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<2))continue;
    const s=0.4+rnd()*0.6;addCol(x,z,0.85*s);rocks.push({x,z,s});
  }
  const rockM=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),ph,rocks.length);
  rocks.forEach((r,i)=>{q.setFromEuler(new T.Euler(rnd(),rnd()*6,rnd()));m4.compose(p.set(r.x,H(r.x,r.z)+0.1*r.s,r.z),q,sc.set(r.s,r.s*0.7,r.s));rockM.setMatrixAt(i,m4);rockM.setColorAt(i,col.set(rnd()<0.5?0x8a8780:0x76736c));});
  rockM.castShadow=true;rockM.receiveShadow=true;scene.add(rockM);

  // Souches autour du camp (on a déjà bûché ici)
  const stumpG=new T.CylinderGeometry(0.32,0.4,0.5,7);stumpG.translate(0,0.25,0);
  const stumps=[];
  for(let k=0;k<200&&stumps.length<16;k++){
    const a=rnd()*6.28,d=CAMP.r-1+rnd()*9,x=CAMP.x+Math.cos(a)*d,z=CAMP.z+Math.sin(a)*d;
    if(trailDist(x,z)<3||Math.hypot(x-YARD.x,z-YARD.z)<8||Math.hypot(x-CABIN.x,z-CABIN.z)<5)continue;
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<1.8))continue;
    const c=addCol(x,z,0.4);stumps.push({x,z,c});
  }
  const stM=new T.InstancedMesh(stumpG,ph,stumps.length);
  stumps.forEach((s,i)=>put(stM,i,s.x,H(s.x,s.z)-0.05,s.z,1,0.8+rnd()*0.6,1,rnd()*6,0x6b5036));
  stumps.forEach((s,i)=>stumpList.push({x:s.x,z:s.z,col:s.c,inst:stM,idx:i,size:1,work:0}));
  stM.castShadow=true;stM.receiveShadow=true;scene.add(stM);
}
