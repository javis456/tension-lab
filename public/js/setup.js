let STRINGS = [], RACKETS = [];

/* ============================================================
   TENSION LAB — data + engine + UI
   ============================================================ */

/* material archetypes drive base color + tendencies */
const MAT = {
  gut:      {label:"Natural gut", color:"var(--m-gut)",     hex:"#D8A24A"},
  multi:    {label:"Multifilament", color:"var(--m-multi)", hex:"#B9BEC2"},
  syn:      {label:"Synthetic gut", color:"var(--m-syn)",   hex:"#8E979A"},
  poly:     {label:"Co-polyester", color:"var(--m-poly)",   hex:"#2E7DB5"},
  polyspin: {label:"Co-poly (shaped)", color:"var(--m-polyspin)", hex:"#1F9B76"},
  polysoft: {label:"Co-poly (soft)", color:"var(--m-polysoft)", hex:"#6E5AA6"},
  kevlar:   {label:"Aramid / Kevlar", color:"var(--m-kevlar)", hex:"#9A6B2E"},
  zyex:     {label:"Zyex monofilament", color:"var(--m-zyex)", hex:"#3FB0A0"},
};

/* ratings r = {pw power, co control, sp spin, cf comfort, fe feel, du durability, tm tension-maint} 0..100
   geo: round | shaped | textured   gauges in mm  tier: $ $$ $$$ $$$$ */
/* rackets: id, brand, model, version, year, pattern [mains,crosses], ra stiffness (RA),
   hs head size (sq in), wt strung weight (g approx), char label, kf blurb.
   Multiple generations included so players can pick their exact frame + year. */
/* pro-inspired presets — clearly approximate */
const PRESETS = [
  {nm:"Sinner-style", flag:"FULL POLY", ds:"Full Head Hawk Touch at a high 61 lb in a Speed MP — flat, precise, control-first power.",
   racketId:"speedmp2024", hybrid:false,
   main:["Head","Hawk Touch",1.30], cross:["Head","Hawk Touch",1.30], tMain:61, tCross:61},
  {nm:"Alcaraz-style", flag:"FULL SPIN", ds:"Full RPM Blast in a control-Aero 98 (16\u00d720) around 55 lb — heavy topspin with control.",
   racketId:"pa98_2026", hybrid:false,
   main:["Babolat","RPM Blast",1.30], cross:["Babolat","RPM Blast",1.30], tMain:55, tCross:55},
  {nm:"Federer-style", flag:"GUT/POLY", ds:"Gut mains + textured ALU crosses in a heavy control 97 — power, feel and touch with poly bite.",
   racketId:"rf97", hybrid:true,
   main:["Wilson","Natural Gut",1.30], cross:["Luxilon","ALU Power Rough",1.25], tMain:50, tCross:48},
  {nm:"Nadal-style", flag:"FULL SPIN", ds:"Full RPM Blast in a spin Aero at ~55 lb — the original heavy-topspin blueprint.",
   racketId:"pa2019", hybrid:false,
   main:["Babolat","RPM Blast",1.35], cross:["Babolat","RPM Blast",1.35], tMain:55, tCross:55},
  {nm:"Djokovic-style", flag:"GUT/POLY", ds:"Premium gut mains + rough ALU crosses in a dense Speed Pro — precision plus comfort.",
   racketId:"speedpro2024", hybrid:true,
   main:["Babolat","VS Touch",1.30], cross:["Luxilon","ALU Power Rough",1.25], tMain:53, tCross:51},
  {nm:"Modern spin baseliner", flag:"FULL POLY", ds:"Full Hyper-G in a VCORE 98 — biting topspin on a budget.",
   racketId:"vcore98_2026", hybrid:false,
   main:["Solinco","Hyper-G",1.20], cross:["Solinco","Hyper-G",1.20], tMain:50, tCross:50},
  {nm:"Sore-arm control", flag:"COMFORT", ds:"Soft poly mains + comfort multi crosses in an ultra-flexible Clash — control that spares the arm.",
   racketId:"clash100v3", hybrid:true,
   main:["Yonex","Poly Tour Pro",1.25], cross:["Tecnifibre","X-One Biphase",1.24], tMain:48, tCross:46},
  {nm:"New-school all-rounder", flag:"BOUTIQUE", ds:"Full Grapplesnake Tour M8 \u2014 a modern do-it-all boutique poly in an all-court frame.",
   racketId:"speedmp2024", hybrid:false,
   main:["Grapplesnake","Tour M8",1.25], cross:["Grapplesnake","Tour M8",1.25], tMain:50, tCross:50},
  {nm:"Chronic breaker", flag:"DURABLE", ds:"Kevlar mains + firm poly crosses in a dense Prestige — for players who destroy everything else.",
   racketId:"prestigepro_2023", hybrid:true,
   main:["Ashaway","Kevlar",1.20], cross:["Luxilon","ALU Power",1.30], tMain:52, tCross:50},
];

/* ============================================================
   STATE
   ============================================================ */
const state = {
  mode:"goal",
  goal:"control", brk:"rare", goalRacketIdx:0,
  racketIdx:0,
  hybrid:false,
  mainId:null, mainG:null,
  crossId:null, crossG:null,
  tMain:52, tCross:50,
  suggested:false,
};

const $ = id => document.getElementById(id);
const strById = id => STRINGS[id];
/* ---- engine glue: all math comes from the shared engine.js ---- */
const ATTRS = TLEngine.ATTRS;
const clamp = TLEngine.clamp;
const round = TLEngine.round;



function computeScores(){
  const racket = state.mode==="goal" ? RACKETS[state.goalRacketIdx] : RACKETS[state.racketIdx];
  const sMain = strById(state.mainId);
  const crossId = state.hybrid ? state.crossId : state.mainId;
  const sCross = strById(crossId);
  const crossG = state.hybrid ? state.crossG : state.mainG;
  const crossT = state.hybrid ? state.tCross : state.tMain;
  const main  = { ratings:sMain.r,  material:sMain.m,  geo:sMain.geo,  gauge:state.mainG, tension:state.tMain };
  const cross = { ratings:sCross.r, material:sCross.m, geo:sCross.geo, gauge:crossG,       tension:crossT };
  const frame = { mains:racket.pat[0], crosses:racket.pat[1], head_size:racket.hs, ra:racket.ra };
  const { scores, synergy } = TLEngine.scoreSetup(main, cross, frame, state.hybrid);
  return { scores, racket, sMain, sCross, crossId, crossG, crossT, synergy };
}

