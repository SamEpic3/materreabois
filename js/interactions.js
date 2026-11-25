/* Embarquer, débarquer, opérer la grue, boutons d'action */
function doEnter(){
  const c=context();if(!c.enter)return;
  if(c.wake){wakeUp();return;}
  if(S.mode==='pass'){leavePassenger();return;}
  if(c.enterPass){boardPassenger(c.enterPass);return;}
  if(c.exitCabin){exitCabin();return;}
  if(c.enterCabin){enterCabin();return;}
  if(S.mode==='crane'){S.mode='foot';updateToolVisual();return;}
  if(S.mode==='sit'){standUp();return;}
  if(S.mode==='place'){cancelPlace();return;}
  if(S.mode==='pick'){closePick();return;}
  if(S.mode==='foot'&&c.enterSeat){sitDown(c.enterSeat);return;}
  if(S.mode==='foot'){
    if(c.enterCrane){
      S.mode='crane';P.crTr=c.enterCrane;P.target=null;marker.visible=false;P.swing=0;
      const col=craneCol(P.crTr);P.rot=Math.atan2(col.x-P.x,col.z-P.z);player.g.rotation.y=P.rot;
      legPose(player,'stand');player.armL.rotation.set(0,0,0);player.armR.rotation.set(-0.6,0,0);
      updateToolVisual();return;
    }
    if(c.enterVeh.driver&&c.enterVeh.driver!==ME.id){toast(`${(NET.online[c.enterVeh.driver]||{}).name||'Ton partenaire'} conduit déjà`);return;}
    V=c.enterVeh;camVehOff=0;camPitch=-0.1;
    S.mode='vtt';P.target=null;marker.visible=false;
    V.mesh.g.add(player.g);player.g.position.set(...V.spec.seat);player.g.rotation.set(0,0,0);
    player.g.visible=!V.spec.hide&&camMode!=='fp';
    legPose(player,V.spec.ride?'ride':V.spec.boat?'sit':'drive');player.armL.rotation.x=player.armR.rotation.x=-1.05;P.swing=0;updateToolVisual();
  }else{
    const sx=Math.cos(V.th),sz=-Math.sin(V.th);
    let spot=null;
    const sd=V.spec.side,fr=V.spec.cols[0][0]+1.3;
    for(const side of [1,-1,0]){const x=side?V.x+sx*sd*side:V.x+Math.sin(V.th)*fr,z=side?V.z+sz*sd*side:V.z+Math.cos(V.th)*fr;if(!hits(x,z,0.35)&&(waterDepth(x,z)<0.4||onDock(x,z))){spot={x,z};break;}}
    if(!spot){toast(V.spec.boat?'Approche-toi du bord ou du quai pour débarquer':"Pas de place pour débarquer ici");return;}
    S.mode='foot';
    scene.add(player.g);player.g.visible=camMode!=='fp';P.x=spot.x;P.z=spot.z;P.rot=V.th;
    legPose(player,'stand');player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);updateToolVisual();
  }
}
function doAct(){const c=context();if(c.full)toast('C\'est plein !');if(c.act)c.act.fn();}
function doAct2(){const c=context();if(c.act2)c.act2.fn();}

/* ----- Passager du pick-up : quand quelqu'un conduit déjà, on monte à côté ----- */
function boardPassenger(v){
  S.mode='pass';P.ride=v;v.passenger=ME.id;P.target=null;marker.visible=false;P.swing=0;camVehOff=0;camPitch=-0.1;
  if(P.fishing)stopFishing(true);
  v.mesh.g.add(player.g);player.g.position.set(...v.spec.pass);player.g.rotation.set(0,0,0);
  player.g.visible=!v.spec.hide&&camMode!=='fp';
  legPose(player,v.spec.boat?'sit':'drive');player.armL.rotation.x=player.armR.rotation.x=-0.3;updateToolVisual();
  toast(`Tu es passager — ${(v.driver&&NET.online&&NET.online[v.driver]||{}).name||'ton partenaire'} conduit`);
}
function leavePassenger(){
  const v=P.ride;if(!v){S.mode='foot';return;}
  const sx=Math.cos(v.th),sz=-Math.sin(v.th),sd=v.spec.side;let spot=null;
  for(const side of [-1,1]){const x=v.x+sx*sd*side,z=v.z+sz*sd*side;if(!hits(x,z,0.35)&&(waterDepth(x,z)<0.4||onDock(x,z))){spot={x,z};break;}}
  if(!spot){const fr=v.spec.cols[0][0]+1.3,x=v.x+Math.sin(v.th)*fr,z=v.z+Math.cos(v.th)*fr;if(!hits(x,z,0.35)&&(waterDepth(x,z)<0.4||onDock(x,z)))spot={x,z};}
  if(!spot){toast(v.spec.boat?'Approche-toi du bord ou du quai pour débarquer':'Pas de place pour débarquer ici');return;}
  if(v.passenger===ME.id)v.passenger=null;
  S.mode='foot';P.ride=null;scene.add(player.g);player.g.visible=camMode!=='fp';P.x=spot.x;P.z=spot.z;P.rot=v.th;
  legPose(player,'stand');player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);updateToolVisual();
}
function updatePassenger(){
  const v=P.ride;
  if(!v||!vehicles.includes(v)){S.mode='foot';P.ride=null;scene.add(player.g);legPose(player,'stand');return;}
  v.passenger=ME.id;P.x=v.x;P.z=v.z;P.rot=v.th;
}
function passContext(){
  if(P.ride&&P.ride.spec.boat&&TOOL&&TOOL.kind==='rod'){const r=fishContext();return {enter:'Débarquer',act:r.act||null,act2:null,full:false,info:r.info||''};}
  const v=P.ride,d=v&&v.driver&&v.driver!==ME.id?((NET.online&&NET.online[v.driver]||{}).name||'Ton partenaire'):null;
  return {enter:'Débarquer',act:null,act2:null,full:false,info:d?`${d} conduit`:'Personne au volant : débarque et remonte côté conducteur pour conduire'};
}
