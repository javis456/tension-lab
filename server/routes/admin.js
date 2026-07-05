const express = require("express");
const { one, query, mapString, mapRacket } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const ai = require("../ai");
const { normalizeString, normalizeRacket } = ai;

const router = express.Router();
router.use(requireAdmin);

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) =>
  res.status(500).json({ error: e.message || "Server error." }));

/* ---- AI lookup (preview only; does not write) ---- */
router.post("/ai-lookup", async (req, res) => {
  try {
    const type = req.body.type === "racket" ? "racket" : "string";
    const brand = String(req.body.brand || "").trim();
    const name = String(req.body.name || "").trim();
    const result = await ai.lookup(type, brand, name);
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
