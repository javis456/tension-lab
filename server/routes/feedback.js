const express = require("express");
const crypto = require("crypto");
const { many, one, query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const AX = ["pw", "co", "sp", "cf", "fe", "du", "tm"];
const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
function cleanScores(o) {
  const out = {};
  o = o || {};
  for (const k of AX) out[k] = clamp(o[k]);
  return out;
}

router.get("/", async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT id, setup_id, racket_label, combo_label, algo_scores, player_scores, overall, notes, share_id, created_at
       FROM feedback WHERE user_id=$1 ORDER BY created_at DESC`, [req.user.id]
    );
    res.json({ feedback: rows });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const setupId = parseInt(req.body.setup_id, 10);
    if (!Number.isFinite(setupId)) return res.status(400).json({ error: "Pick a saved combination first." });
    const setup = await one("SELECT * FROM setups WHERE id=$1 AND user_id=$2", [setupId, req.user.id]);
    if (!setup) return res.status(404).json({ error: "Saved combination not found." });

    const cfg = setup.config || {};
    const algo = setup.scores || {};                 // algorithm scores captured when the combo was saved
    const player = cleanScores(req.body.player_scores);
    const overall = req.body.overall == null ? null : clamp(req.body.overall);
    const notes = String(req.body.notes || "").trim().slice(0, 2000);
    const comboLabel = (cfg.hybrid
      ? `${cfg.mains} / ${cfg.crosses}`
      : (cfg.mains || "")) + (cfg.mainTension ? ` @ ${cfg.mainTension} lb` : "");
    const shareId = crypto.randomBytes(6).toString("base64url");

    const row = await one(
      `INSERT INTO feedback (user_id, setup_id, racket_label, combo_label, algo_scores, player_scores, overall, notes, share_id)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9) RETURNING id, share_id`,
      [req.user.id, setupId, cfg.racket || "", comboLabel, JSON.stringify(algo), JSON.stringify(player), overall, notes, shareId]
    );
    res.json({ id: row.id, share_id: row.share_id });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM feedback WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
