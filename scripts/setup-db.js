/* Runs supabase/schema.sql against DATABASE_URL. Optional helper —
   most people just paste schema.sql into the Supabase SQL editor.
   Usage:  DATABASE_URL=... npm run setup-db      */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL is not set."); process.exit(1); }
  const sql = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  const client = new Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  const s = await client.query("SELECT count(*)::int AS n FROM strings");
  const r = await client.query("SELECT count(*)::int AS n FROM rackets");
  console.log(`Database ready: ${s.rows[0].n} strings, ${r.rows[0].n} rackets.`);
  await client.end();
})().catch((e) => { console.error("setup-db failed:", e.message); process.exit(1); });
