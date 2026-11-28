/* Propane : le barbecue brûle le gaz d'une bonbonne de 20 lb (environ 30 cuissons de 2 minutes).
   Bonbonne pleine au magasin général; on rapporte la vide pour un échange moins cher.
   b.tank : niveau de gaz de la bonbonne branchée (0 à 1), ou null s'il n'y en a pas. */
const PROPANE={price:40,swap:25,life:3600};   // 3 600 s allumé = 30 cuissons de 2 min

{const _d=itemDef;itemDef=function(id){
  if(id==='propane')return {kind:'propane',name:'Bonbonne de propane',stack:1};   // chacune garde son niveau (d.g, pleine si absent)
  if(id==='propane_vide')return {kind:'propane',name:'Bonbonne de propane vide',stack:4};
  return _d(id);};}
function makeTankModel(empty){
  const g=new T.Group(),body=new T.MeshPhongMaterial({color:empty?0xb9bcbf:0xf2f2f0,shininess:60,specular:0x666666}),steel=new T.MeshPhongMaterial({color:0x8e9296,shininess:60});
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.15,0.15,0.3,16).translate(0,0.21,0),new T.SphereGeometry(0.15,16,8,0,Math.PI*2,0,Math.PI/2).scale(1,0.45,1).translate(0,0.36,0),
    new T.SphereGeometry(0.15,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2).scale(1,0.45,1).translate(0,0.06,0)]),body));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.13,0.13,0.05,14,1,true).translate(0,0.02,0),new T.CylinderGeometry(0.08,0.09,0.12,12,1,true).translate(0,0.46,0),
    new T.CylinderGeometry(0.025,0.025,0.06,8).translate(0,0.45,0)]),steel));
  return g;
}
const gasOf=it=>it&&it.d&&it.d.g!=null?it.d.g:1;
{const _il=itemLabel;itemLabel=function(it){if(it&&it.id==='propane'){const g=gasOf(it);return g>=0.999?'Bonbonne de propane (pleine)':`Bonbonne de propane (${Math.round(g*100)} %)`;}return _il(it);};}
{const _ic=itemIcon;itemIcon=function(it){
  if(it&&(it.id==='propane'||it.id==='propane_vide')){const src=thumb(it.id,()=>makeTankModel(it.id==='propane_vide'),false);return src?`<img src="${src}" alt="">`:'<span class="emo">🛢️</span>';}
  return _ic(it);};}

/* ----- Au magasin général (rayon Barbecue) ----- */
STORE_SECS.push('Barbecue');
{const _hs=renderHuntShop;renderHuntShop=function(L,sec){
  _hs(L,sec);
  sec('Barbecue');
  const row=(html,btn,dis,fn,empty)=>{const d=document.createElement('div');d.className='item';const src=thumb(empty?'propane_vide':'propane',()=>makeTankModel(!!empty),false);
    d.innerHTML=(src?`<img class="thumb" src="${src}" alt="">`:'<div class="thumb emoji">🛢️</div>')+`<div class="txt">${html}</div>`;
    const b=document.createElement('button');b.textContent=btn;b.disabled=dis;b.onclick=fn;d.appendChild(b);L.appendChild(d);};
  const full=INV.filter(x=>x&&x.id==='propane'&&gasOf(x)>=0.999).length,part=INV.filter(x=>x&&x.id==='propane'&&gasOf(x)<0.999).length,vide=invCount('propane_vide');
  row(`<b>Bonbonne de propane 20 lb</b> — ${PROPANE.price} $<p>Pour le barbecue : environ 30 cuissons. Rapporte la vide, l'échange coûte moins cher.</p><p class="stats">Tu en as ${full} pleine${full>1?'s':''}${part?` · ${part} entamée${part>1?'s':''}`:''}${vide?` · ${vide} vide${vide>1?'s':''}`:''}</p>`,
    'Acheter',S.money<PROPANE.price,()=>{if(S.money<PROPANE.price||!buyCheck({id:'propane',n:1}))return;S.money-=PROPANE.price;giveItem({id:'propane',n:1});J.buy('une bonbonne de propane',PROPANE.price);sfxCash();toast('🛢️ Bonbonne de propane : dans ton inventaire');renderShop();});
  if(vide)row(`<b>Échanger une bonbonne vide</b> — ${PROPANE.swap} $<p>Tu laisses ta bonbonne vide et tu repars avec une pleine.</p>`,
    'Échanger',S.money<PROPANE.swap,()=>{const i=INV.findIndex(s=>s&&s.id==='propane_vide');if(i<0||S.money<PROPANE.swap)return;invTake(i,1);S.money-=PROPANE.swap;giveItem({id:'propane',n:1});J.buy('un échange de bonbonne',PROPANE.swap);sfxCash();toast('🛢️ Bonbonne échangée : elle est pleine');renderShop();},true);
};}

