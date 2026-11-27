/* Poussée : un véhicule qui rentre dans un autre véhicule, une remorque ou un billot au sol le pousse.
   Plus l'objet est lourd par rapport au pousseur, plus le pousseur ralentit; trop lourd (> 7×), il bloque.
   Seul le joueur qui conduit calcule la poussée; les positions passent ensuite par la synchro habituelle. */
const MASS_V={vtt:350,pickup:2200,skid:9000,abat:14000,chaloupe:120};
const MASS_T={small:250,loader:1600,dechiq:900,fendeuse:450,chaloupe:300};
const WOOD_KG=650;   // kg par m³ de bois vert (moyenne)
function logMass(c){const r=((c.ra||0.1)+(c.rb||0.1))/2;return Math.PI*r*r*(c.len||1)*WOOD_KG*(c.crown?0.35:1);}
function trailerMass(t){let m=MASS_T[t.kind]||500;(t.c&&t.c.load||[]).forEach(l=>m+=logMass(l));if(t.boat)m+=120;return m;}
function vehMass(v){let m=MASS_V[v.type]||1500;if(v.bed)v.bed.load.forEach(l=>m+=logMass(l));return m;}
function pieceRadius(pc,s){return pc.ra+(pc.rb-pc.ra)*clamp(s/pc.len+0.5,0,1);}
// Obstacles fixes (arbres, bâtiments, roches, eau profonde, terres non achetées)
function staticHit(list){for(const c of list){if(waterDepth(c[0],c[1])>0.35||landBlocked(c[0],c[1])||hits(c[0],c[1],c[2]))return true;}return false;}
function overlapAny(list,others){for(const c of list)for(const o of others){const dx=c[0]-o[0],dz=c[1]-o[1],rr=c[2]+o[2];if(dx*dx+dz*dz<rr*rr)return true;}return false;}
// Pénétration maximale entre mes cercles et un groupe de cercles : vecteur pour sortir le groupe
function deepest(mine,theirs){let best=null;
  for(const c of mine)for(const o of theirs){const dx=o[0]-c[0],dz=o[1]-c[1],d=Math.hypot(dx,dz),pen=c[2]+o[2]-d;
    if(pen>0&&(!best||pen>best.pen)){const n=d>1e-4?[dx/d,dz/d]:[1,0];best={pen,x:n[0]*pen,z:n[1]*pen,o};}}
  return best;}
// Nouvelle position d'un corps poussé à l'endroit (ox,oz) : poussé loin du centre, il pivote plus qu'il ne glisse
function pushPose(b,p,ox,oz){
  const cols=b.spec.cols,h=Math.max(...cols.map(c=>Math.abs(c[0])+c[1]*0.6));
  const ax=Math.sin(b.th),az=Math.cos(b.th),ux=Math.cos(b.th),uz=-Math.sin(b.th);
  const s=(ox-b.x)*ax+(oz-b.z)*az,pp=p.x*ux+p.z*uz,pa=p.x*ax+p.z*az;
  const k=Math.abs(s)>0.05?0.85*Math.pow(Math.min(1,Math.abs(s)/h),2):0,dr=k?pp*k/s:0;
  return {x:b.x+ax*pa+ux*pp*(1-k),z:b.z+az*pa+uz*pp*(1-k),th:b.th+dr};
}
// Groupes poussables : véhicule (+ sa remorque attelée) ou remorque libre
function pushGroups(v,tw){
  const G=[];
  vehicles.forEach(o=>{if(o===v||o.spec.boat)return;const t=towed(o);G.push({veh:o,tr:t,locked:!!o.driver||o.net,mass:vehMass(o)+(t?trailerMass(t):0)});});
  trailers.forEach(t=>{if(t===tw||t.hitch)return;G.push({veh:null,tr:t,locked:false,mass:trailerMass(t)});});
  return G;}
function groupCircles(g,dx,dz){const a=[];if(g.veh)a.push(...vehCircles(g.veh,g.veh.x+dx,g.veh.z+dz,g.veh.th));if(g.tr)a.push(...trCircles(g.tr,g.tr.x+dx,g.tr.z+dz,g.tr.th));return a;}
/* Essaie de déplacer le pousseur vers ses nouveaux cercles `mine`.
   Retourne null si bloqué, sinon le ralentissement à appliquer (0 = rien touché). */
