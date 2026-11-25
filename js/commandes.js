/* Commandes du village : de temps en temps (jamais une à la suite de l'autre), quelqu'un demande du bois,
   du poisson ou du sirop, avec un délai. On est payé normalement pour la marchandise, plus une prime à la fin.
   En multijoueur, l'hôte fait apparaître et expirer les commandes; l'avancement est partagé. */
S.order=null;            // {id, kind, sp, cooked, n, reward, left, who, done, expired}
S.ordGot=0;              // combien de livrés (compteur partagé)
S.ordNext=240+Math.random()*240;   // secondes de jeu avant la prochaine
const ORD_SP=['erable','epinette','sapin','bouleau'];

const deN=n=>/^[aeéiouy]/i.test(n)?"d'":'de ';
function orderText(o,short){
  if(!o)return '';
  const N=o.n;
  if(o.kind==='sciage'){const e=o.sp?` ${deN(SPECIES[o.sp].n)}${SPECIES[o.sp].n.toLowerCase()}`:'';return `${N} billots de sciage${e}`+(short?'':' (8 pi et plus) livrés à la cour');}
  if(o.kind==='fendu')return `${N} morceaux de bois fendu`+(short?'':' livrés à la cour');
  if(o.kind==='poisson'){const F=o.sp&&FISH[o.sp],nm=F?F.n.toLowerCase():'poisson';const pl=N>1?(F&&/e$/.test(nm)?'s':F?'s':'s'):'';
    const base=F?(N>1?nm.replace(/^(\S+)/,'$1s'):nm):(N>1?'poissons':'poisson');
    return `${N} ${base}${o.cooked?((F&&F.fem)?' cuite':' cuit')+(N>1?'s':''):''}`+(short?'':' apportés au magasin');}
  if(o.kind==='sirop')return `${N} L de sirop`+(short?'':' vendus au magasin');
  return '';
}
function fmtLeft(s){s=Math.max(0,Math.round(s));const m=Math.floor(s/60);return m>=1?`${m} min`:`${s} s`;}

// L'hôte crée une commande au hasard, de taille raisonnable
function newOrder(){
  const r=Math.random();let o;
  if(r<0.34){const n=4+Math.floor(Math.random()*5),sp=Math.random()<0.75?ORD_SP[Math.floor(Math.random()*4)]:null;o={kind:'sciage',sp,n,reward:n*30+150,who:'La scierie',left:900+n*60};}
  else if(r<0.58){const n=8+2*Math.floor(Math.random()*5);o={kind:'fendu',n,reward:n*8+100,who:'Un voisin',left:840+n*30};}
  else if(r<0.86){const n=2+Math.floor(Math.random()*3),sp=Math.random()<0.6?['perchaude','truite','dore','achigan'][Math.floor(Math.random()*4)]:null,cooked=Math.random()<0.5;
    o={kind:'poisson',sp,cooked,n,reward:Math.round(n*(sp==='dore'?45:30)*(cooked?1.6:1)),who:'Le restaurant du village',left:900+n*120};}
  else{const n=10+5*Math.floor(Math.random()*4);o={kind:'sirop',n,reward:n*6+100,who:'Le dépanneur',left:1200};}
  o.id=uid();o.done=false;o.expired=false;
  S.order=o;S.ordGot=0;
  announceOrder(o);
}
function announceOrder(o){
  sfxBell();
  toast(`📋 Nouvelle commande — ${o.who} : ${orderText(o,true)} (prime ${o.reward} $)`);
  renderOrder();
}
// Avancement : appelé là où on vend ou livre
function orderProgress(kind,n,info){
  const o=S.order;if(!o||o.done||o.expired||o.kind!==kind)return;
  if(kind==='sciage'&&o.sp&&info&&info.sp!==o.sp)return;
  S.ordGot=Math.min(o.n,S.ordGot+n);renderOrder();
  if(S.ordGot>=o.n)toast(`📋 Commande complète ! La prime de ${o.reward} $ s'en vient`);
}
let ordTick=0;
function updateOrders(dt){
  const o=S.order;
  if(leadsWorld()){
    if(!o){S.ordNext-=dt;if(S.ordNext<=0)newOrder();}
    else if(!o.done&&!o.expired){
      o.left-=dt;
      if(S.ordGot>=o.n){o.done=true;S.money+=o.reward;J.order(o.who,o.reward);sfxCash();toast(`🎉 Commande remplie — ${o.who} : +${o.reward} $`);o.left=6;}
      else if(o.left<=0){o.expired=true;o.left=6;toast(`⌛ La commande de ${o.who.toLowerCase()} a expiré`);}
    }else{o.left-=dt;if(o.left<=0){S.order=null;S.ordGot=0;S.ordNext=360+Math.random()*480;}}
  }else if(o&&!o.done&&!o.expired)o.left=Math.max(0,o.left-dt);
  ordTick-=dt;if(ordTick<=0){ordTick=1;renderOrder();}
}
// Côté client : quand l'hôte change l'état, on prévient
function orderChanged(prev,o){
  if(o&&(!prev||prev.id!==o.id)&&!o.done&&!o.expired)announceOrder(o);
  else if(o&&prev&&prev.id===o.id){if(o.done&&!prev.done){sfxCash();toast(`🎉 Commande remplie — ${o.who} : +${o.reward} $`);}if(o.expired&&!prev.expired)toast(`⌛ La commande de ${o.who.toLowerCase()} a expiré`);}
  renderOrder();
}

/* ----- Affichage : petit panneau sous l'argent ----- */
function renderOrder(){
  const el=$('order'),o=S.order;
  if(!o){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  const st=o.done?'✅ remplie !':o.expired?'⌛ expirée':`${Math.min(S.ordGot,o.n)}/${o.n} · ${fmtLeft(o.left)}`;
  const txt=`📋 ${o.who} : ${orderText(o,true)} — ${st}`;
  if(el.textContent!==txt)el.textContent=txt;
}
$('order').addEventListener('click',()=>{const o=S.order;if(o)toast(`${o.who} veut ${orderText(o)}. Prime : ${o.reward} $ · il reste ${fmtLeft(o.left)}`);});

/* ----- Livrer du poisson au magasin ----- */
function orderFishMatch(s){const o=S.order;if(!o||o.kind!=='poisson'||!s)return false;const d=itemDef(s.id);
  if(o.cooked?d.kind!=='cooked':d.kind!=='fish')return false;return !o.sp||d.fish===o.sp;}
function deliverFish(){
  const o=S.order;if(!o||o.done||o.expired)return 0;let need=o.n-S.ordGot,given=0,pay=0;
  for(let i=0;i<INV_N&&need>0;i++){const s=INV[i];if(!orderFishMatch(s))continue;
    const d=itemDef(s.id),k=Math.min(need,s.n);const ws=(s.w||[]).slice(0,k);
    pay+=ws.reduce((a,w)=>a+fishValue(d.fish,w,d.kind==='cooked'),0);invTake(i,k);need-=k;given+=k;}
  if(given){S.money+=pay;orderProgress('poisson',given);toast(`📋 ${given} livré${given>1?'s':''} (+${pay} $)`);sfxCash();}
  return given;
}
function orderFishAvail(){return INV.reduce((a,s)=>a+(orderFishMatch(s)?s.n:0),0);}
