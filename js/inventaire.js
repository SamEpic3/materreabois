/* Inventaire à la Minecraft : 6 cases « en main » (barre, touches 1 à 6) + 12 cases de rangement.
   N'importe quel objet va dans n'importe quelle case : outils, plants, poissons. On peut le déplacer,
   l'empiler, le jeter par terre (touche Q ou depuis l'inventaire) et le ramasser. Chaque joueur a le sien. */
const HOT_N=6,BAG_N=12,INV_N=HOT_N+BAG_N;
const INV=new Array(INV_N).fill(null);     // {id, n, w:[poids des poissons]}
S.hot=0;
INV[0]={id:'hachette',n:1};

/* ----- Ce qu'est chaque objet ----- */
function itemDef(id){
  const t=TOOLS.find(t=>t.id===id);
  if(t)return {kind:'tool',name:t.name,stack:1,tool:t};
  if(id.startsWith('plant:')){const k=id.slice(6);return {kind:'plant',name:`Plants ${/^[aeéiouy]/.test(seedName(k))?'d\'':'de '}${seedName(k)}`,stack:50,sp:k};}
  if(id.startsWith('poisson:')){const k=id.slice(8);return {kind:'fish',name:FISH[k].n,stack:10,fish:k};}
  if(id.startsWith('cuit:')){const k=id.slice(5);return {kind:'cooked',name:fishTxt(k,true),stack:10,fish:k};}
  return {kind:'?',name:id,stack:1};
}
const PLANT_EMO={erable:'🍁',epinette:'🌲',sapin:'🎄',bouleau:'🌳'};
function itemIcon(it){
  if(!it)return '';
  const d=itemDef(it.id);
  if(d.kind==='tool'&&d.tool.kind==='rod')return '<span class="emo">🎣</span>';
  if(d.kind==='tool'){const src=thumb(it.id,()=>toolThumbModel(d.tool),true);return src?`<img src="${src}" alt="">`:'🪓';}
  if(d.kind==='plant')return `<span class="emo">${PLANT_EMO[d.sp]||'🌱'}</span>`;
  if(d.kind==='fish'||d.kind==='cooked'){const src=thumb(it.id,()=>{const g=new T.Group(),m=makeFishModel(d.fish,null,d.kind==='cooked');m.rotation.y=Math.PI/2;g.add(m);return g;},true);return src?`<img src="${src}" alt="">`:'🐟';}
  return '❔';
}
function itemLabel(it){const d=itemDef(it.id);return it.n>1?`${d.name} ×${it.n}`:d.name;}
function fishInfo(it){if(!it.w||!it.w.length)return '';const t=it.w.reduce((a,b)=>a+b,0);return it.w.length>1?`${it.w.length} poissons, ${kg(t)} en tout (le plus gros : ${kg(Math.max(...it.w))})`:`${kg(it.w[0])}`;}
function kg(w){return (Math.round(w*100)/100).toString().replace('.',',')+' kg';}

/* ----- Ajouter, retirer ----- */
// Ajoute dans les cases qui ont déjà le même objet, puis dans la première case libre (barre d'abord). Retourne ce qui reste.
function invAdd(item){
  const d=itemDef(item.id);let left={id:item.id,n:item.n||1,w:item.w?item.w.slice():undefined};
  const take=(slot,k)=>{const n=Math.min(k,left.n);slot.n+=n;if(left.w){slot.w=(slot.w||[]).concat(left.w.splice(0,n));}left.n-=n;};
  for(let i=0;i<INV_N&&left.n>0;i++){const s=INV[i];if(s&&s.id===item.id&&s.n<d.stack)take(s,d.stack-s.n);}
  for(let i=0;i<INV_N&&left.n>0;i++){if(!INV[i]){INV[i]={id:item.id,n:0,w:left.w?[]:undefined};take(INV[i],d.stack);}}
  syncTool();renderInv();
  return left.n>0?left:null;
}
// Donne un objet au joueur : s'il n'y a plus de place, il tombe à ses pieds
function giveItem(item){
  const left=invAdd(item);
  if(left){dropItem(left,P.x+Math.sin(P.rot)*0.8,P.z+Math.cos(P.rot)*0.8);toast('Inventaire plein : déposé par terre');}
}
function invTake(i,n){const s=INV[i];if(!s)return null;n=Math.min(n||s.n,s.n);const out={id:s.id,n,w:s.w?s.w.splice(0,n):undefined};s.n-=n;if(s.n<=0)INV[i]=null;syncTool();renderInv();return out;}
function heldItem(){return INV[S.hot];}
function invCount(id){return INV.reduce((a,s)=>a+(s&&s.id===id?s.n:0),0);}

