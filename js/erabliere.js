/* Érablière : entailler les érables, chaudières, seaux, feu et bouilloire à sirop */
const TAP_CAP=15,SAP_RATE=0.05;     // chaudière de 15 L, ~5 min pour la remplir
const PAIL_CAP=30;                  // seau de collecte de 30 L
const SAP_PER_SYRUP=40;             // 40 L d'eau d'érable pour 1 L de sirop
const BOIL_RATE=0.3;                // L d'eau évaporés par seconde quand le feu est pris
const PAN_CAP=60;                   // capacité de la bouilloire (eau d'érable)
const FUEL_MAX=600;
S.taps=4;                           // ensembles chaudière + chalumeau prêts à installer
const taps=[];                      // {t,sap,mesh}
const pails=[];                     // seaux posés au sol {x,z,kind,L,mesh}
const SAP_COL=0xcfe3ea,SYRUP_COL=0xb5651d;

function fmtL(l){return (Math.round(l*10)/10).toString().replace('.',',')+' L';}
function pailTxt(p){return p.L<0.05?'vide':`${fmtL(p.L)} ${p.kind==='sirop'?'de sirop':'d\'eau d\'érable'}`;}

/* ----- Modèles ----- */
function makeTapBucket(){
  const g=new T.Group(),gal=mat(0xb0b6ba);
  box(0.03,0.03,0.18,mat(0x8f969b),0,0.24,0.09,g);                       // chalumeau
  const b=new T.Mesh(new T.CylinderGeometry(0.17,0.13,0.32,10),gal);b.position.set(0,0,0.2);g.add(b);
  const lid=new T.Mesh(new T.ConeGeometry(0.24,0.12,10),gal);lid.position.set(0,0.22,0.22);g.add(lid);
  shadows(g);return g;
}
function makePail(){
  const g=new T.Group(),gal=mat(0xa9b0b5);
  const b=new T.Mesh(new T.CylinderGeometry(0.17,0.14,0.32,12),gal);b.position.y=0.16;g.add(b);
  const h=new T.Mesh(new T.TorusGeometry(0.16,0.012,4,12,Math.PI),mat(0x55595c));h.position.y=0.32;g.add(h);
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
  const g=new T.Group(),stone=mat(0x8a8780),metal=mat(0x9aa0a4),dark=mat(0x2a2a2a),wood=mat(0x6e5236);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,s=new T.Mesh(new T.DodecahedronGeometry(0.22,0),stone);s.position.set(Math.cos(a)*0.85,0.12,Math.sin(a)*0.85);s.rotation.set(i,i*2,0);g.add(s);}
  [-0.25,0.25].forEach((x,i)=>{const l=box(0.9,0.16,0.16,wood,0,0.12,x,g);l.rotation.y=i?0.5:-0.5;});
  [[-0.75,-0.45],[0.75,-0.45],[-0.75,0.45],[0.75,0.45]].forEach(([x,z])=>box(0.06,0.95,0.06,dark,x,0.48,z,g));
  box(1.6,0.06,1.0,metal,0,0.95,0,g);
  box(1.6,0.25,0.05,metal,0,1.08,0.5,g);box(1.6,0.25,0.05,metal,0,1.08,-0.5,g);box(0.05,0.25,1.0,metal,0.8,1.08,0,g);box(0.05,0.25,1.0,metal,-0.8,1.08,0,g);
  return g;
}
function createSucres(b,o){
  const g=makeSucresModel();
  const liquid=new T.Mesh(new T.BoxGeometry(1.42,0.04,0.82),new T.MeshBasicMaterial({color:SAP_COL}));liquid.position.set(0,1.0,0);liquid.visible=false;g.add(liquid);
  const fl=flameGroup();g.add(fl);
  o.add(g);o.col(b.x,b.z,1.0);
  o.liquid=liquid;o.fl=fl;
}
function addGroundPail(x,z,kind,L){
  const m=makePail(),p={x,z,kind,L,mesh:m};m.position.set(x,H(x,z),z);setPailLook(m,p);scene.add(m);pails.push(p);return p;
}

