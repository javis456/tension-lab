const express = require("express");
const router = express.Router();
const { one, many, query } = require("../db");
const { currentUser, requireAuth, wrap } = require("../middleware/auth");

/* archetype + tags (server-side mirror of the engine's summary) */
function archetype(s) {
  const { co, pw, sp, cf } = s;
  if (co >= 78 && sp >= 78) return { h: "Heavy-spin control", tag: ["control", "spin"] };
  if (co >= 80) return { h: "Precision control", tag: ["control"] };
  if (pw >= 78 && cf >= 72) return { h: "Comfort power", tag: ["power", "comfort"] };
  if (sp >= 82) return { h: "Spin-first", tag: ["spin"] };
  if (pw >= 76) return { h: "Power setup", tag: ["power"] };
  if (cf >= 78) return { h: "Comfort-first", tag: ["comfort"] };
  return { h: "Balanced all-court", tag: ["all-round"] };
}
function computeTags(scores, config, mat) {
  const t = new Set(archetype(scores).tag);
  if (config.hybrid) t.add("hybrid");
  if (mat) { if (String(mat).includes("poly")) t.add("poly"); else if (["gut", "multi", "zyex"].includes(mat)) t.add("soft"); }
  if (scores.sp >= 75) t.add("spin");
  if (scores.cf >= 70) t.add("arm-friendly");
  if (scores.pw >= 72) t.add("power");
  if (scores.co >= 78) t.add("control");
  if (scores.du >= 78) t.add("durable");
  return [...t];
}
// the fixed set of filter tags the UI offers
const ALL_TAGS = ["control", "spin", "power", "comfort", "all-round", "hybrid", "poly", "soft", "arm-friendly", "durable"];

async function topRacket(comboId) {
  return one(
    `SELECT cr.id, r.brand, r.name, r.ver, cr.racket_id,
       (ri.racket_id IS NOT NULL) AS has_image, EXTRACT(EPOCH FROM ri.updated_at)::bigint AS img_v,
       COALESCE((SELECT sum(dir) FROM combo_racket_votes rv WHERE rv.combo_racket_id=cr.id),0) AS rv
     FROM combo_rackets cr JOIN rackets r ON r.id=cr.racket_id
     LEFT JOIN racket_images ri ON ri.racket_id=r.id
     WHERE cr.combo_id=$1 ORDER BY rv DESC, cr.created_at ASC LIMIT 1`, [comboId]);
}

/* ---------------- list ---------------- */
router.get("/", wrap(async (req, res) => {
  const me = await currentUser(req);
  const tag = req.query.tag && req.query.tag !== "all" ? String(req.query.tag) : null;
  const sort = ["hot", "new", "popular"].includes(req.query.sort) ? req.query.sort : "popular";
  const order = sort === "new" ? "c.created_at DESC"
    : sort === "hot" ? "(COALESCE(v.net,0) / power(EXTRACT(EPOCH FROM (now()-c.created_at))/3600 + 2, 1.5)) DESC, c.created_at DESC"
    : "COALESCE(v.net,0) DESC, c.created_at DESC";
  const params = [];
  let where = "";
  if (tag) { params.push(tag); where = "WHERE $" + params.length + " = ANY(c.tags)"; }
  let myVote = "NULL::smallint";
  if (me) { params.push(me.id); myVote = "(SELECT dir FROM combo_votes mv WHERE mv.combo_id=c.id AND mv.user_id=$" + params.length + ")"; }
  const rows = await many(
    `SELECT c.id, c.name, c.description, c.archetype, c.tags, c.scores, c.config, c.created_at, u.username,
       COALESCE(v.net,0) AS votes,
       (SELECT count(*) FROM combo_comments cc WHERE cc.combo_id=c.id) AS comments,
       (SELECT count(*) FROM combo_rackets cr WHERE cr.combo_id=c.id) AS rackets,
       ${myVote} AS my_vote
     FROM explore_combos c JOIN users u ON u.id=c.user_id
     LEFT JOIN (SELECT combo_id, sum(dir) net FROM combo_votes GROUP BY combo_id) v ON v.combo_id=c.id
     ${where} ORDER BY ${order} LIMIT 60`, params);
  const combos = [];
  for (const c of rows) {
    combos.push({
      id: c.id, name: c.name, description: c.description, archetype: c.archetype, tags: c.tags,
      scores: c.scores, config: c.config, username: c.username, votes: Number(c.votes),
      my_vote: c.my_vote || 0, comments: Number(c.comments), rackets: Number(c.rackets),
      created_at: c.created_at, top_racket: await topRacket(c.id),
    });
  }
  res.json({ combos, sort, tag: tag || "all", tags: ALL_TAGS });
}));