/* ----- Ce qu'on tient : l'outil actif suit la case choisie ----- */
function syncTool(){
  const it=INV[S.hot],d=it&&itemDef(it.id);
  const nt=!d?null:d.kind==='tool'?d.tool:d.kind==='plant'?PLANT_TOOL:null;
  if(d&&d.kind==='plant')S.seedSel=d.sp;
  if(nt!==TOOL){TOOL=nt;P.cut=null;P.cool=0;if(typeof stopFishing==='function')stopFishing(true);}
  P.heldFish=d&&(d.kind==='fish'||d.kind==='cooked')?d.fish+(d.kind==='cooked'?'|c':''):null;
  updateToolVisual();renderHotbar();
}
function setTool(){syncTool();}   // ancien nom
function selectSlot(i){
  if(S.mode!=='foot'||P.swing>0)return;
  if(i<0||i>=HOT_N)return;
  S.hot=i;syncTool();
  const it=INV[i];toast(it?itemLabel(it):'Mains vides');
}

/* ----- Barre du bas (ordinateur) et bouton d'outil (téléphone) ----- */
function renderHotbar(){
  const hb=$('hotbar');hb.innerHTML='';
  for(let i=0;i<HOT_N;i++){
    const it=INV[i],b=document.createElement('button');b.className='slot'+(i===S.hot?' on':'');
    b.title=it?itemLabel(it):'Mains vides';
    b.innerHTML=`<span class="k">${i+1}</span>`+itemIcon(it)+(it&&it.n>1?`<span class="n">${it.n}</span>`:'');
    b.addEventListener('pointerdown',e=>{e.preventDefault();selectSlot(i);});
    hb.appendChild(b);
  }
  const it=INV[S.hot];$('toolBtn').innerHTML=it?itemIcon(it)+(it.n>1?`<span class="n">${it.n}</span>`:''):'✋';
}
// Téléphone : le bouton passe aux cases de la barre qui ont quelque chose (et une fois les mains vides)
$('toolBtn').addEventListener('pointerdown',e=>{
  e.preventDefault();
  const order=[];let empty=-1;for(let i=0;i<HOT_N;i++){if(INV[i])order.push(i);else if(empty<0)empty=i;}
  if(empty>=0)order.push(empty);order.sort((a,b)=>a-b);
  const k=order.indexOf(S.hot);selectSlot(order[(k+1)%order.length]);
});

/* ----- Fenêtre d'inventaire : toucher ou glisser pour déplacer, empiler ou échanger ----- */
const invEl=document.createElement('div');invEl.id='inv';invEl.className='hidden';
invEl.innerHTML=`<div class="card"><button id="invClose" class="xclose" title="Fermer" aria-label="Fermer">✕</button>
  <h1>🎒 Inventaire</h1><div class="money" id="invInfo">Touche un objet pour le prendre, puis une case pour le poser</div>
  <div class="invLbl">En main (1 à 6)</div><div class="invGrid" id="invHot"></div>
  <div class="invLbl">Rangement</div><div class="invGrid" id="invBag"></div>
  <div class="invBtns"><button id="invDrop" disabled>Déposer par terre</button><button id="invHalf" disabled>Séparer en deux</button></div></div>`;
