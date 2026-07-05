const express = require("express");
const { many, one, query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const rows = await many(
      "SELECT id, name, config, scores, created_at FROM setups WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ setups: rows }); // config/scores are jsonb -> already objects
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim() || "Untitled setup";
    const { config, scores } = req.body;
    if (!config || !scores) return res.status(400).json({ error: "Missing setup data." });
    const row = await one(
      "INSERT INTO setups (user_id, name, config, scores) VALUES ($1,$2,$3,$4) RETURNING id",
      [req.user.id, name, JSON.stringify(config), JSON.stringify(scores)]
    );
    res.json({ id: row.id });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM setups WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
