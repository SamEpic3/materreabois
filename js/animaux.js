/* Chevreuils et lièvres : ils broutent, se promènent et se sauvent quand on approche.
   On peut les chasser (chasse.js). Chaque joueur voit ses propres animaux vivants; le gibier abattu, lui, est partagé. */
const ANIM_MAT=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
const col3=(g,c)=>{const k=new T.Color(c);return paintGeo(g.toNonIndexed(),()=>[k.r,k.g,k.b]);};

function makeDeer(buck){
  const g=new T.Group(),brown=0x8b5e3c,dark=0x5a3a24,white=0xeee6d6;
  const body=new T.Group();g.add(body);
  const bodyParts=[
    col3(new T.SphereGeometry(1,10,7).scale(0.22,0.26,0.62).translate(0,0.95,0),brown),
    col3(new T.SphereGeometry(1,8,6).scale(0.16,0.12,0.42).translate(0,0.8,0),white),            // ventre
    col3(new T.ConeGeometry(0.06,0.16,5).rotateX(-2.4).translate(0,1.05,-0.62),white)];           // queue blanche
  const parts=[
    col3(new T.CylinderGeometry(0.08,0.12,0.5,7).rotateX(0.6).translate(0,1.25,0.52),brown),      // cou
    col3(new T.SphereGeometry(1,8,6).scale(0.11,0.12,0.2).translate(0,1.48,0.72),brown),           // tête
    col3(new T.ConeGeometry(0.07,0.18,6).rotateX(Math.PI/2).translate(0,1.43,0.92),dark),          // museau
    col3(new T.SphereGeometry(0.03,5,4).translate(0,1.43,1.0),0x111111),
    col3(new T.ConeGeometry(0.05,0.16,4).rotateZ(1.1).translate(0.13,1.6,0.66),brown),
    col3(new T.ConeGeometry(0.05,0.16,4).rotateZ(-1.1).translate(-0.13,1.6,0.66),brown)
  ];
  if(buck){[1,-1].forEach(s=>{parts.push(col3(new T.CylinderGeometry(0.012,0.02,0.32,4).rotateZ(-s*0.4).translate(s*0.1,1.72,0.66),0xcbb894),
    col3(new T.CylinderGeometry(0.01,0.015,0.18,4).rotateX(0.7).translate(s*0.15,1.78,0.74),0xcbb894),col3(new T.CylinderGeometry(0.01,0.015,0.16,4).rotateX(-0.4).translate(s*0.17,1.84,0.6),0xcbb894));});}
  body.add(new T.Mesh(mergeGeos(bodyParts),ANIM_MAT));
  const head=new T.Group();head.position.set(0,1.1,0.42);body.add(head);
  const hm=new T.Mesh(mergeGeos(parts).translate(0,-1.1,-0.42),ANIM_MAT);head.add(hm);
  const legGeo=col3(new T.CylinderGeometry(0.045,0.03,0.8,5).translate(0,-0.4,0),brown);
  const legs=[[0.12,0.45],[-0.12,0.45],[0.12,-0.42],[-0.12,-0.42]].map(([x,z])=>{const l=new T.Mesh(legGeo,ANIM_MAT);l.position.set(x,0.85,z);body.add(l);return l;});
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return {g,body,legs,head};
}
function makeHare(white){
  const c=white?0xf2f2ee:0x8a7a62,g=new T.Group();
  const m=new T.Mesh(mergeGeos([
    col3(new T.SphereGeometry(1,8,6).scale(0.11,0.12,0.18).translate(0,0.14,0),c),
    col3(new T.SphereGeometry(1,7,5).scale(0.07,0.07,0.08).translate(0,0.24,0.15),c),
    col3(new T.SphereGeometry(1,5,4).scale(0.025,0.11,0.035).rotateX(-0.35).translate(0.035,0.37,0.11),c),
    col3(new T.SphereGeometry(1,5,4).scale(0.025,0.11,0.035).rotateX(-0.35).translate(-0.035,0.37,0.11),c),
    col3(new T.SphereGeometry(0.035,5,4).translate(0,0.18,-0.18),0xffffff),
    col3(new T.SphereGeometry(0.012,4,3).translate(0.04,0.26,0.2),0x111111),col3(new T.SphereGeometry(0.012,4,3).translate(-0.04,0.26,0.2),0x111111),
    col3(new T.BoxGeometry(0.05,0.03,0.14).translate(0.06,0.02,-0.04),c),col3(new T.BoxGeometry(0.05,0.03,0.14).translate(-0.06,0.02,-0.04),c)
  ]),ANIM_MAT);m.castShadow=true;g.add(m);
  return {g,body:m};
}

