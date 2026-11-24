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
/* Pick-up : bas de caisse avec passages de roue, capot, cabine aux montants inclinés, vitres, caisse à
   parois et hayon, calandre chromée, phares, rétroviseurs, pare-chocs et attache-remorque. L'avant est vers +z. */
const PICKUP_GEO=(()=>{
  const arch=(sh,zc,r,toLeft)=>{sh.absarc(zc,0.42,r,toLeft?0:Math.PI,toLeft?Math.PI:0,!toLeft);};
  // Avant : ailes, portes et bas de caisse jusqu'à l'arrière de la cabine, passage de la roue avant
  const lo=new T.Shape();lo.moveTo(-0.62,0.62);lo.lineTo(-0.62,1.22);lo.lineTo(2.56,1.22);lo.quadraticCurveTo(2.68,1.2,2.68,1.05);lo.lineTo(2.68,0.62);
  lo.lineTo(2.2,0.62);lo.absarc(1.6,0.42,0.6,0.32,Math.PI-0.32,false);lo.lineTo(-0.62,0.62);
  const lower=sideExtrude(lo,1.92,0.04);
  // Capot légèrement bombé
  const hd=new T.Shape();hd.moveTo(1.12,1.2);hd.lineTo(1.12,1.36);hd.quadraticCurveTo(1.9,1.46,2.6,1.38);hd.lineTo(2.62,1.2);hd.lineTo(1.12,1.2);
  const hood=sideExtrude(hd,1.86,0.04);
  // Cabine
  const cb=new T.Shape();cb.moveTo(-0.58,1.2);cb.lineTo(-0.47,1.96);cb.lineTo(0.92,1.96);cb.lineTo(1.13,1.2);cb.lineTo(-0.58,1.2);
  const cab=sideExtrude(cb,1.8,0.05);
  const gl=new T.Shape();gl.moveTo(-0.6,1.46);gl.lineTo(-0.54,1.89);gl.lineTo(0.99,1.89);gl.lineTo(1.13,1.46);gl.lineTo(-0.6,1.46);
  const glass=sideExtrude(gl,1.83,0);
  const pillar=mergeGeos([new T.BoxGeometry(1.86,0.44,0.07).translate(0,1.67,0.22)]);
  // Caisse : flancs avec passage de roue arrière, fond, avant, hayon, rebords
  const sd=new T.Shape();sd.moveTo(-2.68,0.62);sd.lineTo(-2.68,1.5);sd.lineTo(-0.66,1.5);sd.lineTo(-0.66,0.62);sd.lineTo(-1.0,0.62);
  sd.absarc(-1.6,0.42,0.6,0.32,Math.PI-0.32,false);sd.lineTo(-2.68,0.62);
  const sideL=sideExtrude(sd,0.08,0.015).translate(0.9,0,0),sideR=sideExtrude(sd,0.08,0.015).translate(-0.9,0,0);
  const bedSides=mergeGeos([sideL,sideR]);
  const bedBits=mergeGeos([new T.BoxGeometry(1.74,0.06,1.98).translate(0,0.95,-1.66),new T.BoxGeometry(1.74,0.5,0.07).translate(0,1.24,-0.7),
    new T.BoxGeometry(0.3,0.26,0.9).translate(0.72,1.06,-1.6),new T.BoxGeometry(0.3,0.26,0.9).translate(-0.72,1.06,-1.6)]);
  const gate=mergeGeos([new T.BoxGeometry(1.8,0.56,0.07).translate(0,1.2,-2.66)]);
  const rails=mergeGeos([new T.BoxGeometry(0.12,0.04,2.04).translate(0.9,1.52,-1.66),new T.BoxGeometry(0.12,0.04,2.04).translate(-0.9,1.52,-1.66),new T.BoxGeometry(1.86,0.04,0.1).translate(0,1.52,-2.66)]);
  // Calandre, phares, pare-chocs, rétroviseurs, poignées, attache
  const grille=mergeGeos([new T.BoxGeometry(1.0,0.3,0.06).translate(0,1.06,2.72)]);
  const chrome=mergeGeos([new T.BoxGeometry(1.06,0.04,0.06).translate(0,1.23,2.74),new T.BoxGeometry(1.06,0.04,0.06).translate(0,0.89,2.74),
    new T.BoxGeometry(0.04,0.34,0.06).translate(0.53,1.06,2.74),new T.BoxGeometry(0.04,0.34,0.06).translate(-0.53,1.06,2.74),
    new T.BoxGeometry(1.0,0.025,0.05).translate(0,1.0,2.75),new T.BoxGeometry(1.0,0.025,0.05).translate(0,1.12,2.75),
    new T.BoxGeometry(1.98,0.18,0.18).translate(0,0.74,2.8),new T.BoxGeometry(1.94,0.16,0.16).translate(0,0.72,-2.74),
    new T.BoxGeometry(0.06,0.02,0.16).translate(0.97,1.38,0.62),new T.BoxGeometry(0.06,0.02,0.16).translate(-0.97,1.38,0.62),new T.BoxGeometry(0.2,0.04,0.04).translate(0,1.42,-2.71)]);
  const lamps=mergeGeos([new T.BoxGeometry(0.3,0.18,0.05).translate(0.73,1.1,2.72),new T.BoxGeometry(0.3,0.18,0.05).translate(-0.73,1.1,2.72)]);
  const tails=mergeGeos([new T.BoxGeometry(0.06,0.34,0.14).translate(0.93,1.28,-2.62),new T.BoxGeometry(0.06,0.34,0.14).translate(-0.93,1.28,-2.62)]);
  const black=mergeGeos([new T.BoxGeometry(0.06,0.18,0.24).translate(1.03,1.6,1.0),new T.BoxGeometry(0.06,0.18,0.24).translate(-1.03,1.6,1.0),
    new T.BoxGeometry(0.14,0.04,0.04).translate(0.98,1.55,1.0),new T.BoxGeometry(0.14,0.04,0.04).translate(-0.98,1.55,1.0),
    new T.BoxGeometry(0.1,0.1,0.3).translate(0,0.66,-2.88),new T.BoxGeometry(0.02,0.7,0.02).translate(0.97,0.98,0.25),new T.BoxGeometry(0.02,0.7,0.02).translate(-0.97,0.98,0.25)]);
  return {lower,hood,cab,glass,pillar,bedSides,bedBits,gate,rails,grille,chrome,lamps,tails,black};
})();
function makePickup(){
  const g=new T.Group(),P2=PICKUP_GEO;
  const red=new T.MeshPhongMaterial({color:0x9e2b25,flatShading:true,shininess:45,specular:0x444444});
  const dark=mat(0x1e1e1e),chrome=new T.MeshPhongMaterial({color:0xc4c8cc,shininess:90,specular:0x999999});
  const glassM=new T.MeshPhongMaterial({color:0x22313d,shininess:100,specular:0x8899aa});
  const add=(geo,m)=>{const me=new T.Mesh(geo,m);g.add(me);return me;};
  add(P2.lower,red);add(P2.hood,red);add(P2.cab,red);add(P2.pillar,red);add(P2.bedSides,red);add(P2.gate,red);add(P2.rails,dark);add(P2.bedBits,mat(0x2a2a2a));
  const glass=add(P2.glass,glassM);
  add(P2.grille,dark);add(P2.chrome,chrome);add(P2.black,dark);
  add(P2.lamps,new T.MeshBasicMaterial({color:0xfff3b0}));add(P2.tails,new T.MeshBasicMaterial({color:0xc0261e}));
  g.userData.glass=[glass];
  const {wheels,pivots}=addWheels(g,0.42,0.32,0.9,1.6,-1.6);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.98,-1.5);g.add(cargo);
  return {g,wheels,pivots,cargo};
}
/* Petite remorque : plancher et ridelles en planches, garde-boue, timon en V, feux */
function makeTrailer(){
  const g=new T.Group();
  const wood=new T.MeshPhongMaterial({color:0x8f6d45,flatShading:true,shininess:6}),metal=new T.MeshPhongMaterial({color:0x3f4346,shininess:30,specular:0x333333});
  const planks=[];for(let k=0;k<3;k++){const y=0.66+k*0.11;planks.push(new T.BoxGeometry(0.05,0.09,2.1).translate(0.62,y,0),new T.BoxGeometry(0.05,0.09,2.1).translate(-0.62,y,0),new T.BoxGeometry(1.24,0.09,0.05).translate(0,y,1.05),new T.BoxGeometry(1.24,0.09,0.05).translate(0,y,-1.05));}
  for(let k=0;k<6;k++)planks.push(new T.BoxGeometry(0.2,0.04,2.06).translate(-0.52+k*0.208,0.6,0));
  g.add(new T.Mesh(mergeGeos(planks),wood));
  const steel=[new T.BoxGeometry(1.3,0.08,0.08).translate(0,0.55,0.9),new T.BoxGeometry(1.3,0.08,0.08).translate(0,0.55,-0.9),new T.BoxGeometry(0.08,0.08,2.1).translate(0.6,0.52,0),new T.BoxGeometry(0.08,0.08,2.1).translate(-0.6,0.52,0),
    new T.BoxGeometry(0.06,0.06,0.95).rotateY(-0.32).translate(0.2,0.5,1.4),new T.BoxGeometry(0.06,0.06,0.95).rotateY(0.32).translate(-0.2,0.5,1.4),new T.BoxGeometry(0.1,0.08,0.16).translate(0,0.5,1.86),
    new T.BoxGeometry(0.06,0.06,0.06).translate(0.62,0.92,1.05),new T.BoxGeometry(0.06,0.06,0.06).translate(-0.62,0.92,1.05),new T.BoxGeometry(0.06,0.06,0.06).translate(0.62,0.92,-1.05),new T.BoxGeometry(0.06,0.06,0.06).translate(-0.62,0.92,-1.05)];
  [0.77,-0.77].forEach(x=>{const fs=new T.Shape();fs.moveTo(-0.42,0.55);fs.absarc(0,0.3,0.42,Math.PI*0.95,Math.PI*0.05,true);fs.lineTo(0.42,0.55);fs.lineTo(-0.42,0.55);steel.push(sideExtrude(fs,0.28,0.01).translate(x,0,0));});
  g.add(new T.Mesh(mergeGeos(steel),metal));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.1,0.05,0.03).translate(0.55,0.62,-1.09),new T.BoxGeometry(0.1,0.05,0.03).translate(-0.55,0.62,-1.09)]),new T.MeshBasicMaterial({color:0xc0261e})));
  const W=wheelGeo(0.3,0.24),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0x8a8e92,shininess:50});
  const wheels=[];
  [0.77,-0.77].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,hub));w.position.set(x,0.3,0);g.add(w);wheels.push(w);});
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.y=0.63;g.add(cargo);
  return {g,wheels,cargo};
}
function addTandem(g,wr,ww,wx,dz){
  const W=wheelGeo(wr,ww),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0x8a8e92,shininess:50});
  const wheels=[];
  [[wx,dz],[-wx,dz],[wx,-dz],[-wx,-dz]].forEach(([x,z])=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,hub));w.position.set(x,wr,z);g.add(w);wheels.push(w);});
  return wheels;
}
/* Remorque chargeuse : châssis en poutre, ranchers, garde-boue des roues jumelées, timon avec béquille,
   stabilisateurs, poste de l'opérateur et grue (colonne, flèche avec vérin, grappin à griffes courbes). */
