/* fstrekk — draw dive pools for a skydiving championship.
   Pure vanilla JS, no build step. State persisted in localStorage.
   Formation images are the official FAI / NLF dive-pool diagrams,
   cropped one tile per random (letter) and per block (number). */

'use strict';

/* ---------- pool definitions ---------- */
// FS/VFS 4-way use letters A..Q skipping I (16). 2-way uses A..H (8).
const L16 = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q'];
const L8  = ['A','B','C','D','E','F','G','H'];
const LSF = ['A','B','C','D','E','F','G','H','J','K']; // 6-way speed, 10
const rng = (n) => Array.from({length:n}, (_,i)=>i+1);

// random-formation names (block names live inside each image, so blocks show number only)
const NAMES = {
  fs4:{A:'Unipod',B:'Stairstep Diamond',C:'Murphy Flake',D:'Yuan',E:'Meeker',F:'Open Accordion',
       G:'Cataccord',H:'Bow',J:'Donut',K:'Hook',L:'Adder',M:'Star',N:'Crank',O:'Satellite',P:'Sidebody',Q:'Phalanx'},
  vfs4:{A:'Cross',B:'Gulley',C:'Shoeshine',D:'Box',E:'Wave',F:'Double Joker',G:'Mixed Star',H:'T-Bird',
        J:'Flock',K:'Anchor',L:'Rebel',M:'Chemtrails',N:'Double Rebel',O:'Trident',P:'Cortex',Q:'Mixed Wave'},
  fs8:{A:'Caterpillar',B:'Stairstep',C:'Hourglass',D:'Hope Diamond',E:'Rubik',F:'Diamond Flake',G:'Arrowhead',
       H:'Iroquois',J:'Springbok',K:'Double Meekers',L:'Open Facing Diamond',M:'Double Spiders',N:'Zipper Flake',
       O:'Compressed Accordion',P:'Venus',Q:'Compass'},
  fs2:{A:'Caterpillar',B:'Star',C:'Compressed',D:'Sidebody',E:'Line',F:'Open',G:'Bipole',H:'Phalanx'},
  vfs2:{A:'Mixed Accordion',B:'Sole to Sole',C:'Frozen Buddies',D:'Head Down Star',E:'Broken Trident',
        F:'Inface Totem',G:'Head Up Star',H:'Stomping Pelican'},
  six:{A:'Star',B:'Propeller',C:'Buzzard',D:'Double Phalanx',E:'Nacho',F:'Compressed Accordion',
       G:'Reversed Arrowhead',H:'Zipper',J:'Crank',K:'Donut Flake'},
};

// each discipline: label, image folder, random letters, block numbers,
// the officially-used default subset, and sensible round defaults.
const DISCIPLINES = {
  fs4 : {label:'FS-4 Open',            img:'fs4',  randoms:L16, blocks:rng(22), defRandoms:'all', defBlocks:'all',
         rounds:6, pts:5, names:NAMES.fs4,  note:'Full FAI 4-way pool — all randoms and all 22 blocks.'},
  fsi4: {label:'FS-4 Intermediate',    img:'fs4',  randoms:L16, blocks:rng(22), defRandoms:'all',
         defBlocks:[2,4,6,7,8,9,19,21], rounds:6, pts:3, names:NAMES.fs4, note:'All randoms; blocks 2,4,6,7,8,9,19,21.'},
  fs8 : {label:'FS-8',                 img:'fs8',  randoms:L16, blocks:rng(22), defRandoms:'all',
         defBlocks:[1,3,4,5,6,7,8,10,13,14,15,16,17,18,19], rounds:6, pts:4, names:NAMES.fs8,
         note:'8-way pool — all randoms; NM block set 1,3,4,5,6,7,8,10,13-19. 4-5 poeng/runde.'},
  vfs4: {label:'VFS-4',                img:'vfs4', randoms:L16, blocks:rng(22), defRandoms:'all', defBlocks:'all',
         rounds:6, pts:5, names:NAMES.vfs4, note:'Full VFS 4-way pool — all randoms and all 22 blocks.'},
  vfs2: {label:'VFS-2',                img:'vfs2', randoms:L8,  blocks:rng(8),  defRandoms:'all', defBlocks:'all',
         rounds:6, pts:3, names:NAMES.vfs2, note:'VFS 2-way — all randoms and all 8 blocks.'},
  fs2 : {label:'FS-2 Nybegynner',      img:'fs2',  randoms:L8,  blocks:rng(15), defRandoms:'all', defBlocks:'all',
         rounds:6, pts:3, names:NAMES.fs2,  note:'Beginner 2-way pool (FNLF) — 8 randoms, 15 blocks.'},
  six : {label:'6-way Speed (SF)',     img:'six',  randoms:LSF, blocks:[],      defRandoms:'all', defBlocks:[],
         rounds:4, pts:1, single:true, firstFixed:'A', names:NAMES.six,
         note:'Speed Formation (prøvegren) — én formasjon per runde, tas på tid. 4 runder; runde 1 er alltid Stjerne (A). Trekkes uten tilbakelegging.'},
};
const ORDER = ['fs4','fsi4','fs8','vfs4','vfs2','fs2','six'];

