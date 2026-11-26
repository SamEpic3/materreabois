/* Chasse et piégeage
   - Permis de chasse (magasin) : obligatoire pour tirer et poser des collets; limite de chevreuils par jour et par joueur.
   - Carabine (balles) et arc (flèches) : on vise avec la caméra (mire en 1re personne), le coup part vers l'animal visé.
     Un arbre entre toi et la bête arrête le projectile.
   - Le gibier abattu reste au sol (partagé entre les joueurs). Avec un couteau dans l'inventaire, on le dépèce : viande.
   - Collets : posés au pied d'un arbre, ils attrapent un lièvre de temps en temps (celui qui mène le monde décide).
   - La viande se vend au magasin, au kilo. */
const HUNT_DEER_DAY=2,PERMIT_PRICE=120;
const MEAT={chevreuil:{n:'Viande de chevreuil',pkg:12},lievre:{n:'Viande de lièvre',pkg:16}};
const AMMO={rifle:{id:'balles',n:'balles',range:130,cone:0.035,hit:d=>0.97-d/450,scare:90},bow:{id:'fleches',n:'flèches',range:38,cone:0.05,hit:d=>0.95-d/70,scare:22}};
// Une vraie flèche (et non un arc) pour la miniature
const ARROW_ICON='<svg class="emo" viewBox="0 0 32 32" width="1em" height="1em" style="width:1.15em;height:1.15em"><path d="M5 27 L24 8" stroke="#7a4a26" stroke-width="2.6" stroke-linecap="round"/><path d="M27 5 L19.5 7.5 L24.5 12.5 Z" fill="#9aa3a8" stroke="#555" stroke-width="0.8"/><path d="M5 27 L4 21 L8 23 Z M5 27 L11 28 L9 24 Z" fill="#c23a2e"/><path d="M8 24 L6.5 19.5 L10 21 Z M8 24 L12.5 25.5 L11 22 Z" fill="#c23a2e"/></svg>';
const HUNT_GEAR=[
  {id:'balles',name:'Boîte de balles (×20)',n:20,price:45,emo:'📦',desc:'Des cartouches pour la carabine.'},
  {id:'fleches',name:'Flèches (×6)',n:6,price:30,emo:'➶',desc:'Des flèches pour l\'arc. Une flèche qui touche est perdue.'},
  {id:'collet',name:'Collets à lièvre (×5)',n:5,price:25,emo:'➰',desc:'À poser au pied d\'un arbre en forêt. Reviens voir : un lièvre s\'y prend de temps en temps.'}
];
S.hunt={permit:false,day:0,deer:0};   // propre à chaque joueur
S.carcs=[];                            // gibier au sol {id, kind:'deer'|'hare', x, z, rot, buck, work}
S.snares=[];                           // collets {id, x, z, rot, wait, caught}

/* ----- Objets : armes, couteau, munitions, collets, viande ----- */
const _itemDefH=itemDef;
itemDef=function(id){
  if(id==='balles')return {kind:'ammo',name:'Balles de carabine',stack:60};
  if(id==='fleches')return {kind:'ammo',name:'Flèches',stack:24};
  if(id==='collet')return {kind:'snare',name:'Collet à lièvre',stack:10};
  if(id.startsWith('viande:')){const k=id.slice(7);return {kind:'meat',name:MEAT[k]?MEAT[k].n:'Viande',stack:10,meat:k};}
  return _itemDefH(id);
};
const _itemIconH=itemIcon;
itemIcon=function(it){
  if(!it)return '';
  const d=itemDef(it.id);
  if(d.kind==='ammo')return it.id==='balles'?'<span class="emo">📦</span>':ARROW_ICON;
  if(d.kind==='snare')return '<span class="emo">➰</span>';
  if(d.kind==='meat')return '<span class="emo">🥩</span>';
  return _itemIconH(it);
};
const _dropModelH=dropModel;
dropModel=function(it){
  const d=itemDef(it.id);
  if(d.kind==='meat'){const g=new T.Group();box(0.34,0.14,0.24,mat(0xb04a3a),0,0.07,0,g);box(0.36,0.02,0.26,mat(0xf1e6c8),0,0.15,0,g);return g;}
  if(d.kind==='ammo'){const g=new T.Group();box(0.22,0.12,0.14,mat(it.id==='balles'?0x2f5a3a:0x8a6a3a),0,0.06,0,g);return g;}
  if(d.kind==='snare'){const g=new T.Group();g.add(new T.Mesh(new T.TorusGeometry(0.1,0.008,4,16).translate(0,0.12,0),mat(0x9aa0a6)));return g;}
  return _dropModelH(it);
};
function meatValue(s){const d=itemDef(s.id);return Math.round((s.w||[1]).reduce((a,w)=>a+w*MEAT[d.meat].pkg,0));}
function hasKnife(){return invCount('couteau')>0;}

