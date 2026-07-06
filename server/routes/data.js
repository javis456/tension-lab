const express = require("express");
const { many, one, mapString, mapRacket } = require("../db");
const { wrap } = require("../middleware/auth");
const engine = require("../../public/js/engine");

const router = express.Router();

// sorted by brand, then name — never random
const allStrings = async () =>
  (await many("SELECT * FROM strings ORDER BY lower(brand), lower(name)")).map(mapString);
const allRackets = async () =>
  (await many("SELECT * FROM rackets ORDER BY (brand='—') DESC, lower(brand), lower(name), year")).map(mapRacket);

router.get("/strings", wrap(async (req, res) => res.json({ strings: await allStrings() })));
router.get("/rackets", wrap(async (req, res) => res.json({ rackets: await allRackets() })));

// Score a setup server-side. Body: { racketId, mainId, mainGauge, mainTension, hybrid, crossId, crossGauge, crossTension }
router.post("/score", wrap(async (req, res) => {
  const b = req.body || {};
  const racket = await one("SELECT * FROM rackets WHERE id=$1", [b.racketId]);
  const mainRow = await one("SELECT * FROM strings WHERE id=$1", [b.mainId]);
  if (!racket || !mainRow) return res.status(400).json({ error: "Unknown racket or string." });
  const R = mapRacket(racket), M = mapString(mainRow);
  const hybrid = !!b.hybrid;
  const crossRow = hybrid ? await one("SELECT * FROM strings WHERE id=$1", [b.crossId]) : mainRow;
  const C = mapString(crossRow || mainRow);
  const main = { ratings: M.ratings, material: M.material, geo: M.geo, gauge: +b.mainGauge || M.gauges[0], tension: +b.mainTension || 52 };
  const cross = { ratings: C.ratings, material: C.material, geo: C.geo, gauge: +b.crossGauge || C.gauges[0], tension: +b.crossTension || main.tension };
  const { scores, synergy } = engine.scoreSetup(main, cross, R, hybrid);
  res.json({ scores, synergy, archetype: engine.archetype(scores) });
}));

// Every string, scored solo on the reference frame, for the comparison table.
router.get("/compare", wrap(async (req, res) => {
  const rows = (await allStrings()).map((s) => ({
    id: s.id, brand: s.brand, name: s.name, material: s.material, geo: s.geo,
    tier: s.tier, price_usd: s.price_usd, gauges: s.gauges, known_for: s.known_for,
    scores: engine.scoreStringSolo(s),
  }));
  res.json({ strings: rows, axes: engine.ATTRS });
}));

/* ---- site visitor counter (public) ---- */
// GET current count
router.get("/stats", wrap(async (req, res) => {
  const row = await one("SELECT value FROM site_stats WHERE key='visits'");
  res.json({ visits: row ? Number(row.value) : 0 });
}));
// POST a visit -> increments once and returns the new count.
// The frontend only calls this once per browser session (cookie-gated).
router.post("/visit", wrap(async (req, res) => {
  const row = await one(
    "UPDATE site_stats SET value = value + 1 WHERE key='visits' RETURNING value"
  );
  res.json({ visits: row ? Number(row.value) : 0 });
}));

module.exports = router;
