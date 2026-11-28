/* La carte : une photo vue du ciel de tout le territoire (prise avec le moteur 3D, refaite au besoin),
   avec par-dessus les terres, les noms des lieux, les joueurs, les véhicules et les constructions.
   Touche K ou bouton 🗺️. On glisse pour se déplacer, on pince (ou la molette) pour zoomer. */
const CARTE={open:false,img:null,imgT:-1e9,cx:0,cz:0,s:1,fit:1,raf:0,ptrs:new Map(),pinch:null,drag:null};
const MAP_W=WB.x1-WB.x0,MAP_H=WB.z1-WB.z0;

// ---- La photo vue du ciel ----
function bakeMapImage(){
  const PH=isTouch?1400:2000,PW=Math.round(PH*MAP_W/MAP_H);
  const rt=new T.WebGLRenderTarget(PW,PH);
  const cx=(WB.x0+WB.x1)/2,cz=(WB.z0+WB.z1)/2;
  const cam=new T.OrthographicCamera(-MAP_W/2,MAP_W/2,MAP_H/2,-MAP_H/2,1,600);
  cam.position.set(cx,300,cz);cam.up.set(0,0,-1);cam.lookAt(cx,0,cz);cam.updateMatrixWorld();
  // On cache ce qui bouge (dessiné par-dessus en symboles) et on montre toute la forêt
  const saved=[];const hide=o=>{if(o){saved.push([o,o.visible]);o.visible=false;}};const show=o=>{if(o){saved.push([o,o.visible]);o.visible=true;}};
  vehicles.forEach(v=>hide(v.mesh.g));trailers.forEach(t=>hide(t.mesh&&t.mesh.g));hide(player.g);
  if(typeof NET!=='undefined')for(const id in NET.avatars){const a=NET.avatars[id];hide(a.f.g);hide(a.bob);hide(a.line);}
  labels.forEach(hide);hide(rain);hide(snow);if(typeof marker!=='undefined')hide(marker);
  TERRAIN_TILES.forEach(show);for(const ck in REG_INST)for(const k in REG_INST[ck])show(REG_INST[ck][k]);
  // Lumière de midi, sans brouillard; le soleil vise très loin pour que la carte d'ombres soit vide (pas de tache d'ombre autour du joueur)
  const L={hi:hemi.intensity,hc:hemi.color.clone(),hg:hemi.groundColor.clone(),si:sun.intensity,sc:sun.color.clone(),sp:sun.position.clone(),st:sun.target.position.clone(),fn:FOG.near,ff:FOG.far,bg:scene.background};
  hemi.intensity=0.8;hemi.color.set(0xe4ecf2);hemi.groundColor.set(0x4a4030);sun.intensity=0.8;sun.color.set(0xfff0d4);
  sun.target.position.set(0,0,0);sun.position.set(-220,320,-160);sun.target.updateMatrixWorld();const SC=sun.castShadow;sun.castShadow=false;   // lumière du nord-ouest : le relief ressort, sans ombres portées
  FOG.near=1e5;FOG.far=2e5;scene.background=new T.Color(0x56703c);
  renderer.setRenderTarget(rt);renderer.render(scene,cam);
  const px=new Uint8Array(PW*PH*4);renderer.readRenderTargetPixels(rt,0,0,PW,PH,px);
  renderer.setRenderTarget(null);rt.dispose();sun.castShadow=SC;
  hemi.intensity=L.hi;hemi.color.copy(L.hc);hemi.groundColor.copy(L.hg);sun.intensity=L.si;sun.color.copy(L.sc);sun.position.copy(L.sp);sun.target.position.copy(L.st);sun.target.updateMatrixWorld();
  FOG.near=L.fn;FOG.far=L.ff;scene.background=L.bg;
  for(let i=saved.length-1;i>=0;i--)saved[i][0].visible=saved[i][1];
  // Rangées inversées (WebGL lit de bas en haut)
  const c=CARTE.img||document.createElement('canvas');c.width=PW;c.height=PH;const x=c.getContext('2d'),id=x.createImageData(PW,PH),row=PW*4;
  for(let y=0;y<PH;y++)id.data.set(px.subarray((PH-1-y)*row,(PH-y)*row),y*row);
  x.putImageData(id,0,0);
  // Un léger voile pour que les symboles ressortent
  x.fillStyle='rgba(250,245,230,0.08)';x.fillRect(0,0,PW,PH);
  CARTE.img=c;CARTE.imgT=performance.now();
}

