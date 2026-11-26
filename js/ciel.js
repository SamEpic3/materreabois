/* Ciel : cycle jour/nuit (20 min de jour, 5 min de nuit) et météo (beau la plupart du temps,
   parfois nuageux, de la pluie ou de la neige). L'heure et la météo sont menées par l'hôte en multijoueur. */
const DAY_LEN=1200,NIGHT_LEN=300,CYCLE=DAY_LEN+NIGHT_LEN;
S.wx={clock:150,type:'clair',left:420,day:0};   // clock : secondes depuis le lever du soleil
const WX={
  clair:  {cloud:0.12,rain:0,snow:0,fog:1},
  nuageux:{cloud:0.72,rain:0,snow:0,fog:0.8},
  pluie:  {cloud:1.0, rain:1,snow:0,fog:0.55},
  neige:  {cloud:0.88,rain:0,snow:1,fog:0.5}
};
const WX_NAME={clair:'Beau temps',nuageux:'Nuageux',pluie:'Pluie',neige:'Neige'};
let VIEW_BOOST=1;
const SKY={cloud:0.12,rain:0,snow:0,fog:1,snowCover:0,wet:0,day:1};   // valeurs adoucies affichées

// Palette : jour, nuit, lever/coucher
const C3=h=>new T.Color(h);
const PAL={
  day:  {top:C3(0x2f6fbf),mid:C3(0x78acdc),hor:C3(SKY_HORIZON),bg:C3(0xbcd3e2),hs:C3(0xe4ecf2),hg:C3(0x4a4030),sun:C3(0xfff0d4)},
  night:{top:C3(0x08112a),mid:C3(0x16244a),hor:C3(0x2e3f68),bg:C3(0x2a3858),hs:C3(0x8095c8),hg:C3(0x2c2a30),sun:C3(0xa8bce8)},
  warm: {top:C3(0x3d5490),mid:C3(0xc28a8a),hor:C3(0xf3a865),bg:C3(0xe0b090),hs:C3(0xf0c8a8),hg:C3(0x4a3a2c),sun:C3(0xffa860)}
};
const _c={};['top','mid','hor','bg','hs','hg','sun'].forEach(k=>_c[k]=new T.Color());
function greyed(c,a){const l=c.r*0.3+c.g*0.55+c.b*0.15;c.lerp(_gc.setRGB(l*0.97,l,l*1.06),a);return c;}
const _gc=new T.Color();

// Heure de jeu : le jour va de 6 h à 20 h, la nuit de 20 h à 6 h
function gameHour(){const t=S.wx.clock;return t<DAY_LEN?6+t/DAY_LEN*14:(20+(t-DAY_LEN)/NIGHT_LEN*10)%24;}
function clockText(){const h=gameHour(),hh=Math.floor(h),mm=Math.floor((h-hh)*6)*10;return `${hh} h ${mm?String(mm).padStart(2,'0'):'00'}`;}
function isNight(){return SKY.day<0.35;}

