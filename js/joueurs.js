/* Joueurs et journal : prépare le jeu à deux.
   La partie est séparée en deux : le MONDE (forêt, argent, véhicules, constructions… partagé par tout le monde)
   et les JOUEURS (position, ce qu'il a dans les mains, son outil). Le journal raconte ce que chacun a fait,
   pour qu'on voie ce que l'autre a accompli pendant notre absence.
   Stockage : pour l'instant dans ce navigateur; plus tard, un serveur pourra le remplacer sans toucher au reste. */
const ME_KEY='terre-a-bois-joueur',SAVE_KEY='terre-a-bois-sauvegarde';
const ME=(()=>{let m=null;try{m=JSON.parse(localStorage.getItem(ME_KEY)||'null');}catch(e){}
  if(!m||!m.id)m={id:'j'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:''};return m;})();
function saveMe(){const m=Object.assign({},ME);if(m.tabAlt){m.id=m.id.replace(/~.*$/,'');m.name=m.name.replace(/ \(\d+\)$/,'');delete m.tabAlt;}try{localStorage.setItem(ME_KEY,JSON.stringify(m));}catch(e){}}
function myName(){return ME.name||'Moi';}

/* ----- Stockage (à remplacer par le serveur plus tard) ----- */
// Chaque terre partagée a sa propre copie dans le navigateur (clé avec le code de la terre).
const Stockage={
  key:SAVE_KEY,
  charger(k){try{return JSON.parse(localStorage.getItem(k||this.key)||'null');}catch(e){return null;}},
  sauver(d){try{localStorage.setItem(this.key,JSON.stringify(d));}catch(e){}},
  effacer(k){try{localStorage.removeItem(k||this.key);}catch(e){}}
};