/* ============================================================
   ANALYSIS TEXT
   ============================================================ */
function archetype(s){
  const {co,pw,sp,cf} = s;
  if(co>=78 && sp>=78) return {h:"Heavy-spin control", tag:["control","spin"]};
  if(co>=80) return {h:"Precision control", tag:["control"]};
  if(pw>=78 && cf>=72) return {h:"Comfort power", tag:["power","comfort"]};
  if(sp>=82) return {h:"Spin-first", tag:["spin"]};
  if(pw>=76) return {h:"Power setup", tag:["power"]};
  if(cf>=78) return {h:"Comfort-first", tag:["comfort"]};
  return {h:"Balanced all-court", tag:["all-round"]};
}

function racketName(r){
  return r.b==="—" ? r.n : `${r.b} ${r.n}${r.ver?" "+r.ver:""}${r.year?" ("+r.year+")":""}`;
}
function racketLabel(r){
  return r.b==="—" ? `a generic ${r.pat[0]}×${r.pat[1]} frame` : `a ${r.b} ${r.n}${r.year?" ("+r.year+")":""}`;
}
function buildReadout(res){
  const {scores:s, racket, sMain, sCross, crossId, synergy} = res;
  const highest = [...ATTRS].sort((a,b)=>s[b.k]-s[a.k])[0];
  const lowest  = [...ATTRS].sort((a,b)=>s[a.k]-s[b.k])[0];
  const p=[];

  // 1 — headline sentence
  const mainDesc = `${sMain.b} ${sMain.n}`;
  const crossDesc = state.hybrid ? `${sCross.b} ${sCross.n}` : "the same string";
  const bed = state.hybrid
    ? `You've built a hybrid — <strong>${mainDesc}</strong> in the mains, <strong>${crossDesc}</strong> in the crosses`
    : `You've built a full bed of <strong>${mainDesc}</strong>`;
  p.push(`${bed}, strung in ${racketLabel(racket)} (${racket.pat[0]}×${racket.pat[1]}). Its strongest trait is <strong>${highest.nm.toLowerCase()}</strong> (${s[highest.k]}), and it gives up the most on <strong>${lowest.nm.toLowerCase()}</strong> (${s[lowest.k]}).`);

  // 2 — what you'll feel
  const feels=[];
  if(s.co>=78) feels.push("the ball will land where you aim even when you swing out");
  else if(s.co<=52) feels.push("shots will fly a bit more, so you'll ride power rather than pinpoint placement");
  if(s.sp>=80) feels.push("you'll get real bite for heavy topspin and sharp angles");
  else if(s.sp<=55) feels.push("spin will be modest — this bed flattens the ball out");
  if(s.pw>=76) feels.push("there's free depth on tap without a full swing");
  else if(s.pw<=52) feels.push("you'll need to generate your own pace");
  if(s.cf>=76) feels.push("it stays plush and easy on the arm");
  else if(s.cf<=42) feels.push("the response is stiff and firm on contact");
  p.push(`On court: ${feels.slice(0,3).join(", ")}.`);

  // 3 — synergy / durability note
  if(synergy){
    p.push(`Because you've paired a soft string with a poly, the setup borrows from both — <strong>comfort and power from the softer string, control and spin from the poly</strong>. This is the logic behind most tour hybrids.`);
  }
  return p;
}

function buildWarnings(res){
  const {scores:s, racket, sMain, sCross} = res;
  const w=[];
  const isPoly = m => (m==="poly"||m==="polyspin"||m==="polysoft"||m==="kevlar");
  const fullPoly = isPoly(sMain.m) && (!state.hybrid || isPoly(sCross.m));

  // arm comfort
  if(s.cf<=40){
    w.push({t:"warn", ic:"⚠", x:`<b>Arm-comfort risk.</b> This bed is firm (comfort ${s.cf}). If you have any elbow, wrist or shoulder history, drop tension a few pounds, go to a thinner or softer string, or add a soft cross. Listen to your arm over the numbers.`});
  } else if(s.cf<=52 && fullPoly){
    w.push({t:"warn", ic:"⚠", x:`<b>Firm on the arm.</b> Full poly at this tension asks a lot of your arm. It's fine for many players, but consider a hybrid or looser tension if you feel it.`});
  }

  // stiff frame + stiff string stacking
  if(racket.ra>=68 && fullPoly && s.cf<=50){
    w.push({t:"warn", ic:"⚠", x:`<b>Stiff-on-stiff.</b> A firm frame (${racket.ra} RA) plus full poly compounds harshness. A softer string or gut/multi cross softens the blow without losing much control.`});
  }

  // durability vs breaker
  if(state.brk==="often" && s.du<=58 && state.mode==="goal"){
    w.push({t:"warn", ic:"⚠", x:`<b>You'll break these fast.</b> You told the lab you're a chronic breaker but this setup isn't very durable (${s.du}). A shaped or thicker poly in the mains — or Kevlar mains — will last far longer.`});
  }
  // gut in a breaker's mains
  if(state.brk==="often" && sMain.m==="gut"){
    w.push({t:"warn", ic:"⚠", x:`<b>Gut mains + hard hitter.</b> Natural gut is glorious but fragile in the mains for a string-breaker. Expect frequent (and pricey) restrings.`});
  }

  // tension mismatch note
  if(state.hybrid && Math.abs(state.tMain-state.tCross)>=4){
    w.push({t:"warn", ic:"✎", x:`<b>Split tension.</b> You've set mains and crosses ${Math.abs(state.tMain-state.tCross)} lb apart. Stringers often set crosses 2 lb below mains to even out feel — larger gaps are a deliberate tuning choice.`});
  }

  // positive note
  if(w.length===0){
    w.push({t:"good", ic:"✓", x:`<b>Well-matched.</b> No red flags — the string, tension and frame line up sensibly for what this setup is trying to do.`});
  }
  return w;
}

