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
const YARD={x:0,z:0,r:4.2};          // cour à bois de la scierie, au village (position fixée plus bas)
const OLD_YARD={x:8,z:6};             // ancienne cour au camp : garde la même forêt pour les sauvegardes
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
scene.background=new T.Color(0xbcd3e2);
/* Ciel : un dôme qui suit la caméra, dégradé bleu + nuages qui dérivent (calculés dans le shader, une seule
   petite géométrie, pas de texture). Visible surtout en vue 3e et 1re personne. */
const SKY_HORIZON=0xd6e6f0;
const skyMat=new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uTop:{value:new T.Color(0x2f6fbf)},uMid:{value:new T.Color(0x78acdc)},uHor:{value:new T.Color(SKY_HORIZON)},uSun:{value:new T.Vector3(0.45,0.75,0.2).normalize()}},
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*0.9999;}',
  fragmentShader:`uniform float uTime;uniform vec3 uTop,uMid,uHor,uSun;varying vec3 vDir;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){return n(p)*0.55+n(p*2.03+3.1)*0.28+n(p*4.11+7.7)*0.17;}
    void main(){
      vec3 d=normalize(vDir);float y=d.y;
      vec3 c=mix(uHor,uMid,smoothstep(-0.02,0.25,y));c=mix(c,uTop,smoothstep(0.25,0.9,y));
      float s=max(dot(d,uSun),0.0);c+=vec3(1.0,0.93,0.75)*(pow(s,600.0)*1.6+pow(s,12.0)*0.18);
      if(y>0.0){
        vec2 uv=d.xz/(y+0.12)*1.6+vec2(uTime*0.012,uTime*0.004);
        float k=smoothstep(0.52,0.78,fbm(uv))*smoothstep(0.0,0.18,y);
        vec3 cc=mix(vec3(0.82,0.85,0.9),vec3(1.0),smoothstep(0.55,0.85,fbm(uv+0.35)));
        c=mix(c,cc,k*0.85);
      }
      gl_FragColor=vec4(c,1.0);
    }`,
  side:T.BackSide,depthWrite:false,fog:false
});
const sky=new T.Mesh(new T.SphereGeometry(300,24,12),skyMat);sky.renderOrder=-10;sky.frustumCulled=false;sky.visible=false;scene.add(sky);

