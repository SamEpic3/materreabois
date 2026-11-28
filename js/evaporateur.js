/* Cabane à sucre avec évaporateur : comme la bouilloire, en beaucoup plus gros et plus rapide.
   On verse l'eau d'érable, on chauffe au bois, on récolte le sirop. */
const EVAPO={cap:300,rate:3.5,fuel:1500};   // 300 L, bout 3,5× plus vite, réserve de feu de 25 min
const SUC_W=9.2,SUC_D=10.8,SUC_H=3.6,EVS=1.4,SUC_RISE=2.5;   // cabane 2× plus grande, évaporateur 1,4×
const EVP=(x,z)=>[x*EVS,z*EVS-0.6];   // repère de l'évaporateur → repère de la cabane
function makeEvapoRoof(){
  const g=new T.Group(),W=SUC_W,D=SUC_D,Hh=SUC_H,boards=texMat(sidingTex('#7b5236','#4b311f',true),1,1),dark=mat(0x262422);
  // Pignons (devant et derrière), alignés sur les murs et sous les versants
  g.add(new T.Mesh(mergeGeos([gable(0,W+0.16,Hh,SUC_RISE-0.12,D/2),gable(0,W+0.16,Hh,SUC_RISE-0.12,-D/2)]).rotateY(-Math.PI/2),boards));
  // Toit à deux versants (faîte de l'avant vers l'arrière) et lanterneau à vapeur sur le faîte
  const tin=texMat(tinTex(),24,1,{shininess:30}),pitch=Math.atan2(SUC_RISE,W/2),L=(W/2)/Math.cos(pitch)+0.6;
  [-1,1].forEach(s=>{const r=new T.Mesh(new T.BoxGeometry(L,0.08,D+0.9),tin);r.position.set(s*(L/2*Math.cos(pitch)-0.3),Hh+SUC_RISE/2+0.02,0);r.rotation.z=-s*pitch;g.add(r);});
  const LY=Hh+SUC_RISE-0.1;
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.4,0.8,4.4).translate(0,LY+0.35,-0.6)]),boards));
  [-1,1].forEach(s=>{const r=new T.Mesh(new T.BoxGeometry(1.1,0.06,4.8),tin);r.position.set(s*0.45,LY+0.88,-0.6);r.rotation.z=-s*0.55;g.add(r);});
  g.add(new T.Mesh(mergeGeos([-1,1].map(s=>new T.BoxGeometry(0.02,0.4,4.2).translate(s*0.71,LY+0.35,-0.6))),dark));   // ouvertures à vapeur
  { const [cx,cz]=EVP(0,-2.3),ch=Hh+SUC_RISE+1.6;g.add(new T.Mesh(new T.CylinderGeometry(0.22,0.25,ch-Hh+0.2,12).translate(cx,(ch+Hh-0.2)/2,cz),dark)); }
  return bakeStatic(g);
}
function makeEvapoModel(){
  const g=new T.Group(),W=SUC_W,D=SUC_D,Hh=SUC_H;
  const boards=texMat(sidingTex('#7b5236','#4b311f',true),1,1),trim=mat(0xe2d9c6),dark=mat(0x262422);
  const wall=(w,h,d,x,y,z,rx)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d).translate(x,y,z),boards.clone());m.material.map=boards.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(rx,1);return m;};
  // Murs : arrière, côtés, et devant de chaque côté de la grande porte ouverte
  const DOOR=2.8,side=(W-DOOR)/2;
  g.add(wall(W,Hh,0.16,0,Hh/2,-D/2,18),wall(0.16,Hh,D,W/2,Hh/2,0,22),wall(0.16,Hh,D,-W/2,Hh/2,0,22),
        wall(side,Hh,0.16,(DOOR+side)/2,Hh/2,D/2,7),wall(side,Hh,0.16,-(DOOR+side)/2,Hh/2,D/2,7),wall(DOOR,0.5,0.16,0,Hh-0.25,D/2,4));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.18,Hh,0.2).translate(DOOR/2,Hh/2,D/2+0.02),new T.BoxGeometry(0.18,Hh,0.2).translate(-DOOR/2,Hh/2,D/2+0.02),new T.BoxGeometry(DOOR+0.3,0.16,0.2).translate(0,Hh-0.5,D/2+0.02)]),trim));
  // Grande porte fermée : deux battants de grange avec traverses en Z
  {const dm=texMat(sidingTex('#6a4426','#3e2716',true),4,1),pz=D/2+0.03,dh=Hh-0.62,parts=[];
   [-1,1].forEach(s=>{const cx=s*DOOR/4;parts.push(new T.BoxGeometry(DOOR/2-0.03,dh,0.08).translate(cx,dh/2+0.04,pz));});
   g.add(new T.Mesh(mergeGeos(parts),dm));
   const tr=[];[-1,1].forEach(s=>{const cx=s*DOOR/4;tr.push(new T.BoxGeometry(DOOR/2-0.1,0.14,0.06).translate(cx,0.45,pz+0.06),new T.BoxGeometry(DOOR/2-0.1,0.14,0.06).translate(cx,dh-0.25,pz+0.06),
     new T.BoxGeometry(0.12,Math.hypot(DOOR/2-0.2,dh-0.7),0.05).rotateZ(-s*Math.atan2(DOOR/2-0.2,dh-0.7)).translate(cx,dh/2+0.1,pz+0.07));});
   g.add(new T.Mesh(mergeGeos(tr),mat(0x4a2e1a)));
   g.add(new T.Mesh(mergeGeos([-1,1].map(s=>new T.CylinderGeometry(0.025,0.025,0.3,6).translate(s*0.12,1.25,pz+0.12))),mat(0x2a2a2a)));}
  // Évaporateur (son propre repère, agrandi de EVS) : arche de briques, deux casseroles, porte du foyer, réservoir
  const ev=new T.Group();ev.scale.setScalar(EVS);ev.position.set(0,0,-0.6);
  const brick=texMat(canvasTex(64,64,(c,w,h)=>{c.fillStyle='#8e4a34';c.fillRect(0,0,w,h);c.fillStyle='#c9bfae';for(let y=0;y<h;y+=16){c.fillRect(0,y,w,2);for(let x=(y/16)%2?0:16;x<w;x+=32)c.fillRect(x,y,2,16);}}),3,2);
  const steel=new T.MeshPhongMaterial({color:0xb8bec2,shininess:80,specular:0x888888});
  ev.add(new T.Mesh(new T.BoxGeometry(1.15,0.85,3.1).translate(0,0.425,-0.65),brick));
  ev.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.25,0.05,1.25).translate(0,0.9,0.15),new T.BoxGeometry(1.25,0.05,1.7).translate(0,0.9,-1.4),
    ...[[0.62,0.15,1.25],[-0.62,0.15,1.25],[0.62,-1.4,1.7],[-0.62,-1.4,1.7]].map(([x,z,l])=>new T.BoxGeometry(0.04,0.28,l).translate(x,1.04,z)),
    ...[0.78,-0.48,-2.25].map(z=>new T.BoxGeometry(1.25,0.28,0.04).translate(0,1.04,z)),
    new T.BoxGeometry(0.04,0.2,1.15).translate(0,1.0,0.15),new T.BoxGeometry(0.04,0.2,1.6).translate(0.2,1.0,-1.4),new T.BoxGeometry(0.04,0.2,1.6).translate(-0.2,1.0,-1.4),
    new T.CylinderGeometry(0.03,0.03,0.2,8).rotateZ(Math.PI/2).translate(0.72,0.96,0.6)]),steel));
  ev.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.7,0.5,0.05).translate(0,0.4,0.9),new T.BoxGeometry(0.06,0.06,0.08).translate(0.28,0.4,0.95)]),dark));
  // Réservoir d'eau d'érable sur un support, à côté
  ev.add(new T.Mesh(new T.CylinderGeometry(0.42,0.42,0.8,16).translate(-1.55,1.4,-1.6),steel));
  ev.add(new T.Mesh(mergeGeos([[-1.85,-1.9],[-1.25,-1.9],[-1.85,-1.3],[-1.25,-1.3]].map(([x,z])=>new T.BoxGeometry(0.08,1.0,0.08).translate(x,0.5,z))),mat(0x6a4a30)));
  g.add(ev);
  { const [cx,cz]=EVP(0,-2.3);g.add(new T.Mesh(new T.CylinderGeometry(0.22,0.25,SUC_H-1.1+0.2,12).translate(cx,(SUC_H-1.1+0.2)/2+1.1,cz),dark)); }   // cheminée (le haut est avec le toit)
  g.add(new T.Mesh(new T.BoxGeometry(SUC_W-0.2,0.04,SUC_D-0.2).translate(0,0.02,0),mat(0x7a6a55)));   // plancher
  return bakeStatic(g);
}
function createEvapo(b,o){
  const g=makeEvapoModel(),roof=makeEvapoRoof();o.add(roof);o.roof=roof;
  const evg=new T.Group();evg.scale.setScalar(EVS);evg.position.set(0,0,-0.6);g.add(evg);
  const liquid=new T.Mesh(mergeGeos([new T.BoxGeometry(1.18,0.03,1.18).translate(0,0.98,0.15),new T.BoxGeometry(1.18,0.03,1.62).translate(0,0.98,-1.4)]),new T.MeshBasicMaterial({color:SAP_COL}));liquid.visible=false;evg.add(liquid);
  // Feu pris : la porte du foyer rougeoie (ses fentes laissent voir les flammes)
  const fl=new T.Group();fl.visible=false;evg.add(fl);
  [0.27,0.37,0.47].forEach((y,i)=>{const c=new T.Mesh(new T.PlaneGeometry(0.5,0.035),new T.MeshBasicMaterial({color:[0xff7a1a,0xffb02e,0xffd35a][i]}));c.position.set(0,y,0.93);c.scale.y=1;fl.add(c);});
  const glow=new T.Mesh(new T.PlaneGeometry(1.0,0.5),new T.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.18,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(0,0.03,1.2);fl.add(glow);
  o.add(g);o.liquid=liquid;o.fl=fl;
  // Collisions : murs (porte ouverte devant) et évaporateur
  const W=SUC_W,D=SUC_D,pts=[];
  for(let x=-W/2;x<=W/2+0.01;x+=0.55)pts.push([x,-D/2]);
  for(let z=-D/2;z<=D/2+0.01;z+=0.55){pts.push([W/2,z]);pts.push([-W/2,z]);}
  for(let x=0.3;x<=W/2+0.01;x+=0.55){pts.push([x,D/2]);pts.push([-x,D/2]);}
  pts.forEach(([lx,lz])=>{const p=lw(b,lx,lz);o.col(p.x,p.z,0.3);});
  [-1.9,-1.2,-0.5,0.2].forEach(z=>{const [x,lz]=EVP(0,z),p=lw(b,x,lz);o.col(p.x,p.z,0.62*EVS);});
  {const [x,lz]=EVP(-1.55,-1.6),p=lw(b,x,lz);o.col(p.x,p.z,0.45*EVS);}
}
KINDS.evapo={name:'Cabane à sucre',art:'la',price:3500,icon:'🏚️',dist:8,foot:[[-2.4,-2.8,2.4],[2.4,-2.8,2.4],[-2.4,2.8,2.4],[2.4,2.8,2.4],[0,0,2.4]],model:()=>{const g=new T.Group();g.add(makeEvapoModel(),makeEvapoRoof());return g;},create:createEvapo,
  init:()=>({fuel:0,sap:0,syrup:0}),near:b=>lw(b,...EVP(0,1.5)),nearR:1.7,
  desc:`Une vraie cabane à sucre avec un évaporateur : ${EVAPO.cap} L d'eau d'érable et ${EVAPO.rate} fois plus rapide que la bouilloire. On entre par la grande porte pour verser l'eau et chauffer.`};
KIND_IDS.push('evapo');

/* ----- Entrer et sortir (comme au camp) : on peut entrer avec une bûche ou un seau ----- */
S.inShack=null;
const shackOut=b=>lw(b,0,SUC_D/2+1.1),shackIn=b=>lw(b,0,SUC_D/2-1.0);
function shackLocal(b,x,z){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rot||0),s=Math.sin(b.rot||0);return {x:c*dx-s*dz,z:s*dx+c*dz};}
function nearShackDoor(){if(S.mode!=='foot'||S.inside)return null;let best=null,bd=1.7;
  S.builds.forEach(b=>{if(b.k!=='evapo'||!b._o)return;const p=shackOut(b),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;best=b;}});return best;}
