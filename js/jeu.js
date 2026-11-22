(function(){
if(!window.THREE){document.getElementById('err').style.display='flex';return;}
const T=THREE;
const $=id=>document.getElementById(id);
const isTouch=matchMedia('(pointer: coarse)').matches||('ontouchstart' in window);

/* ---------- Outils ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function smoothstep(e0,e1,x){const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);}
function wrapAng(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=mulberry32(1987);

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
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();
scene.background=new T.Color(0xc9d6dc);

let zoom=isTouch?11:14;const ZMIN=6,ZMAX=32;
const camera=new T.OrthographicCamera(-1,1,1,-1,1,500);
const pcam=new T.PerspectiveCamera(60,innerWidth/innerHeight,0.1,400);
let camMode='iso',activeCam=camera,camYaw=0,camYawT=0,chaseDist=1,camPitch=-0.1;
function updateProj(){const a=innerWidth/innerHeight;camera.left=-zoom*a;camera.right=zoom*a;camera.top=zoom;camera.bottom=-zoom;camera.updateProjectionMatrix();pcam.aspect=a;pcam.updateProjectionMatrix();}
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
const yardRing=new T.Mesh(new T.RingGeometry(YARD.r-0.35,YARD.r,40),new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.55,side:T.DoubleSide}));
yardRing.rotation.x=-Math.PI/2;yardRing.position.set(YARD.x,CAMP_H+0.05,YARD.z);scene.add(yardRing);
const yardStack=new T.Group();yardStack.position.set(YARD.x+5.6,CAMP_H,YARD.z-1);yardStack.rotation.y=0.2;scene.add(yardStack);
addCol(YARD.x+5.6,YARD.z-1,1.5);addCol(YARD.x+5.6,YARD.z+1.8,1.5);

/* ---------- Étiquettes ---------- */
function label(text,x,y,z){
  const cv=document.createElement('canvas');cv.width=512;cv.height=96;const ctx=cv.getContext('2d');
  ctx.font='bold 52px system-ui,sans-serif';const w=ctx.measureText(text).width+48;
  ctx.fillStyle='rgba(30,28,22,0.75)';const x0=(512-w)/2;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x0,8,w,80,24);else ctx.rect(x0,8,w,80);ctx.fill();
  ctx.fillStyle='#ffe7b0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,50);
  const tex=new T.CanvasTexture(cv);
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  s.scale.set(6,1.125,1);s.position.set(x,y,z);s.renderOrder=20;scene.add(s);return s;
}
label('Camp',CABIN.x,CAMP_H+5.4,CABIN.z);
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
  label('Village',VILLAGE.x,VIL_H+10,VILLAGE.z);
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
    addCol(x,z,0.4);stumps.push({x,z});
  }
  const stM=new T.InstancedMesh(stumpG,ph,stumps.length);
  stumps.forEach((s,i)=>put(stM,i,s.x,H(s.x,s.z)-0.05,s.z,1,0.8+rnd()*0.6,1,rnd()*6,0x6b5036));
  stM.castShadow=true;stM.receiveShadow=true;scene.add(stM);
}

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
  player.axe.visible=show&&TOOL.kind==='axe';player.saw.visible=show&&TOOL.kind==='saw';player.chain.visible=show&&TOOL.kind==='chainsaw';
  player.axe.scale.setScalar(TOOL.id==='hachette'?0.78:1);axeColors(player.axe,TOOL.id);
}

/* ---------- VTT ---------- */
const TL=1.9;
function makeVTT(){
  const g=new T.Group();
  const green=mat(0x3d6b35),dark=mat(0x1e1e1e),metal=mat(0x56595c),light=new T.MeshBasicMaterial({color:0xfff3b0});
  box(1.0,0.35,1.7,green,0,0.62,0,g);
  box(1.18,0.1,0.62,green,0,0.82,0.6,g);box(1.18,0.1,0.62,green,0,0.82,-0.6,g);
  box(0.42,0.14,0.8,dark,0,0.9,-0.15,g);
  box(0.52,0.22,0.4,green,0,0.9,0.36,g);
  box(0.06,0.3,0.06,metal,0,1.0,0.52,g);box(0.9,0.06,0.06,metal,0,1.14,0.52,g);
  box(1.0,0.05,0.42,metal,0,0.97,0.86,g);box(1.0,0.05,0.42,metal,0,0.97,-0.82,g);
  box(0.14,0.08,0.04,light,0.26,0.72,0.86,g);box(0.14,0.08,0.04,light,-0.26,0.72,0.86,g);
  box(0.08,0.08,0.35,metal,0,0.42,-0.95,g);
  const {wheels,pivots}=addWheels(g,0.34,0.3,0.56,0.62,-0.62);
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots};
}
function addWheels(g,wr,ww,wx,zf,zr){
  const wg=new T.CylinderGeometry(wr,wr,ww,12);wg.rotateZ(Math.PI/2);
  const tire=mat(0x1b1b1b),hub=mat(0x9a9ea2),hg=new T.CylinderGeometry(wr*0.45,wr*0.45,ww+0.02,8);hg.rotateZ(Math.PI/2);
  const wheels=[],pivots=[];
  const mk=()=>{const w=new T.Group();w.add(new T.Mesh(wg,tire));w.add(new T.Mesh(hg,hub));return w;};
  [[wx,zf],[-wx,zf]].forEach(([x,z])=>{const pv=new T.Group();pv.position.set(x,wr,z);const w=mk();pv.add(w);g.add(pv);pivots.push(pv);wheels.push(w);});
  [[wx,zr],[-wx,zr]].forEach(([x,z])=>{const w=mk();w.position.set(x,wr,z);g.add(w);wheels.push(w);});
  return {wheels,pivots};
}
function makePickup(){
  const g=new T.Group();
  const red=mat(0x9e2b25),dark=mat(0x1e1e1e),chrome=mat(0xb8bcc0),glass=mat(0x2b3a48),light=new T.MeshBasicMaterial({color:0xfff3b0}),tail=new T.MeshBasicMaterial({color:0xc0261e});
  box(1.9,0.4,5.2,dark,0,0.72,0,g);
  box(1.92,0.55,1.6,red,0,1.15,1.85,g);                 // capot
  box(1.92,0.5,1.9,red,0,1.15,0.35,g);                  // bas de cabine
  box(1.86,0.5,1.7,red,0,1.65,0.3,g);                   // cabine
  box(1.88,0.42,0.06,glass,0,1.62,1.17,g);              // pare-brise
  box(1.9,0.36,1.3,glass,0,1.64,0.35,g);                // vitres
  box(1.86,0.08,1.75,red,0,1.93,0.3,g);                 // toit
  box(0.1,0.55,2.3,red,0.91,1.2,-1.5,g);box(0.1,0.55,2.3,red,-0.91,1.2,-1.5,g);
  box(1.82,0.55,0.1,red,0,1.2,-2.62,g);box(1.72,0.06,2.3,dark,0,0.95,-1.5,g);
  box(1.96,0.18,0.16,chrome,0,0.78,2.68,g);box(1.96,0.18,0.16,chrome,0,0.72,-2.7,g);
  box(1.2,0.3,0.05,chrome,0,1.12,2.66,g);
  box(0.3,0.14,0.05,light,0.66,1.18,2.67,g);box(0.3,0.14,0.05,light,-0.66,1.18,2.67,g);
  box(0.12,0.3,0.05,tail,0.86,1.25,-2.67,g);box(0.12,0.3,0.05,tail,-0.86,1.25,-2.67,g);
  box(0.08,0.08,0.3,chrome,0,0.55,-2.85,g);
  const {wheels,pivots}=addWheels(g,0.42,0.32,0.9,1.6,-1.6);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.98,-1.5);g.add(cargo);
  return {g,wheels,pivots,cargo};
}
function makeTrailer(){
  const g=new T.Group();
  const wood=mat(0x8a6a44),metal=mat(0x4b4e50),tire=mat(0x1b1b1b);
  box(1.24,0.1,2.1,metal,0,0.58,0,g);
  box(0.06,0.32,2.1,wood,0.62,0.78,0,g);box(0.06,0.32,2.1,wood,-0.62,0.78,0,g);
  box(1.24,0.32,0.06,wood,0,0.78,1.05,g);box(1.24,0.32,0.06,wood,0,0.78,-1.05,g);
  box(0.08,0.08,0.9,metal,0,0.48,1.45,g);
  const wg=new T.CylinderGeometry(0.3,0.3,0.24,10);wg.rotateZ(Math.PI/2);
  const wheels=[];
  [0.76,-0.76].forEach(x=>{const w=new T.Mesh(wg,tire);w.position.set(x,0.3,0);g.add(w);wheels.push(w);});
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.y=0.63;g.add(cargo);
  return {g,wheels,cargo};
}
function addTandem(g,wr,ww,wx,dz){
  const wg=new T.CylinderGeometry(wr,wr,ww,12);wg.rotateZ(Math.PI/2);const tire=mat(0x1b1b1b),hub=mat(0x9a9ea2);
  const wheels=[];
  [[wx,dz],[-wx,dz],[wx,-dz],[-wx,-dz]].forEach(([x,z])=>{const w=new T.Group();w.add(new T.Mesh(wg,tire));const hb=new T.Mesh(new T.CylinderGeometry(wr*0.45,wr*0.45,ww+0.02,8),hub);hb.rotation.z=Math.PI/2;w.add(hb);w.position.set(x,wr,z);g.add(w);wheels.push(w);});
  return wheels;
}
function makeLoader(){
  const g=new T.Group();
  const frame=mat(0x2f4f3a),metal=mat(0x4b4e50),yel=mat(0xe0a91c),dark=mat(0x222222);
  box(0.26,0.22,5.6,frame,0,0.62,0.7,g);
  box(0.12,0.12,0.5,metal,0,0.55,3.55,g);
  [-1.6,0,1.6].forEach(z=>{box(1.75,0.14,0.2,frame,0,0.8,z,g);[-0.82,0.82].forEach(x=>box(0.1,1.45,0.1,frame,x,1.52,z,g));});
  box(1.1,0.12,0.8,frame,0,0.8,2.35,g);
  box(0.45,0.1,0.4,dark,-0.55,0.95,2.35,g);
  const wheels=addTandem(g,0.38,0.28,0.98,0.45);
  const slew=new T.Group();slew.position.set(0,0.86,2.35);g.add(slew);
  box(0.34,1.95,0.34,yel,0,0.98,0,slew);
  box(0.26,0.4,0.5,yel,0,1.95,0.15,slew);
  const boom=box(0.2,0.22,1,yel,0,1.95,0.5,slew);
  const link=box(0.07,1,0.07,metal,0,1.5,1,slew);
  const grapple=new T.Group();slew.add(grapple);
  box(0.24,0.18,0.24,dark,0,0.05,0,grapple);
  const clawL=box(0.08,0.55,0.5,yel,0.22,-0.22,0,grapple);
  const clawR=box(0.08,0.55,0.5,yel,-0.22,-0.22,0,grapple);
  const hold=new T.Group();hold.position.y=-0.32;grapple.add(hold);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.87,0);g.add(cargo);
  return {g,wheels,cargo,crane:{slew,boom,link,grapple,clawL,clawR,hold}};
}
function makeSkidder(){
  const g=new T.Group(),yel=mat(0xd9a520),dark=mat(0x262626),glass=mat(0x2b3a48),metal=mat(0x5a5e62);
  const front=new T.Group(),rear=new T.Group();g.add(front);g.add(rear);
  box(1.4,0.85,1.9,yel,0,1.25,1.25,front);
  box(1.5,0.3,0.6,dark,0,0.8,0.35,front);
  box(2.5,0.75,0.18,dark,0,0.55,2.6,front);
  box(0.1,0.75,0.1,dark,0.45,2.0,1.6,front);
  box(1.5,0.6,2.2,yel,0,1.05,-1.05,rear);
  box(1.35,1.15,1.25,yel,0,1.9,-0.35,rear);
  box(1.38,0.66,1.15,glass,0,2.05,-0.35,rear);
  box(1.45,0.08,1.35,dark,0,2.52,-0.35,rear);
  [-0.62,0.62].forEach(x=>box(0.16,1.7,0.16,dark,x,1.75,-2.05,rear));
  box(1.4,0.16,0.2,dark,0,2.6,-2.05,rear);
  const grapple=new T.Group();grapple.position.set(0,1.5,-2.5);rear.add(grapple);
  box(0.25,0.5,0.25,metal,0,0.15,0,grapple);
  const cl=box(0.1,0.6,0.35,dark,0.25,-0.3,0,grapple);cl.rotation.z=-0.3;
  const cr=box(0.1,0.6,0.35,dark,-0.25,-0.3,0,grapple);cr.rotation.z=0.3;
  const wg=new T.CylinderGeometry(0.65,0.65,0.5,14);wg.rotateZ(Math.PI/2);const tire=mat(0x1b1b1b),hub=mat(0xd9a520);
  const wheels=[];
  [[front,1.25],[rear,-1.3]].forEach(([grp,z])=>[1.05,-1.05].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(wg,tire));const hb=new T.Mesh(new T.CylinderGeometry(0.3,0.3,0.52,8),hub);hb.rotation.z=Math.PI/2;w.add(hb);w.position.set(x,0.65,z);grp.add(w);wheels.push(w);}));
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots:[],front,rear,grapple};
}
const SPECS={
  vtt:{name:'VTT',build:makeVTT,hitch:1.15,wb:1.25,wr:0.34,maxF:9,maxR:3.5,acc:6.5,mudLoss:0.6,steer:0.55,hl:0.8,hw:0.55,
       cols:[[0.55,0.68],[-0.55,0.68]],enterR:2.6,seat:[0,0.06,-0.22],hide:false,eye:[0,1.72,-0.2],side:1.4,cam:[7.5,3.0],arrowY:2.7},
  pickup:{name:'Pick-up',build:makePickup,hitch:2.85,wb:3.2,wr:0.42,maxF:16,maxR:4,acc:5.5,mudLoss:0.75,steer:0.6,hl:1.6,hw:0.85,
       cols:[[1.8,1.0],[0.6,1.05],[-0.6,1.05],[-1.8,1.0]],enterR:3.2,seat:[0.45,0.3,0.2],hide:true,eye:[0.45,1.78,0.25],side:1.9,cam:[11,4.2],arrowY:3.6,bedCap:8},
  skid:{name:'Débusqueuse',build:makeSkidder,hitch:null,wb:2.6,wr:0.65,maxF:8,maxR:3.5,acc:4.5,mudLoss:0.2,steer:0.65,hl:1.5,hw:1.0,
       cols:[[1.7,1.15],[0.4,1.15],[-1.0,1.15],[-2.2,0.9]],enterR:3.3,seat:[0,0.9,-0.35],hide:true,eye:[0,2.25,-0.1],side:2.0,cam:[11,4.6],arrowY:3.9}
};
const BED_SLOTS=[[-0.52,0.22],[0,0.22],[0.52,0.22],[-0.52,0.64],[0,0.64],[0.52,0.64],[-0.26,1.06],[0.26,1.06]];
const TSPECS={
  small:{name:'remorque',label:'Remorque',build:makeTrailer,tl:1.9,cols:[[0.55,0.62],[-0.55,0.62]],hl:0.9,hw:0.7,cap:6,r:2.6,wr:0.3,tilt:0.11,
         slots:[[-0.44,0.22],[0,0.22],[0.44,0.22],[-0.22,0.6],[0.22,0.6],[0,0.98]]},
  loader:{name:'remorque chargeuse',label:'Chargeuse',build:makeLoader,tl:3.75,cols:[[1.9,0.85],[0.7,0.85],[-0.5,0.85],[-1.7,0.85]],hl:1.7,hw:0.95,cap:10,r:2.8,wr:0.38,tilt:0.06,crane:true,
         slots:[[-0.46,0.24],[0,0.24],[0.46,0.24],[-0.46,0.68],[0,0.68],[0.46,0.68],[-0.46,1.12],[0,1.12],[0.46,1.12],[0,1.56]]}
};
const vehicles=[],trailers=[];
function makeVehicle(type,x,z,th){
  const spec=SPECS[type],m=spec.build();scene.add(m.g);markDynamic(m.g);
  const v={type,spec,x,z,th,v:0,steer:0,spin:0,q:new T.Quaternion(),mesh:m,bed:null,drag:null};
  if(spec.bedCap)v.bed={name:'boîte du pick-up',cap:spec.bedCap,load:[],cargo:m.cargo,slots:BED_SLOTS,r:2.4,
    center:()=>({x:v.x-Math.sin(v.th)*1.5,z:v.z-Math.cos(v.th)*1.5}),yaw:()=>v.th};
  ground(x,z,th,spec.hl,spec.hw,v.q);
  vehicles.push(v);return v;
}
function makeTrailerObj(kind,x,z,th){
  const spec=TSPECS[kind],m=spec.build();scene.add(m.g);markDynamic(m.g);
  const t={kind,spec,x,z,th,q:new T.Quaternion(),hitch:null,mesh:m};
  t.c={name:spec.name,cap:spec.cap,load:[],cargo:m.cargo,slots:spec.slots,r:spec.r,center:()=>({x:t.x,z:t.z}),yaw:()=>t.th};
  if(spec.crane)t.crane={slew:0,reach:3,grip:0,phase:'idle',y:1.9,target:0,held:null,heldMesh:null,onDone:null};
  t.mark=new T.Mesh(new T.RingGeometry(0.55,0.8,28),new T.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.85,side:T.DoubleSide,depthTest:false}));
  t.mark.rotation.x=-Math.PI/2;t.mark.renderOrder=15;t.mark.visible=false;scene.add(t.mark);
  ground(x,z,th,spec.hl,spec.hw,t.q);
  trailers.push(t);return t;
}
function towed(v){return trailers.find(t=>t.hitch===v)||null;}

