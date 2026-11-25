/* Oiseaux qui passent dans le ciel de temps en temps (1 aux 1 à 3 minutes) :
   corneilles (souvent en petit groupe) et aigles le jour, hiboux la nuit. Chacun a son cri. */
const birds=[];let birdTimer=25+Math.random()*40;

// Modèle : corps, tête, bec, queue et deux ailes qui battent (pivot à l'épaule)
function wingShape(span,chord,fingers){
  const s=new T.Shape();s.moveTo(0,chord*0.5);s.lineTo(span*0.55,chord*0.45);
  if(fingers){for(let i=0;i<4;i++){const x=span*(0.62+i*0.1),z=chord*(0.42-i*0.22);s.lineTo(x+span*0.08,z+chord*0.05);s.lineTo(x,z-chord*0.1);}s.lineTo(span*0.55,-chord*0.5);}
  else{s.lineTo(span,chord*0.1);s.lineTo(span*0.9,-chord*0.25);s.lineTo(span*0.5,-chord*0.5);}
  s.lineTo(0,-chord*0.5);s.lineTo(0,chord*0.5);
  const g=new T.ShapeGeometry(s);g.rotateX(Math.PI/2);return g;   // aile à plat dans le plan x-z, vers +x
}
function makeBird(kind){
  const P={
    corneille:{span:0.55,chord:0.24,body:0x16161a,wing:0x1c1c22,head:0x16161a,beak:0x222222,tail:0x16161a,bl:0.42,fingers:true},
    aigle:{span:1.15,chord:0.42,body:0x4a3322,wing:0x3e2a1c,head:0xf2efe6,beak:0xe2b63a,tail:0xf2efe6,bl:0.8,fingers:true},
    hibou:{span:0.6,chord:0.34,body:0x7a6650,wing:0x6b5844,head:0x7a6650,beak:0x3a3226,tail:0x6b5844,bl:0.45,fingers:false}
  }[kind];
  const g=new T.Group(),m=c=>new T.MeshLambertMaterial({color:c,side:T.DoubleSide});
  const body=new T.Mesh(new T.SphereGeometry(1,8,6).scale(P.bl*0.22,P.bl*0.2,P.bl*0.5),m(P.body));g.add(body);
  const head=new T.Mesh(new T.SphereGeometry(P.bl*(kind==='hibou'?0.22:0.15),8,6).translate(0,P.bl*0.05,P.bl*0.5),m(P.head));g.add(head);
  const beak=new T.Mesh(new T.ConeGeometry(P.bl*0.05,P.bl*(kind==='hibou'?0.08:0.2),5).rotateX(Math.PI/2).translate(0,P.bl*0.03,P.bl*(kind==='hibou'?0.7:0.72)),m(P.beak));g.add(beak);
  const ts=new T.Shape();ts.moveTo(-P.bl*0.08,0);ts.lineTo(P.bl*0.08,0);ts.lineTo(P.bl*0.2,-P.bl*0.45);ts.lineTo(-P.bl*0.2,-P.bl*0.45);ts.lineTo(-P.bl*0.08,0);
  const tail=new T.Mesh(new T.ShapeGeometry(ts).rotateX(Math.PI/2).rotateY(Math.PI).translate(0,0,-P.bl*0.4),m(P.tail));g.add(tail);
  const wg=wingShape(P.span,P.chord,P.fingers),wm=m(P.wing);
  const wl=new T.Group(),wr=new T.Group();wl.position.set(P.bl*0.15,P.bl*0.05,P.bl*0.08);wr.position.set(-P.bl*0.15,P.bl*0.05,P.bl*0.08);
  wl.add(new T.Mesh(wg,wm));const r=new T.Mesh(wg,wm);r.scale.x=-1;wr.add(r);g.add(wl,wr);
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return {g,wl,wr};
}

function spawnBird(focus){
  const night=SKY.day<0.35;
  const kind=night?'hibou':Math.random()<0.62?'corneille':'aigle';
  const n=kind==='corneille'?1+Math.floor(Math.random()*3):1;
  const a=Math.random()*Math.PI*2,side=(Math.random()-0.5)*30;
  const dir={x:Math.cos(a),z:Math.sin(a)},nx=-dir.z,nz=dir.x;
  const R=75,speed=kind==='aigle'?7:kind==='hibou'?6:9.5,alt=kind==='aigle'?24+Math.random()*10:kind==='hibou'?9+Math.random()*4:13+Math.random()*8;
  const base=H(focus.x,focus.z);
  for(let i=0;i<n;i++){
    const b=makeBird(kind);
    const off=i*2.5,lat=side+(i%2?1.5:-1.5)*i;
    const sx=focus.x-dir.x*(R+off)+nx*lat,sz=focus.z-dir.z*(R+off)+nz*lat;
    b.g.scale.setScalar(kind==='aigle'?1.2:1.15);
    scene.add(b.g);
    birds.push({kind,...b,x:sx,z:sz,y:base+alt+i*0.6,dx:dir.x,dz:dir.z,speed,t:Math.random()*5,life:(2*R+off)/speed,
      calls:kind==='corneille'?(i===0?2+Math.floor(Math.random()*3):Math.random()<0.5?1:0):kind==='aigle'?1+Math.floor(Math.random()*2):2,nextCall:3+Math.random()*4+i*1.3,wob:Math.random()*6});
  }
}
function updateBirds(dt,focus){
  birdTimer-=dt;
  if(birdTimer<=0){birdTimer=60+Math.random()*120;if(SKY.rain<0.5)spawnBird(focus);}
  for(let i=birds.length-1;i>=0;i--){
    const b=birds[i];b.t+=dt;b.life-=dt;
    // Légère trajectoire courbe, l'aigle plane en gros cercles lents
    const turn=b.kind==='aigle'?Math.sin(b.t*0.25+b.wob)*0.35:Math.sin(b.t*0.6+b.wob)*0.15;
    const c=Math.cos(turn*dt),s=Math.sin(turn*dt),ndx=b.dx*c-b.dz*s,ndz=b.dx*s+b.dz*c;b.dx=ndx;b.dz=ndz;
    b.x+=b.dx*b.speed*dt;b.z+=b.dz*b.speed*dt;
    const bob=b.kind==='aigle'?Math.sin(b.t*0.5)*0.6:Math.sin(b.t*2)*0.15;
    b.g.position.set(b.x,b.y+bob,b.z);b.g.rotation.set(0,Math.atan2(b.dx,b.dz),-turn*0.6);
    // Battements : l'aigle plane surtout; la corneille bat des ailes avec de courts planés
    let f;
    if(b.kind==='aigle'){const flap=Math.sin(b.t*0.3+b.wob)>0.85;f=flap?Math.sin(b.t*9)*0.45:0.12+Math.sin(b.t*1.3)*0.04;}
    else if(b.kind==='hibou')f=Math.sin(b.t*8)*0.55;
    else{const glide=Math.sin(b.t*0.9+b.wob)>0.7;f=glide?0.08:Math.sin(b.t*15)*0.6;}
    b.wl.rotation.z=f;b.wr.rotation.z=-f;
    // Cris
    b.nextCall-=dt;
    if(b.calls>0&&b.nextCall<=0){b.calls--;b.nextCall=b.kind==='aigle'?5+Math.random()*4:b.kind==='hibou'?4+Math.random()*3:1.2+Math.random()*2.5;
      if(b.kind==='corneille')sfxCrow(b.x,b.z);else if(b.kind==='aigle')sfxEagle(b.x,b.z);else sfxOwl(b.x,b.z);}
    if(b.life<=0){scene.remove(b.g);b.g.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});birds.splice(i,1);}
  }
}
