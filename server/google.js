/* ============================================================
   Google Sign-In — verify the ID token from Google Identity Services.
   Dependency-free: fetches Google's public keys (JWKS) and checks the
   RS256 signature, audience, issuer and expiry with Node's crypto.
   ============================================================ */
const crypto = require("crypto");

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let keyCache = { keys: null, exp: 0 };

// injectable for tests
async function fetchKeys(fetcher) {
  const now = Date.now();
  if (keyCache.keys && keyCache.exp > now) return keyCache.keys;
  const res = await (fetcher || fetch)(CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google keys.");
  const body = await res.json();
  const map = {};
  for (const k of body.keys) map[k.kid] = k;
  keyCache = { keys: map, exp: now + 60 * 60 * 1000 }; // cache 1h
  return map;
}

const b64urlJSON = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

async function verify(idToken, clientId, opts) {
  opts = opts || {};
  if (!idToken || idToken.split(".").length !== 3) throw new Error("Malformed Google token.");
  const [h, p, sig] = idToken.split(".");
  const header = b64urlJSON(h);
  const keys = await fetchKeys(opts.fetcher);
  const jwk = keys[header.kid];
  if (!jwk) throw new Error("Unknown Google signing key.");
  const pub = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.verify("RSA-SHA256", Buffer.from(h + "." + p), pub, Buffer.from(sig, "base64url"));
  if (!ok) throw new Error("Bad Google token signature.");

  const payload = b64urlJSON(p);
  if (clientId && payload.aud !== clientId) throw new Error("Google token audience mismatch.");
  const iss = String(payload.iss || "").replace(/^https:\/\//, "");
  if (iss !== "accounts.google.com") throw new Error("Bad Google token issuer.");
  const now = opts.now || Date.now();
  if (!payload.exp || payload.exp * 1000 < now) throw new Error("Google token expired.");
  if (!payload.email) throw new Error("Google token has no email.");
  if (payload.email_verified === false) throw new Error("Google email not verified.");
  return payload; // { email, email_verified, sub, name, ... }
}

module.exports = { verify, _fetchKeys: fetchKeys };