/* ----- Pluie et neige : particules autour de la caméra ----- */
const RAIN_N=1300,SNOW_N=1100,PBOX=34,PH=22;
const rainGeo=new T.BufferGeometry(),rainPos=new Float32Array(RAIN_N*6),rainSeed=new Float32Array(RAIN_N*3);
for(let i=0;i<RAIN_N;i++){rainSeed[i*3]=Math.random()*PBOX;rainSeed[i*3+1]=Math.random()*PH;rainSeed[i*3+2]=Math.random()*PBOX;}
rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));
const rainMat=new T.LineBasicMaterial({color:0xdde6f0,transparent:true,opacity:0,depthWrite:false});
const rain=new T.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;rain.visible=false;rain.renderOrder=20;scene.add(rain);
const snowGeo=new T.BufferGeometry(),snowPos=new Float32Array(SNOW_N*3),snowSeed=new Float32Array(SNOW_N*4);
for(let i=0;i<SNOW_N;i++){snowSeed[i*4]=Math.random()*PBOX;snowSeed[i*4+1]=Math.random()*PH;snowSeed[i*4+2]=Math.random()*PBOX;snowSeed[i*4+3]=Math.random()*6.28;}
snowGeo.setAttribute('position',new T.BufferAttribute(snowPos,3));
const flakeTex=canvasTex(32,32,(c,w,h)=>{const g=c.createRadialGradient(16,16,0,16,16,15);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.5,'rgba(255,255,255,0.8)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
const snowMat=new T.PointsMaterial({map:flakeTex,size:0.14,transparent:true,opacity:0,depthWrite:false});
const snow=new T.Points(snowGeo,snowMat);snow.frustumCulled=false;snow.visible=false;snow.renderOrder=20;scene.add(snow);
const wrapP=(v,c)=>c-PBOX/2+((((v-c+PBOX/2)%PBOX)+PBOX)%PBOX);

function underRoof(x,z){return (S.inside&&inCabin(x,z))||S.builds.some(b=>{if(b.k!=='garage')return false;const c=Math.cos(b.rot||0),s=Math.sin(b.rot||0),dx=x-b.x,dz=z-b.z,lx=c*dx-s*dz,lz=s*dx+c*dz;return Math.abs(lx)<GAR_W/2&&Math.abs(lz)<GAR_D/2;});}
function updatePrecip(dt,cx,cy,cz){
  const t=S.time,roof=camMode!=='iso'&&underRoof(cx,cz);
  rain.visible=SKY.rain>0.02&&!roof;
  if(rain.visible){
    rainMat.opacity=0.8*SKY.rain;
    const n=Math.floor(RAIN_N*Math.min(1,SKY.rain*1.2)),wx=2.5;
    for(let i=0;i<RAIN_N;i++){
      const o=i*6;
      if(i>=n){rainPos[o+1]=rainPos[o+4]=-999;continue;}
      const fall=(rainSeed[i*3+1]-t*22+1e5)%PH;
      const x=wrapP(rainSeed[i*3]+t*wx*0.2,cx),z=wrapP(rainSeed[i*3+2],cz),y=cy-PH*0.35+fall;
      rainPos[o]=x;rainPos[o+1]=y;rainPos[o+2]=z;rainPos[o+3]=x-0.08;rainPos[o+4]=y+0.8;rainPos[o+5]=z;
    }
    rainGeo.attributes.position.needsUpdate=true;
  }
  snow.visible=SKY.snow>0.02&&!roof;
  if(snow.visible){
    snowMat.opacity=0.95*SKY.snow;snowMat.size=camMode==='iso'?5*renderer.getPixelRatio():0.14;
    const n=Math.floor(SNOW_N*Math.min(1,SKY.snow*1.2));
    for(let i=0;i<SNOW_N;i++){
      const o=i*3,ph=snowSeed[i*4+3];
      if(i>=n){snowPos[o+1]=-999;continue;}
      const fall=(snowSeed[i*4+1]-t*(1.0+0.6*Math.sin(ph))+1e5)%PH;
      const x=wrapP(snowSeed[i*4]+Math.sin(t*0.7+ph)*0.6+t*0.4,cx),y=cy-PH*0.35+fall,z=wrapP(snowSeed[i*4+2]+Math.cos(t*0.5+ph)*0.6,cz);
      const dx=x-cx,dy=y-cy,dz=z-cz;
      if(camMode!=='iso'&&dx*dx+dy*dy+dz*dz<4){snowPos[o+1]=-999;continue;}   // pas de gros flocons collés à la caméra
      snowPos[o]=x;snowPos[o+1]=y;snowPos[o+2]=z;
    }
    snowGeo.attributes.position.needsUpdate=true;
  }
}

/* ----- Lumières de nuit : un feu proche et les phares du véhicule conduit ----- */
const fireLight=new T.PointLight(0xff9a48,0,10,2);scene.add(fireLight);
const headLight=new T.SpotLight(0xfff2d0,0,30,0.55,0.5,1.4);scene.add(headLight);scene.add(headLight.target);
function nearestFire(x,z){
  let best=null,bd=28;
  const tryAt=(px,pz,py)=>{const d=Math.hypot(px-x,pz-z);if(d<bd){bd=d;best=[px,py,pz];}};
  S.builds.forEach(b=>{if((b.k==='feu'||b.k==='sucres')&&b.fuel>0&&b._o)tryAt(b.x,b.z,H(b.x,b.z)+(b.k==='feu'?0.9:0.6));});
  if(stove.fuel>0){if(S.inside){const p=cabW(IN_STOVE.x,IN_STOVE.z+0.5);tryAt(p.x,p.z,CAMP_H+0.7);}else tryAt(CABIN_DOOR.x,CABIN_DOOR.z+0.6,CAMP_H+1.4);}
  return best;
}

/* ----- Météo : menée par l'hôte (ou en solo) ----- */
function rollWeather(){
  const w=S.wx;
  if(w.type!=='clair'){w.type='clair';w.left=300+Math.random()*360;return;}
  const r=Math.random();
  if(r<0.5){w.left=200+Math.random()*200;return;}            // le beau temps continue
  w.type=r<0.72?'nuageux':r<0.88?'pluie':'neige';
  w.left=150+Math.random()*120;
}
function leadsWorld(){return typeof NET==='undefined'||!NET.on||NET.host;}

const _sd=new T.Vector3();
function updateSky(dt,focus){
  const w=S.wx;
  if(w.clock+dt>=CYCLE)w.day=(w.day||0)+1;      // un nouveau jour (limite de chasse, etc.)
  w.clock=(w.clock+dt)%CYCLE;
  if(leadsWorld()){w.left-=dt;if(w.left<=0)rollWeather();}
  // Position du soleil (le jour) ou de la lune (la nuit)
  const t=w.clock,day=t<DAY_LEN,u=day?t/DAY_LEN:(t-DAY_LEN)/NIGHT_LEN;
  const el=Math.sin(u*Math.PI),az=u*Math.PI;
  const h=day?el:-0.55*el;                      // hauteur « solaire » continue : négative la nuit
  const dayK=smoothstep(-0.22,0.28,h),warm=Math.max(0,1-Math.abs(h-0.04)/0.2)*(day?1:0.6);
  SKY.day=dayK;
  // Météo adoucie (~25 s pour changer)
  const tg=WX[w.type]||WX.clair,k=1-Math.exp(-dt/8);
  ['cloud','rain','snow','fog'].forEach(n=>{SKY[n]+=(tg[n]-SKY[n])*k;});
  SKY.snowCover=clamp(SKY.snowCover+dt*(SKY.snow>0.5?1/140:-1/220),0,0.75);
  SKY.wet=clamp(SKY.wet+dt*(SKY.rain>0.5?1/40:-1/160),0,1);
  GROUND_U.uSnow.value=SKY.snowCover;GROUND_U.uWet.value=SKY.wet*(1-SKY.snowCover);
  // Couleurs
  const cl=SKY.cloud;
  for(const n in _c){_c[n].copy(PAL.night[n]).lerp(PAL.day[n],dayK).lerp(PAL.warm[n],warm*0.85*(1-cl*0.7));greyed(_c[n],cl*0.75);}
  skyMat.uniforms.uTop.value.copy(_c.top);skyMat.uniforms.uMid.value.copy(_c.mid);skyMat.uniforms.uHor.value.copy(_c.hor);
  skyMat.uniforms.uNight.value=1-dayK;skyMat.uniforms.uCloud.value=cl;skyMat.uniforms.uSunVis.value=day?(1-cl)*smoothstep(-0.05,0.08,h):0;
  skyMat.uniforms.uCloudCol.value.setRGB(1,1,1).lerp(_gc.setRGB(0.95,0.72,0.62),warm*0.7).multiplyScalar(0.2+0.8*dayK);
  // Le soleil part de l'est (x+), passe au sud et se couche à l'ouest
  _sd.set(Math.cos(az),Math.max(0.06,el),0.35+0.25*Math.sin(az)).normalize();
  if(day)skyMat.uniforms.uSun.value.copy(_sd);else{skyMat.uniforms.uMoon.value.copy(_sd);skyMat.uniforms.uSun.value.set(0,-1,0);}
  const fogC=_gc.copy(_c.hor);
  VIEW_BOOST=1+clamp((focus.y-6)/16,0,1)*0.9;   // en haut du mont, on voit plus loin
  FOG.color.copy(fogC);FOG.near=30*SKY.fog*VIEW_BOOST;FOG.far=110*(0.35+0.65*SKY.fog)*VIEW_BOOST;
  scene.background.copy(_c.bg);
  WATER_U.uTime.value=S.time;WATER_MAT.color.setRGB(0.1,0.27,0.34);WATER_MAT.emissive.copy(_c.hor).multiplyScalar(0.3).add(_gc.copy(_c.mid).multiplyScalar(0.18));WATER_MAT.specular.copy(sun.color).multiplyScalar(0.6*(1-cl*0.7));
  hemi.color.copy(_c.hs);hemi.groundColor.copy(_c.hg);hemi.intensity=0.5+0.25*dayK+0.18*cl*dayK;
  sun.color.copy(_c.sun);
  const sunI=day?0.85*smoothstep(-0.02,0.2,el):0.32*smoothstep(0,0.3,el);
  sun.intensity=sunI*(1-cl*0.72);
  // Ombres : la lumière suit la caméra mais vient de la direction du soleil ou de la lune
  const L=_v.copy(_sd);L.y=Math.max(L.y,0.35);L.normalize();
  sun.position.set(focus.x+L.x*60,focus.y+L.y*60,focus.z+L.z*60);sun.target.position.copy(focus);sun.target.updateMatrixWorld();
  // Lumières de nuit
  const night=1-dayK*0.85-0.15;
  // Lampadaires et fenêtres du village : s'allument à la brunante
  {const k=smoothstep(0.25,0.6,night);VIL_LAMP.color.setRGB(0.42+0.58*k,0.39+0.5*k,0.31+0.27*k);VIL_WIN.color.setRGB(0.62+0.38*k*0.9,0.72+0.1*k,0.78-0.3*k);VIL_POOL.opacity=0.55*k;VIL_POOL.visible=k>0.01;}
  const f=nearestFire(focus.x,focus.z);
  if(S.inside){   // dedans : le poêle s'il chauffe, sinon la lampe à l'huile sur la table
    const lit=stove.fuel>0,p=lit?cabW(IN_STOVE.x,IN_STOVE.z+0.6):cabW(IN_TABLE.x+0.25,IN_TABLE.z-0.1);
    fireLight.position.set(p.x,CAMP_H+(lit?0.8:1.4),p.z);fireLight.color.setHex(lit?0xff9a48:0xffcf80);
    fireLight.intensity=(lit?1.4+0.2*Math.sin(S.time*13):0.9)*(0.5+0.6*(1-dayK));
  }else if(f){fireLight.color.setHex(0xff9a48);fireLight.position.set(f[0],f[1],f[2]);fireLight.intensity=Math.max(0,night)*(1.6+0.25*Math.sin(S.time*13)+0.15*Math.sin(S.time*7.3));}else fireLight.intensity=0;
  if(S.mode==='vtt'&&V&&!V.spec.boat&&night>0.05){   // pas de phares sur la chaloupe
    const fx=Math.sin(V.th),fz=Math.cos(V.th),y=H(V.x,V.z)+1.1;
    headLight.position.set(V.x+fx*1.6,y,V.z+fz*1.6);headLight.target.position.set(V.x+fx*12,y-1.6,V.z+fz*12);headLight.target.updateMatrixWorld();
    headLight.intensity=night*2.2;
  }else headLight.intensity=0;
  // Pluie et neige
  const cp=camMode==='iso'?focus:pcam.position;
  updatePrecip(dt,cp.x,(camMode==='iso'?focus.y:cp.y),cp.z);
  // Heure dans le coin
  const el2=$('sClock');if(el2){const txt=`${isNight()?'🌙':cl>0.6?(SKY.snow>0.5?'🌨️':SKY.rain>0.5?'🌧️':'☁️'):'☀️'} ${clockText()}`;if(el2.textContent!==txt)el2.textContent=txt;}
}
