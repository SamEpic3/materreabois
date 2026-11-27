/* Jeu à plusieurs en même temps.
   Chaque joueur fait tourner le jeu chez lui. Plusieurs fois par seconde, on compare le monde avec ce que les
   autres connaissent déjà (collection par collection : billots, arbres, véhicules, constructions…) et on n'envoie
   que les différences. Les positions des joueurs et des véhicules conduits sont envoyées à part, 10 fois par seconde.
   L'argent et les compteurs voyagent en « + / − » pour que deux ventes en même temps s'additionnent.
   Le premier joueur arrivé est l'hôte : il fait changer les prix et envoie une photo complète de la terre au serveur. */
const SERVER_DEFAULT='wss://materreabois-serveur.onrender.com';
const NET={on:false,ready:false,ws:null,room:'',host:false,hostId:null,lastSeq:0,base:{},scal:{},online:{},
  avatars:{},sendT:0,posT:0,snapT:0,meT:0,retry:0,closedByUs:false,welcomed:false};
function serverUrl(){
  const q=new URLSearchParams(location.search).get('serveur');
  return q||localStorage.getItem('terre-a-bois-serveur')||SERVER_DEFAULT;
}
const rd=(v,k)=>Math.round(v*k)/k;
// Chaque onglet a son numéro. Si le même joueur ouvre la terre dans deux onglets, le 2e devient un autre joueur.
const TAB_ID=(()=>{try{let t=sessionStorage.getItem('terre-a-bois-onglet');if(!t){t=Math.random().toString(36).slice(2,8);sessionStorage.setItem('terre-a-bois-onglet',t);}return t;}catch(e){return Math.random().toString(36).slice(2,8);}})();
// Onglet en double : toujours la même identité de rechange (Sam (2), Sam (3)…), pour ne pas créer un nouveau joueur à chaque fois
function useTabIdentity(n){n=n||2;ME.id=ME.id.replace(/~.*$/,'')+'~'+n;ME.name=(ME.name||'Moi').replace(/ \(\d+\)$/,'')+' ('+n+')';ME.tabAlt=n;}
try{const n=+sessionStorage.getItem('terre-a-bois-alt');if(n>1)useTabIdentity(n);}catch(e){}