/* ----- Modèles : carabine, arc, couteau ----- */
function makeRifleModel(){
  const g=new T.Group(),wood=mat(0x6b4226),steel=new T.MeshPhongMaterial({color:0x2b2e31,shininess:60});
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.05,0.12,0.34).translate(0,-0.02,-0.2),new T.BoxGeometry(0.045,0.06,0.3).translate(0,0.02,0.1)]),wood));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.014,0.016,0.55,8).rotateX(Math.PI/2).translate(0,0.05,0.42),new T.BoxGeometry(0.05,0.05,0.18).translate(0,0.05,0.04),
    new T.CylinderGeometry(0.022,0.022,0.24,10).rotateX(Math.PI/2).translate(0,0.11,0.06),new T.BoxGeometry(0.012,0.04,0.012).translate(0,0.08,0.0),new T.BoxGeometry(0.012,0.04,0.012).translate(0,0.08,0.13)]),steel));
  return g;
}
function makeBowModel(){
  const g=new T.Group(),wood=mat(0x7a4a26),grip=mat(0x2a2a2a);
  const limb=(s)=>new T.CylinderGeometry(0.012,0.022,0.6,6).translate(0,0.3,0).rotateX(-0.28).scale(1,s,1);
  g.add(new T.Mesh(mergeGeos([limb(1),limb(-1)]),wood));
  g.add(new T.Mesh(new T.CylinderGeometry(0.026,0.026,0.14,8),grip));
  const tip=0.6*Math.cos(0.28),back=-0.6*Math.sin(0.28);
  g.add(new T.Mesh(new T.CylinderGeometry(0.003,0.003,tip*2,4).translate(0,0,back),mat(0xe8e0cc)));
  return g;
}
function makeKnifeModel(){
  const g=new T.Group();
  g.add(new T.Mesh(new T.BoxGeometry(0.03,0.03,0.12).translate(0,0,-0.02),mat(0x5a3a22)));
  g.add(new T.Mesh(new T.BoxGeometry(0.008,0.035,0.16).translate(0,0.004,0.12),new T.MeshPhongMaterial({color:0xc8ccd0,shininess:90})));
  return g;
}
// Dans la main du personnage (3e personne) et en vue 1re personne
{
  const r=makeRifleModel();r.position.set(0,-0.66,0.05);r.rotation.x=-0.15;player.armR.add(r);player.rifle=r;
  const b=makeBowModel();b.position.set(0,-0.66,0.04);player.armR.add(b);player.bow=b;
  const k=makeKnifeModel();k.position.set(0,-0.68,0.03);player.armR.add(k);player.knife=k;
  [r,b,k].forEach(m=>{m.visible=false;shadows(m);});
  const fr=makeRifleModel();fr.rotation.y=Math.PI;fr.position.set(-0.05,0.02,-0.05);
  const fb=makeBowModel();fb.rotation.y=Math.PI;fb.position.set(-0.12,0.05,-0.2);fb.rotation.z=0.25;
  const fk=makeKnifeModel();fk.rotation.y=Math.PI;fk.position.set(0,0,-0.12);
  Object.assign(fpTool.tools,{rifle:fr,bow:fb,knife:fk});
  [fr,fb,fk].forEach(m=>{m.visible=false;fpTool.arm.add(m);m.traverse(o=>{if(o.isMesh)o.castShadow=false;});});
}
const _updToolVisH=updateToolVisual;
updateToolVisual=function(){
  _updToolVisH();
  const show=S.mode==='foot'&&!P.carry&&!P.pail,k=TOOL?TOOL.kind:null;
  player.rifle.visible=show&&k==='rifle';player.bow.visible=show&&k==='bow';player.knife.visible=show&&k==='knife';
};
const _thumbH=toolThumbModel;
toolThumbModel=function(t){
  if(t.kind==='rifle'){const g=new T.Group(),m=makeRifleModel();m.rotation.y=Math.PI/2;g.add(m);return g;}
  if(t.kind==='bow'){const g=new T.Group(),m=makeBowModel();m.rotation.y=-Math.PI/2;g.add(m);return g;}
  if(t.kind==='knife'){const g=new T.Group(),m=makeKnifeModel();m.rotation.y=Math.PI/2;g.add(m);g.rotation.z=0.5;return g;}
  return _thumbH(t);
};