function buildPhysics(res){
  const {sMain, racket} = res;
  const rows=[];
  rows.push({k:"MATERIAL", x:`${MAT[sMain.m].label} sets the ceiling: ${sMain.m==="gut"?"live, elastic fibers store and return energy — max power and comfort.":sMain.m==="multi"?"hundreds of soft fibers cushion impact — comfort near gut, less control.":sMain.m.startsWith("poly")?"a stiff monofilament deforms little and snaps back fast — control and spin, at the cost of comfort.":sMain.m==="kevlar"?"aramid barely stretches — near-indestructible and very stiff.":"a durable mono with more give than poly — a comfort/control middle ground."}`});
  rows.push({k:"GAUGE", x:`Thinner strings bite into the ball and move more freely, so they snap back harder (more spin) and pocket more (more feel) — but there's less material, so they break sooner.`});
  rows.push({k:"TENSION", x:`Lower tension = a longer 'dwell time' and a trampoline effect: more power and a bit more snapback spin, less precision. Higher tension flattens the bed for control at the cost of pop and comfort.`});
  rows.push({k:"PATTERN", x:`Your ${racket.pat[0]}×${racket.pat[1]} ${racket.pat[0]*racket.pat[1]>=340?"dense pattern locks strings in place — control and durability, less snapback spin.":"open pattern lets mains slide and snap back — more spin and power, less directional control and durability."}`});
  return rows;
}

/* ============================================================
   RENDER — string bed SVG (the signature)
   ============================================================ */
function renderBed(res){
  const svg = $("bedSvg");
  const W=300,H=380;
  const racket = res ? res.racket : RACKETS[0];
  const nM = racket.pat[0], nC = racket.pat[1];
  const mainHex = res ? MAT[res.sMain.m].hex : "#888";
  const crossHex = res ? MAT[res.sCross.m].hex : "#888";

  // string bed area (oval)
  const cx=W/2, cy=H/2, rx=118, ry=158;
  let out = `<defs>
    <clipPath id="bedClip"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
    <radialGradient id="glow" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#1a2e2a"/><stop offset="100%" stop-color="#0a1210"/>
    </radialGradient>
  </defs>`;
  // frame
  out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx+13}" ry="${ry+13}" fill="none" stroke="#20302c" stroke-width="16"/>`;
  out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx+6}" ry="${ry+6}" fill="none" stroke="#0d1614" stroke-width="3"/>`;
  out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#glow)"/>`;
  // throat hint
  out += `<path d="M ${cx-24} ${cy+ry+6} L ${cx-16} ${H-14} M ${cx+24} ${cy+ry+6} L ${cx+16} ${H-14}" stroke="#20302c" stroke-width="14" stroke-linecap="round"/>`;

  out += `<g clip-path="url(#bedClip)">`;
  if(res){
    const left=cx-rx, right=cx+rx, top=cy-ry, bot=cy+ry;
    // crosses (horizontal) drawn first
    for(let i=0;i<nC;i++){
      const y = top + (i+0.5)*(2*ry/nC);
      out += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="${crossHex}" stroke-width="2.4" stroke-linecap="round" opacity="0.92"/>`;
    }
    // mains (vertical) on top with subtle weave shadow
    for(let i=0;i<nM;i++){
      const x = left + (i+0.5)*(2*rx/nM);
      out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bot}" stroke="#0a1210" stroke-width="3.6" opacity="0.35"/>`;
      out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bot}" stroke="${mainHex}" stroke-width="2.6" stroke-linecap="round" opacity="0.95"/>`;
    }
  } else {
    out += `<text x="${cx}" y="${cy}" fill="#3a4a46" font-family="IBM Plex Mono" font-size="12" text-anchor="middle">awaiting setup</text>`;
  }
  out += `</g>`;
  svg.innerHTML = out;
}

/* ============================================================
   RENDER — radar gauge
   ============================================================ */
function renderRadar(scores){
  const svg=$("radarSvg");
  const cx=130,cy=130,R=92;
  const keys=ATTRS.map(a=>a.k), labels=ATTRS.map(a=>a.nm);
  const n=keys.length;
  const ang=i=> (-Math.PI/2) + i*(2*Math.PI/n);
  const pt=(i,rad)=>[cx+Math.cos(ang(i))*rad, cy+Math.sin(ang(i))*rad];
  let out="";
  // rings
  [0.25,0.5,0.75,1].forEach(f=>{
    let pts=keys.map((_,i)=>pt(i,R*f).join(",")).join(" ");
    out+=`<polygon points="${pts}" fill="none" stroke="#D6DBD4" stroke-width="1"/>`;
  });
  // spokes + labels
  keys.forEach((_,i)=>{
    const [x,y]=pt(i,R);
    out+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#D6DBD4" stroke-width="1"/>`;
    const [lx,ly]=pt(i,R+17);
    let anchor = Math.abs(lx-cx)<8?"middle":(lx>cx?"start":"end");
    out+=`<text x="${lx}" y="${ly+3}" font-family="IBM Plex Mono" font-size="9" fill="#48524E" text-anchor="${anchor}">${labels[i]}</text>`;
    const [vx,vy]=pt(i,R*(scores[keys[i]]/100)*0.86 + 4);
  });
  // data polygon
  let dpts=keys.map((k,i)=>pt(i,R*(scores[k]/100)).join(",")).join(" ");
  out+=`<polygon points="${dpts}" fill="rgba(11,110,95,0.16)" stroke="#0B6E5F" stroke-width="2" stroke-linejoin="round"/>`;
  keys.forEach((k,i)=>{
    const [x,y]=pt(i,R*(scores[k]/100));
    out+=`<circle cx="${x}" cy="${y}" r="3" fill="#0B6E5F"/>`;
  });
  svg.innerHTML=out;
}

/* ============================================================
   RENDER — attribute bars
   ============================================================ */