function tryPush(v,tw,mine){
  if(staticHit(mine))return null;
  const mV=vehMass(v)+(tw?trailerMass(tw):0),moves=[];let slow=0;
  // Véhicules et remorques
  for(const g of pushGroups(v,tw)){
    const cur=groupCircles(g,0,0),p=deepest(mine,cur);if(!p)continue;
    if(g.locked||g.mass>7*mV)return null;
    // Pose du véhicule et de sa remorque après la poussée (pivot selon l'endroit touché)
    const nV=g.veh?g.veh.spec.cols.length:0,onVeh=g.veh&&cur.indexOf(p.o)<nV;
    let pv=null,pt=null;
    if(g.veh){pv=onVeh?pushPose(g.veh,p,p.o[0],p.o[1]):{x:g.veh.x+p.x,z:g.veh.z+p.z,th:g.veh.th};
      if(g.tr){if(onVeh){const hs=g.veh.spec.hitch||2;pt=trailerFollow(g.tr,pv.x-Math.sin(pv.th)*hs,pv.z-Math.cos(pv.th)*hs,pv.th);}else pt={x:g.tr.x+p.x,z:g.tr.z+p.z,th:g.tr.th};}}
    else pt=pushPose(g.tr,p,p.o[0],p.o[1]);
    const moved=[];if(pv)moved.push(...vehCircles(g.veh,pv.x,pv.z,pv.th));if(pt)moved.push(...trCircles(g.tr,pt.x,pt.z,pt.th));
    if(staticHit(moved))return null;
    const rest=bodyCircles(v).filter(c=>!cur.some(o=>o[0]===c[0]&&o[1]===c[1]));
    if(overlapAny(moved,rest))return null;
    moves.push(()=>{if(pv){g.veh.x=pv.x;g.veh.z=pv.z;g.veh.th=pv.th;}if(pt){g.tr.x=pt.x;g.tr.z=pt.z;g.tr.th=pt.th;}});
    slow=Math.max(slow,g.mass/(mV+g.mass));
  }
  // Billots, tiges et cimes au sol
  for(const pc of pieces){
    const ax=Math.sin(pc.rot),az=Math.cos(pc.rot),h=pc.len/2;let best=null;
    for(const c of mine){const dx=c[0]-pc.cx,dz=c[1]-pc.cz;if(Math.abs(dx)>h+3||Math.abs(dz)>h+3)continue;
      const s=clamp(dx*ax+dz*az,-h,h),qx=pc.cx+ax*s,qz=pc.cz+az*s,ex=qx-c[0],ez=qz-c[1],d=Math.hypot(ex,ez),pen=c[2]+pieceRadius(pc,s)-d;
      if(pen>0&&(!best||pen>best.pen)){const n=d>1e-4?[ex/d,ez/d]:[az,-ax];best={pen,s,x:n[0]*pen,z:n[1]*pen};}}
    if(!best)continue;
    const mO=logMass(pc);if(mO>7*mV)return null;
    // Poussé près d'un bout, le billot pivote; poussé au milieu, il glisse
    const ux=Math.cos(pc.rot),uz=-Math.sin(pc.rot),pp=best.x*ux+best.z*uz,pa=best.x*ax+best.z*az;
    const k=Math.abs(best.s)>0.05?0.8*Math.pow(Math.abs(best.s)/h,2):0;
    const drot=k?pp*k/best.s:0,mx=ax*pa+ux*pp*(1-k),mz=az*pa+uz*pp*(1-k);
    const ncx=pc.cx+mx,ncz=pc.cz+mz,nrot=pc.rot+drot,nax=Math.sin(nrot),naz=Math.cos(nrot);
    const pts=[-1,0,1].map(f=>[ncx+nax*h*f,ncz+naz*h*f,Math.max(0.05,pieceRadius(pc,h*f)*0.7)]);
    if(staticHit(pts))return null;
    moves.push(()=>{pc.cx=ncx;pc.cz=ncz;pc.rot=nrot;placePiece(pc);});
    slow=Math.max(slow,mO/(mV+mO));
  }
  moves.forEach(f=>f());
  return slow;
}
