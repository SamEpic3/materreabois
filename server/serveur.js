/* Serveur de « Ma terre à bois »
   - Chaque terre a un code (ex. « aubut ») : les joueurs qui entrent le même code partagent la même terre.
   - Le serveur ne fait pas tourner le jeu : il relaie les changements entre les joueurs en ligne,
     garde la dernière photo complète de la terre (envoyée par « l'hôte », le premier joueur arrivé)
     et les changements faits depuis, puis enregistre le tout dans Postgres (ou en mémoire, pour les essais). */
const http=require('http');
const {WebSocketServer}=require('ws');

const PORT=process.env.PORT||8080;
const LOG_MAX=4000;               // changements gardés depuis la dernière photo
const SAVE_EVERY=30*1000;         // écriture en base au plus toutes les 30 s par terre

/* ----- Stockage ----- */
let db=null;
async function initDb(){
  if(!process.env.DATABASE_URL){console.log('Pas de DATABASE_URL : terres gardées en mémoire seulement');return;}
  const {Pool}=require('pg');
  // Connexion interne Render : sans SSL; adresse externe : avec SSL. On essaie les deux.
  for(const ssl of process.env.PGSSL==='1'?[{rejectUnauthorized:false},false]:[false,{rejectUnauthorized:false}]){
    const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl,max:3});
    try{
      await pool.query('CREATE TABLE IF NOT EXISTS terres (code TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
      db=pool;pool.on('error',e=>console.error('Base de données :',e.message));
      console.log('Base de données prête'+(ssl?' (SSL)':''));return;
    }catch(e){console.error('Connexion à la base impossible'+(ssl?' (SSL)':'')+' :',e.message);try{await pool.end();}catch(_){}}
  }
  console.error('On continue sans base : les terres ne survivront pas à un redémarrage');
}
const memStore=new Map();
async function loadRoomData(code){
  if(!db)return memStore.get(code)||null;
  const r=await db.query('SELECT data FROM terres WHERE code=$1',[code]);
  return r.rows[0]?r.rows[0].data:null;
}
async function storeRoomData(code,data){
  if(!db){memStore.set(code,JSON.parse(JSON.stringify(data)));return;}
  await db.query('INSERT INTO terres(code,data,updated_at) VALUES($1,$2,now()) ON CONFLICT(code) DO UPDATE SET data=EXCLUDED.data, updated_at=now()',[code,data]);
}

/* ----- Terres en cours ----- */
// room : {code, loaded, snap:{data,applied,by,rseq}|null, log:[{seq,from,ops}], seq, players:{id:{...}}, clients:Map(id→ws), host, dirty, timer, waiting:[ws]}
const rooms=new Map();
async function getRoom(code){
  let r=rooms.get(code);
  if(r){if(r.loading)await r.loading;return r;}
  r={code,snap:null,log:[],seq:0,players:{},chat:[],clients:new Map(),host:null,dirty:false,timer:null,pendingJoin:[]};
  rooms.set(code,r);
  r.loading=(async()=>{
    try{const d=await loadRoomData(code);if(d){r.snap=d.snap||null;r.log=d.log||[];r.seq=d.seq||0;r.players=d.players||{};r.chat=d.chat||[];}}
    catch(e){console.error('Lecture impossible',code,e.message);}
  })();
  await r.loading;r.loading=null;return r;
}
function persist(r,now){
  r.dirty=true;
  if(now){clearTimeout(r.timer);r.timer=null;return flush(r);}
  if(!r.timer)r.timer=setTimeout(()=>{r.timer=null;flush(r);},SAVE_EVERY);
}
async function flush(r){
  if(!r.dirty||!r.snap)return;r.dirty=false;
  try{await storeRoomData(r.code,{snap:r.snap,log:r.log,seq:r.seq,players:r.players,chat:r.chat});}
  catch(e){r.dirty=true;console.error('Écriture impossible',r.code,e.message);}
}

const send=(ws,m)=>{if(ws.readyState===1)ws.send(JSON.stringify(m));};
function broadcast(r,m,except){const s=JSON.stringify(m);r.clients.forEach((ws,id)=>{if(id!==except&&ws.readyState===1)ws.send(s);});}
function online(r){return [...r.clients.keys()].map(id=>({id,name:(r.players[id]||{}).name||''}));}
// Changements à rejouer par-dessus la photo (sans ceux que l'hôte avait déjà inclus dans sa photo)
function opsAfterSnap(r){
  const s=r.snap;if(!s)return r.log;
  return r.log.filter(e=>e.seq>s.applied&&!(e.from===s.by&&e.seq<=s.rseq));
}
function welcome(r,ws,id){
  send(ws,{t:'welcome',snap:r.snap?r.snap.data:null,ops:opsAfterSnap(r),seq:r.seq,host:r.host,you:id,online:online(r),players:r.players,chat:r.chat});
}
function pickHost(r){
  const prev=r.host;
  r.host=r.clients.size?[...r.clients.keys()][0]:null;
  if(r.host!==prev&&r.host)broadcast(r,{t:'host',id:r.host});
}