const barDesc={
  pw:v=>v>=76?"free depth without swinging out":v>=55?"moderate, controllable pop":"you supply the pace",
  co:v=>v>=78?"pinpoint placement on full swings":v>=55?"dependable directional control":"lands long more easily",
  sp:v=>v>=80?"heavy topspin & sharp angles":v>=55?"useful, natural spin":"flatter, driving ball",
  cf:v=>v>=76?"plush, arm-friendly":v>=52?"reasonably comfortable":"firm — mind your arm",
  fe:v=>v>=76?"rich touch & connection":v>=55?"clear feedback":"muted, dampened response",
  du:v=>v>=78?"long life, resists breakage":v>=55?"average lifespan":"expect frequent restrings",
  tm:v=>v>=72?"holds tension for weeks":v>=52?"gradual tension loss":"stiffens/loses tension quickly",
};
function barColor(v){ return v>=70?"#0B6E5F":v>=45?"#4E8C67":"#C98A3C"; }
function renderBars(scores){
  let out="";
  for(const {k,nm} of ATTRS){
    const v=scores[k];
    out+=`<div class="bar">
      <div class="bh"><span class="nm">${nm}</span><span class="sc mono">${v}<span style="color:var(--ink-faint)">/100</span></span></div>
      <div class="track"><div class="fill" style="width:${v}%;background:${barColor(v)}"></div></div>
      <div class="desc">${barDesc[k](v)}</div>
    </div>`;
  }
  $("bars").innerHTML=out;
}

/* ============================================================
   UI WIRING
   ============================================================ */
function brands(){ return [...new Set(STRINGS.map(s=>s.b))].sort(); }
function productsOf(brand){ return STRINGS.map((s,i)=>({...s,i})).filter(s=>s.b===brand); }
function findId(brand,name){ return STRINGS.findIndex(s=>s.b===brand&&s.n===name); }

function fillSelect(sel, items, valFn, txtFn, selectedVal){
  sel.innerHTML="";
  items.forEach(it=>{
    const o=document.createElement("option");
    o.value=valFn(it); o.textContent=txtFn(it);
    if(String(valFn(it))===String(selectedVal)) o.selected=true;
    sel.appendChild(o);
  });
}

function gaugeLabel(mm){
  const map={1.35:"15L",1.30:"16",1.28:"16L",1.27:"16L",1.25:"17",1.24:"17",1.23:"17",1.22:"17L",1.20:"17L",1.18:"18",1.17:"18",1.15:"18",1.10:"19"};
  return `${mm.toFixed(2)} mm · ${map[mm]||""}`.trim();
}
function racketIdxById(id){ return RACKETS.findIndex(r=>r.id===id); }

// racket dropdown grouped by brand (optgroups), option value = index
/* searchable racket combobox (replaces the old <select>) */
function racketOptLabel(r){ return r.b==="\u2014" ? r.n : `${r.n}${r.ver?" "+r.ver:""}`; }
function buildRacketCombo(which){
  const combo=document.querySelector(`.rk-combo[data-rk="${which}"]`);
  if(!combo) return;
  const btn=combo.querySelector(".rk-trigger");
  const lbl=combo.querySelector(".rk-label");
  const pop=combo.querySelector(".rk-pop");
  const search=combo.querySelector(".rk-search");
  const list=combo.querySelector(".rk-list");
  const getIdx=()=> which==="goal"?state.goalRacketIdx:state.racketIdx;
  const setIdx=(i)=>{ if(which==="goal") state.goalRacketIdx=i; else state.racketIdx=i; };
  function setLabel(){ lbl.textContent = racketName(RACKETS[getIdx()]); }
  function draw(q){
    q=(q||"").trim().toLowerCase();
    const terms=q?q.split(/\s+/):[];
    let html="", lastB=null, n=0;
    RACKETS.forEach((r,i)=>{
      const hay=`${r.b} ${r.n} ${r.ver||""} ${r.year||""} ${r.char||""} ${r.pat[0]}x${r.pat[1]}`.toLowerCase();
      if(terms.length && !terms.every(t=>hay.includes(t))) return;
      const brand=r.b==="\u2014"?"General":r.b;
      if(brand!==lastB){ html+=`<div class="rk-group">${brand}</div>`; lastB=brand; }
      const meta=[r.year||"", `${r.pat[0]}\u00d7${r.pat[1]}`].filter(Boolean).join(" \u00b7 ");
      html+=`<div class="rk-opt${i===getIdx()?" sel":""}" data-i="${i}"><span>${racketOptLabel(r)}</span><span class="rk-meta">${meta}</span></div>`;
      n++;
    });
    list.innerHTML = n?html:`<div class="rk-empty">No rackets match \u201c${q}\u201d. Try a brand or model.</div>`;
  }
  function open(){ pop.hidden=false; search.value=""; draw(""); const sel=list.querySelector(".rk-opt.sel"); if(sel) sel.scrollIntoView({block:"center"}); setTimeout(()=>search.focus(),10); document.addEventListener("mousedown",onDoc,true); }
  function close(){ pop.hidden=true; document.removeEventListener("mousedown",onDoc,true); }
  function onDoc(e){ if(!combo.contains(e.target)) close(); }
  btn.addEventListener("click",()=>{ pop.hidden?open():close(); });
  search.addEventListener("input",()=>draw(search.value));
  search.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  list.addEventListener("mousedown",e=>{
    const o=e.target.closest(".rk-opt"); if(!o) return;
    e.preventDefault();
    const i=+o.dataset.i; setIdx(i); setLabel(); close();
    if(which==="goal"){ state._reroll=false; suggest(); } else { renderRacketSpec(); update(); }
  });
  combo._setLabel=setLabel;
  setLabel();
}
function syncRacketLabels(){ document.querySelectorAll(".rk-combo").forEach(c=>{ if(c._setLabel) c._setLabel(); }); }
function snapGauge(prodId,g){ const gs=STRINGS[prodId].g; return gs.includes(g)?g:gs.reduce((a,b)=>Math.abs(b-g)<Math.abs(a-g)?b:a); }

const PRESET_SHOWN=4;
function renderPresets(showAll){
  const arr = showAll?PRESETS:PRESETS.slice(0,PRESET_SHOWN);
  $("presetGrid").innerHTML = arr.map(p=>{ const i=PRESETS.indexOf(p); return `
    <button class="preset" data-p="${i}">
      <div class="nm">${p.nm}<span class="flag">${p.flag}</span></div>
      <div class="ds">${p.ds}</div>
    </button>`; }).join("");
  const t=$("presetToggle");
  if(PRESETS.length>PRESET_SHOWN){ t.style.display=""; t.textContent = showAll?"\u2212 Show fewer":`+ Show all ${PRESETS.length} pro setups`; t.dataset.all=showAll?"1":"0"; }
  else t.style.display="none";
}