/* ----- Jour de chasse : la limite repart chaque matin ----- */
function huntDayCheck(){const d=S.wx.day||0;if(S.hunt.day!==d){S.hunt.day=d;S.hunt.deer=0;}}
function deerLeft(){huntDayCheck();return Math.max(0,HUNT_DEER_DAY-S.hunt.deer);}

/* ----- Viser et tirer ----- */
function aimInfo(){
  if(SCOPE)return {yaw:camYaw,pitch:camPitch,extra:-0.015};
  if(camMode==='fp')return {yaw:camYaw,pitch:camPitch,extra:0};
  if(camMode==='tp')return {yaw:camYaw,pitch:null,extra:0.09};
  return {yaw:P.rot,pitch:null,extra:0.25};
}
// L'animal le mieux aligné avec la visée, dans la portée de l'arme
function aimTarget(w){
  const a=aimInfo(),eye=H(P.x,P.z)+1.65;let best=null,bs=1e9;
  animals.forEach(an=>{
    const dx=an.x-P.x,dz=an.z-P.z,d=Math.hypot(dx,dz);if(d>w.range||d<1)return;
    const size=an.kind==='deer'?0.55:0.2,tol=w.cone+a.extra+Math.atan(size/d);
    const off=Math.abs(wrapAng(Math.atan2(dx,dz)-a.yaw));if(off>tol)return;
    if(a.pitch!==null){const ty=H(an.x,an.z)+(an.kind==='deer'?0.95:0.2),p=Math.atan2(ty-eye,d);if(Math.abs(p-a.pitch)>w.cone+Math.atan(size/d)+0.03)return;}
    const sc=off/tol+d/w.range*0.3;if(sc<bs){bs=sc;best={an,d};}
  });
  return best;
}
// Un arbre (ou autre obstacle) entre le tireur et la cible?
function blockedShot(tx,tz,d){
  const ux=(tx-P.x)/d,uz=(tz-P.z)/d;
  for(let s=1.2;s<d-0.8;s+=0.6){const x=P.x+ux*s,z=P.z+uz*s;if(hits(x,z,0.02))return {x,z};}
  return null;
}
function weaponOf(){return TOOL&&(TOOL.kind==='rifle'||TOOL.kind==='bow')?AMMO[TOOL.kind]:null;}
function huntClick(){if(!weaponOf()||S.mode!=='foot'||P.carry||P.pail)return false;shoot();return true;}
function scareAnimals(x,z,r){animals.forEach(a=>{if(Math.hypot(a.x-x,a.z-z)<r){a.st='flee';a.t=4+Math.random()*3;a.sp=a.kind==='deer'?9:7;}});}
function shoot(){
  const w=weaponOf();if(!w)return;
  if(P.cool>0)return;
  if(!S.hunt.permit){toast('Il te faut un permis de chasse — en vente au magasin général');return;}
  if(!invCount(w.id)){toast(`Plus de ${w.n} : achètes-en au magasin`);return;}
  const tg=aimTarget(w);
  if(tg&&tg.an.kind==='deer'&&deerLeft()<=0){toast(`Limite du permis atteinte : ${HUNT_DEER_DAY} chevreuils par jour. Reviens demain!`);return;}
  // Le coup part
  const slot=INV.findIndex(s=>s&&s.id===w.id);invTake(slot,1);
  P.cool=TOOL.delay;P.swing=0;
  if(TOOL.kind==='rifle')sfxShot(P.x,P.z);else sfxBow(P.x,P.z);
  fpKick=1;
  if(tg)P.rot=Math.atan2(tg.an.x-P.x,tg.an.z-P.z);
  scareAnimals(P.x,P.z,w.scare);
  if(typeof NET!=='undefined'&&NET.on)netShotSound(TOOL.kind);
  if(!tg){toast(TOOL.kind==='rifle'?'Raté : rien dans la mire':'La flèche se perd dans le bois');return;}
  const bl=blockedShot(tg.an.x,tg.an.z,tg.d);
  if(bl){sfxKnock(bl.x,bl.z,0.6);toast(TOOL.kind==='rifle'?'La balle s\'est logée dans un arbre':'La flèche s\'est plantée dans un arbre');return;}
  if(Math.random()>w.hit(tg.d)){toast(`Raté de peu! (${Math.round(tg.d)} m)`);return;}
  killAnimal(tg.an,tg.d);
}
function killAnimal(an,d){
  const i=animals.indexOf(an);if(i>=0)animals.splice(i,1);scene.remove(an.g);
  const c={id:uid(),kind:an.kind,x:an.x,z:an.z,rot:an.rot,buck:!!an.buck,work:0};
  S.carcs.push(c);spawnCarc(c);sfxThud(an.x,an.z);
  if(an.kind==='deer'){S.hunt.deer++;toast(`🦌 ${an.buck?'Un mâle':'Un chevreuil'} à ${Math.round(d)} m! (${S.hunt.deer}/${HUNT_DEER_DAY} aujourd'hui) — dépèce-le avec un couteau`);jlog(`a abattu ${an.buck?'un chevreuil mâle':'un chevreuil'} à ${Math.round(d)} m`);}
  else{toast(`🐇 Lièvre abattu à ${Math.round(d)} m!`);jlog('a abattu un lièvre');}
}