/* ---------------- top (for Setup goal suggestions) — must be before /:id ---------------- */
router.get("/top", wrap(async (req, res) => {
  const rows = await many(
    `SELECT c.id, c.name, c.archetype, c.scores, c.config, u.username, COALESCE(v.net,0) AS votes
     FROM explore_combos c JOIN users u ON u.id=c.user_id
     LEFT JOIN (SELECT combo_id, sum(dir) net FROM combo_votes GROUP BY combo_id) v ON v.combo_id=c.id
     ORDER BY COALESCE(v.net,0) DESC, c.created_at DESC LIMIT 30`);
  res.json({ combos: rows.map((c) => ({ id: c.id, name: c.name, archetype: c.archetype, scores: c.scores, config: c.config, username: c.username, votes: Number(c.votes) })) });
}));

/* ---------------- detail ---------------- */
router.get("/:id", wrap(async (req, res) => {
  const me = await currentUser(req);
  const id = req.params.id;
  const c = await one(
    `SELECT c.*, u.username,
       COALESCE((SELECT sum(dir) FROM combo_votes v WHERE v.combo_id=c.id),0) AS votes
     FROM explore_combos c JOIN users u ON u.id=c.user_id WHERE c.id=$1`, [id]);
  if (!c) return res.status(404).json({ error: "Not found." });
  const myVote = me ? await one("SELECT dir FROM combo_votes WHERE combo_id=$1 AND user_id=$2", [id, me.id]) : null;
  const rackets = (await many(
    `SELECT cr.id, r.brand, r.name, r.ver, cr.racket_id, ua.username AS added_by,
       (ri.racket_id IS NOT NULL) AS has_image, EXTRACT(EPOCH FROM ri.updated_at)::bigint AS img_v,
       COALESCE((SELECT sum(dir) FROM combo_racket_votes rv WHERE rv.combo_racket_id=cr.id),0) AS votes
       ${me ? ",(SELECT dir FROM combo_racket_votes rv2 WHERE rv2.combo_racket_id=cr.id AND rv2.user_id=$2) AS my_vote" : ""}
     FROM combo_rackets cr JOIN rackets r ON r.id=cr.racket_id
     LEFT JOIN users ua ON ua.id=cr.added_by
     LEFT JOIN racket_images ri ON ri.racket_id=r.id
     WHERE cr.combo_id=$1 ORDER BY votes DESC, cr.created_at ASC`, me ? [id, me.id] : [id]
  )).map((r) => ({ id: r.id, racket_id: r.racket_id, brand: r.brand, name: r.name, ver: r.ver, added_by: r.added_by, has_image: r.has_image, img_v: r.img_v, votes: Number(r.votes), my_vote: r.my_vote || 0 }));
  const comments = (await many(
    `SELECT cc.id, cc.body, cc.created_at, u.username, cc.racket_id, r.brand, r.name
     FROM combo_comments cc JOIN users u ON u.id=cc.user_id
     LEFT JOIN rackets r ON r.id=cc.racket_id
     WHERE cc.combo_id=$1 ORDER BY cc.created_at ASC LIMIT 200`, [id]
  )).map((c2) => ({ id: c2.id, body: c2.body, username: c2.username, created_at: c2.created_at, racket: c2.racket_id ? (c2.brand + " " + c2.name) : null }));
  res.json({
    combo: { id: c.id, name: c.name, description: c.description, archetype: c.archetype, tags: c.tags, scores: c.scores, config: c.config, username: c.username, votes: Number(c.votes), my_vote: myVote ? myVote.dir : 0, created_at: c.created_at },
    rackets, comments,
  });
}));

