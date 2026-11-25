/* Actions à pied : bûcher, tronçonner au ruban, porter, charger, vendre, atteler */
/* ---------- Actions ---------- */
const TRAILER_SLOTS=[[-0.44,0.22],[0,0.22],[0.44,0.22],[-0.22,0.6],[0.22,0.6],[0,0.98]];
const pieces=[],falling=[],chips=[];
const FT=0.3048,INCH=0.0254,CARRY_MAX=8*FT+2*INCH,SAW_MIN=7*FT+10*INCH,CRANE_MAX=12*FT+2*INCH;
function ftin(m){const t=Math.round(m/INCH);return `${Math.floor(t/12)} pi ${t%12} po`;}
function priceOf(c){return c.len>=SAW_MIN?Math.round(SPECIES[c.sp].p*mkt(c.sp)*c.len/(8*FT)):Math.max(1,Math.round(c.len/FT*FIREWOOD_FT*mkt('chauffage')*splitFactor(c)));}
function kindOf(len){return len>CRANE_MAX?'trop long : recoupe ou débusqueuse':len>CARRY_MAX?'billot long (grue) ✔':len>=SAW_MIN?'billot de sciage ✔':'bois de chauffage';}
function pointInYard(x,z){return Math.hypot(x-YARD.x,z-YARD.z)<YARD.r;}
function inYard(){return pointInYard(P.x,P.z);}
function pieceGeo(len,ra,rb){const g=new T.CylinderGeometry(rb,ra,len,11);g.rotateX(Math.PI/2);return g;}
function makePieceMesh(c){const m=c.split?new T.Mesh(splitGeo(c.len,c.ra,c.rb,c.split),SPLIT_MATS):new T.Mesh(pieceGeo(c.len,c.ra,c.rb),logMatsFor(c.sp));m.castShadow=true;m.receiveShadow=true;return m;}
function placePiece(pc){
  const fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),h=pc.len/2;
  const h0=H(pc.cx-fx*h,pc.cz-fz*h)+pc.ra,h1=H(pc.cx+fx*h,pc.cz+fz*h)+pc.rb;
  pc.mesh.rotation.order='YXZ';pc.mesh.rotation.set(-Math.asin(clamp((h1-h0)/pc.len,-0.9,0.9)),pc.rot,0);
  pc.mesh.position.set(pc.cx,(h0+h1)/2,pc.cz);pc.mesh.updateMatrixWorld();
}
function addPiece(pc){pc.id=pc.id||uid();pc.mesh=makePieceMesh(pc);placePiece(pc);scene.add(pc.mesh);pieces.push(pc);return pc;}
function removePiece(pc){scene.remove(pc.mesh);pc.mesh.geometry.dispose();pieces.splice(pieces.indexOf(pc),1);}
function pieceButt(pc){return {x:pc.cx-Math.sin(pc.rot)*pc.len/2,z:pc.cz-Math.cos(pc.rot)*pc.len/2};}
function projOn(pc){
  const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot);
  const d=(P.x-b.x)*fx+(P.z-b.z)*fz,dc=clamp(d,0,pc.len);
  return {d,dist:Math.hypot(P.x-(b.x+fx*dc),P.z-(b.z+fz*dc))};
}
function nearestPiece(){let best=null,bd=1.0,bp=null;for(const pc of pieces){const pr=projOn(pc);if(pr.dist<bd){bd=pr.dist;best=pc;bp=pr;}}return best?{pc:best,d:bp.d}:null;}
function carryable(pc){return !pc.crown&&pc.len<=CARRY_MAX;}
function cutRange(pc){return [0.3,pc.len-(pc.crown?1.0:0.3)];}
function nearestTree(maxD){
  let best=null,bd=maxD;
  eachNear(P.x,P.z,c=>{if(c.tree&&c.tree.alive){const d=Math.hypot(P.x-c.x,P.z-c.z)-c.r;if(d<bd){bd=d;best=c.tree;}}return false;});
  return best;
}
function cutLocked(){return !!(TOOL&&TOOL.cut)&&P.cut&&pieces.includes(P.cut.pc)&&Math.hypot(P.x-P.cut.x,P.z-P.cut.z)<1.8;}
function context(){
  if(S.mode==='sleep')return sleepContext();
  if(S.mode==='foot'&&S.inside)return insideContext();
  if(S.mode==='vtt')return driveContext();
  if(S.mode==='pass')return passContext();
  if(S.mode==='crane')return craneContext();
  if(S.mode==='sit')return sitContext();
  if(S.mode==='place')return placeContext();
  if(S.mode==='pick')return pickContext();
  let act=null,act2=null,full=false,preview=null,info='',plant=null;
  const cont=nearestContainer();
  const extra=(!P.carry&&!P.pail)?footExtras():null;
  if(P.pail){const r=pailContext();act=r.act;act2=r.act2;info=r.info||'';}
  else if(!P.carry&&nearestDrop()){const dr=nearestDrop();act={label:`Ramasser : ${itemLabel(dr.it)}`,fn:()=>pickUpDrop(dr)};}
  else if(!P.carry&&Math.hypot(P.x-STORE_DOOR.x,P.z-STORE_DOOR.z)<3)act={label:'Entrer au magasin',fn:openShop};
  else if(!P.carry&&TOOL&&TOOL.kind==='rod'&&(P.fishing||castTarget()||!extra)){const r=fishContext();act=r.act||null;info=r.info||'';}
  else if(extra){act=extra.act||null;act2=extra.act2||null;info=extra.info||'';}
  else if(P.carry&&carryExtras()){const r=carryExtras();act=r.act||null;info=r.info||'';}
  else if(P.carry){
    if(inYard())act={label:`Corder à la cour (+${priceOf(P.carry)} $)`,fn:sellLog};
    else if(cont&&cont.pails.length)info=`La ${cont.name} contient des seaux : sors-les avant d'y mettre du bois`;
    else if(cont&&cont.load.length<cont.cap)act={label:`Mettre dans la ${cont.name} (${cont.load.length}/${cont.cap})`,fn:()=>putIn(cont)};
    else{act={label:'Déposer le billot',fn:dropLog};full=!!cont;}
  }else if(TOOL&&TOOL.kind==='shovel'&&nearestStump(1.4)){
    const st=nearestStump(1.4),tot=stumpHits(st);
    act={label:`Creuser autour de la souche (${Math.round(st.work*tot)}/${tot})`,fn:()=>dig(st),cool:true};
  }else if(cutLocked()){
    const k=P.cut;preview={pc:k.pc,d:k.d,locked:true};
    act={label:`Tronçonner (${Math.round(k.work*TOOL.cut)}/${TOOL.cut}) à ${ftin(k.d)}`,fn:cutStroke,cool:true};
    info=`Coupe à ${ftin(k.d)} : ${kindOf(k.d)}`;
  }else{
    const np=nearestPiece();
    if(np){
      const pc=np.pc,[a,b]=cutRange(pc),canCut=b>a&&!pc.split,d=clamp(np.d,a,b);
      if(canCut)preview={pc,d,locked:false};
      const cutAct=canCut&&TOOL&&TOOL.cut?{label:`Couper ici : ${ftin(d)}`,fn:()=>startCut(pc,d),cool:true}:null;
      if(carryable(pc)){act={label:`Prendre (${ftin(pc.len)}, ${pc.split?'bois fendu':pc.len>=SAW_MIN?'sciage':'chauffage'})`,fn:()=>pickUp(pc)};act2=cutAct;}
      else act=cutAct;
      const noTool=canCut&&!(TOOL&&TOOL.cut)?' · choisis un outil de coupe pour tronçonner':'';
      if(pc.split)info=`Bois fendu de ${ftin(pc.len)}`;
      else if(carryable(pc))info=`Billot de ${ftin(pc.len)} (${pc.len>=SAW_MIN?'sciage':'bois de chauffage'})`+(canCut?` · recouper ici : ${ftin(d)}`:'');
      else if(canCut)info=`Ruban : ${ftin(d)} → ${kindOf(d)}`+(pc.crown?'':` · reste ${ftin(pc.len-d)}`);
      else if(pc.crown)info='La cime : rien à ramasser ici';
      if(!pc.crown&&pc.len>CARRY_MAX&&!canCut)info='Trop long pour l\'épaule : grue ou débusqueuse';
      if(!carryable(pc)&&noTool)info+=noTool;
    }
    else if(cont&&cont.pails.length){const pp=cont.pails[cont.pails.length-1];act={label:`Prendre un seau (${pailTxt(pp)}) dans la ${cont.name}`,fn:()=>takePailFrom(cont)};}
    else if(cont&&cont.load.length){const top=cont.load[cont.load.length-1].userData.c;if(top.len<=CARRY_MAX)act={label:`Prendre un billot (${cont.name})`,fn:()=>takeFrom(cont)};else info=`Billot de ${ftin(top.len)} : trop long pour l'épaule, utilise la grue`;}
    else if(TOOL&&TOOL.kind==='plant'){plant=plantContext();act=plant.act;act2=plant.act2;info=plant.info;}
    else{const t=nearestTree(1.3);if(t){const r=treeContext(t);act=r.act||null;act2=r.act2||null;info=r.info||'';}}
  }
  if(!act&&!info){const sb=nearestSugar();if(sb)info=boilInfo(sb);}
  if(!act&&!info&&!P.carry&&!P.pail&&nearestStump(1.2))info='Souche : prends une pelle pour l\'arracher';
  let enter=null,enterVeh=null,enterCrane=null;
  let enterSeat=null,enterCabin=false,enterPass=null;
  if(!P.carry&&!P.pail&&nearDoor()){enter='Entrer dans la cabane';enterCabin=true;}
  else if(!P.carry){
    const nv=nearestVehicle(),nc=P.pail?null:nearestCrane(),ns=P.pail?null:nearestSeat();
    const dv=nv?Math.hypot(P.x-nv.x,P.z-nv.z):1e9;
    if(ns&&ns.d<dv&&(!nc||ns.d<nc.d)){enter='S\'asseoir';enterSeat=ns.seat;}
    else if(nc&&nc.d<dv){enter='Opérer la grue';enterCrane=nc.t;}
    else if(nv){
      const other=nv.driver&&nv.driver!==ME.id;
      if(other&&nv.spec.pass&&!nv.passenger){enter=`Embarquer (passager)`;enterPass=nv;}
      else{enter=`Embarquer (${nv.spec.name})`;enterVeh=nv;}
    }
  }
  return {enter,enterVeh,enterCrane,enterSeat,enterCabin,enterPass,act,act2,full,preview,info,plant};
}
function setCarry(c){
  if(c&&!P.carry)sfxKnock(P.x,P.z,0.6);
  P.carry=c;player.carryLog.visible=!!c;updateToolVisual();
  if(c){const cl=player.carryLog;if(c.split){cl.geometry=splitGeo(c.len,c.ra,c.rb,c.split);cl.material=SPLIT_MATS;}else{cl.geometry=pieceGeo(c.len,c.ra,c.rb);cl.material=logMatsFor(c.sp);}}
}
function pickUp(pc){removePiece(pc);const c={sp:pc.sp,len:pc.len,ra:pc.ra,rb:pc.rb};if(pc.split)c.split=pc.split;setCarry(c);P.target=null;}
function nearestVehicle(){let b=null,bd=1e9;for(const v of vehicles){const d=Math.hypot(P.x-v.x,P.z-v.z);if(d<v.spec.enterR&&d<bd){bd=d;b=v;}}return b;}
function takeFrom(c){const m=c.load.pop();c.cargo.remove(m);setCarry(m.userData.c);}
function putIn(cont){
  const hs=halvesOf(P.carry),left=[];
  hs.forEach(c=>{const i=cont.load.length;if(i>=cont.cap){left.push(c);return;}
    const m=makePieceMesh(c),sl=(cont.slots||TRAILER_SLOTS)[i];m.position.set(sl[0],sl[1],0);m.userData.c=c;cont.cargo.add(m);cont.load.push(m);});
  setCarry(left[0]||null);sfxKnock(P.x,P.z);
  toast(`Dans la ${cont.name} (${cont.load.length}/${cont.cap})`);
}
function dropLog(){
  const r=P.rot+Math.PI/2;
  halvesOf(P.carry).forEach((c,i)=>{const d=0.9+i*0.4;addPiece({cx:P.x+Math.sin(P.rot)*d,cz:P.z+Math.cos(P.rot)*d,rot:r,len:c.len,ra:c.ra,rb:c.rb,sp:c.sp,split:c.split,crown:false});});
  setCarry(null);sfxKnock(P.x,P.z,0.8);
}
let yardCount=0;
function addYardLog(c,i){
  const stack=Math.floor(i/15)%4,j=i%15,layer=Math.floor(j/5),slot=j%5;
  if(!yardStackCols[stack]){const p=vpos(-12+stack*2.9-4.3,-3.6);yardStackCols[stack]=addCol(p.x,p.z,1.3);}
  const l=makePieceMesh(c);l.rotation.y=Math.PI/2;l.position.set(stack*2.9-4.3,0.22+layer*0.4,(slot-2)*0.46+(layer%2)*0.1);yardStack.add(l);
  if(yardStack.children.length>60)yardStack.remove(yardStack.children[0]);
}
function sellPiece(c){
  const pr=priceOf(c);
  addYardLog(c,yardCount++);
  S.money+=pr;S.delivered++;J.wood(c,pr);sfxCash();
  toast(c.len>=SAW_MIN?`+${pr} $ — billot de ${SPECIES[c.sp].n.toLowerCase()} (${ftin(c.len)})`:`+${pr} $ — bois de chauffage${c.split?' fendu':''} (${ftin(c.len)})`);
}
function sellLog(){const c=P.carry;setCarry(null);halvesOf(c).forEach(sellPiece);}
// Tout billot posé au sol qui touche la cour (en tout ou en partie) est vendu : débusqueuse, grue, déposé…
// Ce qui est dans une remorque, une boîte de pick-up ou agrippé par la débusqueuse ou la grue n'est pas au sol, donc pas vendu.
// En multijoueur, seul l'hôte vend (pour ne pas payer deux fois).
function pieceTouchesYard(pc){
  const b=pieceButt(pc),fx=Math.sin(pc.rot),fz=Math.cos(pc.rot);
  const d=clamp((YARD.x-b.x)*fx+(YARD.z-b.z)*fz,0,pc.len);
  return Math.hypot(YARD.x-(b.x+fx*d),YARD.z-(b.z+fz*d))<YARD.r+Math.max(pc.ra,pc.rb);
}
let yardTick=0;
function updateYardSales(dt){
  yardTick+=dt;if(yardTick<0.4)return;yardTick=0;
  if(!leadsWorld())return;
  pieces.slice().forEach(pc=>{
    if(!pieceTouchesYard(pc)){pc.yt=0;return;}
    pc.yt=(pc.yt||0)+1;if(pc.yt<2)return;          // on le laisse se poser un instant
    removePiece(pc);
    halvesOf({sp:pc.sp,len:pc.len,ra:pc.ra,rb:pc.rb,split:pc.split}).forEach(sellPiece);
  });
}
function swing(tx,tz,onStrike){
  if(P.cool>0||P.swing>0)return false;
  P.swing=0.0001;P.swingDur=Math.min(0.75,TOOL.delay*0.92);P.struck=false;P.onStrike=onStrike;P.cool=TOOL.delay;P.target=null;marker.visible=false;
  P.rot=Math.atan2(tx-P.x,tz-P.z);sfxSwing(TOOL.kind,P.x,P.z,P.swingDur);return true;
}
function chop(t){swing(t.x,t.z,()=>strikeTree(t));}
function cutPoint(pc,d){const b=pieceButt(pc);return {x:b.x+Math.sin(pc.rot)*d,z:b.z+Math.cos(pc.rot)*d};}
function startCut(pc,d){
  if(P.cool>0||P.swing>0)return;
  const pt=cutPoint(pc,d);P.cut={pc,d,work:0,x:pt.x,z:pt.z};
  swing(pt.x,pt.z,strikeCut);
}
function cutStroke(){if(P.cut)swing(P.cut.x,P.cut.z,strikeCut);}
const chipGeo=new T.BoxGeometry(0.1,0.05,0.14),chipMat=mat(0xe3c28e);
function spawnChips(x,y,z,mt){
  for(let k=0;k<6;k++){
    const m=new T.Mesh(chipGeo,mt||chipMat);m.position.set(x,y,z);scene.add(m);
    const a=P.rot+Math.PI+(rnd()-0.5)*2.2;
    chips.push({m,vx:Math.sin(a)*(1.5+rnd()*2),vy:2+rnd()*2.5,vz:Math.cos(a)*(1.5+rnd()*2),life:0.8});
  }
}
function strikeTree(t){
  if(!t.alive)return;
  t.work+=1/fellTotal(t);spawnChips(t.x+(P.x-t.x)*0.15,t.y+0.9,t.z+(P.z-t.z)*0.15);
  if(t.work>=0.999)fell(t);
}
function strikeCut(){
  const k=P.cut;if(!k||!pieces.includes(k.pc))return;
  k.work+=1/TOOL.cut;spawnChips(k.x,H(k.x,k.z)+0.4,k.z);
  if(k.work>=0.999){splitPiece(k.pc,k.d);P.cut=null;}
}
function splitPiece(pc,d){
  removePiece(pc);
  const fx=Math.sin(pc.rot),fz=Math.cos(pc.rot),b=pieceButt(pc),rm=pc.ra+(pc.rb-pc.ra)*d/pc.len;
  addPiece({cx:b.x+fx*(d/2-0.02),cz:b.z+fz*(d/2-0.02),rot:pc.rot,len:d,ra:pc.ra,rb:rm,sp:pc.sp,crown:false});
  const r=pc.len-d;
  addPiece({cx:b.x+fx*(d+r/2+0.02),cz:b.z+fz*(d+r/2+0.02),rot:pc.rot,len:r,ra:rm,rb:pc.rb,sp:pc.sp,crown:pc.crown});
  toast(`Coupé à ${ftin(d)} : ${kindOf(d).replace(' ✔','')}`);
}
/* Essouchage à la pelle */
function nearestStump(maxD){let b=null,bd=maxD;stumpList.forEach(st=>{const d=Math.hypot(P.x-st.x,P.z-st.z);if(d<bd){bd=d;b=st;}});return b;}
function stumpHits(st){return Math.round(7+st.size*5);}
const dirtMat=mat(0x5e4630),holeMat=new T.MeshLambertMaterial({color:0x4a3826});
function dig(st){swing(st.x,st.z,()=>strikeStump(st));}
function strikeStump(st){
  if(!stumpList.includes(st))return;
  st.work+=1/stumpHits(st);spawnChips(st.x,H(st.x,st.z)+0.2,st.z,dirtMat);
  if(st.work>=0.999)removeStump(st);
}
function removeStump(st,silent){
  removeCol(st.col);
  if(st.mesh)scene.remove(st.mesh);else{st.inst.setMatrixAt(st.idx,ZERO_M);st.inst.instanceMatrix.needsUpdate=true;}
  stumpList.splice(stumpList.indexOf(st),1);
  if(st.tree)st.tree.stumpGone=true;else st.gone=true;
  if(!silent)toast('Souche arrachée !');
}
function fell(t){
  hideTree(t);
  const g=treeGroupFromParts(t.parts);g.position.set(t.x,t.y,t.z);scene.add(g);
  let fx=t.x-P.x,fz=t.z-P.z;const d=Math.hypot(fx,fz)||1;fx/=d;fz/=d;
  falling.push({t,g,fx,fz,axis:new T.Vector3(fz,0,-fx),time:0});t.fd=[Math.round(fx*100)/100,Math.round(fz*100)/100];
  makeStump(t);
  toast('Ça tombe ! 🌲');
}
// Retire un arbre debout (forêt de départ : instance cachée ; arbre planté : son groupe).
function hideTree(t){
  t.alive=false;removeCol(t.col);
  if(t.group){scene.remove(t.group);const i=planted.indexOf(t);if(i>=0)planted.splice(i,1);}
  else{t.parts.forEach(pp=>TREE_INST[pp.g].setMatrixAt(pp.idx,ZERO_M));Object.values(TREE_INST).forEach(m=>m.instanceMatrix.needsUpdate=true);}
}
function makeStump(t){
  const bm=logMatsFor(t.type)[0],st=new T.Mesh(STUMP_GEO,[bm,RING_M,bm]);st.scale.set(t.s,1,t.s);st.rotation.y=t.rot||0;
  st.position.set(t.x,t.y-0.02,t.z);shadows(st);scene.add(st);
  const e={x:t.x,z:t.z,col:addCol(t.x,t.z,0.3*t.s),mesh:st,size:t.s,work:0,tree:t,id:t.planted?(t.id||uid()):null};stumpList.push(e);return e;
}
function makeCrown(t,x,z,rot){
  const g=new T.Group();g.rotation.y=rot;
  const cols=t.parts.filter(p=>p.g!=='trunk').map(p=>p.c),s=t.s;
  if(t.type==='epinette'||t.type==='sapin'){
    const c=new T.Mesh(TREE_GEO.fir,treeMat(cols[0]));c.rotation.x=Math.PI/2;c.scale.set(1.3*s,3.4*s,1.3*s);c.position.set(0,0,0.2*s);g.add(c);
  }else{
    const b1=new T.Mesh(TREE_GEO.crown,treeMat(cols[0]));b1.scale.set(1.6*s,1.0*s,1.8*s);b1.position.set(0,0,0.9*s);g.add(b1);
    const b2=new T.Mesh(TREE_GEO.blob,treeMat(cols[1]));b2.scale.set(0.9*s,0.75*s,1.0*s);b2.position.set(0.3*s,0.2,2.1*s);g.add(b2);
  }
  g.position.set(x,H(x,z)+0.55*s,z);shadows(g);scene.add(g);
}
function updateFalling(dt){
  for(let i=falling.length-1;i>=0;i--){
    const f=falling[i];if(!f.snd){f.snd=1;sfxCreak(f.t.x,f.t.z);}f.time+=dt;
    const k=Math.min(1,f.time/1.6);
    f.g.quaternion.setFromAxisAngle(f.axis,(Math.PI/2-0.06)*k*k);
    if(k>=1){
      scene.remove(f.g);falling.splice(i,1);sfxThud(f.t.x+f.fx*4,f.t.z+f.fz*4);
      if(f.remote)continue;                     // l'autre joueur nous enverra la tige
      const t=f.t,L=(t.type==='bouleau'?0.9:1)*(6+5*(t.s-0.8)),R0=0.13+0.07*t.s,rot=Math.atan2(f.fx,f.fz);
      const bx=t.x+f.fx*0.35,bz=t.z+f.fz*0.35;
      addPiece({cx:bx+f.fx*L/2,cz:bz+f.fz*L/2,rot,len:L,ra:R0,rb:R0*0.5,sp:t.type,crown:false});
      toast(`Tige de ${ftin(L)} : à toi de la tronçonner`);
    }
  }
  for(let i=chips.length-1;i>=0;i--){
    const c=chips[i];c.life-=dt;c.vy-=12*dt;
    c.m.position.x+=c.vx*dt;c.m.position.y+=c.vy*dt;c.m.position.z+=c.vz*dt;c.m.rotation.x+=dt*10;c.m.rotation.z+=dt*7;
    if(c.life<=0){scene.remove(c.m);chips.splice(i,1);}
  }
}
/* Aperçu du ruban et de la coupe */
const cutRing=new T.Mesh(new T.TorusGeometry(1,0.06,6,22),new T.MeshBasicMaterial({color:0x5fe07a,depthTest:false,transparent:true}));
cutRing.renderOrder=16;cutRing.visible=false;scene.add(cutRing);
const tape=new T.Mesh(new T.BoxGeometry(0.06,0.015,1),new T.MeshBasicMaterial({color:0xffd23d,depthTest:false,transparent:true,opacity:0.9}));
tape.renderOrder=16;tape.visible=false;scene.add(tape);
const _v=new T.Vector3();
function updatePreview(pv){
  if(!pv){cutRing.visible=tape.visible=false;return;}
  const pc=pv.pc,d=pv.d,r=pc.ra+(pc.rb-pc.ra)*d/pc.len;
  cutRing.visible=tape.visible=true;
  pc.mesh.localToWorld(_v.set(0,0,d-pc.len/2));cutRing.position.copy(_v);cutRing.quaternion.copy(pc.mesh.quaternion);
  cutRing.scale.setScalar(r+0.05);
  cutRing.material.color.set(d>CRANE_MAX?0xe05a4a:d>CARRY_MAX?0x5aa0ff:d>=SAW_MIN?0x5fe07a:0xffa13d);
  cutRing.material.opacity=pv.locked?1:0.6+0.3*Math.sin(S.time*8);
  pc.mesh.localToWorld(_v.set(0,pc.ra+0.03,d/2-pc.len/2));tape.position.copy(_v);tape.quaternion.copy(pc.mesh.quaternion);tape.scale.set(1,1,Math.max(0.01,d));
}
function tongue(t){return {x:t.x+Math.sin(t.th)*t.spec.tl,z:t.z+Math.cos(t.th)*t.spec.tl};}
function vHitch(v){return {x:v.x-Math.sin(v.th)*v.spec.hitch,z:v.z-Math.cos(v.th)*v.spec.hitch};}
function canAttach(v,t){if(!v||!t||t.hitch||!v.spec.hitch||towed(v))return false;const p=tongue(t),h=vHitch(v);return Math.hypot(p.x-h.x,p.z-h.z)<1.0&&Math.abs(wrapAng(t.th-v.th))<1.1;}
function hitchCtx(){
  if(P.carry||S.mode!=='foot')return null;
  if(S.mode==='vtt'){
    if(Math.abs(V.v)>=0.8)return null;
    const tw=towed(V);
    if(tw)return {label:`Dételer la ${tw.spec.name}`,fn:()=>detach(tw)};
    const t=trailers.find(t=>canAttach(V,t));
    if(t)return {label:`Atteler la ${t.spec.name}`,fn:()=>attach(V,t)};
    return null;
  }
  let best=null,bd=2.2;
  trailers.forEach(t=>{const p=tongue(t),d=Math.hypot(P.x-p.x,P.z-p.z);if(d<bd){bd=d;best=t;}});
  if(!best)return null;
  if(best.hitch)return {label:`Dételer la ${best.spec.name}`,fn:()=>detach(best)};
  const v=vehicles.find(v=>canAttach(v,best));
  if(v)return {label:`Atteler au ${v.spec.name}`,fn:()=>attach(v,best)};
  return null;
}
function doHitch(){const h=hitchCtx();if(h)h.fn();}
function detach(t){t.hitch=null;toast(`${t.spec.label} dételée`);}
function attach(v,t){
  const h=vHitch(v);let dx=h.x-t.x,dz=h.z-t.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  t.th=Math.atan2(dx,dz);t.x=h.x-dx*t.spec.tl;t.z=h.z-dz*t.spec.tl;t.hitch=v;toast(`${t.spec.label} attelée 🔗`);
}
function driveContext(){
  let act=null,act2=null,info='';
  const sale=driveSaleContext();
  if(sale)return {enter:'Débarquer',act:sale.act||null,act2:sale.act2||null,full:false,info:sale.info||''};
  if(V.type==='skid'){
    if(V.drag)act={label:`Relâcher la tige (${ftin(V.drag.len)})`,fn:()=>skidRelease(V)};
    else{const c=skidCandidate(V);if(c){if(Math.abs(V.v)<1.5)act={label:`Agripper (${ftin(c.pc.len)})`,fn:()=>skidGrab(V,c)};else info='Ralentis pour agripper la tige';}}
  }
  return {enter:'Débarquer',act,act2,full:false,info};
}
