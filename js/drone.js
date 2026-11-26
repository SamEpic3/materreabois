/* Drone (concessionnaire) : on le tient en main, Espace (ou le bouton d'action) le fait décoller au-dessus des mains.
   Pendant le vol, le personnage reste sur place avec la manette; on voit par la caméra du drone (1re personne)
   ou de derrière lui (3e personne). WASD / joystick : avancer et se tasser; souris (ou glisser) : tourner;
   Espace ou R : monter; Maj ou F : descendre (boutons ▲ ▼ sur téléphone). E (ou le bouton) : rappeler le drone.
   Il s'arrête net devant les obstacles (arbres, bâtiments, véhicules, sol). */
const DRONE_SPEED=9,DRONE_CLIMB=4,DRONE_RANGE=180,DRONE_CEIL=70;
const DRONE={on:false,x:0,y:0,z:0,vx:0,vy:0,vz:0,up:false,down:false,mesh:null};

function makeDroneModel(){
  const g=new T.Group(),body=new T.MeshPhongMaterial({color:0x2b2e31,shininess:60}),acc=new T.MeshPhongMaterial({color:0xe8e6e0,shininess:40}),pm=new T.MeshPhongMaterial({color:0x111111,transparent:true,opacity:0.55});
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.22,0.07,0.3),new T.BoxGeometry(0.5,0.025,0.04).rotateY(Math.PI/4),new T.BoxGeometry(0.5,0.025,0.04).rotateY(-Math.PI/4)]),body));
  g.add(new T.Mesh(mergeGeos([new T.BoxGeometry(0.16,0.03,0.12).translate(0,0.05,0),new T.SphereGeometry(0.04,8,6).translate(0,-0.05,0.13)]),acc));
  const props=[];[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a,b])=>{
    const m=new T.Mesh(new T.CylinderGeometry(0.025,0.025,0.05,8).translate(0,0.02,0),body);m.position.set(a*0.18,0,b*0.18);g.add(m);
    const p=new T.Mesh(new T.CylinderGeometry(0.11,0.11,0.005,16),pm);p.position.set(a*0.18,0.05,b*0.18);g.add(p);props.push(p);});
  g.add(new T.Mesh(new T.SphereGeometry(0.015,6,4).translate(0,0,-0.16),new T.MeshBasicMaterial({color:0xff3030})));
  g.add(new T.Mesh(new T.SphereGeometry(0.015,6,4).translate(0,0,0.16),new T.MeshBasicMaterial({color:0x30ff60})));
  g.userData.props=props;shadows(g);return g;
}
function makeRemoteModel(){
  const g=new T.Group();
  g.add(new T.Mesh(new T.BoxGeometry(0.2,0.035,0.11),new T.MeshPhongMaterial({color:0x2b2e31,shininess:50})));
  g.add(new T.Mesh(mergeGeos([new T.CylinderGeometry(0.008,0.008,0.04,6).translate(-0.06,0.035,0),new T.CylinderGeometry(0.008,0.008,0.04,6).translate(0.06,0.035,0)]),mat(0x888888)));
  return g;
}

/* ----- L'objet : en main, dans la boutique, la miniature ----- */
{
  const d=makeDroneModel();d.scale.setScalar(0.8);d.position.set(0,-0.78,0.12);player.armR.add(d);player.droneM=d;d.visible=false;
  const fd=makeDroneModel();fd.rotation.y=Math.PI;fd.position.set(-0.05,0.02,-0.15);fd.scale.setScalar(0.7);fd.visible=false;fpTool.arm.add(fd);fpTool.tools.drone=fd;
  const rc=makeRemoteModel();rc.position.set(0,-0.72,0.12);rc.rotation.x=1.1;player.armR.add(rc);player.remote=rc;rc.visible=false;
}
const _updToolVisD=updateToolVisual;
updateToolVisual=function(){
  _updToolVisD();
  player.droneM.visible=S.mode==='foot'&&!P.carry&&!P.pail&&TOOL&&TOOL.kind==='drone';
  player.remote.visible=S.mode==='drone';
};
const _thumbD=toolThumbModel;
toolThumbModel=function(t){if(t.kind==='drone'){const g=new T.Group(),m=makeDroneModel();m.scale.setScalar(2.2);m.rotation.set(0.5,0.6,0);g.add(m);return g;}return _thumbD(t);};

