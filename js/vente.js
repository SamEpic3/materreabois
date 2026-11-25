/* Vente de véhicules et de remorques, près du magasin général */
const SALE_L=[0,1];                 // dans la rue, devant le magasin général (repère du village)
const SALE=(()=>{const p=vpos(SALE_L[0],SALE_L[1]);return {x:p.x,z:p.z,r:5};})();
const BUY_PRICE={vtt:3000,pickup:6500,skid:15000,small:800,loader:4500,fendeuse:1800};
{
  groundRing(SALE.x,SALE.z,SALE.r-0.35,SALE.r,64,0x5fe07a,0.6);
  const g=new T.Group(),wood=mat(0x6e5236),pan=mat(0x2f6b3a);
  box(0.14,2.2,0.14,wood,0,1.1,0,g);box(1.6,0.7,0.08,pan,0,1.95,0,g);
  const sp=vpos(SALE_L[0]+SALE.r+0.6,SALE_L[1]);g.position.set(sp.x,H(sp.x,sp.z),sp.z);g.rotation.y=VROT;shadows(g);scene.add(g);addCol(sp.x,sp.z,0.3);
  label('Vente de véhicules',SALE.x,H(SALE.x,SALE.z)+3,SALE.z);
}
function inSale(x,z){return Math.hypot(x-SALE.x,z-SALE.z)<SALE.r;}
// Prix de revente : entre 25 % et 50 % du prix d'achat (donc 50 à 75 % moins cher), fixé une fois par objet.
function resale(o){
  if(o.resale===undefined){const base=BUY_PRICE[o.type||o.kind]||1000;o.resale=Math.round(base*(0.25+Math.random()*0.25)/10)*10;}
  return o.resale;
}
let pendingSale=null;
function confirmSale(key,msg,fn){
  if(pendingSale&&pendingSale.key===key&&S.time-pendingSale.t<3){pendingSale=null;fn();return;}
  pendingSale={key,t:S.time};toast(`${msg} — appuie encore pour confirmer`);
}
function sellTrailer(t){
  if(t.c.load.length||t.c.pails.length){toast('Vide la remorque avant de la vendre');return;}
  const v=resale(t);
  scene.remove(t.mesh.g);scene.remove(t.mark);trailers.splice(trailers.indexOf(t),1);
  if(P.crTr===t&&S.mode==='crane')S.mode='foot';
  S.money+=v;J.sell('une '+t.spec.name,v);toast(`${t.spec.label} vendue : +${v} $`);
}
function sellVehicle(v){
  if(v.drag)skidRelease(v);
  const tw=towed(v);if(tw)tw.hitch=null;
  if(S.mode==='vtt'&&V===v){doEnter();if(S.mode==='vtt')return;}
  if(v.bed&&(v.bed.load.length||v.bed.pails.length)){toast('Vide la boîte avant de vendre le pick-up');return;}
  const val=resale(v);
  scene.remove(v.mesh.g);vehicles.splice(vehicles.indexOf(v),1);
  if(V===v)V=vehicles[vehicles.length-1]||null;
  S.money+=val;J.sell((v.type==='vtt'?'un ':'une ')+v.spec.name.replace('Pick-up','pick-up'),val);toast(`${v.spec.name} vendu : +${val} $`);
}
function driveSaleContext(){
  if(!inSale(V.x,V.z)||Math.abs(V.v)>0.8||V.drag)return null;
  const tw=towed(V);
  const sellV={label:`Vendre le ${V.spec.name} (+${resale(V)} $)`,fn:()=>confirmSale('v'+vehicles.indexOf(V),`Vendre le ${V.spec.name} pour ${resale(V)} $ ?`,()=>sellVehicle(V))};
  if(V.bed&&(V.bed.load.length||V.bed.pails.length))return {info:'Vide la boîte avant de vendre le pick-up'};
  if(tw&&inSale(tw.x,tw.z)){
    if(tw.c.load.length||tw.c.pails.length)return {act2:sellV,info:'Vide la remorque pour pouvoir la vendre'};
    return {act:{label:`Vendre la ${tw.spec.name} (+${resale(tw)} $)`,fn:()=>confirmSale('t'+trailers.indexOf(tw),`Vendre la ${tw.spec.name} pour ${resale(tw)} $ ?`,()=>{tw.hitch=null;sellTrailer(tw);})},act2:sellV};
  }
  return {act:sellV,info:`Prix de revente : ${resale(V)} $ (prix neuf : ${BUY_PRICE[V.type]} $)`};
}
function footSaleContext(){
  if(!inSale(P.x,P.z))return null;
  let b=null,bd=3;
  trailers.forEach(t=>{if(t.hitch||!inSale(t.x,t.z))return;const d=Math.hypot(P.x-t.x,P.z-t.z);if(d<bd){bd=d;b=t;}});
  if(!b)return null;
  if(b.c.load.length||b.c.pails.length)return {info:'Vide la remorque pour pouvoir la vendre'};
  return {act:{label:`Vendre la ${b.spec.name} (+${resale(b)} $)`,fn:()=>confirmSale('t'+trailers.indexOf(b),`Vendre la ${b.spec.name} pour ${resale(b)} $ ?`,()=>sellTrailer(b))}};
}
