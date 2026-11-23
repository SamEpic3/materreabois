/* Embarquer, débarquer, opérer la grue, boutons d'action */
function doEnter(){
  const c=context();if(!c.enter)return;
  if(S.mode==='crane'){S.mode='foot';updateToolVisual();return;}
  if(S.mode==='sit'){standUp();return;}
  if(S.mode==='place'){cancelPlace();return;}
  if(S.mode==='pick'){closePick();return;}
  if(S.mode==='foot'&&c.enterSeat){sitDown(c.enterSeat);return;}
  if(S.mode==='foot'){
    if(c.enterCrane){
      S.mode='crane';P.crTr=c.enterCrane;P.target=null;marker.visible=false;P.swing=0;
      const col=craneCol(P.crTr);P.rot=Math.atan2(col.x-P.x,col.z-P.z);player.g.rotation.y=P.rot;
      player.legL.rotation.set(0,0,0);player.legR.rotation.set(0,0,0);player.armL.rotation.set(0,0,0);player.armR.rotation.set(-0.6,0,0);
      updateToolVisual();return;
    }
    if(c.enterVeh.driver&&c.enterVeh.driver!==ME.id){toast(`${(NET.online[c.enterVeh.driver]||{}).name||'Ton partenaire'} conduit déjà`);return;}
    V=c.enterVeh;
    S.mode='vtt';P.target=null;marker.visible=false;
    V.mesh.g.add(player.g);player.g.position.set(...V.spec.seat);player.g.rotation.set(0,0,0);
    player.g.visible=!V.spec.hide&&camMode!=='fp';
    player.legL.rotation.x=player.legR.rotation.x=-1.35;player.armL.rotation.x=player.armR.rotation.x=-1.05;
    player.legL.rotation.z=0.12;player.legR.rotation.z=-0.12;P.swing=0;updateToolVisual();
  }else{
    const sx=Math.cos(V.th),sz=-Math.sin(V.th);
    let spot=null;
    const sd=V.spec.side,fr=V.spec.cols[0][0]+1.3;
    for(const side of [1,-1,0]){const x=side?V.x+sx*sd*side:V.x+Math.sin(V.th)*fr,z=side?V.z+sz*sd*side:V.z+Math.cos(V.th)*fr;if(!hits(x,z,0.35)){spot={x,z};break;}}
    if(!spot){toast("Pas de place pour débarquer ici");return;}
    S.mode='foot';
    scene.add(player.g);player.g.visible=camMode!=='fp';P.x=spot.x;P.z=spot.z;P.rot=V.th;
    player.legL.rotation.set(0,0,0);player.legR.rotation.set(0,0,0);player.armL.rotation.set(0,0,0);player.armR.rotation.set(0,0,0);updateToolVisual();
  }
}
function doAct(){const c=context();if(c.full)toast('C\'est plein !');if(c.act)c.act.fn();}
function doAct2(){const c=context();if(c.act2)c.act2.fn();}
