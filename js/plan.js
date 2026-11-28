/* Plan du territoire (le « cadastre ») : tout ce qui décide OÙ sont les choses est ici.
   Repère : x vers l'est, z vers le sud (le nord est en haut de la carte, z négatif). Unités : mètres.
   Pour ajouter une terre ou un lieu plus tard, on ajoute une entrée ici; le reste du jeu s'en sert. */

// Tout le territoire
const WB={x0:-200,x1:200,z0:-265,z1:265};

// Ta terre au centre, le camp au fond du rang
const MAIN_LAND={x0:-80,x1:80,z0:-115,z1:125};
const CAMP={x:0,z:-35,r:14};
const CAMP_FLAT=24;                                   // rayon aplani autour du camp

// Le village au sud, le long de la route asphaltée; sa rue monte vers le camp (repère local : lz vers le camp)
const VILLAGE={x:0,z:212,r:13};
const ROUTE_Z=250;                                    // route asphaltée est-ouest, au sud du village

// Terres à vendre (mêmes clés qu'avant : la sauvegarde des achats suit)
const LANDS={
  erab:{name:'Érablière de l\'Ouest',short:'l\'érablière',price:30000,x0:-200,x1:-80,z0:-115,z1:125,desc:'Une belle érablière, presque juste des érables à sucre.'},
  coupe:{name:'Terre à bois de l\'Est',short:'la terre de l\'Est',price:40000,x0:80,x1:200,z0:-115,z1:125,desc:'Des épinettes et des sapins bien gros, parfaits pour le bois de sciage.'}
};

// Territoire public au nord : le lac, la rivière qui l'alimente (avec une chute) et la montagne
const LAKE={x:90,z:-182,rx:32,rz:24};
const HILL={x:-118,z:-202,r:105,h:40};          // le mont du Loup : pente douce et irrégulière, belvédère au sommet
const RIVER=[[150,-268],[146,-246],[138,-226],[126,-210],[112,-198]];   // du nord vers le lac
const RIVER_FALL={s:0.38,h:2.2};                      // la chute : à 38 % du parcours, la rivière descend de 2,2 m

// Lots réservés pour plus tard (aplanis, sans arbres; rien dessus pour l'instant)
const RESERVED=[
  {id:'moulin',name:'Site du moulin',x0:150,x1:175,z0:-245,z1:-222,note:'à côté de la chute (électricité)'},
  {id:'sudouest',name:'Terre du Sud-Ouest',x0:-200,x1:-80,z0:125,z1:190,land:true,note:'future terre à vendre'},
  {id:'sudest',name:'Terre du Sud-Est',x0:80,x1:200,z0:125,z1:190,land:true,note:'future terre à vendre'},
  {id:'village2',name:'Terrain du village',x0:40,x1:80,z0:185,z1:230,note:'futurs bâtiments'}
];

// Chemins : 'route' (asphalte), 'rang' (gravier, large), 'sentier' (terre, étroit). w = largeur en m.
const DOCK_X=44;                                      // le bout du sentier du lac (le quai est juste à côté)
const PATHS=[
  {id:'route',kind:'route',w:8,pts:[[-200,ROUTE_Z+3],[-130,ROUTE_Z-1],[-60,ROUTE_Z+1],[0,ROUTE_Z],[60,ROUTE_Z-1],[130,ROUTE_Z+2],[200,ROUTE_Z-2]]},
  {id:'rue',kind:'route',w:7,pts:[[0,ROUTE_Z],[0,175]]},                                   // la rue du village (son asphalte est dessiné avec le village)
  {id:'rang',kind:'rang',w:6,pts:[[0,171],[0,162],[4,148],[8,126],[5,98],[-5,70],[-6,42],[1,14],[2,-12],[3,-21]]},   // le rang, du village au camp
  {id:'ouest',kind:'sentier',w:3,pts:[[-22,-35],[-45,-29],[-70,-22],[-96,-15],[-126,-6],[-155,5],[-182,19]]},
  {id:'est',kind:'sentier',w:3,pts:[[22,-38],[46,-46],[70,-50],[96,-44],[126,-35],[152,-22],[180,-6]]},
  {id:'nord',kind:'sentier',w:3,pts:[[0,-59],[-3,-86],[4,-112],[10,-132]]},
  {id:'lac',kind:'sentier',w:3,pts:[[10,-132],[26,-148],[38,-164],[DOCK_X,-178]]},
  {id:'tourlac',kind:'sentier',w:3,pts:(()=>{const a=[];for(let k=0;k<=24;k++){const an=(-12+k*12)*Math.PI/180;a.push([LAKE.x+Math.cos(an)*LAKE.rx*1.45,LAKE.z+Math.sin(an)*LAKE.rz*1.45]);}return a;})()},
  {id:'quai',kind:'sentier',w:3,pts:[[DOCK_X,-182],[60,-182]]},
  {id:'montagne',kind:'sentier',w:3,pts:[[10,-132],[-14,-146],[-40,-157]],climb:true}   // monde.js prolonge ce sentier jusqu'au sommet (lacets à pente douce)
];

function inRect(x,z,r){return x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;}
// À qui est ce point : 'main' (ta terre), une clé de LANDS, un lot réservé, 'village' ou 'pub' (public)
function landAt(x,z){
  if(inRect(x,z,MAIN_LAND))return 'main';
  for(const k in LANDS)if(inRect(x,z,LANDS[k]))return k;
  for(const r of RESERVED)if(r.land&&inRect(x,z,r))return r.id;
  if(z>MAIN_LAND.z1+40)return 'village';
  return 'pub';
}
function reservedAt(x,z,m){m=m||0;for(const r of RESERVED)if(!r.land&&x>=r.x0-m&&x<=r.x1+m&&z>=r.z0-m&&z<=r.z1+m)return r;return null;}
