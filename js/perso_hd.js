/* Personnage détaillé (essai) : tête modelée (orbites, pommettes, mâchoire, nez, oreilles, yeux avec paupières),
   mains à cinq doigts articulés, torse et jambes aux formes plus réelles, vêtements texturés.
   Mêmes points d'attache que makePlayer() : hanches (0,9 m), épaules (±0,36 ; 1,56 m), outil tenu à 0,68 m sous l'épaule. */
const HD=(()=>{
  // ---- Outils de modelage ----
  // Révolution d'un profil [[rayon,y],…] avec section elliptique (sx, sz)
  const lathe=(prof,seg,sx,sz)=>{const g=new T.LatheGeometry(prof.map(([r,y])=>new T.Vector2(Math.max(r,1e-4),y)),seg||24);g.scale(sx||1,1,sz||1);return g;};
  // Capsule le long de -y, de longueur L (entre les centres), rayons r1 (haut) et r2 (bas)
  const capsule=(r1,r2,L,seg)=>{const p=[];const n=6;
    for(let i=0;i<=n;i++){const a=Math.PI/2*(1-i/n);p.push([r1*Math.cos(a),r1*Math.sin(a)]);}
    for(let i=0;i<=n;i++){const a=-Math.PI/2*(i/n);p.push([r2*Math.cos(a),-L+r2*Math.sin(a)]);}
    return lathe(p.reverse().map(([r,y])=>[r,y]),seg||10);};
  // Bosse gaussienne
  const bump=(x,y,z,cx,cy,cz,s)=>Math.exp(-((x-cx)**2+(y-cy)**2+(z-cz)**2)/(2*s*s));
  // Grouper des pièces (hiérarchie temporaire) puis tout fusionner en une géométrie
  const bake=(root)=>{root.updateMatrixWorld(true);const gs=[];root.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);gs.push(g);}});return mergeGeos(gs);};
  const flipWinding=g=>{if(g.index){const a=g.index.array;for(let i=0;i<a.length;i+=3){const t=a[i+1];a[i+1]=a[i+2];a[i+2]=t;}g.index.needsUpdate=true;}return g;};
  const mirrorX=g=>{const c=g.clone();c.scale(-1,1,1);return flipWinding(c);};

  // ---- Textures ----
  const denimTex=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#2e4064';c.fillRect(0,0,w,h);
    for(let i=0;i<2200;i++){const v=Math.random();c.fillStyle=v<0.5?'rgba(255,255,255,0.06)':'rgba(0,0,20,0.12)';c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1);}
    c.strokeStyle='rgba(205,160,80,0.55)';c.lineWidth=1;c.setLineDash([3,2]);c.beginPath();c.moveTo(w*0.5,0);c.lineTo(w*0.5,h);c.stroke();});
  const knitTex=(col)=>canvasTex(128,64,(c,w,h)=>{c.fillStyle=col;c.fillRect(0,0,w,h);for(let x=0;x<w;x+=6){c.fillStyle='rgba(0,0,0,0.16)';c.fillRect(x,0,2,h);c.fillStyle='rgba(255,255,255,0.08)';c.fillRect(x+3,0,1,h);}
    for(let i=0;i<600;i++){c.fillStyle='rgba(255,255,255,0.05)';c.fillRect(Math.random()*w,Math.random()*h,1,1);}});
  const hairTex=(col)=>canvasTex(64,64,(c,w,h)=>{c.fillStyle=col;c.fillRect(0,0,w,h);for(let i=0;i<900;i++){const d=Math.random();c.fillStyle=d<0.5?'rgba(0,0,0,0.25)':'rgba(255,230,200,0.12)';c.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*3);}});
  const skinTex=canvasTex(64,64,(c,w,h)=>{c.fillStyle='#e2b38c';c.fillRect(0,0,w,h);for(let i=0;i<500;i++){c.fillStyle=Math.random()<0.5?'rgba(190,110,90,0.06)':'rgba(255,240,220,0.06)';c.fillRect(Math.random()*w,Math.random()*h,2,2);}});

  // ---- Tête ----
  const R=0.122;
  function headShape(x,y,z){       // x,y,z : point de la sphère unité; retourne le point déformé
    let d=0;
    d-=0.075*bump(x,y,z, 0.36,0.13,0.9,0.16)+0.075*bump(x,y,z,-0.36,0.13,0.9,0.16);   // orbites
    d+=0.035*(bump(x,y,z,0,0.33,0.94,0.22));                                          // arcade sourcilière
    d+=0.03*(bump(x,y,z,0.56,-0.12,0.78,0.2)+bump(x,y,z,-0.56,-0.12,0.78,0.2));       // pommettes
    d+=0.03*bump(x,y,z,0,-0.78,0.6,0.22);                                             // menton
    let sx=0.84,sy=1.13,sz=0.98;
    let px=x*(1+d),py=y*(1+d),pz=z*(1+d);
    if(py<-0.15){const k=(-py-0.15);px*=1-0.32*k;pz=pz>0?pz*(1-0.1*k):pz*(1-0.35*k);}            // mâchoire
    if(pz<-0.5)pz=-0.5+(pz+0.5)*0.85;                                                     // arrière aplati
    if(py>0.55){px*=1+0.04*(py-0.55);}
    return [px*R*sx,py*R*sy,pz*R*sz];
  }
  const shaped=(geo,scale)=>{const p=geo.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();const q=headShape(v.x,v.y,v.z);p.setXYZ(i,q[0]*scale,q[1]*scale,q[2]*scale);}geo.computeVertexNormals();return geo;};
  const HEAD_Y=1.81;
  function buildHead(){
    const head=shaped(new T.SphereGeometry(1,40,30),1);
    // nez : arête, bout, ailes
    const nose=new T.Group();
    const bridge=new T.Mesh(new T.SphereGeometry(1,16,12));bridge.scale.set(0.012,0.03,0.016);bridge.position.set(0,-0.004,0.11);bridge.rotation.x=-0.42;nose.add(bridge);
    const tip=new T.Mesh(new T.SphereGeometry(0.0125,14,10));tip.position.set(0,-0.027,0.124);nose.add(tip);
    [-1,1].forEach(s=>{const w=new T.Mesh(new T.SphereGeometry(1,12,8));w.scale.set(0.011,0.009,0.011);w.position.set(s*0.013,-0.031,0.117);nose.add(w);});
    // oreilles
    const ears=new T.Group();
    [-1,1].forEach(s=>{const e=new T.Group();
      const lobe=new T.Mesh(new T.SphereGeometry(1,14,10));lobe.scale.set(0.009,0.031,0.02);e.add(lobe);
      const rim=new T.Mesh(new T.TorusGeometry(0.019,0.0055,6,16,Math.PI*1.5));rim.rotation.set(0,Math.PI/2,-Math.PI*0.6);rim.position.set(0.004*s,0.006,-0.002);e.add(rim);
      e.position.set(s*0.104,-0.004,-0.012);e.rotation.y=s*0.25;ears.add(e);});
    // lèvres
    const lips=new T.Group();
    const up=new T.Mesh(new T.SphereGeometry(1,16,8));up.scale.set(0.02,0.005,0.008);up.position.set(0,-0.058,0.111);lips.add(up);
    const lo=new T.Mesh(new T.SphereGeometry(1,16,8));lo.scale.set(0.018,0.006,0.009);lo.position.set(0,-0.07,0.108);lips.add(lo);
    // yeux : globe, iris, pupille, paupière supérieure
    const eyes=new T.Group(),iris=new T.Group(),lids=new T.Group();
    [-1,1].forEach(s=>{const ex=s*0.04,ey=0.012,ez=0.091;
      const ball=new T.Mesh(new T.SphereGeometry(0.019,16,12));ball.position.set(ex,ey,ez);eyes.add(ball);
      const ir=new T.Mesh(new T.CircleGeometry(0.0085,16));ir.position.set(ex,ey,ez+0.0186);iris.add(ir);
      const lid=new T.Mesh(new T.SphereGeometry(0.0205,16,8,0,Math.PI*2,0,Math.PI*0.42));lid.position.set(ex,ey,ez);lid.rotation.x=0.35;lids.add(lid);
      const low=new T.Mesh(new T.SphereGeometry(0.0198,16,6,0,Math.PI*2,Math.PI*0.78,Math.PI*0.22));low.position.set(ex,ey,ez);lids.add(low);});
    const pupils=new T.Group();[-1,1].forEach(s=>{const p=new T.Mesh(new T.CircleGeometry(0.0042,12));p.position.set(s*0.04,0.012,0.091+0.0188);pupils.add(p);});
    // sourcils
    const brows=new T.Group();
    [-1,1].forEach(s=>{const b=new T.Mesh(new T.BoxGeometry(0.036,0.0075,0.012));b.position.set(s*0.042,0.044,0.106);b.rotation.set(-0.25,-s*0.18,s*0.12);brows.add(b);});
    // barbe : coquille qui suit la mâchoire, et moustache
    const bg=new T.SphereGeometry(1,36,18,Math.PI*0.5-1.5,3.0,Math.PI*0.55,Math.PI*0.45);
    const beard=shaped(bg,1.075);
    const mus=new T.Group();[-1,1].forEach(s=>{const m=new T.Mesh(new T.SphereGeometry(1,12,8));m.scale.set(0.022,0.008,0.012);m.position.set(s*0.017,-0.05,0.117);m.rotation.z=s*0.25;mus.add(m);});
    // cheveux (côtés et nuque, sous la tuque)
    const hair=shaped(new T.SphereGeometry(1,32,16,Math.PI*0.5+0.9,Math.PI*2-1.8,Math.PI*0.28,Math.PI*0.3),1.035);
    return {head,nose:bake(nose),ears:bake(ears),lips:bake(lips),eyes:bake(eyes),iris:bake(iris),pupils:bake(pupils),lids:bake(lids),brows:bake(brows),beard,mus:bake(mus),hair};
  }

  // ---- Main (gauche, paume vers -x, doigts vers le bas) ; la droite est le miroir ----
  function buildHand(curl){
    const root=new T.Group(),c=curl||[0.55,0.75,0.55];
    const palm=new T.Mesh(new T.SphereGeometry(1,20,14));palm.scale.set(0.018,0.046,0.04);palm.position.set(0,-0.045,0);root.add(palm);
    const heel=new T.Mesh(new T.SphereGeometry(1,14,10));heel.scale.set(0.02,0.022,0.033);heel.position.set(-0.002,-0.012,0);root.add(heel);
    const fingers=[[0.026,0.072,0.0082],[0.009,0.079,0.0085],[-0.008,0.075,0.0082],[-0.024,0.06,0.0072]];
    fingers.forEach(([z,L,r],fi)=>{
      let parent=new T.Group();parent.position.set(-0.002,-0.085,z*0.95);parent.rotation.x=(fi-1.5)*-0.05;root.add(parent);
      const kn=new T.Mesh(new T.SphereGeometry(r*1.15,10,8));parent.add(kn);
      [0.45,0.31,0.24].forEach((f,j)=>{const g=new T.Group();g.rotation.z=-c[j];parent.add(g);
        const len=L*f,rr=r*(1-j*0.12);const ph=new T.Mesh(capsule(rr,rr*0.92,len,10));g.add(ph);
        if(j===2){const nail=new T.Mesh(new T.BoxGeometry(0.003,len*0.55,rr*1.3));nail.position.set(rr*0.85,-len*0.55,0);g.add(nail);nail.userData.nail=true;}
        const nxt=new T.Group();nxt.position.set(0,-len,0);g.add(nxt);parent=nxt;});
    });
    // pouce : part du bas de la paume, vers l'avant et vers la paume
    let tp=new T.Group();tp.position.set(-0.008,-0.03,0.035);tp.rotation.set(0.55,0.0,-0.45);root.add(tp);
    const tm=new T.Mesh(new T.SphereGeometry(1,12,10));tm.scale.set(0.015,0.026,0.016);tm.position.set(0,-0.012,0);tp.add(tm);
    [[0.032,0.0095],[0.026,0.0088]].forEach(([len,rr],j)=>{const g=new T.Group();g.position.set(0,j?0:-0.022,0);g.rotation.z=-c[j]*0.7;tp.add(g);
      g.add(new T.Mesh(capsule(rr,rr*0.9,len,10)));if(j===1){const nail=new T.Mesh(new T.BoxGeometry(0.003,len*0.5,rr*1.3));nail.position.set(rr*0.85,-len*0.55,0);g.add(nail);nail.userData.nail=true;}
      const n=new T.Group();n.position.set(0,-len,0);g.add(n);tp=n;});
    // sépare les ongles (autre couleur)
    root.updateMatrixWorld(true);const skin=[],nails=[];
    root.traverse(o=>{if(o.isMesh){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);(o.userData.nail?nails:skin).push(g);}});
    return {skin:mergeGeos(skin),nails:mergeGeos(nails)};
  }

  return {lathe,capsule,bake,mirrorX,buildHead,buildHand,HEAD_Y,denimTex,knitTex,hairTex,skinTex};
})();

