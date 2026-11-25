/* Apparence du bûcheron : chemise, chapeau (tuque, casquette ou rien), couleur du chapeau, barbe.
   Choisie dans l'inventaire (bouton « Apparence »), gardée sur cet appareil et vue par les autres joueurs. */
const SHIRTS={rouge:['#b3241f','rgba(20,10,10,.85)','Rouge'],bleu:['#2d5b9a','rgba(10,14,30,.8)','Bleue'],vert:['#2f6b3a','rgba(10,25,12,.8)','Verte'],
  noir:['#4a4a4a','rgba(12,12,12,.88)','Noire'],jaune:['#c8a12a','rgba(30,24,10,.8)','Jaune'],gris:['#8c8c88','rgba(30,30,30,.7)','Grise']};
const HAT_COLS={vert:[0x2a6e3f,'Vert'],rouge:[0xa52a24,'Rouge'],bleu:[0x2d4f8a,'Bleu'],noir:[0x2a2a2a,'Noir'],orange:[0xd8682a,'Orange'],gris:[0x8a8a8a,'Gris']};
const HATS={tuque:'Tuque',cap:'Casquette',none:'Aucun'};
const LOOK={shirt:'rouge',hat:'tuque',hatCol:'vert',beard:true};
try{Object.assign(LOOK,JSON.parse(localStorage.getItem('terre-a-bois-look')||'{}'));}catch(e){}
function lookKey(l){return `${l.shirt}|${l.hat}|${l.hatCol}|${l.beard?1:0}`;}
function lookFromKey(k){const a=(k||'').split('|');return {shirt:SHIRTS[a[0]]?a[0]:'rouge',hat:HATS[a[1]]?a[1]:'tuque',hatCol:HAT_COLS[a[2]]?a[2]:'vert',beard:a[3]!=='0'};}
function applyLook(f,l){
  if(!f.mats)return;
  const s=SHIRTS[l.shirt]||SHIRTS.rouge;f.mats.plaid.map=plaidTex(s[0],s[1]);f.mats.plaid.needsUpdate=true;
  const c=new T.Color((HAT_COLS[l.hatCol]||HAT_COLS.vert)[0]);
  f.mats.tuque.color.copy(c);f.mats.capM.color.copy(c);f.mats.brimM.color.copy(c).multiplyScalar(0.82);
  f.hat.tuque.forEach(m=>m.visible=l.hat==='tuque');f.hat.cap.forEach(m=>m.visible=l.hat==='cap');
  if(f.beardMesh)f.beardMesh.visible=!!l.beard;
  f.lookKey=lookKey(l);
}
applyLook(player,LOOK);

/* ----- Fenêtre « Apparence » ----- */
const lookEl=document.createElement('div');lookEl.id='look';lookEl.className='hidden';
lookEl.innerHTML=`<div class="card"><button id="lookClose" class="xclose" title="Fermer" aria-label="Fermer">✕</button>
  <h1>👕 Apparence</h1><div class="lookWrap"><img id="lookPrev" alt=""><div id="lookOpts"></div></div>
  <div class="invBtns"><button id="lookDone">C'est beau !</button></div></div>`;
$('app').appendChild(lookEl);
let lookR=null,lookScene=null,lookFig=null,lookCam=null;
function lookPreview(l){
  try{
    if(!lookR){lookR=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});lookR.setPixelRatio(Math.min(2,window.devicePixelRatio||1));lookR.setSize(200,260);
      lookScene=new T.Scene();lookScene.add(new T.HemisphereLight(0xffffff,0x6b5a40,0.95));const dl=new T.DirectionalLight(0xffffff,0.7);dl.position.set(2,4,4);lookScene.add(dl);
      lookFig=makePlayer();[lookFig.axe,lookFig.saw,lookFig.chain,lookFig.shovel,lookFig.carryLog].forEach(m=>{if(m)m.visible=false;});lookFig.g.rotation.y=0.45;lookScene.add(lookFig.g);
      lookCam=new T.PerspectiveCamera(30,200/260,0.1,50);lookCam.position.set(0.3,1.5,4.4);lookCam.lookAt(0,1.15,0);}
    applyLook(lookFig,l);
    const sv=silMat.visible;silMat.visible=false;lookR.render(lookScene,lookCam);silMat.visible=sv;
    return lookR.domElement.toDataURL('image/png');
  }catch(e){return '';}
}
function renderLook(){
  $('lookPrev').src=lookPreview(LOOK);
  const row=(title,items,cur,set)=>`<div class="lookLbl">${title}</div><div class="lookRow">`+items.map(([k,label,sw])=>`<button class="lookOpt${k===cur?' on':''}" data-set="${set}" data-k="${k}">${sw?`<span class="sw" style="background:${sw}"></span>`:''}${label}</button>`).join('')+'</div>';
  $('lookOpts').innerHTML=
    row('Chemise à carreaux',Object.keys(SHIRTS).map(k=>[k,SHIRTS[k][2],SHIRTS[k][0]]),LOOK.shirt,'shirt')+
    row('Chapeau',Object.keys(HATS).map(k=>[k,HATS[k]]),LOOK.hat,'hat')+
    (LOOK.hat==='none'?'':row('Couleur du chapeau',Object.keys(HAT_COLS).map(k=>[k,HAT_COLS[k][1],'#'+HAT_COLS[k][0].toString(16).padStart(6,'0')]),LOOK.hatCol,'hatCol'))+
    row('Barbe',[['1','Avec barbe'],['0','Sans barbe']],LOOK.beard?'1':'0','beard');
}
lookEl.addEventListener('click',e=>{
  const b=e.target.closest('.lookOpt');if(b){const k=b.dataset.k,s=b.dataset.set;LOOK[s]=s==='beard'?k==='1':k;
    try{localStorage.setItem('terre-a-bois-look',JSON.stringify(LOOK));}catch(er){}
    applyLook(player,LOOK);renderLook();return;}
  if(e.target===lookEl)closeLook();
});
function openLook(){renderLook();lookEl.classList.remove('hidden');}
function closeLook(){lookEl.classList.add('hidden');}
$('lookClose').addEventListener('click',closeLook);$('lookDone').addEventListener('click',closeLook);
$('invLook').addEventListener('click',()=>{openLook();});
