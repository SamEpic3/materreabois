/* Sauvegarde locale : toute la partie est gardée dans ce navigateur, et ce qui avance avec le temps
   (chaudières, bouilloire, feux, arbres plantés) continue pendant l'absence. */
const SAVE_VER=2;   // v2 : monde et joueurs séparés (v1 encore lue)
// Signature de la forêt de départ : si le code du monde change, on ne réapplique pas l'état des arbres.
const WORLD_SIG=`${ORIG_TREE_N}-${campStumps.length}-${Math.round(treeList[0].x*1000)}-${Math.round(treeList[ORIG_TREE_N-1].z*1000)}`;   // forêt de départ seulement
let saveOff=false;
const r3=v=>Math.round(v*1000)/1000;
function cOf(c){const o={sp:c.sp,len:r3(c.len),ra:r3(c.ra),rb:r3(c.rb)};if(c.split)o.split=c.split;return o;}
function contSnap(c){return {logs:c.load.map(m=>cOf(m.userData.c)),pails:(c.pails||[]).map(p=>({kind:p.kind,L:p.L}))};}
function snapshot(){
  const f=flatSnapshot(),me={name:ME.name,player:f.player,inv:f.inv,hot:f.hot,t:f.t};
  delete f.player;delete f.inv;delete f.hot;delete f.ver;delete f.sig;
  return {ver:SAVE_VER,sig:WORLD_SIG,t:me.t,world:f,players:Object.assign({},S.others,{[ME.id]:me}),journal:S.journal};
}
// Ancienne forme « tout à plat » : sert aussi à lire les sauvegardes v1
function flatSnapshot(){
  const pcs=pieces.map(p=>({id:p.id,cx:r3(p.cx),cz:r3(p.cz),rot:r3(p.rot),crown:p.crown?1:0,...cOf(p)}));
  vehicles.forEach(v=>{if(!v.drag)return;const {butt,top}=dragEnds(v),d=v.drag;
    pcs.push({cx:(butt.x+top.x)/2,cz:(butt.z+top.z)/2,rot:Math.atan2(top.x-butt.x,top.z-butt.z),...cOf(d)});});
  trailers.forEach(t=>{if(t.crane&&t.crane.held){const g=gripWorld(t);pcs.push({cx:g.x,cz:g.z,rot:t.th+t.crane.slew+t.crane.grip,...cOf(t.crane.held)});}});
  return {
    ver:SAVE_VER,sig:WORLD_SIG,t:Date.now(),
    money:S.money,delivered:S.delivered,yardCount,taps:S.taps,
    mkt:S.mkt,mktPrev:S.mktPrev,mktNext:S.mktNext,
    inv:INV.map(s=>s?{id:s.id,n:s.n,w:s.w?s.w.map(r3):undefined}:null),hot:S.hot,
    drops:S.drops.map(d=>({id:d.id,it:d.it,x:r3(d.x),z:r3(d.z)})),
    player:{x:r3(S.inside?CABIN_DOOR.x:P.x),z:r3(S.inside?CABIN_DOOR.z+0.5:P.z),rot:r3(P.rot),carry:P.carry?cOf(P.carry):null,pail:P.pail?{kind:P.pail.kind,L:P.pail.L}:null},
    trees:treeList.map((t,i)=>!t.alive?[i,1,t.stumpGone?1:0]:t.work>0?[i,0,r3(t.work)]:null).filter(Boolean),
    campStumps:campStumps.map((s,i)=>s.gone?[i,1]:s.work>0?[i,0,r3(s.work)]:null).filter(Boolean),
    extraStumps:stumpList.filter(s=>s.tree&&s.tree.planted).map(s=>({id:s.id,x:s.x,z:s.z,s:s.size,type:s.tree.type,work:r3(s.work)})),
    pieces:pcs,
    vehicles:vehicles.map(v=>({id:v.id,type:v.type,x:r3(v.x),z:r3(v.z),th:r3(v.th),resale:v.resale,bed:v.bed?contSnap(v.bed):null})),
    trailers:trailers.map(t=>({id:t.id,kind:t.kind,x:r3(t.x),z:r3(t.z),th:r3(t.th),hitch:t.hitch?vehicles.indexOf(t.hitch):-1,resale:t.resale,c:contSnap(t.c)})),
    pails:pails.map(p=>({id:p.id,x:r3(p.x),z:r3(p.z),kind:p.kind,L:p.L})),
    tapsOn:taps.map(tp=>({tree:tp.t.planted?'p'+planted.indexOf(tp.t):treeList.indexOf(tp.t),sap:tp.sap,a:r3(tp.mesh.rotation.y)})),
    planted:planted.map(t=>({id:t.id,type:t.type,x:r3(t.x),z:r3(t.z),s:r3(t.s),rot:r3(t.rot),plantedAt:t.plantedAt,growMs:t.growMs,work:t.work})),
    camp:S.camp,stove:stove.fuel,wx:{clock:r3(S.wx.clock),type:S.wx.type,left:r3(S.wx.left)},
    builds:S.builds.map(b=>{const o={};for(const k in b){if(k==='_o')continue;o[k]=k==='logs'?b.logs.map(cOf):typeof b[k]==='number'?r3(b[k]):b[k];}return o;})
  };
}
function saveGame(){if(saveOff)return;Stockage.sauver(snapshot());}

