/* Projets du camp : feu de camp, abri à bois et bouilloire à sirop (placés librement sur le terrain),
   galerie et chaises berçantes, poêle à bois, agrandissement de la cabane. On les achète à la porte de la cabane. */
S.camp={};                       // projets construits : {feu:true, abri:true, ...}
S.campPos={};                    // position choisie des projets placés librement : {feu:{x,z,rot}, ...}
S.shed=[];                       // bûches cordées dans l'abri
const campFire={fuel:0},stove={fuel:0};
const CAMPFIRE_MAX=900,STOVE_MAX=1800;
// Abri à bois : deux rangées (2 cordes de 3 pi de profond), 8 bûches de large, 5 rangs de haut
const SHED_ROWS=2,SHED_COLS=8,SHED_LAYERS=5,SHED_CAP=SHED_ROWS*SHED_COLS*SHED_LAYERS,SHED_MAXLEN=3*FT+INCH;
const CAMPFIRE={x:-3.5,z:-6.5,rot:0};                                   // positions par défaut (anciennes sauvegardes)
const SHED={x:-13.6,z:-3.2,rot:Math.atan2(13.6,3.2)};
const CABIN_DOOR={x:CABIN.x+1.2,z:CABIN.z+3.3};
const seats=[];                  // {x,z,rot,y,grp,kind}
const PROJECTS=[
  {id:'feu',name:'Feu de camp',price:250,icon:'🔥',place:true,dist:4.3,foot:[[0,0,2.7]],desc:'Un rond de pierres et trois bûches pour s\'asseoir. On y fait brûler du bois de chauffage. À placer où tu veux.'},
  {id:'abri',name:'Abri à bois',price:700,icon:'🪵',place:true,dist:3.3,foot:[[-0.9,0,1.3],[0.9,0,1.3]],desc:`Pour corder tes bûches de chauffage de 3 pi maximum, sur deux cordes de profond (${SHED_CAP} bûches). À placer où tu veux.`},
  {id:'sucres',name:'Bouilloire à sirop',price:400,icon:'🍁',place:true,dist:2.8,foot:[[0,0,1.3]],desc:'Un foyer avec une bouilloire pour faire bouillir l\'eau d\'érable en sirop. À placer où tu veux.'},
  {id:'galerie',name:'Galerie et chaises berçantes',price:1200,icon:'🪑',desc:'Une grande galerie couverte devant la cabane, avec deux chaises berçantes où s\'asseoir.'},
  {id:'poele',name:'Poêle à bois',price:900,icon:'♨️',desc:'Un poêle dans la cabane : on l\'alimente à la porte, la cheminée fume et les fenêtres s\'allument.'},
  {id:'agrandir',name:'Agrandir la cabane',price:3000,icon:'🏠',desc:'Une nouvelle pièce sur le côté de la cabane, avec une grande fenêtre.'}
];
const projectOf=id=>PROJECTS.find(p=>p.id===id);

