/* Véhicules et remorques : modèles 3D, caractéristiques, création */
/* ---------- VTT ---------- */
const TL=1.9;
/* VTT : carrosserie moulée (ailes avant et arrière), réservoir, siège rembourré, guidon qui tourne,
   supports tubulaires, pneus à crampons. L'avant est vers +z. */
const VTT_GEO=(()=>{
  // Aile avant : nez qui descend vers les phares, arche au-dessus des roues
  const fr=new T.Shape();
  fr.moveTo(0.22,0.86);fr.lineTo(0.72,0.9);fr.quadraticCurveTo(1.0,0.9,1.08,0.72);fr.lineTo(1.08,0.62);
  fr.lineTo(0.98,0.62);fr.absarc(0.62,0.34,0.46,Math.PI*0.17,Math.PI*0.83,false);fr.lineTo(0.22,0.66);fr.lineTo(0.22,0.86);
  const front=sideExtrude(fr,1.18,0.03);
  // Aile arrière
  const rr=new T.Shape();
  rr.moveTo(-0.3,0.84);rr.lineTo(-0.85,0.88);rr.quadraticCurveTo(-1.08,0.88,-1.1,0.7);rr.lineTo(-1.1,0.62);rr.lineTo(-1.0,0.62);
  rr.absarc(-0.62,0.34,0.46,Math.PI*0.83,Math.PI*0.17,true);rr.lineTo(-0.3,0.66);rr.lineTo(-0.3,0.84);
  const rear=sideExtrude(rr,1.18,0.03);
  // Réservoir et capot central, siège rembourré
  const tk=new T.Shape();tk.moveTo(0.0,0.86);tk.lineTo(0.42,0.88);tk.quadraticCurveTo(0.5,1.04,0.34,1.08);tk.lineTo(0.06,1.06);tk.quadraticCurveTo(-0.02,1.0,0.0,0.86);
  const tank=sideExtrude(tk,0.5,0.05);
  const st=new T.Shape();st.moveTo(-0.66,0.92);st.lineTo(0.04,0.92);st.lineTo(0.04,1.02);st.quadraticCurveTo(-0.03,1.08,-0.13,1.08);st.lineTo(-0.56,1.06);st.quadraticCurveTo(-0.68,1.04,-0.66,0.92);
  const seat=sideExtrude(st,0.42,0.04);
  // Châssis, moteur, repose-pieds
  const frame=mergeGeos([new T.BoxGeometry(0.5,0.34,1.5).translate(0,0.56,-0.05),new T.BoxGeometry(0.44,0.3,0.5).translate(0,0.5,-0.05)]);
  const feet=mergeGeos([new T.BoxGeometry(0.26,0.04,0.62).translate(0.4,0.46,-0.08),new T.BoxGeometry(0.26,0.04,0.62).translate(-0.4,0.46,-0.08)]);
  // Supports tubulaires avant et arrière (cadre + barreaux)
  function rack(z0,z1,y){
    const parts=[],w=1.04,d=Math.abs(z1-z0),zc=(z0+z1)/2;
    [-w/2,w/2].forEach(x=>parts.push(cyl(0.018,d,6).rotateX(Math.PI/2).translate(x,y,zc)));
    [z0,z1].forEach(z=>parts.push(cyl(0.018,w,6).rotateZ(Math.PI/2).translate(0,y,z)));
    for(let k=1;k<4;k++)parts.push(cyl(0.012,d,5).rotateX(Math.PI/2).translate(-w/2+k*w/4,y,zc));
    [[-w/2,z0],[w/2,z0],[-w/2,z1],[w/2,z1]].forEach(([x,z])=>parts.push(cyl(0.016,0.1,6).translate(x,y-0.05,z)));
    return mergeGeos(parts);
  }
  const racks=mergeGeos([rack(0.6,1.02,0.97),rack(-0.62,-1.06,0.95)]);
  // Pare-chocs avant tubulaire et attache-remorque
  const bump=mergeGeos([cyl(0.025,0.7,8).rotateZ(Math.PI/2).translate(0,0.56,1.2),cyl(0.022,0.2,6).rotateX(Math.PI/2).translate(0.3,0.56,1.12),cyl(0.022,0.2,6).rotateX(Math.PI/2).translate(-0.3,0.56,1.12),
    new T.BoxGeometry(0.08,0.06,0.32).translate(0,0.42,-1.08),new T.SphereGeometry(0.035,8,6).translate(0,0.48,-1.22)]);
  // Guidon (tourne avec la direction)
  const bars=mergeGeos([cyl(0.022,0.32,6).translate(0,0.16,0),cyl(0.02,0.78,8).rotateZ(Math.PI/2).translate(0,0.3,-0.03),new T.BoxGeometry(0.16,0.07,0.1).translate(0,0.31,0.02)]);
  const grips=mergeGeos([cyl(0.03,0.13,8).rotateZ(Math.PI/2).translate(0.33,0.3,-0.03),cyl(0.03,0.13,8).rotateZ(Math.PI/2).translate(-0.33,0.3,-0.03)]);
  // Phares et feu arrière, silencieux
  const lamps=mergeGeos([cyl(0.075,0.05,12).rotateX(Math.PI/2).translate(0.28,0.76,1.1),cyl(0.075,0.05,12).rotateX(Math.PI/2).translate(-0.28,0.76,1.1)]);
  const tail=new T.BoxGeometry(0.16,0.06,0.03).translate(0,0.8,-1.12);
  const muffler=mergeGeos([cyl(0.06,0.4,10).rotateX(Math.PI/2).translate(0.34,0.68,-0.9),cyl(0.03,0.1,8).rotateX(Math.PI/2).translate(0.34,0.68,-1.12)]);
  return {front,rear,tank,seat,frame,feet,racks,bump,bars,grips,lamps,tail,muffler};
})();
// Pneu à crampons (arrondi) et jante; une géométrie par taille, partagée
const WHEEL_GEO={};
function wheelGeo(wr,ww){
  const k=wr+'|'+ww;if(WHEEL_GEO[k])return WHEEL_GEO[k];
  const ri=wr*0.58,h=ww/2,pts=[[ri,-h],[wr*0.9,-h],[wr*0.98,-h*0.75],[wr,-h*0.3],[wr,h*0.3],[wr*0.98,h*0.75],[wr*0.9,h],[ri,h]].map(([r,y])=>new T.Vector2(r,y));
  const tire=new T.LatheGeometry(pts,18);
  const lugs=[],n=Math.round(wr*55);   // crampons en chevrons, peu saillants
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const l=new T.BoxGeometry(0.022,ww*0.4,wr*0.13);l.translate(0,(i%2?1:-1)*ww*0.2,0);
    l.applyMatrix4(new T.Matrix4().makeRotationY(a).multiply(new T.Matrix4().makeTranslation(wr+0.004,0,0)));lugs.push(l);}
  const tread=mergeGeos([tire,...lugs]);tread.rotateZ(Math.PI/2);
  const rim=mergeGeos([new T.CylinderGeometry(ri,ri,ww*0.8,12),new T.CylinderGeometry(ri*0.35,ri*0.35,ww*0.9,8)]);rim.rotateZ(Math.PI/2);
  return WHEEL_GEO[k]={tread,rim};
}
function makeVTT(){
  const g=new T.Group(),G=VTT_GEO;
  const body=new T.MeshPhongMaterial({color:0x3d6b35,flatShading:true,shininess:30,specular:0x333333});
  const black=mat(0x1c1c1c),steel=new T.MeshPhongMaterial({color:0x2e3134,shininess:40,specular:0x444444}),chrome=new T.MeshPhongMaterial({color:0xb8bcc0,shininess:90,specular:0x888888});
  const seatM=new T.MeshPhongMaterial({color:0x232323,shininess:20,specular:0x222222});
  const add=(geo,m)=>{const me=new T.Mesh(geo,m);g.add(me);return me;};
  add(G.frame,steel);add(G.feet,black);add(G.front,body);add(G.rear,body);add(G.tank,body);add(G.seat,seatM);
  add(G.racks,steel);add(G.bump,steel);add(G.muffler,chrome);
  add(G.lamps,new T.MeshBasicMaterial({color:0xfff3b0}));add(G.tail,new T.MeshBasicMaterial({color:0xc0261e}));
  const bars=new T.Group();bars.position.set(0,0.98,0.38);bars.rotation.x=-0.25;g.add(bars);
  bars.add(new T.Mesh(G.bars,steel),new T.Mesh(G.grips,black));
  const {wheels,pivots}=addWheels(g,0.34,0.3,0.56,0.62,-0.62);
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots,bars};
}
function addWheels(g,wr,ww,wx,zf,zr){
  const W=wheelGeo(wr,ww),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0x8a8e92,shininess:50,specular:0x555555});
  const wheels=[],pivots=[];
  const mk=()=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire));w.add(new T.Mesh(W.rim,hub));return w;};
  [[wx,zf],[-wx,zf]].forEach(([x,z])=>{const pv=new T.Group();pv.position.set(x,wr,z);const w=mk();pv.add(w);g.add(pv);pivots.push(pv);wheels.push(w);});
  [[wx,zr],[-wx,zr]].forEach(([x,z])=>{const w=mk();w.position.set(x,wr,z);g.add(w);wheels.push(w);});
  return {wheels,pivots};
}
function makePickup(){
  const g=new T.Group();
  const red=mat(0x9e2b25),dark=mat(0x1e1e1e),chrome=mat(0xb8bcc0),glass=mat(0x2b3a48),light=new T.MeshBasicMaterial({color:0xfff3b0}),tail=new T.MeshBasicMaterial({color:0xc0261e});
  box(1.9,0.4,5.2,dark,0,0.72,0,g);
  box(1.92,0.55,1.6,red,0,1.15,1.85,g);                 // capot
  box(1.92,0.5,1.9,red,0,1.15,0.35,g);                  // bas de cabine
  box(1.86,0.5,1.7,red,0,1.65,0.3,g);                   // cabine
  const ws=box(1.88,0.42,0.06,glass,0,1.62,1.17,g);     // pare-brise
  const wn=box(1.9,0.36,1.3,glass,0,1.64,0.35,g);       // vitres
  g.userData.glass=[ws,wn];                              // cachées en vue 1re personne
  box(1.86,0.08,1.75,red,0,1.93,0.3,g);                 // toit
  box(0.1,0.55,2.3,red,0.91,1.2,-1.5,g);box(0.1,0.55,2.3,red,-0.91,1.2,-1.5,g);
  box(1.82,0.55,0.1,red,0,1.2,-2.62,g);box(1.72,0.06,2.3,dark,0,0.95,-1.5,g);
  box(1.96,0.18,0.16,chrome,0,0.78,2.68,g);box(1.96,0.18,0.16,chrome,0,0.72,-2.7,g);
  box(1.2,0.3,0.05,chrome,0,1.12,2.66,g);
  box(0.3,0.14,0.05,light,0.66,1.18,2.67,g);box(0.3,0.14,0.05,light,-0.66,1.18,2.67,g);
  box(0.12,0.3,0.05,tail,0.86,1.25,-2.67,g);box(0.12,0.3,0.05,tail,-0.86,1.25,-2.67,g);
  box(0.08,0.08,0.3,chrome,0,0.55,-2.85,g);
  const {wheels,pivots}=addWheels(g,0.42,0.32,0.9,1.6,-1.6);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.98,-1.5);g.add(cargo);
  return {g,wheels,pivots,cargo};
}
function makeTrailer(){
  const g=new T.Group();
  const wood=mat(0x8a6a44),metal=mat(0x4b4e50),tire=mat(0x1b1b1b);
  box(1.24,0.1,2.1,metal,0,0.58,0,g);
  box(0.06,0.32,2.1,wood,0.62,0.78,0,g);box(0.06,0.32,2.1,wood,-0.62,0.78,0,g);
  box(1.24,0.32,0.06,wood,0,0.78,1.05,g);box(1.24,0.32,0.06,wood,0,0.78,-1.05,g);
  box(0.08,0.08,0.9,metal,0,0.48,1.45,g);
  const wg=new T.CylinderGeometry(0.3,0.3,0.24,10);wg.rotateZ(Math.PI/2);
  const wheels=[];
  [0.76,-0.76].forEach(x=>{const w=new T.Mesh(wg,tire);w.position.set(x,0.3,0);g.add(w);wheels.push(w);});
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.y=0.63;g.add(cargo);
  return {g,wheels,cargo};
}
function addTandem(g,wr,ww,wx,dz){
  const wg=new T.CylinderGeometry(wr,wr,ww,12);wg.rotateZ(Math.PI/2);const tire=mat(0x1b1b1b),hub=mat(0x9a9ea2);
  const wheels=[];
  [[wx,dz],[-wx,dz],[wx,-dz],[-wx,-dz]].forEach(([x,z])=>{const w=new T.Group();w.add(new T.Mesh(wg,tire));const hb=new T.Mesh(new T.CylinderGeometry(wr*0.45,wr*0.45,ww+0.02,8),hub);hb.rotation.z=Math.PI/2;w.add(hb);w.position.set(x,wr,z);g.add(w);wheels.push(w);});
  return wheels;
}
function makeLoader(){
  const g=new T.Group();
  const frame=mat(0x2f4f3a),metal=mat(0x4b4e50),yel=mat(0xe0a91c),dark=mat(0x222222);
  box(0.26,0.22,5.6,frame,0,0.62,0.7,g);
  box(0.12,0.12,0.5,metal,0,0.55,3.55,g);
  [-1.6,0,1.6].forEach(z=>{box(1.75,0.14,0.2,frame,0,0.8,z,g);[-0.82,0.82].forEach(x=>box(0.1,1.45,0.1,frame,x,1.52,z,g));});
  box(1.1,0.12,0.8,frame,0,0.8,2.35,g);
  box(0.45,0.1,0.4,dark,-0.55,0.95,2.35,g);
  const wheels=addTandem(g,0.38,0.28,0.98,0.45);
  const slew=new T.Group();slew.position.set(0,0.86,2.35);g.add(slew);
  box(0.34,1.95,0.34,yel,0,0.98,0,slew);
  box(0.26,0.4,0.5,yel,0,1.95,0.15,slew);
  const boom=box(0.2,0.22,1,yel,0,1.95,0.5,slew);
  const link=box(0.07,1,0.07,metal,0,1.5,1,slew);
  const grapple=new T.Group();slew.add(grapple);
  box(0.24,0.18,0.24,dark,0,0.05,0,grapple);
  const clawL=box(0.08,0.55,0.5,yel,0.22,-0.22,0,grapple);
  const clawR=box(0.08,0.55,0.5,yel,-0.22,-0.22,0,grapple);
  const hold=new T.Group();hold.position.y=-0.32;grapple.add(hold);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.87,0);g.add(cargo);
  return {g,wheels,cargo,crane:{slew,boom,link,grapple,clawL,clawR,hold}};
}
function makeSkidder(){
  const g=new T.Group(),yel=mat(0xd9a520),dark=mat(0x262626),glass=mat(0x2b3a48),metal=mat(0x5a5e62);
  const front=new T.Group(),rear=new T.Group();g.add(front);g.add(rear);
  box(1.4,0.85,1.9,yel,0,1.25,1.25,front);
  box(1.5,0.3,0.6,dark,0,0.8,0.35,front);
  box(2.5,0.75,0.18,dark,0,0.55,2.6,front);
  box(0.1,0.75,0.1,dark,0.45,2.0,1.6,front);
  box(1.5,0.6,2.2,yel,0,1.05,-1.05,rear);
  box(1.35,1.15,1.25,yel,0,1.9,-0.35,rear);
  box(1.38,0.66,1.15,glass,0,2.05,-0.35,rear);
  box(1.45,0.08,1.35,dark,0,2.52,-0.35,rear);
  [-0.62,0.62].forEach(x=>box(0.16,1.7,0.16,dark,x,1.75,-2.05,rear));
  box(1.4,0.16,0.2,dark,0,2.6,-2.05,rear);
  const grapple=new T.Group();grapple.position.set(0,1.5,-2.5);rear.add(grapple);
  box(0.25,0.5,0.25,metal,0,0.15,0,grapple);
  const cl=box(0.1,0.6,0.35,dark,0.25,-0.3,0,grapple);cl.rotation.z=-0.3;
  const cr=box(0.1,0.6,0.35,dark,-0.25,-0.3,0,grapple);cr.rotation.z=0.3;
  const wg=new T.CylinderGeometry(0.65,0.65,0.5,14);wg.rotateZ(Math.PI/2);const tire=mat(0x1b1b1b),hub=mat(0xd9a520);
  const wheels=[];
  [[front,1.25],[rear,-1.3]].forEach(([grp,z])=>[1.05,-1.05].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(wg,tire));const hb=new T.Mesh(new T.CylinderGeometry(0.3,0.3,0.52,8),hub);hb.rotation.z=Math.PI/2;w.add(hb);w.position.set(x,0.65,z);grp.add(w);wheels.push(w);}));
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots:[],front,rear,grapple};
}
const SPECS={
  vtt:{name:'VTT',build:makeVTT,hitch:1.15,wb:1.25,wr:0.34,maxF:9,maxR:3.5,acc:6.5,mudLoss:0.6,steer:0.55,hl:0.8,hw:0.55,
       cols:[[0.55,0.68],[-0.55,0.68]],enterR:2.6,seat:[0,0.15,-0.3],hide:false,eye:[0,1.8,-0.28],side:1.4,cam:[7.5,3.0],arrowY:2.7},
  pickup:{name:'Pick-up',build:makePickup,hitch:2.85,wb:3.2,wr:0.42,maxF:16,maxR:4,acc:5.5,mudLoss:0.75,steer:0.6,hl:1.6,hw:0.85,
       cols:[[1.8,1.0],[0.6,1.05],[-0.6,1.05],[-1.8,1.0]],enterR:3.2,seat:[0.45,0.3,0.2],hide:true,eye:[0.45,1.78,0.25],side:1.9,cam:[11,4.2],arrowY:3.6,bedCap:8},
  skid:{name:'Débusqueuse',build:makeSkidder,hitch:null,wb:2.6,wr:0.65,maxF:8,maxR:3.5,acc:4.5,mudLoss:0.2,steer:0.4,steerRate:2.5,hl:1.5,hw:1.0,
       cols:[[1.7,1.15],[0.4,1.15],[-1.0,1.15],[-2.2,0.9]],enterR:3.3,seat:[0,0.9,-0.35],hide:true,eye:[0,2.25,-0.1],side:2.0,cam:[11,4.6],arrowY:3.9}
};
const BED_SLOTS=[[-0.52,0.22],[0,0.22],[0.52,0.22],[-0.52,0.64],[0,0.64],[0.52,0.64],[-0.26,1.06],[0.26,1.06]];
const TSPECS={
  small:{pslots:[[-0.3,-0.6],[0.3,-0.6],[-0.3,0],[0.3,0],[-0.3,0.6],[0.3,0.6]],name:'remorque',label:'Remorque',build:makeTrailer,tl:1.9,cols:[[0.55,0.62],[-0.55,0.62]],hl:0.9,hw:0.7,cap:6,r:2.6,wr:0.3,tilt:0.11,
         slots:[[-0.44,0.22],[0,0.22],[0.44,0.22],[-0.22,0.6],[0.22,0.6],[0,0.98]]},
  loader:{name:'remorque chargeuse',label:'Chargeuse',build:makeLoader,tl:3.75,cols:[[1.9,0.85],[0.7,0.85],[-0.5,0.85],[-1.7,0.85]],hl:1.7,hw:0.95,cap:10,r:2.8,wr:0.38,tilt:0.06,crane:true,
         slots:[[-0.46,0.24],[0,0.24],[0.46,0.24],[-0.46,0.68],[0,0.68],[0.46,0.68],[-0.46,1.12],[0,1.12],[0.46,1.12],[0,1.56]]}
};
const vehicles=[],trailers=[];
function makeVehicle(type,x,z,th,id){
  const spec=SPECS[type],m=spec.build();scene.add(m.g);markDynamic(m.g);
  const v={id:id||uid(),type,spec,x,z,th,v:0,steer:0,spin:0,q:new T.Quaternion(),mesh:m,bed:null,drag:null,driver:null};
  if(spec.bedCap)v.bed={name:'boîte du pick-up',cap:spec.bedCap,load:[],pails:[],pslots:[[-0.4,-0.7],[0.4,-0.7],[-0.4,0],[0.4,0],[-0.4,0.7],[0.4,0.7]],cargo:m.cargo,slots:BED_SLOTS,r:2.4,
    center:()=>({x:v.x-Math.sin(v.th)*1.5,z:v.z-Math.cos(v.th)*1.5}),yaw:()=>v.th};
  ground(x,z,th,spec.hl,spec.hw,v.q);
  vehicles.push(v);return v;
}
function makeTrailerObj(kind,x,z,th,id){
  const spec=TSPECS[kind],m=spec.build();scene.add(m.g);markDynamic(m.g);
  const t={id:id||uid(),kind,spec,x,z,th,q:new T.Quaternion(),hitch:null,mesh:m};
  t.c={name:spec.name,cap:spec.cap,load:[],pails:[],pslots:spec.pslots||null,cargo:m.cargo,slots:spec.slots,r:spec.r,center:()=>({x:t.x,z:t.z}),yaw:()=>t.th};
  if(spec.crane)t.crane={slew:0,reach:3,grip:0,phase:'idle',y:1.9,target:0,held:null,heldMesh:null,onDone:null};
  t.mark=new T.Mesh(new T.RingGeometry(0.55,0.8,28),new T.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.85,side:T.DoubleSide,depthTest:false}));
  t.mark.rotation.x=-Math.PI/2;t.mark.renderOrder=15;t.mark.visible=false;scene.add(t.mark);
  ground(x,z,th,spec.hl,spec.hw,t.q);
  trailers.push(t);return t;
}
function towed(v){return trailers.find(t=>t.hitch===v)||null;}

/* ---------- Flèche d'objectif ---------- */
const arrow=new T.Group();
{const m=new T.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.9,depthTest:false});
 const c=new T.Mesh(new T.ConeGeometry(0.35,0.9,4),m);c.rotation.x=Math.PI/2;c.position.z=0.9;c.renderOrder=21;
 const s=new T.Mesh(new T.BoxGeometry(0.2,0.08,0.9),m);s.position.z=0.2;s.renderOrder=21;
 arrow.add(c);arrow.add(s);}
scene.add(arrow);

// Marqueur de destination (toucher/clic)
const marker=new T.Mesh(new T.RingGeometry(0.3,0.5,24),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.8,side:T.DoubleSide,depthTest:false}));
marker.rotation.x=-Math.PI/2;marker.visible=false;marker.renderOrder=15;scene.add(marker);