// ---- Vue (centre en mètres + échelle en pixels par mètre) ----
const mapCv=$('carteCv'),mctx=mapCv.getContext('2d');
function mapSize(){const r={width:mapCv.clientWidth||viewW(),height:mapCv.clientHeight||viewH()},d=Math.min(window.devicePixelRatio||1,2);if(mapCv.width!==Math.round(r.width*d)||mapCv.height!==Math.round(r.height*d)){mapCv.width=Math.round(r.width*d);mapCv.height=Math.round(r.height*d);}return {w:r.width,h:r.height,d};}
// Coordonnées du doigt dans la carte (le jeu peut être tourné de 90° sur iPhone)
function mapPt(e){const v=toView(e.clientX,e.clientY);return {x:v.x,y:v.y};}
function mapFit(){const {w,h}=mapSize();CARTE.fit=Math.min(w/MAP_W,h/MAP_H)*0.96;}
function clampView(){const {w,h}=mapSize();const s=CARTE.s=clamp(CARTE.s,CARTE.fit,Math.max(CARTE.fit*10,9));
  const hx=w/2/s,hz=h/2/s,mx=(WB.x0+WB.x1)/2,mz=(WB.z0+WB.z1)/2;
  CARTE.cx=hx*2>=MAP_W?mx:clamp(CARTE.cx,WB.x0+hx,WB.x1-hx);CARTE.cz=hz*2>=MAP_H?mz:clamp(CARTE.cz,WB.z0+hz,WB.z1-hz);}
function w2s(x,z){const {w,h}=mapSize();return [w/2+(x-CARTE.cx)*CARTE.s,h/2+(z-CARTE.cz)*CARTE.s];}
function s2w(sx,sy){const {w,h}=mapSize();return [CARTE.cx+(sx-w/2)/CARTE.s,CARTE.cz+(sy-h/2)/CARTE.s];}
function zoomAt(f,sx,sy){const [wx,wz]=s2w(sx,sy);CARTE.s*=f;clampView();const [nx,nz]=w2s(wx,wz);CARTE.cx+=(nx-sx)/CARTE.s;CARTE.cz+=(nz-sy)/CARTE.s;clampView();}
function mePose(){if((S.mode==='vtt'||S.mode==='crane')&&V)return {x:V.x,z:V.z,rot:V.th};if(S.mode==='pass'&&P.ride)return {x:P.ride.x,z:P.ride.z,rot:P.ride.th};return {x:P.x,z:P.z,rot:P.rot};}
function centerOnMe(){const m=mePose();CARTE.cx=m.x;CARTE.cz=m.z;clampView();}

// ---- Dessin ----
const PLACES=()=>{const L=[];const v=vpos(0,4);
  L.push({x:CAMP.x,z:CAMP.z+11,t:'Le camp',k:'big'},{x:v.x,z:v.z,t:'Le village',k:'big'},{x:LAKE.x,z:LAKE.z+4,t:'Lac',k:'water'},
    {x:HILL.x,z:HILL.z+9,t:'Montagne',k:'mid'},{x:BELV.x0+2.6,z:BELV.z0+2.6,t:'Belvédère',k:'small',dot:'#f2e6c8'},
    {x:DOCK.x1,z:DOCK.z0-3,t:'Quai',k:'small'},{x:(RIVER[2][0]+RIVER[3][0])/2+10,z:(RIVER[2][1]+RIVER[3][1])/2+4,t:'Rivière',k:'water',rot:-0.85});
  if(STORE_DOOR)L.push({x:STORE_DOOR.x,z:STORE_DOOR.z,t:'Magasin',k:'small',dot:'#ffd76a'});
  if(DEALER_DOOR)L.push({x:DEALER_DOOR.x,z:DEALER_DOOR.z,t:'Équipement',k:'small',dot:'#ffd76a'});
  L.push({x:YARD.x,z:YARD.z,t:'Scierie',k:'small',dot:'#ffd76a'},{x:SALE.x,z:SALE.z,t:'Vente',k:'small',dot:'#ffd76a'});
  const ch=vpos(17,6);L.push({x:ch.x,z:ch.z,t:'Église',k:'small'});
  return L;};