/* ----- Le drone dans le monde ----- */
DRONE.mesh=makeDroneModel();DRONE.mesh.visible=false;scene.add(DRONE.mesh);
// Hauteur au-dessus de laquelle on passe par-dessus un obstacle
function droneBlocked(x,y,z){
  if(outW(x,z,1.5))return true;
  if(y<walkH(x,z)+0.3)return true;
  if(y>walkH(x,z)+DRONE_CEIL)return true;
  const R=0.32;
  if(eachNear(x,z,c=>{
    const g=H(c.x,c.z),d=Math.hypot(x-c.x,z-c.z);
    if(c.tree){const t=c.tree;if(!t.alive)return d<c.r+R&&y<g+0.7;const top=g+9.5*t.s;if(y>top)return false;return d<(y>g+2.4?1.7*t.s:c.r)+R;}
    return d<c.r+R&&y<g+(c.h||7.5);
  }))return true;
  for(const o of bodyCircles(null))if(Math.hypot(x-o[0],z-o[1])<o[2]+R&&y<H(o[0],o[1])+3.2)return true;
  return false;
}
function launchDrone(){
  if(S.mode!=='foot'||!TOOL||TOOL.kind!=='drone')return;
  const x=P.x+Math.sin(P.rot)*0.6,z=P.z+Math.cos(P.rot)*0.6,y=walkH(P.x,P.z)+1.9;
  if(droneBlocked(x,y,z)){toast('Pas assez de place pour faire décoller le drone ici');return;}
  Object.assign(DRONE,{on:true,x,y,z,vx:0,vy:0,vz:0,up:false,down:false});
  S.mode='drone';P.target=null;marker.visible=false;
  if(camMode==='iso')applyCamMode('tp');
  camYaw=camYawT=P.rot;camPitch=-0.1;
  player.armR.rotation.x=player.armL.rotation.x=-0.9;
  DRONE.mesh.visible=true;updateToolVisual();$('droneBtns').classList.remove('hidden');
  toast('🚁 Drone en vol · WASD : avancer · Espace/R : monter · Maj/F : descendre · E : rappeler');
}
function recallDrone(){
  if(S.mode!=='drone')return;
  DRONE.on=false;DRONE.mesh.visible=false;S.mode='foot';
  player.armR.rotation.x=player.armL.rotation.x=0;updateToolVisual();$('droneBtns').classList.add('hidden');
  camYaw=camYawT=P.rot;toast('Drone rappelé');
}
function droneContext(){
  const d=Math.hypot(DRONE.x-P.x,DRONE.z-P.z),alt=DRONE.y-walkH(DRONE.x,DRONE.z);
  return {enter:'Rappeler le drone',enterDrone:true,act:null,act2:null,info:`Drone · altitude ${Math.round(alt)} m · à ${Math.round(d)} m de toi`+(d>DRONE_RANGE-15?' · signal faible!':'')};
}
function updateDrone(dt){
  const m=DRONE.mesh,props=m.userData.props;
  if(!DRONE.on)return;
  const inp=readInput(true),fx=Math.sin(camYaw),fz=Math.cos(camYaw),rx=-fz,rz=fx;
  const up=keys.Space||keys.KeyR||DRONE.up,down=keys.ShiftLeft||keys.ShiftRight||keys.KeyF||DRONE.down;
  const tvx=(fx*inp.y+rx*inp.x)*DRONE_SPEED,tvz=(fz*inp.y+rz*inp.x)*DRONE_SPEED,tvy=((up?1:0)-(down?1:0))*DRONE_CLIMB;
  const k=1-Math.exp(-3.5*dt);DRONE.vx+=(tvx-DRONE.vx)*k;DRONE.vz+=(tvz-DRONE.vz)*k;DRONE.vy+=(tvy-DRONE.vy)*k;
  let nx=DRONE.x+DRONE.vx*dt,ny=DRONE.y+DRONE.vy*dt,nz=DRONE.z+DRONE.vz*dt;
  // portée de la manette
  if(Math.hypot(nx-P.x,nz-P.z)>DRONE_RANGE){nx=DRONE.x;nz=DRONE.z;DRONE.vx=DRONE.vz=0;}
  // collisions : le drone s'arrête net (on garde la montée/descente si elle est libre)
  if(droneBlocked(nx,ny,nz)){
    if(!droneBlocked(DRONE.x,ny,DRONE.z)){DRONE.y=ny;}else DRONE.vy=0;
    DRONE.vx=DRONE.vz=0;
  }else{DRONE.x=nx;DRONE.y=ny;DRONE.z=nz;}
  // au sol, on reste juste au-dessus
  DRONE.y=Math.max(DRONE.y,walkH(DRONE.x,DRONE.z)+0.3);
  m.position.set(DRONE.x,DRONE.y,DRONE.z);
  const lf=DRONE.vx*fx+DRONE.vz*fz,ls=DRONE.vx*rx+DRONE.vz*rz;
  m.rotation.set(0,0,0);m.rotateY(camYaw);m.rotateX(lf/DRONE_SPEED*0.25);m.rotateZ(-ls/DRONE_SPEED*0.25);
  props.forEach((p,i)=>{p.rotation.y+=dt*(i%2?60:-60);});
  // le personnage regarde son drone, manette en main
  P.rot=Math.atan2(DRONE.x-P.x,DRONE.z-P.z);player.g.rotation.y=P.rot;player.g.position.set(P.x,walkH(P.x,P.z),P.z);
  player.armR.rotation.x=player.armL.rotation.x=-0.9;
  if(Math.random()<dt*8)sfxDrone(DRONE.x,DRONE.y,DRONE.z);
}
// Caméra du drone (appelée par la boucle)
function droneCamera(){
  const D=DRONE;
  if(camMode==='fp'){
    D.mesh.visible=false;
    const y=D.y-0.12,cp=Math.cos(camPitch);pcam.position.set(D.x,y,D.z);
    pcam.lookAt(D.x+Math.sin(camYaw)*cp,y+Math.sin(camPitch),D.z+Math.cos(camYaw)*cp);
  }else{
    D.mesh.visible=true;
    const back=3.2*chaseDist,cx=D.x-Math.sin(camYaw)*back,cz=D.z-Math.cos(camYaw)*back;
    pcam.position.set(cx,Math.max(D.y+0.9+camTpTilt*2,H(cx,cz)+0.5),cz);
    pcam.lookAt(D.x+Math.sin(camYaw)*2,D.y,D.z+Math.cos(camYaw)*2);
  }
}
// Petit bourdonnement
let _droneSnd=0;
function sfxDrone(x,y,z){
  if(typeof ready!=='function'||!ready())return;const now=AU.ctx.currentTime;if(now<_droneSnd)return;_droneSnd=now+0.12;
  const sp=spatial(x,z,40);if(sp.g<0.01)return;const o=out(sp.g*0.12,sp.pan);tone(o,now,0.14,'sawtooth',180+Math.random()*12,175,0.25,0.01);
}