/* ---------------- share ---------------- */
router.post("/", requireAuth, wrap(async (req, res) => {
  let name = String(req.body.name || "").trim().slice(0, 42);
  let description = String(req.body.description || "").trim();
  if (description.split(/\s+/).filter(Boolean).length > 100) description = description.split(/\s+/).slice(0, 100).join(" ");
  if (!name) return res.status(400).json({ error: "Please name your combination." });
  const setup = await one("SELECT config, scores FROM setups WHERE id=$1 AND user_id=$2", [req.body.setupId, req.user.id]);
  if (!setup) return res.status(404).json({ error: "Saved combination not found." });
  const config = setup.config, scores = setup.scores;
  let mat = null;
  if (config.mainId) { const s = await one("SELECT material FROM strings WHERE id=$1", [config.mainId]); mat = s && s.material; }
  const arche = archetype(scores).h;
  const tags = computeTags(scores, config, mat);
  const row = await one(
    "INSERT INTO explore_combos (user_id, name, description, config, scores, archetype, tags) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7) RETURNING id",
    [req.user.id, name, description, JSON.stringify(config), JSON.stringify(scores), arche, tags]
  );
  if (config.racketId) {
    await query("INSERT INTO combo_rackets (combo_id, racket_id, added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [row.id, config.racketId, req.user.id]);
  }
  res.json({ id: row.id });
}));

/* ---------------- vote on a combo ---------------- */
router.post("/:id/vote", requireAuth, wrap(async (req, res) => {
  const dir = Number(req.body.dir);
  if (![1, -1, 0].includes(dir)) return res.status(400).json({ error: "Bad vote." });
  if (dir === 0) await query("DELETE FROM combo_votes WHERE combo_id=$1 AND user_id=$2", [req.params.id, req.user.id]);
  else await query("INSERT INTO combo_votes (combo_id,user_id,dir) VALUES ($1,$2,$3) ON CONFLICT (combo_id,user_id) DO UPDATE SET dir=EXCLUDED.dir", [req.params.id, req.user.id, dir]);
  const v = await one("SELECT COALESCE(sum(dir),0) AS net FROM combo_votes WHERE combo_id=$1", [req.params.id]);
  res.json({ votes: Number(v.net), my_vote: dir });
}));

/* ---------------- add a racket pairing ---------------- */
router.post("/:id/rackets", requireAuth, wrap(async (req, res) => {
  const racketId = Number(req.body.racketId);
  if (!racketId) return res.status(400).json({ error: "Pick a racket." });
  const r = await one(
    "INSERT INTO combo_rackets (combo_id,racket_id,added_by) VALUES ($1,$2,$3) ON CONFLICT (combo_id,racket_id) DO UPDATE SET racket_id=EXCLUDED.racket_id RETURNING id",
    [req.params.id, racketId, req.user.id]);
  res.json({ id: r.id });
}));

/* ---------------- vote on a racket pairing ---------------- */
router.post("/rackets/:crid/vote", requireAuth, wrap(async (req, res) => {
  const dir = Number(req.body.dir);
  if (![1, -1, 0].includes(dir)) return res.status(400).json({ error: "Bad vote." });
  if (dir === 0) await query("DELETE FROM combo_racket_votes WHERE combo_racket_id=$1 AND user_id=$2", [req.params.crid, req.user.id]);
  else await query("INSERT INTO combo_racket_votes (combo_racket_id,user_id,dir) VALUES ($1,$2,$3) ON CONFLICT (combo_racket_id,user_id) DO UPDATE SET dir=EXCLUDED.dir", [req.params.crid, req.user.id, dir]);
  const v = await one("SELECT COALESCE(sum(dir),0) AS net FROM combo_racket_votes WHERE combo_racket_id=$1", [req.params.crid]);
  res.json({ votes: Number(v.net), my_vote: dir });
}));

/* ---------------- comment (optionally recommending a racket) ---------------- */
router.post("/:id/comments", requireAuth, wrap(async (req, res) => {
  const body = String(req.body.body || "").trim().slice(0, 600);
  const racketId = req.body.racketId ? Number(req.body.racketId) : null;
  if (!body && !racketId) return res.status(400).json({ error: "Write something or pick a racket." });
  if (racketId) await query("INSERT INTO combo_rackets (combo_id,racket_id,added_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [req.params.id, racketId, req.user.id]);
  const row = await one("INSERT INTO combo_comments (combo_id,user_id,body,racket_id) VALUES ($1,$2,$3,$4) RETURNING id", [req.params.id, req.user.id, body || "(recommended a racket)", racketId]);
  res.json({ id: row.id });
}));

module.exports = router;
