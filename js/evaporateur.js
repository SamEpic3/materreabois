/* Cabane à sucre avec évaporateur : comme la bouilloire, en beaucoup plus gros et plus rapide.
   On verse l'eau d'érable, on chauffe au bois, on récolte le sirop. */
const EVAPO={cap:300,rate:3.5,fuel:1500};   // 300 L, bout 3,5× plus vite, réserve de feu de 25 min
const SUC_W=4.6,SUC_D=5.4,SUC_H=2.7;
function makeEvapoModel(){
  const g=new T.Group(),W=SUC_W,D=SUC_D,Hh=SUC_H;
  const boards=texMat(sidingTex('#7b5236','#4b311f',true),1,1),trim=mat(0xe2d9c6),dark=mat(0x262422);
  const wall=(w,h,d,x,y,z,rx)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d).translate(x,y,z),boards.clone());m.material.map=boards.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(rx,1);return m;};
  // Murs : arrière, côtés, et devant de chaque côté de la grande porte ouverte
  const DOOR=2.2,side=(W-DOOR)/2;
  g.add(wall(W,Hh,0.14,0,Hh/2,-D/2,9),wall(0.14,Hh,D,W/2,Hh/2,0,11),wall(0.14,Hh,D,-W/2,Hh/2,0,11),
        wall(side,Hh,0.14,(DOOR+side)/2,Hh/2,D/2,4),wall(side,Hh,0.14,-(DOOR+side)/2,Hh/2,D/2,4),wall(DOOR,0.45,0.14,0,Hh-0.22,D/2,4));
  g.add(new T.Mesh(mergeGeos([gable(W,D+0.14,Hh,1.25,W/2),gable(W,D+0.14,Hh,1.25,-W/2)]).rotateY(Math.PI/2),boards));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.16,Hh,0.18).translate(DOOR/2,Hh/2,D/2+0.02),new T.BoxGeometry(0.16,Hh,0.18).translate(-DOOR/2,Hh/2,D/2+0.02),new T.BoxGeometry(DOOR+0.3,0.14,0.18).translate(0,Hh-0.45,D/2+0.02)]),trim));
  // Toit à deux versants (faîte de l'avant vers l'arrière) et lanterneau à vapeur sur le faîte
  const tin=texMat(tinTex(),14,1,{shininess:30}),pitch=Math.atan2(1.25,W/2),L=(W/2)/Math.cos(pitch)+0.45;
  [-1,1].forEach(s=>{const r=new T.Mesh(new T.BoxGeometry(L,0.07,D+0.7),tin);r.position.set(s*(L/2*Math.cos(pitch)-0.2),Hh+1.25/2+0.05,0);r.rotation.z=-s*pitch;g.add(r);});
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.9,0.55,2.4).translate(0,Hh+1.5,-0.4)]),boards));
  [-1,1].forEach(s=>{const r=new T.Mesh(new T.BoxGeometry(0.75,0.05,2.7),tin);r.position.set(s*0.3,Hh+1.86,-0.4);r.rotation.z=-s*0.55;g.add(r);});
  g.add(new T.Mesh(mergeGeos([-1,1].map(s=>new T.BoxGeometry(0.02,0.3,2.3).translate(s*0.46,Hh+1.5,-0.4))),dark));   // ouvertures à vapeur
  // Évaporateur : arche de briques, deux casseroles, porte du foyer, cheminée par le toit
  const brick=texMat(canvasTex(64,64,(c,w,h)=>{c.fillStyle='#8e4a34';c.fillRect(0,0,w,h);c.fillStyle='#c9bfae';for(let y=0;y<h;y+=16){c.fillRect(0,y,w,2);for(let x=(y/16)%2?0:16;x<w;x+=32)c.fillRect(x,y,2,16);}}),3,2);
  const steel=new T.MeshPhongMaterial({color:0xb8bec2,shininess:80,specular:0x888888});
  g.add(new T.Mesh(new T.BoxGeometry(1.15,0.85,3.1).translate(0,0.425,-0.65),brick));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(1.25,0.05,1.25).translate(0,0.9,0.15),new T.BoxGeometry(1.25,0.05,1.7).translate(0,0.9,-1.4),
    ...[[0.62,0.15,1.25],[-0.62,0.15,1.25],[0.62,-1.4,1.7],[-0.62,-1.4,1.7]].map(([x,z,l])=>new T.BoxGeometry(0.04,0.28,l).translate(x,1.04,z)),
    ...[0.78,-0.48,-2.25].map(z=>new T.BoxGeometry(1.25,0.28,0.04).translate(0,1.04,z)),
    new T.BoxGeometry(0.04,0.2,1.15).translate(0,1.0,0.15),new T.BoxGeometry(0.04,0.2,1.6).translate(0.2,1.0,-1.4),new T.BoxGeometry(0.04,0.2,1.6).translate(-0.2,1.0,-1.4),
    new T.CylinderGeometry(0.03,0.03,0.2,8).rotateZ(Math.PI/2).translate(0.72,0.96,0.6)]),steel));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.7,0.5,0.05).translate(0,0.4,0.9),new T.BoxGeometry(0.06,0.06,0.08).translate(0.28,0.4,0.95)]),dark));
  g.add(new T.Mesh(new T.CylinderGeometry(0.16,0.18,Hh+2.2,12).translate(0,(Hh+2.2)/2+0.8,-2.3),dark));
  // Réservoir d'eau d'érable sur un support, à côté
  g.add(new T.Mesh(new T.CylinderGeometry(0.42,0.42,0.8,16).translate(-1.55,1.4,-1.6),steel));
  g.add(new T.Mesh(mergeGeos([[-1.85,-1.9],[-1.25,-1.9],[-1.85,-1.3],[-1.25,-1.3]].map(([x,z])=>new T.BoxGeometry(0.08,1.0,0.08).translate(x,0.5,z))),mat(0x6a4a30)));
  g.add(new T.Mesh(new T.BoxGeometry(SUC_W-0.2,0.04,SUC_D-0.2).translate(0,0.02,0),mat(0x7a6a55)));   // plancher
  return bakeStatic(g);
}
function createEvapo(b,o){
  const g=makeEvapoModel();
  const liquid=new T.Mesh(mergeGeos([new T.BoxGeometry(1.18,0.03,1.18).translate(0,0.98,0.15),new T.BoxGeometry(1.18,0.03,1.62).translate(0,0.98,-1.4)]),new T.MeshBasicMaterial({color:SAP_COL}));liquid.visible=false;g.add(liquid);
  // Feu pris : la porte du foyer rougeoie (ses fentes laissent voir les flammes)
  const fl=new T.Group();fl.visible=false;g.add(fl);
  [0.27,0.37,0.47].forEach((y,i)=>{const c=new T.Mesh(new T.PlaneGeometry(0.5,0.035),new T.MeshBasicMaterial({color:[0xff7a1a,0xffb02e,0xffd35a][i]}));c.position.set(0,y,0.93);c.scale.y=1;fl.add(c);});
  const glow=new T.Mesh(new T.PlaneGeometry(1.0,0.5),new T.MeshBasicMaterial({color:0xff7a1a,transparent:true,opacity:0.18,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(0,0.03,1.2);fl.add(glow);
  o.add(g);o.liquid=liquid;o.fl=fl;
  // Collisions : murs (porte ouverte devant) et évaporateur
  const W=SUC_W,D=SUC_D,pts=[];
  for(let x=-W/2;x<=W/2+0.01;x+=0.55)pts.push([x,-D/2]);
  for(let z=-D/2;z<=D/2+0.01;z+=0.55){pts.push([W/2,z]);pts.push([-W/2,z]);}
  [1.25,1.75,2.3].forEach(x=>{pts.push([x,D/2]);pts.push([-x,D/2]);});
  pts.forEach(([lx,lz])=>{const p=lw(b,lx,lz);o.col(p.x,p.z,0.3);});
  [-1.9,-1.2,-0.5,0.2].forEach(lz=>{const p=lw(b,0,lz);o.col(p.x,p.z,0.62);});
  {const p=lw(b,-1.55,-1.6);o.col(p.x,p.z,0.45);}
}
KINDS.evapo={name:'Cabane à sucre',art:'la',price:3500,icon:'🏚️',dist:5,foot:[[-1.3,-1.3,1.6],[1.3,-1.3,1.6],[-1.3,1.3,1.6],[1.3,1.3,1.6]],model:makeEvapoModel,create:createEvapo,
  init:()=>({fuel:0,sap:0,syrup:0}),near:b=>lw(b,0,1.75),nearR:1.5,
  desc:`Une vraie cabane à sucre avec un évaporateur : ${EVAPO.cap} L d'eau d'érable et ${EVAPO.rate} fois plus rapide que la bouilloire. Entre par la grande porte pour verser l'eau et chauffer.`};
KIND_IDS.push('evapo');