/* ----- Gibier au sol ----- */
function spawnCarc(c){
  const g=new T.Group(),m=c.kind==='deer'?makeDeer(c.buck):makeHare(false);
  if(c.kind==='deer'){m.g.rotation.z=Math.PI/2;m.g.position.set(0.95,0.22,0);m.head.rotation.x=0.9;m.legs.forEach((l,i)=>l.rotation.x=(i<2?0.55:-0.45)+(i%2?0.15:-0.1));}
  else{m.g.rotation.z=Math.PI/2;m.g.position.set(0.16,0.1,0);}
  g.add(m.g);g.position.set(c.x,H(c.x,c.z),c.z);g.rotation.y=c.rot;shadows(g);scene.add(g);c.mesh=g;
}
function removeCarc(c){const i=S.carcs.indexOf(c);if(i>=0)S.carcs.splice(i,1);if(c.mesh)scene.remove(c.mesh);}
function nearestCarc(r){let b=null,bd=r;S.carcs.forEach(c=>{const d=Math.hypot(P.x-c.x,P.z-c.z);if(d<bd){bd=d;b=c;}});return b;}
const DRESS_N={deer:6,hare:2};
function dressStroke(c){
  if(P.cool>0)return;
  P.cool=0.55;c.work=Math.min(1,(c.work||0)+1/DRESS_N[c.kind]);sfxKnife(c.x,c.z);
  P.rot=Math.atan2(c.x-P.x,c.z-P.z);P.swing=0;
  if(c.work>=0.999){
    const deer=c.kind==='deer',k=deer?'chevreuil':'lievre';
    const kgs=deer?(c.buck?24+Math.random()*12:16+Math.random()*9):0.9+Math.random()*0.7;
    removeCarc(c);giveItem({id:'viande:'+k,n:1,w:[Math.round(kgs*100)/100]});
    toast(`🥩 ${kg(kgs)} de viande de ${deer?'chevreuil':'lièvre'} — à vendre au magasin`);
  }
}

