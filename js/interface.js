/* Interface « Forêt moderne » : rayons du magasin en onglets, articles en fiches */
const SHOP_TAB={store:null,dealer:null};
const TAB_NAMES={'Commande en cours':'Commande','Vendre tes poissons':'Poissons','Vendre ta viande':'Viande','Épicerie':'Épicerie',
  'Chasse et piégeage':'Chasse et pêche','Outils':'Outils','Érablière':'Érablière','Plantation':'Plantation',
  'Véhicules et remorques':'Véhicules','Constructions à placer':'Constructions','Améliorations de la cabane':'Cabane'};
const _renderShopTabs=renderShop;
renderShop=function(){
  const L=$('shopList'),keepScroll=L.parentElement.scrollTop;
  _renderShopTabs();
  // Regroupe les articles par rayon
  const groups=[];let cur=null;
  [...L.children].forEach(el=>{
    if(el.classList.contains('shopSec')){cur={name:el.textContent,els:[]};groups.push(cur);el.remove();return;}
    if(!cur){cur={name:SHOP_MODE==='store'?'Épicerie':'Articles',els:[]};groups.push(cur);}
    // L'article « Épicerie » ajouté à la fin du magasin a son propre onglet
    if(/Épicerie/.test(el.textContent)&&SHOP_MODE==='store'&&cur.name!=='Épicerie'){cur={name:'Épicerie',els:[]};groups.push(cur);}
    cur.els.push(el);el.remove();
  });
  let tab=SHOP_TAB[SHOP_MODE];if(!groups.some(g=>g.name===tab))tab=SHOP_TAB[SHOP_MODE]=groups.length?groups[0].name:null;
  const bar=document.createElement('div');bar.className='shopTabs';
  groups.forEach(g=>{const b=document.createElement('button');b.className='shopTab'+(g.name===tab?' on':'');b.textContent=TAB_NAMES[g.name]||g.name;
    if(g.name==='Commande en cours')b.classList.add('alert');
    b.onclick=()=>{SHOP_TAB[SHOP_MODE]=g.name;renderShop();L.parentElement.scrollTop=0;};bar.appendChild(b);});
  L.appendChild(bar);
  const grid=document.createElement('div');grid.className='shopGrid';
  const g=groups.find(g=>g.name===tab);if(g)g.els.forEach(el=>grid.appendChild(el));
  L.appendChild(grid);
  $('shopMoney').textContent=S.money.toLocaleString('fr-CA')+' $';
  $('shopTitle').textContent=SHOP_MODE==='dealer'?'Équipement forestier · Chasse et pêche':'Magasin général';
  L.parentElement.scrollTop=keepScroll;
};

/* ---- Animations ---- */
// L'argent défile jusqu'à sa nouvelle valeur, avec un « +120 $ » qui s'envole (vert) ou « −45 $ » (rouge)
const MONEY={shown:null,from:0,to:0,t0:0,raf:0};
const fmt$=v=>Math.round(v).toLocaleString('fr-CA')+' $';
function moneyTo(v){
  const el=$('sMoney');
  if(MONEY.shown===null){MONEY.shown=MONEY.to=v;el.textContent=fmt$(v);return;}
  if(v===MONEY.to)return;
  const d=v-MONEY.to;MONEY.from=MONEY.shown;MONEY.to=v;MONEY.t0=performance.now();
  const dur=Math.min(1100,350+Math.abs(d)*0.6);
  cancelAnimationFrame(MONEY.raf);
  const step=now=>{const k=Math.min(1,(now-MONEY.t0)/dur),e=1-Math.pow(1-k,3);MONEY.shown=MONEY.from+(MONEY.to-MONEY.from)*e;el.textContent=fmt$(MONEY.shown);if(k<1)MONEY.raf=requestAnimationFrame(step);};
  MONEY.raf=requestAnimationFrame(step);
  const st=$('stats');st.classList.remove('gain','loss');void st.offsetWidth;st.classList.add(d>0?'gain':'loss');
  const f=document.createElement('div');f.className='moneyFly '+(d>0?'gain':'loss');f.textContent=(d>0?'+':'−')+fmt$(Math.abs(d));
  // Position dans la vue (le jeu peut être tourné de 90° sur iPhone)
  const sr=st.getBoundingClientRect(),r=el.getBoundingClientRect(),p=toView(r.left+r.width/2,r.top+r.height/2);
  const vb=(()=>{const q=[[sr.left,sr.top],[sr.right,sr.bottom]].map(([x,y])=>toView(x,y));return Math.max(q[0].y,q[1].y);})();
  f.style.left=p.x+'px';f.style.top=(vb+4)+'px';
  $('app').appendChild(f);f.addEventListener('animationend',()=>f.remove());setTimeout(()=>f.remove(),4000);
}
// Un petit rebond quand on change d'outil
{const _sel=selectSlot;selectSlot=function(i){const was=S.hot;_sel.apply(this,arguments);if(S.hot!==was){const s=document.querySelectorAll('#hotbar .slot')[S.hot];if(s){s.classList.remove('pop');void s.offsetWidth;s.classList.add('pop');}
  const n=$('toolName');n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop');}};}
