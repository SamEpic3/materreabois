/* Pêche au lac : canne à pêche (magasin), on lance la ligne vers l'eau, on attend que le flotteur cale
   et on ferre au bon moment. Les poissons vont dans l'inventaire. */
const FISH={
  perchaude:{n:'Perchaude',fem:true,w:[0.1,0.45],top:0x8a8a2e,side:0xd8c04a,belly:0xf0e6c0,bars:true},
  achigan:{n:'Achigan',w:[0.4,2.3],top:0x3f5a2a,side:0x7a9050,belly:0xe8e4c8},
  truite:{n:'Truite mouchetée',fem:true,w:[0.25,1.6],top:0x3d4a3a,side:0x7a8466,belly:0xe8a070,spots:true},
  dore:{n:'Doré',w:[0.7,3.6],top:0x6a5a2a,side:0xc9a84a,belly:0xf2ead0},
  brochet:{n:'Brochet',w:[1.5,6.5],top:0x3a4a2a,side:0x6b7d42,belly:0xe8e6cc,long:true}
};
const FISH_IDS=Object.keys(FISH);

/* ----- Modèle de poisson (corps, queue, nageoires, œil) ----- */
function makeFishModel(k,w,cooked){
  const F=FISH[k],g=new T.Group(),L=(F.long?0.55:0.4)*Math.pow((w||((F.w[0]+F.w[1])/2))/1,1/3);
  const body=new T.SphereGeometry(1,12,8).toNonIndexed();body.scale(0.13*L*(F.long?0.8:1),0.24*L,0.5*L);
  const ct=new T.Color(F.top),cs=new T.Color(F.side),cb=new T.Color(F.belly),tmp=new T.Color();
  paintGeo(body,(x,y,z)=>{const u=y/(0.24*L);tmp.copy(cs).lerp(u>0?ct:cb,Math.min(1,Math.abs(u)*1.3));
    if(F.bars&&u>-0.3&&Math.sin(z/L*22)>0.55)tmp.multiplyScalar(0.55);
    if(F.spots&&hash3(Math.round(x*90),Math.round(y*90),Math.round(z*90))>0.86&&u>-0.2)tmp.setRGB(0.85,0.3,0.25);
    return [tmp.r,tmp.g,tmp.b];});
  const m=new T.MeshPhongMaterial({vertexColors:true,shininess:60,specular:0x444444,flatShading:true});
  g.add(new T.Mesh(body,m));
  const fin=new T.MeshPhongMaterial({color:F.side,side:T.DoubleSide,flatShading:true});
  const tail=new T.Shape();tail.moveTo(0,0);tail.lineTo(-0.16*L,0.22*L);tail.lineTo(-0.1*L,0);tail.lineTo(-0.16*L,-0.22*L);tail.lineTo(0,0);
  g.add(new T.Mesh(new T.ShapeGeometry(tail).rotateY(Math.PI/2).translate(0,0,-0.46*L),fin));
  const dor=new T.Shape();dor.moveTo(0,0);dor.lineTo(0.12*L,0.14*L);dor.lineTo(0.28*L,0);dor.lineTo(0,0);
  g.add(new T.Mesh(new T.ShapeGeometry(dor).rotateY(-Math.PI/2).translate(0,0.2*L,-0.1*L),fin));
  g.add(new T.Mesh(mergeGeos([new T.SphereGeometry(0.028*L/0.4,6,4).translate(0.1*L*(F.long?0.8:1),0.06*L,0.33*L),new T.SphereGeometry(0.028*L/0.4,6,4).translate(-0.1*L*(F.long?0.8:1),0.06*L,0.33*L)]),mat(0x111111)));
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;if(cooked&&o.material.color)o.material.color.setRGB(0.62,0.4,0.22);}});
  return g;
}

/* ----- La canne : dans la main du bonhomme, en 1re personne, et chez les avatars ----- */
function makeRodModel(){
  const g=new T.Group(),cork=mat(0xb08a5a),blank=new T.MeshPhongMaterial({color:0x2a2a2e,shininess:60});
  g.add(new T.Mesh(new T.CylinderGeometry(0.025,0.028,0.32,8).translate(0,0.08,0),cork));
  g.add(new T.Mesh(new T.CylinderGeometry(0.006,0.016,1.75,6).translate(0,1.1,0),blank));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.045,0.045,0.05,12).rotateZ(Math.PI/2).translate(0,0.22,0.06),new T.BoxGeometry(0.015,0.07,0.015).translate(0,0.2,0.03)]),new T.MeshPhongMaterial({color:0x9aa0a6,shininess:80})));
  const tip=new T.Object3D();tip.position.set(0,1.97,0);g.add(tip);g.userData.tip=tip;
  return g;
}
{
  const r=makeRodModel();r.position.set(0,-0.68,0);r.rotation.x=1.65;r.visible=false;player.armR.add(r);player.rod=r;
  const fr=makeRodModel();fr.rotation.set(-1.15,0,0.15);fr.position.set(0,-0.04,-0.1);fr.visible=false;fpTool.arm.add(fr);fpTool.tools.rod=fr;
  fr.traverse(o=>{if(o.isMesh)o.castShadow=false;});
}

