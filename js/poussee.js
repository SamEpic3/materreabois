/* Poussée : un véhicule qui rentre dans un objet le pousse; l'objet poussé pousse à son tour ce qu'il touche
   (en chaîne). Plus la masse totale poussée est grande, plus le pousseur ralentit; au-delà de 7× sa masse, il bloque.
   Corps poussables : véhicules (avec leur remorque), remorques libres, billots/tiges/cimes au sol, roches.
   Seul le joueur qui conduit calcule la poussée; les positions passent ensuite par la synchro habituelle. */
const MASS_V={vtt:350,pickup:2200,skid:9000,abat:14000,chaloupe:120,moto:110};
const MASS_T={small:250,loader:1600,dechiq:900,fendeuse:450,chaloupe:300,plateau:900};
const WOOD_KG=650;   // kg par m³ de bois vert (moyenne)
function logMass(c){const r=((c.ra||0.1)+(c.rb||0.1))/2;return Math.PI*r*r*(c.len||1)*WOOD_KG*(c.crown?0.35:1);}
const loadC=l=>(l&&l.userData&&l.userData.c)||l;   // dans une remorque, la charge est le modèle 3D du billot
function trailerMass(t){let m=MASS_T[t.kind]||500;(t.c&&t.c.load||[]).forEach(l=>m+=logMass(loadC(l)));if(t.boat)m+=120;
  vehicles.forEach(v=>{if(v.onTr&&v.onTr.tid===t.id)m+=vehMass(v);});return m;}   // + les véhicules soudés sur un plateau
function vehMass(v){let m=MASS_V[v.type]||1500;if(v.bed)v.bed.load.forEach(l=>m+=logMass(loadC(l)));return m;}
function rockMass(r){return 150+1800*r.s*r.s*r.s;}
function pieceRadius(pc,s){return pc.ra+(pc.rb-pc.ra)*clamp(s/pc.len+0.5,0,1);}

/* ---------- Roches mobiles ---------- */
const _rm4=new T.Matrix4(),_rp=new T.Vector3(),_rs=new T.Vector3(),_rq=new T.Quaternion(),_rax=new T.Vector3();
function placeRock(r){
  removeCol(r.col);r.col=addCol(r.x,r.z,0.85*r.s);r.col.rock=r;
  _rm4.compose(_rp.set(r.x,H(r.x,r.z)+0.1*r.s,r.z),r.q,_rs.set(r.s,r.s*0.7,r.s));
  r.rm.setMatrixAt(r.n,_rm4);r.rm.instanceMatrix.needsUpdate=true;
}
function moveRock(r,x,z){   // la roche roule un peu dans le sens de la poussée
  const dx=x-r.x,dz=z-r.z,d=Math.hypot(dx,dz);
  if(d>1e-4){_rq.setFromAxisAngle(_rax.set(dz/d,0,-dx/d),d/(0.85*r.s)*0.6);r.q.premultiply(_rq);}
  r.x=x;r.z=z;r.moved=true;placeRock(r);
}

/* ---------- Obstacles fixes (arbres, bâtiments, eau profonde, terres non achetées) — les roches n'en sont plus ---------- */
function hitsFixed(x,z,r){return eachNear(x,z,c=>{if(c.rock)return false;const dx=x-c.x,dz=z-c.z,rr=r+c.r;return dx*dx+dz*dz<rr*rr;});}
function staticHit(list){for(const c of list){if(waterDepth(c[0],c[1])>0.35||landBlocked(c[0],c[1])||hitsFixed(c[0],c[1],c[2]))return true;}return false;}

/* ---------- Corps poussables ---------- */
function logCircles(pc,cx,cz,rot){const n=Math.max(2,Math.ceil(pc.len/0.45)),ax=Math.sin(rot),az=Math.cos(rot),a=[];
  for(let i=0;i<n;i++){const s=-pc.len/2+pc.len*(i+0.5)/n;a.push([cx+ax*s,cz+az*s,pieceRadius(pc,s)]);}return a;}