/* ---------- state / persistence ---------- */
const KEY = 'fstrekk.v1';
let state = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s&&s.disciplines) return s; }catch(e){}
  return { event:{title:'NM Fallskjerm 2026 — Østre Æra', date:''}, disciplines:[] };
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
const uid = () => Math.random().toString(36).slice(2,9);

/* ---------- element helpers ---------- */
function imgPath(folder,kind,code){ return `img/${folder}/${kind==='R'?'random':'block'}_${code}.png`; }
function elFor(disc,kind,code){
  return { kind, code:String(code),
           name: kind==='R' ? (DISCIPLINES[disc.type].names[code]||'') : '',
           img: imgPath(disc.img,kind,code),
           pts: kind==='B' ? 2 : 1 };
}

// FAI CR-FS 4.2.2/4.2.3: the whole pool goes in one container and is drawn
// WITHOUT REPLACEMENT — each block/random is drawn at most once across all
// scheduled rounds of the discipline. A round fills until it reaches its point
// target (5 or 6, whichever comes first — a block may overshoot 4->6).
function usedSet(disc){
  const s = new Set();
  disc.draws.forEach(r => r && r.forEach(e => s.add(e.kind + e.code)));
  return s;
}
// total elements available in the pool vs. what the rounds need.
// Speed Formation draws one formation per round (timed), so its pool is counted
// per formation and each round needs exactly one.
function poolCapacity(disc){ return disc.single ? disc.pool.randoms.length : disc.pool.randoms.length + disc.pool.blocks.length*2; }
function poolNeeded(disc){ return disc.single ? disc.rounds : disc.rounds * disc.pts; }

function drawNext(disc, roundIdx){
  const roundEls = disc.draws[roundIdx];
  const pts = roundEls.reduce((s,e)=>s+e.pts,0);
  // Speed Formation: exactly one formation per round. Everything else: fill to the point target.
  if(disc.single ? roundEls.length >= 1 : pts >= disc.pts) return null;
  // Speed Formation: round 1 is always formation A (Star) — fixed, not drawn.
  if(disc.firstFixed && roundIdx === 0 && roundEls.length === 0) return elFor(disc,'R',disc.firstFixed);
  const used = usedSet(disc);                       // no replacement across the whole discipline
  let cand = [];
  disc.pool.randoms.forEach(c=>{ if(!used.has('R'+c)) cand.push(['R',c]); });
  disc.pool.blocks.forEach(n=>{ if(!used.has('B'+n)) cand.push(['B',n]); });
  // pool exhausted for the meet — fall back to anything not already in THIS round,
  // so a too-small pool still never repeats within a single round.
  if(!cand.length){
    const inRound = new Set(roundEls.map(e=>e.kind+e.code));
    disc.pool.randoms.forEach(c=>{ if(!inRound.has('R'+c)) cand.push(['R',c]); });
    disc.pool.blocks.forEach(n=>{ if(!inRound.has('B'+n)) cand.push(['B',n]); });
  }
  if(!cand.length) return null;
  const [k,c] = cand[Math.floor(Math.random()*cand.length)];
  return elFor(disc,k,c);
}
function roundDone(disc, roundEls){
  if(disc.single) return roundEls.length >= 1;
  return roundEls.reduce((s,e)=>s+e.pts,0) >= disc.pts;
}