/* ----- Flotteur et ligne ----- */
function makeBobber(){
  const g=new T.Group();
  g.add(new T.Mesh(new T.SphereGeometry(0.06,10,6,0,Math.PI*2,0,Math.PI/2),mat(0xd8302a)));
  g.add(new T.Mesh(new T.SphereGeometry(0.06,10,6,0,Math.PI*2,Math.PI/2,Math.PI/2),mat(0xf4f1e8)));
  g.add(new T.Mesh(new T.CylinderGeometry(0.008,0.008,0.08,4).translate(0,0.09,0),mat(0xd8302a)));
  return g;
}
function makeLine(){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(12*3),3));const l=new T.Line(geo,new T.LineBasicMaterial({color:0x202020,transparent:true,opacity:0.7}));l.frustumCulled=false;return l;}
function setLine(line,a,b,sag){
  const pa=line.geometry.attributes.position;
  for(let i=0;i<12;i++){const t=i/11;pa.setXYZ(i,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*sag,a.z+(b.z-a.z)*t);}
  pa.needsUpdate=true;
}
const bobber=makeBobber();bobber.visible=false;scene.add(bobber);
const fishLine=makeLine();fishLine.visible=false;scene.add(fishLine);
const _tip=new T.Vector3(),_bob=new T.Vector3();

/* ----- Où lancer : de l'eau assez creuse devant soi (on cherche aussi un peu à gauche et à droite) ----- */
function castTarget(){
  for(const da of [0,0.35,-0.35,0.7,-0.7,1.05,-1.05])for(const d of [7,6,5,4.2]){
    const a=P.rot+da,x=P.x+Math.sin(a)*d,z=P.z+Math.cos(a)*d,dp=waterDepth(x,z);
    if(dp>0.45&&!onDock(x,z)&&!(x>DOCK.x0-0.3&&x<DOCK.x1+0.3&&Math.abs(z-LAKE.z)<1.3))return {x,z,depth:dp,a};
  }
  return null;
}
function isDusk(){const h=gameHour();return (h>=5&&h<8.5)||(h>=18&&h<21.5);}
function nextBite(){let t=6+Math.random()*10;if(SKY.rain>0.5)t*=0.7;else if(SKY.cloud>0.6)t*=0.85;if(isDusk())t*=0.75;return t;}
function pickFish(depth){
  const d=clamp(depth/2.6,0,1),dusk=isDusk()?1:0;
  const wt={perchaude:0.45-0.25*d,achigan:0.25,truite:0.18,dore:0.07+0.12*dusk+0.05*d,brochet:0.03+0.08*d};
  let s=0;for(const k in wt)s+=wt[k];let r=Math.random()*s;
  for(const k in wt){r-=wt[k];if(r<=0)return k;}return 'perchaude';
}

/* ----- État de la pêche ----- */
P.fishing=null;      // {state:'cast'|'wait'|'bite', x,z, depth, t, biteAt, biteEnd, ox,oz}
P.cast=0;            // animation du lancer
P.catchShow=0;P.catchFish=null;
function startCast(){
  const tg=castTarget();if(!tg)return;
  P.rot=tg.a;P.cast=0.0001;sfxCast(P.x,P.z);
  P.fishing={state:'cast',x:tg.x,z:tg.z,depth:tg.depth,t:0,ox:P.x,oz:P.z};
}
function stopFishing(silent){if(!P.fishing)return;P.fishing=null;bobber.visible=false;fishLine.visible=false;if(!silent)sfxReel(P.x,P.z);}
function hook(){
  const f=P.fishing;if(!f||f.state!=='bite')return;
  const k=pickFish(f.depth),F=FISH[k],big=Math.pow(Math.random(),1.7)*(0.65+0.35*clamp(f.depth/2.6,0,1)),w=Math.round((F.w[0]+(F.w[1]-F.w[0])*big)*100)/100;
  sfxSplash(f.x,f.z,1);sfxReel(P.x,P.z);
  stopFishing(true);
  P.catchShow=2.2;P.catchFish={k,w};
  giveItem({id:'poisson:'+k,n:1,w:[w]});J.fish();
  if(w>=2.5||k==='brochet')jlog(`a pêché ${/^[aeéiouy]/i.test(F.n)?'un':'un'} ${F.n.toLowerCase()} de ${kg(w)} !`);
  toast(`🐟 ${F.n} de ${kg(w)} !`);
}
function fishContext(){
  const f=P.fishing;
  if(f){
    if(f.state==='bite')return {act:{label:'🎣 Ferrer !',fn:hook},info:'Ça mord !'};
    return {act:{label:'Ramener la ligne',fn:()=>stopFishing()},info:f.state==='cast'?'':'Attends que le flotteur cale…'};
  }
  if(P.catchShow>0)return {info:''};
  const tg=castTarget();
  return tg?{act:{label:'🎣 Lancer la ligne',fn:startCast},info:`Eau d'environ ${Math.round(tg.depth*10)/10} m`.replace('.',',')}:{info:'Approche-toi du lac pour pêcher (du bord ou du quai)'};
}

