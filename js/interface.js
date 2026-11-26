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
