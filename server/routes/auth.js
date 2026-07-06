const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { one } = require("../db");
const { currentUser, wrap } = require("../middleware/auth");
const { setAuthCookie, clearAuthCookie } = require("../auth");
const email = require("../email");

const router = express.Router();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const validUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u);
const usernameTaken = async (u, exceptId) =>
  !!(await one("SELECT id FROM users WHERE lower(username)=lower($1) AND ($2::int IS NULL OR id<>$2)", [u, exceptId || null]));

async function uniqueUsernameFrom(base) {
  let u = String(base || "player").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "player";
  if (u.length < 3) u = "player" + u;
  let cand = u, n = 0;
  while (await usernameTaken(cand)) { n++; cand = (u.slice(0, 14) + n); }
  return cand;
}
const baseUrl = (req) => {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
  return proto + "://" + req.headers.host;
};
const newToken = () => crypto.randomBytes(24).toString("base64url");

router.post("/register", wrap(async (req, res) => {
  const addr = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const username = String(req.body.username || "").trim();
  if (!validEmail(addr)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!validUsername(username)) return res.status(400).json({ error: "Username must be 3–20 letters, numbers or underscores." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (await one("SELECT id FROM users WHERE email=$1", [addr])) return res.status(409).json({ error: "That email is already registered." });
  if (await usernameTaken(username)) return res.status(409).json({ error: "That username is taken — pick another." });

  const hash = bcrypt.hashSync(password, 10);

  if (email.enabled()) {
    const token = newToken();
    const row = await one(
      "INSERT INTO users (email, password_hash, role, username, email_verified, verify_token) VALUES ($1,$2,'user',$3,false,$4) RETURNING id",
      [addr, hash, username, token]
    );
    try {
      await email.sendVerification(addr, baseUrl(req) + "/api/auth/verify?token=" + token);
    } catch (e) {
      await one("DELETE FROM users WHERE id=$1 RETURNING id", [row.id]);
      return res.status(502).json({ error: "Could not send the confirmation email. Please try again later." });
    }
    return res.json({ pending: true, email: addr });
  }

  const row = await one(
    "INSERT INTO users (email, password_hash, role, username, email_verified) VALUES ($1,$2,'user',$3,true) RETURNING id, email, role, username",
    [addr, hash, username]
  );
  setAuthCookie(res, row.id);
  res.json({ user: row });
}));

router.post("/login", wrap(async (req, res) => {
  const addr = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const row = await one("SELECT * FROM users WHERE email=$1", [addr]);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  if (row.email_verified === false) {
    return res.status(403).json({ error: "Please confirm your email first — check your inbox.", needsVerification: true, email: addr });
  }
  setAuthCookie(res, row.id);
  res.json({ user: { id: row.id, email: row.email, role: row.role, username: row.username } });
}));

// clicked from the confirmation email
router.get("/verify", wrap(async (req, res) => {
  const token = String(req.query.token || "");
  const row = token ? await one("SELECT id FROM users WHERE verify_token=$1", [token]) : null;
  if (!row) return res.redirect("/account.html?verify=invalid");
  await one("UPDATE users SET email_verified=true, verify_token=NULL WHERE id=$1 RETURNING id", [row.id]);
  setAuthCookie(res, row.id); // log them in
  res.redirect("/account.html?verify=ok");
}));

router.post("/resend", wrap(async (req, res) => {
  const addr = String(req.body.email || "").trim().toLowerCase();
  if (!email.enabled()) return res.status(400).json({ error: "Email confirmation isn't enabled on this site." });
  const row = await one("SELECT id, email_verified FROM users WHERE email=$1", [addr]);
  if (row && row.email_verified === false) {
    const token = newToken();
    await one("UPDATE users SET verify_token=$1 WHERE id=$2 RETURNING id", [token, row.id]);
    try { await email.sendVerification(addr, baseUrl(req) + "/api/auth/verify?token=" + token); } catch (_) {}
  }
  res.json({ ok: true }); // always ok (don't reveal whether the email exists)
}));

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.post("/google", wrap(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) return res.status(400).json({ error: "Google sign-in is not configured on this site." });
  const google = require("../google");
  let payload;
  try { payload = await google.verify(String(req.body.credential || ""), clientId); }
  catch (e) { return res.status(401).json({ error: e.message || "Google sign-in failed." }); }
  const addr = String(payload.email).trim().toLowerCase();
  let user = await one("SELECT id, email, role, username FROM users WHERE email=$1", [addr]);
  if (!user) {
    const rnd = crypto.randomBytes(24).toString("hex");
    const uname = await uniqueUsernameFrom((payload.name || addr.split("@")[0]));
    user = await one(
      "INSERT INTO users (email, password_hash, role, username, email_verified) VALUES ($1,$2,'user',$3,true) RETURNING id, email, role, username",
      [addr, bcrypt.hashSync(rnd, 10), uname]
    );
  } else {
    await one("UPDATE users SET email_verified=true, verify_token=NULL WHERE id=$1 RETURNING id", [user.id]);
  }
  setAuthCookie(res, user.id);
  res.json({ user });
}));

// set / change username (also used by legacy accounts that don't have one yet)
router.post("/username", wrap(async (req, res) => {
  const me = await currentUser(req);
  if (!me) return res.status(401).json({ error: "Please log in." });
  const username = String(req.body.username || "").trim();
  if (!validUsername(username)) return res.status(400).json({ error: "Username must be 3–20 letters, numbers or underscores." });
  if (await usernameTaken(username, me.id)) return res.status(409).json({ error: "That username is taken — pick another." });
  const row = await one("UPDATE users SET username=$1 WHERE id=$2 RETURNING id, email, role, username", [username, me.id]);
  res.json({ user: row });
}));

router.get("/me", wrap(async (req, res) => {
  res.json({ user: await currentUser(req) });
}));

module.exports = router;
