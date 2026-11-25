/* État de la partie : argent, joueur, outils, catalogue du magasin, véhicules de départ */
/* ---------- État ---------- */
const S={mode:'foot',money:35000,delivered:0,time:0};
const P={x:1,z:4,rot:Math.PI*0.75,phase:0,target:null,carry:null,swing:0,struck:false,cool:0,chopTree:null,crTr:null};
const TOOLS=[
  {id:'hachette',name:'Vieille hachette',kind:'axe',delay:1.5,fell:1,cut:4,price:0,desc:'Celle de grand-papa. Elle fait la job, lentement.'},
  {id:'hache',name:'Hache de bûcheron',kind:'axe',delay:1.3,fell:0.7,cut:3,price:150,desc:'Plus lourde et bien affûtée : moins de coups par arbre.'},
  {id:'sciotte',name:'Sciotte',kind:'saw',delay:1.1,fell:0.85,cut:2,price:300,desc:'Scie à archet. Correcte pour abattre, excellente pour tronçonner.'},
  {id:'scie-usagee',name:'Scie à chaîne usagée',kind:'chainsaw',delay:0.8,fell:0.35,cut:1,price:900,desc:'Elle a du vécu, mais elle part au 3e coup.'},
  {id:'scie-pro',name:'Scie à chaîne pro',kind:'chainsaw',delay:0.55,fell:0.25,cut:1,price:2200,desc:'Puissante et légère. Le rêve de tout bûcheron.'}
  ,{id:'canne',name:'Canne à pêche',kind:'rod',delay:0.6,fell:null,cut:null,price:120,desc:'Une canne avec moulinet et flotteur. Lance au lac, attends que ça morde et ferre au bon moment !'}
  ,{id:'pelle',name:'Pelle',kind:'shovel',delay:1.2,fell:null,cut:null,price:60,desc:'Pour creuser autour des souches et les arracher : le terrain est ensuite dégagé.'}
  ,{id:'carabine',name:'Carabine de chasse',kind:'rifle',hunt:true,delay:1.4,fell:null,cut:null,price:650,desc:'Une .308 avec lunette. Porte loin (≈ 130 m). Il faut des balles.'}
  ,{id:'arc',name:'Arc à poulies',kind:'bow',hunt:true,delay:1.1,fell:null,cut:null,price:350,desc:'Silencieux : les bêtes se sauvent moins loin. Il faut s\'approcher (≈ 35 m). Il faut des flèches.'}
  ,{id:'couteau',name:'Couteau de chasse',kind:'knife',hunt:true,delay:0.5,fell:null,cut:null,price:40,desc:'Pour dépecer le gibier. Il suffit de l\'avoir dans l\'inventaire.'}
];
const VEH_SHOP=[
  {id:'vtt',kind:'veh',name:'VTT',price:3000,desc:'Petit, agile et passe partout dans le bois. Tire la petite remorque.'},
  {id:'small',kind:'trailer',name:'Petite remorque',price:800,desc:'Remorque de 6 billots de 8 pi, à charger à la main.'},
  {id:'pickup',kind:'veh',name:'Pick-up 4x4',price:6500,desc:'Rapide sur le chemin, une boîte de 8 billots et un attelage pour les remorques. Moins agile dans le bois et la boue.'},
  {id:'loader',kind:'trailer',name:'Remorque chargeuse',price:4500,desc:'Remorque de 12 pi avec poteaux et grue intégrée : 10 billots, jusqu\'à 12 pi de long. Approche-toi de la grue et appuie sur E.'},
  {id:'skid',kind:'veh',name:'Débusqueuse',price:15000,desc:'Tracteur forestier articulé avec pince arrière : agrippe le bout d\'une tige et traîne-la hors du bois. À l\'aise dans la boue.'}
,
  {id:'chaloupe',kind:'trailer',name:'Chaloupe et rames (sur remorque)',price:2500,desc:'Chaloupe de 12 pi en aluminium avec ses rames, sur sa remorque. Recule la remorque au bord du lac pour la mettre à l\'eau. Deux places : un rameur et un passager. On peut pêcher dedans.'}
];
const SOON=[];
let TOOL=TOOLS[0];
function toolVerb(){if(!TOOL)return '';if(TOOL.kind==='shovel')return 'Coup de pelle';return TOOL.kind==='axe'?(TOOL.id==='hachette'?'Coup de hachette':'Coup de hache'):TOOL.kind==='saw'?'Coup de sciotte':'Coup de scie';}
function fellTotal(t){return Math.max(1,Math.ceil(t.base*(TOOL?TOOL.fell:1)));}
let V=null;
// Le véhicule où l'on est (au volant ou passager)
function RV(){return S.mode==='vtt'?V:S.mode==='pass'?P.ride:null;}
function containers(){const a=trailers.filter(t=>t.c.cap>0).map(t=>t.c);vehicles.forEach(v=>{if(v.bed)a.push(v.bed);});return a;}
function nearestContainer(){let b=null,bd=1e9;for(const c of containers()){const p=c.center(),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<c.r&&d<bd){bd=d;b=c;}}return b;}
function containerAtYard(c){const p=c.center();return Math.hypot(p.x-YARD.x,p.z-YARD.z)<YARD.r+2.5;}

/* ---------- Orientation selon le terrain ---------- */
const _x=new T.Vector3(),_y=new T.Vector3(),_z=new T.Vector3(),_m=new T.Matrix4(),_q=new T.Quaternion();
function ground(x,z,th,hl,hw,out){
  const fx=Math.sin(th),fz=Math.cos(th),sx=Math.cos(th),sz=-Math.sin(th);
  const hF=H(x+fx*hl,z+fz*hl),hB=H(x-fx*hl,z-fz*hl),hS=H(x+sx*hw,z+sz*hw),hM=H(x-sx*hw,z-sz*hw);
  _z.set(fx,(hF-hB)/(2*hl),fz).normalize();
  _x.set(sx,(hS-hM)/(2*hw),sz).normalize();
  _y.crossVectors(_z,_x).normalize();
  _x.crossVectors(_y,_z).normalize();
  _m.makeBasis(_x,_y,_z);
  if(out)out.setFromRotationMatrix(_m);
  return {h:(hF+hB+hS+hM)/4,slope:(hF-hB)/(2*hl)};
}

V=makeVehicle('vtt',4,-4,Math.PI);
{const t=makeTrailerObj('small',0,0,Math.PI);t.x=V.x-Math.sin(V.th)*(V.spec.hitch+t.spec.tl);t.z=V.z-Math.cos(V.th)*(V.spec.hitch+t.spec.tl);t.hitch=V;}