$('app').appendChild(invEl);
const cursorEl=document.createElement('div');cursorEl.id='invCursor';cursorEl.className='hidden';$('app').appendChild(cursorEl);
const INVC={item:null,from:-1,drag:false,downAt:-1};
function invOpen(){return !invEl.classList.contains('hidden');}
function openInv(){if(S.mode!=='foot'&&S.mode!=='sit')return;invEl.classList.remove('hidden');renderInv();for(const k in keys)keys[k]=false;}
function closeInv(){
  if(INVC.item){const left=invAdd(INVC.item);if(left)dropItem(left,P.x,P.z);INVC.item=null;}
  cursorEl.classList.add('hidden');invEl.classList.add('hidden');renderInv();
}
function renderInv(){
  renderHotbar();
  if(!invOpen())return;
  const fill=(el,a,b)=>{el.innerHTML='';for(let i=a;i<b;i++){const it=INV[i],s=document.createElement('div');s.className='islot'+(i===S.hot?' on':'');s.dataset.i=i;
    s.innerHTML=itemIcon(it)+(it&&it.n>1?`<span class="n">${it.n}</span>`:'');el.appendChild(s);}};
  fill($('invHot'),0,HOT_N);fill($('invBag'),HOT_N,INV_N);
  const c=INVC.item;
  $('invDrop').disabled=!c;$('invHalf').disabled=!(c&&c.n>1);
  $('invInfo').textContent=c?`En main : ${itemLabel(c)}${c.w?' — '+fishInfo(c):''} · touche une case pour le poser`:'Touche un objet pour le prendre, puis une case pour le poser';
  cursorEl.innerHTML=c?itemIcon(c)+(c.n>1?`<span class="n">${c.n}</span>`:''):'';cursorEl.classList.toggle('hidden',!c);
}
// Poser l'objet du curseur dans la case i (empile, ou échange)
function placeAt(i){
  const c=INVC.item,s=INV[i];if(!c)return;
  if(!s){INV[i]=c;INVC.item=null;}
  else if(s.id===c.id){const st=itemDef(s.id).stack,n=Math.min(st-s.n,c.n);s.n+=n;if(c.w)s.w=(s.w||[]).concat(c.w.splice(0,n));c.n-=n;if(c.n<=0)INVC.item=null;}
  else{INV[i]=c;INVC.item=s;}
  syncTool();renderInv();
}
function slotAt(x,y){const el=document.elementFromPoint(x,y);const s=el&&el.closest&&el.closest('.islot');return s?+s.dataset.i:-1;}
invEl.addEventListener('pointerdown',e=>{
  const i=slotAt(e.clientX,e.clientY);if(i<0)return;e.preventDefault();
  moveCursor(e);
  if(INVC.item){placeAt(i);INVC.drag=false;return;}
  if(!INV[i])return;
  INVC.item=INV[i];INV[i]=null;INVC.from=i;INVC.drag=true;INVC.downAt=i;syncTool();renderInv();
});
function moveCursor(e){cursorEl.style.left=e.clientX+'px';cursorEl.style.top=e.clientY+'px';}
addEventListener('pointermove',e=>{if(INVC.item)moveCursor(e);});
addEventListener('pointerup',e=>{
  if(!INVC.drag)return;INVC.drag=false;
  const i=slotAt(e.clientX,e.clientY);
  if(i>=0&&i!==INVC.downAt)placeAt(i);     // glissé sur une autre case ; sinon l'objet reste au curseur (mode toucher)
});
$('invClose').addEventListener('click',closeInv);
invEl.addEventListener('click',e=>{if(e.target===invEl)closeInv();});
$('invDrop').addEventListener('click',()=>{const c=INVC.item;if(!c)return;INVC.item=null;dropItem(c,P.x+Math.sin(P.rot)*0.9,P.z+Math.cos(P.rot)*0.9);toast(`${itemLabel(c)} : déposé par terre`);renderInv();});
$('invHalf').addEventListener('click',()=>{const c=INVC.item;if(!c||c.n<2)return;const h=Math.floor(c.n/2),out={id:c.id,n:h,w:c.w?c.w.splice(0,h):undefined};c.n-=h;
  const i=INV.findIndex(s=>!s);if(i>=0)INV[i]=out;else{c.n+=h;if(c.w)c.w=out.w.concat(c.w);}syncTool();renderInv();});
