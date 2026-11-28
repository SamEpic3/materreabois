/* Érablière : entailler les érables, chaudières, seaux, feu et bouilloire à sirop */
const TAP_CAP=15,SAP_RATE=0.05;     // chaudière de 15 L, ~5 min pour la remplir
const PAIL_CAP=30;                  // seau de collecte de 30 L
const SAP_PER_SYRUP=40;             // 40 L d'eau d'érable pour 1 L de sirop
const BOIL_RATE=0.3;                // L d'eau évaporés par seconde quand le feu est pris
const PAN_CAP=60;                   // capacité de la bouilloire (eau d'érable)
const FUEL_MAX=600;
// Bouilloire ou évaporateur (cabane à sucre) : même fonctionnement, capacité et vitesse différentes
const isBoiler=b=>b&&(b.k==='sucres'||b.k==='evapo');
const boilCap=b=>b.k==='evapo'?EVAPO.cap:PAN_CAP;
const boilRate=b=>BOIL_RATE*(b.k==='evapo'?EVAPO.rate:1);
const boilFuelMax=b=>b.k==='evapo'?EVAPO.fuel:FUEL_MAX;
const boilName=b=>b.k==='evapo'?'l\'évaporateur':'la bouilloire';
S.taps=0;                           // (anciennes sauvegardes : les chaudières sont maintenant des objets d'inventaire)
const taps=[];                      // {t,sap,mesh}
const pails=[];                     // seaux posés au sol {x,z,kind,L,mesh}
const SAP_COL=0xcfe3ea,SYRUP_COL=0xb5651d;

function fmtL(l){return (Math.round(l*10)/10).toString().replace('.',',')+' L';}
function pailTxt(p){return p.L<0.05?'vide':`${fmtL(p.L)} ${p.kind==='sirop'?'de sirop':'d\'eau d\'érable'}`;}

/* ----- Modèles ----- */
const GAL_M=new T.MeshPhongMaterial({color:0xb4babe,shininess:90,specular:0x999999,flatShading:false});
// Seau de galvanisé : corps conique, rebord roulé, bandes, petite poignée
function galBucket(r1,r2,h){return mergeGeos([new T.CylinderGeometry(r1,r2,h,16,1,true),new T.CircleGeometry(r2,16).rotateX(Math.PI/2).translate(0,-h/2+0.005,0),
  new T.TorusGeometry(r1,0.012,5,16).rotateX(Math.PI/2).translate(0,h/2,0),new T.TorusGeometry(r1-(r1-r2)*0.3,0.007,4,16).rotateX(Math.PI/2).translate(0,h*0.2,0),new T.TorusGeometry(r1-(r1-r2)*0.75,0.007,4,16).rotateX(Math.PI/2).translate(0,-h*0.25,0)]);}
function makeTapBucket(){
  const g=new T.Group(),dark=mat(0x6f7579);
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.014,0.018,0.16,8).rotateX(Math.PI/2).translate(0,0.25,0.08),new T.BoxGeometry(0.06,0.012,0.04).translate(0,0.235,0.15)]),dark)); // chalumeau et crochet
  const b=new T.Mesh(galBucket(0.17,0.13,0.32),GAL_M);b.position.set(0,0,0.2);b.material.side=T.DoubleSide;g.add(b);
  const lid=new T.Mesh(mergeGeos([new T.ConeGeometry(0.25,0.13,4,1,true).rotateY(Math.PI/4),new T.BoxGeometry(0.02,0.02,0.34).translate(0,0.06,0)]),GAL_M);lid.position.set(0,0.23,0.22);lid.rotation.x=0.15;g.add(lid);
  shadows(g);return g;
}
function makePail(){
  const g=new T.Group();
  const b=new T.Mesh(galBucket(0.17,0.14,0.32),GAL_M);b.position.y=0.16;g.add(b);
  const h=new T.Mesh(mergeGeos([new T.TorusGeometry(0.17,0.008,4,14,Math.PI).translate(0,0.32,0),new T.CylinderGeometry(0.018,0.018,0.1,8).rotateZ(Math.PI/2).translate(0,0.49,0),
    new T.SphereGeometry(0.02,6,4).translate(0.17,0.3,0),new T.SphereGeometry(0.02,6,4).translate(-0.17,0.3,0)]),mat(0x55595c));g.add(h);
  const liq=new T.Mesh(new T.CylinderGeometry(0.155,0.155,0.01,12),new T.MeshBasicMaterial({color:SAP_COL}));liq.position.y=0.05;g.add(liq);
  g.userData.liq=liq;shadows(g);return g;
}
function setPailLook(m,p){
  const liq=m.userData.liq;liq.visible=p.L>0.05;
  liq.material.color.set(p.kind==='sirop'?SYRUP_COL:SAP_COL);
  liq.position.y=0.03+0.27*Math.min(1,p.L/PAIL_CAP);
}

