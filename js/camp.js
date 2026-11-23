/* Projets du camp : feu de camp, abri à bois, galerie et chaises berçantes, poêle à bois, agrandissement de la cabane */
S.camp={};                       // projets construits : {feu:true, abri:true, ...}
S.shed=[];                       // bûches cordées dans l'abri
const campFire={fuel:0},stove={fuel:0};
const CAMPFIRE_MAX=900,STOVE_MAX=1800,SHED_CAP=30;
const PROJ_BOARD={x:-2.4,z:4.2};
const CAMPFIRE={x:-3.5,z:-6.5};
const SHED={x:-13.6,z:-3.2};
const STOVE_DOOR={x:CABIN.x+1.2,z:CABIN.z+3.3};
const seats=[];                  // {x,z,rot,y,grp,kind}
const PROJECTS=[
  {id:'feu',name:'Feu de camp',price:250,icon:'🔥',desc:'Un rond de pierres et trois bûches pour s\'asseoir. On y fait brûler du bois de chauffage.'},
  {id:'abri',name:'Abri à bois',price:700,icon:'🪵',desc:`Pour corder tes réserves de bois de chauffage (${SHED_CAP} bûches) et les reprendre au besoin.`},
  {id:'galerie',name:'Galerie et chaises berçantes',price:1200,icon:'🪑',desc:'Une grande galerie couverte devant la cabane, avec deux chaises berçantes où s\'asseoir.'},
  {id:'poele',name:'Poêle à bois',price:900,icon:'♨️',desc:'Un poêle dans la cabane : on l\'alimente à la porte, la cheminée fume et les fenêtres s\'allument.'},
  {id:'agrandir',name:'Agrandir la cabane',price:3000,icon:'🏠',desc:'Une nouvelle pièce sur le côté de la cabane, avec une grande fenêtre.'}
];

/* Tableau des projets, près de la cabane */
{
  const g=new T.Group(),wood=mat(0x6e5236),board=mat(0x5a3d26),paper=new T.MeshBasicMaterial({color:0xf1e6c8});
  box(0.12,1.6,0.12,wood,-0.6,0.8,0,g);box(0.12,1.6,0.12,wood,0.6,0.8,0,g);
  box(1.5,0.9,0.08,board,0,1.35,0,g);box(1.2,0.6,0.02,paper,0,1.35,0.05,g);
  g.position.set(PROJ_BOARD.x,H(PROJ_BOARD.x,PROJ_BOARD.z),PROJ_BOARD.z);g.rotation.y=0.5;shadows(g);scene.add(g);addCol(PROJ_BOARD.x,PROJ_BOARD.z,0.45);
  label('Projets du camp',PROJ_BOARD.x,H(PROJ_BOARD.x,PROJ_BOARD.z)+2.6,PROJ_BOARD.z);
}
function nearProjBoard(){return Math.hypot(P.x-PROJ_BOARD.x,P.z-PROJ_BOARD.z)<2.4;}

