/* Camp : améliorations de la cabane (une seule fois chacune), achats à la porte, sièges, poêle à bois.
   Les constructions placées librement (feu, abri, bouilloire, barbecue) sont dans constructions.js. */
S.camp={};                       // améliorations construites : {galerie:true, poele:true, agrandir:true}
const stove={fuel:0};
const STOVE_MAX=1800;
const CABIN_DOOR={x:CABIN.x+1.2,z:CABIN.z+3.3};
const seats=[];                  // {x,z,rot,y,grp,kind}
function addSeat(x,z,rot,y,grp,kind){seats.push({x,z,rot,y,grp,kind});}
const UPGRADES=[
  {id:'galerie',name:'Galerie et chaises berçantes',price:1200,icon:'🪑',desc:'Une grande galerie couverte devant la cabane, avec deux chaises berçantes où s\'asseoir.'},
  {id:'poele',name:'Poêle à bois',price:900,icon:'♨️',desc:'Un poêle dans la cabane : on l\'alimente à la porte, la cheminée fume et les fenêtres s\'allument.'},
  {id:'agrandir',name:'Agrandir la cabane',price:3000,icon:'🏠',desc:'Une nouvelle pièce sur le côté de la cabane, avec une grande fenêtre.'}
];
const camp3d={};
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
const BUILD={galerie:buildGalerie,poele:buildPoele,agrandir:buildAgrandir};
function buildUpgrade(id){if(camp3d['_'+id]||!BUILD[id])return;S.camp[id]=true;camp3d['_'+id]=true;BUILD[id]();}