/* ---------- Flèche d'objectif ---------- */
const arrow=new T.Group();
{const m=new T.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.9,depthTest:false});
 const c=new T.Mesh(new T.ConeGeometry(0.35,0.9,4),m);c.rotation.x=Math.PI/2;c.position.z=0.9;c.renderOrder=21;
 const s=new T.Mesh(new T.BoxGeometry(0.2,0.08,0.9),m);s.position.z=0.2;s.renderOrder=21;
 arrow.add(c);arrow.add(s);}
scene.add(arrow);

// Marqueur de destination (toucher/clic)
const marker=new T.Mesh(new T.RingGeometry(0.3,0.5,24),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.8,side:T.DoubleSide,depthTest:false}));
marker.rotation.x=-Math.PI/2;marker.visible=false;marker.renderOrder=15;scene.add(marker);

/* ---------- État ---------- */
const S={mode:'foot',money:35000,delivered:0,time:0};
const P={x:1,z:4,rot:Math.PI*0.75,phase:0,target:null,carry:null,swing:0,struck:false,cool:0,chopTree:null,crTr:null};
const TOOLS=[
  {id:'hachette',name:'Vieille hachette',kind:'axe',delay:1.5,fell:1,cut:4,price:0,desc:'Celle de grand-papa. Elle fait la job, lentement.'},
  {id:'hache',name:'Hache de bûcheron',kind:'axe',delay:1.3,fell:0.7,cut:3,price:150,desc:'Plus lourde et bien affûtée : moins de coups par arbre.'},
  {id:'sciotte',name:'Sciotte',kind:'saw',delay:1.1,fell:0.85,cut:2,price:300,desc:'Scie à archet. Correcte pour abattre, excellente pour tronçonner.'},
  {id:'scie-usagee',name:'Scie à chaîne usagée',kind:'chainsaw',delay:0.8,fell:0.35,cut:1,price:900,desc:'Elle a du vécu, mais elle part au 3e coup.'},
  {id:'scie-pro',name:'Scie à chaîne pro',kind:'chainsaw',delay:0.55,fell:0.25,cut:1,price:2200,desc:'Puissante et légère. Le rêve de tout bûcheron.'}
];
const VEH_SHOP=[
  {id:'pickup',kind:'veh',name:'Pick-up 4x4',price:6500,desc:'Rapide sur le chemin, une boîte de 8 billots et un attelage pour les remorques. Moins agile dans le bois et la boue.'},
  {id:'loader',kind:'trailer',name:'Remorque chargeuse',price:4500,desc:'Remorque de 12 pi avec poteaux et grue intégrée : 10 billots, jusqu\'à 12 pi de long. Approche-toi de la grue et appuie sur E.'},
  {id:'skid',kind:'veh',name:'Débusqueuse',price:15000,desc:'Tracteur forestier articulé avec pince arrière : agrippe le bout d\'une tige et traîne-la hors du bois. À l\'aise dans la boue.'}
];
const SOON=[];
const owned=new Set(['hachette']);
let TOOL=TOOLS[0];
function toolVerb(){return TOOL.kind==='axe'?(TOOL.id==='hachette'?'Coup de hachette':'Coup de hache'):TOOL.kind==='saw'?'Coup de sciotte':'Coup de scie';}
function fellTotal(t){return Math.max(1,Math.ceil(t.base*TOOL.fell));}
let V=null;
function containers(){const a=trailers.map(t=>t.c);vehicles.forEach(v=>{if(v.bed)a.push(v.bed);});return a;}
function nearestContainer(){let b=null,bd=1e9;for(const c of containers()){const p=c.center(),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<c.r&&d<bd){bd=d;b=c;}}return b;}
function containerAtYard(c){const p=c.center();return Math.hypot(p.x-YARD.x,p.z-YARD.z)<YARD.r+2.5;}

/* ---------- Orientation selon le terrain ---------- */
const _x=new T.Vector3(),_y=new T.Vector3(),_z=new T.Vector3(),_m=new T.Matrix4(),_q=new T.Quaternion();
function ground(x,z,th,hl,hw,out){
  const fx=Math.sin(th),fz=Math.cos(th),sx=Math.cos(th),sz=-Math.sin(th);
  const hF=H(x+fx*hl,z+fz*hl),hB=H(x-fx*hl,z-fz*hl),hS=H(x+sx*hw,z+sz*hw),hM=H(x-sx*hw,z-sz*hw);
  _z.set(fx,(hF-hB)/(2*hl),fz).normalize();
  _x.set(sx,(hS-hM)/(2*hw),sz).normalize();
  _y.crossVectors(_z,_x).normalize();
  _x.crossVectors(_y,_z).normalize();
  _m.makeBasis(_x,_y,_z);
  if(out)out.setFromRotationMatrix(_m);
  return {h:(hF+hB+hS+hM)/4,slope:(hF-hB)/(2*hl)};
}