function initSelectors(){
  // brands
  fillSelect($("brandMain"), brands(), b=>b, b=>b);
  fillSelect($("brandCross"), brands(), b=>b, b=>b);
  // rackets (grouped by brand)
  buildRacketCombo("scratch");
  buildRacketCombo("goal");
  // default strings
  const defMain = findId("Luxilon","ALU Power");
  state.mainId=defMain; state.mainG=STRINGS[defMain].g[0];
  const defCross = findId("Wilson","Natural Gut");
  state.crossId=defCross; state.crossG=STRINGS[defCross].g[0];
  syncStringSelectors();
  // presets
  renderPresets(false);
}

function syncStringSelectors(){
  const sMain=strById(state.mainId);
  fillSelect($("brandMain"), brands(), b=>b, b=>b, sMain.b);
  fillSelect($("prodMain"), productsOf(sMain.b), p=>p.i, p=>p.n, state.mainId);
  fillSelect($("gaugeMain"), sMain.g, g=>g, g=>gaugeLabel(g), state.mainG);

  const sCross=strById(state.crossId);
  fillSelect($("brandCross"), brands(), b=>b, b=>b, sCross.b);
  fillSelect($("prodCross"), productsOf(sCross.b), p=>p.i, p=>p.n, state.crossId);
  fillSelect($("gaugeCross"), sCross.g, g=>g, g=>gaugeLabel(g), state.crossG);
}

function renderChainMeta(){
  const sMain=strById(state.mainId);
  $("specMain").innerHTML = specLine(sMain, state.mainG);
  $("knownMain").textContent = sMain.kf;
  const cId = state.hybrid?state.crossId:state.mainId;
  const cG = state.hybrid?state.crossG:state.mainG;
  const sCross=strById(cId);
  $("specCross").innerHTML = specLine(sCross, cG);
  $("knownCross").textContent = sCross.kf;
}
function specLine(s,g){
  return `<span>MATERIAL <b>${MAT[s.m].label}</b></span>
          <span>SHAPE <b>${s.geo}</b></span>
          <span>GAUGE <b>${g.toFixed(2)}mm</b></span>
          <span>PRICE <b>${s.tier}</b></span>`;
}

function renderRacketSpec(){
  const r=RACKETS[state.racketIdx];
  const verYr = r.b==="—" ? "" : `<span>VERSION <b>${r.ver?r.ver+" ":""}${r.year?"("+r.year+")":""}</b></span>`;
  $("racketSpec").innerHTML = `<span>PATTERN <b>${r.pat[0]}×${r.pat[1]}</b></span>
    <span>STIFFNESS <b>${r.ra} RA</b></span>
    <span>HEAD <b>${r.hs} in²</b></span>
    <span>WEIGHT <b>${r.wt} g</b></span>
    ${verYr}
    <span>CHARACTER <b>${r.char}</b></span>`;
}

/* main recompute + paint */
function update(){
  // guard: need a main string
  renderChainMeta();
  const res = computeScores();

  // bed
  renderBed(res);
  $("bedTitle").textContent = state.hybrid ? "Hybrid string bed" : "Full string bed";
  const rk = res.racket;
  $("bedSub").textContent = `${racketName(rk)} · ${rk.pat[0]}×${rk.pat[1]}`;
  $("swMain").style.background = MAT[res.sMain.m].hex;
  $("swCross").style.background = MAT[res.sCross.m].hex;
  $("dotMain").style.background = MAT[res.sMain.m].hex;
  $("dotCross").style.background = MAT[res.sCross.m].hex;
  $("chipMain").innerHTML = `${res.sMain.b} ${res.sMain.n}<small>${MAT[res.sMain.m].label} · ${state.mainG.toFixed(2)}mm</small>`;
  $("chipCross").innerHTML = state.hybrid
    ? `${res.sCross.b} ${res.sCross.n}<small>${MAT[res.sCross.m].label} · ${res.crossG.toFixed(2)}mm</small>`
    : `Same as mains<small>full bed</small>`;
  $("tMain").innerHTML = `${state.tMain}<span> lb</span>`;
  $("tCross").innerHTML = `${state.hybrid?state.tCross:state.tMain}<span> lb</span>`;

  // radar + bars
  renderRadar(res.scores);
  renderBars(res.scores);

  // verdict
  const arch=archetype(res.scores);
  $("verdictHead").textContent = arch.h;
  const top=[...ATTRS].sort((a,b)=>res.scores[b.k]-res.scores[a.k]).slice(0,2).map(a=>a.nm.toLowerCase());
  $("verdictOne").textContent = `Leans hardest into ${top[0]} and ${top[1]}. Read the full breakdown below.`;
  const tags=arch.tag.map(t=>`<span class="t">${t}</span>`);
  if(res.scores.cf<=42) tags.push(`<span class="t hot">arm-firm</span>`);
  if(res.synergy) tags.push(`<span class="t">hybrid synergy</span>`);
  $("archTags").innerHTML=tags.join("");
  $("scoreStamp").textContent = state.mode==="goal"&&state.suggested ? "suggested · editable" : "live readout";

  // warnings + readout + physics
  $("warnBox").innerHTML = buildWarnings(res).map(w=>`<div class="warn ${w.t==='good'?'good':''}"><span class="ic">${w.ic}</span><div>${w.x}</div></div>`).join("");
  $("readout").innerHTML = buildReadout(res).map(p=>`<p>${p}</p>`).join("");
  $("physicsBox").innerHTML = buildPhysics(res).map(r=>`<div class="prow"><span class="k">${r.k}</span><span>${r.x}</span></div>`).join("");

  // slider fills
  setSliderFill($("tenMain")); setSliderFill($("tenCross"));

  if (typeof refreshFavChips === "function") refreshFavChips();
}
function setSliderFill(el){
  const pct=((el.value-el.min)/(el.max-el.min))*100;
  el.style.setProperty("--pct",pct+"%");
}

