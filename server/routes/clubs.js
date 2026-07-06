const express = require("express");
const { one, many, query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const uid = (req) => req.user.id;

/* ---- helpers ---- */
async function defaultClub() {
  return one("SELECT * FROM clubs WHERE is_default=true ORDER BY id LIMIT 1");
}
async function ensureDefaultMembership(userId) {
  const d = await defaultClub();
  if (d) await query(
    "INSERT INTO club_members (club_id,user_id,role,status) VALUES ($1,$2,'member','active') ON CONFLICT (club_id,user_id) DO NOTHING",
    [d.id, userId]);
}
const membership = (clubId, userId) =>
  one("SELECT * FROM club_members WHERE club_id=$1 AND user_id=$2", [clubId, userId]);
const isActive = (m) => m && m.status === "active";
const isAdmin = (m) => m && m.status === "active" && m.role === "admin";

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "club";
}

/* ---- list clubs (mine, invites, discover) ---- */
router.get("/clubs", async (req, res, next) => {
  try {
    await ensureDefaultMembership(uid(req));
    const rows = await many(
      `SELECT c.id, c.name, c.slug, c.description, c.is_default,
              m.role, m.status,
              (SELECT count(*) FROM club_members mm WHERE mm.club_id=c.id AND mm.status='active') AS members
       FROM clubs c LEFT JOIN club_members m ON m.club_id=c.id AND m.user_id=$1
       ORDER BY c.is_default DESC, lower(c.name)`, [uid(req)]);
    const mine = [], invites = [], discover = [];
    for (const r of rows) {
      const item = { id: r.id, name: r.name, slug: r.slug, description: r.description,
        is_default: r.is_default, role: r.role, status: r.status, members: Number(r.members) };
      if (r.status === "active") mine.push(item);
      else if (r.status === "invited") invites.push(item);
      else if (!r.status || r.status === "requested") { item.requested = r.status === "requested"; discover.push(item); }
    }
    res.json({ mine, invites, discover });
  } catch (e) { next(e); }
});

/* ---- create a club ---- */
router.post("/clubs", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 3) return res.status(400).json({ error: "Club name must be at least 3 characters." });
    let slug = slugify(name), n = 0;
    while (await one("SELECT id FROM clubs WHERE slug=$1", [slug])) { n++; slug = slugify(name) + "-" + n; }
    const club = await one(
      "INSERT INTO clubs (name, slug, description, owner_user_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, slug, String(req.body.description || "").trim().slice(0, 400), uid(req)]);
    await query("INSERT INTO club_members (club_id,user_id,role,status) VALUES ($1,$2,'admin','active')", [club.id, uid(req)]);
    res.json({ club: { id: club.id, name: club.name, slug: club.slug } });
  } catch (e) { next(e); }
});