/* ----- Constructions ----- */
const camp3d={};
function flameGroup(){
  const fl=new T.Group(),fm=[0xff7a1a,0xffb02e,0xffd35a];
  for(let i=0;i<5;i++){const c=new T.Mesh(new T.ConeGeometry(0.16+0.05*(i%2),0.6,6),new T.MeshBasicMaterial({color:fm[i%3]}));c.position.set((i-2)*0.13,0.35,(i%2?0.12:-0.1));fl.add(c);}
  fl.visible=false;return fl;
}
function addSeat(x,z,rot,y,grp,kind){seats.push({x,z,rot,y,grp,kind});}
function buildFeu(){
  const g=new T.Group(),stone=mat(0x8a8780),wood=mat(0x6e5236),bark=mat(0x5e4630);
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2,s=new T.Mesh(new T.DodecahedronGeometry(0.2,0),stone);s.position.set(Math.cos(a)*0.75,0.1,Math.sin(a)*0.75);s.rotation.set(i,i*2,0);g.add(s);}
  [0.6,-0.6,2].forEach(r=>{const l=box(0.8,0.14,0.14,wood,0,0.1,0,g);l.rotation.y=r;});
  const fl=flameGroup();g.add(fl);
  const light=new T.PointLight(0xff9a3c,0,16,2);light.position.set(0,0.8,0);g.add(light);
  const y0=H(CAMPFIRE.x,CAMPFIRE.z);g.position.set(CAMPFIRE.x,y0,CAMPFIRE.z);shadows(g);scene.add(g);
  addCol(CAMPFIRE.x,CAMPFIRE.z,0.9);
  [0.4,2.5,4.6].forEach(a=>{                       // trois bûches pour s'asseoir
    const bx=CAMPFIRE.x+Math.cos(a)*2.3,bz=CAMPFIRE.z+Math.sin(a)*2.3;
    const b=new T.Group(),log=new T.Mesh(new T.CylinderGeometry(0.22,0.24,1.5,10),[bark,endM,endM]);log.rotation.z=Math.PI/2;log.position.y=0.22;b.add(log);
    b.position.set(bx,H(bx,bz),bz);b.rotation.y=-a;shadows(b);scene.add(b);
    addCol(bx,bz,0.35);
    addSeat(bx,bz,Math.atan2(CAMPFIRE.x-bx,CAMPFIRE.z-bz),0.45,null,'banc');
  });
  label('Feu de camp',CAMPFIRE.x,y0+2.3,CAMPFIRE.z);
  camp3d.feu={fl,light};
}
const shedFront=()=>{const a=Math.atan2(-SHED.x,-SHED.z);return {x:SHED.x+Math.sin(a)*1.5,z:SHED.z+Math.cos(a)*1.5};};
function buildAbri(){
  const g=new T.Group(),wood=mat(0x7a5232),dark=mat(0x4d3220),roof=mat(0x3f4a3a);
  box(3.2,0.12,1.6,dark,0,0.06,0,g);
  box(3.2,1.9,0.1,wood,0,0.95,-0.75,g);box(0.1,1.9,1.6,wood,-1.6,0.95,0,g);box(0.1,1.9,1.6,wood,1.6,0.95,0,g);
  [-1.55,1.55].forEach(x=>box(0.12,2.2,0.12,dark,x,1.1,0.75,g));
  const r=box(3.6,0.12,2.1,roof,0,2.15,0,g);r.rotation.x=0.18;
  const stack=new T.Group();stack.position.set(0,0.12,-0.05);g.add(stack);
  const y0=H(SHED.x,SHED.z);g.position.set(SHED.x,y0,SHED.z);g.rotation.y=Math.atan2(-SHED.x,-SHED.z);shadows(g);scene.add(g);
  const bk=Math.atan2(-SHED.x,-SHED.z);[-1,0,1].forEach(o=>addCol(SHED.x+Math.cos(bk)*o*1.05-Math.sin(bk)*0.35,SHED.z-Math.sin(bk)*o*1.05-Math.cos(bk)*0.35,0.6));
  label('Abri à bois',SHED.x,y0+3,SHED.z);
  camp3d.abri={stack};refreshShed();
}
function refreshShed(){
  if(!camp3d.abri)return;
  const st=camp3d.abri.stack;while(st.children.length)st.remove(st.children[0]);
  S.shed.forEach((c,i)=>{const layer=Math.floor(i/5),slot=i%5;const m=makePieceMesh(c);m.rotation.y=Math.PI/2;m.position.set((layer%2)*0.12-0.06,0.15+layer*0.3,(slot-2)*0.26);st.add(m);});
}
function makeRocker(){
  const g=new T.Group(),w=mat(0x8a5a32),dk=mat(0x5a3a22);
  const rock=new T.Group();g.add(rock);
  box(0.55,0.06,0.5,w,0,0.42,0,rock);
  const back=box(0.55,0.7,0.06,w,0,0.8,-0.24,rock);back.rotation.x=-0.15;
  [-0.25,0.25].forEach(x=>{box(0.05,0.42,0.05,dk,x,0.21,0.18,rock);box(0.05,0.42,0.05,dk,x,0.21,-0.18,rock);box(0.05,0.05,0.5,dk,x,0.62,0,rock);
    const rk=box(0.04,0.05,0.9,dk,x,0.03,0,rock);});
  return {g,rock};
}
function buildGalerie(){
  const g=new T.Group(),deck=mat(0x8a6a44),post=mat(0x6e5236),roof=mat(0x5a2a22);
  box(7.2,0.18,2.6,deck,0,0.09,3.55,g);
  [-3.4,-1.1,1.1,3.4].forEach(x=>box(0.14,2.3,0.14,post,x,1.25,4.75,g));
  const r=box(7.4,0.12,2.8,roof,0,2.45,3.6,g);r.rotation.x=0.2;
  box(7.2,0.08,0.08,post,0,0.9,4.8,g);
  g.position.set(CABIN.x,CAMP_H,CABIN.z);shadows(g);scene.add(g);
  [-3.4,-1.1,1.1,3.4].forEach(x=>addCol(CABIN.x+x,CABIN.z+4.75,0.15));
  [-2.3,-0.9].forEach(x=>{
    const ch=makeRocker();ch.g.position.set(CABIN.x+x,CAMP_H+0.18,CABIN.z+3.7);shadows(ch.g);scene.add(ch.g);
    addSeat(CABIN.x+x,CABIN.z+3.7,0,0.36,ch.rock,'chaise');
  });
}
const cabinWinLit=0xffa64a,cabinWinOff=0x8fa3ad;
function buildPoele(){camp3d.poele=true;}
function buildAgrandir(){
  const g=new T.Group(),plank=mat(0x7a5232),roof=mat(0x5a2a22);
  box(3.6,2.4,4.2,plank,0,1.2,0,g);
  const r1=box(4.0,0.18,2.7,roof,0,2.9,1.0,g);r1.rotation.x=0.62;
  const r2=box(4.0,0.18,2.7,roof,0,2.9,-1.0,g);r2.rotation.x=-0.62;
  box(1.6,0.9,0.08,CABIN_WIN,0,1.4,2.12,g);
  g.position.set(CABIN.x-4.8,CAMP_H,CABIN.z);shadows(g);scene.add(g);
  [-1,1].forEach(b=>addCol(CABIN.x-4.8,CABIN.z+b*1.1,1.6));
}
const BUILD={feu:buildFeu,abri:buildAbri,galerie:buildGalerie,poele:buildPoele,agrandir:buildAgrandir};
function buildProject(id){if(S.camp[id]&&camp3d['_'+id])return;S.camp[id]=true;camp3d['_'+id]=true;BUILD[id]();}