V=makeVehicle('vtt',4,-4,Math.PI);
{const t=makeTrailerObj('small',0,0,Math.PI);t.x=V.x-Math.sin(V.th)*(V.spec.hitch+t.spec.tl);t.z=V.z-Math.cos(V.th)*(V.spec.hitch+t.spec.tl);t.hitch=V;}

/* ---------- Entrées ---------- */
const keys={};
const joy={active:false,id:null,cx:0,cy:0,x:0,y:0};
const pedal={gas:false,brake:false};
addEventListener('keydown',e=>{
  if(!$('shop').classList.contains('hidden')){if(e.code==='Escape'||e.code==='KeyE')closeShop();return;}
  if($('help').classList.contains('hidden')===false&&e.code!=='Escape')return;
  keys[e.code]=true;
  if(e.code==='KeyE'&&!e.repeat)doEnter();
  if(e.code==='KeyR'&&!e.repeat)doHitch();
  if(e.code==='KeyF'&&!e.repeat)doAct2();
  if(e.code==='Space'&&!e.repeat)doAct();
  if(e.code==='KeyZ')rotateCam(-1);
  if(e.code==='KeyC')rotateCam(1);
  if(e.code==='KeyV'&&!e.repeat)toggleCam();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;pedal.gas=pedal.brake=false;});

function readInput(normalize){
  let x=0,y=0;
  if(keys.KeyA||keys.ArrowLeft)x-=1;if(keys.KeyD||keys.ArrowRight)x+=1;
  if(keys.KeyW||keys.ArrowUp)y+=1;if(keys.KeyS||keys.ArrowDown)y-=1;
  if(joy.active){x+=joy.x;y+=joy.y;}
  if(normalize){const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}}
  return {x:clamp(x,-1,1),y:clamp(y,-1,1)};
}

const joyEl=$('joy'),knob=$('joyKnob'),JR=55;
const pointers=new Map();let pinch=null,pinchUsed=false;
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&!joy.active&&e.clientX<innerWidth*0.42){
    joy.active=true;joy.id=e.pointerId;joy.cx=e.clientX;joy.cy=e.clientY;joy.x=joy.y=0;
    joyEl.style.left=e.clientX+'px';joyEl.style.top=e.clientY+'px';joyEl.classList.remove('hidden');
    knob.style.transform='translate(0,0)';P.target=null;
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    return;
  }
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:zoom,cd:chaseDist};pinchUsed=true;}
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
});
canvas.addEventListener('pointermove',e=>{
  if(joy.active&&e.pointerId===joy.id){
    let dx=e.clientX-joy.cx,dy=e.clientY-joy.cy;const l=Math.hypot(dx,dy);if(l>JR){dx*=JR/l;dy*=JR/l;}
    joy.x=dx/JR;joy.y=-dy/JR;knob.style.transform=`translate(${dx}px,${dy}px)`;return;
  }
  const p=pointers.get(e.pointerId);if(!p)return;
  if(camMode!=='iso'&&pointers.size===1&&(e.pointerType!=='mouse'||e.buttons)&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>12){camYawT-=(e.clientX-p.x)*0.008;camYaw=camYawT;if(camMode==='fp')camPitch=clamp(camPitch-(e.clientY-p.y)*0.006,-1.2,0.9);}
  p.x=e.clientX;p.y=e.clientY;
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];const r=pinch.d/(Math.hypot(a.x-b.x,a.y-b.y)||1);if(camMode==='tp')chaseDist=clamp(pinch.cd*r,0.5,2.5);else if(camMode==='iso'){zoom=clamp(pinch.z*r,ZMIN,ZMAX);updateProj();}}
});
function endPointer(e){
  if(joy.active&&e.pointerId===joy.id){joy.active=false;joy.x=joy.y=0;joyEl.classList.add('hidden');return;}
  const p=pointers.get(e.pointerId);if(!p)return;
  if(e.type==='pointerup'&&!pinchUsed&&pointers.size===1&&Math.hypot(p.x-p.sx,p.y-p.sy)<12&&performance.now()-p.t<500)tap(e.clientX,e.clientY);
  pointers.delete(e.pointerId);
  if(pointers.size<2)pinch=null;
  if(pointers.size===0)pinchUsed=false;
}
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist*(1+e.deltaY*0.0012),0.5,2.5);return;}zoom=clamp(zoom*(1+e.deltaY*0.0012),ZMIN,ZMAX);updateProj();},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

const ray=new T.Raycaster(),ndc=new T.Vector2();
function tap(cx,cy){
  if(S.mode!=='foot')return;
  ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);
  ray.setFromCamera(ndc,activeCam);
  const hit=ray.intersectObject(terrain)[0];
  if(hit){P.target={x:hit.point.x,z:hit.point.z};marker.position.set(hit.point.x,hit.point.y+0.06,hit.point.z);marker.visible=true;marker.material.opacity=0.8;}
}

function holdBtn(el,prop){
  const on=e=>{e.preventDefault();pedal[prop]=true;el.classList.add('on');};
  const off=()=>{pedal[prop]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);
}
holdBtn($('btnGas'),'gas');holdBtn($('btnBrake'),'brake');
const gripK={l:false,r:false};
[['gripL','l'],['gripR','r']].forEach(([id,k])=>{const el=$(id);const on=e=>{e.preventDefault();gripK[k]=true;el.classList.add('on');};const off=()=>{gripK[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);});
$('btnEnter').addEventListener('pointerdown',e=>{e.preventDefault();doEnter();});
$('btnHitch').addEventListener('pointerdown',e=>{e.preventDefault();doHitch();});
$('btnAct2').addEventListener('pointerdown',e=>{e.preventDefault();doAct2();});
$('btnAct').addEventListener('pointerdown',e=>{e.preventDefault();doAct();});

/* ---------- Caméra ---------- */
let camAz=Math.PI/4,camAzT=camAz;
const camT=new T.Vector3(P.x,H(P.x,P.z),P.z);
function rotateCam(d){if(camMode!=='iso')camYawT+=d*Math.PI/4;else camAzT+=d*Math.PI/2;}
const FOG=new T.Fog(0xc9d6dc,30,110);
function toggleCam(){
  camMode=camMode==='iso'?'tp':camMode==='tp'?'fp':'iso';
  activeCam=camMode==='iso'?camera:pcam;
  scene.fog=camMode==='iso'?null:FOG;
  silMat.visible=camMode==='iso';
  player.g.visible=camMode!=='fp'&&!(S.mode==='vtt'&&V.spec.hide);
  pcam.fov=camMode==='fp'?70:60;pcam.updateProjectionMatrix();camPitch=-0.1;
  camYaw=camYawT=S.mode==='vtt'?V.th:P.rot;
  toast(camMode==='tp'?'Vue 3e personne (essai)':camMode==='fp'?'Vue 1re personne (essai)':'Vue isométrique');
}
$('btnCam').addEventListener('click',toggleCam);
$('rotL').addEventListener('click',()=>rotateCam(-1));
$('rotR').addEventListener('click',()=>rotateCam(1));
$('zIn').addEventListener('click',()=>{if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist/1.25,0.5,2.5);return;}zoom=clamp(zoom/1.25,ZMIN,ZMAX);updateProj();});
$('zOut').addEventListener('click',()=>{if(camMode==='fp')return;if(camMode==='tp'){chaseDist=clamp(chaseDist*1.25,0.5,2.5);return;}zoom=clamp(zoom*1.25,ZMIN,ZMAX);updateProj();});
$('btnHelp').addEventListener('click',()=>$('help').classList.remove('hidden'));
$('btnStart').addEventListener('click',()=>$('help').classList.add('hidden'));
const ELEV=0.6155; // 35,26° : vraie isométrique