/* ---------- Collections synchronisées ---------- */
const treeRef=t=>t.planted?'p'+t.id:'t'+treeList.indexOf(t);
function treeFromRef(r){return r[0]==='p'?planted.find(t=>t.id===r.slice(1)):treeList[+r.slice(1)];}
function stumpOfTree(){const m=new Map();stumpList.forEach(s=>{if(s.tree)m.set(s.tree,s);});return m;}
function contOf(id){if(id[0]==='b'){const v=vehicles.find(v=>v.id===id.slice(1));return v&&v.bed;}const t=trailers.find(t=>t.id===id.slice(1));return t&&t.c;}
function removeVehicle(v){
  if(V===v&&S.mode==='vtt')return;            // on ne retire pas le véhicule sous nos fesses
  const tw=towed(v);if(tw)tw.hitch=null;
  scene.remove(v.mesh.g);vehicles.splice(vehicles.indexOf(v),1);if(V===v)V=vehicles[0]||null;
}
function removeTrailer(t){scene.remove(t.mesh.g);scene.remove(t.mark);trailers.splice(trailers.indexOf(t),1);}
// Chute d'un arbre abattu par l'autre joueur (les billots arrivent par la synchro)
function remoteFell(t,fd){
  if(!t.alive)return;
  hideTree(t);
  const g=treeGroupFromParts(t.parts);g.position.set(t.x,t.y,t.z);scene.add(g);
  let fx=fd?fd[0]:1,fz=fd?fd[1]:0;
  falling.push({t,g,fx,fz,axis:new T.Vector3(fz,0,-fx),time:0,remote:true});
  makeStump(t);
}
const COLS=[
  {c:'pc',items:()=>pieces.map(p=>[p.id,p]),
   key:p=>`${rd(p.cx,50)},${rd(p.cz,50)},${rd(p.rot,50)},${rd(p.len,1000)},${p.split||0},${p.crown?1:0}`,
   ser:p=>({cx:rd(p.cx,1000),cz:rd(p.cz,1000),rot:rd(p.rot,1000),len:p.len,ra:p.ra,rb:p.rb,sp:p.sp,split:p.split||0,crown:p.crown?1:0}),
   set:(id,d)=>{const o=pieces.find(p=>p.id===id);
     if(o&&o.len===d.len&&(o.split||0)===(d.split||0)&&o.sp===d.sp&&!!o.crown===!!d.crown){o.cx=d.cx;o.cz=d.cz;o.rot=d.rot;placePiece(o);return;}
     if(o)removePiece(o);addPiece(Object.assign({id},d,{crown:!!d.crown}));},
   del:id=>{const o=pieces.find(p=>p.id===id);if(o)removePiece(o);},
   get:id=>pieces.find(p=>p.id===id)},
  {c:'tr',items:()=>{const sm=stumpOfTree(),a=[];treeList.forEach((t,i)=>{if(t.alive&&!t.work)return;a.push(['t'+i,t,sm.get(t)]);});return a;},
   key:(t,st)=>t.alive?'a'+rd(t.work,40):'f'+(t.stumpGone?1:0)+','+rd(st?st.work:0,20),
   ser:(t,st)=>({alive:t.alive?1:0,work:rd(t.work,1000),gone:t.stumpGone?1:0,sw:st?rd(st.work,100):0,fd:t.fd||null}),
   set:(id,d)=>{const t=treeList[+id.slice(1)];if(!t)return;
     if(d.alive){t.work=d.work;return;}
     if(t.alive)remoteFell(t,d.fd);
     const st=stumpList.find(s=>s.tree===t);
     if(d.gone){if(st)removeStump(st,true);else t.stumpGone=true;}else if(st)st.work=d.sw;},
   del:()=>{},
   get:id=>{const t=treeList[+id.slice(1)];return t&&[t,stumpList.find(s=>s.tree===t)];}},
  {c:'cs',items:()=>campStumps.map((s,i)=>['c'+i,s]).filter(x=>x[1].gone||x[1].work),
   key:s=>(s.gone?'g':'w')+rd(s.work,20),ser:s=>({gone:s.gone?1:0,work:rd(s.work,100)}),
   set:(id,d)=>{const s=campStumps[+id.slice(1)];if(!s)return;if(d.gone){if(!s.gone&&stumpList.includes(s))removeStump(s,true);}else s.work=d.work;},
   del:()=>{},get:id=>campStumps[+id.slice(1)]},
  {c:'pl',items:()=>planted.map(t=>[t.id,t]),key:t=>''+rd(t.work,40),
   ser:t=>({type:t.type,x:t.x,z:t.z,s:t.s,rot:t.rot,plantedAt:t.plantedAt,growMs:t.growMs,work:rd(t.work,1000)}),
   set:(id,d)=>{const t=planted.find(t=>t.id===id);if(t){t.work=d.work;return;}addPlanted(Object.assign({id},d));},
   del:id=>{const t=planted.find(t=>t.id===id);if(t)remoteFell(t,null);},
   get:id=>planted.find(t=>t.id===id)},
  {c:'xs',items:()=>stumpList.filter(s=>s.tree&&s.tree.planted).map(s=>[s.id,s]),key:s=>''+rd(s.work,20),
   ser:s=>({x:s.x,z:s.z,s:s.size,type:s.tree.type,work:rd(s.work,100)}),
   set:(id,d)=>{let s=stumpList.find(x=>x.id===id);if(!s)s=makeStump({id,x:d.x,z:d.z,y:H(d.x,d.z),s:d.s,type:d.type,planted:true});s.work=d.work;},
   del:id=>{const s=stumpList.find(x=>x.id===id);if(s)removeStump(s,true);},
   get:id=>stumpList.find(x=>x.id===id)},
  {c:'tp',items:()=>taps.map(tp=>[treeRef(tp.t),tp]),key:tp=>''+Math.round(tp.sap),
   ser:tp=>({sap:rd(tp.sap,100),a:rd(tp.mesh.rotation.y,1000)}),
   set:(id,d)=>{const t=treeFromRef(id);if(!t||!t.alive)return;const tp=tapOf(t);if(tp)tp.sap=d.sap;else placeTap(t,d.a,d.sap);},
   del:id=>{const t=treeFromRef(id),tp=t&&tapOf(t);if(tp){scene.remove(tp.mesh);taps.splice(taps.indexOf(tp),1);}},
   get:id=>{const t=treeFromRef(id);return t&&tapOf(t);}},
  {c:'pa',items:()=>pails.map(p=>[p.id,p]),key:p=>`${rd(p.x,20)},${rd(p.z,20)},${p.kind},${rd(p.L,2)}`,
   ser:p=>({x:rd(p.x,1000),z:rd(p.z,1000),kind:p.kind,L:rd(p.L,100)}),
   set:(id,d)=>{const o=pails.find(p=>p.id===id);if(o){scene.remove(o.mesh);pails.splice(pails.indexOf(o),1);}addGroundPail(d.x,d.z,d.kind,d.L,id);},
   del:id=>{const o=pails.find(p=>p.id===id);if(o){scene.remove(o.mesh);pails.splice(pails.indexOf(o),1);}},
   get:id=>pails.find(p=>p.id===id)},
  {c:'ve',items:()=>vehicles.map(v=>[v.id,v]),
   key:v=>`${v.type}|${v.driver||''}|${v.resale||''}|`+(v.driver?'':`${rd(v.x,100)},${rd(v.z,100)},${rd(v.th,100)}`),
   ser:v=>({type:v.type,x:rd(v.x,1000),z:rd(v.z,1000),th:rd(v.th,1000),resale:v.resale,driver:v.driver||null}),
   set:(id,d)=>{let v=vehicles.find(v=>v.id===id);if(!v){v=makeVehicle(d.type,d.x,d.z,d.th,id);if(!V)V=v;}
     if(d.resale!==undefined&&d.resale!==null)v.resale=d.resale;
     if(V===v&&S.mode==='vtt')return;
     v.driver=d.driver;if(!d.driver){v.x=d.x;v.z=d.z;v.th=d.th;v.v=0;v.net=null;}},
   del:id=>{const v=vehicles.find(v=>v.id===id);if(v)removeVehicle(v);},
   get:id=>vehicles.find(v=>v.id===id)},
  {c:'tl',items:()=>trailers.map(t=>[t.id,t]),
   key:t=>`${t.kind}|${t.hitch?t.hitch.id:''}|${t.resale||''}|${t.boat?1:0}|${Math.round((t.chips||0)*20)}|`+(t.hitch&&t.hitch.driver?'':`${rd(t.x,100)},${rd(t.z,100)},${rd(t.th,100)}`),
   ser:t=>({kind:t.kind,x:rd(t.x,1000),z:rd(t.z,1000),th:rd(t.th,1000),hitch:t.hitch?t.hitch.id:null,resale:t.resale,boat:t.boat,chips:t.chips||0}),
   set:(id,d)=>{let t=trailers.find(t=>t.id===id);if(!t)t=makeTrailerObj(d.kind,d.x,d.z,d.th,id);
     if(d.resale!==undefined&&d.resale!==null)t.resale=d.resale;
     if(d.boat!==undefined)t.boat=d.boat;
     if(d.chips!==undefined)t.chips=d.chips;
     if(t.hitch&&t.hitch===V&&S.mode==='vtt'&&d.hitch===V.id)return;
     t.hitch=d.hitch?vehicles.find(v=>v.id===d.hitch)||null:null;
     if(!(t.hitch&&t.hitch.driver)){t.x=d.x;t.z=d.z;t.th=d.th;t.net=null;}},
   del:id=>{const t=trailers.find(t=>t.id===id);if(t)removeTrailer(t);},
   get:id=>trailers.find(t=>t.id===id)},
  {c:'co',items:()=>{const a=[];vehicles.forEach(v=>{if(v.bed)a.push(['b'+v.id,v.bed]);});trailers.forEach(t=>{if(t.c.cap)a.push(['c'+t.id,t.c]);});return a;},
   key:c=>JSON.stringify(contSnap(c)),ser:c=>contSnap(c),
   set:(id,d)=>{const c=contOf(id);if(!c)return;c.load.forEach(m=>c.cargo.remove(m));c.load.length=0;(c.pails||[]).forEach(p=>c.cargo.remove(p.mesh));if(c.pails)c.pails.length=0;fillCont(c,d);},
   del:()=>{},get:id=>contOf(id)},
  {c:'bu',items:()=>S.builds.map(b=>[b.id,b]),
   key:b=>`${b.k},${rd(b.x,50)},${rd(b.z,50)},${rd(b.rot,50)}|${b.fuel!==undefined?Math.round(b.fuel/15):''},${b.sap!==undefined?rd(b.sap,2):''},${b.syrup!==undefined?rd(b.syrup,20):''},${b.logs?b.logs.length:''},${b.lit!==undefined?Math.round(b.lit/30):''}|${b.on?1:0}${b.open?1:0}|${b.fish?b.fish.map(f=>f?f.k+Math.floor(f.c/10):'-').join(','):''}`,
   ser:b=>{const o={};for(const k in b){if(k==='_o')continue;o[k]=k==='logs'?b.logs.map(cOf):b[k];}return o;},
   set:(id,d)=>{const b=S.builds.find(b=>b.id===id);
     if(!b){const st=Object.assign({},d);delete st.k;delete st.x;delete st.z;delete st.rot;addBuild(d.k,{x:d.x,z:d.z,rot:d.rot},st);return;}
     const moved=b.x!==d.x||b.z!==d.z||b.rot!==d.rot;
     if(moved&&b._o)despawnBuild(b);
     Object.assign(b,d);if(moved){spawnBuild(b);refreshCampDirt();}else if(b.k==='abri')refreshShed(b);},
   del:id=>{const b=S.builds.find(b=>b.id===id);if(!b)return;despawnBuild(b);S.builds.splice(S.builds.indexOf(b),1);refreshCampDirt();},
   get:id=>S.builds.find(b=>b.id===id)},
  {c:'ca',items:()=>[['camp',S.camp]],key:()=>JSON.stringify(S.camp)+'|'+Math.round(stove.fuel/15),
   ser:()=>({camp:Object.assign({},S.camp),stove:stove.fuel}),
   set:(id,d)=>{Object.keys(d.camp||{}).forEach(u=>{if(d.camp[u])buildUpgrade(u);});stove.fuel=d.stove||0;},
   del:()=>{},get:()=>S.camp},
  // Inventaire de chacun (personnel) : gardé sur le serveur pour le retrouver en revenant
  {c:'iv',items:()=>{const a=[[ME.id,{inv:INV,hot:S.hot}]];for(const id in S.others)if(S.others[id].inv)a.push([id,{inv:S.others[id].inv,hot:S.others[id].hot||0}]);return a;},
   key:o=>JSON.stringify(o.inv)+'|'+o.hot,ser:o=>({inv:o.inv.map(s=>s?{id:s.id,n:s.n,w:s.w,d:s.d}:null),hot:o.hot}),
   set:(id,d)=>{if(id===ME.id){INV.fill(null);(d.inv||[]).forEach((s,i)=>{if(s&&i<INV_N)INV[i]={id:s.id,n:s.n,w:s.w?s.w.slice():undefined,d:cloneD(s.d)};});S.hot=d.hot||0;syncTool();renderInv();}
     else S.others[id]=Object.assign(S.others[id]||{},{inv:d.inv,hot:d.hot});},
   del:()=>{},get:id=>id===ME.id?{inv:INV,hot:S.hot}:(S.others[id]&&S.others[id].inv?{inv:S.others[id].inv,hot:S.others[id].hot||0}:null)},
  // Objets par terre
  {c:'dr',items:()=>S.drops.map(d=>[d.id,d]),key:d=>JSON.stringify(d.it)+'|'+Math.round(d.x*10)+'|'+Math.round(d.z*10),ser:d=>({it:d.it,x:d.x,z:d.z}),
   set:(id,o)=>{const d=S.drops.find(d=>d.id===id);if(d)removeDrop(d);dropItem(o.it,o.x,o.z,id);},
   del:id=>{const d=S.drops.find(d=>d.id===id);if(d)removeDrop(d);},get:id=>S.drops.find(d=>d.id===id)},
  {c:'jo',items:()=>S.journal.map(e=>[e.id,e]),key:e=>`${e.n||''}|${e.m||''}|${e.txt}`,ser:e=>Object.assign({},e),
   set:(id,d)=>{const e=S.journal.find(e=>e.id===id);if(e)Object.assign(e,d);else{S.journal.push(d);S.journal.sort((a,b)=>a.t-b.t);trimJournal();}
     if(!$('journal').classList.contains('hidden'))renderJournal();},
   del:id=>{const i=S.journal.findIndex(e=>e.id===id);if(i>=0)S.journal.splice(i,1);},get:id=>S.journal.find(e=>e.id===id)},
  {c:'gb',items:()=>S.carcs.map(c=>[c.id,c]),key:c=>Math.round((c.work||0)*10)+'|'+Math.round(c.x*10)+'|'+Math.round(c.z*10),ser:c=>({kind:c.kind,x:c.x,z:c.z,rot:c.rot,buck:c.buck,work:c.work||0}),
   set:(id,d)=>{const c=S.carcs.find(c=>c.id===id);if(c&&c.kind===d.kind&&Math.abs(c.x-d.x)<0.01&&Math.abs(c.z-d.z)<0.01){c.work=d.work;return;}if(c)removeCarc(c);const n=Object.assign({id},d);S.carcs.push(n);spawnCarc(n);},
   del:id=>{const c=S.carcs.find(c=>c.id===id);if(c)removeCarc(c);},get:id=>S.carcs.find(c=>c.id===id)},
  {c:'sn',items:()=>S.snares.map(s=>[s.id,s]),key:s=>(s.caught?1:0)+'|'+Math.round(s.x*10)+'|'+Math.round(s.z*10),ser:s=>({x:s.x,z:s.z,rot:s.rot,caught:!!s.caught,wait:Math.round(s.wait)}),
   set:(id,d)=>{const s=S.snares.find(s=>s.id===id);if(s){s.caught=d.caught;s.wait=d.wait;if(s.hareM)s.hareM.visible=!!s.caught;return;}const n=Object.assign({id},d);S.snares.push(n);spawnSnare(n);},
   del:id=>{const s=S.snares.find(s=>s.id===id);if(s)removeSnare(s);},get:id=>S.snares.find(s=>s.id===id)},
  {c:'wx',hostOnly:true,items:()=>[['wx',S.wx]],key:()=>S.wx.type+'|'+Math.floor(S.wx.clock/15)+'|'+(S.wx.day||0),ser:()=>({clock:Math.round(S.wx.clock*10)/10,type:S.wx.type,left:Math.round(S.wx.left),day:S.wx.day||0}),
   set:(id,d)=>{Object.assign(S.wx,d);},del:()=>{},get:()=>S.wx},
  {c:'od',hostOnly:true,items:()=>S.order?[['ord',S.order]]:[],key:o=>`${o.id}|${o.done?1:0}${o.expired?1:0}|${Math.floor(o.left/20)}`,ser:o=>Object.assign({},o),
   set:(id,d)=>{const prev=S.order?Object.assign({},S.order):null;S.order=Object.assign({},d);orderChanged(prev,S.order);},del:()=>{S.order=null;renderOrder();},get:()=>S.order},
  {c:'ld',items:()=>[['lands',S.lands]],key:()=>JSON.stringify(S.lands),ser:()=>Object.assign({},S.lands),set:(id,d)=>{Object.keys(d).forEach(k=>{if(d[k])S.lands[k]=true;});refreshLands();},del:()=>{},get:()=>S.lands},
  {c:'mk',hostOnly:true,items:()=>[['mkt',S.mkt]],key:()=>JSON.stringify(S.mkt),ser:()=>({mkt:S.mkt,prev:S.mktPrev,next:S.mktNext}),
   set:(id,d)=>{Object.assign(S.mkt,d.mkt);Object.assign(S.mktPrev,d.prev);S.mktNext=d.next;if(!$('board').classList.contains('hidden'))renderBoard();},
   del:()=>{},get:()=>S.mkt}
];
const colKey=(C,o)=>Array.isArray(o)?C.key(...o):C.key(o);
const colSer=(C,o)=>Array.isArray(o)?C.ser(...o):C.ser(o);
// Compteurs partagés : on envoie la variation
const SCAL={
  money:[()=>S.money,d=>{S.money+=d;}],
  delivered:[()=>S.delivered,d=>{S.delivered+=d;}],
  taps:[()=>S.taps,d=>{S.taps+=d;}],
  ordGot:[()=>S.ordGot,d=>{S.ordGot+=d;renderOrder();}],
  yard:[()=>yardCount,d=>{for(let i=0;i<d;i++)addYardLog({sp:'sapin',len:2.44,ra:0.2,rb:0.17},yardCount++);}]
};