let _places=null;
function mapText(t,x,y,size,col,stroke,weight){mctx.font=`${weight||700} ${size}px system-ui,sans-serif`;mctx.textAlign='center';mctx.textBaseline='middle';mctx.lineJoin='round';mctx.lineWidth=Math.max(2,size/4);mctx.strokeStyle=stroke||'rgba(20,24,18,0.85)';mctx.strokeText(t,x,y);mctx.fillStyle=col||'#fff';mctx.fillText(t,x,y);}
function landRect(r,col,dash,fill){const [a,b]=w2s(r.x0,r.z0),[c,d]=w2s(r.x1,r.z1);if(fill){mctx.fillStyle=fill;mctx.fillRect(a,b,c-a,d-b);}mctx.setLineDash(dash||[]);mctx.strokeStyle=col;mctx.lineWidth=2.5;mctx.strokeRect(a+1,b+1,c-a-2,d-b-2);mctx.setLineDash([]);}
function mapArrow(x,y,ang,col,sz){mctx.save();mctx.translate(x,y);mctx.rotate(ang);mctx.beginPath();mctx.moveTo(sz,0);mctx.lineTo(-sz*0.7,sz*0.68);mctx.lineTo(-sz*0.35,0);mctx.lineTo(-sz*0.7,-sz*0.68);mctx.closePath();
  mctx.fillStyle=col;mctx.strokeStyle='#fff';mctx.lineWidth=2.2;mctx.fill();mctx.stroke();mctx.restore();}
