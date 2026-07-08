const express = require("express");
const { many, query, mapString, mapRacket } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/favorites -> { rackets:[...], strings:[...] } (full item data, brand-sorted)
router.get("/", async (req, res, next) => {
  try {
    const rackets = (await many(
      `SELECT r.*, (ri.racket_id IS NOT NULL) AS has_image FROM favorites f
       JOIN rackets r ON r.id = f.item_id
       LEFT JOIN racket_images ri ON ri.racket_id = r.id
       WHERE f.user_id=$1 AND f.kind='racket' ORDER BY lower(r.brand), lower(r.name)`, [req.user.id]
    )).map((r) => Object.assign(mapRacket(r), { has_image: r.has_image }));
    const strings = (await many(
      `SELECT s.* FROM favorites f JOIN strings s ON s.id = f.item_id
       WHERE f.user_id=$1 AND f.kind='string' ORDER BY lower(s.brand), lower(s.name)`, [req.user.id]
    )).map(mapString);
    res.json({ rackets, strings });
  } catch (e) { next(e); }
});

// GET /api/favorites/ids -> { rackets:[id...], strings:[id...] } (for lightweight heart state)
router.get("/ids", async (req, res, next) => {
  try {
    const rows = await many("SELECT kind, item_id FROM favorites WHERE user_id=$1", [req.user.id]);
    res.json({
      rackets: rows.filter((r) => r.kind === "racket").map((r) => r.item_id),
      strings: rows.filter((r) => r.kind === "string").map((r) => r.item_id),
    });
  } catch (e) { next(e); }
});

// POST /api/favorites { kind, item_id }
router.post("/", async (req, res, next) => {
  try {
    const kind = req.body.kind === "racket" ? "racket" : req.body.kind === "string" ? "string" : null;
    const itemId = parseInt(req.body.item_id, 10);
    if (!kind || !Number.isFinite(itemId)) return res.status(400).json({ error: "kind and item_id are required." });
    await query(
      "INSERT INTO favorites (user_id, kind, item_id) VALUES ($1,$2,$3) ON CONFLICT (user_id, kind, item_id) DO NOTHING",
      [req.user.id, kind, itemId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/favorites/:kind/:item_id
router.delete("/:kind/:item_id", async (req, res, next) => {
  try {
    await query("DELETE FROM favorites WHERE user_id=$1 AND kind=$2 AND item_id=$3",
      [req.user.id, req.params.kind, req.params.item_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