function clawGeo(){
  const sh=new T.Shape();sh.moveTo(-0.04,0);sh.lineTo(0.04,0);sh.quadraticCurveTo(0.1,-0.3,0.0,-0.55);sh.lineTo(-0.06,-0.52);sh.quadraticCurveTo(0.02,-0.3,-0.04,0);
  const g=new T.ExtrudeGeometry(sh,{depth:0.3,bevelEnabled:false,curveSegments:8});g.translate(0,0,-0.15);return g;   // pivot en haut, griffe vers -y, courbée vers l'intérieur (+x)
}
function makeLoader(){
  const g=new T.Group();
  const frame=new T.MeshPhongMaterial({color:0x2f4f3a,flatShading:true,shininess:25,specular:0x222222}),metal=new T.MeshPhongMaterial({color:0x4b4e50,shininess:40,specular:0x333333});
  const yel=new T.MeshPhongMaterial({color:0xe0a91c,flatShading:true,shininess:35,specular:0x333333}),dark=mat(0x222222),chrome=new T.MeshPhongMaterial({color:0xb8bcc0,shininess:90});
  const fr=[new T.BoxGeometry(0.28,0.24,5.6).translate(0,0.62,0.7),new T.BoxGeometry(0.34,0.04,5.6).translate(0,0.75,0.7),new T.BoxGeometry(0.34,0.04,5.6).translate(0,0.49,0.7),
    new T.BoxGeometry(0.08,0.08,1.2).rotateY(-0.25).translate(0.16,0.55,3.5),new T.BoxGeometry(0.08,0.08,1.2).rotateY(0.25).translate(-0.16,0.55,3.5),new T.BoxGeometry(1.1,0.12,0.8).translate(0,0.8,2.35)];
  [-1.6,0,1.6].forEach(z=>{fr.push(new T.BoxGeometry(1.8,0.16,0.22).translate(0,0.8,z));[-0.84,0.84].forEach(x=>{fr.push(new T.BoxGeometry(0.1,1.45,0.12).translate(x,1.52,z),new T.BoxGeometry(0.14,0.06,0.16).translate(x,2.26,z));});});
  // Stabilisateurs de chaque côté de la grue
  [-1,1].forEach(sx=>fr.push(new T.BoxGeometry(0.7,0.1,0.12).translate(sx*0.85,0.72,2.6),new T.BoxGeometry(0.1,0.55,0.1).translate(sx*1.2,0.47,2.6),new T.BoxGeometry(0.26,0.04,0.26).translate(sx*1.2,0.2,2.6)));
  g.add(new T.Mesh(mergeGeos(fr),frame));
  // Garde-boue des roues jumelées, béquille, attelage
  const steel=[new T.BoxGeometry(0.06,0.5,0.06).translate(0.18,0.28,3.35),new T.BoxGeometry(0.2,0.03,0.2).translate(0.18,0.03,3.35),new T.CylinderGeometry(0.05,0.05,0.12,10).translate(0,0.55,4.0)];
  [0.98,-0.98].forEach(x=>{const fs=new T.Shape();fs.moveTo(-0.95,0.9);fs.quadraticCurveTo(-0.9,0.98,0,0.98);fs.quadraticCurveTo(0.9,0.98,0.95,0.9);fs.lineTo(0.95,0.86);fs.lineTo(-0.95,0.86);steel.push(sideExtrude(fs,0.36,0.01).translate(x,0,0));});
  g.add(new T.Mesh(mergeGeos(steel),metal));
  // Poste de l'opérateur : siège et leviers
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.42,0.08,0.4).translate(-0.55,0.95,2.35),new T.BoxGeometry(0.42,0.4,0.08).translate(-0.55,1.15,2.15),new T.BoxGeometry(0.06,0.45,0.06).translate(-0.55,0.75,2.35)]),dark));
  g.add(new T.Mesh(mergeGeos([0,1,2].map(k=>new T.CylinderGeometry(0.012,0.012,0.3,6).rotateX(-0.3).translate(-0.3+k*0.06,1.0,2.6))),chrome));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.12,0.05,0.03).translate(0.6,0.62,-2.11),new T.BoxGeometry(0.12,0.05,0.03).translate(-0.6,0.62,-2.11)]),new T.MeshBasicMaterial({color:0xc0261e})));
  const wheels=addTandem(g,0.38,0.28,0.98,0.45);
  // Grue
  const slew=new T.Group();slew.position.set(0,0.86,2.35);g.add(slew);
  slew.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.32,0.36,0.14,16).translate(0,0.07,0),new T.CylinderGeometry(0.15,0.17,1.9,12).translate(0,1.05,0),
    new T.BoxGeometry(0.3,0.36,0.46).translate(0,1.95,0.1),new T.CylinderGeometry(0.06,0.06,0.36,10).rotateZ(Math.PI/2).translate(0,1.95,0.0)]),yel));
  slew.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.045,0.045,1.2,8).rotateX(0.62).translate(0,1.45,0.35),new T.CylinderGeometry(0.03,0.03,0.6,8).rotateX(0.62).translate(0,1.75,0.62)]),chrome));
  const bg=mergeGeos([new T.BoxGeometry(0.2,0.22,1).translate(0,0,0),new T.BoxGeometry(0.22,0.04,1).translate(0,0.12,0)]);
  const boom=new T.Mesh(bg,yel);boom.position.set(0,1.95,0.5);slew.add(boom);
  const link=new T.Mesh(new T.CylinderGeometry(0.03,0.03,1,8),metal);link.position.set(0,1.5,1);slew.add(link);
  const grapple=new T.Group();slew.add(grapple);
  grapple.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.1,0.12,0.16,12).translate(0,0.08,0),new T.BoxGeometry(0.36,0.1,0.2).translate(0,-0.02,0)]),dark));
  const cg=clawGeo();
  const clawL=new T.Mesh(cg,yel);clawL.position.set(0.14,-0.04,0);clawL.scale.x=-1;grapple.add(clawL);
  const clawR=new T.Mesh(cg,yel);clawR.position.set(-0.14,-0.04,0);grapple.add(clawR);
  const hold=new T.Group();hold.position.y=-0.32;grapple.add(hold);
  shadows(g);addSilhouette(g);
  const cargo=new T.Group();cargo.position.set(0,0.87,0);g.add(cargo);
  return {g,wheels,cargo,crane:{slew,boom,link,grapple,clawL,clawR,hold}};
}
/* Débusqueuse articulée : capot moteur incliné avec calandre et cheminée, lame, cabine à arceaux vitrée,
   arche et grappin à griffes courbes, gros pneus forestiers. */
