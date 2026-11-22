/* Application installable (PWA) : service worker, vue horizontale forcée sur téléphone */
const PWA=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(PWA&&isTouch){
  document.body.classList.add('pwa');
  // Android : verrouille l'écran à l'horizontale. iOS ne le permet pas : un message demande alors de tourner le téléphone.
  const lock=()=>{try{const p=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{});}catch(e){}};
  lock();addEventListener('pointerdown',lock,{once:true});
}
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
