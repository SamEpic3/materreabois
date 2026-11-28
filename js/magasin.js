/* Magasin général et messages à l'écran */
/* ---------- Magasin ---------- */
function secs(x){return (Math.round(x*10)/10).toString().replace('.',',')+' s';}
// Deux comptoirs : le magasin général (nourriture : commandes, poisson, viande) et le concessionnaire (tout le reste)
let SHOP_MODE='store';
const STORE_SECS=['Commande en cours','Vendre tes poissons','Vendre ta viande'];
function shopDoor(){return SHOP_MODE==='dealer'?DEALER_DOOR:STORE_DOOR;}
function openShop(mode){SHOP_MODE=mode==='dealer'?'dealer':'store';renderShop();$('shop').classList.remove('hidden');for(const k in keys)keys[k]=false;}
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
// Orientation à l'apparition : dos au bâtiment le plus proche, le devant (ou le timon) vers la rue
function spawnHeading(x,z){const [lx]=vilLocal(x,z);return lx>2?VROT-Math.PI/2:lx<-2?VROT+Math.PI/2:VROT;}
function findSpawn(cols,th0,pref){
  const others=bodyCircles(null);
  const free=(x,z)=>{const th=spawnHeading(x,z),fx=Math.sin(th),fz=Math.cos(th);const list=cols.map(([o,r])=>[x+fx*o,z+fz*o,r+0.4]);
    if(circlesHit(list,others))return false;
    if(list.some(c=>inSale(c[0],c[1])||Math.hypot(c[0]-YARD.x,c[1]-YARD.z)<YARD.r+c[2]))return false;
    return list.every(c=>Math.hypot(c[0]-P.x,c[1]-P.z)>c[2]+0.6);};
  const cand=[[14.6,15.6],[14.6,32.4],[-14.5,-19.5],[-14.5,-7.5],pref,[0,-18],[1,-7],[0,14],[0,27],[2,9],[-1,-22]];   // stationnements, puis la rue
  const out=p=>({x:p.x,z:p.z,th:spawnHeading(p.x,p.z)});
  for(const [lx,lz] of cand){const p=vpos(lx,lz);if(free(p.x,p.z))return out(p);}
  for(let r=4;r<30;r+=2)for(let a=0;a<Math.PI*2;a+=0.4){const x=VILLAGE.x+Math.cos(a)*r,z=VILLAGE.z+Math.sin(a)*r;if(free(x,z))return out({x,z});}
  return out(vpos(pref[0],pref[1]));
}
function toolThumbModel(t){
  const g=new T.Group();let m;
  if(t.kind==='rod'){const r=makeRodModel();r.rotation.z=-0.9;g.add(r);return g;}
  if(t.kind==='axe'){m=makeAxeModel();axeColors(m,t.id);}else if(t.kind==='saw')m=makeSawModel();else if(t.kind==='shovel')m=makeShovelModel();else m=makeChainModel(t.id==='scie-usagee');
  // De profil : le manche en diagonale, la tête ou la lame en haut à droite
  const w=new T.Group();w.add(m);if(t.kind==='shovel')m.rotation.z=1.25;   // la palette de face
  w.rotation.set(0,Math.PI/2,0);g.add(w);g.rotation.z=t.kind==='chainsaw'?0.25:0.6;return g;
}
function imgTag(src){return src?`<img class="thumb" src="${src}" alt="">`:'';}
function renderShop(){
  $('shopTitle').textContent=SHOP_MODE==='dealer'?'🚜 Concessionnaire':'🏪 Magasin général';
  $('shopMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('shopList');L.innerHTML='';
  const sec=txt=>{const h=document.createElement('div');h.className='shopSec';h.textContent=txt;L.appendChild(h);};
  // Commande en cours
  const o=S.order;
  if(o&&!o.done&&!o.expired){
    sec('Commande en cours');
    const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div class="thumb emoji">📋</div><div class="txt"><b>${o.who}</b> — prime ${o.reward} $<p>Veut ${orderText(o)}.</p><p class="stats">${Math.min(S.ordGot,o.n)}/${o.n} · il reste ${fmtLeft(o.left)}</p></div>`;
    if(o.kind==='poisson'){const n=Math.min(orderFishAvail(),o.n-S.ordGot),b=document.createElement('button');b.textContent=n?`Livrer ${n}`:'Rien à livrer';b.disabled=!n;b.onclick=()=>{deliverFish();renderShop();};d.appendChild(b);}
    L.appendChild(d);
  }
  // Vendre ses poissons (crus ou cuits)
  const fishSlots=INV.map((s,i)=>[s,i]).filter(([s])=>s&&/^(poisson|cuit):/.test(s.id));
  if(fishSlots.length){
    sec('Vendre tes poissons');
    fishSlots.forEach(([s,i])=>{
      const d=document.createElement('div'),dd=itemDef(s.id),v=stackValue(s);d.className='item';
      d.innerHTML=`<div class="thumb fishThumb">${itemIcon(s)}</div><div class="txt"><b>${itemLabel(s)}</b> — ${v} $<p>${fishInfo(s)}${dd.kind==='cooked'?' · cuit : 1,8 fois le prix':' · cuit sur le barbecue, il vaudrait '+Math.round(v*COOK_BONUS)+' $'}</p></div>`;
      const b=document.createElement('button');b.textContent='Vendre';b.onclick=()=>{const g=sellFishSlot(i);sfxCash();toast(`🐟 +${g} $`);renderShop();};
      d.appendChild(b);L.appendChild(d);
    });
    if(fishSlots.length>1){const tot=fishSlots.reduce((a,[s])=>a+stackValue(s),0),d=document.createElement('div');d.className='item';
      d.innerHTML=`<div class="txt"><b>Tout vendre</b> — ${tot} $</div>`;const b=document.createElement('button');b.textContent='Tout vendre';
      b.onclick=()=>{let g=0;INV.forEach((s,i)=>{if(s&&/^(poisson|cuit):/.test(s.id))g+=sellFishSlot(i);});sfxCash();toast(`🐟 +${g} $`);renderShop();};d.appendChild(b);L.appendChild(d);}
  }
  if(typeof renderHuntShop==='function')renderHuntShop(L,sec);
  sec('Outils');
  TOOLS.filter(t=>!t.hunt&&!t.store).forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const stats=t.kind==='rod'?'Pour pêcher au lac, du bord ou du quai':t.kind==='shovel'?`Une souche : ≈ ${secs(12*t.delay)}`:`Arbre moyen : ≈ ${secs(Math.max(1,Math.ceil(9*t.fell))*t.delay)} · Une coupe : ≈ ${secs(t.cut*t.delay)}`;
    d.innerHTML=imgTag(thumb(t.id,()=>toolThumbModel(t),true))+`<div class="txt"><b>${t.name}</b>${t.price?` — ${t.price} $`:''}<p>${t.desc}</p><p class="stats">${stats}</p></div>`;
    const b=document.createElement('button');
    if(!t.price){b.textContent='Gratuite';b.disabled=invCount(t.id)>0;b.onclick=()=>{giveItem({id:t.id,n:1});renderShop();};}
    else{b.textContent='Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price||!buyCheck({id:t.id,n:1}))return;S.money-=t.price;giveItem({id:t.id,n:1});J.buy(t.name.toLowerCase(),t.price);toast(`${t.name} : dans ton inventaire !`);sfxCash();renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  sec('Érablière');
  {
    const d=document.createElement('div');d.className='item';
    d.innerHTML=imgTag(thumb('chaudiere',()=>{const g=new T.Group();const m=makeTapBucket();g.add(m);return g;}))+`<div class="txt"><b>Chaudière et chalumeau</b> — 25 $<p>Pour entailler un érable : la chaudière se remplit d'eau d'érable toute seule.</p><p class="stats">Tu en as ${S.taps} en réserve · ${taps.length} installée${taps.length>1?'s':''}</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<25;
    b.onclick=()=>{if(S.money<25||!buyCheck({id:'chaudiere',n:1}))return;S.money-=25;giveItem({id:'chaudiere',n:1});J.buy('une chaudière et un chalumeau',25);toast('Chaudière achetée : dans ton inventaire');renderShop();};
    d.appendChild(b);L.appendChild(d);
  }
  {
    const d=document.createElement('div');d.className='item';
    d.innerHTML=imgTag(thumb('seau',()=>{const g=new T.Group();g.add(makePail());return g;}))+`<div class="txt"><b>Seau de collecte</b> — 15 $<p>Pour vider les chaudières et transporter l'eau d'érable ou le sirop (30 L).</p><p class="stats">Il te sera remis en main, ou posé devant la porte</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<15;
    b.onclick=()=>{if(S.money<15||!buyCheck({id:'seau',n:1}))return;S.money-=15;J.buy('un seau',15);giveItem({id:'seau',n:1});
      toast('Seau acheté : dans ton inventaire');renderShop();};
    d.appendChild(b);L.appendChild(d);
  }
  sec('Plantation');
  SEED_TYPES.forEach(k=>{
    const d=document.createElement('div'),pr=SEED_PRICE[k];d.className='item';
    d.innerHTML=`<div class="thumb emoji">🌱</div><div class="txt"><b>Plants ${/^[aeéiouy]/.test(seedName(k))?'d\'':'de '}${seedName(k)} (×${SEED_PACK})</b> — ${pr} $<p>À planter n'importe où de libre. Ils poussent en 3 à 5 heures.</p><p class="stats">Tu en as ${invCount('plant:'+k)}</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<pr;
    b.onclick=()=>{if(S.money<pr||!buyCheck({id:'plant:'+k,n:SEED_PACK}))return;S.money-=pr;giveItem({id:'plant:'+k,n:SEED_PACK});J.buy(`${SEED_PACK} plants de ${SPECIES[k].n.toLowerCase()}`,pr);toast(`🌱 ${SEED_PACK} plants ajoutés à l'inventaire`);renderShop();};
    d.appendChild(b);L.appendChild(d);
  });
  sec('Véhicules et remorques');
  VEH_SHOP.forEach(t=>{
    const d=document.createElement('div');d.className='item';
    const isT=t.kind==='trailer';
    const img=thumb(t.id,()=>isT?TSPECS[t.id].build().g:SPECS[t.id].build().g);
    const stats=isT&&TSPECS[t.id].stats?TSPECS[t.id].stats:t.id==='fendeuse'||t.id==='chaloupe'||t.id==='dechiq'?'S\'attache au VTT ou au pick-up':isT?`Capacité : ${TSPECS[t.id].cap} billots`+(t.id==='loader'?' · jusqu\'à 12 pi':''):`Vitesse max ≈ ${Math.round(SPECS[t.id].maxF*3.6)} km/h (VTT : ${Math.round(SPECS.vtt.maxF*3.6)} km/h)`;
    d.innerHTML=imgTag(img)+`<div class="txt"><b>${t.name}</b> — ${t.price} $<p>${t.desc}</p><p class="stats">${stats}</p></div>`;
    const b=document.createElement('button');
    const have=isT?trailers.filter(x=>x.kind===t.id).length:vehicles.filter(v=>v.type===t.id).length;
    if(have)d.querySelector('.stats').textContent+=` · Tu en as ${have}`;
    {b.textContent=have?(isT?'En acheter une autre':'En acheter un autre'):'Acheter';b.disabled=S.money<t.price;b.onclick=()=>{if(S.money<t.price)return;S.money-=t.price;J.buy(t.name.toLowerCase(),t.price);
      const th=VROT+Math.PI/2,sp=isT?TSPECS[t.id]:SPECS[t.id],p=findSpawn(sp.cols,th,[0,-13]);
      if(isT)makeTrailerObj(t.id,p.x,p.z,p.th);else makeVehicle(t.id,p.x,p.z,p.th);
      toast(`${t.name} : ${isT?'elle t\'attend':'il t\'attend'} devant le magasin !`);renderShop();};}
    d.appendChild(b);L.appendChild(d);
  });
  SOON.forEach(t=>{const d=document.createElement('div');d.className='item soon';d.innerHTML=`<div class="txt"><b>${t.name}</b><p>${t.desc}</p></div><button disabled>Bientôt</button>`;L.appendChild(d);});
}

/* ---------- Messages ---------- */
let toastTimer=0;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1800);}

// Garde seulement les rayons de ce comptoir
const _renderShopAll=renderShop;
renderShop=function(){
  _renderShopAll();
  const L=$('shopList');let keep=true,any=false;
  [...L.children].forEach(el=>{
    if(el.classList.contains('shopSec')){const inStore=STORE_SECS.includes(el.textContent);keep=SHOP_MODE==='dealer'?!inStore:inStore;}
    if(!keep)el.remove();else any=true;
  });
  if(SHOP_MODE==='store'){const d=document.createElement('div');d.className='item';
    d.innerHTML='<div class="thumb emoji">🛒</div><div class="txt"><b>Épicerie</b><p>Bientôt : des articles d\'épicerie et d\'autres articles généraux. Pour les outils, les véhicules, la chasse et les constructions, va au concessionnaire, de l\'autre côté de la rue.</p></div>';
    L.appendChild(d);}
};