/* ---------- suggestion engine (goal mode) ---------- */
const GOAL_W = {
  control:{co:3,fe:1.2,sp:1.2,pw:.3,cf:.6,du:1,tm:.8},
  power:{pw:3,cf:1.4,fe:1,co:.6,sp:.5,du:.6,tm:.6},
  spin:{sp:3,co:1.4,du:1,pw:.4,cf:.5,fe:.6,tm:.6},
  comfort:{cf:3,fe:1.6,pw:1.2,co:.6,sp:.4,du:.6,tm:.8},
  allround:{co:1.4,sp:1.4,pw:1.2,cf:1.4,fe:1.2,du:1,tm:1},
};
function scoreForGoal(scores, goal){
  const w=GOAL_W[goal]; let s=0,t=0;
  for(const k in w){ s+=scores[k]*w[k]; t+=w[k]; }
  return s/t;
}

function suggest(){
  const goal=state.goal, brk=state.brk;
  const racketIdx = state.goalRacketIdx;
  const racket = RACKETS[racketIdx];

  // candidate pool depends on goal
  const isPoly = m => (m==="poly"||m==="polyspin"||m==="polysoft"||m==="kevlar");
  const isSoft = m => (m==="gut"||m==="multi"||m==="zyex");

  // decide hybrid intent
  let wantHybrid=false, hybridStyle=null;
  if(goal==="comfort"){ wantHybrid=true; hybridStyle="softMainPolyCross"; }
  if(goal==="allround"){ wantHybrid=true; hybridStyle="softMainPolyCross"; }
  if(brk==="often"){ wantHybrid=true; hybridStyle="durable"; }

  // choose a base tension by goal + frame stiffness
  let baseT = {control:56, power:47, spin:52, comfort:49, allround:52}[goal];
  if(racket.ra>=68) baseT -= 2;      // stiff frame → drop tension for comfort
  if(racket.hs>=100 && goal!=="power") baseT += 1;
  baseT = clamp(baseT,42,60);

  // helper: pick best string from a filtered pool for the goal, tried at baseT & a gauge
  function best(pool, tension){
    let bestObj=null, bestScore=-1;
    for(const s of pool){
      const id=STRINGS.indexOf(s);
      // pick a sensible gauge: spin→thin, durable→thick, else middle
      let g;
      if(goal==="spin"||goal==="comfort") g=s.g.reduce((a,b)=>b<a?b:a);
      else if(brk==="often") g=s.g.reduce((a,b)=>b>a?b:a);
      else g=s.g[0];
      // rank each candidate through the full shared engine (same string in mains+crosses)
      const cfg={ ratings:s.r, material:s.m, geo:s.geo, gauge:g, tension };
      const frame={ mains:racket.pat[0], crosses:racket.pat[1], head_size:racket.hs, ra:racket.ra };
      const { scores:blended }=TLEngine.scoreSetup(cfg, cfg, frame, false);
      const sc=scoreForGoal(blended,goal);
      if(sc>bestScore){bestScore=sc;bestObj={id,g};}
    }
    return bestObj;
  }

  let mainPool, crossPool;
  if(hybridStyle==="softMainPolyCross"){
    mainPool = STRINGS.filter(s=> goal==="comfort"? (s.m==="gut"||s.m==="multi"||s.m==="polysoft"||s.m==="zyex") : (s.m==="gut"||s.m==="multi"));
    crossPool = STRINGS.filter(s=> isPoly(s.m) && s.m!=="kevlar");
    state.hybrid=true;
  } else if(hybridStyle==="durable"){
    mainPool = STRINGS.filter(s=> s.m==="kevlar" || (isPoly(s.m)&&s.r.du>=80));
    crossPool = STRINGS.filter(s=> isPoly(s.m) && s.m!=="kevlar");
    state.hybrid=true;
  } else {
    // full bed
    state.hybrid=false;
    if(goal==="control") mainPool=STRINGS.filter(s=>s.m==="poly"&&s.r.co>=83);
    else if(goal==="spin") mainPool=STRINGS.filter(s=>s.m==="polyspin");
    else if(goal==="power") mainPool=STRINGS.filter(s=>s.m==="multi"||s.m==="gut");
    else mainPool=STRINGS.filter(s=>isPoly(s.m));
    crossPool=mainPool;
  }
  if(!mainPool.length) mainPool=STRINGS.filter(s=>isPoly(s.m));
  if(!crossPool.length) crossPool=mainPool;

  // reroll variety: shuffle pools lightly
  if(state._reroll){ mainPool=[...mainPool].sort(()=>Math.random()-0.4); }

  const mainPick=best(mainPool, baseT);
  state.mainId=mainPick.id; state.mainG=mainPick.g;
  if(state.hybrid){
    const crossPick=best(crossPool, baseT-2);
    state.crossId=crossPick.id; state.crossG=crossPick.g;
  }
  state.tMain=baseT; state.tCross=state.hybrid?clamp(baseT-2,40,60):baseT;
  state.suggested=true;

  // reflect into scratch selectors so user can tweak
  syncStringSelectors();
  $("hybridToggle").checked=state.hybrid;
  toggleHybridUI();
  $("tenMain").value=state.tMain; $("tenCross").value=state.tCross;
  $("tMainVal").innerHTML=`${state.tMain}<span> lb</span>`;
  $("tCrossVal").innerHTML=`${state.tCross}<span> lb</span>`;
  state.racketIdx=racketIdx; syncRacketLabels(); renderRacketSpec();

  // suggestion note
  const sM=strById(state.mainId), sC=strById(state.crossId);
  const goalNames={control:"control",power:"power",spin:"spin",comfort:"comfort & arm health",allround:"all-round balance"};
  const setupTxt = state.hybrid
    ? `<b>${sM.b} ${sM.n}</b> mains + <b>${sC.b} ${sC.n}</b> crosses`
    : `a full bed of <b>${sM.b} ${sM.n}</b>`;
  $("suggestNote").classList.remove("hide");
  $("suggestNote").innerHTML = `For <b>${goalNames[goal]}</b> in your ${racketName(racket)}, the lab suggests ${setupTxt} at ${state.tMain}${state.hybrid?"/"+state.tCross:""} lb. Everything is editable — switch to <b>Build from scratch</b> to fine-tune, or reroll for an alternative.`;
  update();
}

