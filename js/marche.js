/* Marché : prix du bois et du sirop qui varient, tableau des prix à la porte de la scierie */
const FIREWOOD_FT=2;          // $ par pied de bois de chauffage (prix de base)
const SYRUP_L=30;             // $ par litre de sirop (prix de base)
const MKT_PERIOD=300;         // les prix changent toutes les 5 minutes
const MKT_KEYS=['erable','bouleau','epinette','sapin','chauffage','sirop'];
S.mkt={};S.mktPrev={};
MKT_KEYS.forEach(k=>{S.mkt[k]=1;S.mktPrev[k]=1;});
S.mktNext=MKT_PERIOD;
function mkt(k){return S.mkt[k]||1;}
function syrupPrice(){return Math.round(SYRUP_L*mkt('sirop'));}
function updateMarket(dt){
  S.mktNext-=dt;
  if(NET.on&&!NET.host){S.mktNext=Math.max(1,S.mktNext);return;}   // en ligne, c'est l'hôte qui change les prix
  if(S.mktNext>0)return;
  S.mktNext=MKT_PERIOD;
  MKT_KEYS.forEach(k=>{S.mktPrev[k]=S.mkt[k];S.mkt[k]=clamp(S.mkt[k]*(1+(Math.random()-0.5)*0.24),0.7,1.35);});
  toast('📈 Les prix du bois ont changé');
  if(!$('board').classList.contains('hidden'))renderBoard();
}

/* Prix affichés à la porte de la scierie */
function nearSign(){return Math.hypot(P.x-MILL_DOOR.x,P.z-MILL_DOOR.z)<2;}
function trend(k){const a=S.mkt[k],b=S.mktPrev[k];return a>b*1.01?'<span class="up">▲</span>':a<b*0.99?'<span class="down">▼</span>':'<span class="flat">■</span>';}
function renderBoard(){
  const m=Math.floor(S.mktNext/60),sec=Math.floor(S.mktNext%60);
  $('boardSub').textContent=`Prochain changement de prix dans ${m} min ${String(sec).padStart(2,'0')} s`;
  let rows='';
  ['erable','bouleau','epinette','sapin'].forEach(k=>{
    const p8=Math.round(SPECIES[k].p*mkt(k));
    rows+=`<tr><td>${SPECIES[k].n}</td><td class="num">${p8} $</td><td class="num">${(p8/8).toFixed(2).replace('.',',')} $</td><td>${trend(k)}</td></tr>`;
  });
  $('boardList').innerHTML=`<table><tr><th>Billot de sciage</th><th class="num">8 pi</th><th class="num">Le pied</th><th></th></tr>${rows}
    <tr><td>Bois de chauffage</td><td></td><td class="num">${(FIREWOOD_FT*mkt('chauffage')).toFixed(2).replace('.',',')} $</td><td>${trend('chauffage')}</td></tr>
    <tr><td>Bois de chauffage fendu</td><td></td><td class="num">${(FIREWOOD_FT*SPLIT_BONUS*mkt('chauffage')).toFixed(2).replace('.',',')} $</td><td>${trend('chauffage')}</td></tr>
    <tr><td>Sirop d'érable (magasin)</td><td class="num">${syrupPrice()} $ / L</td><td></td><td>${trend('sirop')}</td></tr></table>
    <p>Billot de sciage : 7 pi 10 po et plus, payé au pied (un 12 pi vaut 1,5 fois un 8 pi). Plus court : bois de chauffage.</p>`;
}
function openBoard(){renderBoard();$('board').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeBoard(){$('board').classList.add('hidden');}
$('boardClose').addEventListener('click',closeBoard);