/* ----- Bouilloire à sirop (construction placée librement : voir constructions.js) ----- */
function makeSucresModel(){
  // Évaporateur sur arche de briques : foyer ouvert à l'avant, casserole d'acier, cheminée
  const g=new T.Group(),brick=texMat(canvasTex(64,64,(c,w,h)=>{c.fillStyle='#8e4a34';c.fillRect(0,0,w,h);c.fillStyle='#c9bfae';for(let y=0;y<h;y+=16){c.fillRect(0,y,w,2);for(let x=(y/16)%2?0:16;x<w;x+=32)c.fillRect(x,y,2,16);}}),3,2);
  const metal=new T.MeshPhongMaterial({color:0x9aa0a4,shininess:70,specular:0x777777}),dark=mat(0x2a2a2a);
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.7,0.9,0.15).translate(0,0.45,-0.45),new T.BoxGeometry(0.15,0.9,1.05).translate(0.78,0.45,0),new T.BoxGeometry(0.15,0.9,1.05).translate(-0.78,0.45,0),
    new T.BoxGeometry(0.55,0.9,0.15).translate(0.58,0.45,0.45),new T.BoxGeometry(0.55,0.9,0.15).translate(-0.58,0.45,0.45),new T.BoxGeometry(0.62,0.3,0.15).translate(0,0.75,0.45)]),brick));
  g.add(new T.Mesh(new T.BoxGeometry(1.45,0.02,0.8).translate(0,0.01,0),mat(0x1a1715)));   // sol du foyer noirci
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.6,0.06,0.05).translate(0,0.63,0.56),new T.BoxGeometry(0.06,0.6,0.05).translate(0.3,0.31,0.56)]),dark));
  // Casserole
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.6,0.06,1.0).translate(0,0.95,0),new T.BoxGeometry(1.6,0.25,0.05).translate(0,1.08,0.5),new T.BoxGeometry(1.6,0.25,0.05).translate(0,1.08,-0.5),
    new T.BoxGeometry(0.05,0.25,1.0).translate(0.8,1.08,0),new T.BoxGeometry(0.05,0.25,1.0).translate(-0.8,1.08,0),new T.BoxGeometry(0.04,0.2,0.9).translate(0,1.05,0),
    new T.CylinderGeometry(0.03,0.03,0.18,8).rotateX(Math.PI/2).translate(0.6,0.98,0.6)]),metal));
  // Cheminée
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.13,0.13,1.9,12).translate(0,1.4,-0.62),new T.ConeGeometry(0.24,0.16,12).translate(0,2.42,-0.62),new T.CylinderGeometry(0.025,0.025,0.12,6).translate(0,2.31,-0.62)]),dark));
  return bakeStatic(g);
}
function createSucres(b,o){
  const g=makeSucresModel();
  const liquid=new T.Mesh(new T.BoxGeometry(1.42,0.04,0.82),new T.MeshBasicMaterial({color:SAP_COL}));liquid.position.set(0,1.0,0);liquid.visible=false;g.add(liquid);
  const fl=flameGroup();g.add(fl);
  o.add(g);o.col(b.x,b.z,1.0);
  o.liquid=liquid;o.fl=fl;
}
function addGroundPail(x,z,kind,L,id){
  const m=makePail(),p={id:id||uid(),x,z,kind,L,mesh:m};m.position.set(x,H(x,z),z);setPailLook(m,p);scene.add(m);pails.push(p);return p;
}

/* ----- Seaux et chaudières : des objets d'inventaire.
   Vides, ils s'empilent (seaux par 5, chaudières par 10) ; pleins, chacun prend sa case. ----- */