let zoom=isTouch?11:14;const ZMIN=6,ZMAX=32;
const camera=new T.OrthographicCamera(-1,1,1,-1,1,500);
const pcam=new T.PerspectiveCamera(60,viewW()/viewH(),0.1,400);
let camMode='iso',activeCam=camera,camYaw=0,camYawT=0,chaseDist=1,camPitch=-0.1,camVehOff=0,camTpTilt=0;   // camVehOff : regard tourné par rapport au véhicule
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
// Fusionne plusieurs géométries en une seule (un seul objet à dessiner : plus rapide)
function mergeGeos(list){
  const pos=[],nor=[],uv=[],col=[],groups=[];let off=0;const hasC=list.every(g=>g.attributes.color);
  list.forEach(g0=>{
    const g=g0.index?g0.toNonIndexed():g0,a=g.attributes,n=a.position.count;
    pos.push(...a.position.array);nor.push(...a.normal.array);uv.push(...(a.uv?a.uv.array:new Float32Array(n*2)));if(hasC)col.push(...a.color.array);
    (g.groups.length?g.groups:[{start:0,count:n,materialIndex:0}]).forEach(gr=>groups.push({start:gr.start+off,count:gr.count,m:gr.materialIndex}));
    off+=n;
  });
  const out=new T.BufferGeometry();
  // Regroupe les triangles par matériau : un seul appel de dessin par matériau
  const mats=[...new Set(groups.map(g=>g.m))];
  if(mats.length>1&&groups.length>mats.length){
    const P=[],N=[],U=[],C=[];let st=0;
    mats.sort((x,y)=>x-y).forEach(m=>{const s0=st;groups.filter(g=>g.m===m).forEach(g=>{for(let i=g.start;i<g.start+g.count;i++){P.push(pos[i*3],pos[i*3+1],pos[i*3+2]);N.push(nor[i*3],nor[i*3+1],nor[i*3+2]);U.push(uv[i*2],uv[i*2+1]);if(hasC)C.push(col[i*3],col[i*3+1],col[i*3+2]);st++;}});out.addGroup(s0,st-s0,m);});
    out.setAttribute('position',new T.Float32BufferAttribute(P,3));out.setAttribute('normal',new T.Float32BufferAttribute(N,3));out.setAttribute('uv',new T.Float32BufferAttribute(U,2));if(hasC)out.setAttribute('color',new T.Float32BufferAttribute(C,3));return out;
  }
  out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  if(hasC)out.setAttribute('color',new T.Float32BufferAttribute(col,3));
  groups.forEach(g=>out.addGroup(g.start,g.count,g.m));return out;
}
// Fusionne les enfants directs d'un groupe statique qui partagent un matériau (moins d'appels de dessin sur téléphone)
function bakeStatic(g){
  g.updateMatrixWorld(true);const inv=new T.Matrix4().copy(g.matrixWorld).invert(),by=new Map();
  g.children.forEach(o=>{if(!o.isMesh||Array.isArray(o.material)||o.children.length||o.geometry.attributes.color||o.material.transparent)return;const k=o.material.uuid;if(!by.has(k))by.set(k,[]);by.get(k).push(o);});
  by.forEach(list=>{if(list.length<2)return;
    const geos=list.map(o=>o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld)));
    const m=new T.Mesh(mergeGeos(geos),list[0].material);list.forEach(o=>g.remove(o));g.add(m);});
  return g;
}
// Profil vu de côté (u : vers l'avant, v : vers le haut) extrudé sur la largeur, centré
function sideExtrude(shape,width,bevel){
  const g=new T.ExtrudeGeometry(shape,{depth:width-2*(bevel||0),bevelEnabled:!!bevel,bevelThickness:bevel||0,bevelSize:bevel||0,bevelSegments:2,curveSegments:10});
  g.translate(0,0,-(width-2*(bevel||0))/2);g.rotateY(-Math.PI/2);return g;
}
function cyl(r,len,seg){const g=new T.CylinderGeometry(r,r,len,seg||8);return g;}
function shadows(o){o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});}
// Textures dessinées : cernes au bout des billots, écorce propre à chaque essence
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.anisotropy=4;return t;}
const RING_TEX=canvasTex(128,128,(g,w)=>{
  const cx=64,cy=64;let seed=7;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  g.fillStyle='#5a4330';g.fillRect(0,0,w,w);
  g.fillStyle='#dcb684';g.beginPath();g.arc(cx,cy,58,0,Math.PI*2);g.fill();
  for(let k=54;k>2;k-=3+r()*3){g.strokeStyle=`rgba(${150+r()*30},${100+r()*20},${60},${0.35+r()*0.3})`;g.lineWidth=1+r()*1.2;g.beginPath();g.ellipse(cx+r()*1.5,cy+r()*1.5,k,k*(0.96+r()*0.06),r(),0,Math.PI*2);g.stroke();}
  g.fillStyle='#8a5e38';g.beginPath();g.arc(cx,cy,2.5,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(90,60,35,0.6)';g.lineWidth=1;for(let k=0;k<2;k++){const a=r()*6.28;g.beginPath();g.moveTo(cx+Math.cos(a)*6,cy+Math.sin(a)*6);g.lineTo(cx+Math.cos(a)*(30+r()*20),cy+Math.sin(a)*(30+r()*20));g.stroke();}
  g.strokeStyle='#3e2c1e';g.lineWidth=7;g.beginPath();g.arc(cx,cy,61,0,Math.PI*2);g.stroke();
});
function barkTex(base,dark,birch){return canvasTex(128,128,(g,w,h)=>{
  let seed=birch?11:5+base.length;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  g.fillStyle=base;g.fillRect(0,0,w,h);
  if(birch){
    for(let k=0;k<70;k++){g.fillStyle=r()<0.7?'rgba(40,36,32,0.85)':'rgba(120,110,100,0.5)';const y=r()*h,x=r()*w;g.fillRect(x,y,4+r()*20,1.5+r()*2.5);}
    for(let k=0;k<6;k++){g.fillStyle='rgba(30,28,26,0.8)';const x=r()*w,y=r()*h;g.beginPath();g.ellipse(x,y,6+r()*8,3+r()*4,0,0,Math.PI*2);g.fill();}
  }else{
    // Sillons verticaux qui ondulent
    for(let k=0;k<26;k++){g.strokeStyle=dark;g.globalAlpha=0.35+r()*0.45;g.lineWidth=1.5+r()*3;let x=r()*w;g.beginPath();g.moveTo(x,0);for(let y=0;y<=h;y+=16){x+=(r()-0.5)*6;g.lineTo(x,y);}g.stroke();}
    g.globalAlpha=1;for(let k=0;k<40;k++){g.fillStyle=`rgba(255,255,255,${0.04+r()*0.06})`;g.fillRect(r()*w,r()*h,2+r()*6,6+r()*14);}
  }
})}
const BARK={erable:barkTex('#6b5a4a','#3a2d22'),epinette:barkTex('#5e4632','#2f2218'),sapin:barkTex('#7a7268','#4a4540'),bouleau:barkTex('#ece8de','#222',true)};
const RING_M=new T.MeshPhongMaterial({map:RING_TEX,flatShading:false,shininess:4});RING_M.userData.shared=true;
const LOG_MATS={};
function logMatsFor(sp){if(!LOG_MATS[sp]){const b=new T.MeshPhongMaterial({map:BARK[sp]||BARK.erable,flatShading:true,shininess:3});b.userData.shared=true;LOG_MATS[sp]=[b,RING_M,RING_M];}return LOG_MATS[sp];}

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
    const patch=vilF*(0.38+0.25*Math.sin(x*0.55+1.7)*Math.cos(z*0.47));
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

/* ---------- Bâtiments : outils communs ---------- */
// Revêtements dessinés (déclin horizontal, planches verticales, bardeaux, tôle) ; repeat = nombre de rangs
function sidingTex(base,line,vertical){return canvasTex(64,64,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);g.fillStyle=line;
  if(vertical){g.fillRect(0,0,4,h);g.fillStyle='rgba(255,255,255,0.08)';g.fillRect(5,0,3,h);}else{g.fillRect(0,h-6,w,6);g.fillStyle='rgba(255,255,255,0.1)';g.fillRect(0,0,w,4);}});}
function shingleTex(base,line){return canvasTex(64,64,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);g.fillStyle=line;g.fillRect(0,h-5,w,5);g.fillRect(w/2-1,0,3,h/2);g.fillRect(0,h/2,3,h/2);g.fillStyle='rgba(255,255,255,0.07)';g.fillRect(0,0,w,8);});}
function tinTex(){return canvasTex(64,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);for(let k=0;k<=8;k++)gr.addColorStop(k/8,k%2?'#6f777b':'#9aa2a6');g.fillStyle=gr;g.fillRect(0,0,w,h);});}
function texMat(tex,rx,ry,extra){const t=tex.clone();t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);return new T.MeshPhongMaterial(Object.assign({map:t,flatShading:true,shininess:4},extra||{}));}
// Toit à deux versants, faîte selon x, avec revêtement
function roofTex(g,w,d,y,m,pitch,over){pitch=pitch||0.62;over=over||0.5;const L=d/2/Math.cos(pitch)+over;
  [1,-1].forEach(sd=>{const r=new T.Mesh(new T.BoxGeometry(w+0.6,0.16,L),m);r.position.set(0,y,sd*(L/2*Math.cos(pitch)-0.05));r.rotation.x=sd*pitch;g.add(r);});
  const cap=new T.Mesh(new T.BoxGeometry(w+0.7,0.12,0.22),mat(0x3a3430));cap.position.set(0,y+L/2*Math.sin(pitch)+0.04,0);g.add(cap);}
