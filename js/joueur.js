/* Mise à jour du joueur à pied (déplacement, animations) */
/* ---------- Mise à jour : à pied ---------- */
const camRight=new T.Vector3(),camFwd=new T.Vector3();
// Saut (Espace à pied, quand il n'y a pas d'action à faire)
P.jumpY=0;P.jumpV=0;
function jump(){if(P.jumpY>0.001||P.swing>0)return;P.jumpV=P.carry?2.6:4.2;}
function updateJump(dt){if(P.jumpV===0&&P.jumpY===0)return;P.jumpV-=13*dt;P.jumpY+=P.jumpV*dt;if(P.jumpY<=0){P.jumpY=0;P.jumpV=0;}}
function updateFoot(dt){
  updateJump(dt);
  const inp=readInput(true);
  let dx=0,dz=0;
  if(Math.abs(inp.x)+Math.abs(inp.y)>0.08){
    P.target=null;marker.visible=false;
    dx=camRight.x*inp.x+camFwd.x*inp.y;dz=camRight.z*inp.x+camFwd.z*inp.y;
  }else if(P.target){
    const tx=P.target.x-P.x,tz=P.target.z-P.z,d=Math.hypot(tx,tz);
    if(d<0.25){P.target=null;}else{dx=tx/d;dz=tz/d;}
  }
  if(P.swing>0){dx=dz=0;}
  const amt=Math.min(1,Math.hypot(dx,dz));
  const run=(keys.ShiftLeft||keys.ShiftRight||(joy.active&&Math.hypot(joy.x,joy.y)>0.95))&&!P.carry;
  const carrySpeed=P.carry?clamp(4.2-2.5*Math.pow(P.carry.len/CARRY_MAX,1.2),1.6,4.0):0;
  const speed=(P.carry?carrySpeed:run?6.5:4.2)*(1-0.4*mudAt(P.x,P.z))*(P.pail?1-0.35*P.pail.L/PAIL_CAP:1);
  if(amt>0.01){
    const p={x:P.x+dx*speed*dt,z:P.z+dz*speed*dt};
    if(S.inside)insideMove(p);
    else{pushOut(p,0.35);
    bodyCircles(null).forEach(c=>pushCircle(p,0.35,c[0],c[1],c[2]));}
    clampW(p,1.5);
    if(!S.inside&&(waterDepth(p.x,p.z)>0.45&&!onDock(p.x,p.z)||landBlocked(p.x,p.z))){p.x=P.x;p.z=P.z;}   // trop creux : on ne marche pas dans le lac
    const moved=Math.hypot(p.x-P.x,p.z-P.z);
    if(P.target&&moved<speed*dt*0.15){P.target=null;marker.visible=false;}
    P.x=p.x;P.z=p.z;
    P.rot+=wrapAng(Math.atan2(dx,dz)-P.rot)*Math.min(1,dt*12);
    P.phase+=dt*speed*2.2;
  }
  const sw=amt>0.01?Math.sin(P.phase)*0.7:0;
  player.legL.rotation.x=lerp(player.legL.rotation.x,sw,0.3);player.legR.rotation.x=lerp(player.legR.rotation.x,-sw,0.3);
  if(P.cool>0)P.cool=Math.max(0,P.cool-dt);
  if(P.swing>0){
    P.swing+=dt;const a=P.swing;
    const u=a/P.swingDur*0.75;
    let r;
    if(TOOL.kind==='axe')r=u<0.3?lerp(0,-2.7,u/0.3):u<0.42?lerp(-2.7,-0.7,(u-0.3)/0.12):lerp(-0.7,0,Math.min(1,(u-0.42)/0.33));
    else if(TOOL.kind==='saw')r=-1.25+Math.sin(u*26)*0.3;
    else if(TOOL.kind==='shovel')r=u<0.42?lerp(-0.4,-1.5,u/0.42):lerp(-1.5,-0.4,Math.min(1,(u-0.42)/0.33));
    else r=-1.15+Math.sin(u*90)*0.05;
    player.armR.rotation.x=r;player.armL.rotation.x=r;
    if(u>=0.42&&!P.struck){P.struck=true;sfxStrike(TOOL.kind,P.x,P.z);if(P.onStrike)P.onStrike();}
    if(u>=0.75)P.swing=0;
  }else if(P.carry){
    player.armR.rotation.x=lerp(player.armR.rotation.x,-2.75,0.3);player.armL.rotation.x=lerp(player.armL.rotation.x,-sw*0.5,0.3);
  }else{
    player.armL.rotation.x=lerp(player.armL.rotation.x,-sw*0.8,0.3);player.armR.rotation.x=lerp(player.armR.rotation.x,sw*0.8,0.3);
  }
  player.g.position.set(P.x,walkH(P.x,P.z)+(S.inside?FLOOR_Y:0)+P.jumpY+(amt>0.01&&P.jumpY===0?Math.abs(Math.cos(P.phase))*0.05:0),P.z);
  if(P.jumpY>0){player.legL.rotation.x=-0.5;player.legR.rotation.x=0.3;}
  player.g.rotation.y=P.rot;
  if(marker.visible){marker.material.opacity=0.5+0.3*Math.sin(S.time*6);}
}