$('btnInv').addEventListener('click',()=>invOpen()?closeInv():openInv());
// Q : jeter un de l'objet tenu
function dropHeld(){if(S.mode!=='foot')return;const it=INV[S.hot];if(!it)return;const o=invTake(S.hot,1);dropItem(o,P.x+Math.sin(P.rot)*0.9,P.z+Math.cos(P.rot)*0.9);toast(`${itemDef(o.id).name} : déposé par terre`);}

/* ----- Objets par terre : ils tournent doucement, on les ramasse en passant à côté ----- */
S.drops=[];      // {id, it:{id,n,w}, x, z, t}
function dropModel(it){
  const d=itemDef(it.id),g=new T.Group();
  if(d.kind==='tool'){const m=toolThumbModel(d.tool);const b=new T.Box3().setFromObject(m),sz=b.getSize(new T.Vector3()),k=0.75/Math.max(sz.x,sz.y,sz.z,0.01);m.scale.multiplyScalar(k);m.rotation.z=Math.PI/2;g.add(m);}
  else if(d.kind==='fish'||d.kind==='cooked'){const m=makeFishModel(d.fish,null,d.kind==='cooked');g.add(m);}
  else if(d.kind==='plant'){box(0.03,0.3,0.03,mat(0x5b4330),0,0.15,0,g);const c=new T.Mesh(new T.ConeGeometry(0.12,0.3,6),mat(0x3f6b3a));c.position.y=0.38;g.add(c);const pot=new T.Mesh(new T.CylinderGeometry(0.09,0.07,0.12,8),mat(0x9a5a32));pot.position.y=0.06;g.add(pot);}
  else box(0.3,0.3,0.3,mat(0x999999),0,0.15,0,g);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}
function spawnDrop(dr){
  const g=new T.Group(),m=dropModel(dr.it);g.add(m);dr.mesh=g;dr.inner=m;
  // Halo au sol pour le repérer
  const ring=new T.Mesh(new T.RingGeometry(0.28,0.36,20).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:0.5,depthWrite:false}));ring.position.y=0.03;g.add(ring);
  g.position.set(dr.x,walkH(dr.x,dr.z),dr.z);scene.add(g);
}
function dropItem(it,x,z,id){
  if(!it||!it.n)return null;
  const dr={id:id||uid(),it:{id:it.id,n:it.n,w:it.w?it.w.slice():undefined},x,z,t:Date.now()};
  if(waterDepth(x,z)>0.2&&!onDock(x,z)){dr.x=P.x;dr.z=P.z;}   // pas dans le lac
  S.drops.push(dr);spawnDrop(dr);return dr;
}
function removeDrop(dr){const i=S.drops.indexOf(dr);if(i>=0)S.drops.splice(i,1);if(dr.mesh)scene.remove(dr.mesh);}
function nearestDrop(){let b=null,bd=1.4;S.drops.forEach(d=>{const k=Math.hypot(P.x-d.x,P.z-d.z);if(k<bd){bd=k;b=d;}});return b;}
function pickUpDrop(dr){
  const left=invAdd(dr.it);
  if(left&&left.n===dr.it.n){toast('Inventaire plein');return;}
  removeDrop(dr);if(left)dropItem(left,dr.x,dr.z);
  sfxKnock(dr.x,dr.z,0.4);toast(`Ramassé : ${itemLabel(dr.it.n&&!left?dr.it:{id:dr.it.id,n:dr.it.n-(left?left.n:0)})}`);
}
function updateDrops(dt){S.drops.forEach(d=>{if(!d.mesh)return;d.inner.rotation.y+=dt*1.2;d.inner.position.y=0.25+Math.sin(S.time*2+d.x)*0.06;});}
// Ancien format (outils possédés en commun, plants comptés) → objets dans l'inventaire
function invFromOld(ownedIds,seeds){
  INV.fill(null);let i=0;
  (ownedIds||['hachette']).forEach(id=>{if(TOOLS.some(t=>t.id===id)&&i<INV_N)INV[i++]={id,n:1};});
  Object.keys(seeds||{}).forEach(k=>{if(seeds[k]>0&&i<INV_N)INV[i++]={id:'plant:'+k,n:seeds[k]};});
}
// L'affichage initial de la barre se fait dans sauvegarde.js, une fois tous les fichiers chargés.
