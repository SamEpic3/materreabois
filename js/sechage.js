/* Bois sec : chaque bûche a un taux d'humidité (45 % fraîchement coupée, sèche sous 20 %).
   Elle sèche cordée dans l'abri (vite si fendue), plus lentement cordée dehors (et la pluie la remouille un peu).
   Le bois sec se vend plus cher et brûle plus longtemps. L'humidimètre (magasin général) donne le pourcentage exact. */
const HU_VERT=45,HU_MI=35,HU_SEC=20;
const DAY_S=1500,DRY_RATE=(HU_VERT-HU_SEC)/(3*DAY_S);   // fendue dans l'abri : sèche en ≈ 3 jours de jeu (1 jour = 25 min)
function huOf(c){return c&&c.hu!==undefined?c.hu:HU_VERT;}
function dryStage(c){const h=huOf(c);return h<=HU_SEC?2:h<=HU_MI?1:0;}
function dryMult(c){return [1,1.3,1.6][dryStage(c)];}
function hasMeter(){return !!(TOOL&&TOOL.kind==='meter');}
function dryTxt(c,fem){let t=(fem?['verte','mi-sèche','sèche']:['vert','mi-sec','sec'])[dryStage(c)];if(hasMeter())t+=` · ${Math.round(huOf(c))} %`;return t;}
const isFirewood=c=>c&&c.len<SAW_MIN;

/* ----- Prix et chauffage ----- */
{const _p=priceOf;priceOf=function(c){const p=_p(c);return isFirewood(c)?Math.max(1,Math.round(p*dryMult(c))):p;};}
{const _f=fuelOf;fuelOf=function(c){return Math.round(_f(c)*[1,1.3,1.6][dryStage(c)]);};}   // le bois sec brûle plus longtemps

/* ----- Apparence : le bois grisonne, le bout se fendille ----- */
const DRY_RING_TEX=canvasTex(128,128,(g,w)=>{
  g.drawImage(RING_TEX.image,0,0,w,w);
  g.fillStyle='rgba(160,156,148,0.6)';g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();
  let seed=31;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  g.strokeStyle='rgba(40,30,22,0.85)';g.lineCap='round';
  for(let k=0;k<7;k++){const a=r()*6.28,l=24+r()*30;g.lineWidth=1.2+r()*1.6;g.beginPath();g.moveTo(64+Math.cos(a)*4,64+Math.sin(a)*4);
    g.lineTo(64+Math.cos(a+0.08)*l*0.55,64+Math.sin(a+0.08)*l*0.55);g.lineTo(64+Math.cos(a-0.04)*l,64+Math.sin(a-0.04)*l);g.stroke();}
});
const DRY_TINT=[null,0xcfc9bf,0xa29e98],_dryCache=new Map();
function dryMat(m,stage){
  if(!stage)return m;
  if(Array.isArray(m))return m.map(x=>dryMat(x,stage));
  const k=m.uuid+'|'+stage;if(_dryCache.has(k))return _dryCache.get(k);
  const n=m.clone();n.color=n.color.clone().multiply(new T.Color(DRY_TINT[stage]));
  if(stage===2&&(m===RING_M||m===SPLIT_MATS[0])){n.map=DRY_RING_TEX;}
  n.userData.shared=true;_dryCache.set(k,n);return n;
}
{const _mk=makePieceMesh;makePieceMesh=function(c){const m=_mk(c),s=dryStage(c);if(s)m.material=dryMat(m.material,s);return m;};}
{const _sc=setCarry;setCarry=function(c){_sc(c);if(c&&dryStage(c))player.carryLog.material=dryMat(player.carryLog.material,dryStage(c));};}

