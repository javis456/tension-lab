const express = require("express");
const { many, one, query, mapString, mapRacket } = require("../db");
const { wrap, currentUser } = require("../middleware/auth");
const engine = require("../../public/js/engine");

const router = express.Router();

// sorted by brand, then name — never random
const allStrings = async () =>
  (await many("SELECT * FROM strings ORDER BY lower(brand), lower(name)")).map(mapString);
const allRackets = async (userId) => {
  const rows = await many(
    `SELECT r.*, (ri.racket_id IS NOT NULL) AS has_image FROM rackets r
     LEFT JOIN racket_images ri ON ri.racket_id = r.id
     WHERE r.owner_user_id IS NULL OR r.owner_user_id = $1
     ORDER BY COALESCE(r.owner_user_id = $1, false) DESC, (r.brand='—') DESC, lower(r.brand), lower(r.name), r.year`,
    [userId == null ? -1 : userId]
  );
  return rows.map((r) => Object.assign(mapRacket(r), { mine: userId != null && r.owner_user_id === userId, has_image: r.has_image }));
};

router.get("/strings", wrap(async (req, res) => res.json({ strings: await allStrings() })));
router.get("/rackets", wrap(async (req, res) => {
  const u = await currentUser(req);
  res.json({ rackets: await allRackets(u ? u.id : null) });
}));

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

/* ---- public shared feedback (no auth) ---- */
router.get("/share/:shareId", wrap(async (req, res) => {
  const row = await one(
    `SELECT racket_label, combo_label, algo_scores, player_scores, overall, notes, created_at
     FROM feedback WHERE share_id=$1`, [req.params.shareId]
  );
  if (!row) return res.status(404).json({ error: "This shared feedback was not found." });
  res.json({ feedback: row, axes: engine.ATTRS });
}));

/* ---- racket photo (public, cached) ---- */
router.get("/rackets/:id/image", wrap(async (req, res) => {
  const r = await query("SELECT content_type, data FROM racket_images WHERE racket_id=$1", [req.params.id]);
  if (!r.rows.length) return res.status(404).end();
  const row = r.rows[0];
  res.set("Content-Type", row.content_type || "image/png");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(row.data); // pg returns bytea as a Buffer
}));

module.exports = router;
