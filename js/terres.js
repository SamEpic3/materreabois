/* Terres à vendre (érablière à l'ouest, terre à bois à l'est) : on s'y promène, mais on n'y bûche et n'y entaille
   qu'après l'avoir achetée au panneau « À vendre » du sentier. Ramasser des billots reste permis partout;
   chasser et pêcher, sur le territoire public. */
S.lands={erab:false,coupe:false};
function landBlocked(x,z){return false;}   // on se promène partout; c'est la coupe et les entailles qui sont limitées
function isPublic(x,z){return landAt(x,z)==='pub';}
function ownsLand(x,z){const l=landAt(x,z);return l==='main'||(!!LANDS[l]&&!!S.lands[l]);}
// Pourquoi on ne peut pas bûcher, entailler, construire ou planter ici (null : c'est permis)
function notMine(x,z,what){
  const l=landAt(x,z);if(l==='main'||(LANDS[l]&&S.lands[l]))return null;
  if(l==='pub')return `Territoire public : défendu ${what||'de bûcher ou d\'entailler'} ici`;
  if(LANDS[l])return `${LANDS[l].name} n'est pas à vous (à vendre au panneau du sentier)`;
  return 'Cette terre n\'est pas à vous';
}

/* ----- Panneaux « À vendre » là où le sentier entre dans la terre (pas de clôture) ----- */
const fences={};
function signSpot(k){
  const L=LANDS[k];
  for(const Pp of PATHS)for(let i=0;i<Pp.pts.length-1;i++){const a=Pp.pts[i],b=Pp.pts[i+1],ia=landAt(a[0],a[1]),ib=landAt(b[0],b[1]);
    if((ia==='main'&&ib===k)||(ia===k&&ib==='main')){const bx=k==='erab'?L.x1:L.x0,u=(bx-a[0])/(b[0]-a[0]),z=a[1]+(b[1]-a[1])*u,dz=b[1]-a[1],dx=b[0]-a[0],l=Math.hypot(dx,dz);
      return {x:bx+(k==='erab'?-1.5:1.5),z:z+(dx/l)*3.2*(k==='erab'?-1:1),face:k==='erab'?Math.PI/2:-Math.PI/2};}}
  return {x:(L.x0+L.x1)/2,z:(L.z0+L.z1)/2,face:0};
}
function buildFence(k){
  const L=LANDS[k],sp=signSpot(k),g=new T.Group();
  const tex=canvasTex(512,300,(c,W,Hh)=>{c.fillStyle='#f3ead2';c.fillRect(0,0,W,Hh);c.strokeStyle='#a52a24';c.lineWidth=14;c.strokeRect(7,7,W-14,Hh-14);
    c.fillStyle='#a52a24';c.font='bold 78px Georgia,serif';c.textAlign='center';c.fillText('À VENDRE',W/2,98);
    c.fillStyle='#2b2418';c.font='bold 38px Georgia,serif';c.fillText(L.name,W/2,170);c.font='bold 48px Georgia,serif';c.fillText(L.price.toLocaleString('fr-CA')+' $',W/2,245);});
  const sign=new T.Group(),sm=new T.MeshBasicMaterial({map:tex});
  sign.add(new T.Mesh(new T.PlaneGeometry(1.5,0.88),sm));const back=new T.Mesh(new T.PlaneGeometry(1.5,0.88),mat(0x7a5a3a));back.rotation.y=Math.PI;sign.add(back);
  sign.children.forEach(m=>m.position.y=1.55);
  sign.add(new T.Mesh(new T.BoxGeometry(0.08,1.6,0.08).translate(0,0.8,-0.02),mat(0x5e4632)));
  sign.position.set(sp.x,H(sp.x,sp.z),sp.z);sign.rotation.y=sp.face;g.add(sign);
  shadows(g);scene.add(g);addCol(sp.x,sp.z,0.12);
  fences[k]={g,sign:{x:sp.x,z:sp.z}};
}
for(const k in LANDS)buildFence(k);
function refreshLands(){for(const k in LANDS){const f=fences[k];if(f)f.g.visible=!S.lands[k];}}

/* ----- Acheter une terre au panneau ----- */
function landSignNear(){for(const k in LANDS){if(S.lands[k])continue;const s=fences[k].sign;if(Math.hypot(P.x-s.x,P.z-s.z)<3)return k;}return null;}
function landContext(){
  const k=landSignNear();if(!k)return null;const L=LANDS[k];
  if(S.money<L.price)return {info:`${L.name} : ${L.price.toLocaleString('fr-CA')} $ — ${L.desc} Il te manque ${(L.price-S.money).toLocaleString('fr-CA')} $`};
  return {act:{label:`Acheter ${L.short} (${L.price.toLocaleString('fr-CA')} $)`,fn:()=>confirmSale('terre-'+k,`Acheter ${L.name} pour ${L.price.toLocaleString('fr-CA')} $ ?`,()=>{
    if(S.money<L.price||S.lands[k])return;S.money-=L.price;S.lands[k]=true;refreshLands();sfxCash();sfxBell();J.buy(L.name,L.price);toast(`🌲 ${L.name} est à vous ! Vous pouvez y bûcher et entailler.`);})},info:L.desc};
}