/* ----- Collets ----- */
function makeSnareModel(){
  const g=new T.Group();
  g.add(new T.Mesh(new T.CylinderGeometry(0.02,0.025,0.42,6).translate(0,0.21,0),mat(0x6b4a2c)));
  g.add(new T.Mesh(new T.TorusGeometry(0.1,0.006,4,18).translate(0,0.14,0.13),mat(0xb8bec4)));
  g.add(new T.Mesh(new T.CylinderGeometry(0.004,0.004,0.16,3).rotateX(Math.PI/2).translate(0,0.2,0.06),mat(0xb8bec4)));
  return g;
}
function spawnSnare(s){
  const g=new T.Group();g.add(makeSnareModel());
  const h=makeHare(false);h.g.rotation.z=Math.PI/2;h.g.position.set(0.16,0.1,0.35);h.g.visible=!!s.caught;g.add(h.g);s.hareM=h.g;
  g.position.set(s.x,H(s.x,s.z),s.z);g.rotation.y=s.rot;shadows(g);scene.add(g);s.mesh=g;
}
function removeSnare(s){const i=S.snares.indexOf(s);if(i>=0)S.snares.splice(i,1);if(s.mesh)scene.remove(s.mesh);}
function nearestSnare(r){let b=null,bd=r;S.snares.forEach(s=>{const d=Math.hypot(P.x-s.x,P.z-s.z);if(d<bd){bd=d;b=s;}});return b;}
function snareSpotOk(x,z){return Math.hypot(x-CAMP.x,z-CAMP.z)>CAMP_FLAT+2&&vilOut(x,z)>3&&waterDepth(x,z)<0&&!S.snares.some(s=>Math.hypot(s.x-x,s.z-z)<4);}
function setSnare(t){
  if(!S.hunt.permit){toast('Il te faut un permis de chasse pour poser des collets');return;}
  const a=Math.atan2(P.x-t.x,P.z-t.z),x=t.x+Math.sin(a)*0.55*Math.max(1,t.s||1),z=t.z+Math.cos(a)*0.55*Math.max(1,t.s||1);
  if(!snareSpotOk(x,z)){toast('Pas ici : en forêt, loin du camp, du village et des autres collets (4 m)');return;}
  const slot=INV.findIndex(s=>s&&s.id==='collet');if(slot<0)return;invTake(slot,1);
  const s={id:uid(),x,z,rot:a,wait:snareWait(),caught:false};S.snares.push(s);spawnSnare(s);
  toast('➰ Collet posé. Reviens plus tard voir s\'il y a un lièvre.');
}
function snareWait(){return 120+Math.random()*240;}   // 2 à 6 minutes de jeu
function checkSnare(s){
  if(!s.caught){toast('Rien encore dans ce collet');return;}
  s.caught=false;s.wait=snareWait();s.hareM.visible=false;
  const c={id:uid(),kind:'hare',x:P.x+Math.sin(P.rot)*0.6,z:P.z+Math.cos(P.rot)*0.6,rot:P.rot,buck:false,work:0};S.carcs.push(c);spawnCarc(c);
  toast('🐇 Un lièvre! Le collet est remis en place.');jlog('a pris un lièvre au collet');
}
function takeSnare(s){removeSnare(s);giveItem({id:'collet',n:1});toast('Collet ramassé');}