/* ---------- Magasin ---------- */
function secs(x){return (Math.round(x*10)/10).toString().replace('.',',')+' s';}
function openShop(){renderShop();$('shop').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeShop(){$('shop').classList.add('hidden');}
$('shopClose').addEventListener('click',closeShop);
let thumbR=null;const thumbCache={};
function thumb(id,build){
  if(thumbCache[id]!==undefined)return thumbCache[id];
  try{
    if(!thumbR){thumbR=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});thumbR.setPixelRatio(1);thumbR.setSize(184,134);}
    const sc=new T.Scene();sc.add(new T.HemisphereLight(0xffffff,0x6b5a40,0.95));const dl=new T.DirectionalLight(0xffffff,0.75);dl.position.set(3,5,4);sc.add(dl);
    const o=build();sc.add(o);o.updateMatrixWorld(true);
    const b3=new T.Box3().setFromObject(o),c=b3.getCenter(new T.Vector3()),sz=b3.getSize(new T.Vector3());
    const r=Math.max(sz.x,sz.y,sz.z)||1;
    const cam=new T.PerspectiveCamera(30,184/134,0.01,200);
    cam.position.set(c.x+r*1.35,c.y+r*0.9,c.z+r*1.55);cam.lookAt(c);
    const sv=silMat.visible;silMat.visible=false;thumbR.render(sc,cam);silMat.visible=sv;
    thumbCache[id]=thumbR.domElement.toDataURL('image/png');
  }catch(e){thumbCache[id]='';}
  return thumbCache[id];
}
function findSpawn(cols,th,pref){
  const fx=Math.sin(th),fz=Math.cos(th),others=bodyCircles(null);
  const free=(x,z)=>{const list=cols.map(([o,r])=>[x+fx*o,z+fz*o,r+0.4]);
    if(circlesHit(list,others))return false;
    return list.every(c=>Math.hypot(c[0]-P.x,c[1]-P.z)>c[2]+0.6);};
  const cand=[pref,[7,4.5],[-6,5],[-6,11],[7,11],[0,9],[-14,8],[14,8],[0,15],[-12,15],[12,15],[7,18],[-7,18]];
  for(const [lx,lz] of cand){const p=vpos(lx,lz);if(free(p.x,p.z))return p;}
  for(let r=4;r<30;r+=2)for(let a=0;a<Math.PI*2;a+=0.4){const x=VILLAGE.x+Math.cos(a)*r,z=VILLAGE.z+Math.sin(a)*r;if(free(x,z))return {x,z};}
  return vpos(pref[0],pref[1]);
}
function toolThumbModel(t){
  const g=new T.Group();let m;
  if(t.kind==='axe'){m=makeAxeModel();axeColors(m,t.id);}else if(t.kind==='saw')m=makeSawModel();else m=makeChainModel(t.id==='scie-usagee');
  m.rotation.set(-0.5,0.9,0.35);g.add(m);return g;
}
function imgTag(src){return src?`<img class="thumb" src="${src}" alt="">`:'';}
function renderShop(){
  $('shopMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('shopList');L.innerHTML='';
  TOOLS.forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const treeT=Math.max(1,Math.ceil(9*t.fell))*t.delay,cutT=t.cut*t.delay;
    d.innerHTML=imgTag(thumb(t.id,()=>toolThumbModel(t)))+`<div class="txt"><b>${t.name}</b>${t.price?` — ${t.price} $`:''}<p>${t.desc}</p><p class="stats">Arbre moyen : ≈ ${secs(treeT)} · Une coupe : ≈ ${secs(cutT)}</p></div>`;
    const b=document.createElement('button');
    if(TOOL===t){b.textContent='En main';b.disabled=true;}
    else if(owned.has(t.id)){b.textContent='Prendre';b.onclick=()=>{TOOL=t;updateToolVisual();renderShop();};}
    else{b.textContent='Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price)return;S.money-=t.price;owned.add(t.id);TOOL=t;updateToolVisual();toast(`${t.name} achetée !`);renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  VEH_SHOP.forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const isT=t.kind==='trailer';
    const img=thumb(t.id,()=>isT?TSPECS[t.id].build().g:SPECS[t.id].build().g);
    const stats=isT?`Capacité : ${TSPECS[t.id].cap} billots · jusqu'à 12 pi`:`Vitesse max ≈ ${Math.round(SPECS[t.id].maxF*3.6)} km/h (VTT : ${Math.round(SPECS.vtt.maxF*3.6)} km/h)`;
    d.innerHTML=imgTag(img)+`<div class="txt"><b>${t.name}</b> — ${t.price} $<p>${t.desc}</p><p class="stats">${stats}</p></div>`;
    const b=document.createElement('button');
    const have=isT?trailers.some(x=>x.kind===t.id):vehicles.some(v=>v.type===t.id);
    if(have){b.textContent='À toi';b.disabled=true;}
    else{b.textContent='Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price)return;S.money-=t.price;
      const th=VROT+Math.PI/2,sp=isT?TSPECS[t.id]:SPECS[t.id],p=findSpawn(sp.cols,th,{pickup:[7,4.5],loader:[-6,5],skid:[-6,11]}[t.id]);
      if(isT)makeTrailerObj(t.id,p.x,p.z,th);else makeVehicle(t.id,p.x,p.z,th);
      toast(`${t.name} : ${isT?'elle t\'attend':'il t\'attend'} devant le magasin !`);renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  SOON.forEach(t=>{const d=document.createElement('div');d.className='item soon';d.innerHTML=`<div class="txt"><b>${t.name}</b><p>${t.desc}</p></div><button disabled>Bientôt</button>`;L.appendChild(d);});
}

/* ---------- Messages ---------- */
let toastTimer=0;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}

/* ---------- Actions ---------- */
const TRAILER_SLOTS=[[-0.44,0.22],[0,0.22],[0.44,0.22],[-0.22,0.6],[0.22,0.6],[0,0.98]];
const pieces=[],falling=[],chips=[];
const FT=0.3048,INCH=0.0254,CARRY_MAX=8*FT+2*INCH,SAW_MIN=7*FT+10*INCH,CRANE_MAX=12*FT+2*INCH;
function ftin(m){const t=Math.round(m/INCH);return `${Math.floor(t/12)} pi ${t%12} po`;}
function priceOf(c){return c.len>=SAW_MIN?Math.round(SPECIES[c.sp].p*c.len/(8*FT)):Math.max(1,Math.round(c.len/FT*2));}
function kindOf(len){return len>CRANE_MAX?'trop long : recoupe ou débusqueuse':len>CARRY_MAX?'billot long (grue) ✔':len>=SAW_MIN?'billot de sciage ✔':'bois de chauffage';}
function pointInYard(x,z){return Math.hypot(x-YARD.x,z-YARD.z)<YARD.r||Math.hypot(x-(YARD.x+5.6),z-(YARD.z+0.4))<3.2;}
function inYard(){return pointInYard(P.x,P.z);}
function pieceGeo(len,ra,rb){const g=new T.CylinderGeometry(rb,ra,len,9);g.rotateX(Math.PI/2);return g;}
function makePieceMesh(c){const m=new T.Mesh(pieceGeo(c.len,c.ra,c.rb),logMats);m.castShadow=true;m.receiveShadow=true;return m;}
function placePiece(pc){
  const fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),h=pc.len/2;
  const h0=H(pc.cx-fx*h,pc.cz-fz*h)+pc.ra,h1=H(pc.cx+fx*h,pc.cz+fz*h)+pc.rb;
  pc.mesh.rotation.order='YXZ';pc.mesh.rotation.set(-Math.asin(clamp((h1-h0)/pc.len,-0.9,0.9)),pc.rot,0);
  pc.mesh.position.set(pc.cx,(h0+h1)/2,pc.cz);pc.mesh.updateMatrixWorld();
}
function addPiece(pc){pc.mesh=makePieceMesh(pc);placePiece(pc);scene.add(pc.mesh);pieces.push(pc);return pc;}
function removePiece(pc){scene.remove(pc.mesh);pc.mesh.geometry.dispose();pieces.splice(pieces.indexOf(pc),1);}
function pieceButt(pc){return {x:pc.cx-Math.sin(pc.rot)*pc.len/2,z:pc.cz-Math.cos(pc.rot)*pc.len/2};}
function projOn(pc){
  const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot);
  const d=(P.x-b.x)*fx+(P.z-b.z)*fz,dc=clamp(d,0,pc.len);
  return {d,dist:Math.hypot(P.x-(b.x+fx*dc),P.z-(b.z+fz*dc))};
}
function nearestPiece(){let best=null,bd=1.0,bp=null;for(const pc of pieces){const pr=projOn(pc);if(pr.dist<bd){bd=pr.dist;best=pc;bp=pr;}}return best?{pc:best,d:bp.d}:null;}
function carryable(pc){return !pc.crown&&pc.len<=CARRY_MAX;}
function cutRange(pc){return [0.3,pc.len-(pc.crown?1.0:0.3)];}
function nearestTree(maxD){
  let best=null,bd=maxD;
  eachNear(P.x,P.z,c=>{if(c.tree&&c.tree.alive){const d=Math.hypot(P.x-c.x,P.z-c.z)-c.r;if(d<bd){bd=d;best=c.tree;}}return false;});
  return best;
}
function cutLocked(){return P.cut&&pieces.includes(P.cut.pc)&&Math.hypot(P.x-P.cut.x,P.z-P.cut.z)<1.8;}
function context(){
  if(S.mode==='vtt')return driveContext();
  if(S.mode==='crane')return craneContext();
  let act=null,act2=null,full=false,preview=null,info='';
  const cont=nearestContainer();
  if(!P.carry&&Math.hypot(P.x-STORE_DOOR.x,P.z-STORE_DOOR.z)<3)act={label:'Entrer au magasin',fn:openShop};
  else if(P.carry){
    if(inYard())act={label:`Corder à la cour (+${priceOf(P.carry)} $)`,fn:sellLog};
    else if(cont&&cont.load.length<cont.cap)act={label:`Mettre dans la ${cont.name} (${cont.load.length}/${cont.cap})`,fn:()=>putIn(cont)};
    else{act={label:'Déposer le billot',fn:dropLog};full=!!cont;}
  }else if(cutLocked()){
    const k=P.cut;preview={pc:k.pc,d:k.d,locked:true};
    act={label:`Tronçonner (${Math.round(k.work*TOOL.cut)}/${TOOL.cut}) à ${ftin(k.d)}`,fn:cutStroke,cool:true};
    info=`Coupe à ${ftin(k.d)} : ${kindOf(k.d)}`;
  }else{
    const np=nearestPiece();
    if(np){
      const pc=np.pc,[a,b]=cutRange(pc),canCut=b>a,d=clamp(np.d,a,b);
      if(canCut)preview={pc,d,locked:false};
      const cutAct=canCut?{label:`Couper ici : ${ftin(d)}`,fn:()=>startCut(pc,d),cool:true}:null;
      if(carryable(pc)){act={label:`Prendre (${ftin(pc.len)}, ${pc.len>=SAW_MIN?'sciage':'chauffage'})`,fn:()=>pickUp(pc)};act2=cutAct;}
      else act=cutAct;
      if(carryable(pc))info=`Billot de ${ftin(pc.len)} (${pc.len>=SAW_MIN?'sciage':'bois de chauffage'})`+(canCut?` · recouper ici : ${ftin(d)}`:'');
      else if(canCut)info=`Ruban : ${ftin(d)} → ${kindOf(d)}`+(pc.crown?'':` · reste ${ftin(pc.len-d)}`);
      else if(pc.crown)info='La cime : rien à ramasser ici';
      if(!pc.crown&&pc.len>CARRY_MAX&&!canCut)info='Trop long pour l\'épaule : grue ou débusqueuse';
    }
    else if(cont&&cont.load.length){const top=cont.load[cont.load.length-1].userData.c;if(top.len<=CARRY_MAX)act={label:`Prendre un billot (${cont.name})`,fn:()=>takeFrom(cont)};else info=`Billot de ${ftin(top.len)} : trop long pour l'épaule, utilise la grue`;}
    else{const t=nearestTree(1.3);if(t){const tot=fellTotal(t);act={label:`${toolVerb()} (${Math.round(t.work*tot)}/${tot})`,fn:()=>chop(t),cool:true};}}
  }
  let enter=null,enterVeh=null,enterCrane=null;
  if(!P.carry){
    const nv=nearestVehicle(),nc=nearestCrane();
    if(nc&&(!nv||nc.d<Math.hypot(P.x-nv.x,P.z-nv.z))){enter='Opérer la grue';enterCrane=nc.t;}
    else if(nv){enter=`Embarquer (${nv.spec.name})`;enterVeh=nv;}
  }
  return {enter,enterVeh,enterCrane,act,act2,full,preview,info};
}
function setCarry(c){
  P.carry=c;player.carryLog.visible=!!c;updateToolVisual();
  if(c){const g=pieceGeo(c.len,c.ra,c.rb);player.carryLog.traverse(o=>{if(o.isMesh)o.geometry=g;});}
}
function pickUp(pc){removePiece(pc);setCarry({sp:pc.sp,len:pc.len,ra:pc.ra,rb:pc.rb});P.target=null;}
function nearestVehicle(){let b=null,bd=1e9;for(const v of vehicles){const d=Math.hypot(P.x-v.x,P.z-v.z);if(d<v.spec.enterR&&d<bd){bd=d;b=v;}}return b;}
function takeFrom(c){const m=c.load.pop();c.cargo.remove(m);setCarry(m.userData.c);}
function putIn(cont){
  const i=cont.load.length,c=P.carry,m=makePieceMesh(c),sl=(cont.slots||TRAILER_SLOTS)[i];m.position.set(sl[0],sl[1],0);m.userData.c=c;
  cont.cargo.add(m);cont.load.push(m);setCarry(null);
  toast(`Dans la ${cont.name} (${cont.load.length}/${cont.cap})`);
}
function dropLog(){
  const c=P.carry,r=P.rot+Math.PI/2;
  addPiece({cx:P.x+Math.sin(P.rot)*0.9,cz:P.z+Math.cos(P.rot)*0.9,rot:r,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,crown:false});
  setCarry(null);
}
let yardCount=0;
function sellPiece(c){
  const pr=priceOf(c);
  const i=yardCount++,stack=Math.floor(i/15)%4,j=i%15,layer=Math.floor(j/5),slot=j%5;
  const l=makePieceMesh(c);l.rotation.y=Math.PI/2;l.position.set(stack*2.9-4.3,0.22+layer*0.4,(slot-2)*0.46+(layer%2)*0.1);yardStack.add(l);
  if(yardStack.children.length>60)yardStack.remove(yardStack.children[0]);
  S.money+=pr;S.delivered++;
  toast(c.len>=SAW_MIN?`+${pr} $ — billot de ${SPECIES[c.sp].n.toLowerCase()} (${ftin(c.len)})`:`+${pr} $ — bois de chauffage (${ftin(c.len)})`);
}
function sellLog(){const c=P.carry;setCarry(null);sellPiece(c);}
function swing(tx,tz,onStrike){
  if(P.cool>0||P.swing>0)return false;
  P.swing=0.0001;P.swingDur=Math.min(0.75,TOOL.delay*0.92);P.struck=false;P.onStrike=onStrike;P.cool=TOOL.delay;P.target=null;marker.visible=false;
  P.rot=Math.atan2(tx-P.x,tz-P.z);return true;
}
function chop(t){swing(t.x,t.z,()=>strikeTree(t));}
function cutPoint(pc,d){const b=pieceButt(pc);return {x:b.x+Math.sin(pc.rot)*d,z:b.z+Math.cos(pc.rot)*d};}
function startCut(pc,d){
  if(P.cool>0||P.swing>0)return;
  const pt=cutPoint(pc,d);P.cut={pc,d,work:0,x:pt.x,z:pt.z};
  swing(pt.x,pt.z,strikeCut);
}
function cutStroke(){if(P.cut)swing(P.cut.x,P.cut.z,strikeCut);}
const chipGeo=new T.BoxGeometry(0.1,0.05,0.14),chipMat=mat(0xe3c28e);
function spawnChips(x,y,z){
  for(let k=0;k<6;k++){
    const m=new T.Mesh(chipGeo,chipMat);m.position.set(x,y,z);scene.add(m);
    const a=P.rot+Math.PI+(rnd()-0.5)*2.2;
    chips.push({m,vx:Math.sin(a)*(1.5+rnd()*2),vy:2+rnd()*2.5,vz:Math.cos(a)*(1.5+rnd()*2),life:0.8});
  }
}
function strikeTree(t){
  if(!t.alive)return;
  t.work+=1/fellTotal(t);spawnChips(t.x+(P.x-t.x)*0.15,t.y+0.9,t.z+(P.z-t.z)*0.15);
  if(t.work>=0.999)fell(t);
}
function strikeCut(){
  const k=P.cut;if(!k||!pieces.includes(k.pc))return;
  k.work+=1/TOOL.cut;spawnChips(k.x,H(k.x,k.z)+0.4,k.z);
  if(k.work>=0.999){splitPiece(k.pc,k.d);P.cut=null;}
}
function splitPiece(pc,d){
  removePiece(pc);
  const fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),b=pieceButt(pc),rm=pc.ra+(pc.rb-pc.ra)*d/pc.len;
  addPiece({cx:b.x+fx*(d/2-0.02),cz:b.z+fz*(d/2-0.02),rot:pc.rot,len:d,ra:pc.ra,rb:rm,sp:pc.sp,crown:false});
  const r=pc.len-d;
  addPiece({cx:b.x+fx*(d+r/2+0.02),cz:b.z+fz*(d+r/2+0.02),rot:pc.rot,len:r,ra:rm,rb:pc.rb,sp:pc.sp,crown:pc.crown});
  toast(`Coupé à ${ftin(d)} : ${kindOf(d).replace(' ✔','')}`);
}
function removeCol(c){const a=grid.get(gk(Math.floor(c.x/CELL),Math.floor(c.z/CELL)));if(a){const i=a.indexOf(c);if(i>=0)a.splice(i,1);}}
function fell(t){
  t.alive=false;removeCol(t.col);
  t.parts.forEach(pp=>TREE_INST[pp.g].setMatrixAt(pp.idx,ZERO_M));
  Object.values(TREE_INST).forEach(m=>m.instanceMatrix.needsUpdate=true);
  const g=new T.Group();
  t.parts.forEach(pp=>{const m=new T.Mesh(TREE_GEO[pp.g],mat(pp.c));m.position.set(pp.dx,pp.dy,pp.dz);m.scale.set(pp.sx,pp.sy,pp.sz);m.rotation.y=pp.rot;g.add(m);});
  shadows(g);g.position.set(t.x,t.y,t.z);scene.add(g);
  let fx=t.x-P.x,fz=t.z-P.z;const d=Math.hypot(fx,fz)||1;fx/=d;fz/=d;
  falling.push({t,g,fx,fz,axis:new T.Vector3(fz,0,-fx),time:0});
  const st=new T.Mesh(new T.CylinderGeometry(0.26*t.s,0.32*t.s,0.45,7),mat(t.type==='bouleau'?0xd9d4c8:0x6b5036));
  st.position.set(t.x,t.y+0.2,t.z);shadows(st);scene.add(st);addCol(t.x,t.z,0.3*t.s);
  toast('Ça tombe ! 🌲');
}
function makeCrown(t,x,z,rot){
  const g=new T.Group();g.rotation.y=rot;
  const cols=t.parts.filter(p=>p.g!=='trunk').map(p=>p.c),s=t.s;
  if(t.type==='epinette'||t.type==='sapin'){
    const c=new T.Mesh(new T.ConeGeometry(1.0*s,3.0*s,7),mat(cols[0]));c.rotation.x=Math.PI/2;c.position.set(0,0,0.9*s);g.add(c);
    const c2=new T.Mesh(new T.ConeGeometry(0.7*s,1.6*s,7),mat(cols[1]));c2.rotation.x=Math.PI/2;c2.position.set(0,0,2.6*s);g.add(c2);
  }else{
    const b1=new T.Mesh(TREE_GEO.blob,mat(cols[0]));b1.scale.set(1.4*s,0.9*s,1.6*s);b1.position.set(0,0,0.8*s);g.add(b1);
    const b2=new T.Mesh(TREE_GEO.blob,mat(cols[1]));b2.scale.set(1.0*s,0.8*s,1.1*s);b2.position.set(0.3*s,0.2,2.0*s);g.add(b2);
  }
  g.position.set(x,H(x,z)+0.55*s,z);shadows(g);scene.add(g);
}
function updateFalling(dt){
  for(let i=falling.length-1;i>=0;i--){
    const f=falling[i];f.time+=dt;
    const k=Math.min(1,f.time/1.6);
    f.g.quaternion.setFromAxisAngle(f.axis,(Math.PI/2-0.06)*k*k);
    if(k>=1){
      scene.remove(f.g);falling.splice(i,1);
      const t=f.t,L=(t.type==='bouleau'?0.9:1)*(6+5*(t.s-0.8)),R0=0.13+0.07*t.s,rot=Math.atan2(f.fx,f.fz);
      const bx=t.x+f.fx*0.35,bz=t.z+f.fz*0.35;
      addPiece({cx:bx+f.fx*L/2,cz:bz+f.fz*L/2,rot,len:L,ra:R0,rb:R0*0.5,sp:t.type,crown:false});
      toast(`Tige de ${ftin(L)} : à toi de la tronçonner`);
    }
  }
  for(let i=chips.length-1;i>=0;i--){
    const c=chips[i];c.life-=dt;c.vy-=12*dt;
    c.m.position.x+=c.vx*dt;c.m.position.y+=c.vy*dt;c.m.position.z+=c.vz*dt;c.m.rotation.x+=dt*10;c.m.rotation.z+=dt*7;
    if(c.life<=0){scene.remove(c.m);chips.splice(i,1);}
  }
}
/* Aperçu du ruban et de la coupe */
const cutRing=new T.Mesh(new T.TorusGeometry(1,0.06,6,22),new T.MeshBasicMaterial({color:0x5fe07a,depthTest:false,transparent:true}));
cutRing.renderOrder=16;cutRing.visible=false;scene.add(cutRing);
const tape=new T.Mesh(new T.BoxGeometry(0.06,0.015,1),new T.MeshBasicMaterial({color:0xffd23d,depthTest:false,transparent:true,opacity:0.9}));
tape.renderOrder=16;tape.visible=false;scene.add(tape);
const _v=new T.Vector3();
function updatePreview(pv){
  if(!pv){cutRing.visible=tape.visible=false;return;}
  const pc=pv.pc,d=pv.d,r=pc.ra+(pc.rb-pc.ra)*d/pc.len;
  cutRing.visible=tape.visible=true;
  pc.mesh.localToWorld(_v.set(0,0,d-pc.len/2));cutRing.position.copy(_v);cutRing.quaternion.copy(pc.mesh.quaternion);
  cutRing.scale.setScalar(r+0.05);
  cutRing.material.color.set(d>CRANE_MAX?0xe05a4a:d>CARRY_MAX?0x5aa0ff:d>=SAW_MIN?0x5fe07a:0xffa13d);
  cutRing.material.opacity=pv.locked?1:0.6+0.3*Math.sin(S.time*8);
  pc.mesh.localToWorld(_v.set(0,pc.ra+0.03,d/2-pc.len/2));tape.position.copy(_v);tape.quaternion.copy(pc.mesh.quaternion);tape.scale.set(1,1,Math.max(0.01,d));
}
function tongue(t){return {x:t.x+Math.sin(t.th)*t.spec.tl,z:t.z+Math.cos(t.th)*t.spec.tl};}
function vHitch(v){return {x:v.x-Math.sin(v.th)*v.spec.hitch,z:v.z-Math.cos(v.th)*v.spec.hitch};}
function canAttach(v,t){if(!v||!t||t.hitch||!v.spec.hitch||towed(v))return false;const p=tongue(t),h=vHitch(v);return Math.hypot(p.x-h.x,p.z-h.z)<1.0&&Math.abs(wrapAng(t.th-v.th))<1.1;}
function hitchCtx(){
  if(P.carry||S.mode==='crane')return null;
  if(S.mode==='vtt'){
    if(Math.abs(V.v)>=0.8)return null;
    const tw=towed(V);
    if(tw)return {label:`Dételer la ${tw.spec.name}`,fn:()=>detach(tw)};
    const t=trailers.find(t=>canAttach(V,t));
    if(t)return {label:`Atteler la ${t.spec.name}`,fn:()=>attach(V,t)};
    return null;
  }
  let best=null,bd=2.2;
  trailers.forEach(t=>{const p=tongue(t),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;best=t;}});
  if(!best)return null;
  if(best.hitch)return {label:`Dételer la ${best.spec.name}`,fn:()=>detach(best)};
  const v=vehicles.find(v=>canAttach(v,best));
  if(v)return {label:`Atteler au ${v.spec.name}`,fn:()=>attach(v,best)};
  return null;
}
function doHitch(){const h=hitchCtx();if(h)h.fn();}
function detach(t){t.hitch=null;toast(`${t.spec.label} dételée`);}
function attach(v,t){
  const h=vHitch(v);let dx=h.x-t.x,dz=h.z-t.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  t.th=Math.atan2(dx,dz);t.x=h.x-dx*t.spec.tl;t.z=h.z-dz*t.spec.tl;t.hitch=v;toast(`${t.spec.label} attelée 🔗`);
}
function driveContext(){
  let act=null,info='';
  if(V.type==='skid'){
    if(V.drag)act={label:`Relâcher la tige (${ftin(V.drag.len)})`,fn:()=>skidRelease(V)};
    else{const c=skidCandidate(V);if(c){if(Math.abs(V.v)<1.5)act={label:`Agripper (${ftin(c.pc.len)})`,fn:()=>skidGrab(V,c)};else info='Ralentis pour agripper la tige';}}
  }
  return {enter:'Débarquer',act,act2:null,full:false,info};
}
/* ---------- Débusqueuse ---------- */
function skidGrip(v){return {x:v.x-Math.sin(v.th)*2.8,z:v.z-Math.cos(v.th)*2.8};}
function pieceTop(pc){const b=pieceButt(pc);return {x:b.x+Math.sin(pc.rot)*pc.len,z:b.z+Math.cos(pc.rot)*pc.len};}
function skidCandidate(v){
  const g=skidGrip(v);let best=null,bd=1.8;
  for(const pc of pieces){const b=pieceButt(pc),t=pieceTop(pc);const db=Math.hypot(g.x-b.x,g.z-b.z),dt=Math.hypot(g.x-t.x,g.z-t.z);
    if(db<bd){bd=db;best={pc,end:'butt',p:b};}if(dt<bd){bd=dt;best={pc,end:'top',p:t};}}
  return best;
}
function skidGrab(v,c){
  const pc=c.pc,free=c.end==='butt'?pieceTop(pc):pieceButt(pc);
  removePiece(pc);
  const d={len:pc.len,ra:pc.ra,rb:pc.rb,sp:pc.sp,end:c.end,fx:free.x,fz:free.z,mesh:makePieceMesh(pc)};
  d.mesh.rotation.order='YXZ';scene.add(d.mesh);v.drag=d;updateDrag(v);toast('Tige agrippée');
}
function dragEnds(v){
  const d=v.drag,g=skidGrip(v);
  const A={x:g.x,z:g.z,y:H(g.x,g.z)+0.85},F={x:d.fx,z:d.fz,y:H(d.fx,d.fz)+(d.end==='butt'?d.rb:d.ra)};
  return d.end==='butt'?{butt:A,top:F}:{butt:F,top:A};
}
function updateDrag(v){
  const d=v.drag;if(!d)return;
  const g=skidGrip(v);let dx=d.fx-g.x,dz=d.fz-g.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  d.fx=g.x+dx*d.len;d.fz=g.z+dz*d.len;
  const {butt,top}=dragEnds(v),hz=Math.hypot(top.x-butt.x,top.z-butt.z)||1;
  d.mesh.rotation.set(-Math.atan2(top.y-butt.y,hz),Math.atan2(top.x-butt.x,top.z-butt.z),0);
  d.mesh.position.set((butt.x+top.x)/2,(butt.y+top.y)/2,(butt.z+top.z)/2);
}
function skidRelease(v){
  const d=v.drag;if(!d)return;
  const {butt,top}=dragEnds(v);
  scene.remove(d.mesh);d.mesh.geometry.dispose();v.drag=null;
  addPiece({cx:(butt.x+top.x)/2,cz:(butt.z+top.z)/2,rot:Math.atan2(top.x-butt.x,top.z-butt.z),len:d.len,ra:d.ra,rb:d.rb,sp:d.sp,crown:false});
  toast('Tige relâchée');
}
/* ---------- Grue de la remorque chargeuse ---------- */
const CR_COLZ=2.35,CR_TOP=2.81,CR_IDLE=1.9;
function craneCol(t){return {x:t.x+Math.sin(t.th)*CR_COLZ,z:t.z+Math.cos(t.th)*CR_COLZ};}
function trH(t){return t.mesh.g.position.y;}
function gripWorld(t){const c=craneCol(t),cr=t.crane,a=t.th+cr.slew;return {x:c.x+Math.sin(a)*cr.reach,z:c.z+Math.cos(a)*cr.reach,y:trH(t)+cr.y};}
function nearestCrane(){
  let best=null,bd=2.6;
  trailers.forEach(t=>{if(!t.crane)return;if(t.hitch&&Math.abs(t.hitch.v)>0.5)return;const c=craneCol(t),d=Math.hypot(P.x-c.x,P.z-c.z);if(d<bd){bd=d;best={t,d};}});
  return best;
}
function overBed(t){const cr=t.crane,lx=Math.sin(cr.slew)*cr.reach,lz=CR_COLZ+Math.cos(cr.slew)*cr.reach;return Math.abs(lx)<0.75&&lz>-1.9&&lz<1.9;}
function craneAligned(t){return Math.abs(Math.sin(t.crane.slew+t.crane.grip))<0.26;}
function pieceUnder(x,z){
  let best=null,bd=0.8;
  for(const pc of pieces){const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot);const d=clamp((x-b.x)*fx+(z-b.z)*fz,0,pc.len);const dist=Math.hypot(x-(b.x+fx*d),z-(b.z+fz*d));if(dist<bd){bd=dist;best=pc;}}
  return best;
}
function containerUnder(t,x,z){
  if(overBed(t)&&t.c.load.length)return t.c;
  let best=null,bd=1.4;
  containers().forEach(c=>{if(c===t.c||!c.load.length)return;const p=c.center(),d=Math.hypot(x-p.x,z-p.z);if(d<bd){bd=d;best=c;}});
  return best;
}
function craneContext(){
  const t=P.crTr,cr=t.crane;let act=null,info='';
  if(cr.phase==='idle'){
    const g=gripWorld(t);
    if(cr.held){
      const c=cr.held;
      if(overBed(t)){
        if(t.c.load.length>=t.c.cap)info='La remorque chargeuse est pleine';
        else if(!craneAligned(t))info='Tourne le billot (Q/R) pour l\'aligner avec la remorque';
        else act={label:`Déposer dans la remorque (${t.c.load.length}/${t.c.cap})`,fn:()=>craneDrop(t,'bed')};
      }
      else if(pointInYard(g.x,g.z))act={label:`Corder à la cour (+${priceOf(c)} $)`,fn:()=>craneDrop(t,'yard')};
      else act={label:'Déposer au sol',fn:()=>craneDrop(t,'ground')};
      if(!info)info=`Billot de ${ftin(c.len)} dans la pince`;
    }else{
      const pc=pieceUnder(g.x,g.z);
      if(pc){if(pc.len>CRANE_MAX)info=`Trop long pour la grue (${ftin(pc.len)}) : recoupe-le`;else act={label:`Prendre le billot (${ftin(pc.len)})`,fn:()=>craneGrab(t,{piece:pc})};}
      else{const cont=containerUnder(t,g.x,g.z);if(cont)act={label:`Prendre dans la ${cont.name}`,fn:()=>craneGrab(t,{cont})};else info='Place la pince au-dessus d\'un billot (W/A/S/D ou joystick)';}
    }
  }
  return {enter:'Quitter la grue',act,act2:null,full:false,info};
}
function craneMove(t,worldY,onDone){const cr=t.crane;cr.phase='down';cr.target=clamp(worldY-trH(t),0.1,CR_IDLE);cr.onDone=onDone;}
function setHeld(t,c,worldYaw){
  const cr=t.crane;cr.held=c;
  if(cr.heldMesh){cr.heldMesh.parent.remove(cr.heldMesh);cr.heldMesh.geometry.dispose();cr.heldMesh=null;}
  if(c){const m=makePieceMesh(c);t.mesh.crane.hold.add(m);cr.heldMesh=m;if(worldYaw!==undefined)cr.grip=wrapAng(worldYaw-(t.th+cr.slew));}
}
function craneGrab(t,o){
  if(o.piece){const pc=o.piece;craneMove(t,H(pc.cx,pc.cz)+pc.ra*2+0.32,()=>{if(!pieces.includes(pc))return;removePiece(pc);setHeld(t,{sp:pc.sp,len:pc.len,ra:pc.ra,rb:pc.rb},pc.rot);});}
  else{const c=o.cont;craneMove(t,trH(t)+1.7,()=>{if(!c.load.length)return;const m=c.load.pop();c.cargo.remove(m);setHeld(t,m.userData.c,c.yaw());});}
}
function craneDrop(t,mode){
  const cr=t.crane,g=gripWorld(t);
  if(mode==='bed'){
    const sl=t.spec.slots[t.c.load.length];
    craneMove(t,trH(t)+0.87+sl[1]+0.32,()=>{const c=cr.held;if(!c||t.c.load.length>=t.c.cap)return;setHeld(t,null);
      const s2=t.spec.slots[t.c.load.length],m=makePieceMesh(c);m.position.set(s2[0],s2[1],0);m.userData.c=c;t.c.cargo.add(m);t.c.load.push(m);
      toast(`Dans la remorque chargeuse (${t.c.load.length}/${t.c.cap})`);});
  }else if(mode==='yard'){
    craneMove(t,H(g.x,g.z)+0.9,()=>{const c=cr.held;if(!c)return;setHeld(t,null);sellPiece(c);});
  }else{
    craneMove(t,H(g.x,g.z)+cr.held.ra*2+0.32,()=>{const c=cr.held;if(!c)return;const yaw=t.th+cr.slew+cr.grip,g2=gripWorld(t);setHeld(t,null);
      addPiece({cx:g2.x,cz:g2.z,rot:yaw,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,crown:false});});
  }
}
function updateCrane(t,dt){
  const cr=t.crane,m=t.mesh.crane;
  if(S.mode==='crane'&&P.crTr===t&&cr.phase==='idle'){
    const inp=readInput(true);
    cr.slew-=inp.x*0.9*dt;cr.reach=clamp(cr.reach+inp.y*2.2*dt,1.4,6.5);
    const gr=((keys.KeyQ||gripK.l)?1:0)-((keys.KeyR||gripK.r)?1:0);
    cr.grip+=gr*1.6*dt;
  }
  if(cr.phase==='down'){cr.y-=3*dt;if(cr.y<=cr.target){cr.y=cr.target;const f=cr.onDone;cr.onDone=null;if(f)f();cr.phase='up';}}
  else if(cr.phase==='up'){cr.y+=3*dt;if(cr.y>=CR_IDLE){cr.y=CR_IDLE;cr.phase='idle';}}
  m.slew.rotation.y=cr.slew;
  m.boom.position.z=cr.reach/2;m.boom.scale.z=cr.reach;
  const drop=Math.max(0.05,CR_TOP-cr.y);
  m.link.scale.y=drop;m.link.position.set(0,1.95-drop/2,cr.reach);
  m.grapple.position.set(0,1.95-drop,cr.reach);m.grapple.rotation.y=cr.grip;
  const cl=cr.held?0.12:0.42;m.clawL.rotation.z=-cl;m.clawR.rotation.z=cl;
}
function doEnter(){
  const c=context();if(!c.enter)return;
  if(S.mode==='crane'){S.mode='foot';updateToolVisual();return;}
  if(S.mode==='foot'){
    if(c.enterCrane){
      S.mode='crane';P.crTr=c.enterCrane;P.target=null;marker.visible=false;P.swing=0;
      const col=craneCol(P.crTr);P.rot=Math.atan2(col.x-P.x,col.z-P.z);player.g.rotation.y=P.rot;
      player.legL.rotation.set(0,0,0);player.legR.rotation.set(0,0,0);player.armL.rotation.set(0,0,0);player.armR.rotation.set(-0.6,0,0);
      updateToolVisual();return;
    }
    V=c.enterVeh;
    S.mode='vtt';P.target=null;marker.visible=false;
    V.mesh.g.add(player.g);player.g.position.set(...V.spec.seat);player.g.rotation.set(0,0,0);
    player.g.visible=!V.spec.hide&&camMode!=='fp';
    player.legL.rotation.x=player.legR.rotation.x=-1.35;player.armL.rotation.x=player.armR.rotation.x=-1.05;
    player.legL.rotation.z=0.12;player.legR.rotation.z=-0.12;P.swing=0;updateToolVisual();
  }else{
    const sx=Math.cos(V.th),sz=-Math.sin(V.th);
    let spot=null;
    const sd=V.spec.side,fr=V.spec.cols[0][0]+1.3;
    for(const side of [1,-1,0]){const x=side?V.x+sx*sd*side:V.x+Math.sin(V.th)*fr,z=side?V.z+sz*sd*side:V.z+Math.cos(V.th)*fr;if(!hits(x,z,0.35)){spot={x,z};break;}}
    if(!spot){toast("Pas de place pour débarquer ici");return;}
    S.mode='foot';
    scene.add(player.g);player.g.visible=camMode!=='fp';P.x=spot.x;P.z=spot.z;P.rot=V.th;
    player.legL.rotation.set(0,0,0);player.legR.rotation.set(0,0,0);player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);updateToolVisual();
  }
}
function doAct(){const c=context();if(c.full)toast('C\'est plein !');if(c.act)c.act.fn();}
function doAct2(){const c=context();if(c.act2)c.act2.fn();}
/* ---------- Mise à jour : à pied ---------- */
const camRight=new T.Vector3(),camFwd=new T.Vector3();
function updateFoot(dt){
  const inp=readInput(true);
  let dx=0,dz=0;
  if(Math.abs(inp.x)+Math.abs(inp.y)>0.08){
    P.target=null;marker.visible=false;
    dx=camRight.x*inp.x+camFwd.x*inp.y;dz=camRight.z*inp.x+camFwd.z*inp.y;
  }else if(P.target){
    const tx=P.target.x-P.x,tz=P.target.z-P.z,d=Math.hypot(tx,tz);
    if(d<0.25){P.target=null;}else{dx=tx/d;dz=tz/d;}
  }
  if(P.swing>0){dx=dz=0;}
  const amt=Math.min(1,Math.hypot(dx,dz));
  const run=(keys.ShiftLeft||keys.ShiftRight)&&!P.carry;
  const carrySpeed=P.carry?clamp(4.2-2.5*Math.pow(P.carry.len/CARRY_MAX,1.2),1.6,4.0):0;
  const speed=(P.carry?carrySpeed:run?6.5:4.2)*(1-0.4*mudAt(P.x,P.z));
  if(amt>0.01){
    const p={x:P.x+dx*speed*dt,z:P.z+dz*speed*dt};
    pushOut(p,0.35);
    bodyCircles(null).forEach(c=>pushCircle(p,0.35,c[0],c[1],c[2]));
    const B=WORLD-1.5;p.x=clamp(p.x,-B,B);p.z=clamp(p.z,-B,B);
    const moved=Math.hypot(p.x-P.x,p.z-P.z);
    if(P.target&&moved<speed*dt*0.15){P.target=null;marker.visible=false;}
    P.x=p.x;P.z=p.z;
    P.rot+=wrapAng(Math.atan2(dx,dz)-P.rot)*Math.min(1,dt*12);
    P.phase+=dt*speed*2.2;
  }
  const sw=amt>0.01?Math.sin(P.phase)*0.7:0;
  player.legL.rotation.x=lerp(player.legL.rotation.x,sw,0.3);player.legR.rotation.x=lerp(player.legR.rotation.x,-sw,0.3);
  if(P.cool>0)P.cool=Math.max(0,P.cool-dt);
  if(P.swing>0){
    P.swing+=dt;const a=P.swing;
    const u=a/P.swingDur*0.75;
    let r;
    if(TOOL.kind==='axe')r=u<0.3?lerp(0,-2.7,u/0.3):u<0.42?lerp(-2.7,-0.7,(u-0.3)/0.12):lerp(-0.7,0,Math.min(1,(u-0.42)/0.33));
    else if(TOOL.kind==='saw')r=-1.25+Math.sin(u*26)*0.3;
    else r=-1.15+Math.sin(u*90)*0.05;
    player.armR.rotation.x=r;player.armL.rotation.x=r;
    if(u>=0.42&&!P.struck){P.struck=true;if(P.onStrike)P.onStrike();}
    if(u>=0.75)P.swing=0;
  }else if(P.carry){
    player.armR.rotation.x=lerp(player.armR.rotation.x,-2.75,0.3);player.armL.rotation.x=lerp(player.armL.rotation.x,-sw*0.5,0.3);
  }else{
    player.armL.rotation.x=lerp(player.armL.rotation.x,-sw*0.8,0.3);player.armR.rotation.x=lerp(player.armR.rotation.x,sw*0.8,0.3);
  }
  player.g.position.set(P.x,H(P.x,P.z)+(amt>0.01?Math.abs(Math.cos(P.phase))*0.05:0),P.z);
  player.g.rotation.y=P.rot;
  if(marker.visible){marker.material.opacity=0.5+0.3*Math.sin(S.time*6);}
}