function resetBase(){
  NET.base={};COLS.forEach(C=>{const m={};C.items().forEach(([id,...o])=>{m[id]=colKey(C,o.length>1?o:o[0]);});NET.base[C.c]=m;});
  NET.scal={};for(const k in SCAL)NET.scal[k]=SCAL[k][0]();
}
function collectOps(){
  const ops=[];
  COLS.forEach(C=>{
    if(C.hostOnly&&!NET.host)return;
    const base=NET.base[C.c]||(NET.base[C.c]={}),seen={},s={};let n=0;
    C.items().forEach(([id,...o])=>{const ob=o.length>1?o:o[0];seen[id]=1;const k=colKey(C,ob);if(base[id]!==k){base[id]=k;s[id]=colSer(C,ob);n++;}});
    const d=Object.keys(base).filter(id=>!seen[id]);d.forEach(id=>delete base[id]);
    if(n||d.length)ops.push({c:C.c,s,d});
  });
  const sc={};let any=false;
  for(const k in SCAL){const v=SCAL[k][0](),dv=v-NET.scal[k];if(Math.abs(dv)>1e-9){sc[k]=dv;NET.scal[k]=v;any=true;}}
  if(any)ops.push({c:'$',v:sc});
  return ops;
}
function applyOps(ops){
  NET.applying=true;
  try{
    ops.forEach(op=>{
      if(op.c==='$'){for(const k in op.v){if(!SCAL[k])continue;SCAL[k][1](op.v[k]);NET.scal[k]+=op.v[k];}return;}
      const C=COLS.find(C=>C.c===op.c);if(!C)return;const base=NET.base[C.c]||(NET.base[C.c]={});
      for(const id in op.s||{}){try{C.set(id,op.s[id]);}catch(e){console.warn('synchro',C.c,id,e);}const o=C.get(id);if(o)base[id]=colKey(C,o);}
      (op.d||[]).forEach(id=>{try{C.del(id);}catch(e){console.warn('synchro',C.c,id,e);}delete base[id];});
    });
  }finally{NET.applying=false;}
}

