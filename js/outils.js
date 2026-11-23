/* Outils de base : Three.js, raccourcis DOM, maths, hasard */
if(!window.THREE){document.getElementById('err').style.display='flex';throw new Error('Three.js n\'a pas pu être chargé');}
const T=THREE;
const $=id=>document.getElementById(id);
const isTouch=matchMedia('(pointer: coarse)').matches||('ontouchstart' in window);
if(isTouch)document.body.classList.add('touch');
// Vue horizontale simulée : quand l'app installée est tenue à la verticale, tout le jeu est tourné de 90°.
let ROT=false;
function scrW(){return document.documentElement.clientWidth||innerWidth;}
function scrH(){return document.documentElement.clientHeight||innerHeight;}
function viewW(){return ROT?scrH():innerWidth;}
function viewH(){return ROT?scrW():innerHeight;}
function toView(cx,cy){return ROT?{x:cy,y:scrW()-cx}:{x:cx,y:cy};}

/* ---------- Outils ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
function smoothstep(e0,e1,x){const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);}
function wrapAng(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=mulberry32(1987);

// Identifiant unique d'un objet du monde (billot, véhicule, construction…), le même chez tous les joueurs
const UID_PRE=Math.random().toString(36).slice(2,6);let uidN=0;
function uid(){return UID_PRE+Date.now().toString(36)+(++uidN).toString(36);}
