/* Abatteuse multifonctionnelle : grosse machine sur roues avec flèche et tête d'abattage.
   - Approche la tête (devant la machine) d'un arbre et appuie : elle l'agrippe, le scie et le couche loin de la machine.
   - Approche la tête d'une tige couchée : elle la façonne en billots de 8 pi d'un coup. */
const HARV_REACH=3.7,HARV_CUT_T=1.3,HARV_PROC_T=1.8,LOG8=2.44;
function makeHarvester(){
  const g=new T.Group();
  const body=new T.MeshPhongMaterial({color:0xc8501e,flatShading:true,shininess:35,specular:0x333333}),dark=mat(0x262626),metal=new T.MeshPhongMaterial({color:0x55595d,shininess:40,specular:0x333333});
  const glassM=new T.MeshPhongMaterial({color:0x22313d,shininess:100,specular:0x8899aa}),yel=mat(0xe8c23a);
  // Châssis bas, compartiment moteur à l'arrière, cabine vitrée à l'avant
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.9,0.55,4.6).translate(0,1.0,-0.1),new T.BoxGeometry(1.95,1.0,1.6).translate(0,1.75,-1.55),
    new T.BoxGeometry(1.7,0.25,1.5).translate(0,2.37,-1.55)]),body));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.5,0.12,1.6).translate(0,2.95,1.15),new T.BoxGeometry(0.08,1.4,0.08).translate(0.7,2.2,0.4),new T.BoxGeometry(0.08,1.4,0.08).translate(-0.7,2.2,0.4),
    new T.BoxGeometry(0.08,1.4,0.08).translate(0.7,2.2,1.9),new T.BoxGeometry(0.08,1.4,0.08).translate(-0.7,2.2,1.9),new T.CylinderGeometry(0.07,0.08,0.8,10).translate(0.6,2.85,-1.9),
    new T.BoxGeometry(1.6,0.06,0.04).translate(0,1.7,-2.38)]),dark));
  g.add(new T.Mesh(new T.BoxGeometry(1.36,1.3,1.42).translate(0,2.2,1.15),glassM));
  g.add(new T.Mesh(mergeGeos([0,1,2,3].map(k=>new T.BoxGeometry(1.5,0.03,0.03).translate(0,1.95+k*0.1,-2.36))),metal));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.22,0.1,0.04).translate(0.5,2.88,1.88),new T.BoxGeometry(0.22,0.1,0.04).translate(-0.5,2.88,1.88)]),new T.MeshBasicMaterial({color:0xfff3b0})));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.16,0.08,0.04).translate(0.75,1.3,-2.42),new T.BoxGeometry(0.16,0.08,0.04).translate(-0.75,1.3,-2.42)]),new T.MeshBasicMaterial({color:0xc0261e})));
  // Gyrophare
  g.add(new T.Mesh(new T.CylinderGeometry(0.08,0.08,0.12,10).translate(-0.55,3.07,1.6),new T.MeshBasicMaterial({color:0xffa020})));
  // Tourelle, flèche (deux sections) et tête d'abattage
  const turret=new T.Group();turret.position.set(0,2.5,-0.35);g.add(turret);
  turret.add(new T.Mesh(new T.CylinderGeometry(0.45,0.5,0.35,14),dark));
  const boom=new T.Group();boom.position.set(0.35,0.25,0);turret.add(boom);
  boom.add(new T.Mesh(new T.BoxGeometry(0.28,0.32,2.4).translate(0,0,1.2),body));
  boom.add(new T.Mesh(new T.CylinderGeometry(0.07,0.07,1.6,8).rotateX(Math.PI/2).translate(0,-0.28,0.8),metal));
  const stick=new T.Group();stick.position.set(0,0,2.4);boom.add(stick);
  stick.add(new T.Mesh(new T.BoxGeometry(0.22,0.24,2.0).translate(0,0,1.0),body));
  const head=new T.Group();head.position.set(0,0,2.0);stick.add(head);
  head.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.55,0.75,0.4).translate(0,-0.55,0),new T.CylinderGeometry(0.06,0.06,0.3,8).translate(0,-0.1,0)]),yel));
  head.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.16,0.16,0.3,12).rotateZ(Math.PI/2).translate(0,-0.45,0.25),new T.CylinderGeometry(0.16,0.16,0.3,12).rotateZ(Math.PI/2).translate(0,-0.8,0.25),
    new T.BoxGeometry(0.5,0.05,0.18).translate(0,-0.98,0.3),new T.BoxGeometry(0.08,0.05,0.5).rotateY(0.6).translate(0.25,-0.7,0.35),new T.BoxGeometry(0.08,0.05,0.5).rotateY(-0.6).translate(-0.25,-0.7,0.35)]),dark));
  // Six grosses roues (bogie arrière)
  const W=wheelGeo(0.68,0.55),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0xc8501e,shininess:35});
  const wheels=[];
  [1.45,-1.0,-2.0].forEach(z=>[1.0,-1.0].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,hub));w.position.set(x,0.68,z);g.add(w);wheels.push(w);}));
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots:[],turret,boom,stick,head};
}
SPECS.abat={name:'Abatteuse',build:makeHarvester,hitch:null,wb:2.9,wr:0.68,maxF:6.5,maxR:3,acc:3.8,mudLoss:0.15,steer:0.45,steerRate:2,hl:1.8,hw:1.15,
  cols:[[1.7,1.2],[0.4,1.2],[-0.9,1.2],[-2.1,1.1]],enterR:3.4,seat:[0,1.35,1.1],hide:true,eye:[0,2.65,1.3],side:2.1,cam:[12,5],arrowY:4.4};
