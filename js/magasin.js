/* Magasin général et messages à l'écran */
/* ---------- Magasin ---------- */
function secs(x){return (Math.round(x*10)/10).toString().replace('.',',')+' s';}
function openShop(){renderShop();$('shop').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeShop(){$('shop').classList.add('hidden');}
$('shopClose').addEventListener('click',closeShop);
let thumbR=null;const thumbCache={};
function thumb(id,build,side){   // side : outils vus de profil, en entier
  if(thumbCache[id]!==undefined)return thumbCache[id];
  try{
    if(!thumbR){thumbR=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});thumbR.setPixelRatio(1);thumbR.setSize(184,134);}
    const sc=new T.Scene();sc.add(new T.HemisphereLight(0xffffff,0x6b5a40,0.95));const dl=new T.DirectionalLight(0xffffff,0.75);dl.position.set(3,5,4);sc.add(dl);
    const bk=new T.DirectionalLight(0xfff0d8,0.35);bk.position.set(-4,2,-3);sc.add(bk);
    const o=build();sc.add(o);o.updateMatrixWorld(true);
    const b3=new T.Box3().setFromObject(o),c=b3.getCenter(new T.Vector3()),sz=b3.getSize(new T.Vector3());
    const r=Math.max(sz.x,sz.y,sz.z)||1;
    const cam=new T.PerspectiveCamera(30,184/134,0.01,200);
    if(side)cam.position.set(c.x+r*0.12,c.y+r*0.2,c.z+r*2.05);else cam.position.set(c.x+r*1.35,c.y+r*0.9,c.z+r*1.55);
    cam.lookAt(c);
    const sv=silMat.visible;silMat.visible=false;thumbR.render(sc,cam);silMat.visible=sv;
    thumbCache[id]=thumbR.domElement.toDataURL('image/png');
  }catch(e){thumbCache[id]='';}
  return thumbCache[id];
}
function findSpawn(cols,th,pref){
  const fx=Math.sin(th),fz=Math.cos(th),others=bodyCircles(null);
  const free=(x,z)=>{const list=cols.map(([o,r])=>[x+fx*o,z+fz*o,r+0.4]);
    if(circlesHit(list,others))return false;
    if(list.some(c=>inSale(c[0],c[1])||Math.hypot(c[0]-YARD.x,c[1]-YARD.z)<YARD.r+c[2]))return false;
    return list.every(c=>Math.hypot(c[0]-P.x,c[1]-P.z)>c[2]+0.6);};
  const cand=[pref,[8,4],[11,8],[8,11],[12,13],[14,8],[16,4],[-4,16],[4,17],[9,16],[-7,17]];
  for(const [lx,lz] of cand){const p=vpos(lx,lz);if(free(p.x,p.z))return p;}
  for(let r=4;r<30;r+=2)for(let a=0;a<Math.PI*2;a+=0.4){const x=VILLAGE.x+Math.cos(a)*r,z=VILLAGE.z+Math.sin(a)*r;if(free(x,z))return {x,z};}
  return vpos(pref[0],pref[1]);
}
function toolThumbModel(t){
  const g=new T.Group();let m;
  if(t.kind==='axe'){m=makeAxeModel();axeColors(m,t.id);}else if(t.kind==='saw')m=makeSawModel();else if(t.kind==='shovel')m=makeShovelModel();else m=makeChainModel(t.id==='scie-usagee');
  // De profil : le manche en diagonale, la tête ou la lame en haut à droite
  const w=new T.Group();w.add(m);if(t.kind==='shovel')m.rotation.z=1.25;   // la palette de face
  w.rotation.set(0,Math.PI/2,0);g.add(w);g.rotation.z=t.kind==='chainsaw'?0.25:0.6;return g;
}
function imgTag(src){return src?`<img class="thumb" src="${src}" alt="">`:'';}
function renderShop(){
  $('shopMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('shopList');L.innerHTML='';
  const sec=txt=>{const h=document.createElement('div');h.className='shopSec';h.textContent=txt;L.appendChild(h);};
  sec('Outils');
  TOOLS.forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const stats=t.kind==='shovel'?`Une souche : ≈ ${secs(12*t.delay)}`:`Arbre moyen : ≈ ${secs(Math.max(1,Math.ceil(9*t.fell))*t.delay)} · Une coupe : ≈ ${secs(t.cut*t.delay)}`;
    d.innerHTML=imgTag(thumb(t.id,()=>toolThumbModel(t),true))+`<div class="txt"><b>${t.name}</b>${t.price?` — ${t.price} $`:''}<p>${t.desc}</p><p class="stats">${stats}</p></div>`;
    const b=document.createElement('button');
    if(owned.has(t.id)){b.textContent='À toi';b.disabled=true;}
    else{b.textContent='Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price)return;S.money-=t.price;owned.add(t.id);setTool(t);J.buy(t.name.toLowerCase(),t.price);toast(`${t.name} : dans ton inventaire et en main !`);renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  sec('Érablière');
  {
    const d=document.createElement('div');d.className='item';
    d.innerHTML=imgTag(thumb('chaudiere',()=>{const g=new T.Group();const m=makeTapBucket();g.add(m);return g;}))+`<div class="txt"><b>Chaudière et chalumeau</b> — 25 $<p>Pour entailler un érable : la chaudière se remplit d'eau d'érable toute seule.</p><p class="stats">Tu en as ${S.taps} en réserve · ${taps.length} installée${taps.length>1?'s':''}</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<25;
    b.onclick=()=>{if(S.money<25)return;S.money-=25;S.taps++;J.buy('une chaudière et un chalumeau',25);toast('Chaudière achetée');renderShop();};
    d.appendChild(b);L.appendChild(d);
  }
  {
    const d=document.createElement('div');d.className='item';
    d.innerHTML=imgTag(thumb('seau',()=>{const g=new T.Group();g.add(makePail());return g;}))+`<div class="txt"><b>Seau de collecte</b> — 15 $<p>Pour vider les chaudières et transporter l'eau d'érable ou le sirop (30 L).</p><p class="stats">Il te sera remis en main, ou posé devant la porte</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<15;
    b.onclick=()=>{if(S.money<15)return;S.money-=15;J.buy('un seau',15);
      if(!P.pail&&!P.carry)setPail({kind:'eau',L:0});else addGroundPail(STORE_DOOR.x+(Math.random()-0.5)*1.5,STORE_DOOR.z+1.2,'eau',0);
      toast('Seau acheté');renderShop();};
    d.appendChild(b);L.appendChild(d);
  }
  sec('Plantation');
  SEED_TYPES.forEach(k=>{
    const d=document.createElement('div'),pr=SEED_PRICE[k];d.className='item';
    d.innerHTML=`<div class="thumb emoji">🌱</div><div class="txt"><b>Plants ${/^[aeéiouy]/.test(seedName(k))?'d\'':'de '}${seedName(k)} (×${SEED_PACK})</b> — ${pr} $<p>À planter n'importe où de libre. Ils poussent en 3 à 5 heures.</p><p class="stats">Tu en as ${S.seeds[k]}</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<pr;
    b.onclick=()=>{if(S.money<pr)return;S.money-=pr;S.seeds[k]+=SEED_PACK;J.buy(`${SEED_PACK} plants de ${SPECIES[k].n.toLowerCase()}`,pr);S.seedSel=k;renderHotbar();toast(`🌱 ${SEED_PACK} plants ajoutés à l'inventaire`);renderShop();};
    d.appendChild(b);L.appendChild(d);
  });
  sec('Véhicules et remorques');
  VEH_SHOP.forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const isT=t.kind==='trailer';
    const img=thumb(t.id,()=>isT?TSPECS[t.id].build().g:SPECS[t.id].build().g);
    const stats=t.id==='fendeuse'?'S\'attache au VTT ou au pick-up':isT?`Capacité : ${TSPECS[t.id].cap} billots`+(t.id==='loader'?' · jusqu\'à 12 pi':''):`Vitesse max ≈ ${Math.round(SPECS[t.id].maxF*3.6)} km/h (VTT : ${Math.round(SPECS.vtt.maxF*3.6)} km/h)`;
    d.innerHTML=imgTag(img)+`<div class="txt"><b>${t.name}</b> — ${t.price} $<p>${t.desc}</p><p class="stats">${stats}</p></div>`;
    const b=document.createElement('button');
    const have=isT?trailers.filter(x=>x.kind===t.id).length:vehicles.filter(v=>v.type===t.id).length;
    if(have)d.querySelector('.stats').textContent+=` · Tu en as ${have}`;
    {b.textContent=have?(isT?'En acheter une autre':'En acheter un autre'):'Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price)return;S.money-=t.price;J.buy(t.name.toLowerCase(),t.price);
      const th=VROT+Math.PI/2,sp=isT?TSPECS[t.id]:SPECS[t.id],p=findSpawn(sp.cols,th,{vtt:[8,4],small:[8,11],pickup:[11,8],loader:[8,11],skid:[12,13],fendeuse:[8,11]}[t.id]);
      if(isT)makeTrailerObj(t.id,p.x,p.z,th);else makeVehicle(t.id,p.x,p.z,th);
      toast(`${t.name} : ${isT?'elle t\'attend':'il t\'attend'} devant le magasin !`);renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  SOON.forEach(t=>{const d=document.createElement('div');d.className='item soon';d.innerHTML=`<div class="txt"><b>${t.name}</b><p>${t.desc}</p></div><button disabled>Bientôt</button>`;L.appendChild(d);});
}

/* ---------- Messages ---------- */
let toastTimer=0;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}