/* ---------- mode / hybrid toggles ---------- */
function toggleHybridUI(){
  state.hybrid = $("hybridToggle").checked;
  $("hybridLabel").textContent = state.hybrid?"Hybrid":"Full bed";
  $("crossChain").classList.toggle("hide", !state.hybrid);
  $("crossTenRow").classList.toggle("hide", !state.hybrid);
}

function setMode(mode){
  state.mode=mode;
  [...$("modeSwitch").children].forEach(b=>b.classList.toggle("on", b.dataset.mode===mode));
  const goalM = mode==="goal";
  $("goalPanel").classList.toggle("hide", !goalM);
  $("racketPanel").classList.toggle("hide", goalM);
  $("suggestNote").classList.toggle("hide", !goalM || !state.suggested);
  // renumber indices for clarity
  $("strIdx").textContent = goalM ? "B" : "2";
  $("tenIdx").textContent = goalM ? "C" : "3";
  if(goalM){ suggest(); } else { renderRacketSpec(); update(); }
}

/* ============================================================
   EVENTS
   ============================================================ */
function wire(){
  $("modeSwitch").addEventListener("click",e=>{ if(e.target.dataset.mode) setMode(e.target.dataset.mode); });

  // goal seg
  $("goalSeg").addEventListener("click",e=>{
    if(!e.target.dataset.goal) return;
    state.goal=e.target.dataset.goal; state._reroll=false;
    [...$("goalSeg").children].forEach(b=>b.classList.toggle("on",b===e.target));
    suggest();
  });
  $("breakSeg").addEventListener("click",e=>{
    if(!e.target.dataset.break) return;
    state.brk=e.target.dataset.break; state._reroll=false;
    [...$("breakSeg").children].forEach(b=>b.classList.toggle("on",b===e.target));
    suggest();
  });
  $("rerollBtn").addEventListener("click",()=>{ state._reroll=true; suggest(); });

  // racket (scratch)
  $("presetToggle").addEventListener("click",()=>renderPresets($("presetToggle").dataset.all!=="1"));

  // hybrid toggle
  $("hybridToggle").addEventListener("change",()=>{ toggleHybridUI(); update(); });

  // mains selectors
  $("brandMain").addEventListener("change",e=>{
    const prods=productsOf(e.target.value); state.mainId=prods[0].i; state.mainG=STRINGS[state.mainId].g[0];
    syncStringSelectors(); update();
  });
  $("prodMain").addEventListener("change",e=>{ state.mainId=+e.target.value; state.mainG=STRINGS[state.mainId].g[0]; syncStringSelectors(); update(); });
  $("gaugeMain").addEventListener("change",e=>{ state.mainG=+e.target.value; update(); });

  // cross selectors
  $("brandCross").addEventListener("change",e=>{
    const prods=productsOf(e.target.value); state.crossId=prods[0].i; state.crossG=STRINGS[state.crossId].g[0];
    syncStringSelectors(); update();
  });
  $("prodCross").addEventListener("change",e=>{ state.crossId=+e.target.value; state.crossG=STRINGS[state.crossId].g[0]; syncStringSelectors(); update(); });
  $("gaugeCross").addEventListener("change",e=>{ state.crossG=+e.target.value; update(); });

  // tension
  $("tenMain").addEventListener("input",e=>{ state.tMain=+e.target.value; $("tMainVal").innerHTML=`${state.tMain}<span> lb</span>`; if(!state.hybrid){state.tCross=state.tMain;} update(); });
  $("tenCross").addEventListener("input",e=>{ state.tCross=+e.target.value; $("tCrossVal").innerHTML=`${state.tCross}<span> lb</span>`; update(); });

  // presets
  $("presetGrid").addEventListener("click",e=>{
    const btn=e.target.closest(".preset"); if(!btn) return;
    applyPreset(PRESETS[+btn.dataset.p]);
  });
}