/* ----- Au barbecue ----- */
const tankOf=b=>{if(b.tank===undefined)b.tank=1;return b.tank;};   // un barbecue est livré avec une bonbonne pleine
{const _cb=createBbq;createBbq=function(b,o){_cb(b,o);tankOf(b);if(o.tankM)o.tankM.visible=b.tank!==null;};KINDS.bbq.create=createBbq;}   // la bonbonne du modèle n'apparaît que si elle est branchée
{const _ub=updateBbq;updateBbq=function(b,dt,puff){
  const t=tankOf(b);
  if(b.on){if(!(t>0)){b.on=false;if(Math.hypot(P.x-b.x,P.z-b.z)<12)toast('🛢️ Plus de propane : le barbecue s\'est éteint');}
    else b.tank=Math.max(0,t-dt/PROPANE.life);}
  _ub(b,dt,puff);
  if(b._o&&b._o.tankM)b._o.tankM.visible=b.tank!==null;
};}
/* Tenir une bonbonne en main pour la brancher (ou l'échanger), et reprendre celle du barbecue, pleine ou non.
   Fermé et éteint : « Prendre la bonbonne ». Ouvert : « Allumer ». */
function takeTank(q){
  const t=q.tank;if(t===null)return;
  const item=t<=0.01?{id:'propane_vide',n:1}:{id:'propane',n:1,d:t>=0.999?undefined:{g:Math.round(t*1000)/1000}};
  if(!buyCheck(item))return;
  q.tank=null;q.on=false;giveItem(item);sfxKnock(q.x,q.z,0.5);
  toast(t<=0.01?'🛢️ Bonbonne vide dans ton inventaire : échange-la au magasin général':`🛢️ Bonbonne prise (${Math.round(t*100)} %)`);
}
function putTank(q){
  const it=heldItem();if(!it||it.id!=='propane')return;
  const g=gasOf(it),old=q.tank;invTake(S.hot,1);
  if(old!==null)giveItem(old<=0.01?{id:'propane_vide',n:1}:{id:'propane',n:1,d:old>=0.999?undefined:{g:Math.round(old*1000)/1000}});
  q.tank=g;sfxKnock(q.x,q.z,0.5);toast(`🛢️ Bonbonne branchée : ${Math.round(g*100)} %`);
}
{const _bc=bbqContext;bbqContext=function(q){
  const r=_bc(q),t=tankOf(q),held=heldItem(),hold=!!(held&&held.id==='propane');
  r.info=(r.info||'')+(t===null?' · pas de bonbonne':` · propane : ${Math.round(t*100)} %`);
  if(q.on)return r;                                     // allumé : on l'éteint d'abord
  const slot=r.act2&&/^Allumer/.test(r.act2.label)?'act2':r.act&&/^Allumer/.test(r.act.label)?'act':null;
  if(hold){const g=Math.round(gasOf(held)*100),a={label:t===null?`Brancher la bonbonne (${g} %)`:`Échanger avec la bonbonne en main (${g} %)`,fn:()=>putTank(q)};
    r[slot||(r.act2?'act2':'act')]=a;return r;}
  if(!q.open){if(slot)r[slot]=t!==null?{label:`Prendre la bonbonne (${Math.round(t*100)} %)`,fn:()=>takeTank(q)}:null;
    if(t===null)r.info+=' : tiens-en une en main pour la brancher';return r;}
  if(slot&&!(t>0.01))r[slot]={label:'Allumer le barbecue',fn:()=>toast(t===null?'Il faut une bonbonne de propane : tiens-la en main pour la brancher':'La bonbonne est vide : ferme le couvercle pour la prendre, puis échange-la au magasin général')};
  return r;};}