// Pignon triangulaire (dans le plan z-y) à x donné
function gable(w,d,y,rise,x){const sh=new T.Shape();sh.moveTo(-d/2,y);sh.lineTo(d/2,y);sh.lineTo(0,y+rise);sh.lineTo(-d/2,y);return sideExtrude(sh,0.12,0).translate(x,0,0);}
// Fenêtre à carreaux avec cadre et appui, posée sur une façade (normale +z dans le repère du groupe)
function windowGeo(w,h,x,y,z,ry){
  const fr=[new T.BoxGeometry(w+0.16,0.08,0.08).translate(0,h/2+0.04,0),new T.BoxGeometry(w+0.16,0.08,0.08).translate(0,-h/2-0.04,0),new T.BoxGeometry(0.08,h,0.08).translate(w/2+0.04,0,0),new T.BoxGeometry(0.08,h,0.08).translate(-w/2-0.04,0,0),
    new T.BoxGeometry(0.04,h,0.05).translate(0,0,0.01),new T.BoxGeometry(w,0.04,0.05).translate(0,0,0.01),new T.BoxGeometry(w+0.3,0.06,0.16).translate(0,-h/2-0.1,0.06)];
  const m=mergeGeos(fr);m.rotateY(ry||0);m.translate(x,y,z);
  const gl=new T.PlaneGeometry(w,h);gl.rotateY(ry||0);gl.translate(x,y,z-0.01*Math.cos(ry||0));
  return {frame:m,glass:gl};
}
// Porte en planches avec cadre et poignée
function doorGeo(w,h,x,z,ry){
  const p=[];for(let k=0;k<4;k++)p.push(new T.BoxGeometry(w/4-0.01,h,0.06).translate(-w/2+w/8+k*w/4,h/2,0));
  p.push(new T.BoxGeometry(w,0.1,0.08).translate(0,h*0.25,0.03),new T.BoxGeometry(w,0.1,0.08).translate(0,h*0.75,0.03),new T.BoxGeometry(w*0.9,0.08,0.07).rotateZ(Math.atan2(h*0.5,w*0.9)).translate(0,h/2,0.03));
  const door=mergeGeos(p);door.rotateY(ry||0);door.translate(x,0,z);
  const frame=mergeGeos([new T.BoxGeometry(w+0.2,0.1,0.1).translate(0,h+0.05,0),new T.BoxGeometry(0.1,h,0.1).translate(w/2+0.05,h/2,0),new T.BoxGeometry(0.1,h,0.1).translate(-w/2-0.05,h/2,0)]);frame.rotateY(ry||0);frame.translate(x,0,z);
  const knob=new T.SphereGeometry(0.045,8,6).translate(w/2-0.12,h*0.48,0.08);knob.rotateY(ry||0);knob.translate(x,0,z);
  return {door,frame,knob};
}
// Murs en rondins empilés, bouts qui dépassent aux coins
function logWalls(w,d,h,r){
  const front=[],side=[];r=r||0.15;const n=Math.round(h/(2*r));
  for(let k=0;k<n;k++){const y=r+k*2*r;
    [1,-1].forEach(sd=>{front.push(new T.CylinderGeometry(r,r,w+0.55,9).rotateZ(Math.PI/2).translate(0,y,sd*d/2));
      if(k<n-1)side.push(new T.CylinderGeometry(r,r,d+0.55,9).rotateX(Math.PI/2).translate(sd*w/2,y+r,0));});}
  return mergeGeos([...front,...side]);
}
// Pierres empilées (cheminée, fondation) : petites boîtes aux teintes variées
function stoneStack(w,d,h,x,y,z,seed){
  const parts=[];let sd=seed||3;const r=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};
  for(let yy=0;yy<h-0.01;yy+=0.18)for(let xx=-w/2;xx<w/2-0.01;xx+=0.26)for(const side of [0,1,2,3]){
    const sw=0.24+r()*0.04,sh=0.16;let g=new T.BoxGeometry(sw,sh,0.08);
    if(side<2)g.translate(xx+0.13+(yy*7%2?0.06:0)-0.03,yy+0.09,(side?-1:1)*(d/2-0.04));else{g=new T.BoxGeometry(0.08,sh,sw);g.translate((side===2?1:-1)*(w/2-0.04),yy+0.09,xx*d/w+0.13*d/w);}
    const v=0.75+r()*0.35;parts.push(paintGeo(g.toNonIndexed(),()=>v));}
  parts.push(paintGeo(new T.BoxGeometry(w-0.1,h,d-0.1).translate(0,h/2,0).toNonIndexed(),()=>0.6));
  const out=mergeGeos(parts);out.translate(x,y,z);return out;
}
// Cercle de pierres irrégulières aux teintes variées (feu de camp, foyer)
function stoneRing(n,R,size,seed){let sd=seed||5;const r=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};const parts=[];
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2+r()*0.2,sz=size*(0.8+r()*0.45),g=new T.DodecahedronGeometry(sz,0).toNonIndexed();
    g.scale(1.15,0.7,1);g.rotateY(r()*6);g.translate(Math.cos(a)*R,sz*0.5,Math.sin(a)*R);const v=0.72+r()*0.4;parts.push(paintGeo(g,()=>v));}
  const out=mergeGeos(parts);return out;}
