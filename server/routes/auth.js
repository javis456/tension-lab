const express = require("express");
const bcrypt = require("bcryptjs");
const { one } = require("../db");
const { currentUser, wrap } = require("../middleware/auth");
const { setAuthCookie, clearAuthCookie } = require("../auth");

const router = express.Router();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

router.post("/register", wrap(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!validEmail(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  const exists = await one("SELECT id FROM users WHERE email=$1", [email]);
  if (exists) return res.status(409).json({ error: "That email is already registered." });
  const row = await one(
    "INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'user') RETURNING id, email, role",
    [email, bcrypt.hashSync(password, 10)]
  );
  setAuthCookie(res, row.id);
  res.json({ user: row });
}));

router.post("/login", wrap(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const row = await one("SELECT * FROM users WHERE email=$1", [email]);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  setAuthCookie(res, row.id);
  res.json({ user: { id: row.id, email: row.email, role: row.role } });
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
  const email = String(payload.email).trim().toLowerCase();
  let user = await one("SELECT id, email, role FROM users WHERE email=$1", [email]);
  if (!user) {
    // create an account for this Google user (random password they never use)
    const rnd = require("crypto").randomBytes(24).toString("hex");
    user = await one(
      "INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'user') RETURNING id, email, role",
      [email, bcrypt.hashSync(rnd, 10)]
    );
  }
  setAuthCookie(res, user.id);
  res.json({ user });
}));

router.get("/me", wrap(async (req, res) => {
  res.json({ user: await currentUser(req) });
}));

module.exports = router;