const _itemDefE=itemDef;
itemDef=function(id){
  if(id==='seau')return {kind:'pail',name:'Seau de collecte',stack:5};
  if(id==='chaudiere')return {kind:'tap',name:'Chaudière et chalumeau',stack:10};
  return _itemDefE(id);
};
const _itemIconE=itemIcon;
itemIcon=function(it){
  if(!it)return '';
  if(it.id==='seau'){const f=it.d&&it.d.L>0.05,k=f?(it.d.kind==='sirop'?'seauS':'seauE'):'seau';
    const src=thumb(k,()=>{const g=new T.Group(),m=makePail();setPailLook(m,{kind:f?it.d.kind:'eau',L:f?PAIL_CAP*0.85:0});g.add(m);return g;});return src?`<img src="${src}" alt="">`:'🪣';}
  if(it.id==='chaudiere'){const src=thumb('chaudiere',()=>{const g=new T.Group();g.add(makeTapBucket());return g;});return (src?`<img src="${src}" alt="">`:'🪣')+(it.d&&it.d.sap>0.05?'<span class="fill">💧</span>':'');}
  return _itemIconE(it);
};
const _itemLabelE=itemLabel;
itemLabel=function(it){
  if(it.id==='seau'&&it.d)return `Seau (${pailTxt(it.d)})`;
  if(it.id==='chaudiere'&&it.d)return `Chaudière (${fmtL(it.d.sap)} d'eau d'érable)`;
  return _itemLabelE(it);
};
const _dropModelE=dropModel;
dropModel=function(it){
  if(it.id==='seau'){const m=makePail();setPailLook(m,it.d||{kind:'eau',L:0});return m;}
  if(it.id==='chaudiere'){const g=new T.Group(),m=makeTapBucket();m.position.set(0,-0.08,-0.2);g.add(m);return g;}
  return _dropModelE(it);
};
// Partie gratuite : 4 chaudières pour commencer
if(!INV[1])INV[1]={id:'chaudiere',n:4};

/* Seau tenu : c'est le seau de la case choisie */
const handPail=makePail();handPail.position.set(0,-0.98,0.05);handPail.visible=false;player.armR.add(handPail);
function heldPail(){const s=INV[S.hot];return s&&s.id==='seau'?s:null;}
function refreshPail(){
  const s=heldPail();
  P.pail=s?(s.d||{kind:'eau',L:0}):null;
  handPail.visible=!!P.pail;if(P.pail)setPailLook(handPail,P.pail);
}
const _syncToolE=syncTool;
syncTool=function(){_syncToolE();refreshPail();updateToolVisual();};
// setPail(null) : le seau tenu quitte l'inventaire (posé, rangé…) ; setPail(P.pail) : son contenu a changé ;
// setPail({kind,L}) : on prend un seau du monde (faux s'il n'y a pas de place)
function setPail(p){
  const s=heldPail();
  if(p===null){if(s)invTake(S.hot,1);syncTool();return true;}
  if(s&&p===P.pail){
    if(p.L>0.05){
      if(!s.d){s.d={kind:p.kind,L:p.L};
        if(s.n>1){const rest={id:'seau',n:s.n-1};s.n=1;const left=invAdd(rest);if(left){dropItem(left,P.x+Math.sin(P.rot)*0.8,P.z+Math.cos(P.rot)*0.8);toast('Plus de place : les seaux vides sont déposés par terre');}}}
      else{s.d.kind=p.kind;s.d.L=p.L;}
    }else delete s.d;
    syncTool();renderInv();return true;
  }
  const d=p.L>0.05?{kind:p.kind,L:p.L}:undefined;
  let i=-1;
  if(!INV[S.hot])i=S.hot;
  else if(!d)i=INV.findIndex(x=>x&&x.id==='seau'&&!x.d&&x.n<5);
  if(i<0)i=INV.findIndex((x,j)=>!x&&j<HOT_N);
  if(i<0)i=INV.findIndex(x=>!x);
  if(i<0){toast('🎒 Plus de place dans ton inventaire pour ce seau');return false;}
  if(INV[i])INV[i].n++;else INV[i]={id:'seau',n:1,d};
  if(i<HOT_N)S.hot=i;else toast('Seau rangé dans ton sac');
  syncTool();renderInv();return true;
}

/* ----- Proximité ----- */
function nearestSugar(){return nearestBuild('sucres',2.4)||(KINDS.evapo?buildNear('evapo'):null);}
function nearStore(){return Math.hypot(P.x-STORE_DOOR.x,P.z-STORE_DOOR.z)<3;}
function tapOf(t){return taps.find(x=>x.t===t)||null;}
function nearestTap(){let b=null,bd=1.8;taps.forEach(tp=>{const d=Math.hypot(P.x-tp.t.x,P.z-tp.t.z);if(d<bd){bd=d;b=tp;}});return b;}
function nearestGroundPail(){let b=null,bd=1.3;pails.forEach(p=>{const d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;b=p;}});return b;}

