/* Le monde : relief, chemins, rendu, terrain, collisions, camp, village, billots et forêt */
/* ---------- Monde ---------- */
const WORLD=80;                                     // terre d'origine : -80..80 (la forêt de départ)
function clampW(p,m){p.x=clamp(p.x,WB.x0+m,WB.x1-m);p.z=clamp(p.z,WB.z0+m,WB.z1-m);return p;}
function outW(x,z,m){return x<WB.x0+m||x>WB.x1-m||z<WB.z0+m||z>WB.z1-m;}
const TRAILS=PATHS.map(p=>p.pts);   // les chemins viennent du plan
const MUD=[];   // plus de trous de boue sur les sentiers
const PILE_DEF=[{x:-58,z:-19},{x:58,z:-55},{x:6,z:-96}];   // piles de billots le long des sentiers
const YARD={x:0,z:0,r:4.2};          // cour à bois de la scierie, au village (position fixée plus bas)
const OLD_YARD={x:CAMP.x+8,z:CAMP.z+6};             // ancienne cour au camp : garde la même forêt pour les sauvegardes
const CABIN0={x:CAMP.x-7,z:CAMP.z+2};             // ancienne place (sert encore à générer les roches d'origine)
const CABIN={x:CAMP.x-10.2,z:CAMP.z-0.25};        // la cabane, agrandie : 12 m × 9 m (le mur de droite et la façade restent où ils étaient)
const CAB_W=12,CAB_D=9,CAB_H=3.4,CAB_DOOR_X=2.4,CAB_CHIM={x:4.6,z:-1.7};
// Village le long d'une rue : repère local (lx vers la droite, lz vers le camp) et rectangle aplani
const VIL_A=Math.atan2(CAMP.x-VILLAGE.x,CAMP.z-VILLAGE.z),VIL_S=Math.sin(VIL_A),VIL_C=Math.cos(VIL_A);
function vilLocal(x,z){const dx=x-VILLAGE.x,dz=z-VILLAGE.z;return [dx*VIL_C-dz*VIL_S,dx*VIL_S+dz*VIL_C];}
const VIL_RECTS=[{x0:-19,x1:29,z0:-32,z1:12},{x0:-36,x1:33,z0:8,z1:38}];   // rue et maisons / scierie et concessionnaire
function vilOut(x,z){const [a,b]=vilLocal(x,z);let m=1e9;for(const R of VIL_RECTS)m=Math.min(m,Math.hypot(Math.max(R.x0-a,0,a-R.x1),Math.max(R.z0-b,0,b-R.z1)));return m;}
const CAP=6;

// Le sentier de la montagne : on monte par petits pas en gardant une pente douce (lacets naturels)
PATHS.filter(P=>P.climb).forEach(P=>{
  const hR=(x,z)=>baseH(x,z)+hillH(x,z),ST=3,MAXG=0.12;let [x,z]=P.pts[P.pts.length-1],dir=Math.atan2(HILL.z-z,HILL.x-x),k=0;
  for(let n=0;n<400&&Math.hypot(x-HILL.x,z-HILL.z)>4.5;n++){
    let best=null;for(let da=-0.9;da<=0.9;da+=0.1){const a=dir+da,nx=x+Math.cos(a)*ST,nz=z+Math.sin(a)*ST,g=(hR(nx,nz)-hR(x,z))/ST;if(g<-0.02||g>MAXG)continue;
      const sc=Math.hypot(nx-HILL.x,nz-HILL.z)-g*30;if(!best||sc<best.sc)best={a,nx,nz,sc};}
    if(!best){const a=dir+0.5;best={a,nx:x+Math.cos(a)*ST,nz:z+Math.sin(a)*ST};}
    dir=best.a;x=best.nx;z=best.nz;if(++k%2===0)P.pts.push([x,z]);
  }
  P.pts.push([HILL.x,HILL.z]);
});
const SEGS=[];
PATHS.forEach(P=>{const tr=P.pts,e=(P.w-3)/2;for(let i=0;i<tr.length-1;i++)SEGS.push([tr[i][0],tr[i][1],tr[i+1][0],tr[i+1][1],e]);});   // e : demi-largeur en plus d'un sentier
const SEGS0=SEGS.slice();   // sentiers d'origine : servent à générer la forêt de départ (sauvegardes compatibles)
const SEGS_LAKE=SEGS.slice();
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;let t=l2?((px-ax)*dx+(pz-az)*dz)/l2:0;t=clamp(t,0,1);return Math.hypot(px-(ax+t*dx),pz-(az+t*dz));}
// Grille de 16 m : chaque case connaît les bouts de chemin à moins de 14 m (au-delà, la distance exacte ne sert à rien)
const TG=16,TGM=14,TRAIL_GRID=new Map();
SEGS.forEach(s=>{const x0=Math.floor((Math.min(s[0],s[2])-TGM-s[4])/TG),x1=Math.floor((Math.max(s[0],s[2])+TGM+s[4])/TG),z0=Math.floor((Math.min(s[1],s[3])-TGM-s[4])/TG),z1=Math.floor((Math.max(s[1],s[3])+TGM+s[4])/TG);
  for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const k=i*4096+j;let l=TRAIL_GRID.get(k);if(!l)TRAIL_GRID.set(k,l=[]);l.push(s);}});
function trailDist(x,z){const l=TRAIL_GRID.get(Math.floor(x/TG)*4096+Math.floor(z/TG));if(!l)return TGM;let m=TGM;for(const s of l){const d=segDist(x,z,s[0],s[1],s[2],s[3])-s[4];if(d<m)m=d;}return m;}
const trailDistLake=(x,z)=>trailDist(x,z);
const trailDist0=(x,z)=>trailDist(x,z);
function mudAt(x,z){let m=0;for(const p of MUD){m=Math.max(m,smoothstep(p.r,p.r*0.55,Math.hypot(x-p.x,z-p.z)));}return m;}
function baseH(x,z){return 4.5*Math.sin(x*0.0085+0.4)*Math.cos(z*0.0072+0.9)+4.2*Math.sin(x*0.014+0.8)*Math.cos(z*0.011+0.3)+1.8*Math.sin(x*0.031+2.1)*Math.sin(z*0.027+1.2)
  +1.7*Math.sin(x*0.045+0.5)*Math.cos(z*0.038)+0.8*Math.sin(x*0.1+1.3)*Math.sin(z*0.085+0.7);}
function detailH(x,z){return 0.32*Math.sin(x*0.33)*Math.cos(z*0.29)+0.15*Math.sin(x*0.7+z*0.5);}
const CAMP_H=baseH(CAMP.x,CAMP.z),VIL_H=baseH(VILLAGE.x,VILLAGE.z);
/* ---------- La montagne (avec belvédère) et la rivière (territoire public) ---------- */
// petit plateau plat au sommet (5 m) pour que le belvédère et son panneau reposent sur le sol
function hillH(x,z){const dx=x-HILL.x,dz=z-HILL.z,d=Math.hypot(dx,dz);if(d>HILL.r*1.3)return 0;
  const a=Math.atan2(dz,dx),R=HILL.r*(1+0.18*Math.sin(3*a+1)+0.1*Math.sin(5*a+2.5)+0.05*Math.sin(9*a+0.7));   // contour irrégulier (épaulements, vallons)
  const t=clamp((d-4)/(R-4),0,1);if(t>=1)return 0;
  const E=Math.exp(-3.4),f=(Math.exp(-3.4*Math.pow(t,1.6))-E)/(1-E);           // sommet arrondi, longs piémonts en pente douce
  return HILL.h*f*(1+0.08*Math.sin(4*a+d*0.07)*t)+2.6*Math.sin(x*0.09+1)*Math.cos(z*0.075)*t*(1-t)*4*f;}
const RIVER_L=(()=>{const a=[0];for(let i=1;i<RIVER.length;i++)a.push(a[i-1]+Math.hypot(RIVER[i][0]-RIVER[i-1][0],RIVER[i][1]-RIVER[i-1][1]));return a;})();
function riverInfo(x,z){
  let best=1e9,bs=0;
  for(let i=0;i<RIVER.length-1;i++){const [ax,az]=RIVER[i],[bx,bz]=RIVER[i+1],dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz;let t=((x-ax)*dx+(z-az)*dz)/l2;t=clamp(t,0,1);
    const d=Math.hypot(x-(ax+t*dx),z-(az+t*dz));if(d<best){best=d;bs=(RIVER_L[i]+t*Math.sqrt(l2))/RIVER_L[RIVER_L.length-1];}}
  return {d:best,s:bs};
}
// Niveau de l'eau le long de la rivière (s : 0 à la source, 1 au lac), avec une chute
function riverY(s){return LAKE_Y+2.2*(1-Math.min(1,s/0.95))+RIVER_FALL.h*smoothstep(RIVER_FALL.s+0.012,RIVER_FALL.s-0.012,s);}
const RIVER_BB=(()=>{const xs=RIVER.map(p=>p[0]),zs=RIVER.map(p=>p[1]);return {x0:Math.min(...xs)-14,x1:Math.max(...xs)+14,z0:Math.min(...zs)-14,z1:Math.max(...zs)+14};})();
const nearRiver=(x,z)=>inRect(x,z,RIVER_BB);
const nearLake=(x,z)=>Math.abs(x-LAKE.x)<LAKE.rx*2.2&&Math.abs(z-LAKE.z)<LAKE.rz*2.2;
/* ---------- Le lac (territoire public, au nord) ---------- */
function lakeE(x,z){const dx=(x-LAKE.x)/LAKE.rx,dz=(z-LAKE.z)/LAKE.rz,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/(1+0.07*Math.sin(3*a+1)+0.05*Math.sin(5*a+2));}
const LAKE_Y=(()=>{let s=0;for(let i=0;i<32;i++){const a=i/32*Math.PI*2;s+=baseH(LAKE.x+Math.cos(a)*LAKE.rx*1.45,LAKE.z+Math.sin(a)*LAKE.rz*1.45);}return s/32-0.25;})();
function H(x,z){
  let h=baseH(x,z);
  const tc=smoothstep(CAMP_FLAT+8,CAMP_FLAT,Math.hypot(x-CAMP.x,z-CAMP.z));
  const tt=smoothstep(4,1.8,trailDist(x,z));
  const tv=smoothstep(20,0,vilOut(x,z));
  h+=detailH(x,z)*(1-Math.max(tc,tt,tv));
  h+=hillH(x,z);
  for(const r of RESERVED){if(r.land)continue;const d=Math.hypot(Math.max(r.x0-x,0,x-r.x1),Math.max(r.z0-z,0,z-r.z1));if(d<8){if(r.h===undefined)r.h=baseH((r.x0+r.x1)/2,(r.z0+r.z1)/2);h=lerp(h,r.h,smoothstep(8,0,d));}}   // lots réservés : aplanis
  h=lerp(h,CAMP_H,tc);h=lerp(h,VIL_H,tv);
  h-=0.18*mudAt(x,z);
  if(ROAD_T)h=roadLevel(x,z,h);
  if(nearLake(x,z)){const e=lakeE(x,z);if(e<2.0){h=lerp(h,LAKE_Y+0.35,smoothstep(2.0,1.1,e));h-=3.2*smoothstep(1.0,0.5,e);}}
  if(nearRiver(x,z)){const ri=riverInfo(x,z);if(ri.d<11){const ys=riverY(ri.s),le=lakeE(x,z),out=smoothstep(0.95,1.3,le);
    const hr=lerp(h,ys+0.45,smoothstep(11,3.4,ri.d)*out)-1.5*smoothstep(2.9,0.9,ri.d);
    h=out<1?Math.min(h,hr):hr;}}   // dans le lac, la rivière ne fait que creuser (pas de berge)
  return h;
}
/* Routes : un profil en long adouci (pente max, pas de bosses) et plat d'un bord à l'autre */
let ROAD_T=null;
function roadLevel(x,z,h){
  for(const R of ROAD_T){if(x<R.bb.x0||x>R.bb.x1||z<R.bb.z0||z>R.bb.z1)continue;
    let best=1e9,hy=0;for(const s of R.segs){const dx=s[2]-s[0],dz=s[3]-s[1],l2=dx*dx+dz*dz;let u=((x-s[0])*dx+(z-s[1])*dz)/l2;u=u<0?0:u>1?1:u;
      const d=Math.hypot(x-s[0]-u*dx,z-s[1]-u*dz);if(d<best){best=d;hy=s[4]+(s[5]-s[4])*u;}}
    if(best<R.hw+R.sh)h=lerp(h,hy,smoothstep(R.hw+R.sh,R.hw+0.6,best));}
  return h;
}
ROAD_T=(()=>{const out=[];
  PATHS.filter(P=>P.kind!=='sentier'&&P.id!=='rue').forEach(P=>{
    const pts=[];for(let i=0;i<P.pts.length-1;i++){const [ax,az]=P.pts[i],[bx,bz]=P.pts[i+1],n=Math.ceil(Math.hypot(bx-ax,bz-az)/2);for(let k=0;k<n;k++)pts.push([lerp(ax,bx,k/n),lerp(az,bz,k/n)]);}
    pts.push(P.pts[P.pts.length-1]);
    const route=P.kind==='route',W=route?14:6,MG=(route?0.05:0.09)*2;   // fenêtre de lissage (échantillons de 2 m) et pente max par échantillon
    const pin=pts.map(p=>route&&Math.hypot(p[0]-VILLAGE.x,p[1]-ROUTE_Z)<14);   // au croisement de la rue : exactement au niveau du village
    let h=pts.map((p,i)=>pin[i]?VIL_H:H(p[0],p[1]));
    for(let pass=0;pass<3;pass++)h=h.map((v,i)=>{if(pin[i])return v;let s=0,n=0;for(let k=-W;k<=W;k++){const j=i+k;if(j>=0&&j<h.length){s+=h[j];n++;}}return s/n;});
    for(let it=0;it<6;it++){   // pente max partout, sans saut au bord du croisement
      for(let i=1;i<h.length;i++)if(!pin[i])h[i]=clamp(h[i],h[i-1]-MG,h[i-1]+MG);
      for(let i=h.length-2;i>=0;i--)if(!pin[i])h[i]=clamp(h[i],h[i+1]-MG,h[i+1]+MG);
      h=h.map((v,i)=>pin[i]||i==0||i==h.length-1?v:(h[i-1]+2*v+h[i+1])/4);}
    const segs=[];for(let i=0;i<pts.length-1;i++)segs.push([pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],h[i],h[i+1]]);
    const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]),m=P.w/2+12;
    out.push({segs,hw:P.w/2,sh:route?9:5,bb:{x0:Math.min(...xs)-m,x1:Math.max(...xs)+m,z0:Math.min(...zs)-m,z1:Math.max(...zs)+m}});
  });return out;})();