/* ---------- Avatars des autres joueurs ---------- */
function avatarOf(id){
  let a=NET.avatars[id];if(a)return a;
  const f=makePlayer();[f.axe,f.saw,f.chain,f.shovel,f.carryLog].forEach(m=>{if(m)m.visible=false;});
  markDynamic(f.g);scene.add(f.g);
  const name=(NET.online[id]&&NET.online[id].name)||'Partenaire';
  a=NET.avatars[id]={f,l:label(name,0,0,0,14),x:0,z:0,rot:0,tx:0,tz:0,trot:0,phase:0,p:null,inVeh:null,first:true};
  return a;
}
function dropAvatar(id){const a=NET.avatars[id];if(!a)return;if(a.bob){scene.remove(a.bob);scene.remove(a.line);}if(a.f.g.parent)a.f.g.parent.remove(a.f.g);scene.remove(a.l);const i=labels.indexOf(a.l);if(i>=0)labels.splice(i,1);delete NET.avatars[id];}
function onPos(from,p){
  const a=avatarOf(from);a.p=p;if(p.lk&&a.f.lookKey!==p.lk)applyLook(a.f,lookFromKey(p.lk));a.tx=p.x;a.tz=p.z;a.trot=p.rot;
  if(a.first){a.x=p.x;a.z=p.z;a.rot=p.rot;a.first=false;}
  // Véhicule conduit par l'autre
  if(p.v){
    const v=vehicles.find(v=>v.id===p.v.id);
    if(v&&!(V===v&&S.mode==='vtt')){v.driver=from;v.net={x:p.v.x,z:p.v.z,th:p.v.th,sp:p.v.sp||0};
      if(p.v.tw){const t=trailers.find(t=>t.id===p.v.tw.id);if(t){t.hitch=v;t.net={x:p.v.tw.x,z:p.v.tw.z,th:p.v.tw.th};}}}
  }
  // Seau ou bûche dans les mains
  const f=a.f,c=p.c;f.carryLog.visible=!!c&&!p.v;
  if(c){const k=c.len+'|'+(c.split||0)+'|'+c.sp;if(a.ck!==k){a.ck=k;f.carryLog.geometry=c.split?splitGeo(c.len,c.ra,c.rb,c.split):pieceGeo(c.len,c.ra,c.rb);f.carryLog.material=c.split?SPLIT_MATS:logMatsFor(c.sp);}}
  // Outil en main (le même modèle que chez soi)
  const tool=TOOLS.find(t=>t.id===p.tool),k=tool&&!c&&!p.pl&&!p.v&&p.m==='foot'?tool.kind:null;
  f.axe.visible=k==='axe';f.saw.visible=k==='saw';f.chain.visible=k==='chainsaw';f.shovel.visible=k==='shovel';
  if(k==='axe'){f.axe.scale.setScalar(tool.id==='hachette'?0.78:1);axeColors(f.axe,tool.id);}
  // Sons de ses outils : la scie pendant le mouvement, la hache ou la pelle à la fin
  const sw=p.ar!==undefined;
  if(tool&&sw&&!a.sw)sfxSwing(tool.kind,p.x,p.z,Math.min(0.75,tool.delay*0.92));
  if(tool&&!sw&&a.sw)sfxStrike(tool.kind,p.x,p.z);
  a.sw=sw;
  a.ar=p.ar;
}
function updateAvatars(dt){
  const k=1-Math.exp(-10*dt);
  seats.forEach(s=>{s.netSit=false;});
  vehicles.forEach(v=>{if(v.passenger&&v.passenger!==ME.id)v.passenger=null;});
  for(const id in NET.avatars){
    const a=NET.avatars[id],p=a.p;if(!p)continue;
    const f=a.f,pv=p.pv&&vehicles.find(v=>v.id===p.pv),v=pv||(p.v&&vehicles.find(v=>v.id===p.v.id));
    if(pv)pv.passenger=id;
    // Assis : sur le même siège que chez lui (la chaise berçante bouge avec lui)
    const st=p.m==='sit'?seats.find(s=>Math.hypot(s.x-p.x,s.z-p.z)<0.3):null;
    if(st){
      st.netSit=true;
      if(a.sitOn!==st){
        if(st.grp){st.grp.add(f.g);f.g.position.set(0,st.y-0.9+0.1,-0.02);f.g.rotation.set(0,0,0);}
        else{scene.add(f.g);f.g.position.set(st.x,H(st.x,st.z)+st.y-0.9+0.05,st.z);f.g.rotation.set(0,st.rot,0);}
        legPose(f,'sit');f.armL.rotation.set(-0.35,0,0);f.armR.rotation.set(-0.35,0,0);
        a.sitOn=st;a.x=a.tx=st.x;a.z=a.tz=st.z;
      }
      f.g.visible=true;a.l.position.set(st.x,H(st.x,st.z)+2.3,st.z);continue;
    }
    if(a.sitOn){scene.add(f.g);a.sitOn=null;legPose(f,'stand');f.armL.rotation.set(0,0,0);f.armR.rotation.set(0,0,0);}
    if(v){
      if(a.inVeh!==v||a.inPass!==!!pv){v.mesh.g.add(f.g);f.g.position.set(...(pv?v.spec.pass:v.spec.seat));f.g.rotation.set(0,0,0);a.inVeh=v;a.inPass=!!pv;
        legPose(f,v.spec.ride?'ride':v.spec.boat?'sit':'drive');f.armL.rotation.x=f.armR.rotation.x=-1.05;}
      f.g.visible=!v.spec.hide;a.l.position.set(v.x,H(v.x,v.z)+3,v.z);a.x=v.x;a.z=v.z;
      continue;
    }
    if(a.inVeh){a.inVeh.mesh.g.remove(f.g);scene.add(f.g);a.inVeh=null;legPose(f,'stand');f.armL.rotation.set(0,0,0);f.armR.rotation.set(0,0,0);a.x=a.tx;a.z=a.tz;}
    const ox=a.x,oz=a.z;a.x+=(a.tx-a.x)*k;a.z+=(a.tz-a.z)*k;a.rot+=wrapAng(a.trot-a.rot)*k;
    const spd=Math.hypot(a.x-ox,a.z-oz)/Math.max(dt,1e-3);
    a.jy=lerp(a.jy||0,p.j||0,k);f.g.visible=true;f.g.position.set(a.x,walkH(a.x,a.z)+a.jy+(inCabin(a.x,a.z)?FLOOR_Y:0),a.z);f.g.rotation.set(0,a.rot,0);
    if(p.m==='sleep'){const q=cabW(SLEEP_POS.x,SLEEP_POS.z);f.g.position.set(q.x,CAMP_H+SLEEP_POS.y,q.z);f.g.quaternion.copy(SLEEP_Q);a.l.position.set(q.x,CAMP_H+1.6,q.z);continue;}
    if(p.m==='sit'){legPose(f,'sit');f.g.position.y-=0.45;}
    else{a.phase+=dt*spd*3.2;const sw=Math.min(1,spd/2)*0.6*Math.sin(a.phase);f.legL.rotation.x=sw;f.legR.rotation.x=-sw;f.armL.rotation.x=-sw*0.8;f.armR.rotation.x=p.c?-2.6:sw*0.8;
      if(a.ar!==undefined){f.armR.rotation.x=a.ar;f.armL.rotation.x=a.ar;}}
    remoteDrone(a,p);
    avatarFishing(a,p,f);
    a.l.position.set(a.x,H(a.x,a.z)+2.6,a.z);
  }
  // Véhicules et remorques conduits par les autres : on glisse vers la dernière position reçue
  vehicles.forEach(v=>{
    if(!v.net||(V===v&&S.mode==='vtt'))return;
    if(!v.driver){v.net=null;return;}
    v.x+=(v.net.x-v.x)*k;v.z+=(v.net.z-v.z)*k;v.th+=wrapAng(v.net.th-v.th)*k;v.v=0;v.spin+=(v.net.sp||0)*dt/v.spec.wr;
    const tw=towed(v);if(tw&&tw.net){tw.x+=(tw.net.x-tw.x)*k;tw.z+=(tw.net.z-tw.z)*k;tw.th+=wrapAng(tw.net.th-tw.th)*k;}
  });
}
function posPacket(){
  const p={x:rd(P.x,100),z:rd(P.z,100),rot:rd(P.rot,100),m:S.mode,tool:TOOL?TOOL.id:null};if(P.swing>0)p.ar=rd(player.armR.rotation.x,100);if(P.jumpY>0.01)p.j=rd(P.jumpY,100);p.lk=lookKey(LOOK);if(S.mode==='pass'&&P.ride)p.pv=P.ride.id;if(inBoat())p.boat=1;if(P.fishing&&P.fishing.state!=='cast')p.fb=[rd(P.fishing.x,100),rd(P.fishing.z,100),P.fishing.state==='bite'?1:0];
  if(P.carry)p.c={len:P.carry.len,ra:P.carry.ra,rb:P.carry.rb,split:P.carry.split||0,sp:P.carry.sp};
  if(P.pail)p.pl=1;
  if(S.mode==='drone')p.dr=[rd(DRONE.x,100),rd(DRONE.y,100),rd(DRONE.z,100),rd(camYaw,100)];
  if(S.mode==='vtt'&&V){p.v={id:V.id,x:rd(V.x,100),z:rd(V.z,100),th:rd(V.th,1000),sp:rd(V.v,10)};const tw=towed(V);if(tw)p.v.tw={id:tw.id,x:rd(tw.x,100),z:rd(tw.z,100),th:rd(tw.th,1000)};}
  return p;
}

