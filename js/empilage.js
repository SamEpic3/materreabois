/* Billots qui s'empilent : un billot déposé tombe de l'épaule et se pose sur le sol ou sur les billots en dessous.
   pc.lift : hauteur du dessous du billot au-dessus du sol (0 = par terre). pc.fy : chute en cours (s'ajoute à lift).
   Quand on pousse, deux billots se touchent seulement s'ils sont à la même hauteur. */
const SHOULDER_Y=1.72;
// Hauteur d'appui d'un billot posé en (cx,cz,rot) : le dessus des billots qu'il chevauche, plus bas que `below`
function supportLift(pc,cx,cz,rot,below){
  const mine=logCircles(pc,cx,cz,rot);let best=0;
  for(const o of pieces){if(o===pc||o.mesh===undefined)continue;
    const ol=o.lift||0;if(ol>=below)continue;
    if(Math.hypot(o.cx-cx,o.cz-cz)>(o.len+pc.len)/2+0.6)continue;
    const oc=logCircles(o,o.cx,o.cz,o.rot);
    for(const a of mine)for(const b of oc){const rr=(a[2]+b[2])*0.8;if((a[0]-b[0])**2+(a[1]-b[1])**2<rr*rr){const top=ol+2*b[2];if(top<=below+0.001&&top>best)best=top;}}
  }
  return best;
}
// Le billot doit-il toucher l'autre quand on pousse ? (seulement s'ils sont à peu près au même niveau)
function sameLevel(a,b){const ra=(a.ra+a.rb)/2,rbb=(b.ra+b.rb)/2;return Math.abs(((a.lift||0)+ra)-((b.lift||0)+rbb))<(ra+rbb)*0.8;}

// Position : le sol (pente le long du billot), plus la hauteur d'appui et la chute en cours
placePiece=function(pc){
  const fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),h=pc.len/2,up=(pc.lift||0)+(pc.fy||0);
  const h0=H(pc.cx-fx*h,pc.cz-fz*h)+pc.ra,h1=H(pc.cx+fx*h,pc.cz+fz*h)+pc.rb;
  pc.mesh.rotation.order='YXZ';pc.mesh.rotation.set(-Math.asin(clamp((h1-h0)/pc.len,-0.9,0.9)),pc.rot,0);
  pc.mesh.position.set(pc.cx,(h0+h1)/2+up,pc.cz);pc.mesh.updateMatrixWorld();
};
// Un billot ajouté sans hauteur connue (grue, débusqueuse, fendeuse…) se pose sur ce qu'il y a dessous
{const _ap=addPiece;addPiece=function(pc){if(pc.lift===undefined)pc.lift=supportLift(pc,pc.cx,pc.cz,pc.rot,99);return _ap(pc);};}
// Couper un billot : les morceaux restent à la même hauteur
{const _sp=splitPiece;splitPiece=function(pc,d){const L=pc.lift||0,n0=pieces.length;_sp(pc,d);for(let i=n0-1;i<pieces.length;i++)if(pieces[i]){pieces[i].lift=L;placePiece(pieces[i]);}};}