// Profondeur d'eau (négatif : pas d'eau)
function waterDepth(x,z){if(nearLake(x,z)&&lakeE(x,z)<1.15)return LAKE_Y-H(x,z);if(nearRiver(x,z)){const ri=riverInfo(x,z);if(ri.d<3)return riverY(ri.s)-H(x,z);}return -1;}
// Le quai : on y marche au-dessus de l'eau
const DOCK=(()=>{let sx=LAKE.x-LAKE.rx;for(let x=LAKE.x-LAKE.rx*1.4;x<LAKE.x;x+=0.1){if(H(x,LAKE.z)<LAKE_Y){sx=x;break;}}return {x0:sx-2.6,x1:sx+6.5,z0:LAKE.z-0.85,z1:LAKE.z+0.85,y:LAKE_Y+0.48};})();
function onDock(x,z){return x>DOCK.x0&&x<DOCK.x1&&z>DOCK.z0&&z<DOCK.z1;}
// Belvédère au sommet du mont du Loup : une plate-forme où l'on monte
const BELV=(()=>{const y=H(HILL.x,HILL.z)+0.45;return {x0:HILL.x-2.6,x1:HILL.x+2.6,z0:HILL.z-2.6,z1:HILL.z+2.6,y};})();
function walkH(x,z){const h=H(x,z);return onDock(x,z)?Math.max(h,DOCK.y):inRect(x,z,BELV)?Math.max(h,BELV.y):h;}

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
const GROUND_U={uSnow:{value:0},uWet:{value:0}};
const TERRAIN_TILES=[];   // neige au sol et sol mouillé (météo)
const skyMat=new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uTop:{value:new T.Color(0x2f6fbf)},uMid:{value:new T.Color(0x78acdc)},uHor:{value:new T.Color(SKY_HORIZON)},uSun:{value:new T.Vector3(0.45,0.75,0.2).normalize()},
    uMoon:{value:new T.Vector3(-0.45,0.6,-0.2).normalize()},uNight:{value:0},uCloud:{value:0},uCloudCol:{value:new T.Color(1,1,1)},uSunVis:{value:1}},
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*0.9999;}',
  fragmentShader:`uniform float uTime,uNight,uCloud,uSunVis;uniform vec3 uTop,uMid,uHor,uSun,uMoon,uCloudCol;varying vec3 vDir;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){return n(p)*0.55+n(p*2.03+3.1)*0.28+n(p*4.11+7.7)*0.17;}
    void main(){
      vec3 d=normalize(vDir);float y=d.y;
      vec3 c=mix(uHor,uMid,smoothstep(-0.02,0.25,y));c=mix(c,uTop,smoothstep(0.25,0.9,y));
      // Étoiles et lune (la nuit)
      if(uNight>0.01&&y>0.0){
        vec2 sp=vec2(atan(d.z,d.x)*90.0,asin(y)*90.0),ce=floor(sp);float r=h(ce);
        float st=step(0.985,r)*smoothstep(0.42,0.0,length(fract(sp)-0.5-(vec2(h(ce+1.3),h(ce+2.7))-0.5)*0.5));
        c+=vec3(0.9,0.92,1.0)*st*(0.55+0.45*sin(uTime*2.0+r*60.0))*uNight*smoothstep(0.0,0.25,y)*(1.0-uCloud*0.9);
      }
      float mo=max(dot(d,uMoon),0.0);
      c+=vec3(0.92,0.94,1.0)*(smoothstep(0.9990,0.9994,mo)*0.9+pow(mo,60.0)*0.12)*uNight*(1.0-uCloud*0.8);
      float s=max(dot(d,uSun),0.0);c+=vec3(1.0,0.9,0.7)*(pow(s,600.0)*1.6+pow(s,12.0)*0.22)*uSunVis;
      if(y>0.0){
        vec2 uv=d.xz/(y+0.12)*1.6+vec2(uTime*0.012,uTime*0.004);
        float f=fbm(uv);
        float k=smoothstep(0.52-uCloud*0.5,0.78-uCloud*0.38,f)*smoothstep(0.0,0.18,y);
        vec3 cc=uCloudCol*mix(0.82-uCloud*0.25,1.0,smoothstep(0.55,0.85,fbm(uv+0.35)));
        c=mix(c,cc,k*(0.85+uCloud*0.13));
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

const hemi=new T.HemisphereLight(0xe4ecf2,0x4a4030,0.75);scene.add(hemi);
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
  // Le terrain est fait de tuiles de 50 m (les tuiles hors de la vue ne sont pas dessinées)
  const TS=50,TILE=4;
  grassTex.repeat.set(TS/TILE,TS/TILE);
  dirtTex.repeat.set(TS/TILE,TS/TILE);
  const buildTile=(cx,cz,dens)=>{
  const g=new T.PlaneGeometry(TS,TS,Math.round(TS*dens),Math.round(TS*dens));g.rotateX(-Math.PI/2);g.translate(cx,0,cz);
  const pos=g.attributes.position,cols=new Float32Array(pos.count*3),dirt=new Float32Array(pos.count),nor=g.attributes.normal;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    const hy=H(x,z);pos.setY(i,hy);
    {const e=0.5,hx=H(x+e,z)-H(x-e,z),hz=H(x,z+e)-H(x,z-e),l=Math.hypot(hx,2*e,hz);nor.setXYZ(i,-hx/l,2*e/l,-hz/l);}
    const n=0.5+0.5*Math.sin(x*0.21+Math.cos(z*0.17)*2)*Math.cos(z*0.13);
    const dc=Math.hypot(x-CAMP.x,z-CAMP.z),campF=smoothstep(CAMP_FLAT-1,CAMP_FLAT-7,dc);
    const mud=mudAt(x,z),tr=smoothstep(2.9,1.6,trailDist(x,z));
    const vl=vilLocal(x,z);
    const yardF=smoothstep(-24,-22.5,vl[0])*smoothstep(-3.6,-5,vl[0])*smoothstep(11.5,13,vl[1])*smoothstep(43,41,vl[1]);   // la cour rejoint les chemins de terre (camp et terre du Sud)
    const patch=yardF*0.8;
    const le=nearLake(x,z)?lakeE(x,z):9,rd=nearRiver(x,z)?riverInfo(x,z).d:99,beach=Math.max(smoothstep(1.22,1.02,le),smoothstep(5,2.6,rd));
    const top=smoothstep(9,4,Math.hypot(x-HILL.x,z-HILL.z));
    dirt[i]=Math.max(tr,mud,patch,beach*0.9,top*0.7);
    let r=0.88+0.22*n,gg=0.88+0.2*n,b=0.86+0.18*n;
    r*=1+0.06*campF;b*=1-0.08*campF;
    r=lerp(r,0.55,mud);gg=lerp(gg,0.48,mud);b=lerp(b,0.42,mud);
    if(beach>0){const wet=Math.max(smoothstep(1.0,0.85,le),smoothstep(2.6,2.0,rd));r=lerp(r,1.12,beach*0.5)*(1-0.45*wet);gg=lerp(gg,1.05,beach*0.5)*(1-0.4*wet);b=lerp(b,0.9,beach*0.5)*(1-0.3*wet);}
    cols[i*3]=r;cols[i*3+1]=gg;cols[i*3+2]=b;
  }
  g.setAttribute('color',new T.BufferAttribute(cols,3));
  g.setAttribute('aDirt',new T.BufferAttribute(dirt,1));
  g.computeBoundingSphere();
  return g;
  };
  const tm=new T.MeshLambertMaterial({vertexColors:true,map:grassTex});
  tm.onBeforeCompile=sh=>{
    sh.uniforms.tDirt={value:dirtTex};sh.uniforms.uSnow=GROUND_U.uSnow;sh.uniforms.uWet=GROUND_U.uWet;
    sh.vertexShader='attribute float aDirt;\nvarying float vDirt;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vDirt=aDirt;');
    sh.fragmentShader='uniform sampler2D tDirt;\nuniform float uSnow,uWet;\nvarying float vDirt;\n'+sh.fragmentShader.replace('#include <map_fragment>',
      'vec4 tg=texture2D(map,vUv);vec4 td=texture2D(tDirt,vUv*1.3);\n  float m=smoothstep(0.42,0.58,vDirt+(tg.g-0.42)*0.55);\n  diffuseColor*=mix(tg,td,m);\n  diffuseColor.rgb*=1.0-uWet*0.28;\n  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.92,0.94,1.0),clamp(uSnow*(1.25+tg.r-tg.g)*(1.0-m*0.35),0.0,1.0));');
  };
  var terrain=new T.Group();scene.add(terrain);
  for(let x=WB.x0;x<WB.x1;x+=TS)for(let z=WB.z0;z<WB.z1;z+=TS){
    const cx=x+TS/2,cz=z+TS/2,dens=inRect(cx,cz,MAIN_LAND)?1.3:1.0;
    const m=new T.Mesh(buildTile(cx,cz,dens),tm);m.receiveShadow=true;m.userData.c={x:cx,z:cz};m.geometry.computeBoundingBox();m.userData.box=m.geometry.boundingBox.clone();terrain.add(m);TERRAIN_TILES.push(m);
  }
}

/* ---------- Collisions (grille) ---------- */
const CELL=5,grid=new Map();
const gk=(ix,iz)=>ix*1000+iz;
function addCol(x,z,r){const c={x,z,r},k=gk(Math.floor(x/CELL),Math.floor(z/CELL));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(c);return c;}
function removeCol(c){const a=grid.get(gk(Math.floor(c.x/CELL),Math.floor(c.z/CELL)));if(a){const i=a.indexOf(c);if(i>=0)a.splice(i,1);}}
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
const CABIN_ROOF=new T.Group();
{
  // Cabane en rondins : murs empilés, pignons en planches, toit de bardeaux, porte, fenêtres à carreaux, cheminée de pierres
  // Le toit, les pignons et la cheminée sont à part (CABIN_ROOF) : on les cache pour voir l'intérieur d'en haut.
  const g=new T.Group(),W=CAB_W,D=CAB_D,Hh=CAB_H,rg=CABIN_ROOF,PITCH=0.5;
  g.add(new T.Mesh(logWalls(W,D,Hh,0.17),[CABIN_LOG,RING_M,RING_M]));
  const plank=texMat(sidingTex('#7a5232','#4d3220',true),1,1);plank.map.repeat.set(14,1);
  const rise=D/2*Math.tan(PITCH)-0.12;
  rg.add(new T.Mesh(mergeGeos([gable(W,D+0.2,Hh+0.1,rise,W/2),gable(W,D+0.2,Hh+0.1,rise,-W/2),
    new T.BoxGeometry(0.28,0.4,D+0.2).translate(W/2,Hh-0.02,0),new T.BoxGeometry(0.28,0.4,D+0.2).translate(-W/2,Hh-0.02,0)]),plank));   // planche qui ferme le haut des murs de côté
  const sh=texMat(shingleTex('#5a2a22','#3e1c17'),16,14);roofTex(rg,W,D,Hh+1.14,sh,PITCH,0.6);
  const dg=doorGeo(1.15,2.3,CAB_DOOR_X,D/2+0.19);const dark=mat(0x4d3220);
  g.add(new T.Mesh(dg.door,mat(0x6a4426)),new T.Mesh(dg.frame,dark),new T.Mesh(dg.knob,mat(0x2a2a2a)));
  const wf=[],wg=[];
  [[-4.0,D/2+0.19,0,1.3],[-0.8,D/2+0.19,0,1.3],[-W/2-0.19,1.2,-Math.PI/2,1.0],[-W/2-0.19,-2.2,-Math.PI/2,1.0],[W/2+0.19,1.6,Math.PI/2,1.0],[-2.5,-D/2-0.19,Math.PI,1.0],[1.5,-D/2-0.19,Math.PI,1.0]]
    .forEach(([x,z,ry,w])=>{const ww=windowGeo(w,0.95,x,1.75,z,ry);wf.push(ww.frame);wg.push(ww.glass);});
  g.add(new T.Mesh(mergeGeos(wf),mat(0xe8e0cc)),new T.Mesh(mergeGeos(wg),CABIN_WIN));
  rg.add(new T.Mesh(stoneStack(0.7,0.7,6.6,CAB_CHIM.x,0,CAB_CHIM.z,9),new T.MeshPhongMaterial({color:0x8d8a84,flatShading:true,vertexColors:true,shininess:3})));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(W+0.4,0.2,D+0.4).translate(0,0.02,0),new T.BoxGeometry(1.5,0.16,0.55).translate(CAB_DOOR_X,0.08,D/2+0.5)]),mat(0x7a756c)));
  g.position.set(CABIN.x,CAMP_H,CABIN.z);
  bakeStatic(g);g.add(rg);shadows(g);scene.add(g);
  // Murs : une rangée de petits cercles tout le tour (l'intérieur est géré à part)
  for(let x=-W/2;x<=W/2+0.01;x+=0.6){addCol(CABIN.x+x,CABIN.z-D/2,0.42);addCol(CABIN.x+x,CABIN.z+D/2,0.42);}
  for(let z=-D/2+0.6;z<D/2-0.01;z+=0.6){addCol(CABIN.x-W/2,CABIN.z+z,0.42);addCol(CABIN.x+W/2,CABIN.z+z,0.42);}
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
label('Camp',CABIN.x,CAMP_H+7.4,CABIN.z,14);
/* ---------- Village ---------- */
const VROT=Math.atan2(CAMP.x-VILLAGE.x,CAMP.z-VILLAGE.z);
const VF={x:Math.sin(VROT),z:Math.cos(VROT)},VR={x:Math.cos(VROT),z:-Math.sin(VROT)};
function vpos(lx,lz){return {x:VILLAGE.x+VR.x*lx+VF.x*lz,z:VILLAGE.z+VR.z*lx+VF.z*lz};}
function bldCols(lx,lz,hw,hd){for(let a=-hw+1.4;a<=hw-1.39;a+=Math.max(0.01,(2*hw-2.8)/Math.max(1,Math.round((2*hw-2.8)/2.4))))for(let b=-hd+1.4;b<=hd-1.39;b+=Math.max(0.01,(2*hd-2.8)/Math.max(1,Math.round((2*hd-2.8)/2.4)))){const p=vpos(lx+a,lz+b);addCol(p.x,p.z,1.55);}}
function gableRoof(g,w,d,y,m){const r1=box(w+0.6,0.18,d/2+0.5,m,0,y,d/4+0.1,g);r1.rotation.x=0.62;const r2=box(w+0.6,0.18,d/2+0.5,m,0,y,-d/4-0.1,g);r2.rotation.x=-0.62;}
let STORE_DOOR,MILL_DOOR,DEALER_DOOR;
const VIL_WIN=new T.MeshBasicMaterial({color:0x9fb8c8});        // vitres du village
const VIL_LAMP=new T.MeshBasicMaterial({color:0x6a6450});       // lanternes de rue
const VIL_POOL=new T.MeshBasicMaterial({map:canvasTex(64,64,(c,w,h)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,214,140,1)');g.addColorStop(0.5,'rgba(255,190,110,0.35)');g.addColorStop(1,'rgba(255,170,90,0)');c.fillStyle=g;c.fillRect(0,0,w,h);}),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
{
  const VMC={},vmat=c=>VMC[c]||(VMC[c]=mat(c));
  // (le texte rapetisse au besoin pour toujours tenir dans l'affiche)
  const textSign=(txt,w,h,bg,fg,font)=>{const CW=w/h>8?1024:512;const t=canvasTex(CW,Math.max(32,Math.round(CW*h/w)),(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle=fg;c.lineWidth=Math.max(3,H*0.06);c.strokeRect(H*0.08,H*0.08,W-H*0.16,H-H*0.16);c.fillStyle=fg;let fs=Math.round(H*(font||0.46));c.font=`bold ${fs}px Georgia,serif`;const tw=c.measureText(txt).width,mx=W-H*0.6;if(tw>mx){fs=Math.floor(fs*mx/tw);c.font=`bold ${fs}px Georgia,serif`;}c.textAlign='center';c.textBaseline='middle';c.fillText(txt,W/2,H/2+2);});return new T.MeshBasicMaterial({map:t});};
  // r : rotation en plus (π/2 = façade vers +lx, -π/2 = façade vers -lx, c.-à-d. vers la rue)
  const placeB=(g,lx,lz,r=0)=>{const p=vpos(lx,lz);g.position.set(p.x,VIL_H,p.z);g.rotation.y=VROT+r;bakeStatic(g);shadows(g);g.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});scene.add(g);return p;};
  const colL=(lx,lz,r)=>{const p=vpos(lx,lz);addCol(p.x,p.z,r);};
  // Repère local d'un bâtiment (x, z) -> repère du village (lx, lz)
  const BL=(lx,lz,r)=>{const c=Math.round(Math.cos(r)),s=Math.round(Math.sin(r));const at=(x,z)=>[lx+x*c+z*s,lz-x*s+z*c];
    return {at,c:(x,z,rad)=>{const q=at(x,z);colL(q[0],q[1],rad);},b:(x,z,hw,hd)=>{const q=at(x,z);s?bldCols(q[0],q[1],hd,hw):bldCols(q[0],q[1],hw,hd);}};};
  const LEFT=Math.PI/2,RIGHT=-Math.PI/2;
  const wood=vmat(0x7a5232),trim=vmat(0xf6f1e4),dark=vmat(0x3b2a1e),gold=vmat(0xc9a84a),black=vmat(0x222222);

  /* ===== Magasin général : deux étages, fausse façade, grande galerie, vitrines ===== */
  {
    const g=new T.Group(),W=12,D=9,Hh=6.2;
    const cream=texMat(sidingTex('#e8e0cc','#b9ae96'),1,28),shing=texMat(shingleTex('#8e2b22','#5e1b15'),14,10),green=vmat(0x2f5a3a);
    g.add(new T.Mesh(new T.BoxGeometry(W,Hh,D).translate(0,Hh/2,0),cream));
    g.add(new T.Mesh(mergeGeos([gable(W,D+0.1,Hh,2.1,W/2),gable(W,D+0.1,Hh,2.1,-W/2)]),texMat(sidingTex('#e8e0cc','#b9ae96'),1,10)));
    roofTex(g,W,D,Hh+1.05,shing,0.45,0.5);
    // Planches de coin, bandeau entre les étages, fausse façade et corniche
    const tr=[];[-1,1].forEach(sx=>[-1,1].forEach(sz=>tr.push(new T.BoxGeometry(0.22,Hh,0.22).translate(sx*W/2,Hh/2,sz*D/2))));
    tr.push(new T.BoxGeometry(W+0.3,0.22,0.12).translate(0,3.2,D/2+0.06),new T.BoxGeometry(W+0.8,0.3,0.5).translate(0,Hh+3.05,D/2+0.15),new T.BoxGeometry(W+0.5,0.18,0.35).translate(0,Hh+2.75,D/2+0.12));
    g.add(new T.Mesh(mergeGeos(tr),trim));
    g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(W+0.4,3.0,0.3).translate(0,Hh+1.4,D/2+0.1),new T.BoxGeometry(4,0.8,0.3).translate(0,Hh+3.3,D/2+0.1)]),cream));
    const sign=new T.Mesh(new T.PlaneGeometry(9.5,1.35),textSign('MAGASIN GÉNÉRAL',9.5,1.35,'#2f5a3a','#f3e6c4'));sign.position.set(0,Hh+1.35,D/2+0.27);g.add(sign);
    const yr=new T.Mesh(new T.PlaneGeometry(2.6,0.5),textSign('1923',2.6,0.5,'#e8e0cc','#2f5a3a',0.6));yr.position.set(0,Hh+3.3,D/2+0.27);g.add(yr);
    // Rez-de-chaussée : porte double vitrée avec imposte, deux grandes vitrines
    const fr=[],gl=[];
    [[-1,0.5],[1,-0.5]].forEach(([s])=>{const x=s*0.5;fr.push(new T.BoxGeometry(0.96,2.6,0.08).translate(x,1.3,D/2+0.05));});
    g.add(new T.Mesh(mergeGeos(fr),green));
    [-0.5,0.5].forEach(x=>gl.push(new T.PlaneGeometry(0.6,1.3).translate(x,1.65,D/2+0.1)));
    gl.push(new T.PlaneGeometry(1.8,0.5).translate(0,2.95,D/2+0.02));
    [-3.7,3.7].forEach(x=>{const w=windowGeo(3.0,1.9,x,1.75,D/2+0.06,0);fr.length=0;g.add(new T.Mesh(w.frame,trim));gl.push(w.glass.clone().translate(0,0,0.02));
      g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.06,1.9,0.06).translate(x,1.75,D/2+0.1),new T.BoxGeometry(3.0,0.06,0.06).translate(x,2.3,D/2+0.1)]),trim));
      g.add(new T.Mesh(new T.BoxGeometry(3.1,0.3,0.35).translate(x,0.55,D/2+0.2),wood));                       // boîte à fleurs
      g.add(new T.Mesh(mergeGeos([0,1,2,3,4,5].map(k=>new T.SphereGeometry(0.13,6,4).translate(x-1.25+k*0.5,0.78,D/2+0.22))),vmat(x<0?0xd8402a:0xe8c23a)));
    });
    g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(2.3,0.12,0.12).translate(0,2.66,D/2+0.06),new T.BoxGeometry(0.12,2.75,0.12).translate(1.1,1.35,D/2+0.06),new T.BoxGeometry(0.12,2.75,0.12).translate(-1.1,1.35,D/2+0.06)]),trim));
    g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.04,0.3,0.06).translate(0.18,1.3,D/2+0.12),new T.BoxGeometry(0.04,0.3,0.06).translate(-0.18,1.3,D/2+0.12)]),gold));
    // Étage : fenêtres à volets
    const uf=[],us=[];[-4.5,-1.5,1.5,4.5].forEach(x=>{const w=windowGeo(1.0,1.4,x,4.65,D/2+0.06,0);uf.push(w.frame);gl.push(w.glass);us.push(new T.BoxGeometry(0.42,1.45,0.05).translate(x-0.75,4.65,D/2+0.06),new T.BoxGeometry(0.42,1.45,0.05).translate(x+0.75,4.65,D/2+0.06));});
    [-1,1].forEach(sd=>[-2.2,2.2].forEach(z=>[1.8,4.65].forEach(y=>{const w=windowGeo(1.0,1.3,sd*(W/2+0.06),y,z,sd*Math.PI/2);uf.push(w.frame);gl.push(w.glass);})));
    [-3.5,3.5].forEach(x=>[1.8,4.65].forEach(y=>{const w=windowGeo(1.0,1.3,x,y,-D/2-0.06,Math.PI);uf.push(w.frame);gl.push(w.glass);}));
    {const bd=doorGeo(0.9,2.1,0,-D/2-0.04,Math.PI);g.add(new T.Mesh(bd.door,vmat(0x2f5a3a)),new T.Mesh(bd.frame,trim));}
    g.add(new T.Mesh(mergeGeos(uf),trim),new T.Mesh(mergeGeos(us),green),new T.Mesh(mergeGeos(gl),VIL_WIN));
    // Galerie couverte : plancher, marches, poteaux tournés, garde-corps, toit en appentis
    const P=[new T.BoxGeometry(W+1.2,0.24,2.8).translate(0,0.12,D/2+1.4),new T.BoxGeometry(3,0.14,0.45).translate(0,0.07,D/2+3.0)];
    [-6.3,-3.3,-1.4,1.4,3.3,6.3].forEach(x=>P.push(new T.CylinderGeometry(0.1,0.12,3.1,8).translate(x,1.7,D/2+2.65)));
    [[-6.3,-3.3],[-3.3,-1.4],[1.4,3.3],[3.3,6.3]].forEach(([a,b])=>{P.push(new T.BoxGeometry(b-a,0.08,0.09).translate((a+b)/2,1.05,D/2+2.65),new T.BoxGeometry(b-a,0.06,0.07).translate((a+b)/2,0.35,D/2+2.65));for(let x=a+0.22;x<b-0.1;x+=0.22)P.push(new T.BoxGeometry(0.05,0.7,0.05).translate(x,0.7,D/2+2.65));});
    g.add(new T.Mesh(mergeGeos(P),wood));
    const pr=new T.Mesh(new T.BoxGeometry(W+1.6,0.14,3.1),texMat(shingleTex('#8e2b22','#5e1b15'),14,3));pr.position.set(0,3.45,D/2+1.45);pr.rotation.x=0.13;g.add(pr);
    g.add(new T.Mesh(new T.BoxGeometry(W+1.6,0.32,0.08).translate(0,3.12,D/2+3.0),trim));
    const sub=new T.Mesh(new T.PlaneGeometry(6.5,0.3),textSign('ÉPICERIE · QUINCAILLERIE · POSTE',6.5,0.3,'#f6f1e4','#2f5a3a',0.62));sub.position.set(0,3.12,D/2+3.05);g.add(sub);
    // Banc, barils, caisses de pommes, glacière, lanterne au-dessus de la porte
    g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.8,0.07,0.45).translate(-4.8,0.7,D/2+0.6),new T.BoxGeometry(1.8,0.5,0.06).translate(-4.8,1.0,D/2+0.38),new T.BoxGeometry(0.08,0.46,0.4).translate(-5.6,0.47,D/2+0.6),new T.BoxGeometry(0.08,0.46,0.4).translate(-4.0,0.47,D/2+0.6),
      new T.BoxGeometry(0.6,0.45,0.45).translate(5.4,0.47,D/2+1.0),new T.BoxGeometry(0.6,0.45,0.45).translate(4.7,0.47,D/2+1.2),new T.BoxGeometry(0.6,0.45,0.45).translate(5.1,0.92,D/2+1.05)]),vmat(0x9a7448)));
    g.add(new T.Mesh(mergeGeos([new T.SphereGeometry(0.1,6,4).translate(5.3,0.72,D/2+1.0),new T.SphereGeometry(0.1,6,4).translate(5.5,0.72,D/2+0.95),new T.SphereGeometry(0.1,6,4).translate(4.6,0.72,D/2+1.25),new T.SphereGeometry(0.1,6,4).translate(4.85,0.72,D/2+1.2)]),vmat(0xc22a1e)));
    g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.3,0.33,0.85,12).translate(-6.0,0.67,D/2+1.9),new T.CylinderGeometry(0.3,0.33,0.85,12).translate(-6.0,0.67,D/2+1.2)]),vmat(0x8a6040)));
    g.add(new T.Mesh(new T.BoxGeometry(1.1,1.1,0.7).translate(3.0,0.79,D/2+0.55),vmat(0xf2f2f2)));
    const ice=new T.Mesh(new T.PlaneGeometry(0.9,0.35),textSign('GLACE',0.9,0.35,'#f2f2f2','#2d5b9a',0.7));ice.position.set(3.0,1.0,D/2+0.91);g.add(ice);
    g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.12,0.1,0.28,8).translate(0,2.95,D/2+0.45),new T.BoxGeometry(0.04,0.3,0.32).translate(0,3.12,D/2+0.3)]),black));
    const lampG=new T.Mesh(new T.CylinderGeometry(0.08,0.08,0.18,8).translate(0,2.95,D/2+0.45),VIL_LAMP);g.add(lampG);
    // Cheminée de briques sur le côté
    g.add(new T.Mesh(stoneStack(0.7,0.7,Hh+3.3,-W/2+1.4,0,-2,31),new T.MeshPhongMaterial({color:0x9a5a46,flatShading:true,vertexColors:true,shininess:3})));
    const SX=-13.5,SZ=2,p=placeB(g,SX,SZ,LEFT),bl=BL(SX,SZ,LEFT);
    // Collisions : bâtiment, poteaux de la galerie, barils
    bl.b(0,0,6,4.5);[-6.3,-3.3,-1.4,1.4,3.3,6.3].forEach(x=>bl.c(x,D/2+2.65,0.2));bl.c(-6,D/2+1.55,0.4);
    STORE_DOOR=vpos(...bl.at(0,D/2+2.4));
    label('Magasin général',p.x,VIL_H+10.6,p.z);
  }

  /* ===== Église : grande nef, clocher avec horloge et flèche, vitraux, perron, petit cimetière ===== */
  {
    const c=new T.Group(),L=14,Wd=8,Hh=6.5,white=texMat(sidingTex('#f1eee6','#c9c4b8'),1,26),grey=texMat(shingleTex('#5b5f63','#3b3e41'),16,9),silver=new T.MeshPhongMaterial({color:0xc7ccd0,shininess:80,specular:0x999999,flatShading:true});
    const nave=new T.Group();c.add(nave);nave.rotation.y=Math.PI/2;        // longueur selon z (avant : +z)
    nave.add(new T.Mesh(new T.BoxGeometry(L,Hh,Wd).translate(0,Hh/2,0),white));
    nave.add(new T.Mesh(mergeGeos([gable(L,Wd+0.1,Hh,3.2,L/2),gable(L,Wd+0.1,Hh,3.2,-L/2)]),texMat(sidingTex('#f1eee6','#c9c4b8'),1,12)));
    roofTex(nave,L,Wd,Hh+1.62,grey,0.68,0.45);
    // Vitraux en ogive (4 de chaque côté)
    const vit=canvasTex(64,128,(cx,w,h)=>{const cols=['#3a6fb8','#c23a2e','#e8b83a','#3c8a4a','#7a4ab0'];for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){cx.fillStyle=cols[(x/16+y/16*2)%5];cx.fillRect(x,y,16,16);}cx.strokeStyle='#222';cx.lineWidth=2;for(let y=0;y<=h;y+=16){cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke();}for(let x=0;x<=w;x+=16){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,h);cx.stroke();}});
    const vm=new T.MeshBasicMaterial({map:vit}),wf=[],wg=[];
    [-4.6,-1.6,1.4,4.4].forEach(x=>[-1,1].forEach(s=>{const z=s*(Wd/2+0.06),ry=s>0?0:Math.PI;
      const w=windowGeo(1.0,2.4,x,2.9,z,ry);wf.push(w.frame);wg.push(w.glass);
      const tri=new T.Shape();tri.moveTo(-0.58,0);tri.lineTo(0.58,0);tri.lineTo(0,0.62);tri.lineTo(-0.58,0);const tg=new T.ShapeGeometry(tri);tg.rotateY(ry);tg.translate(x,4.15,z+s*0.01);wg.push(tg);
      wf.push(new T.BoxGeometry(0.88,0.1,0.1).rotateZ(0.82).translate(x-0.29,4.46,z),new T.BoxGeometry(0.88,0.1,0.1).rotateZ(-0.82).translate(x+0.29,4.46,z));}));
    nave.add(new T.Mesh(mergeGeos(wf),vmat(0xffffff)),new T.Mesh(mergeGeos(wg),vm));
    // Sacristie à l'arrière
    nave.add(new T.Mesh(new T.BoxGeometry(3,3.4,4).translate(L/2+1.5,1.7,0),white));
    nave.add(new T.Mesh(new T.BoxGeometry(3.5,0.16,4.5).translate(L/2+1.55,3.48,0),grey),new T.Mesh(new T.BoxGeometry(3.6,0.1,4.6).translate(L/2+1.55,3.4,0),vmat(0xe0ddd5)));
    // Clocher : tour, horloge, abat-sons, corniche, flèche octogonale, croix
    const tz=L/2+1.7,TW=3.4;
    c.add(new T.Mesh(new T.BoxGeometry(TW,Hh+3.6,TW).translate(0,(Hh+3.6)/2,tz),white));
    c.add(new T.Mesh(mergeGeos([[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>new T.BoxGeometry(0.2,Hh+3.6,0.2).translate(a*TW/2,(Hh+3.6)/2,tz+b*TW/2))),vmat(0xe0ddd5)));
    const by=Hh+3.6;
    c.add(new T.Mesh(mergeGeos([new T.BoxGeometry(TW+0.4,0.25,TW+0.4).translate(0,by,tz),new T.BoxGeometry(TW,2.2,TW).translate(0,by+1.25,tz).scale(1,1,1),new T.BoxGeometry(TW+0.5,0.3,TW+0.5).translate(0,by+2.45,tz)]),white));
    const lv=[];[0,1,2,3].forEach(k=>{for(let j=0;j<5;j++){const gg=new T.BoxGeometry(1.8,0.08,0.3).rotateX(0.5).translate(0,by+0.6+j*0.3,TW/2+0.04);gg.rotateY(k*Math.PI/2);lv.push(gg.translate(0,0,0));}});
    const lvM=mergeGeos(lv);lvM.translate(0,0,tz);c.add(new T.Mesh(lvM,vmat(0x3a3a3a)));
    const sp=new T.Mesh(new T.ConeGeometry(1.9,7.5,8),silver);sp.position.set(0,by+2.6+3.75,tz);sp.rotation.y=Math.PI/8;c.add(sp);
    c.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.12,1.3,0.12).translate(0,by+10.8,tz),new T.BoxGeometry(0.75,0.12,0.12).translate(0,by+11.0,tz),new T.SphereGeometry(0.16,8,6).translate(0,by+10.15,tz)]),vmat(0xd9c27a)));
    const clock=new T.Mesh(new T.CircleGeometry(0.75,24),new T.MeshBasicMaterial({map:canvasTex(128,128,(cx,w,h)=>{cx.fillStyle='#f6f1e4';cx.beginPath();cx.arc(64,64,62,0,7);cx.fill();cx.strokeStyle='#222';cx.lineWidth=5;cx.stroke();
      cx.fillStyle='#222';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cx.fillRect(64+Math.sin(a)*50-3,64-Math.cos(a)*50-3,6,6);}cx.lineWidth=6;cx.beginPath();cx.moveTo(64,64);cx.lineTo(64,22);cx.stroke();cx.beginPath();cx.moveTo(64,64);cx.lineTo(92,64);cx.stroke();})}));
    clock.position.set(0,Hh+1.9,tz+TW/2+0.02);c.add(clock);
    // Rosace et grande porte double en arc
    const rose=new T.Mesh(new T.CircleGeometry(0.6,20),vm);rose.position.set(0,Hh-0.3,tz+TW/2+0.02);c.add(rose);
    c.add(new T.Mesh(new T.TorusGeometry(0.62,0.06,6,24).translate(0,Hh-0.3,tz+TW/2+0.03),vmat(0xffffff)));
    const dg1=doorGeo(0.9,2.8,-0.46,tz+TW/2+0.03),dg2=doorGeo(0.9,2.8,0.46,tz+TW/2+0.03);
    c.add(new T.Mesh(mergeGeos([dg1.door,dg2.door]),vmat(0x6b2a22)),new T.Mesh(mergeGeos([dg1.frame,dg2.frame]),vmat(0xffffff)),new T.Mesh(mergeGeos([dg1.knob,dg2.knob]),gold));
    const arch=new T.Shape();arch.moveTo(-1.05,0);arch.lineTo(1.05,0);arch.lineTo(0,0.8);arch.lineTo(-1.05,0);c.add(new T.Mesh(new T.ShapeGeometry(arch).translate(0,2.85,tz+TW/2+0.04),vmat(0xffffff)));
    c.add(new T.Mesh(mergeGeos([new T.BoxGeometry(4.2,0.18,1.6).translate(0,0.09,tz+TW/2+0.8),new T.BoxGeometry(3.4,0.18,1.1).translate(0,0.27,tz+TW/2+0.55),new T.BoxGeometry(2.6,0.18,0.6).translate(0,0.45,tz+TW/2+0.3)]),vmat(0x9a958c)));
    // Petit cimetière derrière : clôture blanche, croix et pierres tombales
    const cx0=-8.5,cz=-1,cf=[],cr=[];
    for(let x=-3;x<=3.01;x+=0.35){cf.push(new T.BoxGeometry(0.06,0.7,0.04).translate(cx0+x,0.35,cz-2.5));if(Math.abs(x)>0.7)cf.push(new T.BoxGeometry(0.06,0.7,0.04).translate(cx0+x,0.35,cz+2.5));}
    for(let z=-2.5;z<=2.5;z+=0.35){cf.push(new T.BoxGeometry(0.04,0.7,0.06).translate(cx0-3,0.35,cz+z),new T.BoxGeometry(0.04,0.7,0.06).translate(cx0+3,0.35,cz+z));}
    cf.push(new T.BoxGeometry(6,0.06,0.05).translate(cx0,0.55,cz-2.5),new T.BoxGeometry(2.3,0.06,0.05).translate(cx0-1.85,0.55,cz+2.5),new T.BoxGeometry(2.3,0.06,0.05).translate(cx0+1.85,0.55,cz+2.5),new T.BoxGeometry(0.05,0.06,5).translate(cx0-3,0.55,cz),new T.BoxGeometry(0.05,0.06,5).translate(cx0+3,0.55,cz));
    c.add(new T.Mesh(mergeGeos(cf),vmat(0xf4f1ea)));
    [[-2,-1.2],[-0.6,-1.2],[0.8,-1.2],[2.1,-1.2],[-1.8,0.7],[1.6,0.7],[2.3,1.7]].forEach(([x,z],i)=>{x+=cx0;
      if(i%3===0)cr.push(new T.BoxGeometry(0.1,0.9,0.08).translate(x,0.45,cz+z),new T.BoxGeometry(0.5,0.08,0.08).translate(x,0.65,cz+z));
      else cr.push(new T.BoxGeometry(0.55,0.7,0.14).translate(x,0.35,cz+z),new T.CylinderGeometry(0.275,0.275,0.14,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2).translate(x,0.7,cz+z));});
    c.add(new T.Mesh(mergeGeos(cr),vmat(0x9a9890)));
    const p=placeB(c,17,6,RIGHT),bl=BL(17,6,RIGHT);
    bl.b(0,0,4,7);bl.b(0,tz,1.7,1.7);bl.b(0,-8.5,2,1.5);
    for(let x=-3;x<=3.01;x+=1){bl.c(cx0+x,cz-2.5,0.25);if(Math.abs(x)>0.7)bl.c(cx0+x,cz+2.5,0.25);}
    for(let z=-1.5;z<=1.51;z+=1){bl.c(cx0-3,cz+z,0.25);bl.c(cx0+3,cz+z,0.25);}
    label('Église',p.x,VIL_H+12,p.z);
  }

  /* ===== Maisons : déclin coloré, volets, galerie, cheminée ===== */
  [[-12,-28,'#4f6f8f','#2e4458','#8e2b22',0,LEFT],[12,-14,'#efe9dc','#c9c0ae','#8e2b22',2,RIGHT]].forEach(([lx,lz,wc,lc,dc,k,r])=>{
    const h=new T.Group();h.add(new T.Mesh(new T.BoxGeometry(6,3.0,5).translate(0,1.5,0),texMat(sidingTex(wc,lc),1,14)));
    h.add(new T.Mesh(mergeGeos([gable(6,5,3.0,1.6,3),gable(6,5,3.0,1.6,-3)]),texMat(sidingTex(wc,lc),1,7)));
    roofTex(h,6,5,3.8,texMat(shingleTex('#3a3430','#262220'),9,7),0.6,0.45);
    const hd=doorGeo(1,2.0,0.8,2.52);h.add(new T.Mesh(hd.door,vmat(parseInt(dc.slice(1),16))),new T.Mesh(hd.frame,vmat(0xf1eee6)),new T.Mesh(hd.knob,gold));
    const hw=[],hg=[],sh=[];[-1.4,2.2].forEach(x=>{const w=windowGeo(0.9,1.0,x,1.6,2.56,0);hw.push(w.frame);hg.push(w.glass);sh.push(new T.BoxGeometry(0.32,1.05,0.05).translate(x+0.7,1.6,2.56),new T.BoxGeometry(0.32,1.05,0.05).translate(x-0.7,1.6,2.56));});
    [-1.3,1.3].forEach(z=>[-1,1].forEach(sd=>{const w=windowGeo(0.8,0.9,sd*3.06,1.6,z,sd*Math.PI/2);hw.push(w.frame);hg.push(w.glass);}));
    h.add(new T.Mesh(mergeGeos(hw),vmat(0xf1eee6)),new T.Mesh(mergeGeos(hg),VIL_WIN),new T.Mesh(mergeGeos(sh),vmat(0x2a3a2a)));
    h.add(new T.Mesh(stoneStack(0.6,0.6,4.8,-1.9,0,-1.0,21+k),new T.MeshPhongMaterial({color:0x9a7a6a,flatShading:true,vertexColors:true,shininess:3})));
    const gp=[new T.BoxGeometry(6.4,0.18,1.6).translate(0,0.09,3.3)];[-3,-0.2,3].forEach(x=>gp.push(new T.BoxGeometry(0.12,2.3,0.12).translate(x,1.25,4.0)));
    for(let x=-3;x<-0.3;x+=0.25)gp.push(new T.BoxGeometry(0.05,0.6,0.05).translate(x,0.5,4.0));gp.push(new T.BoxGeometry(2.8,0.07,0.07).translate(-1.6,0.82,4.0));
    h.add(new T.Mesh(mergeGeos(gp),vmat(0xf1eee6)));
    const pr=new T.Mesh(new T.BoxGeometry(6.6,0.1,1.8),texMat(shingleTex('#3a3430','#262220'),9,2));pr.position.set(0,2.45,3.3);pr.rotation.x=0.18;h.add(pr);
    // Corde à bois et boîte aux lettres
    h.add(new T.Mesh(mergeGeos([0,1,2,3,4,5,6,7].map(i=>new T.CylinderGeometry(0.11,0.11,0.5,7).rotateX(Math.PI/2).translate(3.6+(i%4)*0.23-0.35,0.12+Math.floor(i/4)*0.22,-1.2))),logMatsFor('erable')));
    h.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.08,1.1,0.08).translate(1.6,0.55,6.2),new T.BoxGeometry(0.28,0.25,0.45).translate(1.6,1.2,6.2)]),vmat(0x5a5a5a)));
    placeB(h,lx,lz,r);const bl=BL(lx,lz,r);bl.b(0,0,3,2.5);bl.c(-3,4.0,0.2);bl.c(3,4.0,0.2);bl.c(1.6,6.2,0.15);
  });

  /* ===== Scierie : grand bâtiment, porte ouverte sur le bois scié, bureau avec les prix, appentis, cheminée ===== */
  {
    const s=new T.Group(),W=13,D=8,Hh=5.2,plank=texMat(sidingTex('#8a6440','#5a3e24',true),32,1),tin=texMat(tinTex(),22,1,{shininess:30}),trimS=vmat(0x4d3220);
    // Murs autour de la grande ouverture (avant, +z)
    const ox=-1.5,ow=4.6,oh=3.9;
    const wall=[new T.BoxGeometry(W,Hh,0.2).translate(0,Hh/2,-D/2),new T.BoxGeometry(0.2,Hh,D).translate(-W/2,Hh/2,0),new T.BoxGeometry(0.2,Hh,D).translate(W/2,Hh/2,0),
      new T.BoxGeometry(ox-ow/2+W/2,Hh,0.2).translate((-W/2+ox-ow/2)/2,Hh/2,D/2),new T.BoxGeometry(W/2-(ox+ow/2),Hh,0.2).translate((W/2+ox+ow/2)/2,Hh/2,D/2),new T.BoxGeometry(ow,Hh-oh,0.2).translate(ox,oh+(Hh-oh)/2,D/2)];
    s.add(new T.Mesh(mergeGeos(wall),plank));
    s.add(new T.Mesh(mergeGeos([gable(W,D,Hh,2.0,W/2),gable(W,D,Hh,2.0,-W/2)]),texMat(sidingTex('#8a6440','#5a3e24',true),14,1)));
    roofTex(s,W,D,Hh+1.0,tin,0.47,0.6);
    // Intérieur sombre : sol, piles de planches, chariot avec un billot, lampes
    s.add(new T.Mesh(new T.BoxGeometry(W-0.4,0.06,D-0.4).translate(0,0.03,0),vmat(0x5a4632)));
    s.add(new T.Mesh(new T.BoxGeometry(W-0.4,Hh-0.2,0.05).translate(0,Hh/2,-D/2+0.13),vmat(0x3a2a1c)));
    const lum=[];for(let k=0;k<7;k++)lum.push(new T.BoxGeometry(2.6,0.08,1.4).translate(-4.6,0.12+k*0.11,-1.8),new T.BoxGeometry(2.6,0.08,1.4).translate(2.4,0.12+k*0.11,-2.0));
    for(let k=0;k<5;k++)lum.push(new T.BoxGeometry(0.06,0.05,1.5).translate(-5.7+k*0.55,0.2+((k%3)*0.11),-1.8));
    s.add(new T.Mesh(mergeGeos(lum),vmat(0xd9b27c)));
    s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(5,0.12,0.18).translate(ox,0.4,0.2),new T.BoxGeometry(5,0.12,0.18).translate(ox,0.4,1.4),new T.BoxGeometry(1.4,0.5,1.3).translate(ox-1.6,0.55,0.8)]),vmat(0x3d4247)));
    s.add(new T.Mesh(new T.CylinderGeometry(0.32,0.36,4.2,11).rotateZ(Math.PI/2).translate(ox+0.4,0.95,0.8),logMatsFor('epinette')));
    s.add(new T.Mesh(mergeGeos([-4,0,4].map(x=>new T.ConeGeometry(0.25,0.18,10,1,true).translate(x,Hh-0.5,0))),vmat(0x2f3a35)));
    s.add(new T.Mesh(mergeGeos([-4,0,4].map(x=>new T.SphereGeometry(0.09,8,6).translate(x,Hh-0.62,0))),VIL_LAMP));
    // Grande porte coulissante ouverte sur son rail
    s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(ow/2+0.2,oh,0.1).translate(ox+ow/2+1.3,oh/2,D/2+0.18),new T.BoxGeometry(ow/2+0.2,0.1,0.12).rotateZ(0.85).translate(ox+ow/2+1.3,oh/2,D/2+0.24),new T.BoxGeometry(ow/2+0.2,0.1,0.12).rotateZ(-0.85).translate(ox+ow/2+1.3,oh/2,D/2+0.24),
      new T.BoxGeometry(ow/2+0.2,oh,0.1).translate(ox-ow/2-1.3,oh/2,D/2+0.18)]),vmat(0x6b4a2c)));
    s.add(new T.Mesh(new T.BoxGeometry(ow+5.6,0.1,0.1).translate(ox,oh+0.2,D/2+0.25),black));
    s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.2,oh,0.25).translate(ox-ow/2,oh/2,D/2+0.05),new T.BoxGeometry(0.2,oh,0.25).translate(ox+ow/2,oh/2,D/2+0.05),new T.BoxGeometry(ow+0.4,0.25,0.25).translate(ox,oh,D/2+0.05)]),trimS));
    const ss=new T.Mesh(new T.PlaneGeometry(6.2,1.0),textSign('SCIERIE DU VILLAGE',6.2,1.0,'#2f4a35','#f1e6c8'));ss.position.set(ox,oh+0.85,D/2+0.13);s.add(ss);
    // Petites fenêtres, porte du bureau et tableau des prix sur la façade
    const wf=[],wg=[];[[-W/2-0.12,-1.8,-Math.PI/2],[-W/2-0.12,1.8,-Math.PI/2],[W/2+0.12,-2.2,Math.PI/2],[W/2+0.12,1.6,Math.PI/2]].forEach(([x,z,ry])=>{const w=windowGeo(1.1,0.9,x,2.6,z,ry);wf.push(w.frame);wg.push(w.glass);});
    s.add(new T.Mesh(mergeGeos(wf),trim),new T.Mesh(mergeGeos(wg),VIL_WIN));
    const od=doorGeo(0.9,2.1,4.1,D/2+0.12);s.add(new T.Mesh(od.door,vmat(0x2f4a35)),new T.Mesh(od.frame,trim),new T.Mesh(od.knob,gold));
    const bs=new T.Mesh(new T.PlaneGeometry(1.3,0.32),textSign('BUREAU',1.3,0.32,'#f6f1e4','#2f4a35',0.6));bs.position.set(4.1,2.45,D/2+0.13);s.add(bs);
    s.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.2,0.08,1.0).translate(4.1,2.75,D/2+0.5),new T.BoxGeometry(0.06,0.4,0.06).translate(3.6,2.5,D/2+0.95),new T.BoxGeometry(0.06,0.4,0.06).translate(4.6,2.5,D/2+0.95)]),trimS));
    s.add(new T.Mesh(new T.BoxGeometry(1.3,1.1,0.06).translate(5.6,1.5,D/2+0.14),vmat(0x3a2a1c)));
    const pb=new T.Mesh(new T.PlaneGeometry(1.15,0.25),textSign('PRIX DU BOIS',1.15,0.25,'#3a2a1c','#f1e6c8',0.7));pb.position.set(5.6,1.9,D/2+0.18);s.add(pb);
    const paper=new T.MeshBasicMaterial({color:0xf1e6c8});[-0.35,0.05,0.42].forEach((x,i)=>{const b=new T.Mesh(new T.PlaneGeometry(0.3,0.42),paper);b.position.set(5.6+x*0.85,1.35,D/2+0.18);b.rotation.z=(i-1)*0.06;s.add(b);});
    // Appentis à l'arrière-gauche avec planches empilées et lattées
    const LX=-W/2-2.2,lp=[];[-3.4,0,3.4].forEach(z=>lp.push(new T.BoxGeometry(0.16,3.4,0.16).translate(LX-1.9,1.7,z)));
    s.add(new T.Mesh(mergeGeos(lp),trimS));
    const lr=new T.Mesh(new T.BoxGeometry(4.6,0.1,7.8),tin);lr.position.set(LX,3.75,0);lr.rotation.z=0.18;s.add(lr);
    const pl=[];[-2.2,1.6].forEach(z=>{for(let k=0;k<9;k++)pl.push(new T.BoxGeometry(3.0,0.07,2.2).translate(LX,0.12+k*0.13,z));for(let k=0;k<4;k++)pl.push(new T.BoxGeometry(3.0,0.04,0.06).translate(LX,0.18+k*0.39,z-0.9),new T.BoxGeometry(3.0,0.04,0.06).translate(LX,0.18+k*0.39,z+0.9));});
    s.add(new T.Mesh(mergeGeos(pl),vmat(0xd9b27c)));
    // Cheminée de la bouilloire
    s.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.32,0.36,11,12).translate(W/2-1.6,5.5,-D/2+0.9),new T.CylinderGeometry(0.45,0.45,0.25,12).translate(W/2-1.6,11,-D/2+0.9)]),new T.MeshPhongMaterial({color:0x3a3d40,shininess:40})));
    const p=placeB(s,-27,22,LEFT),bl=BL(-27,22,LEFT);
    bl.b(0,0,6.5,4);[-3.4,0,3.4].forEach(z=>bl.c(LX-1.9,z,0.25));bl.b(LX,-0.3,1.5,3.4);bl.c(W/2-1.6,-D/2+0.9,0.45);
    MILL_DOOR=vpos(...bl.at(5.6,D/2+0.9));
    label('Scierie',p.x,VIL_H+8.5,p.z);
  }

  /* ===== Concessionnaire : grand bâtiment d'acier, salle de montre vitrée, porte de garage ===== */
  {
    const g=new T.Group(),W=18,D=12,Hh=6.6;
    const steel=texMat(tinTex(),20,1,{shininess:30}),bodyM=vmat(0xd9d6cf),red=vmat(0xb3241f),glassM=new T.MeshPhongMaterial({color:0x5d7a8c,shininess:90,specular:0x99aabb});
    g.add(new T.Mesh(new T.BoxGeometry(W,Hh,D).translate(0,Hh/2,0),bodyM));
    g.add(new T.Mesh(mergeGeos([gable(W,D+0.1,Hh,1.2,W/2),gable(W,D+0.1,Hh,1.2,-W/2)]),bodyM));
    roofTex(g,W,D,Hh+0.5,steel,0.2,0.4);
    // bandeau rouge et enseigne
    g.add(new T.Mesh(new T.BoxGeometry(W+0.2,0.9,0.2).translate(0,Hh-0.55,D/2+0.1),red));
    const sg=new T.Mesh(new T.PlaneGeometry(12,0.8),textSign('ÉQUIPEMENT FORESTIER · CHASSE ET PÊCHE',12,0.8,'#b3241f','#ffffff',0.6));sg.position.set(-1.5,Hh-0.55,D/2+0.21);g.add(sg);
    // porte d'entrée vitrée (porte d'homme), entre la salle de montre et la porte de garage
    {const dd=doorGeo(1.0,2.2,2.45,D/2+0.04);g.add(new T.Mesh(dd.door,glassM),new T.Mesh(dd.frame,vmat(0x2b2f33)),new T.Mesh(dd.knob,gold));
     const ds=new T.Mesh(new T.PlaneGeometry(1.1,0.3),textSign('ENTRÉE',1.1,0.3,'#2b2f33','#ffffff',0.6));ds.position.set(2.45,2.55,D/2+0.1);g.add(ds);}
    // salle de montre : grandes vitrines + porte vitrée
    const fr=[],gl=[];
    gl.push(new T.PlaneGeometry(10,3.6).translate(-3.5,2.2,D/2+0.02));
    for(let x=-8.5;x<=1.51;x+=2.5)fr.push(new T.BoxGeometry(0.12,3.8,0.12).translate(x,2.2,D/2+0.06));
    fr.push(new T.BoxGeometry(10.2,0.14,0.14).translate(-3.5,4.05,D/2+0.06),new T.BoxGeometry(10.2,0.14,0.14).translate(-3.5,0.35,D/2+0.06));
    g.add(new T.Mesh(mergeGeos(fr),vmat(0x2b2f33)),new T.Mesh(mergeGeos(gl),glassM));
    // intérieur vu à travers la vitre : plancher pâle et un VTT en montre
    g.add(new T.Mesh(new T.BoxGeometry(W-0.4,0.05,D-0.4).translate(0,0.03,0),vmat(0xbdb8ad)));
    // grande porte de garage (atelier) à droite
    const gd=[];for(let k=0;k<8;k++)gd.push(new T.BoxGeometry(4.2,0.5,0.08).translate(5.6,0.3+k*0.52,D/2+0.05));
    g.add(new T.Mesh(mergeGeos(gd),vmat(0xe8e6e0)));
    g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.2,4.4,0.2).translate(3.4,2.2,D/2+0.06),new T.BoxGeometry(0.2,4.4,0.2).translate(7.8,2.2,D/2+0.06),new T.BoxGeometry(4.6,0.2,0.2).translate(5.6,4.4,D/2+0.06)]),vmat(0x2b2f33)));
    const sv=new T.Mesh(new T.PlaneGeometry(2.6,0.45),textSign('SERVICE',2.6,0.45,'#2b2f33','#ffffff',0.6));sv.position.set(5.6,4.85,D/2+0.12);g.add(sv);
    // fenêtres sur les côtés
    const sf=[],sgl=[];[-1,1].forEach(sd=>[-3,1,4].forEach(z=>{const w=windowGeo(1.4,1.1,sd*(W/2+0.06),3.2,z,sd*Math.PI/2);sf.push(w.frame);sgl.push(w.glass);}));
    g.add(new T.Mesh(mergeGeos(sf),trim),new T.Mesh(mergeGeos(sgl),VIL_WIN));
    // pylône près de la rue
    const py=new T.Group();py.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.25,4.2,0.25).translate(-1.3,2.1,0),new T.BoxGeometry(0.25,4.2,0.25).translate(1.3,2.1,0)]),vmat(0x2b2f33)));
    py.add(new T.Mesh(new T.BoxGeometry(3.4,1.3,0.3).translate(0,4.6,0),red));
    const pt=new T.Mesh(new T.PlaneGeometry(3.2,1.1),textSign('MACHINERIE',3.2,1.1,'#b3241f','#ffffff',0.36));pt.position.set(0,4.6,0.16);py.add(pt);
    const pt2=pt.clone();pt2.rotation.y=Math.PI;pt2.position.z=-0.16;py.add(pt2);
    py.position.set(8.0,0,D/2+12.4);py.rotation.y=Math.PI/2;g.add(py);
    const DX=24,DZ=24,p=placeB(g,DX,DZ,RIGHT),bl=BL(DX,DZ,RIGHT);
    bl.b(0,0,9,6);bl.c(8.0-1.3,D/2+12.4,0.25);bl.c(8.0+1.3,D/2+12.4,0.25);
    DEALER_DOOR=vpos(...bl.at(2.45,D/2+1.3));
    label('Concessionnaire',p.x,VIL_H+9.5,p.z);
  }

  /* ===== Asphalte : la rue, le stationnement (vente de véhicules) et le devant du concessionnaire ===== */
  {
    const asph=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#3d3f42';c.fillRect(0,0,w,h);for(let i=0;i<3500;i++){const v=40+Math.random()*50|0;c.fillStyle=`rgba(${v},${v+2},${v+5},0.55)`;c.fillRect(Math.random()*w,Math.random()*h,2,2);}});
    asph.wrapS=asph.wrapT=T.RepeatWrapping;
    const am=new T.MeshLambertMaterial({map:asph,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const rects=[[-4.4,4.4,-37.4,37],[-17.5,-4.4,-21.5,-5.5],[4.4,18,14,34]];
    const gs=rects.map(([x0,x1,z0,z1])=>{const g=new T.PlaneGeometry(x1-x0,z1-z0).rotateX(-Math.PI/2).translate((x0+x1)/2,0.04,(z0+z1)/2);
      const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(x1-x0)/6,uv.getY(i)*(z1-z0)/6);return g;});
    const road=new T.Mesh(mergeGeos(gs),am);road.receiveShadow=true;
    // lignes : jaune pointillée au centre, blanches au stationnement
    const lineY=[],lineW=[];
    for(let z=-33;z<36;z+=6)lineY.push(new T.PlaneGeometry(0.15,3).rotateX(-Math.PI/2).translate(0,0.06,z+1.5));
    for(let z=-21;z<=-5.9;z+=3)lineW.push(new T.PlaneGeometry(5,0.12).rotateX(-Math.PI/2).translate(-15,0.06,z));
    lineW.push(new T.PlaneGeometry(0.12,15).rotateX(-Math.PI/2).translate(-17.4,0.06,-13.5));
    // stationnement du concessionnaire, de chaque côté du cercle de vente
    [14.2,17,31,33.8].forEach(z=>lineW.push(new T.PlaneGeometry(5,0.12).rotateX(-Math.PI/2).translate(15.5,0.06,z)));
    const lm=(c)=>new T.MeshBasicMaterial({color:c,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
    const lines=new T.Group();lines.add(new T.Mesh(mergeGeos(lineY),lm(0xe8c23a)),new T.Mesh(mergeGeos(lineW),lm(0xf2f2f2)),road);
    const q=vpos(0,0);lines.position.set(q.x,VIL_H,q.z);lines.rotation.y=VROT;scene.add(lines);
    // La route asphaltée (est-ouest) : un ruban qui suit le relief, ligne jaune pointillée et lignes blanches de côté
    PATHS.filter(P=>P.kind==='route'&&P.id!=='rue').forEach(P=>{
      const pts=[];for(let i=0;i<P.pts.length-1;i++){const [ax,az]=P.pts[i],[bx,bz]=P.pts[i+1],n=Math.ceil(Math.hypot(bx-ax,bz-az));for(let k=0;k<n;k++)pts.push([lerp(ax,bx,k/n),lerp(az,bz,k/n)]);}
      pts.push(P.pts[P.pts.length-1]);
      const A=[-1,-0.5,0,0.5,1],pos=[],uv=[],idx=[],ly=[],lw=[];let s=0;
      const strip=(arr,off,hw,dash)=>{const base=arr.length/3,ok=[];pts.forEach((p,i)=>{const q=pts[Math.min(i+1,pts.length-1)],r=pts[Math.max(i-1,0)],tx=q[0]-r[0],tz=q[1]-r[1],l=Math.hypot(tx,tz)||1,nx=-tz/l,nz=tx/l;
        [off-hw,off+hw].forEach(o=>{const x=p[0]+nx*o,z=p[1]+nz*o;arr.push(x,H(x,z)+0.1,z);});ok.push((!dash||(i%6)<3)&&!(off<-1&&Math.abs(p[0]-VILLAGE.x)<4.6));});return {base,ok};};
      pts.forEach((p,i)=>{const q=pts[Math.min(i+1,pts.length-1)],r=pts[Math.max(i-1,0)],tx=q[0]-r[0],tz=q[1]-r[1],l=Math.hypot(tx,tz)||1,nx=-tz/l,nz=tx/l;
        if(i)s+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);
        A.forEach(a=>{const o=a*P.w/2,x=p[0]+nx*o,z=p[1]+nz*o;pos.push(x,H(x,z)+0.08,z);uv.push(a*P.w/12,s/6);});});
      for(let i=0;i<pts.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;idx.push(a,a+1,b,a+1,b+1,b);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
      const rm=new T.Mesh(g,am);rm.receiveShadow=true;scene.add(rm);
      const lineGeo=(off,hw,dash)=>{const arr=[],ix=[],st=strip(arr,off,hw,dash);for(let i=0;i<pts.length-1;i++)if(st.ok[i]){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}
        const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(arr,3));lg.setIndex(ix);return lg;};
      scene.add(new T.Mesh(lineGeo(0,0.08,true),lm(0xe8c23a)),new T.Mesh(lineGeo(-P.w/2+0.35,0.07),lm(0xf2f2f2)),new T.Mesh(lineGeo(P.w/2-0.35,0.07),lm(0xf2f2f2)));
    });
  }

  /* ===== Grands lampadaires de chaque côté de la rue ===== */
  const VIL_LAMPS=[[-5.2,-24],[-5.2,-3],[-5.2,9.6],[5.2,-22],[5.2,-6],[5.2,12],[5.2,36]];
  {const g=new T.Group(),pole=[],glow=[];
   VIL_LAMPS.forEach(([lx,lz])=>{
     const s=lx<0?1:-1;            // le bras s'avance au-dessus de la rue
     pole.push(new T.CylinderGeometry(0.1,0.16,6.2,8).translate(lx,3.1,lz),new T.CylinderGeometry(0.22,0.26,0.5,8).translate(lx,0.25,lz),
       new T.BoxGeometry(1.7,0.08,0.08).translate(lx+s*0.8,6.0,lz),new T.BoxGeometry(0.9,0.06,0.06).rotateZ(s*0.6).translate(lx+s*0.38,5.7,lz),
       new T.CylinderGeometry(0.05,0.32,0.28,10).translate(lx+s*1.6,5.86,lz));
     glow.push(new T.CylinderGeometry(0.2,0.24,0.12,10).translate(lx+s*1.6,5.68,lz));colL(lx,lz,0.25);});
   g.add(new T.Mesh(mergeGeos(pole),vmat(0x2b2f33)),new T.Mesh(mergeGeos(glow),VIL_LAMP));placeB(g,0,0);
   // Flaques de lumière au sol (une seule géométrie, additive) ; l'opacité suit la nuit (ciel.js)
   const pools=[];VIL_LAMPS.forEach(([lx,lz])=>pools.push(new T.PlaneGeometry(9,9).rotateX(-Math.PI/2).translate(lx+(lx<0?1.6:-1.6),0.06,lz)));
   const pm=new T.Mesh(mergeGeos(pools),VIL_POOL);const q=vpos(0,0);pm.position.set(q.x,VIL_H,q.z);pm.rotation.y=VROT;pm.renderOrder=2;scene.add(pm);}
  {const q=vpos(0,6);label('Village',q.x,VIL_H+14,q.z,30);}
}
Object.assign(YARD,vpos(-14,22));
const yardRing=groundRing(YARD.x,YARD.z,YARD.r-0.35,YARD.r,48,0xffd27a,0.55);
// Billots déjà vendus, cordés derrière la scierie
const YARD_STACK=vpos(-25,20);
const yardStack=new T.Group();yardStack.position.set(YARD_STACK.x,H(YARD_STACK.x,YARD_STACK.z),YARD_STACK.z);yardStack.rotation.y=VROT+Math.PI/2;scene.add(yardStack);
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

const stumpList=[],campStumps=[],ROCKS=[];   // ROCKS : roches qu'on peut pousser avec un véhicule   // souches qu'on peut arracher à la pelle
/* ---------- Forêt ---------- */
const SPECIES={epinette:{n:'Épinette',p:30},sapin:{n:'Sapin',p:25},erable:{n:'Érable',p:45},bouleau:{n:'Bouleau',p:35}};
const TREE_INST={},REG_INST={};
const REG_RECT={};   // boîte de chaque carré de forêt
const treeList=[];
// La forêt, zone par zone (chaque zone a son hasard, ses essences et sa densité)
const FOREST=[
  {id:'main',r:MAIN_LAND,n:850,seed:601,gap:2.4,s:[0.8,1.3],mix:'centre'},
  {id:'erab',r:LANDS.erab,n:600,seed:602,gap:2.5,s:[0.95,1.45],types:[['erable',0.78],['bouleau',0.1],['sapin',0.06],['epinette',0.06]]},
  {id:'coupe',r:LANDS.coupe,n:600,seed:603,gap:2.6,s:[1.0,1.55],types:[['epinette',0.48],['sapin',0.32],['bouleau',0.12],['erable',0.08]]},
  {id:'sudouest',r:RESERVED[1],n:160,seed:604,gap:2.6,s:[0.7,1.1],types:[['erable',0.45],['bouleau',0.25],['sapin',0.15],['epinette',0.15]]},
  {id:'sudest',r:RESERVED[2],n:160,seed:605,gap:2.6,s:[0.7,1.1],types:[['epinette',0.4],['sapin',0.3],['bouleau',0.2],['erable',0.1]]},
  {id:'nord',r:{x0:WB.x0,x1:WB.x1,z0:WB.z0,z1:MAIN_LAND.z0},n:650,seed:606,gap:2.5,s:[0.8,1.3],mix:'nord'},
  {id:'sud',r:{x0:WB.x0,x1:WB.x1,z0:190,z1:WB.z1},n:90,seed:607,gap:2.6,s:[0.8,1.2],types:[['erable',0.35],['bouleau',0.25],['epinette',0.2],['sapin',0.2]]}
];
// bosquets et petites clairières : la densité varie doucement
const groveN=(x,z)=>0.5+0.3*Math.sin(x*0.045+1.3)*Math.cos(z*0.05+0.4)+0.2*Math.sin(x*0.11+z*0.07);
function forestTypes(Z,x,z){
  if(Z.mix==='centre'){const w=clamp((x+80)/160,0,1);   // érables à l'ouest, résineux à l'est
    return [['erable',0.5-0.3*w],['bouleau',0.18],['epinette',0.17+0.2*w],['sapin',0.15+0.1*w]];}
  if(Z.mix==='nord'){const up=clamp(hillH(x,z)/HILL.h,0,1);   // plus on monte, plus c'est résineux
    return [['epinette',0.3+0.3*up],['sapin',0.22+0.15*up],['erable',0.28-0.25*up],['bouleau',0.2-0.2*up]];}
  return Z.types;
}
function forestOk(x,z){
  if(outW(x,z,2))return false;
  if(trailDist(x,z)<3.4)return false;
  if(Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP_FLAT-1)return false;
  if(vilOut(x,z)<4)return false;
  if(reservedAt(x,z,2))return false;
  if(nearLake(x,z)&&lakeE(x,z)<1.3)return false;
  if(nearRiver(x,z)&&riverInfo(x,z).d<4.5)return false;
  if(Math.hypot(x-HILL.x,z-HILL.z)<9)return false;
  if(PILE_DEF.some(pp=>Math.hypot(x-pp.x,z-pp.z)<5))return false;
  if(x>DOCK.x0-6&&x<DOCK.x1+4&&Math.abs(z-LAKE.z)<5)return false;
  return true;
}
for(const Z of FOREST){
  const rr=mulberry32(Z.seed),R=Z.r,start=treeList.length;
  for(let k=0;k<Z.n*10&&treeList.length<start+Z.n;k++){
    const x=R.x0+rr()*(R.x1-R.x0),z=R.z0+rr()*(R.z1-R.z0);
    if(rr()>0.25+0.75*groveN(x,z))continue;
    if(!forestOk(x,z))continue;
    if(Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP_FLAT+10&&rr()<0.6)continue;   // le bois s'éclaircit près du camp
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<Z.gap))continue;
    let r=rr(),type='erable';for(const [tp,p] of forestTypes(Z,x,z)){if(r<p){type=tp;break;}r-=p;}
    const s=Z.s[0]+rr()*(Z.s[1]-Z.s[0]);
    const tr={x,z,y:H(x,z),type,s,rot:rr()*6.28,alive:true,work:0,base:Math.round(5+s*5),region:Z.id,rr};
    tr.col=addCol(x,z,0.32*s);tr.col.tree=tr;treeList.push(tr);
  }
}
const ORIG_TREE_N=treeList.length;
const rng2=mulberry32(4242);

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
  treeList.forEach(t=>{t.parts=makeTreeParts(t,t.rr||(t.ext?rng2:rnd));delete t.rr;});
  // Un lot d'instances par carré de 50 m (on ne dessine que les carrés dans la vue)
  const counts={},chunkOf=t=>`${Math.floor((t.x-WB.x0)/50)},${Math.floor((t.z-WB.z0)/50)}`;
  treeList.forEach(t=>{t.chunk=chunkOf(t);const c=counts[t.chunk]||(counts[t.chunk]={});t.parts.forEach(pp=>{pp.idx=c[pp.g]=(c[pp.g]||0);c[pp.g]++;});});
  for(const ck in counts){const [i,j]=ck.split(',').map(Number),x0=WB.x0+i*50,z0=WB.z0+j*50;REG_RECT[ck]=new T.Box3(new T.Vector3(x0-4,-10,z0-4),new T.Vector3(x0+54,45,z0+54));}
  var ph=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:3});
  var m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3(),UP=new T.Vector3(0,1,0),col=new T.Color();
  var put=function(mesh,i,x,y,z,sx,sy,sz,rot,c){q.setFromAxisAngle(UP,rot);m4.compose(p.set(x,y,z),q,sc.set(sx,sy,sz));mesh.setMatrixAt(i,m4);mesh.setColorAt(i,col.set(c));};
  const phT=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:3,vertexColors:true});
  for(const rk in counts){const R=REG_INST[rk]={};for(const k in counts[rk])R[k]=new T.InstancedMesh(TREE_GEO[k],phT,counts[rk][k]);}
  treeList.forEach(t=>{const R=t.inst=REG_INST[t.chunk];t.parts.forEach(pp=>{put(R[pp.g],pp.idx,t.x+pp.dx,t.y+pp.dy,t.z+pp.dz,pp.sx,pp.sy,pp.sz,pp.rot,pp.c);if(t.cleared)R[pp.g].setMatrixAt(pp.idx,ZERO_M);});});
  for(const rk in REG_INST)Object.values(REG_INST[rk]).forEach(m=>{m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;scene.add(m);});


  // Roches
  const rocks=[];
  const rkR=mulberry32(707);
  for(let k=0;k<3000&&rocks.length<150;k++){
    const x=WB.x0+rkR()*(WB.x1-WB.x0),z=WB.z0+rkR()*(WB.z1-WB.z0);
    if(hillH(x,z)<4&&rkR()<0.5)continue;                       // un peu plus de roches dans la montagne
    if(!forestOk(x,z)||Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP_FLAT+2)continue;
    if(PILE_DEF.some(pp=>Math.hypot(x-pp.x,z-pp.z)<6))continue;
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<2))continue;
    const s=0.4+rkR()*(hillH(x,z)>4?0.9:0.6);rocks.push({x,z,s,col:addCol(x,z,0.85*s)});
  }
  // Deux formes de roches bosselées, mousse sur le dessus (couleurs par sommet)
  const rockGeo=sd=>{const g=new T.IcosahedronGeometry(1,1),pa=g.attributes.position,v=new T.Vector3();
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i);const k=0.82+0.3*hash3(Math.round(v.x*50)+sd,Math.round(v.y*50),Math.round(v.z*50));v.multiplyScalar(k);if(v.y<-0.3)v.y=-0.3-(v.y+0.3)*0.3;pa.setXYZ(i,v.x,v.y,v.z);}
    g.computeVertexNormals();return paintGeo(g,(x,y,z)=>y>0.55?[0.55,0.68,0.42]:[0.95+0.1*hash3(x*9|0,y*9|0,z*9|0),0.95,0.92]);};
  const rockMat=new T.MeshPhongMaterial({color:0xffffff,flatShading:true,vertexColors:true,shininess:4});
  const rockMs=[rockGeo(3),rockGeo(17)].map((gg,j)=>new T.InstancedMesh(gg,rockMat,rocks.filter((r,i)=>i%2===j).length));
  const cnt=[0,0];
  rocks.forEach((r,i)=>{q.setFromEuler(new T.Euler(rnd(),rnd()*6,rnd()));m4.compose(p.set(r.x,H(r.x,r.z)+0.1*r.s,r.z),q,sc.set(r.s,r.s*0.7,r.s));const rm=rockMs[i%2],n=cnt[i%2]++;const gone=trailDist(r.x,r.z)<2.5||vilOut(r.x,r.z)<1;if(gone)removeCol(r.col);rm.setMatrixAt(n,gone?ZERO_M:m4);
    r.i=i;r.q=q.clone();r.rm=rm;r.n=n;r.gone=gone;r.x0=r.x;r.z0=r.z;r.col.rock=r;if(!gone)ROCKS.push(r);rm.setColorAt(n,col.set(rnd()<0.5?0x8a8780:0x76736c));});
  rockMs.forEach(rm=>{rm.castShadow=true;rm.receiveShadow=true;scene.add(rm);});

  // Souches autour du camp (on a déjà bûché ici)
  const stumpG=STUMP_GEO;
  const stumps=[];
  for(let k=0;k<0;k++){   // plus de souches sauvages
    const a=rnd()*6.28,d=CAMP.r-1+rnd()*9,x=CAMP.x+Math.cos(a)*d,z=CAMP.z+Math.sin(a)*d;
    if(trailDist0(x,z)<3||Math.hypot(x-OLD_YARD.x,z-OLD_YARD.z)<8||Math.hypot(x-CABIN0.x,z-CABIN0.z)<5)continue;
    if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<1.8))continue;
    const c=addCol(x,z,0.4);stumps.push({x,z,c});
  }
  const stM=new T.InstancedMesh(stumpG,[logMatsFor('epinette')[0],RING_M,logMatsFor('epinette')[0]],stumps.length);
  stumps.forEach((s,i)=>put(stM,i,s.x,H(s.x,s.z)-0.05,s.z,1.2,0.8+rnd()*0.6,1.2,rnd()*6,0xe8e0d4));
  stumps.forEach((s,i)=>{const e={x:s.x,z:s.z,col:s.c,inst:stM,idx:i,size:1,work:0};stumpList.push(e);campStumps.push(e);});
  stM.castShadow=true;stM.receiveShadow=true;scene.add(stM);
}

/* ---------- Le lac : eau animée, quai, quenouilles, nénuphars, roches de la rive ---------- */
const WATER_U={uTime:{value:0}};
const WATER_MAT=new T.MeshPhongMaterial({color:0x3d6f86,specular:0x8899aa,shininess:90,transparent:true,opacity:0.86});
WATER_MAT.onBeforeCompile=sh=>{
  sh.uniforms.uTime=WATER_U.uTime;
  sh.vertexShader='varying vec3 vWp;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vWp=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader='uniform float uTime;\nvarying vec3 vWp;\n'+sh.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
    vec2 q=vWp.xz;float t=uTime;
    vec2 w=vec2(sin(q.x*1.3+t*1.1)+sin(q.x*2.7-q.y*1.9+t*1.7)*0.5+sin(q.y*0.7+t*0.6)*0.6,
                cos(q.y*1.5+t*1.3)+cos(q.y*3.1+q.x*2.3-t*1.9)*0.5+cos(q.x*0.8-t*0.5)*0.6);
    normal=normalize(normal+(viewMatrix*vec4(w.x*0.07,0.0,w.y*0.07,0.0)).xyz);`);
};
{
  // Surface : l'ellipse ondulée du lac, un peu plus grande que la rive (la terre la cache au bord)
  const wg=new T.CircleGeometry(1,96).rotateX(-Math.PI/2),wp=wg.attributes.position;
  for(let i=0;i<wp.count;i++){const x=wp.getX(i),z=wp.getZ(i),a=Math.atan2(z,x),w=(1+0.07*Math.sin(3*a+1)+0.05*Math.sin(5*a+2))*1.06;wp.setXYZ(i,x*w*LAKE.rx,0,z*w*LAKE.rz);}
  const water=new T.Mesh(wg,WATER_MAT);
  water.position.set(LAKE.x,LAKE_Y,LAKE.z);water.receiveShadow=true;water.renderOrder=2;scene.add(water);
  const r=mulberry32(909);
  // Quai : planches, longerons, pieux qui entrent dans l'eau, bollards
  const g=new T.Group(),D=DOCK,len=D.x1-D.x0,wd=D.z1-D.z0,y=D.y-LAKE_Y;
  const deck=texMat(sidingTex('#9a7a55','#5e4632',true),1,1);deck.map.repeat.set(1,len*3);deck.map.rotation=Math.PI/2;
  g.add(new T.Mesh(new T.BoxGeometry(len,0.08,wd).translate(len/2,y-0.04,0),deck));
  const posts=[];for(let k=0;k<=Math.floor(len/1.6);k++){const x=0.2+k*1.6;[-1,1].forEach(sd=>posts.push(new T.CylinderGeometry(0.09,0.1,2.6,7).translate(x,y-1.25,sd*(wd/2-0.06))));}
  g.add(new T.Mesh(mergeGeos(posts),new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3})));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(len,0.12,0.1).translate(len/2,y-0.14,wd/2-0.05),new T.BoxGeometry(len,0.12,0.1).translate(len/2,y-0.14,-wd/2+0.05),
    new T.CylinderGeometry(0.07,0.07,0.25,8).translate(len-0.3,y+0.12,wd/2-0.15),new T.CylinderGeometry(0.07,0.07,0.25,8).translate(len-0.3,y+0.12,-wd/2+0.15)]),mat(0x5e4632)));
  // Une chaudière renversée et un coffre à appâts au bout du quai
  g.add(new T.Mesh(new T.BoxGeometry(0.5,0.3,0.35).translate(len-1.0,y+0.15,-0.4),mat(0x6e8a5a)));
  g.position.set(D.x0,LAKE_Y,LAKE.z);shadows(g);g.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});scene.add(g);
  // Quenouilles en touffes au bord de l'eau
  const reeds=[],pads=[],srocks=[];
  for(let k=0;k<1400&&reeds.length<260;k++){
    const a=r()*Math.PI*2,e=0.86+r()*0.1,x=LAKE.x+Math.cos(a)*LAKE.rx*e*1.06,z=LAKE.z+Math.sin(a)*LAKE.rz*e*1.06;
    const le=lakeE(x,z);if(le<0.84||le>0.98||(x<DOCK.x1+1.5&&Math.abs(z-LAKE.z)<2.5))continue;
    for(let j=0;j<4;j++)reeds.push({x:x+(r()-0.5)*0.8,z:z+(r()-0.5)*0.8,h:0.9+r()*0.8,cat:r()<0.35});
  }
  for(let k=0;k<400&&pads.length<45;k++){const x=LAKE.x+(r()*2-1)*LAKE.rx,z=LAKE.z+(r()*2-1)*LAKE.rz,le=lakeE(x,z);if(le<0.55||le>0.82)continue;pads.push({x,z,s:0.25+r()*0.3,a:r()*6});}
  for(let k=0;k<600&&srocks.length<40;k++){const a=r()*Math.PI*2,x=LAKE.x+Math.cos(a)*LAKE.rx*1.05,z=LAKE.z+Math.sin(a)*LAKE.rz*1.05,le=lakeE(x,z);if(le<0.95||le>1.15||onDock(x,z)||Math.abs(z-LAKE.z)<3&&x<LAKE.x)continue;srocks.push({x,z,s:0.25+r()*0.55});}
  const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3(),col=new T.Color();
  const stem=new T.InstancedMesh(new T.CylinderGeometry(0.012,0.02,1,4).translate(0,0.5,0),new T.MeshLambertMaterial({color:0x6d8a3e}),reeds.length);
  const cats=reeds.filter(o=>o.cat),head=new T.InstancedMesh(new T.CylinderGeometry(0.035,0.035,0.18,6),new T.MeshLambertMaterial({color:0x5a3a22}),cats.length);
  reeds.forEach((o,i)=>{const lean=(r()-0.5)*0.25;q.setFromEuler(new T.Euler(lean,0,(r()-0.5)*0.25));m4.compose(p.set(o.x,H(o.x,o.z)-0.05,o.z),q,sc.set(1,o.h,1));stem.setMatrixAt(i,m4);});
  cats.forEach((o,i)=>{m4.compose(p.set(o.x,H(o.x,o.z)-0.05+o.h*0.9,o.z),q.identity(),sc.set(1,1,1));head.setMatrixAt(i,m4);});
  const pad=new T.InstancedMesh(new T.CircleGeometry(1,10,0.3,Math.PI*2-0.6).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color:0x4f7d3a,side:T.DoubleSide}),pads.length);
  pads.forEach((o,i)=>{q.setFromAxisAngle(new T.Vector3(0,1,0),o.a);m4.compose(p.set(o.x,LAKE_Y+0.02,o.z),q,sc.set(o.s,1,o.s));pad.setMatrixAt(i,m4);});
  const rg=new T.IcosahedronGeometry(1,0);const rk=new T.InstancedMesh(rg,new T.MeshPhongMaterial({color:0x8a8780,flatShading:true,shininess:4}),srocks.length);
  srocks.forEach((o,i)=>{q.setFromEuler(new T.Euler(r(),r()*6,r()));m4.compose(p.set(o.x,H(o.x,o.z)+0.05,o.z),q,sc.set(o.s*1.3,o.s*0.7,o.s));rk.setMatrixAt(i,m4);rk.setColorAt(i,col.setHSL(0.08,0.04,0.45+r()*0.15));if(o.s>0.45)addCol(o.x,o.z,o.s*1.1);});
  [stem,head,pad,rk].forEach(m=>{m.castShadow=m!==pad;m.receiveShadow=true;scene.add(m);});
}


