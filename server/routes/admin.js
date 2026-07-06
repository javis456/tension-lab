const express = require("express");
const { one, query, mapString, mapRacket } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const ai = require("../ai");
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

module.exports = router;