/* ---------- Mise à jour : VTT ---------- */
function vehCircles(v,x,z,th){const fx=Math.sin(th),fz=Math.cos(th);return v.spec.cols.map(([o,r])=>[x+fx*o,z+fz*o,r]);}
function trCircles(t,x,z,th){const fx=Math.sin(th),fz=Math.cos(th);return t.spec.cols.map(([o,r])=>[x+fx*o,z+fz*o,r]);}
function bodyCircles(except){
  const a=[];vehicles.forEach(v=>{if(v!==except)a.push(...vehCircles(v,v.x,v.z,v.th));});
  trailers.forEach(t=>{if(!except||t.hitch!==except)a.push(...trCircles(t,t.x,t.z,t.th));});
  return a;
}
function circlesHit(list,others){for(const c of list){if(hits(c[0],c[1],c[2]))return true;for(const o of others){const dx=c[0]-o[0],dz=c[1]-o[1],rr=c[2]+o[2];if(dx*dx+dz*dz<rr*rr)return true;}}return false;}
function trailerFollow(t,hx,hz,th){
  let dx=hx-t.x,dz=hz-t.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  const tth=Math.atan2(dx,dz);
  return {x:hx-Math.sin(tth)*t.spec.tl,z:hz-Math.cos(tth)*t.spec.tl,th:tth,rel:wrapAng(tth-th)};
}
const JACK=110*Math.PI/180;
function updateVehicle(v,dt){
  const sp=v.spec,driving=S.mode==='vtt'&&V===v;
  let steerIn=0,thr=0;
  if(driving){
    const inp=readInput(false);
    steerIn=-inp.x;
    const ky=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0);
    thr=clamp(ky+(pedal.gas?1:0)-(pedal.brake?1:0),-1,1);
  }
  const tw=towed(v);
  const mud=mudAt(v.x,v.z),load=(tw?tw.c.load.length*(tw.kind==='loader'?0.8:1):0)+(v.bed?v.bed.load.length*0.6:0);
  const gr=ground(v.x,v.z,v.th,sp.hl,sp.hw,null);
  let maxF=sp.maxF*(1-sp.mudLoss*mud)*(1-0.03*load),maxR=sp.maxR*(1-0.4*mud);
  let acc=sp.acc*(1-Math.max(0,sp.mudLoss-0.05)*mud)/(1+0.1*load);
  if(v.drag){maxF*=0.65;acc*=0.7;}
  if(thr>0.05){if(v.v<-0.2)v.v+=11*thr*dt;else v.v+=acc*thr*dt;}
  else if(thr<-0.05){if(v.v>0.2)v.v-=13*(-thr)*dt;else v.v-=acc*0.6*(-thr)*dt;}
  else{const dec=(2.6+4*mud)*dt;v.v=Math.abs(v.v)<dec?0:v.v-Math.sign(v.v)*dec;}
  v.v-=9.8*gr.slope*0.3*dt;
  if(v.v>maxF)v.v=lerp(v.v,maxF,1-Math.exp(-3*dt));
  if(v.v<-maxR)v.v=lerp(v.v,-maxR,1-Math.exp(-3*dt));
  if(!driving&&Math.abs(v.v)<0.3)v.v=0;
  const maxSt=sp.steer*(1-0.45*Math.min(1,Math.abs(v.v)/sp.maxF));
  v.steer=lerp(v.steer,steerIn*maxSt,1-Math.exp(-8*dt));
  if(v.v!==0){
    const B=WORLD-3;
    const step=vv=>{const nth=v.th+vv*Math.tan(v.steer)/sp.wb*dt;const nx=clamp(v.x+Math.sin(nth)*vv*dt,-B,B),nz=clamp(v.z+Math.cos(nth)*vv*dt,-B,B);
      return {nth,nx,nz,tr:tw?trailerFollow(tw,nx-Math.sin(nth)*sp.hitch,nz-Math.cos(nth)*sp.hitch,nth):null};};
    let st=step(v.v);
    if(st.tr&&Math.abs(st.tr.rel)>JACK){
      if(Math.abs(v.v)>1){v.v=Math.sign(v.v);st=step(v.v);}
      if(Math.abs(st.tr.rel)>JACK){
        const sg=Math.sign(st.tr.rel),th2=st.nth+sg*JACK,hx=st.nx-Math.sin(st.nth)*sp.hitch,hz=st.nz-Math.cos(st.nth)*sp.hitch;
        st.tr={x:hx-Math.sin(th2)*tw.spec.tl,z:hz-Math.cos(th2)*tw.spec.tl,th:th2,rel:sg*JACK};
      }
    }
    const others=bodyCircles(v);
    if(circlesHit(vehCircles(v,st.nx,st.nz,st.nth),others)||(st.tr&&circlesHit(trCircles(tw,st.tr.x,st.tr.z,st.tr.th),others))){
      if(driving&&Math.abs(v.v)>4)toast('Bang ! 💥');
      v.v=Math.abs(v.v)<1.5?0:-v.v*0.25;
    }else{v.x=st.nx;v.z=st.nz;v.th=st.nth;if(st.tr){tw.x=st.tr.x;tw.z=st.tr.z;tw.th=st.tr.th;}}
  }
  v.spin+=v.v*dt/sp.wr;
  const g1=ground(v.x,v.z,v.th,sp.hl,sp.hw,_q);
  v.q.slerp(_q,1-Math.exp(-12*dt));
  v.mesh.g.position.set(v.x,g1.h,v.z);v.mesh.g.quaternion.copy(v.q);
  v.mesh.wheels.forEach(w=>w.rotation.x=v.spin);
  v.mesh.pivots.forEach(p=>p.rotation.y=v.steer);
  if(v.mesh.front){v.mesh.front.rotation.y=v.steer*0.7;v.mesh.rear.rotation.y=-v.steer*0.7;}
  if(tw)tw.mesh.wheels.forEach(w=>w.rotation.x+=v.v*dt/tw.spec.wr);
  updateDrag(v);
}
const TILT={};
const skidMark=new T.Mesh(new T.RingGeometry(0.45,0.7,24),new T.MeshBasicMaterial({color:0x5fe07a,transparent:true,opacity:0.85,side:T.DoubleSide,depthTest:false}));
skidMark.rotation.x=-Math.PI/2;skidMark.renderOrder=15;skidMark.visible=false;scene.add(skidMark);
function updateVTT(dt){
  vehicles.forEach(v=>updateVehicle(v,dt));
  trailers.forEach(t=>{
    const g2=ground(t.x,t.z,t.th,t.spec.hl,t.spec.hw,_q);
    if(!t.hitch){if(!TILT[t.kind])TILT[t.kind]=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),t.spec.tilt);_q.multiply(TILT[t.kind]);}
    t.q.slerp(_q,1-Math.exp(-(t.hitch?12:5)*dt));
    t.mesh.g.position.set(t.x,g2.h,t.z);t.mesh.g.quaternion.copy(t.q);
    t.mark.visible=!t.hitch;
    if(!t.hitch){const p=tongue(t);t.mark.position.set(p.x,H(p.x,p.z)+0.08,p.z);t.mark.material.color.set(vehicles.some(v=>canAttach(v,t))?0x5fe07a:0xffc83d);}
    if(t.crane)updateCrane(t,dt);
  });
  skidMark.visible=false;
  if(S.mode==='vtt'&&V.type==='skid'&&!V.drag){const c=skidCandidate(V);if(c){skidMark.visible=true;skidMark.position.set(c.p.x,H(c.p.x,c.p.z)+0.1,c.p.z);}}
}