/* ----- Ce qu'on peut faire (bouton d'action) ----- */
function huntContext(){
  if(P.carry||P.pail)return null;
  const sn=nearestSnare(1.4);
  if(sn)return {act:sn.caught?{label:'Prendre le lièvre du collet',fn:()=>checkSnare(sn)}:null,act2:{label:'Retirer le collet',fn:()=>takeSnare(sn)},info:sn.caught?'':'Collet tendu : rien encore'};
  const c=nearestCarc(1.8);
  if(c){const nm=c.kind==='deer'?'le chevreuil':'le lièvre',tot=DRESS_N[c.kind];
    if(!TOOL||TOOL.kind!=='knife')return {info:hasKnife()?`Prends le couteau dans tes mains pour dépecer ${nm}`:`Pour dépecer ${nm}, il te faut un couteau (magasin)`};
    return {act:{label:`Dépecer ${nm} (${Math.round((c.work||0)*tot)}/${tot})`,fn:()=>dressStroke(c),cool:true}};}
  const w=weaponOf();
  if(w){const n=invCount(w.id);
    const lim=S.hunt.permit?` · chevreuils : ${HUNT_DEER_DAY-deerLeft()}/${HUNT_DEER_DAY} aujourd'hui`:' · pas de permis!';
    return {act:{label:n?`Tirer (${n} ${w.n})`:`Plus de ${w.n}`,fn:shoot,cool:true},info:(camMode==='fp'?'Vise avec la mire':camMode==='tp'?'Vise dans la direction de la caméra':'Tourne-toi vers l\'animal')+lim};}
  const it=heldItem();
  if(it&&it.id==='collet'){const t=nearestTree(1.6);
    return t?{act:{label:'Poser un collet au pied de l\'arbre',fn:()=>setSnare(t)}}:{info:'Approche-toi d\'un arbre en forêt pour poser le collet'};}
  if(TOOL&&TOOL.kind==='knife')return {info:'Le couteau sert à dépecer le gibier'};
  return null;
}

/* ----- Mise à jour : jour, collets (celui qui mène le monde), petit recul de l'arme en 1re personne ----- */
let fpKick=0;
function updateHunt(dt){
  huntDayCheck();
  if(leadsWorld())S.snares.forEach(s=>{if(s.caught)return;s.wait-=dt;if(s.wait<=0){if(Math.random()<0.55){s.caught=true;s.hareM.visible=true;}else s.wait=snareWait();}});
  else S.snares.forEach(s=>{if(s.hareM)s.hareM.visible=!!s.caught;});
  if(fpKick>0){fpKick=Math.max(0,fpKick-dt*5);if(fpTool.g.visible){fpTool.arm.rotation.x-=fpKick*0.35;fpTool.arm.position.z+=fpKick*0.06;}}
  $('cross').classList.toggle('aim',!!weaponOf()&&S.mode==='foot');
}

/* ----- Sons ----- */
function sfxShot(x,z){if(!ready())return;const sp=spatial(x,z,140);if(sp.g<0.005)return;const t=AU.ctx.currentTime,o=out(Math.min(1,sp.g*1.2),sp.pan);
  burst(o,t,0.35,'lowpass',1800,0.7,0.9,0.001);burst(o,t+0.02,1.2,'lowpass',400,0.5,0.35,0.01);tone(o,t,0.18,'sine',120,40,0.6,0.002);}
function sfxBow(x,z){if(!ready())return;const sp=spatial(x,z,30);if(sp.g<0.01)return;const t=AU.ctx.currentTime,o=out(sp.g*0.7,sp.pan);
  tone(o,t,0.25,'triangle',190,150,0.35,0.002);burst(o,t,0.18,'bandpass',2200,2,0.25,0.002);}