/* ---------- Ce qu'on ne dessine pas quand c'est loin : tuiles de terrain et forêts des autres terres ---------- */
const _frus=new T.Frustum(),_pm=new T.Matrix4();
function updateCulling(f){
  // en 3e et 1re personne, le brouillard cache tout au-delà de FOG.far : inutile de dessiner plus loin
  const iso=camMode==='iso',far=iso?110:FOG.far+8;
  activeCam.updateMatrixWorld();_pm.multiplyMatrices(activeCam.projectionMatrix,activeCam.matrixWorldInverse);_frus.setFromProjectionMatrix(_pm);
  // La zone des ombres déborde un peu de la vue : on garde aussi ce qui est tout près
  TERRAIN_TILES.forEach(m=>{const c=m.userData.c,d=Math.max(Math.abs(c.x-f.x),Math.abs(c.z-f.z));m.visible=d<45||(d<far+(iso?60:30)&&_frus.intersectsBox(m.userData.box));});
  for(const ck in REG_INST){const b=REG_RECT[ck],dx=Math.max(b.min.x-f.x,0,f.x-b.max.x),dz=Math.max(b.min.z-f.z,0,f.z-b.max.z),d=Math.hypot(dx,dz);
    const v=d<far&&(d<30||_frus.intersectsBox(b));for(const k in REG_INST[ck])REG_INST[ck][k].visible=v;}
}