/* ----- Corde de bois dehors (sans toit) ----- */
const CORDE_CAP=SHED_COLS*SHED_LAYERS;
function makeCordeModel(){
  const g=new T.Group(),post=new T.MeshPhongMaterial({map:BARK.epinette,flatShading:true,shininess:3});
  const fl=[];for(let k=0;k<3;k++)fl.push(new T.BoxGeometry(3.4,0.05,0.26).translate(0,0.15,-0.32+k*0.32));fl.push(new T.BoxGeometry(3.3,0.12,0.12).translate(0,0.06,-0.3),new T.BoxGeometry(3.3,0.12,0.12).translate(0,0.06,0.3));
  g.add(new T.Mesh(mergeGeos(fl),mat(0x9a7a55)));
  g.add(new T.Mesh(mergeGeos([[1.72,-0.3],[1.72,0.3],[-1.72,-0.3],[-1.72,0.3]].map(([x,z])=>new T.CylinderGeometry(0.05,0.06,2.1,7).translate(x,1.05,z))),post));
  return bakeStatic(g);
}
function createCorde(b,o){
  const g=makeCordeModel(),stack=new T.Group();stack.position.set(0,0.12,0);g.add(stack);o.add(g);o.stack=stack;
  [-1.1,0,1.1].forEach(lx=>{const p=lw(b,lx,0);o.col(p.x,p.z,0.55);});
  refreshShed(b);
}
KINDS.corde={name:'Corde de bois',art:'la',price:80,icon:'🪵',dist:2.4,foot:[[-0.9,0,1.0],[0.9,0,1.0]],model:makeCordeModel,create:createCorde,init:()=>({logs:[]}),near:b=>lw(b,0,1.1),nearR:1.6,
  desc:`Des palettes et quatre piquets pour corder ${CORDE_CAP} bûches dehors. Le bois y sèche moins vite qu'à l'abri, et la pluie le remouille un peu.`};
KIND_IDS.push('corde');
const stackCap=b=>b.k==='corde'?CORDE_CAP:SHED_CAP;
const stackName=b=>b.k==='corde'?'la corde':'l\'abri';
function nearStack(){return buildNear('abri')||buildNear('corde');}
function stackSummary(b){const n=[0,0,0];b.logs.forEach(c=>n[dryStage(c)]++);
  const parts=[];if(n[2])parts.push(`${n[2]} sèche${n[2]>1?'s':''}`);if(n[1])parts.push(`${n[1]} mi-sèche${n[1]>1?'s':''}`);if(n[0])parts.push(`${n[0]} verte${n[0]>1?'s':''}`);
  let t=parts.join(', ');if(hasMeter()&&b.logs.length)t+=` · humidité moyenne ${Math.round(b.logs.reduce((s,c)=>s+huOf(c),0)/b.logs.length)} %`;return t;}

/* ----- Séchage (calculé par l'hôte, ou seul) ----- */
function dryTick(dt){
  if(typeof NET!=='undefined'&&NET.on&&!NET.host)return;
  const wet=SKY.rain>0.3||SKY.snow>0.3;
  S.builds.forEach(b=>{if((b.k!=='abri'&&b.k!=='corde')||!b.logs.length)return;let ch=false;
    b.logs.forEach(c=>{if(!isFirewood(c))return;const before=dryStage(c);let h=huOf(c);
      if(b.k==='corde'&&wet)h=Math.min(40,h+0.004*dt);
      else h=Math.max(12,h-DRY_RATE*dt*(c.split?1:0.5)*(b.k==='corde'?0.6:1));
      c.hu=Math.round(h*1000)/1000;if(dryStage(c)!==before)ch=true;});
    if(ch)refreshShed(b);});
}
setInterval(()=>dryTick(2),2000);

/* ----- Humidimètre ----- */
TOOLS.push({id:'humidimetre',name:'Humidimètre',kind:'meter',store:true,delay:0.5,fell:null,cut:null,price:40,
  desc:'Pique ses deux pointes dans une bûche : il donne son humidité exacte. Sous 20 %, le bois est sec.'});