/* ---------- Connexion ---------- */
function netSend(m){if(NET.ws&&NET.ws.readyState===1)NET.ws.send(JSON.stringify(m));}
function setNetStatus(txt,warn){const e=$('netStatus');e.textContent=txt||'';e.classList.toggle('hidden',!txt);e.classList.toggle('warn',!!warn);}
function onlineNames(){return Object.keys(NET.online).filter(id=>id!==ME.id).map(id=>NET.online[id].name||'Partenaire');}
function refreshNetStatus(){
  if(!NET.on)return setNetStatus('');
  if(!NET.ws||NET.ws.readyState!==1)return setNetStatus('📡 Reconnexion…',true);
  const o=onlineNames();setNetStatus(o.length?`👥 ${o.join(', ')}`:`📡 Terre « ${NET.room} »`);
}
function sendSnap(urgent){
  if(!NET.ready)return;
  const ops=collectOps();if(ops.length)netSend({t:'op',ops});
  netSend({t:'snap',data:snapshot(),applied:NET.lastSeq,urgent:!!urgent});
}
function sendMe(){
  const f=snapshot().players[ME.id];
  netSend({t:'me',me:f});
}
// Le serveur gratuit s'endort : on le réveille d'abord par une simple requête (jusqu'à ~1 min)
async function wakeServer(){
  const http=serverUrl().replace(/^ws/,'http');const t0=Date.now();
  while(Date.now()-t0<100000){
    try{const r=await fetch(http,{cache:'no-store'});if(r.ok)return true;}catch(e){}
    $('netMsg').textContent=`Réveil du serveur… ${Math.round((Date.now()-t0)/1000)} s (jusqu'à 1 minute)`;
    await new Promise(r=>setTimeout(r,3000));
  }
  return false;
}
function connect(resume){
  let ws;
  try{ws=new WebSocket(serverUrl());}catch(e){netFail('Adresse du serveur invalide');return;}
  NET.ws=ws;
  ws.onopen=()=>{NET.retry=0;ws.send(JSON.stringify({t:'hello',room:NET.room,id:ME.id,name:myName(),resume:!!resume,lastSeq:NET.lastSeq,tab:TAB_ID}));};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}onMessage(m);};
  ws.onclose=()=>{
    if(NET.ws!==ws)return;
    if(!NET.welcomed){netFail('Le serveur ne répond pas');return;}
    refreshNetStatus();
    const wait=Math.min(15000,1000*Math.pow(2,NET.retry++));
    setTimeout(()=>{if(NET.ws===ws)connect(true);},wait);
  };
}
function onMessage(m){
  if(m.t==='welcome'&&started){
    // Le serveur a redémarré pendant la partie
    NET.hostId=m.host;NET.host=m.host===ME.id;NET.lastSeq=m.seq;
    NET.online={};(m.online||[]).forEach(o=>{NET.online[o.id]={name:o.name};});
    if(!m.snap){resetBase();NET.ready=true;sendSnap(true);sendMe();refreshNetStatus();toast('📡 Reconnecté');}
    else{try{sessionStorage.setItem('terre-a-bois-auto','1');}catch(e){}saveOff=true;location.reload();}
    return;
  }
  if(m.t==='welcome'){
    NET.welcomed=true;NET.hostId=m.host;NET.host=m.host===ME.id;NET.lastSeq=m.seq;
    NET.online={};(m.online||[]).forEach(o=>{NET.online[o.id]={name:o.name};});
    let d=m.snap;
    if(d&&m.players){d.players=Object.assign({},m.players,d.players||{});for(const id in m.players)if(d.players[id])d.players[id].name=m.players[id].name||d.players[id].name;}
    const fresh=!d;
    if(!d){d=Stockage.charger()||Stockage.charger(SAVE_KEY);}   // nouvelle terre : on part de ta partie
    beginWorld(d);$('netMsg').textContent='';const b=$('btnStart');b.disabled=false;b.textContent='Jouer';
    for(const id in NET.online)delete S.others[id];showOthers();
    // on ne montre pas en double les joueurs en ligne (leur avatar suit leur vraie position)
    resetBase();applyOps([].concat(...(m.ops||[]).map(e=>e.ops)));
    NET.ready=true;$('btnChat').classList.remove('hidden');
    CHAT.list=[];(m.chat||[]).forEach(c=>addChat(c,true));
    if(fresh)sendSnap(true);
    sendMe();refreshNetStatus();
    toast(fresh?`🌲 Nouvelle terre « ${NET.room} » créée`:`🌲 Bienvenue sur la terre « ${NET.room} »`);
  }else if(m.t==='resume'){
    NET.hostId=m.host;NET.host=m.host===ME.id;
    NET.online={};(m.online||[]).forEach(o=>{NET.online[o.id]={name:o.name};});
    (m.ops||[]).forEach(e=>{if(e.from!==ME.id)applyOps(e.ops);NET.lastSeq=Math.max(NET.lastSeq,e.seq);});
    refreshNetStatus();toast('📡 Reconnecté');
  }else if(m.t==='resync'){
    try{sessionStorage.setItem('terre-a-bois-auto','1');}catch(e){}
    saveOff=true;location.reload();
  }else if(m.t==='op'){
    if(NET.ready)applyOps(m.ops);NET.lastSeq=Math.max(NET.lastSeq,m.seq);
  }else if(m.t==='ack'){NET.lastSeq=Math.max(NET.lastSeq,m.seq);
  }else if(m.t==='pos'){if(NET.ready)onPos(m.from,m.p);
  }else if(m.t==='chat'){if(NET.ready)addChat(m.m);
  }else if(m.t==='emote'){const a=NET.ready&&NET.avatars[m.from];if(a&&/^fx:/.test(m.e))onNetFx(m.from,m.e);else if(a&&EMOTES.includes(m.e))showBubble(a,m.e,true);
  }else if(m.t==='joined'){
    NET.online[m.id]={name:m.name};delete S.others[m.id];showOthers();
    const a=NET.avatars[m.id];if(a){/* nom à jour */}
    toast(`👋 ${m.name||'Ton partenaire'} arrive sur la terre`);refreshNetStatus();
  }else if(m.t==='left'){
    const name=(NET.online[m.id]||{}).name;delete NET.online[m.id];
    const a=NET.avatars[m.id];
    if(a&&a.p)S.others[m.id]=Object.assign(S.others[m.id]||{},{name,player:{x:a.x,z:a.z,rot:a.rot}});
    dropAvatar(m.id);showOthers();
    vehicles.forEach(v=>{if(v.driver===m.id){v.driver=null;v.net=null;}});
    toast(`${name||'Ton partenaire'} a quitté la terre`);refreshNetStatus();
  }else if(m.t==='host'){
    NET.hostId=m.id;NET.host=m.id===ME.id;if(NET.host)setTimeout(()=>sendSnap(),500);
  }else if(m.t==='snapReq'){
    sendSnap();
  }else if(m.t==='dup'){
    const n=(ME.tabAlt||1)+1;try{sessionStorage.setItem('terre-a-bois-alt',String(n));}catch(e){}
    {const o=NET.ws;NET.ws=null;try{o.close();}catch(e){}}useTabIdentity(n);$('playerName').value=ME.name;toast('Déjà ouvert dans un autre onglet : cet onglet joue comme « '+ME.name+' »');
    setTimeout(()=>connect(false),300);
  }else if(m.t==='error'){netFail(m.msg||'Erreur du serveur');}
}
function netFail(msg){
  NET.ws=null;
  const b=$('btnStart');b.disabled=false;b.textContent='Réessayer';
  $('netMsg').innerHTML=`${msg}. <button id="btnOffline" class="linkbtn">Jouer seul sur cet appareil</button>`;
  $('btnOffline').onclick=()=>{NET.on=false;Stockage.key=SAVE_KEY;$('netMsg').textContent='';beginWorld(null);};
}
// Bouton « Jouer » de l'écran de départ
function startClicked(){
  const code=$('roomCode').value.trim().toLowerCase();
  ME.room=code;saveMe();
  if(!code){beginWorld(null);return;}
  NET.on=true;NET.room=code;NET.welcomed=false;Stockage.key=SAVE_KEY+'@'+code;
  const b=$('btnStart');b.disabled=true;b.textContent='Connexion…';
  $('netMsg').textContent='Connexion au serveur…';
  wakeServer().then(ok=>{if(ok)connect(false);else netFail('Le serveur ne répond pas');});
}
{
  $('roomCode').value=ME.room||'';
  let auto=false;try{auto=sessionStorage.getItem('terre-a-bois-auto')==='1';sessionStorage.removeItem('terre-a-bois-auto');}catch(e){}
  if(auto&&ME.room)setTimeout(startClicked,50);
}