// Pose d'un corps rigide poussé en (ox,oz) : loin du centre, il pivote plus qu'il ne glisse
function rigidPose(pose,h,p,ox,oz){
  const ax=Math.sin(pose.th),az=Math.cos(pose.th),ux=Math.cos(pose.th),uz=-Math.sin(pose.th);
  const s=(ox-pose.x)*ax+(oz-pose.z)*az,pp=p.x*ux+p.z*uz,pa=p.x*ax+p.z*az;
  const k=Math.abs(s)>0.05?0.85*Math.pow(Math.min(1,Math.abs(s)/h),2):0,dr=k?pp*k/s:0;
  return {x:pose.x+ax*pa+ux*pp*(1-k),z:pose.z+az*pa+uz*pp*(1-k),th:pose.th+dr};
}
const halfLen=cols=>Math.max(...cols.map(c=>Math.abs(c[0])+c[1]*0.6));
// Remorque attelée poussée : elle pivote autour de la boule; seule la poussée dans son axe fait bouger le véhicule
function pushHitched(veh,tr,p,o){
  const ax=Math.sin(tr.th),az=Math.cos(tr.th),ux=Math.cos(tr.th),uz=-Math.sin(tr.th),hp=tongue(tr);
  const s=(o[0]-hp.x)*ax+(o[1]-hp.z)*az,pa=p.x*ax+p.z*az,pp=p.x*ux+p.z*uz;
  const nv={x:veh.x+ax*pa,z:veh.z+az*pa,th:veh.th},hs=veh.spec.hitch||2,hx=nv.x-Math.sin(nv.th)*hs,hz=nv.z-Math.cos(nv.th)*hs;
  let th=tr.th+(Math.abs(s)>0.2?pp/s:0);
  if(Math.abs(wrapAng(th-veh.th))>JACK)th=veh.th+Math.sign(wrapAng(th-veh.th))*JACK;
  return {v:nv,t:{x:hx-Math.sin(th)*tr.spec.tl,z:hz-Math.cos(th)*tr.spec.tl,th}};
}
function buildBodies(v,tw){
  const B=[],near=(x,z,e)=>Math.abs(x-v.x)<14+e&&Math.abs(z-v.z)<14+e;   // seulement autour du pousseur (léger sur téléphone)
  vehicles.forEach(o=>{if(o===v||o.spec.boat||!near(o.x,o.z,8))return;const t=towed(o),nv=o.spec.cols.length;
    B.push({kind:'veh',o,t,fr:1,mass:vehMass(o)+(t?trailerMass(t):0),locked:!!o.driver||!!o.net,
      circles:()=>vehCircles(o,o.x,o.z,o.th).concat(t?trCircles(t,t.x,t.z,t.th):[]),
      after:(p,i,c)=>{let pv,pt=null;
        if(i<nv){pv=rigidPose(o,halfLen(o.spec.cols),p,c[0],c[1]);if(t){const hs=o.spec.hitch||2;pt=trailerFollow(t,pv.x-Math.sin(pv.th)*hs,pv.z-Math.cos(pv.th)*hs,pv.th);}}
        else{const r=pushHitched(o,t,p,c);pv=r.v;pt=r.t;}
        return {circles:vehCircles(o,pv.x,pv.z,pv.th).concat(pt?trCircles(t,pt.x,pt.z,pt.th):[]),apply:()=>{o.x=pv.x;o.z=pv.z;o.th=pv.th;if(pt){t.x=pt.x;t.z=pt.z;t.th=pt.th;}}};}});});
  trailers.forEach(t=>{if(t===tw||t.hitch||!near(t.x,t.z,5))return;
    B.push({kind:'tr',o:t,fr:1,mass:trailerMass(t),circles:()=>trCircles(t,t.x,t.z,t.th),
      after:(p,i,c)=>{const q=rigidPose(t,halfLen(t.spec.cols),p,c[0],c[1]);return {circles:trCircles(t,q.x,q.z,q.th),apply:()=>{t.x=q.x;t.z=q.z;t.th=q.th;}};}});});
  pieces.forEach(pc=>{if(!near(pc.cx,pc.cz,pc.len/2))return;
    B.push({kind:'pc',o:pc,fr:1.2,mass:logMass(pc),log:true,circles:()=>logCircles(pc,pc.cx,pc.cz,pc.rot),
      after:(p,i,c)=>{const q=rigidPose({x:pc.cx,z:pc.cz,th:pc.rot},pc.len/2,p,c[0],c[1]);
        return {circles:logCircles(pc,q.x,q.z,q.th),apply:()=>{pc.cx=q.x;pc.cz=q.z;pc.rot=q.th;placePiece(pc);}};}});});
  ROCKS.forEach(r=>{if(!near(r.x,r.z,1))return;
    B.push({kind:'rk',o:r,fr:1.6,mass:rockMass(r),circles:()=>[[r.x,r.z,0.85*r.s]],
      after:p=>{const x=r.x+p.x,z=r.z+p.z;return {circles:[[x,z,0.85*r.s]],apply:()=>moveRock(r,x,z)};}});});
  B.forEach(b=>{const c=b.circles();let x=0,z=0;c.forEach(q=>{x+=q[0];z+=q[1];});x/=c.length;z/=c.length;
    b.cx=x;b.cz=z;b.ext=Math.max(...c.map(q=>Math.hypot(q[0]-x,q[1]-z)+q[2]));b.cur=c;});
  return B;
}
// Combien la nouvelle pose s'enfonce de plus qu'avant dans un corps (les chevauchements déjà là ne comptent pas)
function deeper(oldC,newC,b){
  let x=0,z=0;newC.forEach(q=>{x+=q[0];z+=q[1];});x/=newC.length;z/=newC.length;
  const ext=Math.max(...newC.map(q=>Math.hypot(q[0]-x,q[1]-z)+q[2]));
  if(Math.hypot(x-b.cx,z-b.cz)>ext+b.ext)return null;
  let best=null;
  b.cur.forEach((o,i)=>{for(let k=0;k<newC.length;k++){const c=newC[k],dx=o[0]-c[0],dz=o[1]-c[1],d=Math.hypot(dx,dz),pen=c[2]+o[2]-d;if(pen<=0.002)continue;
    const oc=oldC[k],before=oc?(oc[2]+o[2]-Math.hypot(o[0]-oc[0],o[1]-oc[1])):-1,inc=pen-Math.max(0,before);
    if(inc>0.002&&(!best||inc>best.inc)){const n=d>1e-4?[dx/d,dz/d]:[1,0];best={inc,i,o,x:n[0]*inc,z:n[1]*inc};}}});
  return best;
}
/* Pousse le corps b de p (touché au cercle i, centre c). Pousse ensuite en chaîne ce qu'il touche.
   Retourne la liste des déplacements et la masse « résistante » totale, ou null si bloqué. */
