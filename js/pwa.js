/* Application installable (PWA) : service worker, vue horizontale sur téléphone */
const PWA=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(PWA&&isTouch){
  document.body.classList.add('pwa');
  // Android : verrouille l'écran à l'horizontale. iOS ne le permet pas : le jeu est alors tourné de 90° (voir applyLayout).
  const lock=()=>{try{const p=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{});}catch(e){}};
  lock();addEventListener('pointerdown',lock,{once:true});
}
function applyLayout(){
  ROT=PWA&&isTouch&&innerHeight>innerWidth;
  document.body.classList.toggle('rot',ROT);
  const a=$('app');
  if(ROT){a.style.width=innerHeight+'px';a.style.height=innerWidth+'px';a.style.transform=`translateX(${innerWidth}px) rotate(90deg)`;}
  else{a.style.width='';a.style.height='';a.style.transform='';}
  renderer.setSize(viewW(),viewH());updateProj();
}
addEventListener('resize',applyLayout);
addEventListener('orientationchange',()=>setTimeout(applyLayout,200));
applyLayout();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