/* ----- Modèles ----- */
const camp3d={};
function flameGroup(){
  const fl=new T.Group(),fm=[0xff7a1a,0xffb02e,0xffd35a];
  for(let i=0;i<5;i++){const c=new T.Mesh(new T.ConeGeometry(0.16+0.05*(i%2),0.6,6),new T.MeshBasicMaterial({color:fm[i%3]}));c.position.set((i-2)*0.13,0.35,(i%2?0.12:-0.1));fl.add(c);}
  fl.visible=false;return fl;
}
const BENCH_A=[0.4,2.5,4.6];
function makeFeuModel(){
  const g=new T.Group(),stone=mat(0x8a8780),wood=mat(0x6e5236),bark=mat(0x5e4630);
  for(let i=0;i<11;i++){const a=i/11*Math.PI*2,s=new T.Mesh(new T.DodecahedronGeometry(0.2,0),stone);s.position.set(Math.cos(a)*0.75,0.1,Math.sin(a)*0.75);s.rotation.set(i,i*2,0);g.add(s);}
  [0.6,-0.6,2].forEach(r=>{const l=box(0.8,0.14,0.14,wood,0,0.1,0,g);l.rotation.y=r;});
  BENCH_A.forEach(a=>{
    const b=new T.Group(),log=new T.Mesh(new T.CylinderGeometry(0.22,0.24,1.5,10),[bark,endM,endM]);log.rotation.z=Math.PI/2;log.position.y=0.22;b.add(log);
    b.position.set(Math.cos(a)*2.3,0,Math.sin(a)*2.3);b.rotation.y=-a+Math.PI/2;g.add(b);
  });
  return g;
}
function makeAbriModel(){
  const g=new T.Group(),wood=mat(0x7a5232),dark=mat(0x4d3220),roof=mat(0x3f4a3a);
  box(3.4,0.12,2.3,dark,0,0.06,0,g);
  box(3.4,2.0,0.1,wood,0,1.0,-1.15,g);box(0.1,2.0,2.3,wood,-1.7,1.0,0,g);box(0.1,2.0,2.3,wood,1.7,1.0,0,g);
  [-1.65,1.65].forEach(x=>box(0.12,2.3,0.12,dark,x,1.15,1.1,g));
  const r=box(3.8,0.12,2.8,roof,0,2.25,0,g);r.rotation.x=0.18;
  return g;
}
const MODELS={feu:makeFeuModel,abri:makeAbriModel,sucres:()=>makeSucresModel(false)};
// Passage du repère d'une construction au monde
function localToWorld2(pos,lx,lz){const c=Math.cos(pos.rot||0),s=Math.sin(pos.rot||0);return {x:pos.x+c*lx+s*lz,z:pos.z-s*lx+c*lz};}

