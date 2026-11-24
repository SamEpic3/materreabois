/* Inventaire des outils : barre d'outils (ordinateur), bouton qui fait défiler les outils (téléphone), mains vides */
// Case 0 = mains vides, puis les outils achetés dans l'ordre du catalogue.
function invSlots(){const a=[null,...TOOLS.filter(t=>owned.has(t.id))];if(seedCount()>0||TOOL===PLANT_TOOL)a.push(PLANT_TOOL);return a;}
function setTool(t){
  if(P.swing>0)return;
  TOOL=t;P.cut=null;P.cool=0;
  updateToolVisual();renderHotbar();
}
function selectSlot(i){
  if(S.mode!=='foot')return;
  const sl=invSlots();if(i<0||i>=sl.length)return;
  setTool(sl[i]);
  toast(sl[i]?sl[i].name:'Mains vides');
}
function slotIcon(t){
  if(!t)return '✋';
  if(t.kind==='plant')return '🌱';
  const src=thumb(t.id,()=>toolThumbModel(t),true);
  return src?`<img src="${src}" alt="">`:'🪓';
}
function renderHotbar(){
  const sl=invSlots(),hb=$('hotbar');hb.innerHTML='';
  sl.forEach((t,i)=>{
    const b=document.createElement('button');b.className='slot'+(t===TOOL?' on':'');
    b.title=t?t.name:'Mains vides';
    b.innerHTML=`<span class="k">${i+1}</span>`+slotIcon(t);
    b.addEventListener('pointerdown',e=>{e.preventDefault();selectSlot(i);});
    hb.appendChild(b);
  });
  $('toolBtn').innerHTML=slotIcon(TOOL);
}
$('toolBtn').addEventListener('pointerdown',e=>{
  e.preventDefault();
  const sl=invSlots(),i=sl.indexOf(TOOL);
  selectSlot((i+1)%sl.length);
});
// L'affichage initial de la barre se fait dans sauvegarde.js, une fois tous les fichiers chargés.
