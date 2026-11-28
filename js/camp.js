/* Camp : améliorations de la cabane (une seule fois chacune), achats à la porte, sièges, poêle à bois.
   Les constructions placées librement (feu, abri, bouilloire, barbecue) sont dans constructions.js. */
S.camp={};                       // améliorations construites : {galerie:true, poele:true, agrandir:true}
const stove={fuel:0};
const STOVE_MAX=1800;
const CABIN_DOOR={x:CABIN.x+CAB_DOOR_X,z:CABIN.z+CAB_D/2+1.05};
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
  const parts=[new T.BoxGeometry(0.52,0.05,0.48).translate(0,0.42,0.02)];
  // Dossier : deux montants, traverses, barreaux
  [-0.24,0.24].forEach(x=>parts.push(new T.BoxGeometry(0.05,1.0,0.05).rotateX(-0.15).translate(x,0.86,-0.27)));
  [0.62,1.24].forEach(y=>parts.push(new T.BoxGeometry(0.5,0.07,0.04).rotateX(-0.15).translate(0,y,-0.24-(y-0.62)*0.15)));
  [-0.12,0,0.12].forEach(x=>parts.push(new T.BoxGeometry(0.035,0.6,0.025).rotateX(-0.15).translate(x,0.93,-0.28)));
  // Pattes et accoudoirs
  [-0.25,0.25].forEach(x=>{parts.push(new T.BoxGeometry(0.045,0.4,0.045).translate(x,0.24,0.18),new T.BoxGeometry(0.045,0.4,0.045).translate(x,0.24,-0.2),
    new T.BoxGeometry(0.045,0.26,0.045).translate(x,0.57,0.18),new T.BoxGeometry(0.07,0.035,0.52).translate(x,0.71,-0.02));});
  rock.add(new T.Mesh(mergeGeos(parts),w));
  // Berceaux courbes
  const arc=[];[-0.25,0.25].forEach(x=>arc.push(new T.TorusGeometry(1.4,0.03,4,14,0.66).rotateZ(-Math.PI/2-0.33).rotateY(Math.PI/2).translate(x,1.44,0)));
  rock.add(new T.Mesh(mergeGeos(arc),dk));
  return {g,rock};
}
function buildGalerie(){
  // Galerie couverte le long de la façade (de x0 à x1 dans le repère de la cabane), ouverte devant la porte
  const g=new T.Group(),deck=texMat(sidingTex('#9a7a55','#5e4632',true),1,1),post=new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3}),rail=mat(0x6e5236);
  const x0=-CAB_W/2-0.2,x1=CAB_W/2-1.4,f=CAB_D/2,dep=2.8,zp=f+dep-0.1,ph=CAB_H-0.2,dx=CAB_DOOR_X,mx=(x0+x1)/2,w=x1-x0;
  deck.map.repeat.set(1,24);
  g.add(new T.Mesh(new T.BoxGeometry(w,0.18,dep).translate(mx,0.09,f+dep/2),deck));
  const posts=[];for(let k=0;k<=5;k++)posts.push(x0+0.1+k*(w-0.2)/5);
  g.add(new T.Mesh(mergeGeos(posts.map(x=>new T.CylinderGeometry(0.09,0.1,ph,8).translate(x,ph/2+0.15,zp))),post));
  const rp=[];[[x0+0.1,dx-0.75],[dx+0.75,x1-0.1]].forEach(([a,b])=>{rp.push(new T.BoxGeometry(b-a,0.07,0.09).translate((a+b)/2,0.95,zp+0.03),new T.BoxGeometry(b-a,0.05,0.06).translate((a+b)/2,0.3,zp+0.03));for(let x=a+0.2;x<b-0.05;x+=0.2)rp.push(new T.BoxGeometry(0.04,0.62,0.04).translate(x,0.62,zp+0.03));});
  [x0+0.1,x1-0.1].forEach(x=>{rp.push(new T.BoxGeometry(0.07,0.07,dep-0.3).translate(x,0.95,f+dep/2));for(let z=f+0.25;z<zp-0.05;z+=0.2)rp.push(new T.BoxGeometry(0.04,0.62,0.04).translate(x,0.62,z));});
  rp.push(new T.BoxGeometry(1.5,0.09,0.4).translate(dx,0.045,zp+0.3));  // marche
  g.add(new T.Mesh(mergeGeos(rp),rail));
  const r=new T.Mesh(new T.BoxGeometry(w+0.5,0.1,dep+0.4),texMat(shingleTex('#5a2a22','#3e1c17'),16,3));r.position.set(mx,ph+0.42,f+dep/2);r.rotation.x=0.2;g.add(r);
  g.add(new T.Mesh(new T.BoxGeometry(w,0.16,0.12).translate(mx,ph+0.1,zp),rail));
  g.position.set(CABIN.x,CAMP_H,CABIN.z);bakeStatic(g);shadows(g);scene.add(g);
  posts.forEach(x=>addCol(CABIN.x+x,CABIN.z+zp,0.15));
  [-4.6,-3.1].forEach(x=>{
    const ch=makeRocker();ch.g.position.set(CABIN.x+x,CAMP_H+0.18,CABIN.z+f+1.4);shadows(ch.g);scene.add(ch.g);
    addSeat(CABIN.x+x,CABIN.z+f+1.4,0,0.36,ch.rock,'chaise');
  });
}
const cabinWinLit=0xffa64a,cabinWinOff=0x8fa3ad;
function buildPoele(){camp3d.poele=true;}
function buildAgrandir(){
  // Rallonge en billots assortie à la cabane, sur le côté gauche
  const g=new T.Group(),W=6.4,D=7.4,Hh=3.0,ox=-CAB_W/2-W/2+0.05;
  g.add(new T.Mesh(logWalls(W,D,Hh,0.17),[CABIN_LOG,RING_M,RING_M]));
  const plank=texMat(sidingTex('#7a5232','#4d3220',true),1,1);plank.map.repeat.set(9,1);
  g.add(new T.Mesh(gable(W,D+0.2,Hh+0.1,D/2*Math.tan(0.5)-0.12,-W/2),plank));
  roofTex(g,W+0.4,D,Hh+1.08,texMat(shingleTex('#5a2a22','#3e1c17'),9,12),0.5,0.5);
  const wf=[],wg=[];[windowGeo(2.0,1.0,0,1.7,D/2+0.19,0),windowGeo(1.0,0.95,-W/2-0.19,1.7,0,-Math.PI/2)].forEach(w=>{wf.push(w.frame);wg.push(w.glass);});
  g.add(new T.Mesh(mergeGeos(wf),mat(0xe8e0cc)),new T.Mesh(mergeGeos(wg),CABIN_WIN));
  g.add(new T.Mesh(new T.BoxGeometry(W+0.3,0.2,D+0.3).translate(0,0.02,0),mat(0x7a756c)));
  g.position.set(CABIN.x+ox,CAMP_H,CABIN.z);bakeStatic(g);shadows(g);scene.add(g);
  for(let x=-W/2;x<=W/2+0.01;x+=0.6){addCol(CABIN.x+ox+x,CABIN.z-D/2,0.42);addCol(CABIN.x+ox+x,CABIN.z+D/2,0.42);}
  for(let z=-D/2+0.6;z<D/2-0.01;z+=0.6)addCol(CABIN.x+ox-W/2,CABIN.z+z,0.42);
  evictCabin();
}
// Ce qui se trouve dans l'emprise de la cabane (agrandie) est poussé dehors : constructions, billots, véhicules, seaux
function cabinRects(){const r=[{x0:-CAB_W/2-0.6,x1:CAB_W/2+0.6,z0:-CAB_D/2-0.6,z1:CAB_D/2+(S.camp.galerie?3.2:0.6)}];
  if(S.camp.agrandir)r.push({x0:-CAB_W/2-6.6,x1:-CAB_W/2,z0:-4.4,z1:4.4});return r;}