const animals=[];let animT=0;
function scarers(){
  const a=[{x:P.x,z:P.z,k:S.mode==='vtt'?1.6:1}];
  if(typeof NET!=='undefined'&&NET.avatars)for(const id in NET.avatars){const v=NET.avatars[id];a.push({x:v.x,z:v.z,k:1});}
  vehicles.forEach(v=>{if(v.driver||Math.abs(v.v)>0.5)a.push({x:v.x,z:v.z,k:1.6});});
  return a;
}
function okGround(x,z){return !outW(x,z,3)&&waterDepth(x,z)<0&&!onDock(x,z)&&Math.hypot(x-CAMP.x,z-CAMP.z)>CAMP_FLAT+2&&vilOut(x,z)>3&&canWalkLand(x,z);}
function canWalkLand(x,z){return typeof landBlocked!=='function'||!landBlocked(x,z);}
function spawnAnimal(kind,f){
  for(let k=0;k<12;k++){
    const a=Math.random()*Math.PI*2,d=35+Math.random()*40,x=f.x+Math.cos(a)*d,z=f.z+Math.sin(a)*d;
    if(!okGround(x,z)||hits(x,z,0.5))continue;
    const n=kind==='deer'?(Math.random()<0.45?1:Math.random()<0.7?2:3):1;
    for(let i=0;i<n;i++){
      const ox=x+(Math.random()-0.5)*4,oz=z+(Math.random()-0.5)*4;if(!okGround(ox,oz))continue;
      const buck=kind==='deer'&&i===0&&Math.random()<0.4,m=kind==='deer'?makeDeer(buck):makeHare(SKY.snowCover>0.35);
      scene.add(m.g);
      animals.push({kind,buck,...m,x:ox,z:oz,rot:Math.random()*6.28,st:'graze',t:Math.random()*4,sp:0,phase:Math.random()*6,hop:0});
    }
    return;
  }
}
function updateAnimals(dt,f){
  animT-=dt;
  if(animT<=0){animT=2;
    const deer=animals.filter(a=>a.kind==='deer').length,hares=animals.length-deer;
    if(deer<4&&Math.random()<0.5)spawnAnimal('deer',f);
    if(hares<5&&Math.random()<0.5)spawnAnimal('hare',f);
  }
  const sc=scarers();
  for(let i=animals.length-1;i>=0;i--){
    const a=animals[i],dF=Math.hypot(a.x-f.x,a.z-f.z);
    if(dF>95){scene.remove(a.g);animals.splice(i,1);continue;}
    // Danger le plus proche
    let thr=null,td=1e9;sc.forEach(s=>{const d=Math.hypot(a.x-s.x,a.z-s.z)/s.k;if(d<td){td=d;thr=s;}});
    const deer=a.kind==='deer',flee=deer?13:7,alert=deer?22:10;
    a.t-=dt;
    if(td<flee&&a.st!=='flee'){a.st='flee';a.t=3+Math.random()*2;}
    if(a.st==='flee'){
      const away=Math.atan2(a.x-thr.x,a.z-thr.z);a.rot+=wrapAng(away-a.rot)*Math.min(1,dt*5);a.sp=deer?9:7;
      if(a.t<=0&&td>flee*1.6){a.st='alert';a.t=2+Math.random()*2;}
    }else if(td<alert){a.st='alert';a.sp=0;a.rot+=wrapAng(Math.atan2(thr.x-a.x,thr.z-a.z)-a.rot)*Math.min(1,dt*2);}
    else if(a.t<=0){
      a.st=Math.random()<0.55?'graze':'walk';a.t=3+Math.random()*6;
      if(a.st==='walk')a.rot+=(Math.random()-0.5)*2;
      a.sp=a.st==='walk'?(deer?1.1:0.8):0;
    }
    // Avancer en évitant l'eau, les obstacles et les terres fermées
    if(a.sp>0){
      let nx=a.x+Math.sin(a.rot)*a.sp*dt,nz=a.z+Math.cos(a.rot)*a.sp*dt;
      if(!okGround(nx,nz)&&!(a.st==='flee'&&Math.hypot(nx-CAMP.x,nz-CAMP.z)>CAMP.r)||hits(nx,nz,deer?0.4:0.15)){a.rot+=(Math.random()<0.5?1:-1)*(1+Math.random());}
      else{a.x=nx;a.z=nz;}
    }
    // Animation
    const y=H(a.x,a.z);a.phase+=dt*(a.sp*(deer?1.6:3.2)+0.001);
    if(deer){
      const run=a.sp>3,sw=a.sp>0?Math.sin(a.phase)*(run?0.9:0.35):0;
      a.legs[0].rotation.x=sw;a.legs[1].rotation.x=run?sw:-sw;a.legs[2].rotation.x=run?-sw:-sw;a.legs[3].rotation.x=run?-sw:sw;
      a.g.position.set(a.x,y+(run?Math.abs(Math.sin(a.phase))*0.25:0),a.z);
      const headDown=a.st==='graze'?1.75:0;a.head.rotation.x+=(headDown-a.head.rotation.x)*Math.min(1,dt*3);
    }else{
      const hop=a.sp>0?Math.abs(Math.sin(a.phase))*(a.sp>2?0.35:0.12):0;
      a.g.position.set(a.x,y+hop,a.z);a.body.rotation.x=a.sp>0?-Math.cos(a.phase)*0.25:0;
    }
    a.g.rotation.y=a.rot;
  }
}