/* ----- Constructions ----- */
function addSeat(x,z,rot,y,grp,kind){seats.push({x,z,rot,y,grp,kind});}
function buildFeu(pos){
  Object.assign(CAMPFIRE,pos);
  const g=makeFeuModel();
  const fl=flameGroup();g.add(fl);
  const light=new T.PointLight(0xff9a3c,0,16,2);light.position.set(0,0.8,0);g.add(light);
  const y0=H(pos.x,pos.z);g.position.set(pos.x,y0,pos.z);g.rotation.y=pos.rot||0;shadows(g);scene.add(g);
  addCol(pos.x,pos.z,0.9);
  BENCH_A.forEach(a=>{
    const b=localToWorld2(pos,Math.cos(a)*2.3,Math.sin(a)*2.3);
    addCol(b.x,b.z,0.35);
    addSeat(b.x,b.z,Math.atan2(pos.x-b.x,pos.z-b.z),0.45,null,'banc');
  });
  label('Feu de camp',pos.x,y0+2.3,pos.z);
  camp3d.feu={fl,light};
}
const shedLocal=(lx,lz)=>localToWorld2(SHED,lx,lz);
const shedFront=()=>shedLocal(0,2.1);
function buildAbri(pos){
  Object.assign(SHED,pos);
  const g=makeAbriModel();
  const stack=new T.Group();stack.position.set(0,0.12,0);g.add(stack);
  const y0=H(pos.x,pos.z);g.position.set(pos.x,y0,pos.z);g.rotation.y=pos.rot||0;shadows(g);scene.add(g);
  [-1.1,0,1.1].forEach(lx=>{const p=shedLocal(lx,-0.35);addCol(p.x,p.z,0.75);});
  label('Abri à bois',pos.x,y0+3,pos.z);
  camp3d.abri={stack};refreshShed();
}
// Bûches rangées le bout vers l'avant : rangée du fond d'abord, puis celle de devant.
function refreshShed(){
  if(!camp3d.abri)return;
  const st=camp3d.abri.stack;while(st.children.length)st.remove(st.children[0]);
  const perRow=SHED_COLS*SHED_LAYERS;
  S.shed.forEach((c,i)=>{
    const row=Math.floor(i/perRow),k=i%perRow,layer=Math.floor(k/SHED_COLS),col=k%SHED_COLS;
    const m=makePieceMesh(c);
    m.position.set((col-(SHED_COLS-1)/2)*0.4+(layer%2)*0.1,0.2+layer*0.36,row===0?-0.55:0.48);
    st.add(m);
  });
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
const BUILD={feu:buildFeu,abri:buildAbri,sucres:buildSucres,galerie:buildGalerie,poele:buildPoele,agrandir:buildAgrandir};
const DEFAULT_POS={feu:{x:-3.5,z:-6.5,rot:0},abri:{x:-13.6,z:-3.2,rot:Math.atan2(13.6,3.2)},sucres:{x:-10,z:-7,rot:0}};
function buildProject(id,pos){
  if(camp3d['_'+id])return;
  S.camp[id]=true;camp3d['_'+id]=true;
  if(projectOf(id).place){const p=pos||S.campPos[id]||DEFAULT_POS[id];S.campPos[id]={x:p.x,z:p.z,rot:p.rot||0};BUILD[id](S.campPos[id]);}
  else BUILD[id]();
}

/* ----- Placement libre ----- */
const ghostOk=new T.MeshBasicMaterial({color:0x5fe07a,transparent:true,opacity:0.45,depthWrite:false});
const ghostBad=new T.MeshBasicMaterial({color:0xe05a4a,transparent:true,opacity:0.45,depthWrite:false});
function startPlace(id){
  closeProjects();
  const g=MODELS[id]();g.traverse(o=>{if(o.isMesh){o.material=ghostOk;o.castShadow=false;o.renderOrder=30;}});scene.add(g);
  S.mode='place';P.placing={id,rot:wrapAng(P.rot+Math.PI),ghost:g,ok:false,why:''};P.target=null;updateToolVisual();
}
function endPlace(){if(P.placing){scene.remove(P.placing.ghost);P.placing=null;}S.mode='foot';updateToolVisual();}
function placeSpot(){const pr=projectOf(P.placing.id);return {x:P.x+Math.sin(P.rot)*pr.dist,z:P.z+Math.cos(P.rot)*pr.dist,rot:P.placing.rot};}
// Raison pour laquelle on ne peut pas construire ici, ou '' si c'est correct
function placeProblem(id,pos){
  const pr=projectOf(id);
  if(S.money<pr.price)return `Il te manque ${pr.price-S.money} $`;
  const others=bodyCircles(null);
  for(const [lx,lz,r] of pr.foot){
    const c=localToWorld2(pos,lx,lz);
    if(Math.abs(c.x)>WORLD-r-2||Math.abs(c.z)>WORLD-r-2)return 'Trop près du bout de la terre';
    if(Math.hypot(c.x-VILLAGE.x,c.z-VILLAGE.z)<VILLAGE.r+r||inSale(c.x,c.z))return 'Pas au village';
    if(Math.hypot(c.x-YARD.x,c.z-YARD.z)<YARD.r+r)return 'Pas dans la cour à bois';
    if(trailDist(c.x,c.z)<r*0.5+1.4)return 'Pas sur un chemin';
    if(others.some(o=>Math.hypot(o[0]-c.x,o[1]-c.z)<r+o[2]))return 'Un véhicule ou une remorque est dans le chemin';
    if(hits(c.x,c.z,r))return 'Il y a déjà quelque chose ici';
    if(pieces.some(pc=>{const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),d=clamp((c.x-b.x)*fx+(c.z-b.z)*fz,0,pc.len);return Math.hypot(c.x-(b.x+fx*d),c.z-(b.z+fz*d))<r;}))return 'Il y a du bois par terre';
    if(pails.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<r))return 'Il y a un seau par terre';
    if(Math.hypot(P.x-c.x,P.z-c.z)<r+0.2)return 'Recule un peu';
    let lo=1e9,hi=-1e9;for(let k=0;k<8;k++){const a=k/8*Math.PI*2,h=H(c.x+Math.cos(a)*r,c.z+Math.sin(a)*r);lo=Math.min(lo,h);hi=Math.max(hi,h);}
    if(hi-lo>0.8)return 'Terrain trop en pente';
  }
  return '';
}
function rotatePlace(){if(P.placing)P.placing.rot=wrapAng(P.placing.rot+Math.PI/4);}
function confirmPlace(){
  const pl=P.placing;if(!pl)return;const pos=placeSpot(),why=placeProblem(pl.id,pos);if(why){toast(why);return;}
  const pr=projectOf(pl.id);S.money-=pr.price;endPlace();buildProject(pl.id,pos);toast(`${pr.icon} ${pr.name} : c'est construit !`);
}
function updatePlacement(){
  const pl=P.placing;if(!pl)return;
  const pos=placeSpot();pl.why=placeProblem(pl.id,pos);pl.ok=!pl.why;
  pl.ghost.position.set(pos.x,H(pos.x,pos.z),pos.z);pl.ghost.rotation.y=pos.rot;
  const m=pl.ok?ghostOk:ghostBad;pl.ghost.traverse(o=>{if(o.isMesh)o.material=m;});
}
function placeContext(){
  const pl=P.placing,pr=projectOf(pl.id);
  return {enter:'Annuler',act:pl.ok?{label:`Construire ici (${pr.price} $)`,fn:confirmPlace}:null,act2:{label:'Tourner',fn:rotatePlace},full:false,
    info:pl.why||`${pr.icon} ${pr.name} : marche pour choisir l'endroit, F ou R pour tourner`};
}