/* ----- Boutons ▲ ▼ (téléphone, et cliquables à l'ordinateur) ----- */
{
  const d=document.createElement('div');d.id='droneBtns';d.className='hidden';
  d.innerHTML='<button id="droneUp" title="Monter (Espace / R)">▲</button><button id="droneDown" title="Descendre (Maj / F)">▼</button>';
  $('app').appendChild(d);
  [['droneUp','up'],['droneDown','down']].forEach(([id,k])=>{const el=$(id);
    const on=e=>{e.preventDefault();DRONE[k]=true;el.classList.add('on');},off=()=>{DRONE[k]=false;el.classList.remove('on');};
    el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);});
}

/* ----- Les autres joueurs voient ton drone ----- */
function remoteDrone(a,p){
  if(p.dr){
    if(!a.drone){a.drone=makeDroneModel();scene.add(a.drone);a.dx=p.dr[0];a.dy=p.dr[1];a.dz=p.dr[2];}
    const k=0.25;a.dx+=(p.dr[0]-a.dx)*k;a.dy+=(p.dr[1]-a.dy)*k;a.dz+=(p.dr[2]-a.dz)*k;
    a.drone.visible=true;a.drone.position.set(a.dx,a.dy,a.dz);a.drone.rotation.y=p.dr[3];
    a.drone.userData.props.forEach((q,i)=>{q.rotation.y+=i%2?1:-1;});
    a.f.armR.rotation.x=a.f.armL.rotation.x=-0.9;
  }else if(a.drone)a.drone.visible=false;
}