/* ---------- La rivière : une bande d'eau qui descend vers le lac ---------- */
{
  const pts=[],N=Math.ceil(RIVER_L[RIVER_L.length-1]/1.5);
  for(let k=0;k<=N;k++){
    const L=k/N*RIVER_L[RIVER_L.length-1];let i=0;while(i<RIVER_L.length-2&&RIVER_L[i+1]<L)i++;
    const t=(L-RIVER_L[i])/(RIVER_L[i+1]-RIVER_L[i]),[ax,az]=RIVER[i],[bx,bz]=RIVER[i+1];
    const x=ax+(bx-ax)*t,z=az+(bz-az)*t,dl=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/dl,nz=(bx-ax)/dl,y=riverY(L/RIVER_L[RIVER_L.length-1])+0.02;
    pts.push([x+nx*2.6,y,z+nz*2.6],[x-nx*2.6,y,z-nz*2.6]);
    if(lakeE(x,z)<0.97)break;   // le lac prend le relais (pas deux surfaces l'une sur l'autre)
  }
  const pos=[];for(let k=0;k<pts.length/2-1;k++){const a=pts[2*k],b=pts[2*k+1],c=pts[2*k+2],d=pts[2*k+3];pos.push(...a,...c,...b,...b,...c,...d);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();
  const w=new T.Mesh(g,WATER_MAT);w.receiveShadow=true;w.renderOrder=2;scene.add(w);
  // Roches dans le courant et sur les rives
  const r=mulberry32(77),rk=[];
  for(let k=0;k<200&&rk.length<55;k++){const L=r()*RIVER_L[RIVER_L.length-1]*0.9;let i=0;while(i<RIVER_L.length-2&&RIVER_L[i+1]<L)i++;
    const t=(L-RIVER_L[i])/(RIVER_L[i+1]-RIVER_L[i]),[ax,az]=RIVER[i],[bx,bz]=RIVER[i+1],dl=Math.hypot(bx-ax,bz-az),off=(r()<0.5?-1:1)*(1.2+r()*2.8);
    const x=ax+(bx-ax)*t-(bz-az)/dl*off,z=az+(bz-az)*t+(bx-ax)/dl*off;rk.push({x,z,s:0.2+r()*0.45});}
  const im=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshPhongMaterial({color:0x7d7a74,flatShading:true,shininess:6}),rk.length);
  const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3();
  rk.forEach((o,i)=>{q.setFromEuler(new T.Euler(r(),r()*6,r()));m4.compose(p.set(o.x,H(o.x,o.z)+0.05,o.z),q,sc.set(o.s*1.3,o.s*0.7,o.s));im.setMatrixAt(i,m4);});
  im.castShadow=true;im.receiveShadow=true;scene.add(im);
}

