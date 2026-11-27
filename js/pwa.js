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
probe.style.cssText='position:fixed;left:0;top:0;width:0;height:100lvh;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:content-box;visibility:hidden;pointer-events:none';
const IOS=/iP(hone|od|ad)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
document.body.appendChild(probe);
function applyLayout(){
  let vw=document.documentElement.clientWidth||innerWidth,vh=document.documentElement.clientHeight||innerHeight;
  ROT=PWA&&isTouch&&vh>vw;
  document.body.classList.toggle('rot',ROT);
  const a=$('app');
  if(ROT){
    // Deux états possibles sur iPhone :
    //  · la page couvre tout l'écran (marge du haut > 0) : on laisse une bande noire sous la barre d'état ;
    //  · iOS place la page SOUS la barre d'état (marge du haut = 0, page moins haute que l'écran) :
    //    la page commence déjà sous la barre, il ne faut ni décaler ni dépasser sa hauteur réelle.
    const cs=getComputedStyle(probe),envTop=parseFloat(cs.paddingTop)||0,envBot=parseFloat(cs.paddingBottom)||0;
    let safeTop,H;
    if(envTop>0){
      safeTop=envTop+14;
      const full=Math.max(vh,innerHeight,probe.getBoundingClientRect().height-envTop-envBot);
      vh=screen.height?Math.min(full,Math.max(screen.width,screen.height)):full;   // jamais plus grand que l'écran
      H=vh-safeTop;
    }else{safeTop=0;vh=Math.min(document.documentElement.clientHeight||innerHeight,innerHeight||9999);H=vh;}
    document.body.style.setProperty('--pad-r',envBot+'px');
    vw=Math.max(vw,Math.min(screen.width||vw,screen.height||vw));
    a.style.width=H+'px';a.style.height=vw+'px';a.style.transform=`translate(${vw}px,${safeTop}px) rotate(90deg)`;
    a.style.setProperty('--appH',vw+'px');a.style.setProperty('--appW',H+'px');LAY.w=H;LAY.h=vw;LAY.top=safeTop;
    LAY.diag=`écran ${screen.width}×${screen.height} · client ${document.documentElement.clientWidth}×${document.documentElement.clientHeight} · inner ${innerWidth}×${innerHeight} · encoche ${envTop}/${envBot} · app ${H}×${vw} décalé ${safeTop}`;
  }else{document.body.style.removeProperty('--pad-r');a.style.width='';a.style.height='';a.style.transform='';a.style.removeProperty('--appH');}
  renderer.setSize(viewW(),viewH());updateProj();
}
addEventListener('resize',applyLayout);
// iOS donne parfois de mauvaises mesures au lancement ou au retour dans l'app, sans événement ensuite :
// on compare les mesures chaque seconde et on refait la mise en page si elles ont changé.
let _laySig='';
function laySig(){const cs=getComputedStyle(probe);return [document.documentElement.clientWidth,document.documentElement.clientHeight,innerWidth,innerHeight,screen.width,screen.height,cs.paddingTop,probe.getBoundingClientRect().height,window.visualViewport?Math.round(visualViewport.height):0].join(',');}
setInterval(()=>{const s=laySig();if(s!==_laySig){_laySig=s;applyLayout();}},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){setTimeout(applyLayout,300);setTimeout(applyLayout,1000);}});
addEventListener('orientationchange',()=>setTimeout(applyLayout,700));
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
// Si la page est restée agrandie (pincement ou double-tape), iOS ne la remet pas à 1 tout seul :
// on réécrit la balise viewport pour forcer l'échelle 1, puis on refait la mise en page.
function resetZoom(){const vv=window.visualViewport;if(!vv||Math.abs(vv.scale-1)<0.01)return;
  const m=document.querySelector('meta[name=viewport]');if(!m)return;const c=m.content;
  m.content=c.replace(/initial-scale=[\d.]+/,'initial-scale=1').replace('maximum-scale=1','maximum-scale=1.01');
  setTimeout(()=>{m.content=c;resetPageView();applyLayout();},60);}
if(window.visualViewport){visualViewport.addEventListener("resize",()=>{resetPageView();resetZoom();});visualViewport.addEventListener("scroll",resetPageView);}
addEventListener('pageshow',()=>{resetZoom();resetPageView();});
setTimeout(()=>{resetZoom();resetPageView();applyLayout();},400);

// Diagnostic : toucher 4 fois de suite l'argent affiche les mesures de l'écran
{let n=0,tm=0;$('stats').addEventListener('pointerdown',()=>{const now=Date.now();n=now-tm<500?n+1:1;tm=now;if(n>=4){n=0;toast(LAY.diag||`écran ${screen.width}×${screen.height} · inner ${innerWidth}×${innerHeight}`,6000);}});}