// Déposer : chaque morceau part de l'épaule et tombe
const dropping=[];
dropLog=function(){
  const r=P.rot+Math.PI/2,sy=H(P.x,P.z)+(P.jumpY||0)+SHOULDER_Y;
  halvesOf(P.carry).forEach((c,i)=>{const d=0.9+i*0.4,cx=P.x+Math.sin(P.rot)*d,cz=P.z+Math.cos(P.rot)*d;
    const pc={cx,cz,rot:r,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,split:c.split,hu:c.hu,crown:false};
    pc.lift=supportLift(pc,cx,cz,r,99);
    const rest=H(cx,cz)+pc.lift+(c.ra+c.rb)/2;pc.fy=Math.max(0,sy-rest);pc.vy=0;
    addPiece(pc);if(pc.fy>0)dropping.push(pc);});
  setCarry(null);
};
function updateDropping(dt){
  for(let i=dropping.length-1;i>=0;i--){const pc=dropping[i];
    if(!pieces.includes(pc)){dropping.splice(i,1);continue;}
    pc.vy+=9.8*dt;pc.fy-=pc.vy*dt;
    if(pc.fy<=0){pc.fy=0;dropping.splice(i,1);sfxKnock(pc.cx,pc.cz,0.8);}
    placePiece(pc);}
}
// Un billot dont l'appui est parti (poussé, ramassé, vendu) retombe
let settleT=0;
function settlePieces(dt){
  settleT+=dt;if(settleT<0.2)return;settleT=0;
  for(const pc of pieces){if(!(pc.lift>0.01)||dropping.includes(pc))continue;
    const s=supportLift(pc,pc.cx,pc.cz,pc.rot,pc.lift+0.02);
    if(s<pc.lift-0.02){pc.fy=(pc.fy||0)+pc.lift-s;pc.lift=s;pc.vy=0;dropping.push(pc);}
  }
}
{const _uf=updateFalling;updateFalling=function(dt){_uf(dt);updateDropping(dt);settlePieces(dt);};}

/* Après une poussée : on sépare les billots qui se chevauchent encore (entre eux et avec le véhicule).
   Le pivot d'un billot poussé près du bout le fait parfois reculer un peu moins que demandé : sans ça, ils finissent par passer l'un dans l'autre. */
function deepest(A,B){let best=null;for(const a of A)for(const b of B){const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz),pen=a[2]+b[2]-d;
  if(pen>0.004&&(!best||pen>best.pen))best={pen,nx:d>1e-4?dx/d:1,nz:d>1e-4?dz/d:0};}return best;}
function nudge(pc,dx,dz){const c=logCircles(pc,pc.cx+dx,pc.cz+dz,pc.rot).map(q=>[q[0],q[1],Math.max(0.05,q[2]*0.7)]);if(staticHit(c))return false;pc.cx+=dx;pc.cz+=dz;return true;}
function separateLogs(v,mine){
  const near=pieces.filter(p=>Math.abs(p.cx-v.x)<10+p.len/2&&Math.abs(p.cz-v.z)<10+p.len/2&&!dropping.includes(p));if(!near.length)return;
  const moved=new Set();
  for(let it=0;it<4;it++){let any=false;
    const C=new Map(near.map(p=>[p,logCircles(p,p.cx,p.cz,p.rot)]));
    for(const p of near){if((p.lift||0)>0.9)continue;const h=deepest(mine,C.get(p));if(h&&nudge(p,h.nx*h.pen,h.nz*h.pen)){moved.add(p);any=true;C.set(p,logCircles(p,p.cx,p.cz,p.rot));}}
    for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){const p=near[i],q=near[j];if(!sameLevel(p,q))continue;
      if(Math.hypot(p.cx-q.cx,p.cz-q.cz)>(p.len+q.len)/2+0.5)continue;
      const h=deepest(C.get(p),C.get(q));if(!h)continue;
      // le plus loin du véhicule s'écarte (il est poussé), sinon les deux à moitié
      const dp=Math.hypot(p.cx-v.x,p.cz-v.z),dq=Math.hypot(q.cx-v.x,q.cz-v.z),fq=dq>dp+0.3?1:dp>dq+0.3?0:0.5;
      if(fq>0&&nudge(q,h.nx*h.pen*fq,h.nz*h.pen*fq)){moved.add(q);C.set(q,logCircles(q,q.cx,q.cz,q.rot));any=true;}
      if(fq<1&&nudge(p,-h.nx*h.pen*(1-fq),-h.nz*h.pen*(1-fq))){moved.add(p);C.set(p,logCircles(p,p.cx,p.cz,p.rot));any=true;}}
    if(!any)break;}
  moved.forEach(placePiece);
}
{const _tp=tryPush;tryPush=function(v,tw,mine,old){const r=_tp(v,tw,mine,old);if(r)separateLogs(v,mine);return r;};}