/* ---------- Flèche ---------- */
function updateArrow(){
  let ox,oz,tx,tz;
  if(S.mode==='crane'){arrow.visible=false;return;}
  if(S.mode==='foot'){
    ox=P.x;oz=P.z;
    if(P.carry){const c=containers().filter(c=>c.load.length<c.cap).map(c=>c.center()).sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z))[0];if(c){tx=c.x;tz=c.z;}else{tx=YARD.x;tz=YARD.z;}}
    else if(Math.hypot(V.x-P.x,V.z-P.z)>14&&!pieces.some(carryable)){tx=V.x;tz=V.z;}
  }else{
    ox=V.x;oz=V.z;
    const tw=towed(V);
    if((tw&&tw.c.load.length)||(V.bed&&V.bed.load.length)||V.drag){tx=YARD.x;tz=YARD.z;}
  }
  if(tx===undefined||Math.hypot(tx-ox,tz-oz)<8){arrow.visible=false;return;}
  arrow.visible=true;
  arrow.position.set(ox,H(ox,oz)+(S.mode==='foot'?2.9:V.spec.arrowY)+Math.sin(S.time*3)*0.12,oz);
  arrow.rotation.y=Math.atan2(tx-ox,tz-oz);
}

/* ---------- HUD ---------- */
let lastHud='';
function updateHUD(){
  const c=context();
  const be=$('btnEnter'),ba=$('btnAct');
  be.classList.toggle('hidden',!c.enter);
  if(c.enter)be.textContent=c.enter+(isTouch?'':' (E)');
  ba.classList.toggle('hidden',!c.act);
  if(c.act)ba.textContent=c.act.label+(isTouch?'':' (Espace)');
  const cooling=!!(c.act&&c.act.cool&&(P.cool>0));
  ba.classList.toggle('cool',cooling);
  ba.style.setProperty('--p',cooling?(100*(1-P.cool/TOOL.delay)).toFixed(0)+'%':'100%');
  const b2=$('btnAct2');b2.classList.toggle('hidden',!c.act2);
  if(c.act2)b2.textContent=c.act2.label+(isTouch?'':' (F)');
  b2.classList.toggle('cool',!!(c.act2&&P.cool>0));
  updatePreview(c.preview);
  const hc=hitchCtx(),bh=$('btnHitch');
  bh.classList.toggle('hidden',!hc);
  if(hc)bh.textContent=hc.label+(isTouch?'':' (R)');
  $('pedals').classList.toggle('hidden',!(isTouch&&S.mode==='vtt'));
  $('gripBtns').classList.toggle('hidden',!(isTouch&&S.mode==='crane'));
  let hint=c.info||'';
  if(S.mode==='foot'&&!hint){
    if(P.swing>0||(c.act&&c.act.cool&&P.cool>0))hint='Reprends ton souffle…';
    else if(c.full)hint='C\'est plein : rapporte le chargement à la cour à bois';
    else if(P.carry&&c.act&&c.act.fn===dropLog)hint='Billot sur l\'épaule : va le mettre dans une remorque ou une boîte';
    else if(!P.carry&&!c.act&&!c.enter&&!hc)hint=pieces.some(carryable)?'Va chercher les billots par terre':'Approche-toi d\'un arbre pour le bûcher';
  }
  else if(S.mode==='vtt'&&!hint){
    const tw=towed(V);
    const hasLoad=(tw&&tw.c.load.length)||(V.bed&&V.bed.load.length);
    const atYard=(tw&&tw.c.load.length&&containerAtYard(tw.c))||(V.bed&&V.bed.load.length&&containerAtYard(V.bed));
    const near=(!tw&&V.spec.hitch)?trailers.find(t=>!t.hitch&&Math.hypot(t.x-V.x,t.z-V.z)<9):null;
    if(near)hint=canAttach(V,near)?(Math.abs(V.v)<0.8?'':'Arrête-toi pour atteler'):`Recule le crochet du ${V.spec.name} jusqu'au cercle du timon`;
    else if(V.drag)hint='Traîne la tige jusqu\'au chemin ou à la cour, puis relâche-la (Espace)';
    else if(V.type==='skid'&&!c.act)hint='Recule la pince arrière jusqu\'au bout d\'une tige';
    else if(atYard)hint='Débarque et corde les billots dans le cercle jaune';
    else if(hasLoad)hint='Direction la cour à bois du camp';
    else if(mudAt(V.x,V.z)>0.3)hint='Boue ! Ça avance moins vite…';
  }
  const loadTxt=trailers.map(t=>`${t.spec.label} : ${t.c.load.length}/${t.c.cap}`).concat(vehicles.filter(v=>v.bed).map(v=>`Boîte : ${v.bed.load.length}/${v.bed.cap}`)).join(' · ');
  const hud=`${S.money}|${S.delivered}|${loadTxt}|${S.mode}|${Math.round(Math.abs(V.v)*3.6)}|${hint}`;
  if(hud===lastHud)return;lastHud=hud;
  $('sMoney').textContent=S.money+' $';$('sTool').textContent=TOOL.name;$('sDel').textContent=S.delivered;$('sLoad').textContent=loadTxt;
  $('sSpeedWrap').classList.toggle('hidden',S.mode!=='vtt');$('sSpeed').textContent=Math.round(Math.abs(V.v)*3.6);
  $('hint').textContent=hint;
}