/* ---------- view routing ---------- */
function initView(){
  const h=location.hash;
  if(h==='#sheet') return {name:'sheet'};
  if(h==='#new')   return {name:'setup', type:'fs4', draft:null};
  if(h.startsWith('#draw-')){ const id=h.slice(6); if(findDisc(id)) return {name:'draw',uid:id}; }
  return {name:'home'};
}
let view = initView();
const app = document.getElementById('app');
function go(v){
  view=v;
  const hash = v.name==='sheet'?'#sheet' : v.name==='draw'?('#draw-'+v.uid) : '#';
  if(location.hash!==hash) history.replaceState(null,'',hash);
  render(); window.scrollTo(0,0);
}

function render(){
  if(view.name==='home')  return renderHome();
  if(view.name==='setup') return renderSetup(view);
  if(view.name==='draw')  return renderDraw(view.uid);
  if(view.name==='sheet') return renderSheet();
}

/* ---------- home ---------- */
function renderHome(){
  const ds = state.disciplines;
  const totalRounds = ds.reduce((s,d)=>s+d.rounds,0);
  const doneRounds  = ds.reduce((s,d)=>s+d.draws.filter(r=>r&&r.length&&roundDone(d,r)).length,0);
  app.innerHTML = `
    <a class="nm-logo" href="https://www.nmfallskjerm.no/" target="_blank" rel="noopener">
      <img src="img/nm-logo.png" alt="NM Skydive Oslo — 3.–8. august 2026">
    </a>
    <div class="hero">
      <div style="flex:1">
        <input class="event-title" id="evtTitle" value="${esc(state.event.title)}">
        <div class="event-sub">Trekning av dive pools · lagres i nettleseren${totalRounds?` · ${doneRounds}/${totalRounds} runder trukket`:''}</div>
      </div>
      <div style="display:flex;gap:8px">
        ${ds.length?`<button class="btn" onclick="go({name:'sheet'})">Vis fasit</button>`:''}
      </div>
    </div>
    <div class="section-title">Grener</div>
    <div class="disc-grid">
      ${ds.map(discCard).join('')}
      <button class="add-card card" onclick="startSetup()">+ Legg til gren</button>
    </div>
    ${ds.length?`<div style="margin-top:28px"><button class="btn ghost danger" onclick="clearAll()">Nullstill alt</button></div>`:''}
  `;
  document.getElementById('evtTitle').addEventListener('change',e=>{ state.event.title=e.target.value; save(); });
}
function discCard(d){
  const done = d.draws.filter(r=>r&&r.length&&roundDone(d,r)).length;
  const pct = Math.round(done/d.rounds*100);
  const complete = done>=d.rounds;
  const poolTxt = d.single ? `${d.pool.randoms.length} formasjoner`
    : `${d.pool.randoms.length} randoms`+(d.pool.blocks.length?` · ${d.pool.blocks.length} blocks`:' · ingen blocks');
  const cadence = d.single ? 'én formasjon/runde (tas på tid)' : `${d.pts} poeng/runde`;
  return `<div class="card disc-card">
    <div class="dh"><h3>${esc(d.label)}</h3>
      <span class="pill ${complete?'done':'todo'}">${complete?'ferdig':`${done}/${d.rounds}`}</span></div>
    <div class="meta">${poolTxt}<br>${d.rounds} runder · ${cadence}</div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="actions">
      <button class="btn primary" onclick="go({name:'draw',uid:'${d.uid}'})">${done?'Fortsett':'Trekk'}</button>
      <button class="btn ghost danger" onclick="removeDisc('${d.uid}')">Fjern</button>
    </div>
  </div>`;
}