/* ----- Projets du camp (à la porte de la cabane) ----- */
function renderProjects(){
  $('projMoney').textContent=`Ton argent : ${S.money} $`;
  const L=$('projList');L.innerHTML='';
  const sec=t=>{const h=document.createElement('div');h.className='shopSec';h.textContent=t;L.appendChild(h);};
  const row=(icon,name,price,desc,extra,btnTxt,dis,fn)=>{
    const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div class="thumb emoji">${icon}</div><div class="txt"><b>${name}</b> — ${price} $<p>${desc}</p>${extra?`<p class="stats">${extra}</p>`:''}</div>`;
    const b=document.createElement('button');b.textContent=btnTxt;b.disabled=dis;if(fn)b.onclick=fn;d.appendChild(b);L.appendChild(d);
  };
  sec('Constructions à placer');
  KIND_IDS.forEach(k=>{const kd=KINDS[k],n=S.builds.filter(b=>b.k===k).length;
    row(kd.icon,kd.name,kd.price,kd.desc,n?`Tu en as ${n}`:'','Choisir l\'endroit',S.money<kd.price,()=>{if(S.money>=kd.price)startPlace(k);});});
  sec('Améliorations de la cabane');
  UPGRADES.forEach(u=>{const done=!!S.camp[u.id];
    row(u.icon,u.name,u.price,u.desc,'',done?'Construit':'Construire',done||S.money<u.price,()=>{if(S.money<u.price||S.camp[u.id])return;S.money-=u.price;buildUpgrade(u.id);J.build(u.name.toLowerCase());toast(`${u.icon} ${u.name} : c'est construit !`);renderProjects();});});
  $('projMove').disabled=$('projDemo').disabled=!S.builds.length;
}
function openProjects(){renderProjects();$('proj').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeProjects(){$('proj').classList.add('hidden');}
$('projClose').addEventListener('click',closeProjects);
$('projMove').addEventListener('click',()=>startPick('move'));
$('projDemo').addEventListener('click',()=>startPick('demolish'));

/* ----- Interactions ----- */
function nearDoor(){return Math.hypot(P.x-CABIN_DOOR.x,P.z-CABIN_DOOR.z)<1.8;}
function nearStove(){return S.camp.poele&&nearDoor();}
function fmtFire(f){return f>0?`${Math.floor(f/60)} min ${String(Math.floor(f%60)).padStart(2,'0')} s`:'éteint';}
function fuelOf(c){return Math.round(c.len/FT*25*(c.split===1?0.5:1));}
function feed(obj,max,what){const f=fuelOf(P.carry);obj.fuel=Math.min(max,obj.fuel+f);setCarry(null);toast(`🔥 ${what} : ${fmtFire(obj.fuel)}`);}
// Actions quand on porte une bûche (avant les autres)
function carryExtras(){
  const c=P.carry;
  const sp=splitContext();if(sp)return sp;
  const f=buildNear('feu');if(f)return {act:{label:`Mettre la bûche au feu de camp (+${fuelOf(c)} s)`,fn:()=>feed(f,CAMPFIRE_MAX,'Feu de camp')}};
  const s=buildNear('sucres');if(s)return {act:{label:`Mettre la bûche sous la bouilloire (+${fuelOf(c)} s)`,fn:()=>feed(s,FUEL_MAX,'Bouilloire')}};
  if(nearStove())return {act:{label:`Mettre la bûche dans le poêle (+${fuelOf(c)} s)`,fn:()=>feed(stove,STOVE_MAX,'Poêle')}};
  const a=buildNear('abri');
  if(a){
    if(c.len>SHED_MAXLEN)return {info:`Bûche de ${ftin(c.len)} : l'abri prend des bûches de 3 pi maximum, recoupe-la`};
    if(a.logs.length>=SHED_CAP)return {info:'L\'abri à bois est plein'};
    return {act:{label:`Corder dans l'abri (${a.logs.length}/${SHED_CAP})`,fn:()=>{const left=[];halvesOf(c).forEach(h=>{if(a.logs.length<SHED_CAP)a.logs.push(h);else left.push(h);});setCarry(left[0]||null);refreshShed(a);}}};
  }
  return null;
}
// Actions les mains libres, près des constructions
function campExtras(){
  if(nearDoor())return {act:{label:'Projets du camp',fn:openProjects},info:S.camp.poele?`Poêle à bois : ${fmtFire(stove.fuel)} · apporte une bûche pour le chauffer`:''};
  const fd=nearestSplitter();if(fd)return {info:fd.splitting?'La fendeuse travaille…':`Fendeuse : apporte une bûche de ${Math.round(SPLIT_MAX/INCH)} po maximum pour la fendre`};
  const a=buildNear('abri');if(a&&a.logs.length)return {act:{label:`Prendre une bûche dans l'abri (${a.logs.length})`,fn:()=>{const c=a.logs.pop();refreshShed(a);setCarry(c);}}};
  const q=buildNear('bbq');
  if(q)return q.lit>0?{info:'Le barbecue est chaud ! Il ne manque que la viande… la chasse s\'en vient 😉'}:{act:{label:'Allumer le barbecue',fn:()=>{q.lit=BBQ_TIME;toast('🍖 Le barbecue chauffe');}}};
  const f=buildNear('feu');if(f)return {info:`Feu de camp : ${fmtFire(f.fuel)} · apporte du bois de chauffage`};
  return null;
}
function nearestSeat(){let b=null,bd=1.2;seats.forEach(s=>{const d=Math.hypot(P.x-s.x,P.z-s.z);if(d<bd){bd=d;b=s;}});return b?{seat:b,d:bd}:null;}
function sitDown(s){
  S.mode='sit';P.seat=s;P.target=null;marker.visible=false;P.swing=0;
  P.x=s.x;P.z=s.z;P.rot=s.rot;
  if(s.grp){s.grp.add(player.g);player.g.position.set(0,s.y-0.9+0.1,-0.02);player.g.rotation.set(0,0,0);}
  else{player.g.position.set(s.x,H(s.x,s.z)+s.y-0.9+0.05,s.z);player.g.rotation.set(0,s.rot,0);}
  legPose(player,'sit');player.armL.rotation.set(-0.35,0,0);player.armR.rotation.set(-0.35,0,0);
  updateToolVisual();
}
function standUp(){
  const s=P.seat;S.mode='foot';P.seat=null;
  scene.add(player.g);
  P.x=s.x+Math.sin(s.rot)*0.9;P.z=s.z+Math.cos(s.rot)*0.9;
  const p={x:P.x,z:P.z};pushOut(p,0.35);P.x=p.x;P.z=p.z;
  legPose(player,'stand');player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);
  updateToolVisual();
}
function sitContext(){return {enter:'Se lever',act:null,act2:null,full:false,info:P.seat.kind==='chaise'?'Tu te berces sur la galerie 😌':'Il fait bon près du feu'};}

/* ----- Animation ----- */
const chimney={x:CABIN.x+2.1,z:CABIN.z-0.8,y:CAMP_H+4.2};
let campPuffT=0;
function updateCamp(dt){
  stove.fuel=Math.max(0,stove.fuel-dt);
  campPuffT-=dt;const puff=campPuffT<=0;if(puff)campPuffT=0.4;
  S.builds.forEach(b=>{
    if(b.k==='feu'){
      b.fuel=Math.max(0,b.fuel-dt);const o=b._o;if(!o)return;const on=b.fuel>0;o.fl.visible=on;
      if(on){o.fl.children.forEach((c,i)=>{c.scale.y=0.8+0.4*Math.abs(Math.sin(S.time*(6+i)+i));});if(puff)spawnPuffAt(b.x,H(b.x,b.z)+0.8,b.z,false);}
    }else if(b.k==='bbq'){
      b.lit=Math.max(0,b.lit-dt);const o=b._o;if(!o)return;
      o.glow.material.color.set(b.lit>0?(Math.sin(S.time*9)>0?0xff7a1a:0xffa13d):0x3a2a20);
      if(b.lit>0&&puff){const p=lw(b,0,0);spawnPuffAt(p.x,H(p.x,p.z)+1.45,p.z,true);}
    }
  });
  CABIN_WIN.color.set(stove.fuel>0?cabinWinLit:cabinWinOff);
  if(stove.fuel>0&&puff)spawnPuffAt(chimney.x,chimney.y,chimney.z,false);
  seats.forEach(s=>{if(!s.grp)return;const on=(S.mode==='sit'&&P.seat===s)||s.netSit;s.grp.rotation.x=on?Math.sin(S.time*1.8)*0.09:s.grp.rotation.x*0.95;});
}