/* ---- join / leave / accept / decline ---- */
router.post("/clubs/:id/join", async (req, res, next) => {
  try {
    const club = await one("SELECT * FROM clubs WHERE id=$1", [req.params.id]);
    if (!club) return res.status(404).json({ error: "Club not found." });
    const m = await membership(club.id, uid(req));
    if (isActive(m)) return res.json({ status: "active" });
    const status = club.is_default ? "active" : "requested";
    await query(
      "INSERT INTO club_members (club_id,user_id,role,status) VALUES ($1,$2,'member',$3) ON CONFLICT (club_id,user_id) DO UPDATE SET status=EXCLUDED.status",
      [club.id, uid(req), status]);
    res.json({ status });
  } catch (e) { next(e); }
});
router.post("/clubs/:id/leave", async (req, res, next) => {
  try {
    const club = await one("SELECT is_default FROM clubs WHERE id=$1", [req.params.id]);
    if (club && club.is_default) return res.status(400).json({ error: "You can't leave the home club." });
    await query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2", [req.params.id, uid(req)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post("/clubs/:id/accept", async (req, res, next) => {
  try {
    await query("UPDATE club_members SET status='active' WHERE club_id=$1 AND user_id=$2 AND status='invited'", [req.params.id, uid(req)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post("/clubs/:id/decline", async (req, res, next) => {
  try {
    await query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2 AND status='invited'", [req.params.id, uid(req)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---- club detail (members, requests, feed) ---- */
router.get("/clubs/:id", async (req, res, next) => {
  try {
    const club = await one("SELECT * FROM clubs WHERE id=$1", [req.params.id]);
    if (!club) return res.status(404).json({ error: "Club not found." });
    const me = await membership(club.id, uid(req));
    if (!isActive(me)) return res.status(403).json({ error: "Join this club to view it.", myStatus: me ? me.status : null });

    const members = await many(
      `SELECT u.id, u.username, m.role, m.status FROM club_members m JOIN users u ON u.id=m.user_id
       WHERE m.club_id=$1 AND m.status='active' ORDER BY (m.role='admin') DESC, lower(u.username)`, [club.id]);
    let requests = [];
    if (isAdmin(me)) requests = await many(
      `SELECT u.id, u.username FROM club_members m JOIN users u ON u.id=m.user_id
       WHERE m.club_id=$1 AND m.status='requested' ORDER BY m.created_at`, [club.id]);

    const posts = (await many(
      `SELECT p.id, p.kind, p.data, p.caption, p.created_at, u.username AS author, p.user_id,
        (SELECT count(*) FROM post_likes l WHERE l.post_id=p.id) AS likes,
        (SELECT count(*) FROM post_comments c WHERE c.post_id=p.id) AS comments,
        EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$2) AS liked
       FROM club_posts p LEFT JOIN users u ON u.id=p.user_id
       WHERE p.club_id=$1 ORDER BY p.created_at DESC LIMIT 100`, [club.id, uid(req)]
    )).map((p) => ({ id: p.id, kind: p.kind, data: p.data, caption: p.caption || "", created_at: p.created_at, author: p.author || "unknown",
      mine: p.user_id === uid(req), likes: Number(p.likes), comments: Number(p.comments), liked: p.liked }));

    res.json({
      club: { id: club.id, name: club.name, description: club.description, is_default: club.is_default },
      myRole: me.role, isAdmin: isAdmin(me), members, requests, posts,
    });
  } catch (e) { next(e); }
});

/* ---- admin: invite / approve / remove ---- */
router.post("/clubs/:id/invite", async (req, res, next) => {
  try {
    const me = await membership(req.params.id, uid(req));
    if (!isAdmin(me)) return res.status(403).json({ error: "Only club admins can invite." });
    const uname = String(req.body.username || "").trim();
    const target = await one("SELECT id FROM users WHERE lower(username)=lower($1)", [uname]);
    if (!target) return res.status(404).json({ error: "No player with that username." });
    const existing = await membership(req.params.id, target.id);
    if (isActive(existing)) return res.status(409).json({ error: "They're already a member." });
    await query(
      "INSERT INTO club_members (club_id,user_id,role,status) VALUES ($1,$2,'member','invited') ON CONFLICT (club_id,user_id) DO UPDATE SET status='invited'",
      [req.params.id, target.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post("/clubs/:id/approve", async (req, res, next) => {
  try {
    const me = await membership(req.params.id, uid(req));
    if (!isAdmin(me)) return res.status(403).json({ error: "Only club admins can approve." });
    await query("UPDATE club_members SET status='active' WHERE club_id=$1 AND user_id=$2 AND status='requested'", [req.params.id, req.body.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
router.post("/clubs/:id/members/:userId/remove", async (req, res, next) => {
  try {
    const me = await membership(req.params.id, uid(req));
    if (!isAdmin(me)) return res.status(403).json({ error: "Only club admins can remove members." });
    await query("DELETE FROM club_members WHERE club_id=$1 AND user_id=$2", [req.params.id, req.params.userId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---- posts: share a combo or feedback into a club ---- */
router.post("/clubs/:id/posts", async (req, res, next) => {
  try {
    const me = await membership(req.params.id, uid(req));
    if (!isActive(me)) return res.status(403).json({ error: "Join this club before posting." });
    const kind = req.body.kind === "feedback" ? "feedback" : "combo";
    const caption = String(req.body.caption || "").trim().slice(0, 400);
    let data;
    if (kind === "combo") {
      const s = await one("SELECT name, config, scores FROM setups WHERE id=$1 AND user_id=$2", [req.body.setupId, uid(req)]);
      if (!s) return res.status(404).json({ error: "Combination not found." });
      data = { name: s.name, config: s.config, scores: s.scores };
    } else {
      const f = await one("SELECT racket_label, combo_label, algo_scores, player_scores, overall, notes FROM feedback WHERE id=$1 AND user_id=$2", [req.body.feedbackId, uid(req)]);
      if (!f) return res.status(404).json({ error: "Feedback not found." });
      data = f;
    }
    const row = await one("INSERT INTO club_posts (club_id,user_id,kind,data,caption) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id", [req.params.id, uid(req), kind, JSON.stringify(data), caption]);
    res.json({ id: row.id });
  } catch (e) { next(e); }
});

async function postClubMembership(postId, userId) {
  const p = await one("SELECT club_id FROM club_posts WHERE id=$1", [postId]);
  if (!p) return { post: null };
  return { post: p, m: await membership(p.club_id, userId) };
}

router.post("/posts/:id/like", async (req, res, next) => {
  try {
    const { post, m } = await postClubMembership(req.params.id, uid(req));
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (!isActive(m)) return res.status(403).json({ error: "Join the club first." });
    const existing = await one("SELECT id FROM post_likes WHERE post_id=$1 AND user_id=$2", [req.params.id, uid(req)]);
    if (existing) await query("DELETE FROM post_likes WHERE id=$1", [existing.id]);
    else await query("INSERT INTO post_likes (post_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.params.id, uid(req)]);
    const c = await one("SELECT count(*)::int AS n FROM post_likes WHERE post_id=$1", [req.params.id]);
    res.json({ liked: !existing, likes: c.n });
  } catch (e) { next(e); }
});

router.get("/posts/:id/comments", async (req, res, next) => {
  try {
    const { post, m } = await postClubMembership(req.params.id, uid(req));
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (!isActive(m)) return res.status(403).json({ error: "Join the club first." });
    const rows = await many(
      `SELECT c.id, c.body, c.created_at, u.username AS author FROM post_comments c
       LEFT JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at`, [req.params.id]);
    res.json({ comments: rows.map((r) => ({ id: r.id, body: r.body, created_at: r.created_at, author: r.author || "unknown" })) });
  } catch (e) { next(e); }
});
router.post("/posts/:id/comments", async (req, res, next) => {
  try {
    const { post, m } = await postClubMembership(req.params.id, uid(req));
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (!isActive(m)) return res.status(403).json({ error: "Join the club first." });
    const body = String(req.body.body || "").trim().slice(0, 500);
    if (!body) return res.status(400).json({ error: "Write a comment first." });
    await query("INSERT INTO post_comments (post_id,user_id,body) VALUES ($1,$2,$3)", [req.params.id, uid(req), body]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---- save a shared combination into my own setups ---- */
router.post("/posts/:id/save", async (req, res, next) => {
  try {
    const { post, m } = await postClubMembership(req.params.id, uid(req));
    if (!post) return res.status(404).json({ error: "Post not found." });
    if (!isActive(m)) return res.status(403).json({ error: "Join the club first." });
    const full = await one("SELECT kind, data, user_id FROM club_posts WHERE id=$1", [req.params.id]);
    if (full.kind !== "combo") return res.status(400).json({ error: "Only string combinations can be saved." });
    const author = await one("SELECT username FROM users WHERE id=$1", [full.user_id]);
    const d = full.data || {};
    const name = (d.name || "Shared combination") + " (from @" + (author ? author.username : "player") + ")";
    const row = await one(
      "INSERT INTO setups (user_id,name,config,scores) VALUES ($1,$2,$3::jsonb,$4::jsonb) RETURNING id",
      [uid(req), name.slice(0, 120), JSON.stringify(d.config || {}), JSON.stringify(d.scores || {})]);
    res.json({ id: row.id });
  } catch (e) { next(e); }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    const p = await one("SELECT club_id, user_id FROM club_posts WHERE id=$1", [req.params.id]);
    if (!p) return res.json({ ok: true });
    const m = await membership(p.club_id, uid(req));
    if (p.user_id !== uid(req) && !isAdmin(m)) return res.status(403).json({ error: "Not allowed." });
    await query("DELETE FROM club_posts WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