/* ----- Journal ----- */
S.journal=[];               // {t, who, k?, n?, m?, txt}
const JOURNAL_MAX=200,JOURNAL_MERGE=45*60*1000;   // les actions répétées dans les 45 min se regroupent
function jlog(txt){S.journal.push({id:uid(),t:Date.now(),who:ME.id,txt});trimJournal();}
const pl=(n,a,b)=>n>1?b:a;
// Texte de chaque sorte d'action répétée (n : combien, m : argent)
const JFMT={
  bois:(n,m)=>`a vendu ${n} ${pl(n,'billot','billots')} de sciage (+${m} $)`,
  fendu:(n,m)=>`a vendu ${n} ${pl(n,'morceau','morceaux')} de bois fendu (+${m} $)`,
  chauffage:(n,m)=>`a vendu ${n} ${pl(n,'bûche','bûches')} de chauffage (+${m} $)`,
  sirop:(n,m)=>`a vendu ${fmtL(n)} de sirop (+${m} $)`,
  plant:n=>`a planté ${n} ${pl(n,'arbre','arbres')}`,
  fendre:n=>`a fendu ${n} ${pl(n,'bûche','bûches')}`,
  peche:n=>`a pêché ${n} ${pl(n,'poisson','poissons')}`
};
// Regroupe avec la dernière ligne de la même sorte du même joueur (même s'il y a eu d'autres lignes entre les deux)
function jcount(k,n,m){
  const now=Date.now();let e=null;
  for(let i=S.journal.length-1;i>=Math.max(0,S.journal.length-40);i--){const x=S.journal[i];if(now-x.t>JOURNAL_MERGE)break;if(x.k===k&&x.who===ME.id){e=x;S.journal.splice(i,1);break;}}
  if(e){e.n+=n;e.m+=m;e.t=now;e.txt=JFMT[k](e.n,e.m);S.journal.push(e);}
  else S.journal.push({id:uid(),t:now,who:ME.id,k,n,m,txt:JFMT[k](n,m)});
  trimJournal();
}
// Ménage des anciens journaux : regroupe les lignes répétées proches dans le temps
function compactJournal(){
  const out=[];
  S.journal.slice().sort((a,b)=>a.t-b.t).forEach(x=>{
    if(x.k&&JFMT[x.k]){
      for(let i=out.length-1;i>=0;i--){const y=out[i];if(x.t-y.t>JOURNAL_MERGE)break;
        if(y.k===x.k&&y.who===x.who){y.n+=x.n||0;y.m+=x.m||0;y.t=x.t;y.txt=JFMT[y.k](y.n,y.m);out.splice(i,1);out.push(y);return;}}
    }
    out.push(x);
  });
  S.journal=out;trimJournal();
}
function trimJournal(){if(S.journal.length>JOURNAL_MAX)S.journal.splice(0,S.journal.length-JOURNAL_MAX);}
const J={
  wood:(c,pr)=>jcount(c.len>=SAW_MIN?'bois':c.split?'fendu':'chauffage',1,pr),
  syrup:(L,pr)=>jcount('sirop',L,pr),
  plant:()=>jcount('plant',1,0),
  split:()=>jcount('fendre',1,0),
  fish:()=>jcount('peche',1,0),
  buy:(what,pr)=>jlog(`a acheté ${what} (${pr} $)`),
  sell:(what,pr)=>jlog(`a vendu ${what} (+${pr} $)`),
  build:(what)=>jlog(`a construit ${what}`),
  move:(what)=>jlog(`a déplacé ${what}`),
  demo:(what,pr)=>jlog(`a démoli ${what} (+${pr} $)`)
};
function whoName(id){if(id===ME.id)return myName();const n=typeof NET!=='undefined'&&NET.online[id];if(n&&n.name)return n.name;const o=S.others[id];return o&&o.name||'Quelqu\'un';}
function ago(t){const s=(Date.now()-t)/1000;if(s<60)return 'à l\'instant';const m=Math.round(s/60);if(m<60)return `il y a ${m} min`;const h=Math.round(m/60);if(h<48)return `il y a ${h} h`;return `il y a ${Math.round(h/24)} jours`;}
function renderJournal(){
  const L=$('journalList');
  if(!S.journal.length){L.innerHTML='<p class="empty">Rien encore. Tout ce que vous faites sur la terre sera noté ici.</p>';return;}
  L.innerHTML=S.journal.slice().reverse().map(e=>`<div class="jl"><span class="when">${ago(e.t)}</span><b>${whoName(e.who)}</b> ${e.txt}</div>`).join('');
}
function openJournal(){renderJournal();$('journal').classList.remove('hidden');for(const k in keys)keys[k]=false;}
function closeJournal(){$('journal').classList.add('hidden');}
$('btnJournal').addEventListener('click',openJournal);
$('journalClose').addEventListener('click',closeJournal);

/* ----- Les autres joueurs : on voit leur bonhomme là où ils se sont arrêtés ----- */
S.others={};                // id → {name, player:{x,z,rot,...}, tool, seedSel, t}
const SHOW_OFFLINE=false;   // montrer le bonhomme des joueurs déconnectés là où ils se sont arrêtés (désactivé)
const otherFigs=[];
function showOthers(){
  otherFigs.forEach(f=>{scene.remove(f.g);scene.remove(f.l);const i=labels.indexOf(f.l);if(i>=0)labels.splice(i,1);});otherFigs.length=0;
  for(const id in S.others){
    const o=S.others[id],p=o.player;if(!p||!SHOW_OFFLINE||(typeof NET!=='undefined'&&NET.online[id]))continue;
    const f=makePlayer();[f.axe,f.saw,f.chain,f.shovel,f.carryLog].forEach(m=>{if(m)m.visible=false;});
    f.g.position.set(p.x,H(p.x,p.z),p.z);f.g.rotation.y=p.rot||0;scene.add(f.g);
    otherFigs.push({g:f.g,l:label(o.name||'Partenaire',p.x,H(p.x,p.z)+2.6,p.z,12)});
  }
}

/* ----- Nom du joueur (écran de départ) ----- */
{
  const inp=$('playerName');inp.value=ME.name;
  inp.addEventListener('input',()=>{ME.name=inp.value.trim().slice(0,20);saveMe();});
  saveMe();
}