/* Seau tenu par le joueur */
const handPail=makePail();handPail.position.set(0,-0.98,0.05);handPail.visible=false;player.armR.add(handPail);
function setPail(p){P.pail=p;handPail.visible=!!p;if(p)setPailLook(handPail,p);updateToolVisual();}

/* ----- Proximité ----- */
function nearestSugar(){return nearestBuild('sucres',2.4);}
function nearStore(){return Math.hypot(P.x-STORE_DOOR.x,P.z-STORE_DOOR.z)<3;}
function tapOf(t){return taps.find(x=>x.t===t)||null;}
function nearestTap(){let b=null,bd=1.8;taps.forEach(tp=>{const d=Math.hypot(P.x-tp.t.x,P.z-tp.t.z);if(d<bd){bd=d;b=tp;}});return b;}
function nearestGroundPail(){let b=null,bd=1.3;pails.forEach(p=>{const d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;b=p;}});return b;}

/* ----- Entailles ----- */
function tapTree(t){
  if(S.taps<=0||tapOf(t))return;
  S.taps--;
  placeTap(t,Math.atan2(P.x-t.x,P.z-t.z),0);
  toast(`Érable entaillé 🍁 (il te reste ${S.taps} chaudière${S.taps>1?'s':''})`);
}
function placeTap(t,a,sap){
  const dx=Math.sin(a),dz=Math.cos(a),m=makeTapBucket();
  m.position.set(t.x+dx*0.28*t.s,t.y+1.05,t.z+dz*0.28*t.s);m.rotation.y=a;scene.add(m);
  taps.push({t,sap,mesh:m});
}
function untap(tp){scene.remove(tp.mesh);taps.splice(taps.indexOf(tp),1);S.taps++;toast('Chaudière retirée');}
function treeContext(t){
  if(t.planted&&t.grow<1)return {info:saplingInfo(t)};
  const tp=tapOf(t);
  if(tp)return {act:{label:'Retirer la chaudière',fn:()=>untap(tp)},info:`Érable entaillé · chaudière : ${fmtL(tp.sap)} / ${TAP_CAP} L`+(TOOL?' · retire la chaudière avant de l\'abattre':'')};
  const tapAct=(t.type==='erable'&&S.taps>0)?{label:`Entailler l'érable (${S.taps} chaudière${S.taps>1?'s':''})`,fn:()=>tapTree(t)}:null;
  if(!TOOL)return {act:tapAct,info:tapAct?'':'Mains vides : choisis un outil pour bûcher (touches 1 à 9)'};
  if(TOOL.kind==='shovel')return {act:tapAct,info:tapAct?'':'La pelle sert à essoucher : choisis un outil de coupe pour bûcher'};
  const tot=fellTotal(t);
  return {act:{label:`${toolVerb()} (${Math.round(t.work*tot)}/${tot})`,fn:()=>chop(t),cool:true},act2:tapAct};
}