/* ---------- À chaque image ---------- */
function updateNet(dt){
  NET.lastFrame=performance.now();
  if(!NET.on||!NET.ready)return;
  // Qui conduit quoi
  vehicles.forEach(v=>{if(S.mode==='vtt'&&V===v)v.driver=ME.id;else if(v.driver===ME.id)v.driver=null;});
  updateAvatars(dt);updateBubbles(dt);
  const up=NET.ws&&NET.ws.readyState===1;if(!up)return;
  NET.sendT-=dt;NET.posT-=dt;NET.snapT-=dt;NET.meT-=dt;
  if(NET.sendT<=0){NET.sendT=0.15;const ops=collectOps();if(ops.length)netSend({t:'op',ops});}
  if(NET.posT<=0){NET.posT=0.1;netSend({t:'pos',p:posPacket()});}
  if(NET.host&&NET.snapT<=0){NET.snapT=20;sendSnap();}
  if(NET.meT<=0){NET.meT=5;sendMe();}
}
function netLeaving(){if(!NET.on||!NET.ready)return;if(NET.host)sendSnap(true);sendMe();}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')netLeaving();});
// Onglet caché ou fenêtre réduite : le navigateur arrête l'animation, mais on continue d'envoyer nos changements et notre position
setInterval(()=>{
  if(performance.now()-(NET.lastFrame||0)<700||!NET.on||!NET.ready||!NET.ws||NET.ws.readyState!==1)return;
  const ops=collectOps();if(ops.length)netSend({t:'op',ops});
  netSend({t:'pos',p:posPacket()});
  if(NET.host&&(NET.snapT-=1)<=0){NET.snapT=20;sendSnap();}
},1000);
addEventListener('pagehide',()=>{netLeaving();if(NET.on&&NET.ws){netSend({t:'bye'});}});