/* ---------- Le belvédère au sommet du mont du Loup ---------- */
{
  const g=new T.Group(),B=BELV,w=B.x1-B.x0,d=B.z1-B.z0,y=B.y-H(HILL.x,HILL.z);
  const deck=texMat(sidingTex('#9a7a55','#5e4632',true),1,1);deck.map.repeat.set(1,10);
  g.add(new T.Mesh(new T.BoxGeometry(w,0.1,d).translate(0,y-0.05,0),deck));
  const post=new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3}),rail=mat(0x6e5236);
  const ps=[],rs=[];
  // pattes rallongées jusqu'au sol (et un peu dedans), où qu'elles tombent sur la pente
  const g0=H(HILL.x,HILL.z);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const px=a*(w/2-0.1),pz=b*(d/2-0.1),bot=Math.min(0,H(HILL.x+px,HILL.z+pz)-g0)-0.6,top=y+1.05;
    ps.push(new T.CylinderGeometry(0.09,0.1,top-bot,7).translate(px,(top+bot)/2,pz));});
  // Garde-corps sur trois côtés (ouvert vers le sentier, au sud-ouest)
  [[0,-d/2,w,0],[w/2,0,d,Math.PI/2],[-w/2,0,d,Math.PI/2]].forEach(([x,z,L,r])=>{rs.push(new T.BoxGeometry(L,0.07,0.08).rotateY(r).translate(x,y+1.0,z),new T.BoxGeometry(L,0.05,0.06).rotateY(r).translate(x,y+0.55,z));
    for(let k=-L/2+0.3;k<L/2;k+=0.35)rs.push(new T.BoxGeometry(0.04,0.45,0.04).translate(r?x:x+k,y+0.77,r?z+k:z));});
  // Banc et longue-vue
  rs.push(new T.BoxGeometry(1.6,0.06,0.4).translate(0,y+0.45,-d/2+0.6),new T.BoxGeometry(0.08,0.42,0.35).translate(-0.7,y+0.21,-d/2+0.6),new T.BoxGeometry(0.08,0.42,0.35).translate(0.7,y+0.21,-d/2+0.6));
  g.add(new T.Mesh(mergeGeos(ps),post),new T.Mesh(mergeGeos(rs),rail));
  const sc=new T.Mesh(mergeGeos([new T.CylinderGeometry(0.03,0.04,1.1,8).translate(0,y+0.55,0),new T.CylinderGeometry(0.06,0.08,0.45,10).rotateX(Math.PI/2-0.15).translate(0,y+1.15,0.05)]),new T.MeshPhongMaterial({color:0x2d4f3a,shininess:60}));
  sc.position.set(w/2-0.8,0,-d/2+0.7);g.add(sc);
  // Panneau
  const pan=new T.Mesh(new T.PlaneGeometry(1.4,0.5),new T.MeshBasicMaterial({map:canvasTex(256,92,(c,W,Hh)=>{c.fillStyle='#4d3220';c.fillRect(0,0,W,Hh);c.fillStyle='#f1e6c8';c.font='bold 34px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Mont du Loup',W/2,Hh/2);})}));
  pan.position.set(-w/2-0.6,1.4,d/2+0.8);pan.rotation.y=-0.8;g.add(pan);
  {const sx=-w/2-0.6,sz=d/2+0.8,bot=H(HILL.x+sx,HILL.z+sz)-H(HILL.x,HILL.z)-0.4;pan.position.y=bot+1.8;const nx=Math.sin(-0.8)*0.07,nz=Math.cos(-0.8)*0.07;   // le poteau derrière l'affiche, et un dos en bois
   g.add(new T.Mesh(new T.BoxGeometry(0.08,1.75,0.08).translate(sx-nx,bot+0.875,sz-nz),post));
   const bk=new T.Mesh(new T.PlaneGeometry(1.4,0.5),new T.MeshPhongMaterial({color:0x4d3220,flatShading:true}));bk.position.set(sx-nx*0.2,bot+1.8,sz-nz*0.2);bk.rotation.y=-0.8+Math.PI;g.add(bk);}
  g.position.set(HILL.x,H(HILL.x,HILL.z),HILL.z);shadows(g);scene.add(g);
  // Garde-corps : on ne tombe pas du belvédère
  for(let k=-w/2;k<=w/2;k+=0.5){addCol(HILL.x+k,HILL.z-d/2,0.12);addCol(HILL.x-w/2,HILL.z+k,0.12);addCol(HILL.x+w/2,HILL.z+k,0.12);}
}