/* ----- Entailles ----- */
function tapTree(t){
  if(tapOf(t))return;
  // une chaudière vide d'abord, sinon une qui contient déjà de l'eau
  let i=INV.findIndex(s=>s&&s.id==='chaudiere'&&!s.d);if(i<0)i=INV.findIndex(s=>s&&s.id==='chaudiere');if(i<0)return;
  const o=invTake(i,1);
  placeTap(t,Math.atan2(P.x-t.x,P.z-t.z),o.d?o.d.sap:0);
  const n=invCount('chaudiere');toast(`Érable entaillé 🍁 (il te reste ${n} chaudière${n>1?'s':''})`);
}
function placeTap(t,a,sap){
  const dx=Math.sin(a),dz=Math.cos(a),m=makeTapBucket();
  m.position.set(t.x+dx*0.28*t.s,t.y+1.05,t.z+dz*0.28*t.s);m.rotation.y=a;scene.add(m);
  taps.push({t,sap,mesh:m});
}
function untap(tp){
  const it={id:'chaudiere',n:1,d:tp.sap>0.05?{sap:Math.round(tp.sap*100)/100}:undefined};
  if(!invRoom(it)){toast('🎒 Plus de place dans ton inventaire pour la chaudière');return;}
  scene.remove(tp.mesh);taps.splice(taps.indexOf(tp),1);giveItem(it);
  toast(it.d?`Chaudière retirée avec ${fmtL(it.d.sap)} d'eau d'érable`:'Chaudière retirée');
}
function treeContext(t){
  if(t.planted&&t.grow<1)return {info:saplingInfo(t)};
  const tp=tapOf(t);
  if(tp)return {act:{label:'Retirer la chaudière',fn:()=>untap(tp)},info:`Érable entaillé · chaudière : ${fmtL(tp.sap)} / ${TAP_CAP} L`+(TOOL?' · retire la chaudière avant de l\'abattre':'')};
  const nT=invCount('chaudiere'),tapAct=(t.type==='erable'&&nT>0)?{label:`Entailler l'érable (${nT} chaudière${nT>1?'s':''})`,fn:()=>tapTree(t)}:null;
  if(!TOOL)return {act:tapAct,info:tapAct?'':'Mains vides : choisis un outil pour bûcher (touches 1 à 9)'};
  if(TOOL.kind==='shovel')return {act:tapAct,info:tapAct?'':'La pelle sert à essoucher : choisis un outil de coupe pour bûcher'};
  if(!TOOL.fell)return {act:tapAct,info:tapAct?'':'Choisis un outil de coupe pour bûcher'};
  const tot=fellTotal(t);
  return {act:{label:`${toolVerb()} (${Math.round(t.work*tot)}/${tot})`,fn:()=>chop(t),cool:true},act2:tapAct};
}

