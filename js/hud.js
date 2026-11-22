/* Flèche d'objectif et affichage (HUD) */
/* ---------- Flèche ---------- */
function updateArrow(){
  let ox,oz,tx,tz;
  if(S.mode==='crane'){arrow.visible=false;return;}
  if(S.mode==='foot'){
    ox=P.x;oz=P.z;
    if(P.carry){const c=containers().filter(c=>c.load.length<c.cap).map(c=>c.center()).sort((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)-Math.hypot(b.x-P.x,b.z-P.z))[0];if(c){tx=c.x;tz=c.z;}else{tx=YARD.x;tz=YARD.z;}}
    else if(Math.hypot(V.x-P.x,V.z-P.z)>14&&!pieces.some(carryable)){tx=V.x;tz=V.z;}
  }else{
    ox=V.x;oz=V.z;
    const tw=towed(V);
    if((tw&&tw.c.load.length)||(V.bed&&V.bed.load.length)||V.drag){tx=YARD.x;tz=YARD.z;}
  }
  if(tx===undefined||Math.hypot(tx-ox,tz-oz)<8){arrow.visible=false;return;}
  arrow.visible=true;
  arrow.position.set(ox,H(ox,oz)+(S.mode==='foot'?2.9:V.spec.arrowY)+Math.sin(S.time*3)*0.12,oz);
  arrow.rotation.y=Math.atan2(tx-ox,tz-oz);
}

/* ---------- HUD ---------- */
let lastHud='';
function updateHUD(){
  const c=context();
  const be=$('btnEnter'),ba=$('btnAct');
  be.classList.toggle('hidden',!c.enter);
  if(c.enter)be.textContent=c.enter+(isTouch?'':' (E)');
  ba.classList.toggle('hidden',!c.act);
  if(c.act)ba.textContent=c.act.label+(isTouch?'':' (Espace)');
  const cooling=!!(c.act&&c.act.cool&&(P.cool>0));
  ba.classList.toggle('cool',cooling);
  ba.style.setProperty('--p',cooling&&TOOL?(100*(1-P.cool/TOOL.delay)).toFixed(0)+'%':'100%');
  const b2=$('btnAct2');b2.classList.toggle('hidden',!c.act2);
  if(c.act2)b2.textContent=c.act2.label+(isTouch?'':' (F)');
  b2.classList.toggle('cool',!!(c.act2&&P.cool>0));
  updatePreview(c.preview);
  const hc=hitchCtx(),bh=$('btnHitch');
  bh.classList.toggle('hidden',!hc);
  if(hc)bh.textContent=hc.label+(isTouch?'':' (R)');
  $('pedals').classList.toggle('hidden',!(isTouch&&S.mode==='vtt'));
  $('hotbar').classList.toggle('hidden',isTouch||S.mode!=='foot');
  $('toolBtn').classList.toggle('hidden',!isTouch||S.mode!=='foot');
  $('gripBtns').classList.toggle('hidden',!(isTouch&&S.mode==='crane'));
  let hint=c.info||'';
  if(S.mode==='foot'&&!hint){
    if(P.swing>0||(c.act&&c.act.cool&&P.cool>0))hint='Reprends ton souffle…';
    else if(c.full)hint='C\'est plein : rapporte le chargement à la cour à bois';
    else if(P.carry&&c.act&&c.act.fn===dropLog)hint='Billot sur l\'épaule : va le mettre dans une remorque ou une boîte';
    else if(!P.carry&&!c.act&&!c.enter&&!hc)hint=pieces.some(carryable)?'Va chercher les billots par terre':'Approche-toi d\'un arbre pour le bûcher';
  }
  else if(S.mode==='vtt'&&!hint){
    const tw=towed(V);
    const hasLoad=(tw&&tw.c.load.length)||(V.bed&&V.bed.load.length);
    const atYard=(tw&&tw.c.load.length&&containerAtYard(tw.c))||(V.bed&&V.bed.load.length&&containerAtYard(V.bed));
    const near=(!tw&&V.spec.hitch)?trailers.find(t=>!t.hitch&&Math.hypot(t.x-V.x,t.z-V.z)<9):null;
    if(near)hint=canAttach(V,near)?(Math.abs(V.v)<0.8?'':'Arrête-toi pour atteler'):`Recule le crochet du ${V.spec.name} jusqu'au cercle du timon`;
    else if(V.drag)hint='Traîne la tige jusqu\'au chemin ou à la cour, puis relâche-la (Espace)';
    else if(V.type==='skid'&&!c.act)hint='Recule la pince arrière jusqu\'au bout d\'une tige';
    else if(atYard)hint='Débarque et corde les billots dans le cercle jaune';
    else if(hasLoad)hint='Direction la cour à bois du camp';
    else if(mudAt(V.x,V.z)>0.3)hint='Boue ! Ça avance moins vite…';
  }
  const grp={};
  trailers.forEach(t=>{const g=grp[t.spec.label]||(grp[t.spec.label]={n:0,l:0,c:0});g.n++;g.l+=t.c.load.length;g.c+=t.c.cap;});
  vehicles.forEach(v=>{if(!v.bed)return;const g=grp['Boîte']||(grp['Boîte']={n:0,l:0,c:0});g.n++;g.l+=v.bed.load.length;g.c+=v.bed.cap;});
  const loadTxt=Object.entries(grp).map(([k,g])=>`${k}${g.n>1?' ×'+g.n:''} : ${g.l}/${g.c}`).join(' · ');
  const hud=`${S.money}|${S.delivered}|${loadTxt}|${S.mode}|${Math.round(Math.abs(V.v)*3.6)}|${hint}`;
  if(hud===lastHud)return;lastHud=hud;
  $('sMoney').textContent=S.money+' $';$('sTool').textContent=TOOL?TOOL.name:'Mains vides';$('sDel').textContent=S.delivered;$('sLoad').textContent=loadTxt;
  $('sSpeedWrap').classList.toggle('hidden',S.mode!=='vtt');$('sSpeed').textContent=Math.round(Math.abs(V.v)*3.6);
  $('hint').textContent=hint;
}
