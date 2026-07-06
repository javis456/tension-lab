const { one } = require("../db");
const { cookieUserId } = require("../auth");

async function currentUser(req) {
  const uid = cookieUserId(req);
  if (!uid) return null;
  return one("SELECT id, email, role, username FROM users WHERE id=$1", [uid]);
}

// wrap async middleware so thrown errors become 500s instead of hanging
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireAuth = wrap(async (req, res, next) => {
  const u = await currentUser(req);
  if (!u) return res.status(401).json({ error: "Please log in." });
  req.user = u;
  next();
});

const requireAdmin = wrap(async (req, res, next) => {
  const u = await currentUser(req);
  if (!u) return res.status(401).json({ error: "Please log in." });
  if (u.role !== "admin") return res.status(403).json({ error: "Admin access only." });
  req.user = u;
  next();
});

module.exports = { currentUser, requireAuth, requireAdmin, wrap };