/* ----- Panneau des projets ----- */
function renderProjects(){
  $('projMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('projList');L.innerHTML='';
  PROJECTS.forEach(p=>{
    const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div class="thumb emoji">${p.icon}</div><div class="txt"><b>${p.name}</b> — ${p.price} $<p>${p.desc}</p></div>`;
    const b=document.createElement('button');
    if(S.camp[p.id]){b.textContent='Construit';b.disabled=true;}
    else{b.textContent='Construire';b.disabled=S.money<p.price;b.onclick=()=>{if(S.money<p.price||S.camp[p.id])return;S.money-=p.price;buildProject(p.id);toast(`${p.icon} ${p.name} : c'est construit !`);renderProjects();};}
    d.appendChild(b);L.appendChild(d);
  });
}
function openProjects(){renderProjects();$('proj').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeProjects(){$('proj').classList.add('hidden');}
$('projClose').addEventListener('click',closeProjects);

/* ----- Interactions ----- */
function nearCampfire(){return S.camp.feu&&Math.hypot(P.x-CAMPFIRE.x,P.z-CAMPFIRE.z)<2.2;}
function nearShed(){if(!S.camp.abri)return false;const f=shedFront();return Math.hypot(P.x-f.x,P.z-f.z)<1.8;}
function nearStove(){return S.camp.poele&&Math.hypot(P.x-STOVE_DOOR.x,P.z-STOVE_DOOR.z)<1.8;}
function fmtFire(f){return f>0?`${Math.floor(f/60)} min ${String(Math.floor(f%60)).padStart(2,'0')} s`:'éteint';}
function feedFire(obj,max,what){const f=fuelOf(P.carry);obj.fuel=Math.min(max,obj.fuel+f);setCarry(null);toast(`🔥 ${what} : ${fmtFire(obj.fuel)}`);}
// Actions quand on porte une bûche (avant les autres)
function carryExtras(){
  const c=P.carry;
  if(nearCampfire())return {act:{label:`Mettre la bûche au feu de camp (+${fuelOf(c)} s)`,fn:()=>feedFire(campFire,CAMPFIRE_MAX,'Feu de camp')}};
  if(nearStove())return {act:{label:`Mettre la bûche dans le poêle (+${fuelOf(c)} s)`,fn:()=>feedFire(stove,STOVE_MAX,'Poêle')}};
  if(nearShed()){
    if(c.len>=SAW_MIN)return {info:'L\'abri est pour le bois de chauffage : garde les billots de sciage pour la vente'};
    if(S.shed.length>=SHED_CAP)return {info:'L\'abri à bois est plein'};
    return {act:{label:`Corder dans l'abri (${S.shed.length}/${SHED_CAP})`,fn:()=>{S.shed.push(c);setCarry(null);refreshShed();}}};
  }
  return null;
}
// Actions les mains libres, près des constructions
function campExtras(){
  if(nearProjBoard())return {act:{label:'Voir les projets du camp',fn:openProjects}};
  if(nearShed()&&S.shed.length)return {act:{label:`Prendre une bûche dans l'abri (${S.shed.length})`,fn:()=>{const c=S.shed.pop();refreshShed();setCarry(c);}}};
  if(nearCampfire())return {info:`Feu de camp : ${fmtFire(campFire.fuel)} · apporte du bois de chauffage`};
  if(nearStove())return {info:`Poêle à bois : ${fmtFire(stove.fuel)} · apporte une bûche`};
  return null;
}
function nearestSeat(){let b=null,bd=1.2;seats.forEach(s=>{const d=Math.hypot(P.x-s.x,P.z-s.z);if(d<bd){bd=d;b=s;}});return b?{seat:b,d:bd}:null;}
function sitDown(s){
  S.mode='sit';P.seat=s;P.target=null;marker.visible=false;P.swing=0;
  P.x=s.x;P.z=s.z;P.rot=s.rot;
  if(s.grp){s.grp.add(player.g);player.g.position.set(0,s.y-0.9+0.1,-0.02);player.g.rotation.set(0,0,0);}
  else{player.g.position.set(s.x,H(s.x,s.z)+s.y-0.9+0.05,s.z);player.g.rotation.set(0,s.rot,0);}
  player.legL.rotation.set(-1.45,0,0.08);player.legR.rotation.set(-1.45,0,-0.08);player.armL.rotation.set(-0.35,0,0);player.armR.rotation.set(-0.35,0,0);
  updateToolVisual();
}
function standUp(){
  const s=P.seat;S.mode='foot';P.seat=null;
  scene.add(player.g);
  P.x=s.x+Math.sin(s.rot)*0.9;P.z=s.z+Math.cos(s.rot)*0.9;
  const p={x:P.x,z:P.z};pushOut(p,0.35);P.x=p.x;P.z=p.z;
  player.legL.rotation.set(0,0,0);player.legR.rotation.set(0,0,0);player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);
  updateToolVisual();
}
function sitContext(){return {enter:'Se lever',act:null,act2:null,full:false,info:P.seat.kind==='chaise'?'Tu te berces sur la galerie 😌':'Il fait bon près du feu'};}

/* ----- Animation ----- */
const chimney={x:CABIN.x+2.1,z:CABIN.z-0.8,y:CAMP_H+4.2};
let campPuffT=0;
function updateCamp(dt){
  campFire.fuel=Math.max(0,campFire.fuel-dt);stove.fuel=Math.max(0,stove.fuel-dt);
  if(camp3d.feu){
    const on=campFire.fuel>0,f=camp3d.feu;f.fl.visible=on;
    f.light.intensity=on?1.6+Math.sin(S.time*11)*0.3+Math.sin(S.time*6.1)*0.2:0;
    if(on)f.fl.children.forEach((c,i)=>{c.scale.y=0.8+0.4*Math.abs(Math.sin(S.time*(6+i)+i));});
  }
  CABIN_WIN.color.set(stove.fuel>0?cabinWinLit:cabinWinOff);
  campPuffT-=dt;
  if(campPuffT<=0){
    campPuffT=0.4;
    if(camp3d.feu&&campFire.fuel>0)spawnPuffAt(CAMPFIRE.x,H(CAMPFIRE.x,CAMPFIRE.z)+0.8,CAMPFIRE.z,false);
    if(stove.fuel>0)spawnPuffAt(chimney.x,chimney.y,chimney.z,false);
  }
  seats.forEach(s=>{if(!s.grp)return;const on=S.mode==='sit'&&P.seat===s;s.grp.rotation.x=on?Math.sin(S.time*1.8)*0.09:s.grp.rotation.x*0.95;});
}
