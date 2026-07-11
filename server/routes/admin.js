const express = require("express");
const { one, many, query, mapString, mapRacket } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const ai = require("../ai");
const engine = require("../../public/js/engine");
const { computeTags, scoreFromConfig } = require("../combo");
const { normalizeString, normalizeRacket } = ai;
const { parseToRecords } = require("../csv");
const { MATERIALS, GEOMETRIES } = require("../rubric");

const router = express.Router();
router.use(requireAdmin);

/* ---- bulk upload: header-name column mapping (never positional) ---- */
const STRING_ALIASES = {
  brand: ["brand"], name: ["name", "string", "product", "model"],
  material: ["material", "type"], geo: ["geo", "geometry", "shape"],
  gauges: ["gauges", "gauge", "gaugesmm", "diameter", "diameters"],
  tier: ["tier", "pricetier"], price_usd: ["price", "priceusd", "cost", "usd", "priceusd$"],
  known_for: ["knownfor", "summary", "description", "desc"], claim: ["claim", "manufacturerclaim", "marketing"],
  pw: ["pw", "power"], co: ["co", "control"], sp: ["sp", "spin"], cf: ["cf", "comfort"],
  fe: ["fe", "feel"], du: ["du", "durability"], tm: ["tm", "tension", "tensionmaintenance", "tensionhold"],
};
const STRING_REQUIRED = ["brand", "name"];
const RACKET_ALIASES = {
  brand: ["brand"], name: ["name", "model", "product"], ver: ["ver", "version"], year: ["year"],
  mains: ["mains", "mainpattern", "mainscount"], crosses: ["crosses", "crosspattern", "crossescount"],
  head_size: ["headsize", "head"], ra: ["ra", "stiffness", "stiffnessra"],
  weight: ["weight", "weightg", "mass"], char: ["char", "character", "style"],
  known_for: ["knownfor", "summary", "description", "desc"],
};
const RACKET_REQUIRED = ["brand", "name"];

function recordToString(rec) {
  const gm = String(rec.gauges || "").match(/[\d.]+/g);
  const gauges = (gm || []).map(Number).filter((x) => x > 0.6 && x < 2);
  const ratings = {};
  ["pw", "co", "sp", "cf", "fe", "du", "tm"].forEach((k) => { if (rec[k] != null && rec[k] !== "") ratings[k] = Number(rec[k]); });
  return {
    brand: rec.brand, name: rec.name,
    material: rec.material ? String(rec.material).trim().toLowerCase() : undefined,
    geo: rec.geo ? String(rec.geo).trim().toLowerCase() : undefined,
    gauges, tier: rec.tier, price_usd: rec.price_usd, known_for: rec.known_for, claim: rec.claim, ratings,
  };
}
const recordToRacket = (rec) => ({
  brand: rec.brand, name: rec.name, ver: rec.ver, year: rec.year, mains: rec.mains, crosses: rec.crosses,
  head_size: rec.head_size, ra: rec.ra, weight: rec.weight, char: rec.char, known_for: rec.known_for,
});

function bulkParse(type, csv) {
  const isStr = type !== "racket";
  const parsed = parseToRecords(csv, isStr ? STRING_ALIASES : RACKET_ALIASES, isStr ? STRING_REQUIRED : RACKET_REQUIRED);
  return Object.assign({ isStr }, parsed);
}
function validateRow(isStr, rec) {
  const raw = isStr ? recordToString(rec) : recordToRacket(rec);
  const data = isStr ? normalizeString(raw) : normalizeRacket(raw);
  const errors = [], warnings = [];
  if (!data.brand) errors.push("missing brand");
  if (!data.name) errors.push("missing name");
  if (isStr) {
    if (rec.material && !MATERIALS.includes(String(rec.material).trim().toLowerCase())) warnings.push(`material “${rec.material}” → ${data.material}`);
    if (rec.geo && !GEOMETRIES.includes(String(rec.geo).trim().toLowerCase())) warnings.push(`geo “${rec.geo}” → ${data.geo}`);
    if (rec.gauges && !raw.gauges.length) warnings.push("gauges unreadable → default");
  }
  return { line: rec.__line, ok: errors.length === 0, errors, warnings, data };
}

