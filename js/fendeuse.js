/* Fendeuse à bûches : remorque qu'on attache au VTT ou au pick-up; on y fend les bûches courtes en quartiers */
const SPLIT_MAX=26*INCH;          // longueur maximale d'une bûche à fendre
const SPLIT_TIME=1.4;             // secondes pour fendre
const SPLIT_BONUS=1.8;            // le bois fendu se vend plus cher
const splitSide=mat(0xb08a5c);

/* Quartiers de bûche (4 morceaux d'un cylindre) */
// split : 2 = les deux moitiés tenues ensemble (en main), 1 = une moitié seule
const splitCache={};
function halfGeoParts(len,r,gap){
  const sh=new T.Shape();sh.moveTo(-r,0);sh.absarc(0,0,r,Math.PI,0,true);sh.lineTo(-r,0);
  const g=new T.ExtrudeGeometry(sh,{depth:len,bevelEnabled:false,curveSegments:6});
  const ng=g.index?g.toNonIndexed():g;ng.translate(0,gap,-len/2);return ng;
}
function splitGeo(len,ra,rb,split){
  const r=(ra+rb)/2,n=split===2?2:1,key=n+'|'+len.toFixed(3)+'|'+r.toFixed(3);if(splitCache[key])return splitCache[key];
  const parts=[];
  if(n===2){const a=halfGeoParts(len,r,0.015),b=halfGeoParts(len,r,0.015);b.rotateZ(Math.PI);parts.push(a,b);}
  else{const a=halfGeoParts(len,r,0);a.translate(0,-r*0.42,0);parts.push(a);}   // moitié posée à plat
  return splitCache[key]=mergeGeos(parts);
}
function splitFactor(c){return c.split===2?SPLIT_BONUS:c.split?SPLIT_BONUS/2:1;}
// Les deux moitiés deviennent indépendantes dès qu'on les dépose
function halvesOf(c){return c.split===2?[Object.assign({},c,{split:1}),Object.assign({},c,{split:1})]:[c];}
const SPLIT_MATS=[endM,splitSide];splitSide.userData.shared=true;

/* ----- Modèle ----- */
function makeFendeuse(){
  const g=new T.Group(),red=new T.MeshPhongMaterial({color:0xb2302a,shininess:60,specular:0x553333}),dark=mat(0x262626),steel=new T.MeshPhongMaterial({color:0x9aa1a6,shininess:80,specular:0x888888}),blk=mat(0x1b1b1b),eng=mat(0x3f4448);
  // Poutre en I, timon en V avec attelage
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.22,0.04,2.5).translate(0,0.72,0.05),new T.BoxGeometry(0.22,0.04,2.5).translate(0,0.52,0.05),new T.BoxGeometry(0.05,0.2,2.5).translate(0,0.62,0.05),
    new T.BoxGeometry(0.44,0.4,0.08).translate(0,0.9,-1.16),new T.BoxGeometry(0.36,0.04,0.3).translate(0,0.55,0.25)]),red));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.06,0.06,0.75).rotateY(-0.35).translate(0.12,0.55,1.6),new T.BoxGeometry(0.06,0.06,0.75).rotateY(0.35).translate(-0.12,0.55,1.6),
    new T.CylinderGeometry(0.05,0.05,0.06,10).translate(0,0.6,1.95),new T.BoxGeometry(0.12,0.04,0.12).translate(0,0.56,1.95),
    new T.BoxGeometry(0.36,0.04,1.3).translate(0,0.76,-0.3),new T.BoxGeometry(0.03,0.12,1.3).translate(0.17,0.82,-0.3),new T.BoxGeometry(0.03,0.12,1.3).translate(-0.17,0.82,-0.3),
    new T.BoxGeometry(0.04,0.04,0.5).translate(0,0.4,0.2),new T.BoxGeometry(0.5,0.04,0.04).translate(0,0.4,0.2)]),steel));
  // Coin (lame) en acier
  const wedge=new T.Mesh(new T.ConeGeometry(0.16,0.32,4),steel);wedge.rotation.x=-Math.PI/2;wedge.rotation.z=Math.PI/4;wedge.position.set(0,0.86,-1.0);g.add(wedge);
  // Vérin hydraulique avec boyaux
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.08,0.08,0.75,12).rotateX(Math.PI/2).translate(0,0.86,0.75),new T.CylinderGeometry(0.09,0.09,0.06,12).rotateX(Math.PI/2).translate(0,0.86,1.12),new T.CylinderGeometry(0.09,0.09,0.06,12).rotateX(Math.PI/2).translate(0,0.86,0.38)]),dark));
  g.add(new T.Mesh(mergeGeos([new T.TorusGeometry(0.17,0.015,5,10,Math.PI).rotateY(Math.PI/2).translate(0.12,0.95,0.7),new T.TorusGeometry(0.12,0.015,5,10,Math.PI).rotateY(Math.PI/2).translate(0.16,0.95,0.95)]),blk));
  const ram=new T.Group();ram.position.set(0,0.86,0.36);g.add(ram);
  const rod=new T.Mesh(new T.CylinderGeometry(0.035,0.035,0.4,8),steel);rod.rotation.x=Math.PI/2;rod.position.z=0.2;ram.add(rod);
  box(0.3,0.3,0.05,red,0,0,0,ram);
  // Moteur : bloc, réservoir, filtre à air, silencieux, lanceur
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.38,0.3,0.38).translate(0.38,0.93,0.55),new T.CylinderGeometry(0.11,0.11,0.06,14).rotateZ(Math.PI/2).translate(0.58,0.95,0.55)]),eng));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.3,0.14,0.22).translate(0.38,1.15,0.5),new T.CylinderGeometry(0.035,0.035,0.04,8).translate(0.42,1.24,0.48)]),red));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.12,0.16,0.18).translate(0.2,1.02,0.75),new T.CylinderGeometry(0.05,0.05,0.18,10).rotateZ(Math.PI/2).translate(0.46,0.88,0.78)]),blk));
  g.add(new T.Mesh(new T.CylinderGeometry(0.045,0.045,0.1,8).rotateZ(Math.PI/2).translate(0.62,0.95,0.55),mat(0xd8d2c4)));
  // Pompe et levier de commande
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.06,0.06,0.16,10).rotateZ(Math.PI/2).translate(0.13,0.93,0.55),new T.BoxGeometry(0.03,0.36,0.03).rotateX(0.3).translate(-0.18,1.0,0.62),new T.SphereGeometry(0.035,8,6).translate(-0.18,1.17,0.67)]),blk));
  const wg=wheelGeo(0.28,0.16);
  const wheels=[];[0.42,-0.42].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(wg.tread,blk),new T.Mesh(wg.rim,red));w.position.set(x,0.28,0.1);g.add(w);wheels.push(w);});
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.9,0.05,0.05).translate(0,0.28,0.1),new T.BoxGeometry(0.06,0.3,0.06).translate(0.1,0.42,0.1),new T.BoxGeometry(0.06,0.3,0.06).translate(-0.1,0.42,0.1)]),dark));
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();g.add(cargo);
  return {g,wheels,cargo,ram};
}
TSPECS.fendeuse={name:'fendeuse',label:'Fendeuse',build:makeFendeuse,tl:1.8,cols:[[0.75,0.45],[-0.4,0.5]],hl:1.1,hw:0.5,cap:0,r:2.2,wr:0.28,tilt:0.04,splitter:true,slots:[]};
VEH_SHOP.push({id:'fendeuse',kind:'trailer',name:'Fendeuse à bûches',price:1800,desc:`Fendeuse à moteur sur roues : attache-la au VTT ou au pick-up. Apporte-lui des bûches de ${Math.round(SPLIT_MAX/INCH)} po maximum : elle la fend en deux, et les deux moitiés valent presque deux fois plus qu'une bûche ronde.`});