/* ----- Connexions ----- */
const server=http.createServer(async (req,res)=>{
  // Diagnostic : /terre/<code> dit si la terre est bien enregistrée en base (sans montrer son contenu)
  const mt=/^\/terre\/([^/?]+)/.exec(req.url||'');
  if(mt){
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});
    try{const d=await loadRoomData(decodeURIComponent(mt[1]).toLowerCase());res.end(JSON.stringify({base:!!db,existe:!!d,seq:d?d.seq:null,photo:!!(d&&d.snap),taille:d?JSON.stringify(d).length:0}));}
    catch(e){res.end(JSON.stringify({erreur:e.message}));}
    return;
  }
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
  res.end('Ma terre à bois : serveur en marche ('+rooms.size+' terre(s) ouverte(s))');
});
const wss=new WebSocketServer({server,maxPayload:8*1024*1024});
wss.on('connection',ws=>{
  let r=null,id=null;ws.alive=true;
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',async raw=>{
    let m;try{m=JSON.parse(raw);}catch(e){return;}
    if(m.t==='hello'){
      const code=String(m.room||'').trim().toLowerCase().slice(0,40);
      if(!code||!m.id){send(ws,{t:'error',msg:'Code de terre manquant'});return;}
      r=await getRoom(code);id=String(m.id).slice(0,40);
      const old=r.clients.get(id);if(old&&old!==ws){try{old.close(4000,'remplacé');}catch(e){}}
      r.clients.set(id,ws);
      r.players[id]=Object.assign(r.players[id]||{},{name:String(m.name||'').slice(0,20)});
      if(!r.host||!r.clients.has(r.host))pickHost(r);
      // Reprise après une courte coupure : on renvoie seulement ce qui a manqué
      if(m.resume&&typeof m.lastSeq==='number'&&r.snap&&r.log.length&&r.log[0].seq<=m.lastSeq+1){
        send(ws,{t:'resume',ops:r.log.filter(e=>e.seq>m.lastSeq),seq:r.seq,host:r.host,you:id,online:online(r)});
      }else if(m.resume&&r.snap&&!r.log.length&&m.lastSeq===r.seq){
        send(ws,{t:'resume',ops:[],seq:r.seq,host:r.host,you:id,online:online(r)});
      }else if(m.resume&&r.snap){
        send(ws,{t:'resync'});
      }else if(r.host!==id){
        // Un autre joueur est déjà là : on lui demande une photo fraîche avant d'accueillir le nouveau
        r.pendingJoin.push({ws,id});send(r.clients.get(r.host),{t:'snapReq'});
        setTimeout(()=>{const i=r.pendingJoin.findIndex(p=>p.ws===ws);if(i>=0){r.pendingJoin.splice(i,1);welcome(r,ws,id);}},8000);
      }else welcome(r,ws,id);
      console.log(`[${code}] ${id} arrive (${r.clients.size} en ligne)`);
      broadcast(r,{t:'joined',id,name:r.players[id].name},id);
      return;
    }
    if(!r)return;
    if(m.t==='bye'){leave('au revoir');try{ws.close();}catch(e){}return;}
    if(m.t==='op'&&Array.isArray(m.ops)){
      const e={seq:++r.seq,from:id,ops:m.ops};r.log.push(e);
      if(r.log.length>LOG_MAX)r.log.splice(0,r.log.length-LOG_MAX);
      broadcast(r,{t:'op',seq:e.seq,from:id,ops:m.ops},id);
      send(ws,{t:'ack',seq:e.seq});
      persist(r);
    }else if(m.t==='chat'){
      // Clavardage : on garde les 50 derniers messages de la terre
      const txt=String(m.txt||'').replace(/\s+/g,' ').trim().slice(0,200);if(!txt)return;
      const e={t:Date.now(),from:id,name:(r.players[id]||{}).name||'',txt};
      r.chat.push(e);if(r.chat.length>50)r.chat.splice(0,r.chat.length-50);
      broadcast(r,{t:'chat',m:e});persist(r);
    }else if(m.t==='pos'){
      broadcast(r,{t:'pos',from:id,p:m.p},id);
    }else if(m.t==='me'){
      r.players[id]=Object.assign(r.players[id]||{},m.me||{},{name:(m.me&&m.me.name)||(r.players[id]||{}).name||''});
      persist(r);
    }else if(m.t==='snap'&&m.data){
      // Photo complète (de l'hôte, ou du premier joueur d'une nouvelle terre)
      if(r.snap&&id!==r.host)return;
      r.snap={data:m.data,applied:typeof m.applied==='number'?m.applied:r.seq,by:id,rseq:r.seq};
      const keepFrom=r.snap.applied;r.log=r.log.filter(e=>e.seq>keepFrom);
      if(m.data.players)for(const pid in m.data.players)if(!r.players[pid])r.players[pid]=m.data.players[pid];
      const waiting=r.pendingJoin.splice(0);waiting.forEach(p=>welcome(r,p.ws,p.id));
      persist(r,!!m.urgent);
    }
  });
  function leave(why){
    if(!r||r.clients.get(id)!==ws)return;
    console.log(`[${r.code}] ${id} part (${why})`);
    r.clients.delete(id);broadcast(r,{t:'left',id});
    if(r.host===id)pickHost(r);
    if(!r.clients.size){persist(r,true);}
  }
  ws.on('close',()=>leave('fermeture'));
});
// Garde les connexions en vie et détecte celles qui sont mortes
setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.alive){ws.terminate();return;}ws.alive=false;try{ws.ping();}catch(e){}});},15000);
// Libère la mémoire des terres sans joueur
setInterval(()=>{rooms.forEach((r,code)=>{if(!r.clients.size&&!r.dirty&&!r.timer)rooms.delete(code);});},10*60*1000);
async function shutdown(){for(const r of rooms.values())await flush(r);process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);

initDb().catch(e=>console.error('Base de données indisponible :',e.message)).finally(()=>{
  server.listen(PORT,()=>console.log('Serveur de Ma terre à bois sur le port '+PORT));
});