function enterShack(b){fadeThrough(()=>{S.inShack=b;const p=shackIn(b);P.x=p.x;P.z=p.z;P.rot=(b.rot||0)+Math.PI;P.target=null;marker.visible=false;if(camMode!=='iso')camYaw=camYawT=(b.rot||0)+Math.PI;refreshShack();});}
function exitShack(){const b=S.inShack;fadeThrough(()=>{S.inShack=null;if(b&&S.builds.includes(b)){const p=shackOut(b);P.x=p.x;P.z=p.z;P.rot=b.rot||0;if(camMode!=='iso')camYaw=camYawT=b.rot||0;}P.target=null;marker.visible=false;refreshShack();});}
function refreshShack(){S.builds.forEach(b=>{if(b.k==='evapo'&&b._o&&b._o.roof)b._o.roof.visible=!(S.inShack===b&&camMode==='iso');});}
// La caméra reste dans la cabane à sucre
function shackCamClamp(x,y,z){const b=S.inShack;if(!b)return null;const l=shackLocal(b,x,z),lx=clamp(l.x,-SUC_W/2+0.35,SUC_W/2-0.35),lz=clamp(l.z,-SUC_D/2+0.35,SUC_D/2-0.35),w=lw(b,lx,lz);
  return {x:w.x,y:Math.min(y,H(b.x,b.z)+SUC_H-0.25),z:w.z};}
{const _ctx=context;context=function(){const r=_ctx();
  if(S.mode!=='foot')return r;
  if(S.inShack){const b=S.inShack;if(!S.builds.includes(b)){S.inShack=null;return r;}const p=shackIn(b);
    if(Math.hypot(P.x-p.x,P.z-p.z)<1.4){r.enter='Sortir';r.exitShack=true;}
    if(camMode==='iso'===(b._o&&b._o.roof&&b._o.roof.visible))refreshShack();return r;}
  // Partie rechargée alors qu'on était dedans : on se retrouve « dedans » (pas coincé derrière la porte fermée)
  for(const s of S.builds){if(s.k!=='evapo'||!s._o||S.inside)continue;const l=shackLocal(s,P.x,P.z);if(Math.abs(l.x)<SUC_W/2-0.1&&Math.abs(l.z)<SUC_D/2-0.1){S.inShack=s;refreshShack();return r;}}
  const b=nearShackDoor();if(b){r.enter='Entrer dans la cabane à sucre';r.enterShack=b;r.enterVeh=r.enterSeat=r.enterCrane=r.enterPass=null;r.enterCabin=false;}
  return r;};}
