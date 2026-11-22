/* Marché : prix du bois et du sirop qui varient, affiche du tableau des prix à la cour à bois */
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
  if(S.mktNext>0)return;
  S.mktNext=MKT_PERIOD;
  MKT_KEYS.forEach(k=>{S.mktPrev[k]=S.mkt[k];S.mkt[k]=clamp(S.mkt[k]*(1+(Math.random()-0.5)*0.24),0.7,1.35);});
  toast('📈 Les prix du bois ont changé');
  if(!$('board').classList.contains('hidden'))renderBoard();
}

/* Affiche à la cour à bois */
const SIGN={x:3.6,z:9.2};
{
  const g=new T.Group(),wood=mat(0x6e5236),board=mat(0x2f4a35),paper=new T.MeshBasicMaterial({color:0xf1e6c8});
  box(0.14,2.1,0.14,wood,-0.85,1.05,0,g);box(0.14,2.1,0.14,wood,0.85,1.05,0,g);
  box(2.0,1.1,0.1,board,0,1.7,0,g);
  box(0.5,0.6,0.02,paper,-0.55,1.7,0.06,g);box(0.5,0.6,0.02,paper,0,1.7,0.06,g);box(0.5,0.6,0.02,paper,0.55,1.7,0.06,g);
  g.position.set(SIGN.x,H(SIGN.x,SIGN.z),SIGN.z);g.rotation.y=Math.atan2(YARD.x-SIGN.x,YARD.z-SIGN.z)+Math.PI;
  shadows(g);scene.add(g);addCol(SIGN.x,SIGN.z,0.5);
  label('Prix du bois',SIGN.x,H(SIGN.x,SIGN.z)+3.1,SIGN.z);
}
function nearSign(){return Math.hypot(P.x-SIGN.x,P.z-SIGN.z)<2.6;}
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
    <tr><td>Sirop d'érable (magasin)</td><td class="num">${syrupPrice()} $ / L</td><td></td><td>${trend('sirop')}</td></tr></table>
    <p>Billot de sciage : 7 pi 10 po et plus, payé au pied (un 12 pi vaut 1,5 fois un 8 pi). Plus court : bois de chauffage.</p>`;
}
function openBoard(){renderBoard();$('board').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeBoard(){$('board').classList.add('hidden');}
$('boardClose').addEventListener('click',closeBoard);