/* ----- Seau, feu et bouilloire ----- */
function collectSap(tp){const take=Math.min(tp.sap,PAIL_CAP-P.pail.L);tp.sap-=take;P.pail.L+=take;P.pail.kind='eau';setPail(P.pail);toast(`+${fmtL(take)} d'eau d'érable (seau : ${fmtL(P.pail.L)})`);}
function pourSap(b){const put=Math.min(P.pail.L,boilCap(b)-b.sap);if(put<=0.01){toast(b.k==='evapo'?'L\'évaporateur est plein':'La bouilloire est pleine');return;}b.sap+=put;P.pail.L-=put;setPail(P.pail);toast(`Versé ${fmtL(put)} dans ${boilName(b)}`);}
function takeSyrup(b){const take=Math.min(b.syrup,PAIL_CAP-P.pail.L);b.syrup-=take;P.pail.L+=take;P.pail.kind='sirop';setPail(P.pail);toast(`+${fmtL(take)} de sirop 🍯`);}
function sellSyrup(){const v=Math.round(P.pail.L*syrupPrice());S.money+=v;J.syrup(P.pail.L,v);orderProgress('sirop',Math.round(P.pail.L));toast(`+${v} $ — ${fmtL(P.pail.L)} de sirop vendu`);P.pail.L=0;setPail(P.pail);}
function dropPail(){const p=P.pail;addGroundPail(P.x+Math.sin(P.rot)*0.7,P.z+Math.cos(P.rot)*0.7,p.kind,p.L);setPail(null);}
function putPailIn(cont){
  const p=P.pail,i=cont.pails.length,sl=cont.pslots[i],m=makePail();
  m.position.set(sl[0],0,sl[1]);setPailLook(m,p);cont.cargo.add(m);cont.pails.push({kind:p.kind,L:p.L,mesh:m});
  setPail(null);toast(`Seau rangé dans la ${cont.name} (${cont.pails.length}/${cont.pslots.length})`);
}
function takePailFrom(cont){const pp=cont.pails[cont.pails.length-1];if(!setPail({kind:pp.kind,L:pp.L}))return;cont.pails.pop();cont.cargo.remove(pp.mesh);}
function pickPail(gp){if(!setPail({kind:gp.kind,L:gp.L}))return;scene.remove(gp.mesh);pails.splice(pails.indexOf(gp),1);}
function fuelOf(c){return Math.round(c.len/FT*25);}
function boilInfo(b){
  const fire=b.fuel>0?`feu : ${Math.floor(b.fuel/60)} min ${String(Math.floor(b.fuel%60)).padStart(2,'0')} s`:'feu éteint (apporte du bois)';
  return `${b.k==='evapo'?'Évaporateur':'Bouilloire'} : ${fmtL(b.sap)} d'eau · ${fmtL(b.syrup)} de sirop · ${fire}`;
}
function pailContext(){
  const p=P.pail;let act=null,info=`Seau : ${pailTxt(p)}`;
  const act2={label:'Déposer le seau',fn:dropPail};
  if(nearStore()&&p.kind==='sirop'&&p.L>0.05)act={label:`Vendre le sirop (${fmtL(p.L)} → +${Math.round(p.L*syrupPrice())} $)`,fn:sellSyrup};
  else if(nearestSugar()){
    const b=nearestSugar();
    if(p.kind==='eau'&&p.L>0.05)act={label:`Verser l'eau d'érable (${fmtL(p.L)})`,fn:()=>pourSap(b)};
    else if(b.syrup>0.05&&p.L<PAIL_CAP-0.05)act={label:`Récolter le sirop (${fmtL(b.syrup)})`,fn:()=>takeSyrup(b)};
    info+=' · '+boilInfo(b);
  }else{
    const cont=nearestContainer();
    if(cont&&cont.pslots){
      if(cont.load.length)info=`La ${cont.name} contient du bois : un seul type de chargement à la fois`;
      else if(cont.pails.length>=cont.pslots.length)info=`La ${cont.name} est pleine de seaux`;
      else act={label:`Mettre le seau dans la ${cont.name} (${cont.pails.length}/${cont.pslots.length})`,fn:()=>putPailIn(cont)};
    }
    const tp=act||info.startsWith('La ')?null:nearestTap();
    if(tp){
      if(p.kind==='sirop'&&p.L>0.05)info='Ce seau contient du sirop : prends un autre seau pour l\'eau d\'érable';
      else if(p.L>=PAIL_CAP-0.05)info='Seau plein : va le verser dans la bouilloire ou l\'évaporateur';
      else if(tp.sap<0.3)info=`Chaudière presque vide (${fmtL(tp.sap)}) · seau : ${pailTxt(p)}`;
      else act={label:`Vider la chaudière (${fmtL(tp.sap)}) dans le seau`,fn:()=>collectSap(tp)};
    }
  }
  return {act,act2,info};
}