function inCabinRect(x,z,m){const l=cabL(x,z);return cabinRects().some(r=>l.x>r.x0-m&&l.x<r.x1+m&&l.z>r.z0-m&&l.z<r.z1+m);}
function outOfCabin(x,z,m){   // point dehors le plus proche (on sort par l'arrière ou les côtés plutôt que dans la galerie)
  for(let k=0;k<40&&inCabinRect(x,z,m);k++){const l=cabL(x,z),r=cabinRects().find(r=>l.x>r.x0-m&&l.x<r.x1+m&&l.z>r.z0-m&&l.z<r.z1+m);
    const opts=[[r.x0-m-0.1,l.z,l.x-r.x0],[r.x1+m+0.1,l.z,r.x1-l.x],[l.x,r.z0-m-0.1,l.z-r.z0]].sort((a,b)=>a[2]-b[2])[0];const w=cabW(opts[0],opts[1]);x=w.x;z=w.z;}
  return {x,z};}
function evictCabin(){
  S.builds.forEach(b=>{const R=(KINDS[b.k]&&KINDS[b.k].dist||2)*0.6;if(inCabinRect(b.x,b.z,R)){const p=outOfCabin(b.x,b.z,R);despawnBuild(b);b.x=p.x;b.z=p.z;spawnBuild(b);}});
  pieces.slice().forEach(pc=>{if(inCabinRect(pc.cx,pc.cz,pc.len/2)){const p=outOfCabin(pc.cx,pc.cz,pc.len/2);pc.cx=p.x;pc.cz=p.z;placePiece(pc);}});
  vehicles.forEach(v=>{if(inCabinRect(v.x,v.z,2.5)){const p=outOfCabin(v.x,v.z,2.5);v.x=p.x;v.z=p.z;}});
  trailers.forEach(t=>{if(!t.hitch&&inCabinRect(t.x,t.z,2)){const p=outOfCabin(t.x,t.z,2);t.x=p.x;t.z=p.z;}});
  if(typeof pails!=='undefined')pails.forEach(gp=>{if(inCabinRect(gp.x,gp.z,0.3)){const p=outOfCabin(gp.x,gp.z,0.3);gp.x=p.x;gp.z=p.z;gp.mesh.position.set(p.x,H(p.x,p.z),p.z);}});
  if(!S.inside&&inCabinRect(P.x,P.z,0.3)){P.x=CABIN_DOOR.x;P.z=CABIN_DOOR.z+0.5;}
  stumpList.slice().forEach(s=>{if(inCabinRect(s.x,s.z,0.4))removeStump(s,true);});
  if(typeof ROCKS!=='undefined')ROCKS.forEach(r=>{if(inCabinRect(r.x,r.z,0.9*r.s)){const p=outOfCabin(r.x,r.z,0.9*r.s);moveRock(r,p.x,p.z);}});
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
  const ch=chipCarryContext();if(ch)return ch;
  const f=buildNear('feu');if(f)return {act:{label:`Mettre la bûche au feu de camp (+${fuelOf(c)} s)`,fn:()=>feed(f,CAMPFIRE_MAX,'Feu de camp')}};
  const s=buildNear('sucres')||(KINDS.evapo?buildNear('evapo'):null);if(s)return {act:{label:`Mettre la bûche ${s.k==='evapo'?'dans le foyer de l\'évaporateur':'sous la bouilloire'} (+${fuelOf(c)} s)`,fn:()=>feed(s,boilFuelMax(s),s.k==='evapo'?'Évaporateur':'Bouilloire')}};
  if(nearStove())return {act:{label:`Mettre la bûche dans le poêle (+${fuelOf(c)} s)`,fn:()=>feed(stove,STOVE_MAX,'Poêle')}};
  const a=nearStack();
  if(a){
    if(c.len>SHED_MAXLEN)return {info:`Bûche de ${ftin(c.len)} : ${stackName(a)} prend des bûches de 3 pi maximum, recoupe-la`};
    if(a.logs.length>=stackCap(a))return {info:a.k==='corde'?'La corde est pleine':'L\'abri à bois est plein'};
    return {act:{label:`Corder dans ${stackName(a)} (${a.logs.length}/${stackCap(a)})`,fn:()=>{const left=[];halvesOf(c).forEach(h=>{if(a.logs.length<stackCap(a))a.logs.push(h);else left.push(h);});setCarry(left[0]||null);refreshShed(a);}}};
  }
  return null;
}
// Actions les mains libres, près des constructions
function campExtras(){
  if(nearDoor())return {act:{label:'Projets du camp',fn:openProjects},info:S.camp.poele?`Poêle à bois : ${fmtFire(stove.fuel)} · apporte une bûche pour le chauffer`:''};
  const cf=chipFreeContext();if(cf)return cf;
  const fd=nearestSplitter();if(fd)return {info:fd.splitting?'La fendeuse travaille…':`Fendeuse : apporte une bûche de ${Math.round(SPLIT_MAX/INCH)} po maximum pour la fendre`};
  const a=nearStack();if(a&&a.logs.length)return {act:{label:`Prendre une bûche dans ${stackName(a)} (${a.logs.length})`,fn:()=>{const c=a.logs.pop();refreshShed(a);setCarry(c);}},info:`${a.k==='corde'?'Corde':'Abri'} : ${stackSummary(a)}`};
  const q=buildNear('bbq');if(q)return bbqContext(q);
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
const chimney={x:CABIN.x+CAB_CHIM.x,z:CABIN.z+CAB_CHIM.z,y:CAMP_H+6.7};
let campPuffT=0;
function updateCamp(dt){
  stove.fuel=Math.max(0,stove.fuel-dt);
  campPuffT-=dt;const puff=campPuffT<=0;if(puff)campPuffT=0.4;
  S.builds.forEach(b=>{
    if(b.k==='feu'){
      b.fuel=Math.max(0,b.fuel-dt);const o=b._o;if(!o)return;const on=b.fuel>0;o.fl.visible=on;
      if(on){o.fl.children.forEach((c,i)=>{c.scale.y=0.8+0.4*Math.abs(Math.sin(S.time*(6+i)+i));});if(puff)spawnPuffAt(b.x,H(b.x,b.z)+0.8,b.z,false);}
    }else if(b.k==='bbq'){
      updateBbq(b,dt,puff);
    }
  });
  CABIN_WIN.color.set(stove.fuel>0?cabinWinLit:cabinWinOff);
  if(stove.fuel>0&&puff)spawnPuffAt(chimney.x,chimney.y,chimney.z,false);
  seats.forEach(s=>{if(!s.grp)return;const on=(S.mode==='sit'&&P.seat===s)||s.netSit;s.grp.rotation.x=on?Math.sin(S.time*1.8)*0.09:s.grp.rotation.x*0.95;});
}

/* ----- Barbecue : couvercle, allumer/éteindre, jusqu'à 4 poissons qui cuisent en 2 minutes ----- */
const BBQ_COOK=120;
const BBQ_SLOTS=[-0.3,-0.1,0.1,0.3];
const _raw=new T.Color(1,1,1),_done=new T.Color(0.62,0.4,0.22),_fc=new T.Color(),_mRaw=new T.Color(0xa8383a),_mDone=new T.Color(0x5a3420);
function updateBbq(b,dt,puff){
  if(!b.fish)b.fish=[null,null,null,null];
  if(b.on)b.fish.forEach(f=>{if(f)f.c=Math.min(BBQ_COOK,(f.c||0)+dt);});
  const o=b._o;if(!o||!o.lid)return;
  // Couvercle qui s'ouvre doucement
  const tgt=b.open?-1.55:0;o.lidA+= (tgt-o.lidA)*(1-Math.exp(-6*dt));o.lid.rotation.x=o.lidA;
  o.flames.visible=b.on;if(b.on)o.flames.children.forEach((c,i)=>{c.scale.y=0.7+0.5*Math.abs(Math.sin(S.time*(9+i)+i));});
  o.glow.material.color.set(b.on?(Math.sin(S.time*9)>0?0xff7a1a:0xffa13d):0x3a2a20);
  o.burn.material.color.set(b.on?0xc2401a:0x2a2420);
  // Poissons sur la grille : refaits seulement quand la liste change
  const key=b.fish.map(f=>f?f.k+f.w:'-').join(',');
  if(key!==o.fishKey){o.fishKey=key;while(o.fishG.children.length)o.fishG.remove(o.fishG.children[0]);
    b.fish.forEach((f,i)=>{if(!f)return;
      if(f.k.startsWith('m:')){const m=new T.Mesh(new T.BoxGeometry(0.14,0.05,0.28),new T.MeshPhongMaterial({color:0xa8383a,flatShading:true,shininess:20}));m.userData.meat=true;m.position.set(BBQ_SLOTS[i],1.19,0);m.rotation.y=(i%2?0.2:-0.2);o.fishG.add(m);return;}
      const m=makeFishModel(f.k,f.w);const bb=new T.Box3().setFromObject(m),len=bb.getSize(new T.Vector3()).z;m.scale.multiplyScalar(Math.min(1,0.4/len));
      m.rotation.z=Math.PI/2;m.position.set(BBQ_SLOTS[i],1.175,0);o.fishG.add(m);});}
  o.fishG.children.forEach((m,i)=>{const f=b.fish.filter(Boolean)[i];if(!f)return;const k=f.c/BBQ_COOK;
    if(m.userData.meat){m.material.color.copy(_mRaw).lerp(_mDone,k);return;}
    _fc.copy(_raw).lerp(_done,k);m.traverse(x=>{if(x.isMesh&&x.material.color)x.material.color.copy(_fc);});});
  if(b.on&&puff&&Math.random()<(b.open?0.35:0.7)){const p=lw(b,0,0);spawnPuffAt(p.x,H(p.x,p.z)+(b.open?1.3:1.45),p.z,b.fish.some(Boolean));}
}
function fishTxt(k,cooked){const F=FISH[k];return cooked?`${F.n}${F.fem?' cuite':' cuit'}`:F.n;}
function bbqContext(q){
  if(!q.fish)q.fish=[null,null,null,null];
  const onOff={label:q.on?'Éteindre le barbecue':'Allumer le barbecue',fn:()=>{q.on=!q.on;toast(q.on?'🔥 Le barbecue chauffe':'Barbecue éteint');sfxKnock(q.x,q.z,0.4);}};
  const lid={label:q.open?'Fermer le couvercle':'Ouvrir le couvercle',fn:()=>{q.open=!q.open;sfxKnock(q.x,q.z,0.5);}};
  const n=q.fish.filter(Boolean).length,done=q.fish.filter(f=>f&&f.c>=BBQ_COOK).length;
  let info=q.on?'🔥 Allumé':'Éteint';
  if(n)info+=` · ${n}/4 sur la grille : `+q.fish.filter(Boolean).map(f=>f.c>=BBQ_COOK?'✅ cuit':`${Math.round(f.c/BBQ_COOK*100)} %`).join(', ');
  else info+=' · la grille est vide';
  if(!q.open)return {act:lid,act2:onOff,info};
  const it=heldItem(),raw=it&&it.id.startsWith('poisson:'),meat=it&&it.id.startsWith('viande:');
  let fishAct=null;
  if(meat&&n<4){const mk=it.id.slice(7);fishAct={label:`Mettre la viande de ${mk==='lievre'?'lièvre':'chevreuil'} sur la grille (${n}/4)`,fn:()=>{const o=invTake(S.hot,1);const i=q.fish.indexOf(null);q.fish[i]={k:'m:'+mk,w:o.w?o.w[0]:1,c:0};if(!q.on)toast('Pense à allumer le barbecue !');}};}
  else if(raw&&n<4){const k=it.id.slice(8);fishAct={label:`Mettre ${FISH[k].fem?'la':'le'} ${FISH[k].n.toLowerCase()} sur la grille (${n}/4)`,fn:()=>{const o=invTake(S.hot,1);const i=q.fish.indexOf(null);q.fish[i]={k,w:o.w?o.w[0]:1,c:0};if(!q.on)toast('Pense à allumer le barbecue !');}};}
  else{
    const i=q.fish.findIndex(f=>f&&f.c>=BBQ_COOK),j=i>=0?i:q.fish.findIndex(Boolean);
    if(j>=0&&q.fish[j].k.startsWith('m:')){const f=q.fish[j],cooked=f.c>=BBQ_COOK,mk=f.k.slice(2),nm=mk==='lievre'?'lièvre':'chevreuil';
      fishAct={label:cooked?`Prendre la viande de ${nm} grillée`:`Retirer la viande de ${nm} (pas encore cuite)`,
        fn:()=>{q.fish[j]=null;giveItem({id:(cooked?'grille:':'viande:')+mk,n:1,w:[f.w]});if(cooked)toast(`🍖 Viande de ${nm} grillée (${kg(f.w)})`);}};}
    else if(j>=0){const f=q.fish[j],cooked=f.c>=BBQ_COOK;
      fishAct={label:cooked?`Prendre ${FISH[f.k].fem?'la':'le'} ${fishTxt(f.k,true).toLowerCase()}`:`Retirer ${FISH[f.k].fem?'la':'le'} ${FISH[f.k].n.toLowerCase()} (pas encore ${FISH[f.k].fem?'cuite':'cuit'})`,
        fn:()=>{q.fish[j]=null;giveItem({id:(cooked?'cuit:':'poisson:')+f.k,n:1,w:[f.w]});if(cooked)toast(`🍽️ ${fishTxt(f.k,true)} (${kg(f.w)})`);}};}
  }
  return fishAct?{act:fishAct,act2:lid,info}:{act:lid,act2:onOff,info};
}

/* ---------- Décor en bordure du camp (la bécosse est une construction déplaçable) : boîte aux lettres ---------- */
{
  const put=(g,x,z,ry)=>{g.position.set(x,H(x,z),z);g.rotation.y=ry;bakeStatic(g);shadows(g);scene.add(g);};
  const plankV=texMat(sidingTex('#7d5a3a','#4e3622',true),5,1),wd=mat(0x7a5232),dk=mat(0x3b2a1e);
  // Boîte aux lettres au bord du chemin du village
  {const g=new T.Group();g.add(new T.Mesh(new T.BoxGeometry(0.1,1.1,0.1).translate(0,0.55,0),wd));
   g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.28,0.22,0.5).translate(0,1.2,0),new T.CylinderGeometry(0.14,0.14,0.5,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(-Math.PI/2).translate(0,1.31,0)]),mat(0x4a5a4a)));
   g.add(new T.Mesh(new T.BoxGeometry(0.03,0.2,0.06).translate(0.16,1.4,-0.1),mat(0xc22a1e)));
   put(g,-1.2,14.5,0.3);addCol(-1.2,14.5,0.2);}
}
addEventListener('load',()=>evictCabin());   // partie neuve : rien dans l'emprise de la cabane agrandie
