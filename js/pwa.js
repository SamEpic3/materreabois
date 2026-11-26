/* Application installable (PWA) : service worker, vue horizontale sur téléphone */
const PWA=matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
if(PWA&&isTouch){
  document.body.classList.add('pwa');
  // Android : verrouille l'écran à l'horizontale. iOS ne le permet pas : le jeu est alors tourné de 90° (voir applyLayout).
  const lock=()=>{try{const p=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(p&&p.catch)p.catch(()=>{});}catch(e){}};
  lock();addEventListener('pointerdown',lock,{once:true});
}
// Sonde CSS : marges de sécurité (encoche, barre d'état) et hauteur réelle de l'écran
const probe=document.createElement('div');
probe.style.cssText='position:fixed;left:0;top:0;width:0;height:100lvh;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
document.body.appendChild(probe);
function applyLayout(){
  let vw=document.documentElement.clientWidth||innerWidth,vh=document.documentElement.clientHeight||innerHeight;
  ROT=PWA&&isTouch&&vh>vw;
  document.body.classList.toggle('rot',ROT);
  const a=$('app');
  if(ROT){
    // Tout l'écran du téléphone (iOS ne compte pas toujours le bas de l'écran dans clientHeight)
    // iOS ajoute un flou un peu plus bas que la barre d'état : on garde une petite marge noire en plus
    const cs=getComputedStyle(probe),safeTop=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingTop)>0?14:0);
    const full=Math.max(vh,innerHeight,probe.getBoundingClientRect().height-(parseFloat(cs.paddingTop)||0));
    vh=screen.height?Math.min(full,Math.max(screen.width,screen.height)):full;   // jamais plus grand que l'écran
    vw=Math.max(vw,Math.min(screen.width||vw,screen.height||vw));
    // On laisse une bande noire unie sous la barre d'état (au lieu du jeu flouté par iOS)
    const H=vh-safeTop;
    a.style.width=H+'px';a.style.height=vw+'px';a.style.transform=`translate(${vw}px,${safeTop}px) rotate(90deg)`;
    a.style.setProperty('--appH',vw+'px');LAY.w=H;LAY.h=vw;LAY.top=safeTop;
  }else{a.style.width='';a.style.height='';a.style.transform='';a.style.removeProperty('--appH');}
  renderer.setSize(viewW(),viewH());updateProj();
}
addEventListener('resize',applyLayout);
addEventListener('orientationchange',()=>setTimeout(applyLayout,200));
applyLayout();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
// iOS ignore « user-scalable=no » : un pincement (ex. sur la carte) pouvait zoomer toute la page,
// et les boutons de droite restaient ensuite hors de l'écran. On bloque le zoom de la page.
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(e.touches.length>1||(e.scale!==undefined&&e.scale!==1))e.preventDefault();},{passive:false});
// Si la page a quand même glissé ou zoomé, on la remet en place
function resetPageView(){if(scrollX||scrollY)scrollTo(0,0);}
addEventListener('scroll',resetPageView);
if(window.visualViewport)visualViewport.addEventListener('resize',()=>{resetPageView();setTimeout(applyLayout,50);});