function makePlayerHD(){
  const g=new T.Group(),M=(geo,m,parent)=>{const me=new T.Mesh(geo,m);(parent||g).add(me);return me;};
  const skin=new T.MeshPhongMaterial({color:0xffffff,map:HD.skinTex,shininess:14,specular:0x332822});
  const lipM=new T.MeshPhongMaterial({color:0xa86a5a,shininess:30});
  const nailM=new T.MeshPhongMaterial({color:0xe8c4b0,shininess:60});
  const jeans=new T.MeshPhongMaterial({map:HD.denimTex,shininess:6});
  const plaidT=plaidTex();plaidT.wrapS=plaidT.wrapT=T.RepeatWrapping;plaidT.repeat.set(3,2.4);
  const plaid=new T.MeshPhongMaterial({map:plaidT,shininess:5});
  const tee=new T.MeshPhongMaterial({color:0x9a9a92,shininess:5});
  const leather=new T.MeshPhongMaterial({color:0x4a3220,shininess:25});
  const bootM=new T.MeshPhongMaterial({color:0x7a5532,shininess:12}),soleM=mat(0x2a221c),laceM=mat(0xc9b78f);
  const hairCol='#4e3320',beardM=new T.MeshPhongMaterial({map:HD.hairTex(hairCol),shininess:3}),hairM=beardM;
  const eyeW=new T.MeshPhongMaterial({color:0xf4f1ea,shininess:80}),irisM=new T.MeshBasicMaterial({color:0x4d6b8a}),pupM=new T.MeshBasicMaterial({color:0x0e0e0e});
  const tuque=new T.MeshPhongMaterial({map:HD.knitTex('#2a6e3f'),shininess:3}),brimM=new T.MeshPhongMaterial({map:HD.knitTex('#245e36'),shininess:3}),pomM=new T.MeshPhongMaterial({color:0xd8d0b8,shininess:2});
  const capM=new T.MeshPhongMaterial({color:0x2a6e3f,shininess:8});

  // --- Jambes : hanche (0,9 m), genou (-0,42), cheville, bottes de travail ---
  const legL=new T.Group(),legR=new T.Group();legL.position.set(0.11,0.9,0);legR.position.set(-0.11,0.9,0);
  const thighG=HD.lathe([[0.001,0.04],[0.085,0.03],[0.1,-0.02],[0.097,-0.15],[0.085,-0.3],[0.07,-0.42]],22,1,1.05);
  const shinG=HD.lathe([[0.071,0.02],[0.068,-0.06],[0.065,-0.15],[0.058,-0.28],[0.064,-0.34],[0.066,-0.36]],20,1,1.05);
  const bootG=(()=>{const r=new T.Group();
    const shaft=new T.Mesh(HD.lathe([[0.063,-0.3],[0.064,-0.36],[0.06,-0.42],[0.062,-0.45]],18));r.add(shaft);
    const foot=new T.Mesh(new T.SphereGeometry(1,20,14));foot.scale.set(0.058,0.042,0.125);foot.position.set(0,-0.44,0.045);r.add(foot);
    const toe=new T.Mesh(new T.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2));toe.scale.set(0.055,0.036,0.05);toe.position.set(0,-0.452,0.115);r.add(toe);
    return HD.bake(r);})();
  const soleG=(()=>{const r=new T.Group();const s=new T.Mesh(new T.BoxGeometry(0.12,0.028,0.27));s.position.set(0,-0.468,0.042);r.add(s);const h=new T.Mesh(new T.BoxGeometry(0.105,0.022,0.07));h.position.set(0,-0.478,-0.06);r.add(h);return HD.bake(r);})();
  const laceG=(()=>{const r=new T.Group();for(let k=0;k<5;k++){const b=new T.Mesh(new T.BoxGeometry(0.05,0.004,0.006));b.position.set(0,-0.36-k*0.017,0.06+k*0.012);b.rotation.x=-0.6;r.add(b);}return HD.bake(r);})();
  const cuffG=new T.TorusGeometry(0.066,0.008,6,20).rotateX(Math.PI/2).translate(0,-0.315,0);
  [legL,legR].forEach(l=>{M(thighG,jeans,l);const k=new T.Group();k.position.set(0,-0.42,0);M(shinG,jeans,k);M(cuffG,jeans,k);M(bootG,bootM,k);M(soleG,soleM,k);M(laceG,laceM,k);l.add(k);l.userData.knee=k;g.add(l);});
  // --- Bassin, ceinture, torse en chemise à carreaux, col et t-shirt ---
  M(HD.lathe([[0.001,0.8],[0.12,0.82],[0.19,0.86],[0.205,0.93],[0.2,0.99]],26,1.08,0.72),jeans);
  M(new T.CylinderGeometry(0.207,0.207,0.045,26,1,true).scale(1.08,1,0.73).translate(0,0.965,0),leather);
  M(new T.BoxGeometry(0.06,0.042,0.01).translate(0,0.965,0.155),new T.MeshPhongMaterial({color:0xc9b070,shininess:90}));
  const torsoG=HD.lathe([[0.2,0.94],[0.196,1.02],[0.19,1.12],[0.205,1.26],[0.222,1.38],[0.228,1.47],[0.215,1.54],[0.16,1.6],[0.09,1.635],[0.06,1.645]],30,1.12,0.72);
  M(torsoG,plaid);
  // ouverture du col : t-shirt visible, rabats du col, boutons, poches
  M(new T.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2).scale(0.05,0.04,0.02).rotateX(Math.PI/2).translate(0,1.585,0.142),tee);
  [-1,1].forEach(s=>{const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(s*0.07,0.02);sh.lineTo(s*0.03,-0.06);sh.lineTo(0,0);
    M(new T.ShapeGeometry(sh).translate(0,1.625,0.0).rotateX(-0.25).translate(0,0,0.142),plaid);});
  const btn=new T.MeshPhongMaterial({color:0xe8e0cc,shininess:60});
  for(let k=0;k<5;k++)M(new T.CylinderGeometry(0.006,0.006,0.004,10).rotateX(Math.PI/2).translate(0,1.5-k*0.11,0.161-(k>3?0.008:0)),btn);
  [-1,1].forEach(s=>{M(new T.BoxGeometry(0.075,0.075,0.008).translate(s*0.1,1.4,0.157),plaid);M(new T.BoxGeometry(0.08,0.022,0.012).translate(s*0.1,1.44,0.159),plaid);});
  // cou et tête
  M(new T.CylinderGeometry(0.056,0.064,0.12,18).translate(0,1.66,0.0),skin);
  const H=HD.buildHead(),hy=HD.HEAD_Y,head=new T.Group();head.position.set(0,hy,0.01);g.add(head);
  M(H.head,skin,head);M(H.nose,skin,head);M(H.ears,skin,head);M(H.lips,lipM,head);
  M(H.eyes,eyeW,head);M(H.iris,irisM,head);M(H.pupils,pupM,head);M(H.lids,skin,head);M(H.brows,beardM,head);M(H.mus,beardM,head);
  const beardMesh=M(H.beard,beardM,head);M(H.hair,hairM,head);
  // tuque tricotée (revers + pompon) et casquette
  const tq=M(HD.lathe([[0.128,0.06],[0.132,0.095],[0.126,0.13],[0.108,0.162],[0.072,0.18],[0.03,0.187],[0.001,0.188]],30,0.95,1.02),tuque,head);
  const cuff=M(new T.CylinderGeometry(0.133,0.13,0.055,30,1,true).scale(0.95,1,1.02).translate(0,0.08,0),brimM,head);
  const pom=M(new T.IcosahedronGeometry(0.036,2).translate(0,0.22,0),pomM,head);
  const capD=M(new T.SphereGeometry(0.13,28,14,0,Math.PI*2,0,Math.PI*0.5).scale(0.95,0.75,1.02).translate(0,0.06,0),capM,head);
  const visor=M(new T.CylinderGeometry(0.11,0.11,0.01,24,1,false,-Math.PI*0.45,Math.PI*0.9).scale(1,1,0.9).translate(0,0.062,0.07),capM,head);
  const capB=M(new T.SphereGeometry(0.012,8,6).translate(0,0.158,0),capM,head);
  [capD,visor,capB].forEach(m=>m.visible=false);
  // --- Bras : épaule (pivot), bras, coude, avant-bras, poignet, main ---
  const armL=new T.Group(),armR=new T.Group();armL.position.set(0.275,1.53,0);armR.position.set(-0.275,1.53,0);
  const delt=new T.SphereGeometry(1,20,14).scale(0.072,0.078,0.074).translate(-0.012,-0.04,0);
  const upper=HD.lathe([[0.001,0.02],[0.075,0.0],[0.074,-0.08],[0.068,-0.2],[0.061,-0.33]],18,1,1.05);
  const fore=HD.lathe([[0.062,0.02],[0.06,-0.05],[0.056,-0.15],[0.05,-0.25],[0.054,-0.27],[0.054,-0.29]],18,1,1.05);
  const wrist=new T.CylinderGeometry(0.026,0.029,0.05,14).scale(0.8,1,1.1).translate(0,-0.3,0);
  const hand=HD.buildHand();hand.skin.scale(1.3,1.3,1.3);hand.nails.scale(1.3,1.3,1.3);
  const handL={skin:hand.skin.clone().translate(0,-0.315,0),nails:hand.nails.clone().translate(0,-0.315,0)};
  const handR={skin:HD.mirrorX(hand.skin).translate(0,-0.315,0),nails:HD.mirrorX(hand.nails).translate(0,-0.315,0)};
  [[armL,handL],[armR,handR]].forEach(([a,hd])=>{M(delt,plaid,a);M(upper,plaid,a);
    const el=new T.Group();el.position.set(0,-0.33,0);a.add(el);a.userData.elbow=el;
    M(fore,plaid,el);M(wrist,skin,el);M(hd.skin,skin,el);M(hd.nails,nailM,el);g.add(a);});
  // outils (tenus à 0,68 m sous l'épaule, comme avant)
  const axe=makeAxeModel();axe.position.set(0,-0.68,0);armR.add(axe);
  const saw=makeSawModel();saw.position.set(0,-0.68,0);armR.add(saw);
  const chain=makeChainModel();chain.position.set(0,-0.68,0);armR.add(chain);
  const shovel=makeShovelModel();shovel.position.set(0,-0.68,0);armR.add(shovel);
  [axe,saw,chain,shovel].forEach(t=>t.visible=false);
  const carryLog=makeLog(logGeoZ);carryLog.position.set(0.24,1.72,0.1);carryLog.visible=false;g.add(carryLog);
  shadows(g);
  return {g,legL,legR,armL,armR,head,axe,saw,chain,shovel,carryLog,hat:{tuque:[tq,cuff,pom],cap:[capD,visor,capB]},mats:{tuque,brimM,capM,plaid},beardMesh};
}