const STONE_M=new T.MeshPhongMaterial({color:0x8d8a84,flatShading:true,vertexColors:true,shininess:3});
const CABIN_LOG=new T.MeshPhongMaterial({map:barkTex('#8a6a48','#5a4128'),flatShading:true,shininess:4});
const CABIN_WIN=new T.MeshBasicMaterial({color:0x8fa3ad});   // fenêtres de la cabane (s'allument quand le poêle chauffe)
/* ---------- Camp : cabane, cour à bois, souches ---------- */
{
  // Cabane en rondins : murs empilés, pignons en planches, toit de bardeaux, porte, fenêtres à carreaux, cheminée de pierres
  const g=new T.Group(),W=6,D=4.5,Hh=2.7;
  g.add(new T.Mesh(logWalls(W,D,Hh),[CABIN_LOG,RING_M,RING_M]));
  const plank=texMat(sidingTex('#7a5232','#4d3220',true),1,1);plank.map.repeat.set(8,1);
  g.add(new T.Mesh(mergeGeos([gable(W,D+0.2,Hh+0.1,1.3,W/2),gable(W,D+0.2,Hh+0.1,1.3,-W/2)]),plank));
  const sh=texMat(shingleTex('#5a2a22','#3e1c17'),9,8);roofTex(g,W,D,3.42,sh);
  const dg=doorGeo(0.95,1.9,1.2,D/2+0.17);const dark=mat(0x4d3220);
  g.add(new T.Mesh(dg.door,mat(0x6a4426)),new T.Mesh(dg.frame,dark),new T.Mesh(dg.knob,mat(0x2a2a2a)));
  const wf=[],wg=[];[[-1.4,D/2+0.17,0],[ -W/2-0.17,0.4,-Math.PI/2],[W/2+0.17,-0.3,Math.PI/2]].forEach(([x,z,ry],i)=>{const w=i?0.7:1.0,ww=windowGeo(w,0.75,i?x:x,1.5,i?z:z,ry);wf.push(ww.frame);wg.push(ww.glass);});
  g.add(new T.Mesh(mergeGeos(wf),mat(0xe8e0cc)),new T.Mesh(mergeGeos(wg),CABIN_WIN));
  g.add(new T.Mesh(stoneStack(0.62,0.62,4.4,2.1,0,-0.8,9),new T.MeshPhongMaterial({color:0x8d8a84,flatShading:true,vertexColors:true,shininess:3})));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(W+0.3,0.18,D+0.3).translate(0,0.02,0),new T.BoxGeometry(1.3,0.16,0.5).translate(1.2,0.08,D/2+0.45)]),mat(0x7a756c)));
  g.position.set(CABIN.x,CAMP_H,CABIN.z);
  bakeStatic(g);shadows(g);scene.add(g);
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