/* ----- Achats à la porte de la cabane ----- */
function renderProjects(){
  $('projMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('projList');L.innerHTML='';
  PROJECTS.forEach(p=>{
    const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div class="thumb emoji">${p.icon}</div><div class="txt"><b>${p.name}</b> — ${p.price} $<p>${p.desc}</p></div>`;
    const b=document.createElement('button');
    if(S.camp[p.id]){b.textContent='Construit';b.disabled=true;}
    else if(p.place){b.textContent='Choisir l\'endroit';b.disabled=S.money<p.price;b.onclick=()=>{if(S.money>=p.price)startPlace(p.id);};}
    else{b.textContent='Construire';b.disabled=S.money<p.price;b.onclick=()=>{if(S.money<p.price||S.camp[p.id])return;S.money-=p.price;buildProject(p.id);toast(`${p.icon} ${p.name} : c'est construit !`);renderProjects();};}
    d.appendChild(b);L.appendChild(d);
  });
}
function openProjects(){renderProjects();$('proj').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeProjects(){$('proj').classList.add('hidden');}
$('projClose').addEventListener('click',closeProjects);

/* ----- Interactions ----- */
function nearCampfire(){return S.camp.feu&&Math.hypot(P.x-CAMPFIRE.x,P.z-CAMPFIRE.z)<2.2;}
function nearShed(){if(!S.camp.abri)return false;const f=shedFront();return Math.hypot(P.x-f.x,P.z-f.z)<1.9;}
function nearDoor(){return Math.hypot(P.x-CABIN_DOOR.x,P.z-CABIN_DOOR.z)<1.8;}
function nearStove(){return S.camp.poele&&nearDoor();}
function fmtFire(f){return f>0?`${Math.floor(f/60)} min ${String(Math.floor(f%60)).padStart(2,'0')} s`:'éteint';}
function feedFire(obj,max,what){const f=fuelOf(P.carry);obj.fuel=Math.min(max,obj.fuel+f);setCarry(null);toast(`🔥 ${what} : ${fmtFire(obj.fuel)}`);}
// Actions quand on porte une bûche (avant les autres)
function carryExtras(){
  const c=P.carry;
  if(nearCampfire())return {act:{label:`Mettre la bûche au feu de camp (+${fuelOf(c)} s)`,fn:()=>feedFire(campFire,CAMPFIRE_MAX,'Feu de camp')}};
  if(nearStove())return {act:{label:`Mettre la bûche dans le poêle (+${fuelOf(c)} s)`,fn:()=>feedFire(stove,STOVE_MAX,'Poêle')}};
  if(nearShed()){
    if(c.len>SHED_MAXLEN)return {info:`Bûche de ${ftin(c.len)} : l'abri prend des bûches de 3 pi maximum, recoupe-la`};
    if(S.shed.length>=SHED_CAP)return {info:'L\'abri à bois est plein'};
    return {act:{label:`Corder dans l'abri (${S.shed.length}/${SHED_CAP})`,fn:()=>{S.shed.push(c);setCarry(null);refreshShed();}}};
  }
  return null;
}
// Actions les mains libres, près des constructions
function campExtras(){
  if(nearDoor())return {act:{label:'Projets du camp',fn:openProjects},info:S.camp.poele?`Poêle à bois : ${fmtFire(stove.fuel)} · apporte une bûche pour le chauffer`:''};
  if(nearShed()&&S.shed.length)return {act:{label:`Prendre une bûche dans l'abri (${S.shed.length})`,fn:()=>{const c=S.shed.pop();refreshShed();setCarry(c);}}};
  if(nearCampfire())return {info:`Feu de camp : ${fmtFire(campFire.fuel)} · apporte du bois de chauffage`};
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