/* ---------- Clavardage ---------- */
const CHAT={list:[],open:false};
function chatName(m){return m.from===ME.id?myName():(m.name||(NET.online[m.from]||{}).name||'Partenaire');}
function renderChat(){
  const L=$('chatLog'),now=Date.now();
  const show=CHAT.open?CHAT.list.slice(-15):CHAT.list.filter(m=>now-m.shown<12000).slice(-5);
  L.innerHTML=show.map(m=>`<div class="cm${m.from===ME.id?' me':''}"><b>${chatName(m).replace(/</g,'&lt;')}</b> ${m.txt.replace(/</g,'&lt;')}</div>`).join('');
  L.classList.toggle('hidden',!show.length);
}
function addChat(m,quiet){
  m.shown=quiet?0:Date.now();CHAT.list.push(m);if(CHAT.list.length>50)CHAT.list.shift();
  renderChat();
  if(quiet)return;
  // Bulle au-dessus de la tête de celui qui parle (les autres, et soi-même)
  const a=m.from===ME.id?CHAT.self:NET.avatars[m.from];
  if(a)showBubble(a,m.txt.length>40?m.txt.slice(0,38)+'…':m.txt);
}
function openChat(){
  if(!NET.on||!NET.ready)return;
  CHAT.open=true;$('chatBox').classList.remove('hidden');renderChat();
  for(const k in keys)keys[k]=false;
  setTimeout(()=>$('chatInput').focus(),0);
}
function closeChat(){CHAT.open=false;$('chatBox').classList.add('hidden');$('chatInput').blur();renderChat();}
function sendChat(){
  const inp=$('chatInput'),txt=inp.value.trim();
  if(txt)netSend({t:'chat',txt});
  inp.value='';closeChat();
}
$('btnChat').addEventListener('click',()=>CHAT.open?closeChat():openChat());
$('chatSend').addEventListener('click',sendChat);
$('chatInput').addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='Enter'){e.preventDefault();sendChat();}
  else if(e.key==='Escape'){e.preventDefault();closeChat();}
});
$('chatInput').addEventListener('keyup',e=>e.stopPropagation());
setInterval(()=>{if(!CHAT.open&&CHAT.list.length)renderChat();},1000);
CHAT.self={self:true,bubble:null,bubbleT:0};
function showBubble(a,txt,plain){
  if(a.bubble){scene.remove(a.bubble);const i=labels.indexOf(a.bubble);if(i>=0)labels.splice(i,1);}
  const p=bubblePos(a);a.bubble=label(txt,p.x,p.y,p.z,40,plain);a.bubbleT=6;
}
// Émoticônes : seulement une bulle au-dessus de la tête, rien dans le clavardage
const EMOTES=['👍','👋','😀','😂','😮','😢','😡','❤️','🌲','🪓','🍁','🔥'];
function sendEmote(e){netSend({t:'emote',e});showBubble(CHAT.self,e,true);closeChat();}
{const row=$('chatEmotes');EMOTES.forEach(e=>{const b=document.createElement('button');b.textContent=e;b.onclick=()=>sendEmote(e);row.appendChild(b);});}
function bubblePos(a){
  if(a.self){const inV=S.mode==='vtt'&&V,x=inV?V.x:P.x,z=inV?V.z:P.z;return {x,y:H(x,z)+(inV?3.6:3.3),z};}
  return {x:a.x,y:H(a.x,a.z)+(a.inVeh?3.6:3.3),z:a.z};
}
function updateBubbles(dt){
  for(const a of [CHAT.self,...Object.values(NET.avatars)]){if(!a.bubble)continue;
    a.bubbleT-=dt;const p=bubblePos(a);a.bubble.position.set(p.x,p.y,p.z);
    if(a.bubbleT<=0){scene.remove(a.bubble);const i=labels.indexOf(a.bubble);if(i>=0)labels.splice(i,1);a.bubble=null;}}
}