function applyPreset(p){
  // switch to scratch so the user sees everything editable
  setMode("scratch");
  // racket (by stable id)
  const idx = racketIdxById(p.racketId);
  state.racketIdx = idx>=0?idx:0;
  syncRacketLabels(); renderRacketSpec();
  // strings
  state.hybrid=p.hybrid; $("hybridToggle").checked=p.hybrid; toggleHybridUI();
  state.mainId=findId(p.main[0],p.main[1]); state.mainG=snapGauge(state.mainId,p.main[2]);
  if(p.hybrid){ state.crossId=findId(p.cross[0],p.cross[1]); state.crossG=snapGauge(state.crossId,p.cross[2]); }
  else { state.crossId=state.mainId; state.crossG=state.mainG; }
  syncStringSelectors();
  state.tMain=p.tMain; state.tCross=p.tCross;
  $("tenMain").value=p.tMain; $("tenCross").value=p.tCross;
  $("tMainVal").innerHTML=`${p.tMain}<span> lb</span>`; $("tCrossVal").innerHTML=`${p.tCross}<span> lb</span>`;
  state.suggested=false; $("suggestNote").classList.add("hide");
  update();
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ============================================================
   BOOT
   ============================================================ */
/* ---- boot: load catalog from the API, then start ---- */
async function boot(){
  try{
    const [rs, rr] = await Promise.all([ fetch('/api/strings'), fetch('/api/rackets') ]);
    const sj = await rs.json(), rj = await rr.json();
    STRINGS = sj.strings.map(s=>({ b:s.brand, n:s.name, m:s.material, geo:s.geo, g:s.gauges, tier:s.tier, kf:s.known_for, cl:s.claim, r:s.ratings, price:s.price_usd, _id:s.id }));
    RACKETS = rj.rackets.map(r=>({ id:(r.slug||('r'+r.id)), b:r.brand, n:r.name, ver:r.ver, year:r.year, pat:[r.mains,r.crosses], ra:r.ra, hs:r.head_size, wt:r.weight, char:r.char, kf:r.known_for, _id:r.id }));
  }catch(e){
    document.querySelector('.wrap').insertAdjacentHTML('afterbegin','<div class="panel" style="color:var(--red)">Could not load the catalog. Is the server running?</div>');
    return;
  }
  initSelectors();
  renderRacketSpec();
  wire();
  setMode("goal");
  wireSaveSetup();
  wireSaveFavorites();
  await applyQueryPreselect();
  (window.TLAuth && window.TLAuth.ready || Promise.resolve()).then(refreshFavChips);
}

function loadSetupConfig(cfg){
  setMode("scratch");
  const ri = RACKETS.findIndex(r=>String(r._id)===String(cfg.racketId));
  state.racketIdx = ri>=0?ri:0;
  syncRacketLabels(); renderRacketSpec();
  state.hybrid = !!cfg.hybrid; $("hybridToggle").checked=state.hybrid; toggleHybridUI();
  const mi = STRINGS.findIndex(s=>String(s._id)===String(cfg.mainId));
  if(mi>=0){ state.mainId=mi; state.mainG=snapGauge(mi, cfg.mainGauge||STRINGS[mi].g[0]); }
  if(state.hybrid && cfg.crossId!=null){
    const ci=STRINGS.findIndex(s=>String(s._id)===String(cfg.crossId));
    if(ci>=0){ state.crossId=ci; state.crossG=snapGauge(ci, cfg.crossGauge||STRINGS[ci].g[0]); }
  } else { state.crossId=state.mainId; state.crossG=state.mainG; }
  syncStringSelectors();
  state.tMain = cfg.mainTension!=null?cfg.mainTension:52;
  state.tCross = (state.hybrid && cfg.crossTension!=null) ? cfg.crossTension : state.tMain;
  $("tenMain").value=state.tMain; $("tenCross").value=state.tCross;
  $("tMainVal").innerHTML=`${state.tMain}<span> lb</span>`; $("tCrossVal").innerHTML=`${state.tCross}<span> lb</span>`;
  state.suggested=false; $("suggestNote").classList.add("hide");
  update();
}

/* ---- favorites: save the current racket / main string ---- */
function currentRacket(){ return state.mode==="goal" ? RACKETS[state.goalRacketIdx] : RACKETS[state.racketIdx]; }
async function refreshFavChips(){
  const rb=document.getElementById('saveRacketBtn'), sb=document.getElementById('saveStringBtn');
  if(!rb||!sb||!window.TLFav) return;
  const loggedIn = window.TLAuth && window.TLAuth.user;
  const ids = loggedIn ? await window.TLFav.ids() : {rackets:[],strings:[]};
  const rk=currentRacket(), sMain=strById(state.mainId);
  const rOn = rk && rk._id!=null && ids.rackets.includes(rk._id);
  const sOn = sMain && sMain._id!=null && ids.strings.includes(sMain._id);
  rb.classList.toggle('on', !!rOn); sb.classList.toggle('on', !!sOn);
  rb.querySelector('.h').innerHTML = rOn ? '&#9829;' : '&#9825;';
  sb.querySelector('.h').innerHTML = sOn ? '&#9829;' : '&#9825;';
}
function wireSaveFavorites(){
  const rb=document.getElementById('saveRacketBtn'), sb=document.getElementById('saveStringBtn');
  if(rb) rb.addEventListener('click', async ()=>{
    const rk=currentRacket(); if(!rk||rk._id==null){ window.TL.toast('Pick a specific racket first',true); return; }
    const now=await window.TLFav.toggle('racket', rk._id, '/'); if(now===null) return;
    window.TL.toast(now?'Saved to My Rackets':'Removed'); refreshFavChips();
  });
  if(sb) sb.addEventListener('click', async ()=>{
    const sMain=strById(state.mainId); if(!sMain||sMain._id==null) return;
    const now=await window.TLFav.toggle('string', sMain._id, '/'); if(now===null) return;
    window.TL.toast(now?'Saved to My Strings':'Removed'); refreshFavChips();
  });
}
async function applyQueryPreselect(){
  const p=new URLSearchParams(location.search);
  const sid=p.get('setup'), rid=p.get('racket'), mid=p.get('main');
  if(sid){
    try{
      const r=await fetch('/api/setups/'+encodeURIComponent(sid));
      if(r.ok){ const d=await r.json(); if(d.setup && d.setup.config){ loadSetupConfig(d.setup.config); return; } }
    }catch(_){}
  }
  if(!rid && !mid) return;
  setMode('scratch');
  if(rid){ const i=RACKETS.findIndex(r=>String(r._id)===String(rid)); if(i>=0) state.racketIdx=i; }
  if(mid){ const i=STRINGS.findIndex(s=>String(s._id)===String(mid)); if(i>=0){ state.mainId=i; state.mainG=STRINGS[i].g[0]; } }
  syncRacketLabels(); renderRacketSpec(); syncStringSelectors(); update();
}

/* ---- save the current setup (requires login) ---- */
function currentConfig(){
  const racket = state.mode==="goal" ? RACKETS[state.goalRacketIdx] : RACKETS[state.racketIdx];
  const sMain = strById(state.mainId), sCross = strById(state.hybrid?state.crossId:state.mainId);
  return {
    racket: racket.b+" "+racket.n+(racket.ver?" "+racket.ver:""),
    racketId: racket._id,
    hybrid: state.hybrid,
    mains: sMain.b+" "+sMain.n, mainId: sMain._id, mainGauge: state.mainG, mainTension: state.tMain,
    crosses: state.hybrid ? (sCross.b+" "+sCross.n) : null, crossId: state.hybrid?sCross._id:null,
    crossGauge: state.hybrid?state.crossG:null, crossTension: state.hybrid?state.tCross:null,
  };
}
function wireSaveSetup(){
  const btn = document.getElementById('saveSetupBtn');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    if(!window.TLAuth || !TLAuth.user){ location.href='/account.html?next=/'; return; }
    const res = computeScores();
    const name = prompt('Name this setup:', currentConfig().racket+' setup');
    if(name===null) return;
    btn.disabled=true; btn.textContent='Saving…';
    try{
      const r = await fetch('/api/setups',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name, config:currentConfig(), scores:res.scores})});
      if(!r.ok) throw 0;
      btn.textContent='Saved ✓'; setTimeout(()=>{btn.textContent='Save this setup'; btn.disabled=false;},1600);
    }catch{ btn.textContent='Save failed'; setTimeout(()=>{btn.textContent='Save this setup'; btn.disabled=false;},1600); }
  });
}

boot();