/* ---------- Étiquettes ---------- */
const labels=[];
function label(text,x,y,z,range,plain){   // plain : sans fond (émoticônes)
  const cv=document.createElement('canvas');cv.width=512;cv.height=96;const ctx=cv.getContext('2d');
  ctx.font=plain?'72px system-ui,sans-serif':'bold 52px system-ui,sans-serif';const w=ctx.measureText(text).width+48;
  ctx.fillStyle='rgba(30,28,22,0.75)';const x0=(512-w)/2;
  if(!plain){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x0,8,w,80,24);else ctx.rect(x0,8,w,80);ctx.fill();}
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
  // Magasin général : déclin crème, fausse façade avec enseigne, galerie couverte, vitrines
  const textSign=(txt,w,h,bg,fg)=>{const t=canvasTex(512,Math.round(512*h/w),(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle=fg;c.lineWidth=6;c.strokeRect(8,8,W-16,H-16);c.fillStyle=fg;c.font=`bold ${Math.round(H*0.46)}px Georgia,serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,W/2,H/2+2);});return new T.MeshBasicMaterial({map:t});};
  const g=new T.Group(),red=mat(0x8e2b22),dark=mat(0x3b2a1e),win=new T.MeshBasicMaterial({color:0xf4d27a}),wood=mat(0x7a5232),trim=mat(0xf6f1e4);
  const cream=texMat(sidingTex('#e8e0cc','#b9ae96'),1,16);
  g.add(new T.Mesh(new T.BoxGeometry(8,3.6,6).translate(0,1.8,0),cream));
  roofTex(g,8,6,4.05,texMat(shingleTex('#8e2b22','#5e1b15'),10,9));
  g.add(new T.Mesh(new T.BoxGeometry(8.2,1.7,0.2).translate(0,4.25,3.05),cream));
  const sign=new T.Mesh(new T.PlaneGeometry(5.6,0.85),textSign('MAGASIN GÉNÉRAL',5.6,0.85,'#2f5a3a','#f3e6c4'));sign.position.set(0,4.3,3.17);g.add(sign);
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.16,3.6,0.16).translate(4.0,1.8,3.0),new T.BoxGeometry(0.16,3.6,0.16).translate(-4.0,1.8,3.0),new T.BoxGeometry(8.4,0.14,0.18).translate(0,5.1,3.1)]),trim));
  const dg=doorGeo(1.2,2.2,0,3.04);g.add(new T.Mesh(dg.door,mat(0x2f5a3a)),new T.Mesh(dg.frame,trim),new T.Mesh(dg.knob,mat(0xc9a84a)));
  const wf=[],wgl=[];[-2.6,2.6].forEach(x=>{const w=windowGeo(1.6,1.1,x,1.75,3.08,0);wf.push(w.frame);wgl.push(w.glass);});
  [[-4.07,-1.2],[-4.07,1.2]].forEach(([x,z])=>{const w=windowGeo(0.9,0.9,x,2.0,z,-Math.PI/2);wf.push(w.frame);wgl.push(w.glass);});
  g.add(new T.Mesh(mergeGeos(wf),trim),new T.Mesh(mergeGeos(wgl),win));
  // Galerie : plancher, poteaux, garde-corps, toit
  const porch=[new T.BoxGeometry(8.6,0.16,1.9).translate(0,0.08,3.95)];
  [-4.1,-1.4,1.4,4.1].forEach(x=>porch.push(new T.BoxGeometry(0.14,2.9,0.14).translate(x,1.5,4.75)));
  [[-2.75,-4.1,-1.4],[2.75,1.4,4.1]].forEach(([cx,a,b])=>{porch.push(new T.BoxGeometry(b-a,0.08,0.08).translate(cx,0.95,4.75));for(let x=a+0.25;x<b-0.1;x+=0.25)porch.push(new T.BoxGeometry(0.05,0.8,0.05).translate(x,0.5,4.75));});
  porch.push(new T.BoxGeometry(1.4,0.1,0.4).translate(0,0.05,5.05));
  g.add(new T.Mesh(mergeGeos(porch),wood));
  const pr=new T.Mesh(new T.BoxGeometry(8.8,0.12,2.0),texMat(shingleTex('#8e2b22','#5e1b15'),10,3));pr.position.set(0,3.02,3.95);pr.rotation.x=0.12;g.add(pr);
  // Baril et caisses sur la galerie
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.28,0.3,0.8,12).translate(-3.3,0.56,4.3),new T.BoxGeometry(0.6,0.5,0.6).translate(3.2,0.41,4.2),new T.BoxGeometry(0.5,0.4,0.5).translate(3.3,0.86,4.15)]),mat(0x8a6040)));
  const p=vpos(0,-3);g.position.set(p.x,VIL_H,p.z);g.rotation.y=VROT;bakeStatic(g);shadows(g);scene.add(g);bldCols(0,-3,4,3);
  STORE_DOOR=vpos(0,1.9);
  label('Magasin général',p.x,VIL_H+6.6,p.z);
  // Église : déclin blanc, clocher à abat-sons, flèche et croix, hautes fenêtres, perron
  const c=new T.Group(),white=texMat(sidingTex('#f1eee6','#c9c4b8'),1,18),grey=texMat(shingleTex('#5b5f63','#3b3e41'),12,6),silver=mat(0xc7ccd0);
  c.add(new T.Mesh(new T.BoxGeometry(5,4,8).translate(0,2,0),white));
  const rr1=new T.Mesh(new T.BoxGeometry(3.2,0.18,8.4),grey);rr1.position.set(1.25,4.85,0);rr1.rotation.z=-0.62;c.add(rr1);
  const rr2=new T.Mesh(new T.BoxGeometry(3.2,0.18,8.4),grey);rr2.position.set(-1.25,4.85,0);rr2.rotation.z=0.62;c.add(rr2);
  {const sh=new T.Shape();sh.moveTo(-2.5,4);sh.lineTo(2.5,4);sh.lineTo(0,5.75);sh.lineTo(-2.5,4);const gf=new T.ExtrudeGeometry(sh,{depth:0.1,bevelEnabled:false});gf.translate(0,0,3.95);c.add(new T.Mesh(gf,white));const gb=gf.clone();gb.translate(0,0,-8);c.add(new T.Mesh(gb,white));}
  c.add(new T.Mesh(new T.BoxGeometry(1.8,3.0,1.8).translate(0,5.3,3.2),white));
  c.add(new T.Mesh(mergeGeos([0,1,2,3].map(k=>new T.BoxGeometry(0.7,1.0,0.06).translate(0,6.1,0.92).rotateY(k*Math.PI/2).translate(0,0,0))).translate(0,0,3.2),mat(0x2b2b2b)));
  c.add(new T.Mesh(new T.BoxGeometry(2.0,0.14,2.0).translate(0,6.85,3.2),mat(0xe0ddd5)));
  const sp=new T.Mesh(new T.ConeGeometry(1.15,3.2,4),silver);sp.position.set(0,8.5,3.2);sp.rotation.y=Math.PI/4;c.add(sp);
  c.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.08,0.8,0.08).translate(0,10.45,3.2),new T.BoxGeometry(0.45,0.08,0.08).translate(0,10.55,3.2)]),mat(0xd9c27a)));
  const cw=[],cg=[];[-1.2,1.2].forEach(z=>[2.53,-2.53].forEach(x=>{const w=windowGeo(0.7,1.6,x,2.2,z+(z>0?1:-1)*1.4,x>0?Math.PI/2:-Math.PI/2);cw.push(w.frame);cg.push(w.glass);}));
  c.add(new T.Mesh(mergeGeos(cw),mat(0xffffff)),new T.Mesh(mergeGeos(cg),new T.MeshBasicMaterial({color:0x7fa6c9})));
  const cd=doorGeo(1.2,2.3,0,4.02);c.add(new T.Mesh(cd.door,mat(0x6b2a22)),new T.Mesh(cd.frame,mat(0xffffff)),new T.Mesh(cd.knob,mat(0xc9a84a)));
  c.add(new T.Mesh(mergeGeos([new T.BoxGeometry(2.4,0.15,0.5).translate(0,0.075,4.3),new T.BoxGeometry(2.0,0.15,0.4).translate(0,0.225,4.2)]),mat(0x9a958c)));
  const pc=vpos(12,-5);c.position.set(pc.x,VIL_H,pc.z);c.rotation.y=VROT;bakeStatic(c);shadows(c);scene.add(c);bldCols(12,-5,2.5,4);
  // Maison : déclin bleu, volets, cheminée, perron
  [[-10,-10,'#4f6f8f','#2e4458',0x2e2a26]].forEach(([lx,lz,wc,lc,rc])=>{
    const h=new T.Group();h.add(new T.Mesh(new T.BoxGeometry(5,2.8,4.5).translate(0,1.4,0),texMat(sidingTex(wc,lc),1,13)));
    h.add(new T.Mesh(mergeGeos([gable(5,4.5,2.8,1.35,2.5),gable(5,4.5,2.8,1.35,-2.5)]),texMat(sidingTex(wc,lc),1,7)));
    roofTex(h,5,4.5,3.25,texMat(shingleTex('#3a3430','#262220'),8,7));
    const hd=doorGeo(1,1.9,0,2.27);h.add(new T.Mesh(hd.door,mat(0x8e2b22)),new T.Mesh(hd.frame,mat(0xf1eee6)),new T.Mesh(hd.knob,mat(0xc9a84a)));
    const hw=[],hg=[],sh=[];[1.5,-1.5].forEach(x=>{const w=windowGeo(0.9,0.85,x,1.5,2.3,0);hw.push(w.frame);hg.push(w.glass);sh.push(new T.BoxGeometry(0.3,0.9,0.05).translate(x+0.68,1.5,2.3),new T.BoxGeometry(0.3,0.9,0.05).translate(x-0.68,1.5,2.3));});
    h.add(new T.Mesh(mergeGeos(hw),mat(0xf1eee6)),new T.Mesh(mergeGeos(hg),win),new T.Mesh(mergeGeos(sh),mat(0x2a3a2a)));
    h.add(new T.Mesh(stoneStack(0.55,0.55,4.3,-1.6,0,-0.9,21),new T.MeshPhongMaterial({color:0x9a7a6a,flatShading:true,vertexColors:true,shininess:3})));
    h.add(new T.Mesh(new T.BoxGeometry(1.6,0.2,0.8).translate(0,0.1,2.65),mat(0x8a857c)));
    const q=vpos(lx,lz);h.position.set(q.x,VIL_H,q.z);h.rotation.y=VROT;bakeStatic(h);shadows(h);scene.add(h);bldCols(lx,lz,2.5,2.25);
  });
  // Scierie : planches verticales, toit de tôle, grande porte coulissante sur rail, enseigne, appentis
  const s=new T.Group(),plank=texMat(sidingTex('#8a6440','#5a3e24',true),18,1),tin=texMat(tinTex(),16,1,{shininess:30}),trimS=mat(0x4d3220);
  s.add(new T.Mesh(new T.BoxGeometry(7,3.4,4).translate(0,1.7,0),plank));
  s.add(new T.Mesh(mergeGeos([gable(7,4,3.4,1.2,3.5),gable(7,4,3.4,1.2,-3.5)]),texMat(sidingTex('#8a6440','#5a3e24',true),12,1)));
  roofTex(s,7,4,3.95,tin);
  s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(2.4,2.6,0.1).translate(-1.6,1.3,2.05),new T.BoxGeometry(2.4,0.1,0.12).rotateZ(0.9).translate(-1.6,1.3,2.11),new T.BoxGeometry(2.4,0.1,0.12).rotateZ(-0.9).translate(-1.6,1.3,2.11)]),mat(0x6b4a2c)));
  s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(3.0,0.08,0.08).translate(-1.6,2.7,2.12),new T.BoxGeometry(0.2,0.12,0.06).translate(-2.4,2.62,2.14),new T.BoxGeometry(0.2,0.12,0.06).translate(-0.8,2.62,2.14)]),mat(0x2a2a2a)));
  const sd=doorGeo(0.9,2.0,1.8,2.03);s.add(new T.Mesh(sd.door,mat(0x3b2a1e)),new T.Mesh(sd.frame,trimS),new T.Mesh(sd.knob,mat(0x2a2a2a)));
  const ssign=new T.Mesh(new T.PlaneGeometry(2.4,0.55),textSign('SCIERIE',2.4,0.55,'#2f4a35','#f1e6c8'));ssign.position.set(1.4,2.72,2.12);s.add(ssign);
  const paper=new T.MeshBasicMaterial({color:0xf1e6c8});[2.65,3.0].forEach(x=>{const b=new T.Mesh(new T.PlaneGeometry(0.28,0.38),paper);b.position.set(x,1.5,2.06);s.add(b);});
  // Appentis sur le côté avec une pile de planches
  s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.12,2.2,0.12).translate(4.9,1.1,1.6),new T.BoxGeometry(0.12,2.2,0.12).translate(4.9,1.1,-1.6)]),trimS));
  const lr=new T.Mesh(new T.BoxGeometry(1.8,0.1,3.8),tin);lr.position.set(4.3,2.45,0);lr.rotation.z=-0.25;s.add(lr);
  s.add(new T.Mesh(mergeGeos([0,1,2,3,4].map(k=>new T.BoxGeometry(1.2,0.08,2.6).translate(4.2,0.1+k*0.1,0))),mat(0xc9a679)));
  const sq=vpos(-12,1);s.position.set(sq.x,VIL_H,sq.z);s.rotation.y=VROT;bakeStatic(s);shadows(s);scene.add(s);bldCols(-12,1,3.5,2);
  [[-7.4,0.4],[-7.4,1.6]].forEach(([a,b])=>{const q=vpos(a,b);addCol(q.x,q.z,0.7);});
  label('Scierie',sq.x,VIL_H+6.2,sq.z);
  label('Village',VILLAGE.x,VIL_H+10,VILLAGE.z,26);
}
const MILL_DOOR=vpos(-10.2,3.3);
Object.assign(YARD,vpos(-10.5,8.5));
const yardRing=groundRing(YARD.x,YARD.z,YARD.r-0.35,YARD.r,48,0xffd27a,0.55);
// Billots déjà vendus, cordés derrière la scierie
const YARD_STACK=vpos(-12,-3.6);
const yardStack=new T.Group();yardStack.position.set(YARD_STACK.x,H(YARD_STACK.x,YARD_STACK.z),YARD_STACK.z);yardStack.rotation.y=VROT;scene.add(yardStack);
const yardStackCols={};   // collision ajoutée seulement quand une pile a des billots

/* ---------- Billots ---------- */
const barkM=mat(0x5e4630),endM=mat(0xd9b27c);
const LOG_LEN=2.44; // 8 pieds
const logGeoX=new T.CylinderGeometry(0.22,0.24,LOG_LEN,11);logGeoX.rotateZ(Math.PI/2);
const logGeoZ=new T.CylinderGeometry(0.22,0.24,LOG_LEN,11);logGeoZ.rotateX(Math.PI/2);
const logMats=logMatsFor('sapin');
// Souche : coupe avec cernes, base évasée et quelques racines
const STUMP_GEO=(()=>{
  const c=new T.CylinderGeometry(0.26,0.32,0.45,11);c.translate(0,0.225,0);
  const roots=[0,1,2,3,4].map(k=>{const a=k/5*Math.PI*2+0.3,g=new T.CylinderGeometry(0.025,0.1,0.42,5).rotateZ(-(Math.PI/2+0.3)).translate(0.3,0.06,0).rotateY(a);g.clearGroups();g.addGroup(0,g.index?g.index.count:g.attributes.position.count,0);return g;});
  return mergeGeos([c,...roots]);
})();
const PILE_SLOTS=[[-0.46,0.22],[0,0.22],[0.46,0.22],[-0.23,0.6],[0.23,0.6],[0,0.98]];
function makeLog(geo){const m=new T.Mesh(geo,logMats);m.castShadow=true;m.receiveShadow=true;return m;}

const piles=[];

const stumpList=[],campStumps=[];   // souches qu'on peut arracher à la pelle
/* ---------- Forêt ---------- */
const SPECIES={epinette:{n:'Épinette',p:30},sapin:{n:'Sapin',p:25},erable:{n:'Érable',p:45},bouleau:{n:'Bouleau',p:35}};
const treeList=[];
for(let k=0;k<5200&&treeList.length<900;k++){
  const x=(rnd()*2-1)*(WORLD-1),z=(rnd()*2-1)*(WORLD-1);
  const dc=Math.hypot(x-CAMP.x,z-CAMP.z);
  if(dc<CAMP.r+1.5)continue;
  if(Math.hypot(x-VILLAGE.x,z-VILLAGE.z)<VILLAGE.r+4)continue;
  if(trailDist(x,z)<3.4)continue;
  if(Math.hypot(x-OLD_YARD.x,z-OLD_YARD.z)<9)continue;
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
/* Arbres : géométries détaillées, partagées et dessinées en lots (une seule commande par sorte de pièce).
   Les couleurs par sommet donnent du relief (ombre dans le feuillage, taches des bouleaux). */
function paintGeo(g,fn){
  const a=g.attributes.position,c=new Float32Array(a.count*3);
  for(let i=0;i<a.count;i++){const v=fn(a.getX(i),a.getY(i),a.getZ(i),i);const r=typeof v==='number'?[v,v,v]:v;c[i*3]=r[0];c[i*3+1]=r[1];c[i*3+2]=r[2];}
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));return g;
}
const hash3=(x,y,z)=>{const h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h);};
const TREE_GEO=(()=>{
  // Tronc : évasé à la base (racines), puis effilé
  const tp=[[0.38,0],[0.24,0.2],[0.2,0.6],[0.16,1.0],[0,1.0]].map(([r,y])=>new T.Vector2(r,y));
  const trunk=paintGeo(new T.LatheGeometry(tp,6).toNonIndexed(),(x,y)=>0.82+0.25*y);
  // Feuillus : tronc avec deux branches qui montent dans la couronne
  const br=(ang,tilt)=>new T.CylinderGeometry(0.06,0.1,0.5,4,1,true).translate(0,0.25,0).rotateZ(tilt).rotateY(ang).translate(0,0.72,0);
  const trunkD=paintGeo(mergeGeos([new T.LatheGeometry(tp,6),br(0.4,0.75),br(2.8,0.7),br(4.6,0.6)]),(x,y)=>0.82+0.25*y);
  // Bouleau : blanc avec des taches noires
  const tpB=[[0.34,0],[0.22,0.18]];for(let k=1;k<=8;k++){const y=0.18+k*0.82/8;tpB.push([0.21-0.06*(y-0.18),y]);}tpB.push([0,1]);
  const bl=new T.LatheGeometry(tpB.map(([r,y])=>new T.Vector2(r,y)),8).toNonIndexed();
  // Taches noires : par face (les trois sommets d'un triangle ont la même couleur)
  {const a=bl.attributes.position,c=new Float32Array(a.count*3);for(let f=0;f<a.count;f+=3){const y=(a.getY(f)+a.getY(f+1)+a.getY(f+2))/3,x=(a.getX(f)+a.getX(f+1)+a.getX(f+2))/3,z=(a.getZ(f)+a.getZ(f+1)+a.getZ(f+2))/3;
    const row=Math.floor((y-0.18)/(0.82/8)),sec=Math.floor((Math.atan2(z,x)+Math.PI)/(Math.PI*2/8)),h=hash3(row,sec,2),v=y<0.04?0.5:y<0.18?0.85:h<0.13?0.16:h<0.2?0.55:0.96;for(let k=0;k<9;k++)c[f*3+k]=v;}bl.setAttribute('color',new T.Float32BufferAttribute(c,3));}
  const bb=paintGeo(mergeGeos([br(0.4,0.75),br(2.8,0.7)]),()=>0.6);
  const btrunk=mergeGeos([bl,bb]);
  // Conifère : étages de branches à bord dentelé, plus clairs vers la pointe
  const tiers=[];
  for(let k=0;k<5;k++){
    const r=1-k*0.18,h=0.36-k*0.03,y0=k*0.17,c=new T.ConeGeometry(r,h,9,1).toNonIndexed();
    const a=c.attributes.position;
    for(let i=0;i<a.count;i++){const y=a.getY(i);if(y<-h/2+1e-4){const ang=Math.atan2(a.getZ(i),a.getX(i)),j=Math.round(ang/(Math.PI*2/9)*2);const f=j%2?0.82:1;a.setX(i,a.getX(i)*f);a.setZ(i,a.getZ(i)*f);a.setY(i,y-(j%2?0:0.05));}}
    c.translate(0,y0+h/2,0);tiers.push(c);
  }
  const fir=paintGeo(mergeGeos(tiers),(x,y,z)=>{const rr=Math.hypot(x,z);return 0.62+0.32*y+0.28*rr+0.08*hash3(x,y,z);});
  // Feuillus : grappe de boules de feuillage aux teintes variées
  const blobs=[[0,0,0,1],[0.6,0.22,0.22,0.68],[-0.55,0.18,-0.3,0.74],[0.12,0.55,-0.5,0.6],[-0.25,0.5,0.52,0.62],[0.05,0.85,0.05,0.5]];
  const parts=blobs.map(([x,y,z,r],k)=>{const g=new T.IcosahedronGeometry(r,0).toNonIndexed();g.translate(x,y,z);const sh=0.8+0.3*hash3(k,1,2);return paintGeo(g,(px,py)=>sh*(0.8+0.25*(py+0.5)));});
  const crown=mergeGeos(parts);
  crown.scale(0.72,0.72,0.72);
  const blob=paintGeo(new T.IcosahedronGeometry(1,0).toNonIndexed(),(x,y)=>0.85+0.2*y);
  return {trunk,trunkD,btrunk,fir,crown,blob};
})();
function treeMat(c){return new T.MeshPhongMaterial({color:c,flatShading:true,shininess:3,vertexColors:true});}
const TREE_INST={};
const MAPLE_COLS=[0xb5452a,0xc9682b,0xd28a2f,0x9c3b25,0xa8532a],BIRCH_COLS=[0xd8b23a,0xc9a83a,0xbfa045];
// Pièces d'un arbre : sert à la forêt de départ, aux arbres plantés et à l'animation de chute.
// (Même nombre de tirages au hasard qu'avant, pour que la forêt et les sauvegardes restent identiques.)
function makeTreeParts(t,rf){
  const s=t.s,parts=[],v=hash3(t.x,t.z,3);
  const add=(g,dx,dy,dz,sx,sy,sz,rot,c)=>parts.push({g,dx,dy,dz,sx,sy,sz,rot,c});
  if(t.type==='epinette'||t.type==='sapin'){
    const sap=t.type==='sapin',w=(sap?0.8:1)*(0.92+0.16*v),hh=sap?1.15:1;
    add('trunk',0,0,0,s,1.3*s,s,t.rot,0x5b4330);
    add('fir',0,0.75*s,0,1.6*s*w,4.7*s*hh,1.6*s*w,t.rot,sap?0x2e4d36:0x34553a);
  }else{
    const er=t.type==='erable',pal=er?MAPLE_COLS:BIRCH_COLS,top=er?2.8:3.0;
    if(er)add('trunkD',0,0,0,1.1*s,2.8*s,1.1*s,t.rot,0x5b4330);else add('btrunk',0,0,0,0.85*s,3.0*s,0.85*s,t.rot,0xf0ece2);
    add('crown',0,(top+0.9)*s,0,1.9*s,1.6*s,1.9*s,t.rot,pal[Math.floor(rf()*pal.length)]);
    const a=rf()*6.28;
    add('blob',Math.cos(a)*0.7*s,(top+1.85)*s,Math.sin(a)*0.7*s,0.95*s,0.85*s,0.95*s,t.rot+1,pal[Math.floor(rf()*pal.length)]);
  }
  return parts;
}
function treeGroupFromParts(parts){const g=new T.Group();parts.forEach(pp=>{const m=new T.Mesh(TREE_GEO[pp.g],treeMat(pp.c));m.position.set(pp.dx,pp.dy,pp.dz);m.scale.set(pp.sx,pp.sy,pp.sz);m.rotation.y=pp.rot;g.add(m);});shadows(g);return g;}
const ZERO_M=new T.Matrix4().makeScale(0,0,0);
{
  treeList.forEach(t=>{t.parts=makeTreeParts(t,rnd);});
  const counts={};
  treeList.forEach(t=>t.parts.forEach(pp=>{pp.idx=counts[pp.g]=(counts[pp.g]||0);counts[pp.g]++;}));
  var ph=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:3});
  var m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3(),UP=new T.Vector3(0,1,0),col=new T.Color();
  var put=function(mesh,i,x,y,z,sx,sy,sz,rot,c){q.setFromAxisAngle(UP,rot);m4.compose(p.set(x,y,z),q,sc.set(sx,sy,sz));mesh.setMatrixAt(i,m4);mesh.setColorAt(i,col.set(c));};
  const phT=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:3,vertexColors:true});
  for(const k in counts)TREE_INST[k]=new T.InstancedMesh(TREE_GEO[k],phT,counts[k]);
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
  // Deux formes de roches bosselées, mousse sur le dessus (couleurs par sommet)
  const rockGeo=sd=>{const g=new T.IcosahedronGeometry(1,1),pa=g.attributes.position,v=new T.Vector3();
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i);const k=0.82+0.3*hash3(Math.round(v.x*50)+sd,Math.round(v.y*50),Math.round(v.z*50));v.multiplyScalar(k);if(v.y<-0.3)v.y=-0.3-(v.y+0.3)*0.3;pa.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();return paintGeo(g,(x,y,z)=>y>0.55?[0.55,0.68,0.42]:[0.95+0.1*hash3(x*9|0,y*9|0,z*9|0),0.95,0.92]);};
  const rockMat=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,vertexColors:true,shininess:4});
  const rockMs=[rockGeo(3),rockGeo(17)].map((gg,j)=>new T.InstancedMesh(gg,rockMat,rocks.filter((r,i)=>i%2===j).length));
  const cnt=[0,0];
  rocks.forEach((r,i)=>{q.setFromEuler(new T.Euler(rnd(),rnd()*6,rnd()));m4.compose(p.set(r.x,H(r.x,r.z)+0.1*r.s,r.z),q,sc.set(r.s,r.s*0.7,r.s));const rm=rockMs[i%2],n=cnt[i%2]++;rm.setMatrixAt(n,m4);rm.setColorAt(n,col.set(rnd()<0.5?0x8a8780:0x76736c));});
  rockMs.forEach(rm=>{rm.castShadow=true;rm.receiveShadow=true;scene.add(rm);});

  // Souches autour du camp (on a déjà bûché ici)
  const stumpG=STUMP_GEO;
  const stumps=[];
  for(let k=0;k<200&&stumps.length<16;k++){
    const a=rnd()*6.28,d=CAMP.r-1+rnd()*9,x=CAMP.x+Math.cos(a)*d,z=CAMP.z+Math.sin(a)*d;
    if(trailDist(x,z)<3||Math.hypot(x-OLD_YARD.x,z-OLD_YARD.z)<8||Math.hypot(x-CABIN.x,z-CABIN.z)<5)continue;
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<1.8))continue;
    const c=addCol(x,z,0.4);stumps.push({x,z,c});
  }
  const stM=new T.InstancedMesh(stumpG,[logMatsFor('epinette')[0],RING_M,logMatsFor('epinette')[0]],stumps.length);
  stumps.forEach((s,i)=>put(stM,i,s.x,H(s.x,s.z)-0.05,s.z,1.2,0.8+rnd()*0.6,1.2,rnd()*6,0xe8e0d4));
  stumps.forEach((s,i)=>{const e={x:s.x,z:s.z,col:s.c,inst:stM,idx:i,size:1,work:0};stumpList.push(e);campStumps.push(e);});
  stM.castShadow=true;stM.receiveShadow=true;scene.add(stM);
}
