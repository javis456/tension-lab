const express = require("express");
const { many, one, query, mapRacket } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { normalizeRacket } = require("../ai");

const router = express.Router();
router.use(requireAuth);

// GET /api/my/rackets -> the user's own rackets
router.get("/rackets", async (req, res, next) => {
  try {
    const rows = await many(
      "SELECT * FROM rackets WHERE owner_user_id=$1 ORDER BY lower(brand), lower(name)", [req.user.id]
    );
    res.json({ rackets: rows.map(mapRacket) });
  } catch (e) { next(e); }
});

// POST /api/my/rackets -> add one of my own rackets
router.post("/rackets", async (req, res, next) => {
  try {
    const r = normalizeRacket(req.body);
    if (!r.brand || !r.name) return res.status(400).json({ error: "Brand and name are required." });
    const row = await one(
      `INSERT INTO rackets (brand,name,ver,year,mains,crosses,head_size,ra,weight,char_label,known_for,owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [r.brand, r.name, r.ver, r.year, r.mains, r.crosses, r.head_size, r.ra, r.weight, r.char, r.known_for, req.user.id]
    );
    res.json({ racket: mapRacket(row) });
  } catch (e) { next(e); }
});

// DELETE /api/my/rackets/:id -> only my own
router.delete("/rackets/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM rackets WHERE id=$1 AND owner_user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