VEH_SHOP.push({id:'abat',kind:'veh',name:'Abatteuse multifonctionnelle',price:45000,desc:'Elle abat un arbre en quelques secondes et façonne les tiges en billots de 8 pi. Approche la tête (devant la machine) d\'un arbre ou d\'une tige couchée.'});

/* ----- Ce que la tête peut atteindre ----- */
function harvHead(v){return {x:v.x+Math.sin(v.th)*HARV_REACH,z:v.z+Math.cos(v.th)*HARV_REACH};}
function harvTree(v){
  const h=harvHead(v);let best=null,bd=1.6;
  eachNear(h.x,h.z,c=>{if(c.tree&&c.tree.alive){const d=Math.hypot(h.x-c.x,h.z-c.z)-c.r;if(d<bd){bd=d;best=c.tree;}}return false;});
  return best;
}
function distToPiece(p,pc){const b=pieceButt(pc),ux=Math.sin(pc.rot),uz=Math.cos(pc.rot),s=clamp((p.x-b.x)*ux+(p.z-b.z)*uz,0,pc.len);return Math.hypot(p.x-(b.x+ux*s),p.z-(b.z+uz*s));}
function harvPiece(v){const h=harvHead(v);let best=null,bd=2.0;pieces.forEach(pc=>{if(pc.crown||pc.split||pc.len<LOG8+0.4)return;const d=distToPiece(h,pc);if(d<bd){bd=d;best=pc;}});return best;}
function harvWhyNot(t){
  if(t.planted&&t.grow<1)return 'Trop petit : c\'est un jeune plant';
  {const m=notMine(t.x,t.z,'de bûcher');if(m)return m;}
  if(typeof tapOf==='function'&&tapOf(t))return 'Érable entaillé : retire la chaudière d\'abord';
  return '';
}
function harvContext(v){
  if(v.harv)return {info:v.harv.mode==='cut'?'La tête scie l\'arbre…':'La tête façonne la tige…'};
  if(Math.abs(v.v)>0.8)return {info:'Arrête-toi pour travailler avec la tête'};
  const t=harvTree(v),pc=harvPiece(v),h=harvHead(v);
  const dT=t?Math.hypot(h.x-t.x,h.z-t.z):1e9,dP=pc?distToPiece(h,pc):1e9;
  if(t&&dT<=dP){const w=harvWhyNot(t);if(w)return {info:w};return {act:{label:'Abattre l\'arbre',fn:()=>harvStart(v,'cut',t)}};}
  if(pc){const n=Math.floor(pc.len/LOG8);return {act:{label:`Façonner : ${n} billot${n>1?'s':''} de 8 pi`,fn:()=>harvStart(v,'proc',pc)}};}
  return {info:'Approche la tête d\'un arbre debout ou d\'une tige couchée'};
}
function harvStart(v,mode,target){v.harv={mode,target,t:0};}
// Abattre en couchant l'arbre loin de la machine
function fellFrom(t,ox,oz){
  hideTree(t);
  const g=treeGroupFromParts(t.parts);g.position.set(t.x,t.y,t.z);scene.add(g);
  let fx=t.x-ox,fz=t.z-oz;const d=Math.hypot(fx,fz)||1;fx/=d;fz/=d;
  // la machine couche l'arbre de côté, pas sur elle
  const sx=fz,sz=-fx;fx=fx*0.3+sx*0.95;fz=fz*0.3+sz*0.95;const l=Math.hypot(fx,fz);fx/=l;fz/=l;
  falling.push({t,g,fx,fz,axis:new T.Vector3(fz,0,-fx),time:0});t.fd=[Math.round(fx*100)/100,Math.round(fz*100)/100];
  makeStump(t);
}
function buckPiece(pc){
  const b=pieceButt(pc),ux=Math.sin(pc.rot),uz=Math.cos(pc.rot);
  removePiece(pc);
  let s=0,n=0;const rAt=d=>pc.ra+(pc.rb-pc.ra)*d/pc.len;
  while(pc.len-s>=LOG8-0.01){const a=s,e=s+LOG8;
    addPiece({cx:b.x+ux*(a+e)/2,cz:b.z+uz*(a+e)/2,rot:pc.rot,len:LOG8,ra:rAt(a),rb:rAt(e),sp:pc.sp,crown:false});s=e+0.02;n++;}
  if(pc.len-s>0.35)addPiece({cx:b.x+ux*(s+pc.len)/2,cz:b.z+uz*(s+pc.len)/2,rot:pc.rot,len:pc.len-s,ra:rAt(s),rb:pc.rb,sp:pc.sp,crown:false});
  return n;
}
function updateHarvesters(dt){
  vehicles.forEach(v=>{
    if(v.type!=='abat')return;
    const m=v.mesh,h=v.harv;
    let reach=0;
    if(h){
      h.t+=dt;const T0=h.mode==='cut'?HARV_CUT_T:HARV_PROC_T,k=h.t/T0;
      reach=k<0.35?k/0.35:k<0.8?1:Math.max(0,1-(k-0.8)/0.2);
      if(!h.snd&&k>0.3){h.snd=1;sfxSwing('chainsaw',harvHead(v).x,harvHead(v).z,h.mode==='cut'?0.6:1.0);}
      if(k>=0.5&&!h.done){h.done=true;
        if(h.mode==='cut'){if(h.target.alive&&!harvWhyNot(h.target)){fellFrom(h.target,v.x,v.z);if(v.driver===ME.id)toast('Ça tombe! 🌲');}}
        else if(pieces.includes(h.target)){const n=buckPiece(h.target);if(v.driver===ME.id)toast(`Tige façonnée : ${n} billot${n>1?'s':''} de 8 pi`);}
      }
      if(k>=1)v.harv=null;
    }
    // la flèche s'allonge et la tête descend vers la cible
    m.boom.rotation.x=-0.5+reach*0.55;m.stick.rotation.x=1.9-reach*1.15;m.head.rotation.x=-m.boom.rotation.x-m.stick.rotation.x;
  });
}