/* ----- Fendre ----- */
function nearestSplitter(){
  let b=null,bd=1.9;
  trailers.forEach(t=>{if(!t.spec.splitter)return;const d=Math.hypot(P.x-t.x,P.z-t.z);if(d<bd){bd=d;b=t;}});
  return b;
}
function startSplit(t){
  const c=P.carry;setCarry(null);
  const m=makePieceMesh(c);m.position.set(0,0.86+0.02,-0.3);t.mesh.cargo.add(m);
  t.splitting={time:0,c,mesh:m};
}
function splitContext(){
  const t=nearestSplitter();if(!t)return null;
  if(t.splitting)return {info:'La fendeuse travaille…'};
  const c=P.carry;
  if(c.split)return {info:'Cette bûche est déjà fendue'};
  if(c.len>SPLIT_MAX)return {info:`Bûche de ${ftin(c.len)} : la fendeuse prend ${Math.round(SPLIT_MAX/INCH)} po maximum, recoupe-la`};
  if(t.hitch&&Math.abs(t.hitch.v)>0.3)return {info:'Arrête-toi avant de fendre'};
  return {act:{label:`Fendre la bûche (${ftin(c.len)})`,fn:()=>startSplit(t)}};
}
function updateSplitters(dt){
  trailers.forEach(t=>{
    const s=t.splitting;if(!s)return;
    if(!s.snd){s.snd=1;sfxSplitter(t.x,t.z,SPLIT_TIME);}
    s.time+=dt;const k=s.time/SPLIT_TIME,ram=t.mesh.ram;
    const push=k<0.7?k/0.7:Math.max(0,1-(k-0.7)/0.3);
    ram.position.z=0.36-push*0.45;s.mesh.position.z=-0.3-Math.min(push,1)*0.25;
    if(k>=0.7&&!s.done){s.done=true;sfxCrack(t.x,t.z);s.mesh.geometry=splitGeo(s.c.len,s.c.ra,s.c.rb,2);s.mesh.material=SPLIT_MATS;}
    if(k>=1){
      t.mesh.cargo.remove(s.mesh);t.splitting=null;ram.position.z=0.36;
      const c=Object.assign({},s.c,{split:2});
      if(!P.carry&&!P.pail&&Math.hypot(P.x-t.x,P.z-t.z)<3)setCarry(c);
      else halvesOf(c).forEach((h,i)=>addPiece({cx:t.x+Math.cos(t.th)*(0.9+i*0.35),cz:t.z-Math.sin(t.th)*(0.9+i*0.35),rot:t.th,len:h.len,ra:h.ra,rb:h.rb,sp:h.sp,split:1,crown:false}));
      J.split();toast(`🪓 Bûche fendue en deux : ${priceOf(c)} $ les deux moitiés`);
    }
  });
}