function fillCont(cont,o){
  (o.logs||[]).forEach((c,i)=>{const sl=(cont.slots||[])[i];if(!sl)return;const m=makePieceMesh(c);m.position.set(sl[0],sl[1],0);m.userData.c=c;cont.cargo.add(m);cont.load.push(m);});
  (o.pails||[]).forEach((p,i)=>{const sl=(cont.pslots||[])[i];if(!sl)return;const m=makePail();m.position.set(sl[0],0,sl[1]);setPailLook(m,p);cont.cargo.add(m);cont.pails.push({kind:p.kind,L:p.L,mesh:m});});
}
function clearAllVehicles(){
  vehicles.forEach(v=>scene.remove(v.mesh.g));vehicles.length=0;
  trailers.forEach(t=>{scene.remove(t.mesh.g);scene.remove(t.mark);});trailers.length=0;
}
function loadGame(given){
  let d=given||Stockage.charger();
  if(!d||(d.ver!==1&&d.ver!==2))return null;
  if(d.ver===2){   // on remet le monde et MON joueur à plat; les autres joueurs sont gardés à part
    const me=(d.players||{})[ME.id]||null;
    S.others={};for(const id in d.players||{})if(id!==ME.id)S.others[id]=d.players[id];
    S.journal=d.journal||[];compactJournal();
    d=Object.assign({},d.world,{sig:d.sig,t:d.t,player:me?me.player:null,inv:me?me.inv:null,hot:me?me.hot:0});
  }
  S.money=d.money;S.delivered=d.delivered;S.taps=d.taps;
  if(d.wx)Object.assign(S.wx,d.wx);
  yardCount=d.yardCount||0;for(let i=Math.max(0,yardCount-60);i<yardCount;i++)addYardLog({sp:'sapin',len:2.44,ra:0.2,rb:0.17},i);
  if(d.mkt){Object.assign(S.mkt,d.mkt);Object.assign(S.mktPrev,d.mktPrev||{});S.mktNext=d.mktNext||MKT_PERIOD;}
  if(d.inv){INV.fill(null);d.inv.forEach((s,i)=>{if(s&&i<INV_N)INV[i]={id:s.id,n:s.n,w:s.w?s.w.slice():undefined};});}
  else invFromOld(d.owned,d.seeds);           // vieille sauvegarde : outils et plants deviennent des objets
  S.drops.slice().forEach(removeDrop);(d.drops||[]).forEach(o=>dropItem(o.it,o.x,o.z,o.id));
  const same=d.sig===WORLD_SIG;
  if(same){
    (d.trees||[]).forEach(([i,f,x])=>{const t=treeList[i];if(!t)return;if(f){hideTree(t);if(x)t.stumpGone=true;else makeStump(t);}else t.work=x;});
    (d.campStumps||[]).forEach(([i,f,w])=>{const s=campStumps[i];if(!s)return;if(f)removeStump(s,true);else s.work=w;});
  }
  (d.extraStumps||[]).forEach(o=>{const st=makeStump({id:o.id,x:o.x,z:o.z,y:H(o.x,o.z),s:o.s,type:o.type,planted:true});st.work=o.work||0;});
  (d.pieces||[]).forEach(p=>addPiece({id:p.id,cx:p.cx,cz:p.cz,rot:p.rot,len:p.len,ra:p.ra,rb:p.rb,sp:p.sp,split:p.split||0,crown:!!p.crown}));
  clearAllVehicles();
  (d.vehicles||[]).forEach(o=>{const v=makeVehicle(o.type,o.x,o.z,o.th,o.id);if(o.resale!==undefined)v.resale=o.resale;if(o.bed&&v.bed)fillCont(v.bed,o.bed);});
  (d.trailers||[]).forEach(o=>{const t=makeTrailerObj(o.kind,o.x,o.z,o.th,o.id);if(o.resale!==undefined)t.resale=o.resale;if(o.hitch>=0&&vehicles[o.hitch])t.hitch=vehicles[o.hitch];fillCont(t.c,o.c||{});});
  V=vehicles[0]||null;
  pails.forEach(p=>scene.remove(p.mesh));pails.length=0;(d.pails||[]).forEach(p=>addGroundPail(p.x,p.z,p.kind,p.L,p.id));
  (d.planted||[]).forEach(o=>addPlanted(o));
  (d.tapsOn||[]).forEach(o=>{const t=typeof o.tree==='string'?planted[+o.tree.slice(1)]:(same?treeList[o.tree]:null);if(t&&t.alive&&!tapOf(t))placeTap(t,o.a,o.sap);});
  Object.keys(d.camp||{}).forEach(id=>{if(d.camp[id]&&BUILD[id])buildUpgrade(id);});
  stove.fuel=d.stove||0;
  if(d.builds)d.builds.forEach(o=>{const {k,x,z,rot}=o;if(!KINDS[k])return;const st=Object.assign({},o);delete st.k;delete st.x;delete st.z;delete st.rot;addBuild(k,{x,z,rot},st);});
  else{   // anciennes sauvegardes : une seule construction de chaque sorte
    const cp=d.campPos||{},c=d.camp||{},b=d.boil||{};
    if(c.feu)addBuild('feu',cp.feu||{x:-3.5,z:-6.5,rot:0},{fuel:d.campFire||0});
    if(c.abri)addBuild('abri',cp.abri||{x:-13.6,z:-3.2,rot:Math.atan2(13.6,3.2)},{logs:d.shed||[]});
    if(c.sucres||!d.campPos)addBuild('sucres',cp.sucres||{x:-10,z:-7,rot:0},{fuel:b.fuel||0,sap:b.sap||0,syrup:b.syrup||0});
  }
  if(d.player){P.x=d.player.x;P.z=d.player.z;P.rot=d.player.rot;if(d.player.carry)setCarry(d.player.carry);if(d.player.pail)setPail(d.player.pail);}
  showOthers();
  S.hot=clamp(d.hot||0,0,HOT_N-1);syncTool();
  // Ce qui a avancé pendant l'absence (48 h maximum)
  const away=clamp((Date.now()-d.t)/1000,0,48*3600);
  let sap=0;taps.forEach(tp=>{const add=Math.min(TAP_CAP-tp.sap,SAP_RATE*away);tp.sap+=add;sap+=add;});
  let ev=0;
  S.builds.forEach(b=>{
    if(b.k==='sucres'){const burn=Math.min(b.fuel,away),e=Math.min(b.sap,BOIL_RATE*burn);b.sap-=e;b.syrup+=e/SAP_PER_SYRUP;b.fuel-=burn;ev+=e;}
    else if(b.k==='feu')b.fuel=Math.max(0,b.fuel-away);else if(b.k==='bbq')b.lit=0;
  });
  stove.fuel=Math.max(0,stove.fuel-away);
  S.mktNext-=away;
  const grown=planted.filter(t=>t.plantedAt+t.growMs<=Date.now()&&t.plantedAt+t.growMs>d.t).length;
  return {away,sap,syrup:ev/SAP_PER_SYRUP,grown};
}
function fmtAway(s){const m=Math.round(s/60);return m<60?`${m} min`:`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`;}
renderHotbar();updateToolVisual();
let started=false;
saveOff=true;                       // rien n'est sauvegardé avant que la partie commence
// Démarre la partie avec une sauvegarde (celle du navigateur, ou celle reçue du serveur)
function beginWorld(d){
  started=true;
  const r=loadGame(d);saveOff=false;
  if(r){
    camT.set(P.x,H(P.x,P.z),P.z);
    const bits=[];
    if(r.sap>0.5)bits.push(`${fmtL(r.sap)} d'eau d'érable dans les chaudières`);
    if(r.syrup>0.05)bits.push(`${fmtL(r.syrup)} de sirop dans la bouilloire`);
    if(r.grown)bits.push(`${r.grown} arbre${r.grown>1?'s ont':' a'} fini de pousser`);
    setTimeout(()=>toast(r.away>120&&bits.length?`Absent ${fmtAway(r.away)} : ${bits.join(', ')}`:'Partie reprise'),600);
  }
  $('help').classList.add('hidden');$('helpClose').classList.remove('hidden');
}
setInterval(()=>{if(started)saveGame();},10000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveGame();});
addEventListener('pagehide',saveGame);
// Nouvelle partie : deux appuis pour confirmer
{
  const b=$('btnReset');let armed=0;
  b.addEventListener('click',()=>{
    if(Date.now()-armed<4000){saveOff=true;Stockage.effacer(SAVE_KEY);location.reload();return;}
    armed=Date.now();b.textContent='Appuie encore pour tout effacer';setTimeout(()=>{b.textContent='Nouvelle partie (efface la sauvegarde)';},4000);
  });
}