function makeSkidder(){
  const g=new T.Group();
  const yel=new T.MeshPhongMaterial({color:0xd9a520,flatShading:true,shininess:35,specular:0x333333}),dark=mat(0x262626),metal=new T.MeshPhongMaterial({color:0x55595d,shininess:40,specular:0x333333});
  const glassM=new T.MeshPhongMaterial({color:0x22313d,shininess:100,specular:0x8899aa});
  const front=new T.Group(),rear=new T.Group();g.add(front);g.add(rear);
  // Avant : capot moteur
  const hd=new T.Shape();hd.moveTo(0.3,0.8);hd.lineTo(0.3,1.72);hd.lineTo(1.6,1.68);hd.quadraticCurveTo(2.15,1.6,2.25,1.3);hd.lineTo(2.25,0.8);hd.lineTo(0.3,0.8);
  front.add(new T.Mesh(sideExtrude(hd,1.36,0.05),yel));
  front.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.5,0.3,0.6).translate(0,0.8,0.35),new T.BoxGeometry(0.9,0.42,0.04).translate(0,1.2,2.27),
    new T.CylinderGeometry(0.06,0.07,0.75,10).translate(0.42,2.05,1.5),new T.CylinderGeometry(0.075,0.075,0.08,10).translate(0.42,2.44,1.5)]),dark));
  front.add(new T.Mesh(mergeGeos([0,1,2,3,4].map(k=>new T.BoxGeometry(0.86,0.03,0.03).translate(0,1.04+k*0.08,2.3))),metal));
  front.add(new T.Mesh(new T.BoxGeometry(0.2,0.1,0.04).translate(0.5,1.5,2.26),new T.MeshBasicMaterial({color:0xfff3b0})),new T.Mesh(new T.BoxGeometry(0.2,0.1,0.04).translate(-0.5,1.5,2.26),new T.MeshBasicMaterial({color:0xfff3b0})));
  // Lame avant (profil courbe) et ses bras
  const bl=new T.Shape();bl.moveTo(0,0.18);bl.quadraticCurveTo(0.16,0.5,0.06,0.92);bl.lineTo(-0.04,0.9);bl.quadraticCurveTo(0.04,0.5,-0.1,0.2);bl.lineTo(0,0.18);
  front.add(new T.Mesh(mergeGeos([sideExtrude(bl,2.5,0.02).translate(0,0,2.62),new T.BoxGeometry(0.14,0.14,0.8).rotateX(0.3).translate(0.6,0.62,2.25),new T.BoxGeometry(0.14,0.14,0.8).rotateX(0.3).translate(-0.6,0.62,2.25)]),yel));
  // Arrière : châssis, réservoirs, cabine à arceaux
  const rb=new T.Shape();rb.moveTo(-2.35,0.75);rb.lineTo(-2.35,1.25);rb.lineTo(-0.2,1.4);rb.lineTo(0.2,1.4);rb.lineTo(0.2,0.75);rb.lineTo(-2.35,0.75);
  rear.add(new T.Mesh(sideExtrude(rb,1.5,0.04),yel));
  const cab=[];
  [[0.62,0.24],[-0.62,0.24],[0.62,-0.95],[-0.62,-0.95]].forEach(([x,z])=>cab.push(new T.BoxGeometry(0.1,1.2,0.1).translate(x,1.98,z)));
  cab.push(new T.BoxGeometry(1.46,0.1,1.36).translate(0,2.6,-0.35),new T.BoxGeometry(1.36,0.06,1.26).translate(0,2.68,-0.35));
  rear.add(new T.Mesh(mergeGeos(cab),dark));
  rear.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.3,0.8,1.16).translate(0,2.0,-0.35)]),glassM));
  rear.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.5,0.12,0.45).translate(0,1.5,-0.45),new T.BoxGeometry(0.5,0.5,0.1).translate(0,1.75,-0.7)]),dark));
  // Arche tubulaire et treuil
  const arch=new T.TubeGeometry(new T.CatmullRomCurve3([[0.62,1.2,-2.0],[0.65,2.2,-2.08],[0.4,2.62,-2.1],[-0.4,2.62,-2.1],[-0.65,2.2,-2.08],[-0.62,1.2,-2.0]].map(a=>new T.Vector3(...a))),30,0.08,8,false);
  rear.add(new T.Mesh(mergeGeos([arch,new T.CylinderGeometry(0.22,0.22,0.9,14).rotateZ(Math.PI/2).translate(0,1.4,-1.75)]),dark));
  rear.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.16,0.08,0.04).translate(0.6,1.2,-2.39),new T.BoxGeometry(0.16,0.08,0.04).translate(-0.6,1.2,-2.39)]),new T.MeshBasicMaterial({color:0xc0261e})));
  // Grappin
  const grapple=new T.Group();grapple.position.set(0,1.5,-2.5);rear.add(grapple);
  grapple.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.12,0.14,0.3,12).translate(0,0.2,0),new T.BoxGeometry(0.5,0.14,0.26).translate(0,0.02,0)]),metal));
  const cg=clawGeo();
  const cl=new T.Mesh(cg,dark);cl.position.set(0.18,-0.02,0);cl.scale.set(-1.3,1.15,1.2);cl.rotation.z=-0.2;grapple.add(cl);
  const cr=new T.Mesh(cg,dark);cr.position.set(-0.18,-0.02,0);cr.scale.set(1.3,1.15,1.2);cr.rotation.z=0.2;grapple.add(cr);
  // Gros pneus forestiers, jantes jaunes
  const W=wheelGeo(0.65,0.5),tire=mat(0x1b1b1b),hub=new T.MeshPhongMaterial({color:0xd9a520,shininess:35});
  const wheels=[];
  [[front,1.25],[rear,-1.3]].forEach(([grp,z])=>[1.05,-1.05].forEach(x=>{const w=new T.Group();w.add(new T.Mesh(W.tread,tire),new T.Mesh(W.rim,hub));w.position.set(x,0.65,z);grp.add(w);wheels.push(w);}));
  shadows(g);addSilhouette(g);
  return {g,wheels,pivots:[],front,rear,grapple};
}
const SPECS={
  vtt:{name:'VTT',build:makeVTT,hitch:1.15,wb:1.25,wr:0.34,maxF:9,maxR:3.5,acc:6.5,mudLoss:0.6,steer:0.55,hl:0.8,hw:0.55,
       cols:[[0.55,0.68],[-0.55,0.68]],enterR:2.6,ride:true,seat:[0,0.15,-0.3],hide:false,eye:[0,1.8,-0.28],side:1.4,cam:[7.5,3.0],arrowY:2.7},
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