/* ----- Seau, feu et bouilloire ----- */
function collectSap(tp){const take=Math.min(tp.sap,PAIL_CAP-P.pail.L);tp.sap-=take;P.pail.L+=take;P.pail.kind='eau';setPail(P.pail);toast(`+${fmtL(take)} d'eau d'érable (seau : ${fmtL(P.pail.L)})`);}
function pourSap(b){const put=Math.min(P.pail.L,PAN_CAP-b.sap);if(put<=0.01){toast('La bouilloire est pleine');return;}b.sap+=put;P.pail.L-=put;setPail(P.pail);toast(`Versé ${fmtL(put)} dans la bouilloire`);}
function takeSyrup(b){const take=Math.min(b.syrup,PAIL_CAP-P.pail.L);b.syrup-=take;P.pail.L+=take;P.pail.kind='sirop';setPail(P.pail);toast(`+${fmtL(take)} de sirop 🍯`);}
function sellSyrup(){const v=Math.round(P.pail.L*syrupPrice());S.money+=v;toast(`+${v} $ — ${fmtL(P.pail.L)} de sirop vendu`);P.pail.L=0;setPail(P.pail);}
function dropPail(){const p=P.pail;addGroundPail(P.x+Math.sin(P.rot)*0.7,P.z+Math.cos(P.rot)*0.7,p.kind,p.L);setPail(null);}
function putPailIn(cont){
  const p=P.pail,i=cont.pails.length,sl=cont.pslots[i],m=makePail();
  m.position.set(sl[0],0,sl[1]);setPailLook(m,p);cont.cargo.add(m);cont.pails.push({kind:p.kind,L:p.L,mesh:m});
  setPail(null);toast(`Seau rangé dans la ${cont.name} (${cont.pails.length}/${cont.pslots.length})`);
}
function takePailFrom(cont){const pp=cont.pails.pop();cont.cargo.remove(pp.mesh);setPail({kind:pp.kind,L:pp.L});}
function pickPail(gp){scene.remove(gp.mesh);pails.splice(pails.indexOf(gp),1);setPail({kind:gp.kind,L:gp.L});}
function fuelOf(c){return Math.round(c.len/FT*25);}
function boilInfo(b){
  const fire=b.fuel>0?`feu : ${Math.floor(b.fuel/60)} min ${String(Math.floor(b.fuel%60)).padStart(2,'0')} s`:'feu éteint (apporte du bois)';
  return `Bouilloire : ${fmtL(b.sap)} d'eau · ${fmtL(b.syrup)} de sirop · ${fire}`;
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
      else if(p.L>=PAIL_CAP-0.05)info='Seau plein : va le verser dans la bouilloire';
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
    if(b.k!=='sucres')return;
    const burning=b.fuel>0;
    if(burning){b.fuel=Math.max(0,b.fuel-dt);if(b.sap>0){const ev=Math.min(b.sap,BOIL_RATE*dt);b.sap-=ev;b.syrup+=ev/SAP_PER_SYRUP;}}
    const o=b._o;if(!o)return;
    o.fl.visible=burning;
    if(burning)o.fl.children.forEach((f,i)=>{f.scale.y=0.8+0.35*Math.abs(Math.sin(S.time*(6+i)+i));});
    o.liquid.visible=b.sap+b.syrup>0.05;
    if(o.liquid.visible){const r=b.syrup*SAP_PER_SYRUP/(b.sap+b.syrup*SAP_PER_SYRUP);o.liquid.material.color.set(SAP_COL).lerp(new T.Color(SYRUP_COL),r);}
    if(burning&&puff){const y=H(b.x,b.z);spawnPuffAt(b.x+(Math.random()-0.5)*0.8,y+0.7,b.z+(Math.random()-0.5)*0.5,false);if(b.sap>0)spawnPuffAt(b.x+(Math.random()-0.5)*0.8,y+1.2,b.z+(Math.random()-0.5)*0.5,true);}
  });
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.life-=dt;p.m.position.y+=dt*0.9;p.m.position.x+=p.vx*dt;p.m.position.z+=p.vz*dt;p.m.scale.setScalar(0.5+(1-p.life/p.max)*1.6);p.m.material.opacity=Math.max(0,p.life/p.max)*0.5;if(p.life<=0){scene.remove(p.m);puffs.splice(i,1);}}
}

/* Actions à pied propres à ces nouveautés (priorité sur le reste quand on est tout près) */
function footExtras(){
  if(nearSign())return {act:{label:'Voir les prix du bois (scierie)',fn:openBoard}};
  const gp=nearestGroundPail();
  if(gp)return {act:{label:`Prendre le seau (${pailTxt(gp)})`,fn:()=>pickPail(gp)}};
  const s=footSaleContext();if(s)return s;
  return campExtras();
}
