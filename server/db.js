/* ============================================================
   DATABASE — PostgreSQL (Supabase) via node-postgres (pg)
   ------------------------------------------------------------
   One shared connection pool. On Vercel's serverless runtime the
   pool persists across warm invocations; point DATABASE_URL at
   Supabase's connection **pooler** (port 6543) so many short-lived
   functions share a small set of Postgres connections.

   Schema + seed data live in /supabase/schema.sql — run that once
   in the Supabase SQL editor. This file only reads and writes.
   ============================================================ */
const { Pool } = require("pg");

const url = process.env.DATABASE_URL || "";
if (!url) {
  console.warn("[db] DATABASE_URL is not set. See .env.example / DEPLOY.md.");
}

// Local Postgres needs no SSL; Supabase (and any remote) does.
const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 3),
  idleTimeoutMillis: 10000,
});

pool.on("error", (e) => console.error("[db] pool error:", e.message));

/* ---- tiny query helpers (all async) ---- */
async function query(text, params) {
  return pool.query(text, params);
}
async function one(text, params) {
  const r = await pool.query(text, params);
  return r.rows[0] || null;
}
async function many(text, params) {
  const r = await pool.query(text, params);
  return r.rows;
}

/* ---- row -> API shape (mirrors the SQLite build) ---- */
// pg returns jsonb columns already parsed, int/real as numbers.
const mapString = (r) => r && ({
  id: r.id, brand: r.brand, name: r.name, material: r.material, geo: r.geo,
  gauges: r.gauges, tier: r.tier, known_for: r.known_for, claim: r.claim,
  ratings: r.ratings, price_usd: r.price_usd,
});
const mapRacket = (r) => r && ({
  id: r.id, slug: r.slug, brand: r.brand, name: r.name, ver: r.ver, year: r.year,
  mains: r.mains, crosses: r.crosses, head_size: r.head_size, ra: r.ra, weight: r.weight,
  char: r.char_label, known_for: r.known_for,   // DB column is char_label ("char" is a reserved type name)
});

module.exports = { pool, query, one, many, mapString, mapRacket };
