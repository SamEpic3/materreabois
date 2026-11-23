/* Fendeuse à bûches : remorque qu'on attache au VTT ou au pick-up; on y fend les bûches courtes en quartiers */
const SPLIT_MAX=26*INCH;          // longueur maximale d'une bûche à fendre
const SPLIT_TIME=1.4;             // secondes pour fendre
const SPLIT_BONUS=1.8;            // le bois fendu se vend plus cher
const splitSide=mat(0xb08a5c);

/* Quartiers de bûche (4 morceaux d'un cylindre) */
function mergeGeos(list){
  const pos=[],nor=[],uv=[],groups=[];let off=0;
  list.forEach(g=>{
    const a=g.attributes,n=a.position.count;
    pos.push(...a.position.array);nor.push(...a.normal.array);uv.push(...(a.uv?a.uv.array:new Float32Array(n*2)));
    (g.groups.length?g.groups:[{start:0,count:n,materialIndex:0}]).forEach(gr=>groups.push({start:gr.start+off,count:gr.count,m:gr.materialIndex}));
    off+=n;
  });
  const out=new T.BufferGeometry();
  out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  groups.forEach(g=>out.addGroup(g.start,g.count,g.m));return out;
}
const splitCache={};
function splitGeo(len,ra,rb){
  const r=(ra+rb)/2,key=len.toFixed(3)+'|'+r.toFixed(3);if(splitCache[key])return splitCache[key];
  const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(r,0);sh.absarc(0,0,r,0,Math.PI/2,false);sh.lineTo(0,0);
  const parts=[];
  for(let k=0;k<4;k++){
    const g=new T.ExtrudeGeometry(sh,{depth:len,bevelEnabled:false,curveSegments:4});
    const ng=g.index?g.toNonIndexed():g;ng.translate(0.012,0.012,-len/2);ng.rotateZ(k*Math.PI/2);parts.push(ng);
  }
  return splitCache[key]=mergeGeos(parts);
}
const SPLIT_MATS=[endM,splitSide];

/* ----- Modèle ----- */
function makeFendeuse(){
  const g=new T.Group(),red=mat(0xb2302a),dark=mat(0x262626),steel=mat(0x8f969b),blk=mat(0x1b1b1b),eng=mat(0x3f4448);
  box(0.2,0.2,2.5,red,0,0.62,0.05,g);                  // poutre
  box(0.08,0.08,0.5,steel,0,0.55,1.55,g);              // timon
  box(0.36,0.04,1.3,steel,0,0.74,-0.3,g);              // berceau
  [-0.17,0.17].forEach(x=>box(0.03,0.12,1.3,steel,x,0.8,-0.3,g));
  const wedge=new T.Mesh(new T.ConeGeometry(0.16,0.32,4),steel);wedge.rotation.x=-Math.PI/2;wedge.rotation.z=Math.PI/4;wedge.position.set(0,0.86,-1.0);g.add(wedge);
  box(0.44,0.4,0.08,red,0,0.9,-1.16,g);               // butée
  const cyl=new T.Mesh(new T.CylinderGeometry(0.07,0.07,0.75,10),dark);cyl.rotation.x=Math.PI/2;cyl.position.set(0,0.86,0.75);g.add(cyl);
  const ram=new T.Group();ram.position.set(0,0.86,0.36);g.add(ram);
  const rod=new T.Mesh(new T.CylinderGeometry(0.035,0.035,0.4,8),steel);rod.rotation.x=Math.PI/2;rod.position.z=0.2;ram.add(rod);
  box(0.3,0.3,0.05,red,0,0,0,ram);                     // pousseur
  box(0.42,0.34,0.42,eng,0.36,0.95,0.55,g);            // moteur
  box(0.3,0.16,0.2,red,0.36,1.2,0.5,g);                // réservoir
  box(0.04,0.3,0.04,blk,-0.2,1.0,0.65,g);              // levier
  const wg=new T.CylinderGeometry(0.28,0.28,0.18,12);wg.rotateZ(Math.PI/2);
  const wheels=[];[0.42,-0.42].forEach(x=>{const w=new T.Mesh(wg,blk);w.position.set(x,0.28,0.1);g.add(w);wheels.push(w);});
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();g.add(cargo);
  return {g,wheels,cargo,ram};
}
TSPECS.fendeuse={name:'fendeuse',label:'Fendeuse',build:makeFendeuse,tl:1.8,cols:[[0.75,0.45],[-0.4,0.5]],hl:1.1,hw:0.5,cap:0,r:2.2,wr:0.28,tilt:0.04,splitter:true,slots:[]};
VEH_SHOP.push({id:'fendeuse',kind:'trailer',name:'Fendeuse à bûches',price:1800,desc:`Fendeuse à moteur sur roues : attache-la au VTT ou au pick-up. Apporte-lui des bûches de ${Math.round(SPLIT_MAX/INCH)} po maximum : le bois fendu se vend presque deux fois plus cher.`});

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
    s.time+=dt;const k=s.time/SPLIT_TIME,ram=t.mesh.ram;
    const push=k<0.7?k/0.7:Math.max(0,1-(k-0.7)/0.3);
    ram.position.z=0.36-push*0.45;s.mesh.position.z=-0.3-Math.min(push,1)*0.25;
    if(k>=0.7&&!s.done){s.done=true;s.mesh.geometry=splitGeo(s.c.len,s.c.ra,s.c.rb);s.mesh.material=SPLIT_MATS;}
    if(k>=1){
      t.mesh.cargo.remove(s.mesh);t.splitting=null;ram.position.z=0.36;
      const c=Object.assign({},s.c,{split:true});
      if(!P.carry&&!P.pail&&Math.hypot(P.x-t.x,P.z-t.z)<3)setCarry(c);
      else addPiece({cx:t.x+Math.cos(t.th)*0.9,cz:t.z-Math.sin(t.th)*0.9,rot:t.th,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,split:true,crown:false});
      toast(`🪓 Bûche fendue : vaut maintenant ${priceOf(c)} $`);
    }
  });
}