/* ---------- setup ---------- */
function startSetup(){ go({name:'setup', type:'fs4', draft:null}); }
function renderSetup(v){
  const type = v.type;
  const def = DISCIPLINES[type];
  // draft holds current selections; seed from official defaults on (re)load of a type
  if(!v.draft || v.draft._type!==type){
    v.draft = {
      _type:type,
      randoms: new Set(def.defRandoms==='all'?def.randoms:def.defRandoms),
      blocks:  new Set(def.defBlocks==='all'?def.blocks:def.defBlocks),
      rounds: def.rounds, pts:def.pts,
    };
  }
  const dr = v.draft;
  const chip = (val,label,name,on) =>
    `<div class="chip ${on?'on':''}" onclick="toggleChip('${val[0]}','${val[1]}')">${label}${name?`<small>${esc(name)}</small>`:''}</div>`;
  app.innerHTML = `
    <div class="card setup">
      <h2>Ny gren</h2>
      <div class="event-sub" style="padding-left:0">${esc(def.note)}</div>

      <div class="field">
        <label>Gren</label>
        <select id="discType" onchange="changeType(this.value)">
          ${ORDER.map(t=>`<option value="${t}" ${t===type?'selected':''}>${esc(DISCIPLINES[t].label)}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label>Randoms <span class="hint">(bokstaver i puljen)</span></label>
        <div class="chip-tools">
          <button class="btn" onclick="poolAll('R')">Alle</button>
          <button class="btn" onclick="poolNone('R')">Ingen</button>
          <button class="btn" onclick="poolReset('R')">Offisiell</button>
        </div>
        <div class="chips">
          ${def.randoms.map(c=>chip(['R',c],c,def.names[c],dr.randoms.has(c))).join('')}
        </div>
      </div>

      ${def.blocks.length?`
      <div class="field">
        <label>Blocks <span class="hint">(tall i puljen)</span></label>
        <div class="chip-tools">
          <button class="btn" onclick="poolAll('B')">Alle</button>
          <button class="btn" onclick="poolNone('B')">Ingen</button>
          <button class="btn" onclick="poolReset('B')">Offisiell</button>
        </div>
        <div class="chips">
          ${def.blocks.map(n=>chip(['B',n],n,'',dr.blocks.has(n))).join('')}
        </div>
      </div>`:''}

      <div class="field inline">
        <div><label>Antall runder</label>
          <input type="number" id="fRounds" min="1" max="20" value="${dr.rounds}"></div>
        ${def.single ? `<div class="hint" style="align-self:center">Speed: én formasjon trekkes per runde, tas på tid.</div>`
          : `<div><label>Poeng per runde</label>
          <input type="number" id="fPts" min="1" max="12" value="${dr.pts}"></div>`}
      </div>

      <div class="foot">
        <button class="btn" onclick="go({name:'home'})">Avbryt</button>
        <button class="btn primary big" onclick="createDisc()">Opprett gren →</button>
      </div>
    </div>`;
}
function changeType(t){ view.type=t; view.draft=null; render(); }
function toggleChip(kind,code){
  const s = kind==='R'?view.draft.randoms:view.draft.blocks;
  const key = kind==='R'?code:Number(code);
  if(s.has(key)) s.delete(key); else s.add(key);
  render();
}
function poolAll(kind){
  const def=DISCIPLINES[view.type];
  view.draft[kind==='R'?'randoms':'blocks'] = new Set(kind==='R'?def.randoms:def.blocks); render();
}
function poolNone(kind){ view.draft[kind==='R'?'randoms':'blocks'] = new Set(); render(); }
function poolReset(kind){
  const def=DISCIPLINES[view.type];
  const d = kind==='R'?def.defRandoms:def.defBlocks;
  const all = kind==='R'?def.randoms:def.blocks;
  view.draft[kind==='R'?'randoms':'blocks'] = new Set(d==='all'?all:d); render();
}
function syncNums(){
  view.draft.rounds = clamp(+document.getElementById('fRounds').value||1,1,20);
  const fPts = document.getElementById('fPts');
  view.draft.pts = fPts ? clamp(+fPts.value||1,1,12) : 1;   // Speed Formation has no points field
}
function createDisc(){
  syncNums();
  const def = DISCIPLINES[view.type];
  const randoms = def.randoms.filter(c=>view.draft.randoms.has(c));
  const blocks  = def.blocks.filter(n=>view.draft.blocks.has(n));
  if(!randoms.length && !blocks.length){ toast('Velg minst ett element i puljen'); return; }
  const d = {
    uid:uid(), type:view.type, label:def.label, img:def.img, single:!!def.single, firstFixed:def.firstFixed||null,
    pool:{randoms, blocks}, rounds:view.draft.rounds, pts:view.draft.pts,
    draws: Array.from({length:view.draft.rounds},()=>[]), cur:0,
  };
  state.disciplines.push(d); save();
  go({name:'draw', uid:d.uid});
}

/* ---------- draw view ---------- */
function findDisc(id){ return state.disciplines.find(d=>d.uid===id); }
function renderDraw(id){
  const d = findDisc(id); if(!d) return go({name:'home'});
  const r = d.cur;
  const els = d.draws[r]||[];
  const done = roundDone(d,els);
  const pts = els.reduce((s,e)=>s+e.pts,0);
  const last = els[els.length-1];

  const stage = last ? `
    <div class="reveal">
      <div class="code-hero ${last.kind==='B'?'blk':''}">
        <div class="kind">${d.single?'Formasjon':(last.kind==='R'?'Random':'Block')}</div>
        <div class="code">${last.code}</div>
        ${last.name?`<div class="nm">${esc(last.name)}</div>`:''}
        <div class="pts">${d.single?`Runde ${r+1} · tas på tid`:`element ${els.length} · ${pts}/${d.pts} poeng`}</div>
      </div>
      <div class="imgwrap"><img src="${last.img}" alt="${last.kind} ${last.code}"></div>
    </div>` : `
    <div class="stage idle">
      <div style="font-size:15px">Runde ${r+1} — klar til å trekke</div>
      <div style="font-size:13px">${(d.firstFixed && r===0)
        ? 'Runde 1 er alltid Stjerne (A) — trykk «Trekk formasjon».'
        : (d.single?'Trykk «Trekk formasjon» for rundens formasjon.':'Trykk «Trekk element» for å starte.')}</div>
    </div>`;

  app.innerHTML = `
    <div class="draw-head">
      <div>
        <h2>${esc(d.label)}</h2>
        <div class="sub">${d.single
          ? `${d.pool.randoms.length} formasjoner · én per runde (tas på tid) · trekkes uten tilbakelegging`
          : `${d.pool.randoms.length} randoms${d.pool.blocks.length?` · ${d.pool.blocks.length} blocks`:''} · ${d.pts} poeng/runde · trekkes uten tilbakelegging`}</div>
        ${poolCapacity(d) < poolNeeded(d) ? `<div class="warn-note">${d.single
          ? `⚠ Puljen har ${poolCapacity(d)} formasjoner, men ${d.rounds} runder — noen formasjoner vil gjentas.`
          : `⚠ Puljen er for liten til ${d.rounds} unike runder (${poolCapacity(d)} poeng i puljen, trenger ~${poolNeeded(d)}). Elementer vil måtte gjentas.`}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="go({name:'home'})">← Grener</button>
        <button class="btn" onclick="go({name:'sheet'})">Fasit</button>
      </div>
    </div>

    <div class="round-tabs">
      ${d.draws.map((rd,i)=>{
        const filled = rd.length && roundDone(d,rd);
        return `<button class="round-tab ${i===r?'active':''} ${filled?'filled':''}" onclick="setRound('${id}',${i})">R${i+1}${filled?`<span class="n">✓</span>`:''}</button>`;
      }).join('')}
    </div>

    <div class="card stage">${last?stage:stage}</div>

    <div class="controls">
      <button class="btn primary big" onclick="doDraw('${id}')" ${done?'disabled':''}>${d.single?'Trekk formasjon':(els.length?'Trekk neste':'Trekk element')}</button>
      <button class="btn" onclick="redrawRound('${id}')" ${els.length?'':'disabled'}>Trekk ${d.single?'formasjon':'runde'} på nytt</button>
      ${r < d.rounds-1 ? `<button class="btn" onclick="nextRound('${id}')" ${done?'':'disabled'}>Neste runde →</button>`
                       : `<button class="btn primary" onclick="finishDisc('${id}')" ${done?'':'disabled'}>Fullfør gren ✓</button>`}
      <span class="status">${d.single?(done?'Formasjon trukket':'Klar til å trekke'):(done?'Runde fullført':`${pts}/${d.pts} poeng`)}</span>
    </div>

    <div class="section-title" style="margin-top:8px">Runde ${r+1}</div>
    ${els.length?`<div class="seq">${els.map(e=>seqItem(e,d.single)).join('')}</div>`
                :`<div class="seq-empty">Ingen ${d.single?'formasjon':'elementer'} trukket ennå.</div>`}
  `;
}
function seqItem(e, single){
  return `<div class="seq-item ${e.kind==='B'?'blk':''}">
    <div class="k">${single?'Formasjon':(e.kind==='R'?'Random':'Block')}</div>
    <div class="c">${e.code}</div>
    <img src="${e.img}" alt="">
    ${e.name?`<div class="k" style="margin-top:3px;color:#333">${esc(e.name)}</div>`:''}
  </div>`;
}
function setRound(id,i){ const d=findDisc(id); d.cur=i; save(); render(); }
function doDraw(id){
  const d=findDisc(id);
  const nx=drawNext(d, d.cur); if(!nx) return;
  d.draws[d.cur].push(nx); save(); render();
}
function redrawRound(id){
  const d=findDisc(id);
  if(d.draws[d.cur].length && !confirm('Trekke denne runden på nytt?')) return;
  d.draws[d.cur]=[]; save(); render();
}
function nextRound(id){ const d=findDisc(id); if(d.cur<d.rounds-1){d.cur++; save(); render();} }
function finishDisc(id){ toast('Gren fullført'); go({name:'home'}); }

/* ---------- fasit / print sheet ---------- */
function renderSheet(){
  const ds=state.disciplines;
  app.innerHTML = `
    <div class="draw-head">
      <div><h2>Fasit — ${esc(state.event.title)}</h2>
        <div class="sub">Trukket rekkefølge for alle grener</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="go({name:'home'})">← Grener</button>
        <button class="btn primary" onclick="window.print()">Skriv ut</button>
      </div>
    </div>
    ${ds.length? ds.map(sheetBlock).join('') : `<div class="empty">Ingen grener lagt til ennå.</div>`}
  `;
}
function sheetBlock(d){
  const rows = d.draws.map((els,i)=>{
    if(!els.length) return `<div class="rline"><span class="rlabel">Runde ${i+1}</span><span class="rseq" style="color:#9aa1ad">—</span></div>`;
    const seq = d.single
      ? els.map(e=> `${e.code}${e.name?` <span style="color:var(--muted)">(${esc(e.name)})</span>`:''}`).join('')
      : els.map(e=> e.kind==='B'?`<b>${e.code}</b>`:e.code).join(' – ');
    return `<div class="rline"><span class="rlabel">Runde ${i+1}</span><span class="rseq">${seq}</span></div>`;
  }).join('');
  return `<div class="card sheet">
    <h3>${esc(d.label)}</h3>
    <div class="event-sub" style="padding-left:0">${d.single
      ? `${d.pool.randoms.length} formasjoner · én per runde (tas på tid)`
      : `${d.pool.randoms.length} randoms${d.pool.blocks.length?` · ${d.pool.blocks.length} blocks`:''} · ${d.pts} poeng/runde · <b>blocks i blått</b>`}</div>
    ${rows}
  </div>`;
}

/* ---------- misc ---------- */
function removeDisc(id){
  const d=findDisc(id);
  if(!confirm(`Fjerne «${d.label}»?`)) return;
  state.disciplines = state.disciplines.filter(x=>x.uid!==id); save(); render();
}
function clearAll(){ if(confirm('Slette alle grener og trekninger?')){ state.disciplines=[]; save(); render(); } }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
let toastT;
function toast(msg){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),1800);
}

// expose handlers used from inline onclick
Object.assign(window,{go,startSetup,changeType,toggleChip,poolAll,poolNone,poolReset,createDisc,
  setRound,doDraw,redrawRound,nextRound,finishDisc,removeDisc,clearAll});

render();