/* ---------- Boucle ---------- */
const clock=new T.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),0.05);S.time+=dt;
  camAz+=(camAzT-camAz)*(1-Math.exp(-8*dt));
  if(camMode!=='iso'){
    if(S.mode==='vtt')camYawT=camYaw+wrapAng(V.th-camYaw);
    camYaw+=wrapAng(camYawT-camYaw)*(1-Math.exp(-(S.mode==='vtt'?3:10)*dt));
    camFwd.set(Math.sin(camYaw),0,Math.cos(camYaw));camRight.set(-Math.cos(camYaw),0,Math.sin(camYaw));
  }else{
    camRight.set(Math.cos(camAz),0,-Math.sin(camAz));camFwd.set(-Math.sin(camAz),0,-Math.cos(camAz));
  }
  if(S.mode==='foot')updateFoot(dt);
  updateVTT(dt);
  updateFalling(dt);
  updateArrow();updateHUD();
  let gx,gz;
  if(S.mode==='foot'){gx=P.x;gz=P.z;}else if(S.mode==='crane'){const g=gripWorld(P.crTr);gx=(P.x+g.x)/2;gz=(P.z+g.z)/2;}else{gx=V.x+Math.sin(V.th)*V.v*0.35;gz=V.z+Math.cos(V.th)*V.v*0.35;}
  if(camMode!=='iso'&&S.mode!=='crane'){gx=S.mode==='foot'?P.x:V.x;gz=S.mode==='foot'?P.z:V.z;}
  const goal=new T.Vector3(gx,H(gx,gz),gz);
  camT.lerp(goal,1-Math.exp(-(camMode!=='iso'?14:6)*dt));
  if(camMode!=='iso'&&S.mode==='crane'){
    const g=gripWorld(P.crTr),ey=H(P.x,P.z)+1.68;
    if(camMode==='fp'){pcam.position.set(P.x,ey,P.z);}
    else{let dx=g.x-P.x,dz=g.z-P.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;pcam.position.set(P.x-dx*5*chaseDist,ey+1.8,P.z-dz*5*chaseDist);}
    pcam.lookAt(g.x,g.y-0.6,g.z);
  }else if(camMode==='fp'){
    if(S.mode==='vtt'){
      const vg=V.mesh.g,e=V.spec.eye;vg.updateMatrixWorld();pcam.position.copy(vg.localToWorld(_v.set(e[0],e[1],e[2])));
      pcam.lookAt(vg.localToWorld(_v.set(e[0],e[1]-0.3,12)));
    }else{
      pcam.position.set(P.x,H(P.x,P.z)+1.68,P.z);
      const cp=Math.cos(camPitch);
      pcam.lookAt(P.x+Math.sin(camYaw)*cp,H(P.x,P.z)+1.68+Math.sin(camPitch),P.z+Math.cos(camYaw)*cp);
    }
  }else if(camMode==='tp'){
    const car=S.mode==='vtt',dist=(car?V.spec.cam[0]:5.5)*chaseDist,ht=(car?V.spec.cam[1]:2.4)*Math.sqrt(chaseDist);
    let cx=camT.x-camFwd.x*dist,cz=camT.z-camFwd.z*dist;
    const cy=Math.max(camT.y+ht,H(cx,cz)+1.2);
    pcam.position.set(cx,cy,cz);
    pcam.lookAt(camT.x+camFwd.x*2,camT.y+(car?1.2:1.5),camT.z+camFwd.z*2);
  }else{
    const D=120;
    camera.position.set(camT.x+Math.sin(camAz)*Math.cos(ELEV)*D,camT.y+Math.sin(ELEV)*D,camT.z+Math.cos(camAz)*Math.cos(ELEV)*D);
    camera.lookAt(camT);
  }
  sun.position.set(camT.x+28,camT.y+50,camT.z+12);sun.target.position.copy(camT);sun.target.updateMatrixWorld();
  renderer.render(scene,activeCam);
  requestAnimationFrame(frame);
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);updateProj();});
requestAnimationFrame(frame);
})();