function makeMeterModel(){
  const g=new T.Group();
  g.add(new T.Mesh(new T.BoxGeometry(0.06,0.1,0.025).translate(0,0,0),new T.MeshPhongMaterial({color:0xe8b62a,shininess:40})));
  g.add(new T.Mesh(new T.PlaneGeometry(0.04,0.03).translate(0,0.022,0.0131),new T.MeshBasicMaterial({color:0x9fd07a})));
  g.add(new T.Mesh(mergeGeos([-0.015,0.015].map(x=>new T.CylinderGeometry(0.003,0.002,0.04,6).translate(x,0.07,0))),new T.MeshPhongMaterial({color:0xc8ccd0,shininess:90})));
  return g;
}
{
  const m=makeMeterModel();m.position.set(0,-0.69,0.05);m.rotation.x=-0.4;player.armR.add(m);player.meter=m;m.visible=false;
  const f=makeMeterModel();f.rotation.y=Math.PI;f.position.set(-0.05,0.02,-0.1);f.scale.setScalar(1.6);f.visible=false;fpTool.arm.add(f);fpTool.tools.meter=f;
  const _u=updateToolVisual;updateToolVisual=function(){_u();player.meter.visible=S.mode==='foot'&&!P.carry&&!P.pail&&TOOL&&TOOL.kind==='meter';};
  const _t=toolThumbModel;toolThumbModel=function(t){if(t.kind==='meter'){const g=new T.Group(),mm=makeMeterModel();mm.scale.setScalar(5);mm.rotation.set(0.2,0.5,-0.3);g.add(mm);return g;}return _t(t);};
}

/* ----- Ce qu'on voit à l'écran ----- */
{const _ctx=context;context=function(){
  const r=_ctx();if(!r||S.mode!=='foot'||S.inside)return r;
  // On porte une bûche : son état (et l'humidité exacte avec l'humidimètre)
  if(P.carry&&isFirewood(P.carry)&&!r.info)r.info=`Bûche ${dryTxt(P.carry,true)}`+(P.carry.split?' · fendue':'');
  // Près d'un abri ou d'une corde : combien de bûches sont sèches
  if(!P.carry){const a=nearStack();if(a&&a.logs.length&&!r.info)r.info=`${a.k==='corde'?'Corde':'Abri'} : ${stackSummary(a)}`;}
  // Humidimètre en main près d'une bûche au sol
  if(!P.carry&&hasMeter()&&!r.info){const np=typeof nearestPiece==='function'?nearestPiece():null;if(np&&isFirewood(np.pc))r.info=`Humidité : ${Math.round(huOf(np.pc))} % (${dryTxt(np.pc,true).split(' ·')[0]})`;}
  return r;};}

/* ----- Magasin général : rayon Quincaillerie ----- */
STORE_SECS.push('Quincaillerie');
{const _rs=renderShop;renderShop=function(){_rs();if(SHOP_MODE!=='store')return;
  const L=$('shopList'),h=document.createElement('div');h.className='shopSec';h.textContent='Quincaillerie';L.appendChild(h);
  TOOLS.filter(t=>t.store).forEach(t=>{const d=document.createElement('div');d.className='item';const have=invCount(t.id);
    d.innerHTML=imgTag(thumb(t.id,()=>toolThumbModel(t),true))+`<div class="txt"><b>${t.name}</b> — ${t.price} $<p>${t.desc}</p><p class="stats">${have?'Tu en as un':'Vert : plus de 35 % · mi-sec : 20 à 35 % · sec : moins de 20 %'}</p></div>`;
    const b=document.createElement('button');b.textContent='Acheter';b.disabled=S.money<t.price;
    b.onclick=()=>{if(S.money<t.price||!buyCheck({id:t.id,n:1}))return;S.money-=t.price;giveItem({id:t.id,n:1});J.buy(t.name.toLowerCase(),t.price);toast(`${t.name} : dans ton inventaire !`);sfxCash();renderShop();};
    d.appendChild(b);L.appendChild(d);});};}
