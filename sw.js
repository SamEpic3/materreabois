/* Service worker : le jeu s'installe comme une app et fonctionne hors ligne.
   Fichiers du jeu : réseau d'abord (pour recevoir les mises à jour), copie locale si hors ligne.
   Three.js (CDN) : copie locale d'abord, puisqu'il ne change jamais. */
const VERSION='terre-a-bois-v83';
const FICHIERS=[
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/outils.js',
  'js/plan.js','js/monde.js',
  'js/personnage.js',
  'js/vehicules.js',
  'js/etat.js',
  'js/controles.js',
  'js/magasin.js',
  'js/inventaire.js',
  'js/apparence.js',
  'js/actions.js',
  'js/debusqueuse.js','js/abatteuse.js',
  'js/grue.js',
  'js/interactions.js',
  'js/marche.js',
  'js/erabliere.js',
  'js/vente.js',
  'js/fendeuse.js','js/dechiqueteuse.js','js/chaloupe.js','js/constructions.js','js/camp.js','js/sechage.js','js/evaporateur.js','js/cabane.js','js/peche.js','js/commandes.js','js/terres.js',
  'js/plantation.js',
  'js/joueur.js',
  'js/physique.js','js/poussee.js','js/plateau.js','js/moto.js','js/empilage.js',
  'js/hud.js',
  'js/ciel.js',
  'js/sons.js',
  'js/oiseaux.js',
  'js/animaux.js','js/chasse.js','js/klaxon.js','js/drone.js',
  'js/joueurs.js','js/sauvegarde.js','js/reseau.js','js/carte.js','js/interface.js',
  'js/boucle.js',
  'js/pwa.js',
  'icones/icone-192.png',
  'icones/icone-512.png',
  'icones/icone-maskable-512.png',
  'icones/apple-touch-icon.png'
];
const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FICHIERS).then(()=>c.add(THREE_URL).catch(()=>{}))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  if(req.url===THREE_URL){e.respondWith(caches.match(req).then(r=>r||fetch(req).then(n=>{const c=n.clone();caches.open(VERSION).then(k=>k.put(req,c));return n;})));return;}
  if(new URL(req.url).origin!==location.origin)return;
  e.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put(req,copy));return r;})
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
