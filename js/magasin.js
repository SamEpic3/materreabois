/* Magasin général et messages à l'écran */
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
