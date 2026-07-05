/* ============================================================
   AUTH TOKENS — stateless signed cookie
   ------------------------------------------------------------
   Serverless functions don't share memory, so instead of a
   server-side session store we put a signed token in an httpOnly
   cookie. The token holds just the user id + expiry, signed with
   AUTH_SECRET (HMAC-SHA256). No database row per session.
   ============================================================ */
const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const COOKIE = "tl_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

function makeToken(userId) {
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 }));
  return payload + "." + sign(payload);
}

function readToken(token) {
  if (!token || token.indexOf(".") === -1) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  // constant-time compare
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch (_) { return null; }
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function cookieUserId(req) {
  return readToken(parseCookies(req)[COOKIE]);
}

function setAuthCookie(res, userId) {
  const secure = process.env.NODE_ENV === "production"; // Vercel serves https
  const parts = [
    COOKIE + "=" + makeToken(userId),
    "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=" + MAX_AGE,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

module.exports = { cookieUserId, setAuthCookie, clearAuthCookie };