/* ----- Effets : fumée et vapeur ----- */
const puffTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'rgba(255,255,255,0.9)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);})();
const puffs=[];let puffT=0;
function spawnPuffAt(x,y,z,steam){
  const m=new T.Sprite(new T.SpriteMaterial({map:puffTex,color:steam?0xffffff:0x6f6a64,transparent:true,opacity:steam?0.55:0.45,depthWrite:false}));
  m.position.set(x,y,z);m.scale.setScalar(0.5);
  scene.add(m);puffs.push({m,life:steam?2.2:3,max:steam?2.2:3,vx:(Math.random()-0.5)*0.3,vz:(Math.random()-0.5)*0.3});
}
function updateSugar(dt){
  taps.forEach(tp=>{tp.sap=Math.min(TAP_CAP,tp.sap+SAP_RATE*dt);});
  puffT-=dt;const puff=puffT<=0;if(puff)puffT=0.35;
  S.builds.forEach(b=>{
    if(!isBoiler(b))return;
    const burning=b.fuel>0;
    if(burning){b.fuel=Math.max(0,b.fuel-dt);if(b.sap>0){const ev=Math.min(b.sap,boilRate(b)*dt);b.sap-=ev;b.syrup+=ev/SAP_PER_SYRUP;}}
    const o=b._o;if(!o)return;
    o.fl.visible=burning;
    if(burning)o.fl.children.forEach((f,i)=>{f.scale.y=0.8+0.35*Math.abs(Math.sin(S.time*(6+i)+i));});
    o.liquid.visible=b.sap+b.syrup>0.05;
    if(o.liquid.visible){const r=b.syrup*SAP_PER_SYRUP/(b.sap+b.syrup*SAP_PER_SYRUP);o.liquid.material.color.set(SAP_COL).lerp(new T.Color(SYRUP_COL),r);}
    if(burning&&puff){const y=H(b.x,b.z);
      if(b.k==='evapo'){const ch=lw(b,...EVP(0,-2.3)),lt=lw(b,(Math.random()-0.5)*0.9,-0.6+(Math.random()-0.5)*3.6);spawnPuffAt(ch.x,y+SUC_H+SUC_RISE+1.7,ch.z,false);if(b.sap>0){spawnPuffAt(lt.x,y+SUC_H+SUC_RISE+0.8,lt.z,true);spawnPuffAt(lt.x,y+SUC_H+SUC_RISE+0.8,lt.z,true);}}
      else{spawnPuffAt(b.x+(Math.random()-0.5)*0.8,y+0.7,b.z+(Math.random()-0.5)*0.5,false);if(b.sap>0)spawnPuffAt(b.x+(Math.random()-0.5)*0.8,y+1.2,b.z+(Math.random()-0.5)*0.5,true);}}
  });
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.life-=dt;p.m.position.y+=dt*0.9;p.m.position.x+=p.vx*dt;p.m.position.z+=p.vz*dt;p.m.scale.setScalar(0.5+(1-p.life/p.max)*1.6);p.m.material.opacity=Math.max(0,p.life/p.max)*0.5;if(p.life<=0){scene.remove(p.m);puffs.splice(i,1);}}
}

/* Chaudière pleine tenue en main : la verser dans la bouilloire ou dans un seau au sol, ou la vider */
function tapItemContext(){
  const it=heldItem();if(!it||it.id!=='chaudiere'||!it.d)return null;
  const sap=it.d.sap,b=nearestSugar(),gp=nearestGroundPail();
  const spill={label:'Vider la chaudière par terre',fn:()=>{delete it.d;syncTool();renderInv();toast('Chaudière vidée');}};
  if(b){const put=Math.min(sap,boilCap(b)-b.sap);return {act:put>0.01?{label:`Verser la chaudière dans ${boilName(b)} (${fmtL(sap)})`,fn:()=>{b.sap+=put;it.d.sap-=put;if(it.d.sap<0.05)delete it.d;syncTool();renderInv();toast(`Versé ${fmtL(put)} dans la bouilloire`);}}:null,act2:spill,info:put>0.01?'':'La bouilloire est pleine'};}
  if(gp&&gp.kind!=='sirop'&&gp.L<PAIL_CAP-0.05){const put=Math.min(sap,PAIL_CAP-gp.L);return {act:{label:`Verser la chaudière dans le seau (${fmtL(put)})`,fn:()=>{gp.L+=put;gp.kind='eau';setPailLook(gp.mesh,gp);it.d.sap-=put;if(it.d.sap<0.05)delete it.d;syncTool();renderInv();}},act2:spill};}
  return {info:`Chaudière : ${fmtL(sap)} d'eau d'érable · verse-la dans la bouilloire ou dans un seau posé par terre`,act2:spill};
}
/* Actions à pied propres à ces nouveautés (priorité sur le reste quand on est tout près) */
function footExtras(){
  if(nearSign())return {act:{label:'Voir les prix du bois (scierie)',fn:openBoard}};
  const gp=nearestGroundPail();
  if(gp)return {act:{label:`Prendre le seau (${pailTxt(gp)})`,fn:()=>pickPail(gp)}};
  const s=footSaleContext();if(s)return s;
  return campExtras();
}