router.post("/bulk/preview", (req, res) => {
  try {
    const type = req.body.type === "racket" ? "racket" : "string";
    const { isStr, headerMap, headers, records, missingRequired } = bulkParse(type, String(req.body.csv || ""));
    if (missingRequired.length) return res.status(400).json({ error: "Your header row must include: " + missingRequired.join(", ") + ". Use the template so columns are named correctly." });
    const rows = records.map((r) => validateRow(isStr, r));
    const mapping = {};
    for (const k in headerMap) mapping[k] = headerMap[k].header;
    res.json({ type, mapping, total: rows.length, valid: rows.filter((r) => r.ok).length, rows: rows.slice(0, 1000) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/bulk/commit", async (req, res) => {
  try {
    const type = req.body.type === "racket" ? "racket" : "string";
    const { isStr, records, missingRequired } = bulkParse(type, String(req.body.csv || ""));
    if (missingRequired.length) return res.status(400).json({ error: "Missing required column(s): " + missingRequired.join(", ") });
    let inserted = 0; const errors = [];
    for (const rec of records) {
      const v = validateRow(isStr, rec);
      if (!v.ok) { errors.push({ line: v.line, error: v.errors.join(", ") }); continue; }
      const s = v.data;
      try {
        if (isStr) {
          await query(`INSERT INTO strings (brand,name,material,geo,gauges,tier,known_for,claim,ratings,price_usd)
            VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10)`,
            [s.brand, s.name, s.material, s.geo, JSON.stringify(s.gauges), s.tier, s.known_for, s.claim, JSON.stringify(s.ratings), s.price_usd]);
        } else {
          await query(`INSERT INTO rackets (brand,name,ver,year,mains,crosses,head_size,ra,weight,char_label,known_for)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [s.brand, s.name, s.ver, s.year, s.mains, s.crosses, s.head_size, s.ra, s.weight, s.char, s.known_for]);
        }
        inserted++;
      } catch (e) { errors.push({ line: v.line, error: e.message }); }
    }
    res.json({ inserted, skipped: records.length - inserted, errors });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) =>
  res.status(500).json({ error: e.message || "Server error." }));

/* ============================================================
   BULK SHARE TO EXPLORE (admin only)
   The template only needs setup ingredients — the engine computes
   the 7 scores, archetype, and tags automatically.
   ============================================================ */
const EXPLORE_ALIASES = {
  name: ["name", "combo", "combination", "title"],
  description: ["description", "desc", "notes", "note"],
  racket: ["racket", "frame"],
  main_string: ["mainstring", "main", "mains", "string", "mainstrings"],
  main_gauge: ["maingauge", "gauge", "maingaugemm"],
  main_tension: ["maintension", "tension", "lb", "lbs", "maintensionlb"],
  cross_string: ["crossstring", "cross", "crosses"],
  cross_gauge: ["crossgauge", "crossgaugemm"],
  cross_tension: ["crosstension", "crosstensionlb"],
  pair_rackets: ["pairrackets", "rackets", "pairedrackets", "pairwith", "pairswith", "alsopairswith"],
  username: ["username", "user", "by", "sharer", "author"],
};
const EXPLORE_REQUIRED = ["name", "racket", "main_string"];

const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function resolve(list, input, disp) {
  const n = norm(input);
  if (!n) return null;
  for (const it of list) { // exact on "brand name ver" / "brand name" / "name"
    if ([norm(disp(it, true)), norm(disp(it, false)), norm(it.name)].includes(n)) return it;
  }
  for (const it of list) { const bn = norm(disp(it, false)); if (bn.startsWith(n) || n.startsWith(bn)) return it; }
  const tin = n.split(" ");
  for (const it of list) { const toks = new Set(norm(disp(it, true)).split(" ")); if (tin.every((t) => toks.has(t))) return it; }
  return null;
}
const racketDisp = (r, withVer) => (r.brand === "\u2014" ? r.name : r.brand + " " + r.name + (withVer && r.ver ? " " + r.ver : ""));
const stringDisp = (s) => s.brand + " " + s.name;

async function buildExploreRow(rec, rackets, strings, users, adminId) {
  const errors = [], warnings = [];
  const name = String(rec.name || "").trim().slice(0, 42);
  let description = String(rec.description || "").trim();
  if (description.split(/\s+/).filter(Boolean).length > 100) { description = description.split(/\s+/).slice(0, 100).join(" "); warnings.push("description trimmed to 100 words"); }
  if (!name) errors.push("missing name");
  const racket = resolve(rackets, rec.racket, racketDisp);
  if (!racket) errors.push('racket not found: "' + (rec.racket || "") + '"');
  const main = resolve(strings, rec.main_string, (s) => stringDisp(s));
  if (!main) errors.push('main string not found: "' + (rec.main_string || "") + '"');
  const hasCross = rec.cross_string && String(rec.cross_string).trim();
  const cross = hasCross ? resolve(strings, rec.cross_string, (s) => stringDisp(s)) : null;
  if (hasCross && !cross) warnings.push('cross string not found: "' + rec.cross_string + '" → treated as full bed');

  let userId = adminId, byName = null;
  if (rec.username && String(rec.username).trim()) {
    const u = users.find((x) => norm(x.username) === norm(rec.username));
    if (u) { userId = u.id; byName = u.username; } else warnings.push('user "' + rec.username + '" not found → shared as you');
  }
  if (errors.length) return { line: rec.__line, ok: false, errors, warnings, data: { name } };

  const gnum = (v, def) => { const m = String(v || "").match(/[\d.]+/); return m ? Number(m[0]) : def; };
  const midGauge = (s) => (s.gauges && s.gauges[Math.floor(s.gauges.length / 2)]) || 1.25;
  const config = {
    racket: racketDisp(racket, true), racketId: racket.id,
    hybrid: !!(hasCross && cross),
    mains: stringDisp(main), mainId: main.id,
    mainGauge: gnum(rec.main_gauge, midGauge(main)), mainTension: gnum(rec.main_tension, 52),
    crosses: hasCross && cross ? stringDisp(cross) : null, crossId: cross ? cross.id : null,
    crossGauge: cross ? gnum(rec.cross_gauge, midGauge(cross)) : null,
    crossTension: cross ? gnum(rec.cross_tension, gnum(rec.main_tension, 52)) : null,
  };
  const scored = await scoreFromConfig(config);
  if (!scored) { errors.push("could not score this setup"); return { line: rec.__line, ok: false, errors, warnings, data: { name } }; }
  const arche = engine.archetype(scored.scores).h;
  const tags = computeTags(scored.scores, config, scored.mainMaterial);

  // paired rackets: primary + any listed
  const racketIds = [racket.id];
  if (rec.pair_rackets) {
    for (const p of String(rec.pair_rackets).split(/[;|]/).map((x) => x.trim()).filter(Boolean)) {
      const pr = resolve(rackets, p, racketDisp);
      if (pr && !racketIds.includes(pr.id)) racketIds.push(pr.id);
      else if (!pr) warnings.push('pair racket not found: "' + p + '"');
    }
  }
  return {
    line: rec.__line, ok: true, errors, warnings,
    data: { name, archetype: arche, racket: config.racket, main: config.mains, hybrid: config.hybrid, tags, by: byName },
    built: { userId, name, description, config, scores: scored.scores, archetype: arche, tags, racketIds },
  };
}

async function exploreCatalogs() {
  const rackets = (await many("SELECT id, brand, name, ver FROM rackets")).map((r) => r);
  const strings = (await many("SELECT id, brand, name, gauges FROM strings")).map(mapString);
  const users = await many("SELECT id, username FROM users WHERE username IS NOT NULL");
  return { rackets, strings, users };
}
function exploreParse(csv) {
  const { parseToRecords } = require("../csv");
  return parseToRecords(csv, EXPLORE_ALIASES, EXPLORE_REQUIRED);
}

router.post("/explore/bulk/preview", wrap(async (req, res) => {
  const { headerMap, records, missingRequired } = exploreParse(String(req.body.csv || ""));
  if (missingRequired.length) return res.status(400).json({ error: "Your header row must include: " + missingRequired.join(", ") + ". Use the template so columns are named correctly." });
  const { rackets, strings, users } = await exploreCatalogs();
  const rows = [];
  for (const rec of records.slice(0, 1000)) rows.push(await buildExploreRow(rec, rackets, strings, users, req.user.id));
  const mapping = {}; for (const k in headerMap) mapping[k] = headerMap[k].header;
  res.json({ mapping, total: records.length, valid: rows.filter((r) => r.ok).length, rows });
}));

router.post("/explore/bulk/commit", wrap(async (req, res) => {
  const { records, missingRequired } = exploreParse(String(req.body.csv || ""));
  if (missingRequired.length) return res.status(400).json({ error: "Missing required column(s): " + missingRequired.join(", ") });
  const { rackets, strings, users } = await exploreCatalogs();
  let inserted = 0; const errors = [];
  for (const rec of records) {
    const r = await buildExploreRow(rec, rackets, strings, users, req.user.id);
    if (!r.ok) { errors.push({ line: r.line, error: r.errors.join(", ") }); continue; }
    const b = r.built;
    try {
      const row = await one(
        "INSERT INTO explore_combos (user_id,name,description,config,scores,archetype,tags) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) RETURNING id",
        [b.userId, b.name, b.description, JSON.stringify(b.config), JSON.stringify(b.scores), b.archetype, b.tags]);
      for (const rid of b.racketIds) await query("INSERT INTO combo_rackets (combo_id,racket_id,added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [row.id, rid, b.userId]);
      inserted++;
    } catch (e) { errors.push({ line: r.line, error: e.message }); }
  }
  res.json({ inserted, skipped: records.length - inserted, errors });
}));


/* ---- which AI models are available (for the admin dropdown) ---- */
router.get("/ai-models", (req, res) => res.json(ai.availableModels()));

/* ---- AI lookup (preview only; does not write) ---- */
router.post("/ai-lookup", async (req, res) => {
  try {
    const type = req.body.type === "racket" ? "racket" : "string";
    const brand = String(req.body.brand || "").trim();
    const name = String(req.body.name || "").trim();
    const model = String(req.body.model || "").trim();
    const result = await ai.lookup(type, brand, name, model);
    res.json({ type, ...result });
  } catch (e) {
    res.status(502).json({ error: e.message || "AI lookup failed." });
  }
});

/* ============================================================
   EXPORT current catalog as CSV (admin) — same columns as the
   bulk-upload template, so you can download, edit, and re-import.
   ============================================================ */
const EXPORT_STRING_COLS = ["brand", "name", "material", "geo", "gauges", "tier", "price_usd", "known_for", "claim", "pw", "co", "sp", "cf", "fe", "du", "tm"];
const EXPORT_RACKET_COLS = ["brand", "name", "ver", "year", "mains", "crosses", "head_size", "ra", "weight", "char", "known_for"];
const csvCell = (v) => { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

router.get("/export/:type", wrap(async (req, res) => {
  const type = req.params.type === "rackets" ? "rackets" : "strings";
  let cols, rows;
  if (type === "strings") {
    cols = EXPORT_STRING_COLS;
    const list = (await many("SELECT * FROM strings ORDER BY lower(brand), lower(name)")).map(mapString);
    rows = list.map((s) => {
      const g = (s.gauges || []).join("|"), r = s.ratings || {};
      return [s.brand, s.name, s.material, s.geo, g, s.tier, s.price_usd, s.known_for, s.claim, r.pw, r.co, r.sp, r.cf, r.fe, r.du, r.tm];
    });
  } else {
    cols = EXPORT_RACKET_COLS;
    const list = (await many("SELECT * FROM rackets WHERE owner_user_id IS NULL ORDER BY (brand='\u2014') DESC, lower(brand), lower(name), year")).map(mapRacket);
    rows = list.map((r) => [r.brand, r.name, r.ver, r.year, r.mains, r.crosses, r.head_size, r.ra, r.weight, r.char, r.known_for]);
  }
  const csv = cols.join(",") + "\n" + rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="tension-lab-' + type + '.csv"');
  res.send(csv);
}));

/* ---- strings CRUD ---- */
router.post("/strings", wrap(async (req, res) => {
  const s = normalizeString(req.body);
  if (!s.brand || !s.name) return res.status(400).json({ error: "Brand and name are required." });
  const row = await one(
    `INSERT INTO strings (brand,name,material,geo,gauges,tier,known_for,claim,ratings,price_usd)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10) RETURNING *`,
    [s.brand, s.name, s.material, s.geo, JSON.stringify(s.gauges), s.tier, s.known_for, s.claim, JSON.stringify(s.ratings), s.price_usd]
  );
  res.json({ id: row.id, string: mapString(row) });
}));

router.put("/strings/:id", wrap(async (req, res) => {
  const s = normalizeString(req.body);
  const row = await one(
    `UPDATE strings SET brand=$1,name=$2,material=$3,geo=$4,gauges=$5::jsonb,tier=$6,
       known_for=$7,claim=$8,ratings=$9::jsonb,price_usd=$10,updated_at=now() WHERE id=$11 RETURNING *`,
    [s.brand, s.name, s.material, s.geo, JSON.stringify(s.gauges), s.tier, s.known_for, s.claim, JSON.stringify(s.ratings), s.price_usd, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "String not found." });
  res.json({ string: mapString(row) });
}));

router.delete("/strings/:id", wrap(async (req, res) => {
  await query("DELETE FROM strings WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

/* ---- rackets CRUD ---- */
router.post("/rackets", wrap(async (req, res) => {
  const r = normalizeRacket(req.body);
  if (!r.brand || !r.name) return res.status(400).json({ error: "Brand and name are required." });
  const row = await one(
    `INSERT INTO rackets (brand,name,ver,year,mains,crosses,head_size,ra,weight,char_label,known_for)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [r.brand, r.name, r.ver, r.year, r.mains, r.crosses, r.head_size, r.ra, r.weight, r.char, r.known_for]
  );
  res.json({ id: row.id, racket: mapRacket(row) });
}));

router.put("/rackets/:id", wrap(async (req, res) => {
  const r = normalizeRacket(req.body);
  const row = await one(
    `UPDATE rackets SET brand=$1,name=$2,ver=$3,year=$4,mains=$5,crosses=$6,head_size=$7,
       ra=$8,weight=$9,char_label=$10,known_for=$11,updated_at=now() WHERE id=$12 RETURNING *`,
    [r.brand, r.name, r.ver, r.year, r.mains, r.crosses, r.head_size, r.ra, r.weight, r.char, r.known_for, req.params.id]
  );
  if (!row) return res.status(404).json({ error: "Racket not found." });
  res.json({ racket: mapRacket(row) });
}));

router.delete("/rackets/:id", wrap(async (req, res) => {
  await query("DELETE FROM rackets WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

/* ---- racket photo upload / delete ---- */
const IMG_TYPES = { "image/png": 1, "image/jpeg": 1, "image/webp": 1 };
router.post("/rackets/:id/image", async (req, res) => {
  try {
    const racket = await one("SELECT id FROM rackets WHERE id=$1", [req.params.id]);
    if (!racket) return res.status(404).json({ error: "Racket not found." });
    const ct = String(req.body.content_type || "").toLowerCase();
    if (!IMG_TYPES[ct]) return res.status(400).json({ error: "Image must be PNG, JPEG or WebP." });
    let b64 = String(req.body.data || "");
    const comma = b64.indexOf(","); if (b64.startsWith("data:") && comma >= 0) b64 = b64.slice(comma + 1);
    const buf = Buffer.from(b64, "base64");
    if (!buf.length) return res.status(400).json({ error: "Empty image." });
    if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: "Image too large (max 5 MB)." });
    await query(
      `INSERT INTO racket_images (racket_id, content_type, data, updated_at) VALUES ($1,$2,$3, now())
       ON CONFLICT (racket_id) DO UPDATE SET content_type=EXCLUDED.content_type, data=EXCLUDED.data, updated_at=now()`,
      [req.params.id, ct, buf]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete("/rackets/:id/image", async (req, res) => {
  try {
    await query("DELETE FROM racket_images WHERE racket_id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