const V_ICON={pickup:'🛻',vtt:'🏍️',skid:'🚜',abat:'🚜'};
function drawMap(){
  const {w,h,d}=mapSize();mctx.setTransform(d,0,0,d,0,0);mctx.fillStyle='#3d5230';mctx.fillRect(0,0,w,h);
  if(CARTE.img){const [a,b]=w2s(WB.x0,WB.z0);mctx.imageSmoothingEnabled=true;mctx.drawImage(CARTE.img,a,b,MAP_W*CARTE.s,MAP_H*CARTE.s);}
  const s=CARTE.s,zf=clamp(Math.sqrt(s/CARTE.fit),1,1.5);
  // L'eau : le lac et la rivière, en bleu franc
  mctx.fillStyle='rgba(58,118,168,0.78)';mctx.beginPath();
  for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,k=0.99*(1+0.07*Math.sin(3*a+1)+0.05*Math.sin(5*a+2)),[x,y]=w2s(LAKE.x+Math.cos(a)*LAKE.rx*k,LAKE.z+Math.sin(a)*LAKE.rz*k);i?mctx.lineTo(x,y):mctx.moveTo(x,y);}
  mctx.fill();
  mctx.strokeStyle='rgba(58,118,168,0.78)';mctx.lineWidth=Math.max(5.2*s,2);mctx.lineCap='round';mctx.lineJoin='round';mctx.beginPath();
  RIVER.forEach(([x0,z0],i)=>{const [x,y]=w2s(x0,z0);i?mctx.lineTo(x,y):mctx.moveTo(x,y);});mctx.stroke();
  {const [a,b]=w2s(DOCK.x0,DOCK.z0),[c,d]=w2s(DOCK.x1,DOCK.z1);mctx.fillStyle='#8a6a44';mctx.fillRect(a,b,Math.max(c-a,3),Math.max(d-b,2));}
  // Les terres
  landRect(MAIN_LAND,'rgba(255,214,90,0.95)',null);
  for(const k in LANDS){const L=LANDS[k],own=S.lands&&S.lands[k];landRect(L,own?'rgba(255,214,90,0.95)':'rgba(255,255,255,0.8)',own?null:[9,6],own?null:'rgba(0,0,0,0.12)');
    const [a,b]=w2s((L.x0+L.x1)/2,(L.z0+L.z1)/2);mapText(L.name,a,b-9*zf,12*zf,'#fff');mapText(own?'Ta terre':`À vendre · ${L.price.toLocaleString('fr-CA')} $`,a,b+8*zf,10*zf,own?'#ffe08a':'#e8e8e8',null,600);}
  {const [a,b]=w2s(MAIN_LAND.x0+6,MAIN_LAND.z0+5);mctx.textAlign='left';mctx.font=`700 ${11*zf}px system-ui,sans-serif`;mctx.lineWidth=3;mctx.strokeStyle='rgba(20,24,18,0.85)';mctx.strokeText('Ta terre',a,b+6*zf);mctx.fillStyle='#ffe08a';mctx.fillText('Ta terre',a,b+6*zf);}
  {const [a,b]=w2s((WB.x0+WB.x1)/2,MAIN_LAND.z0-70);mapText('Territoire public',a,b,12*zf,'#e8e8e8',null,700);mapText('chasse et pêche',a,b+15*zf,10*zf,'#d8d8d8',null,600);}
  // Lots réservés pour plus tard
  RESERVED.forEach(r=>{landRect(r,'rgba(170,210,255,0.75)',[4,5],'rgba(120,170,230,0.12)');const [a,b]=w2s((r.x0+r.x1)/2,(r.z0+r.z1)/2);mapText(r.name,a,b-6*zf,10*zf,'#dcebff',null,700);mapText('réservé · '+r.note,a,b+8*zf,9*zf,'#c8dcf2',null,600);});
  // Noms des lieux
  if(!_places)_places=PLACES();
  for(const p of _places){const [x,y]=w2s(p.x,p.z);if(p.k==='small'&&s<CARTE.fit*1.9)continue;
    if(p.dot){mctx.beginPath();mctx.arc(x,y,3.5,0,7);mctx.fillStyle=p.dot;mctx.fill();mctx.strokeStyle='#2a2a2a';mctx.lineWidth=1.2;mctx.stroke();}
    const sz=p.k==='big'?14*zf:p.k==='mid'?12*zf:p.k==='water'?12*zf:11,col=p.k==='water'?'#d9f0ff':'#fff';
    if(p.rot){mctx.save();mctx.translate(x,y);mctx.rotate(p.rot);mapText(p.t,0,0,sz,col,'rgba(10,30,50,0.8)',600);mctx.restore();}
    else mapText(p.t,x,y+(p.dot?-12:0),sz,col,p.k==='water'?'rgba(10,30,50,0.8)':null,p.k==='small'?600:800);}
  // Constructions
  if(S.builds&&s>=CARTE.fit*1.5){mctx.font='14px system-ui,sans-serif';mctx.textAlign='center';mctx.textBaseline='middle';
    S.builds.forEach(b=>{const k=KINDS[b.k];if(!k||!k.icon)return;const [x,y]=w2s(b.x,b.z);mctx.beginPath();mctx.arc(x,y,9,0,7);mctx.fillStyle='rgba(255,255,255,0.85)';mctx.fill();mctx.fillStyle='#000';mctx.fillText(k.icon,x,y+1);});}
  // Remorques et véhicules (orientés)
  trailers.forEach(t=>{const [x,y]=w2s(t.x,t.z),hl=Math.max((t.spec&&t.spec.hl||1)*s,4),hw=Math.max((t.spec&&t.spec.hw||0.7)*s,3);
    mctx.save();mctx.translate(x,y);mctx.rotate(Math.atan2(Math.cos(t.th),Math.sin(t.th)));mctx.fillStyle='#8a6a44';mctx.strokeStyle='#fff';mctx.lineWidth=1.5;mctx.fillRect(-hl,-hw,hl*2,hw*2);mctx.strokeRect(-hl,-hw,hl*2,hw*2);mctx.restore();});
  vehicles.forEach(v=>{const [x,y]=w2s(v.x,v.z);mctx.beginPath();mctx.arc(x,y,11,0,7);mctx.fillStyle='rgba(255,255,255,0.92)';mctx.fill();mctx.strokeStyle='#c0392b';mctx.lineWidth=2;mctx.stroke();
    mctx.font='14px system-ui,sans-serif';mctx.textAlign='center';mctx.textBaseline='middle';mctx.fillStyle='#000';mctx.fillText(V_ICON[v.type]||'🚜',x,y+1);});
  // Les autres joueurs, puis moi par-dessus
  if(typeof NET!=='undefined'&&NET.on)for(const id in NET.avatars){const a=NET.avatars[id];if(a.first)continue;const [x,y]=w2s(a.x,a.z);
    mapArrow(x,y,Math.atan2(Math.cos(a.rot),Math.sin(a.rot)),'#3b82f6',10);const n=NET.online[id]&&NET.online[id].name;if(n)mapText(n,x,y-17,12,'#cfe3ff');}
  const m=mePose(),[mx,my]=w2s(m.x,m.z);
  mctx.beginPath();mctx.arc(mx,my,16,0,7);mctx.fillStyle='rgba(255,120,40,0.22)';mctx.fill();
  mapArrow(mx,my,Math.atan2(Math.cos(m.rot),Math.sin(m.rot)),'#ff7a1a',11);
  // Nord et échelle
  mapText('N ↑',30,h-44,13,'#fff');
  const stepM=[10,25,50,100][[10,25,50,100].findIndex(v=>v*s>=60)]||100,px=stepM*s;
  mctx.fillStyle='rgba(20,24,18,0.7)';mctx.fillRect(12,h-28,px+8,16);mctx.fillStyle='#fff';mctx.fillRect(16,h-22,px,4);mapText(`${stepM} m`,16+px+26,h-20,11,'#fff');
}
function mapLoop(){if(!CARTE.open)return;drawMap();CARTE.raf=requestAnimationFrame(mapLoop);}