function pushChain(b,p,i,c,B,seen,depth,cap){
  if(b.locked||depth>5)return null;
  const a=b.after(p,i,c);
  if(staticHit(b.log?a.circles.map(q=>[q[0],q[1],Math.max(0.05,q[2]*0.7)]):a.circles))return null;
  seen.add(b);
  let moves=[a.apply],load=b.mass*b.fr;
  for(const o of B){if(seen.has(o)||(b.log&&o.log&&!sameLevel(b.o,o.o)))continue;const hit=deeper(b.cur,a.circles,o);if(!hit)continue;
    const r=pushChain(o,hit,hit.i,hit.o,B,seen,depth+1,cap);if(!r)return null;
    moves=moves.concat(r.moves);load+=r.load;if(load>cap)return null;}
  return {moves,load};
}
/* Essaie de déplacer le pousseur vers ses nouveaux cercles `mine` (anciens : `old`).
   Retourne null si bloqué, sinon le ralentissement à appliquer (0 = rien touché). */
function tryPush(v,tw,mine,old){
  if(staticHit(mine))return null;
  const mV=vehMass(v)+(tw?trailerMass(tw):0),B=buildBodies(v,tw),seen=new Set(),cap=7*mV;
  let moves=[],load=0;
  for(const b of B){if(seen.has(b))continue;const hit=deeper(old,mine,b);if(!hit)continue;
    const r=pushChain(b,hit,hit.i,hit.o,B,seen,0,cap);if(!r)return null;
    moves=moves.concat(r.moves);load+=r.load;if(load>cap)return null;}
  moves.forEach(f=>f());
  return load?Math.min(0.97,load/(mV+load)):0;
}