/* ---------- Liste des joueurs (clic sur le rectangle en haut à gauche) ---------- */
function renderPlayers(){
  const esc=t=>String(t||'').replace(/</g,'&lt;');
  let h='<h3>👥 Joueurs</h3>';
  if(!NET.on){h+='<div class="pl">🟢 '+esc(myName())+' <small>(toi)</small></div><div class="pl"><small>Tu joues seul sur cet appareil. Entre un code de terre au départ pour jouer à plusieurs.</small></div>';}
  else{
    h+='<div class="pl">🟢 '+esc(myName())+' <small>(toi'+(NET.host?', hôte':'')+')</small></div>';
    for(const id in NET.online)if(id!==ME.id)h+='<div class="pl">🟢 '+esc(NET.online[id].name||'Partenaire')+(NET.hostId===id?' <small>(hôte)</small>':'')+'</div>';
    for(const id in S.others)if(!NET.online[id]&&id!==ME.id&&!id.includes('~')&&S.others[id].name){const o=S.others[id];h+='<div class="pl">⚪ '+esc(o.name||'Partenaire')+(o.t?' <small>vu '+ago(o.t)+'</small>':' <small>hors ligne</small>')+'</div>';}
    h+='<div class="pl"><small>Terre « '+esc(NET.room)+' »</small></div>';
  }
  $('players').innerHTML=h;
}
$('stats').addEventListener('click',e=>{e.stopPropagation();const p=$('players');if(p.classList.contains('hidden')){renderPlayers();p.classList.remove('hidden');}else p.classList.add('hidden');});
$('players').addEventListener('click',()=>$('players').classList.add('hidden'));
setInterval(()=>{if(!$('players').classList.contains('hidden'))renderPlayers();},2000);