// ---- Ouvrir / fermer ----
function openMap(){
  if(CARTE.open)return;for(const k in keys)keys[k]=false;
  if(document.pointerLockElement)document.exitPointerLock();
  $('carte').classList.remove('hidden');CARTE.open=true;
  if(performance.now()-CARTE.imgT>20000){$('carteWait').classList.remove('hidden');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{try{bakeMapImage();}catch(e){console.warn(e);}$('carteWait').classList.add('hidden');}));}
  mapFit();{const {w,h}=mapSize();CARTE.s=CARTE.fit*(w>h*1.3?1.8:1);}centerOnMe();mapLoop();   // écran large : on part un peu zoomé sur soi
}
function closeMap(){if(typeof resetPageView==='function')resetPageView();CARTE.open=false;cancelAnimationFrame(CARTE.raf);$('carte').classList.add('hidden');CARTE.ptrs.clear();CARTE.pinch=null;CARTE.drag=null;}
$('btnMap').addEventListener('click',openMap);
$('carteClose').addEventListener('click',closeMap);
$('carteIn').addEventListener('click',()=>{const {w,h}=mapSize();zoomAt(1.6,w/2,h/2);});
$('carteOut').addEventListener('click',()=>{const {w,h}=mapSize();zoomAt(1/1.6,w/2,h/2);});
$('carteMe').addEventListener('click',()=>{CARTE.s=Math.max(CARTE.s,CARTE.fit*3.5);clampView();centerOnMe();});
$('carteAll').addEventListener('click',()=>{mapFit();CARTE.s=CARTE.fit;clampView();});
window.addEventListener('resize',()=>setTimeout(()=>{if(CARTE.open){mapFit();clampView();}},250));
mapCv.addEventListener('wheel',e=>{e.preventDefault();const q=mapPt(e);zoomAt(Math.exp(-e.deltaY*0.0015),q.x,q.y);},{passive:false});
mapCv.addEventListener('pointerdown',e=>{mapCv.setPointerCapture(e.pointerId);CARTE.ptrs.set(e.pointerId,mapPt(e));
  if(CARTE.ptrs.size===2){const [a,b]=[...CARTE.ptrs.values()];CARTE.pinch={d:Math.hypot(a.x-b.x,a.y-b.y)};CARTE.drag=null;}else CARTE.drag=mapPt(e);});
mapCv.addEventListener('pointermove',e=>{if(!CARTE.ptrs.has(e.pointerId))return;CARTE.ptrs.set(e.pointerId,mapPt(e));
  if(CARTE.pinch&&CARTE.ptrs.size===2){const [a,b]=[...CARTE.ptrs.values()],dd=Math.hypot(a.x-b.x,a.y-b.y);
    zoomAt(dd/Math.max(CARTE.pinch.d,1),(a.x+b.x)/2,(a.y+b.y)/2);CARTE.pinch.d=dd;}
  else if(CARTE.drag){const q=mapPt(e);CARTE.cx-=(q.x-CARTE.drag.x)/CARTE.s;CARTE.cz-=(q.y-CARTE.drag.y)/CARTE.s;CARTE.drag=q;clampView();}});
const _mapUp=e=>{CARTE.ptrs.delete(e.pointerId);if(CARTE.ptrs.size<2)CARTE.pinch=null;if(CARTE.ptrs.size===1){const p=[...CARTE.ptrs.values()][0];CARTE.drag={x:p.x,y:p.y};}else if(!CARTE.ptrs.size)CARTE.drag=null;};
mapCv.addEventListener('pointerup',_mapUp);mapCv.addEventListener('pointercancel',_mapUp);