function sfxKnife(x,z){if(!ready())return;const sp=spatial(x,z,15);const t=AU.ctx.currentTime,o=out(sp.g*0.5,sp.pan);burst(o,t,0.2,'bandpass',3200,3,0.3,0.01);}
// En réseau : les autres entendent le coup de feu
// (passe par le canal des émoticônes, que le serveur relaie déjà : « fx:shot » ou « fx:bow »)
function netShotSound(kind){try{netSend({t:'emote',e:kind==='rifle'?'fx:shot':'fx:bow'});}catch(e){}}
function onNetFx(from,e){const a=NET.avatars[from];if(!a)return;if(e==='fx:shot')sfxShot(a.x,a.z);else if(e==='fx:bow')sfxBow(a.x,a.z);scareAnimals(a.x,a.z,e==='fx:shot'?90:22);}

/* ----- Au magasin : vendre la viande, permis, armes et accessoires ----- */
function renderHuntShop(L,sec){
  const row=(icon,html,btnTxt,dis,fn)=>{const d=document.createElement('div');d.className='item';d.innerHTML=icon+`<div class="txt">${html}</div>`;
    const b=document.createElement('button');b.textContent=btnTxt;b.disabled=dis;b.onclick=fn;d.appendChild(b);L.appendChild(d);return d;};
  const meat=INV.map((s,i)=>[s,i]).filter(([s])=>s&&s.id.startsWith('viande:'));
  if(meat.length){
    sec('Vendre ta viande');
    meat.forEach(([s,i])=>{const v=meatValue(s),w=(s.w||[]).reduce((a,b)=>a+b,0),d=itemDef(s.id);
      row('<div class="thumb emoji">🥩</div>',`<b>${itemLabel(s)}</b> — ${v} $<p>${kg(w)} à ${MEAT[d.meat].pkg} $/kg</p>`,'Vendre',false,()=>{INV[i]=null;S.money+=v;J.sell(`${kg(w)} de ${d.name.toLowerCase()}`,v);syncTool();renderInv();sfxCash();toast(`🥩 +${v} $`);renderShop();});});
  }
  sec('Chasse et piégeage');
  huntDayCheck();
  row('<div class="thumb emoji">📄</div>',`<b>Permis de chasse</b> — ${PERMIT_PRICE} $<p>Obligatoire pour chasser et poser des collets. Limite : ${HUNT_DEER_DAY} chevreuils par jour.</p>`+
    (S.hunt.permit?`<p class="stats">Tu l'as · chevreuils aujourd'hui : ${S.hunt.deer}/${HUNT_DEER_DAY}</p>`:''),
    S.hunt.permit?'Déjà acheté':'Acheter',S.hunt.permit||S.money<PERMIT_PRICE,()=>{if(S.money<PERMIT_PRICE)return;S.money-=PERMIT_PRICE;S.hunt.permit=true;J.buy('un permis de chasse',PERMIT_PRICE);sfxCash();toast('📄 Permis de chasse en poche!');renderShop();});
  TOOLS.filter(t=>t.hunt).forEach(t=>{
    const have=invCount(t.id);
    row(imgTag(thumb(t.id,()=>toolThumbModel(t),true)),`<b>${t.name}</b> — ${t.price} $<p>${t.desc}</p>`+(have?'<p class="stats">Tu en as un</p>':''),'Acheter',S.money<t.price,
      ()=>{if(S.money<t.price)return;S.money-=t.price;giveItem({id:t.id,n:1});J.buy(t.name.toLowerCase(),t.price);sfxCash();toast(`${t.name} : dans ton inventaire!`);renderShop();});
  });
  HUNT_GEAR.forEach(g=>{
    row(`<div class="thumb emoji">${g.id==='fleches'?ARROW_ICON:g.emo}</div>`,`<b>${g.name}</b> — ${g.price} $<p>${g.desc}</p><p class="stats">Tu en as ${invCount(g.id)}</p>`,'Acheter',S.money<g.price,
      ()=>{if(S.money<g.price)return;S.money-=g.price;giveItem({id:g.id,n:g.n});J.buy(g.name.toLowerCase(),g.price);sfxCash();toast(`${g.emo} ${g.name} : dans ton inventaire`);renderShop();});
  });
}