/* ----- Mise à jour par image ----- */
let heldFishKey=null,heldFishMesh=null;
function rodTip(out){
  if(camMode==='fp'&&fpTool.g.visible)fpTool.tools.rod.userData.tip.getWorldPosition(out);
  else player.rod.userData.tip.getWorldPosition(out);
  return out;
}
function updateFishing(dt){
  const rod=TOOL&&TOOL.kind==='rod'&&S.mode==='foot'&&!P.carry&&!P.pail;
  player.rod.visible=!!rod&&P.catchShow<=0;
  // Posture : canne tenue devant, lancer par-dessus l'épaule
  if(rod&&P.catchShow<=0){
    let r=-0.9;
    if(P.cast>0){P.cast+=dt;const u=P.cast/0.55;r=u<0.45?lerp(-0.9,-2.6,u/0.45):lerp(-2.6,-0.6,Math.min(1,(u-0.45)/0.55));if(u>=1)P.cast=0;}
    else if(P.fishing&&P.fishing.state==='bite')r=-1.15+Math.sin(S.time*30)*0.05;
    player.armR.rotation.x=r;player.armL.rotation.x=-0.6;
  }
  // Poisson montré à bout de bras après une prise
  if(P.catchShow>0){P.catchShow-=dt;player.armR.rotation.x=-2.3;}
  const show=P.catchShow>0?P.catchFish:(S.mode==='foot'&&!P.carry&&!P.pail&&P.heldFish?{k:P.heldFish.split('|')[0],w:null,c:P.heldFish.includes('|c')}:null);
  const key=show?show.k+'|'+show.w+'|'+!!show.c:null;
  if(key!==heldFishKey){
    if(heldFishMesh){heldFishMesh.parent.remove(heldFishMesh);heldFishMesh=null;}
    heldFishKey=key;
    if(show){heldFishMesh=makeFishModel(show.k,show.w,show.c);heldFishMesh.rotation.set(Math.PI/2,0,0);heldFishMesh.position.set(0,-0.7,0.05);player.armR.add(heldFishMesh);}
  }
  const f=P.fishing;
  if(!f){bobber.visible=fishLine.visible=false;return;}
  if(!rod||Math.hypot(P.x-f.ox,P.z-f.oz)>1.2){stopFishing(true);return;}
  f.t+=dt;rodTip(_tip);
  const wy=LAKE_Y+0.03;
  if(f.state==='cast'){
    const u=Math.min(1,f.t/0.7);
    _bob.set(_tip.x+(f.x-_tip.x)*u,_tip.y+(wy-_tip.y)*u+Math.sin(u*Math.PI)*1.6,_tip.z+(f.z-_tip.z)*u);
    if(u>=1){f.state='wait';f.t=0;f.biteAt=nextBite();sfxSplash(f.x,f.z,0.4);}
  }else{
    let y=wy+Math.sin(S.time*2.2)*0.012;
    if(f.state==='wait'){
      if(Math.sin(f.t*5.3)*Math.sin(f.t*1.7)>0.93)y-=0.03;        // petites touches
      if(f.t>=f.biteAt){f.state='bite';f.biteEnd=f.t+1.15;sfxPlop(f.x,f.z);try{navigator.vibrate&&navigator.vibrate(70);}catch(e){}}
    }else if(f.state==='bite'){
      y-=0.12+Math.sin(f.t*28)*0.03;
      if(f.t>f.biteEnd){f.state='wait';f.biteAt=f.t+4+Math.random()*7;toast('Trop tard… il s\'est sauvé ! Le flotteur est encore à l\'eau');}
    }
    _bob.set(f.x,y,f.z);
  }
  bobber.position.copy(_bob);bobber.visible=true;
  setLine(fishLine,_tip,_bob,f.state==='cast'?0:0.25);fishLine.visible=true;
}

/* ----- Avatars : la canne et le flotteur de l'autre joueur ----- */
function avatarFishing(a,p,f){
  if(!f.rod){const r=makeRodModel();r.position.set(0,-0.68,0);r.rotation.x=1.65;f.armR.add(r);f.rod=r;}
  const rod=p.tool==='canne'&&p.m==='foot'&&!p.c&&!p.v;
  f.rod.visible=rod;
  if(rod&&p.ar===undefined){f.armR.rotation.x=-0.9;}
  if(p.fb&&rod){
    if(!a.bob){a.bob=makeBobber();a.line=makeLine();scene.add(a.bob,a.line);}
    a.bob.visible=a.line.visible=true;
    const y=LAKE_Y+0.03-(p.fb[2]?0.12:0)+Math.sin(S.time*2.2)*0.012;
    a.bob.position.set(p.fb[0],y,p.fb[1]);
    f.rod.userData.tip.getWorldPosition(_tip);setLine(a.line,_tip,a.bob.position,0.25);
  }else if(a.bob){a.bob.visible=a.line.visible=false;}
}
