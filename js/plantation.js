/* Plantation : plants achetés au magasin, mis en terre n'importe où de libre, pousse en temps réel (3 à 5 h) */
const SEED_TYPES=['erable','epinette','sapin','bouleau'];
const SEED_PACK=5,SEED_PRICE={erable:40,epinette:30,sapin:25,bouleau:35};
const GROW_MIN=3*3600e3,GROW_MAX=5*3600e3;       // durée de pousse, en millisecondes
S.seeds={erable:0,epinette:0,sapin:0,bouleau:0};
S.seedSel='erable';
const PLANT_TOOL={id:'plants',name:'Plants',kind:'plant',delay:0.5};
const planted=[];

/* Petit plant tenu à la main */
{
  const g=new T.Group();
  box(0.03,0.3,0.03,mat(0x5b4330),0,-0.05,0.25,g);
  const c=new T.Mesh(new T.ConeGeometry(0.12,0.3,6),mat(0x3f6b3a));c.position.set(0,0.18,0.25);g.add(c);
  const pot=new T.Mesh(new T.CylinderGeometry(0.08,0.06,0.1,8),mat(0x9a5a32));pot.position.set(0,-0.2,0.25);g.add(pot);
  g.position.set(0,-0.68,0);g.visible=false;player.armR.add(g);player.plant=g;
}
function seedCount(){return SEED_TYPES.reduce((a,k)=>a+S.seeds[k],0);}
function seedName(k){return SPECIES[k].n.toLowerCase();}
function nextSeedType(){const i=SEED_TYPES.indexOf(S.seedSel);for(let k=1;k<=4;k++){const t=SEED_TYPES[(i+k)%4];if(S.seeds[t]>0)return t;}return S.seedSel;}

/* Un arbre planté : mêmes pièces que la forêt, mais son propre groupe qui grandit */
function addPlanted(o){
  const t={x:o.x,z:o.z,y:H(o.x,o.z),type:o.type,s:o.s,rot:o.rot,alive:true,work:o.work||0,base:Math.round(5+o.s*5),
           planted:true,plantedAt:o.plantedAt,growMs:o.growMs,grow:0};
  t.parts=makeTreeParts(t,Math.random);
  t.group=treeGroupFromParts(t.parts);t.group.position.set(t.x,t.y,t.z);scene.add(t.group);
  t.col=addCol(t.x,t.z,0.12);t.col.tree=t;
  planted.push(t);updateGrowth(t);return t;
}
function updateGrowth(t){
  const g=clamp((Date.now()-t.plantedAt)/t.growMs,0,1);t.grow=g;
  t.group.scale.setScalar(0.07+0.93*g);
  t.col.r=Math.max(0.12,0.32*t.s*g);
}
function plantSpot(){return {x:P.x+Math.sin(P.rot)*1.0,z:P.z+Math.cos(P.rot)*1.0};}
// Raison pour laquelle on ne peut pas planter ici, ou null si c'est correct
function plantProblem(x,z){
  if(S.seeds[S.seedSel]<=0)return `Plus de plants d'${seedName(S.seedSel)} : achètes-en au magasin`;
  if(Math.abs(x)>WORLD-3||Math.abs(z)>WORLD-3)return 'Trop près du bout de la terre';
  if(trailDist(x,z)<3)return 'Pas sur un chemin';
  if(Math.hypot(x-CAMP.x,z-CAMP.z)<CAMP.r)return 'Pas dans le camp';
  if(Math.hypot(x-VILLAGE.x,z-VILLAGE.z)<VILLAGE.r+3)return 'Pas au village';
  if(Math.hypot(x-YARD.x,z-YARD.z)<YARD.r+2||Math.hypot(x-SUGAR.x,z-SUGAR.z)<3||inSale(x,z))return 'Pas ici';
  if(stumpList.some(st=>Math.hypot(x-st.x,z-st.z)<1.5))return 'Trop près d\'une souche : essouche d\'abord';
  if(eachNear(x,z,c=>Math.hypot(x-c.x,z-c.z)<(c.tree?2.0:c.r+0.6)))return 'Trop près d\'un arbre ou d\'un obstacle';
  if(mudAt(x,z)>0.3)return 'Trop boueux';
  return null;
}
function plantHere(){
  const p=plantSpot();if(plantProblem(p.x,p.z))return;
  const type=S.seedSel;S.seeds[type]--;
  addPlanted({x:p.x,z:p.z,type,s:0.8+Math.random()*0.5,rot:Math.random()*6.28,plantedAt:Date.now(),growMs:GROW_MIN+Math.random()*(GROW_MAX-GROW_MIN)});
  toast(`🌱 ${SPECIES[type].n} planté (il t'en reste ${S.seeds[type]})`);
  if(S.seeds[type]<=0)S.seedSel=nextSeedType();
  if(seedCount()<=0){setTool(null);}
  renderHotbar();
}
function plantContext(){
  const p=plantSpot(),pb=plantProblem(p.x,p.z);
  const act=pb?null:{label:`Planter un ${seedName(S.seedSel)} (${S.seeds[S.seedSel]})`,fn:plantHere};
  const others=SEED_TYPES.filter(k=>k!==S.seedSel&&S.seeds[k]>0);
  const act2=others.length?{label:`Changer d'espèce (${SPECIES[nextSeedType()].n})`,fn:()=>{S.seedSel=nextSeedType();}}:null;
  return {act,act2,info:pb||'',spot:p,ok:!pb};
}
function fmtDur(ms){const m=Math.max(1,Math.round(ms/60000));return m>=60?`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`:`${m} min`;}
function saplingInfo(t){return `Jeune ${seedName(t.type)} : ${Math.floor(t.grow*100)} % · prêt dans ${fmtDur(t.plantedAt+t.growMs-Date.now())}`;}

/* Marqueur de l'endroit où l'on plante */
const plantMark=new T.Mesh(new T.RingGeometry(0.3,0.45,20),new T.MeshBasicMaterial({color:0x5fe07a,transparent:true,opacity:0.8,side:T.DoubleSide,depthTest:false}));
plantMark.rotation.x=-Math.PI/2;plantMark.renderOrder=15;plantMark.visible=false;scene.add(plantMark);
let growT=0;
function tickPlants(dt){growT-=dt;if(growT<=0){growT=1;planted.forEach(updateGrowth);}}
function updatePlantMark(c){
  plantMark.visible=!!(c&&c.plant);
  if(plantMark.visible){const p=c.plant.spot;plantMark.position.set(p.x,H(p.x,p.z)+0.06,p.z);plantMark.material.color.set(c.plant.ok?0x5fe07a:0xe05a4a);}
}
