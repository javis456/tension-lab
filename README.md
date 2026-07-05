# Tension Lab — by Mensin Tennis (Supabase + Vercel edition)

A full-stack tennis string configurator: design a setup and get a physics-based read-out
(**Setup String**), compare every string side by side (**String Comparison**), save setups to
a free account, and manage the catalog from an **admin portal** with an **AI Update** button
that ingests new products from the web.

This edition runs on the free **GitHub → Supabase → Vercel** stack.
**To put it online, follow [DEPLOY.md](./DEPLOY.md)** — a click-by-click, no-coding guide.

## How it's wired

- **Frontend** — framework-free static pages in `public/` (served by Vercel's CDN).
- **Backend** — one Express app (`server/app.js`) that Vercel runs as a serverless function
  (`api/index.js`). Locally it runs as a normal server via `server/index.js`.
- **Database** — **Supabase (PostgreSQL)** via `pg`, pointed at Supabase's transaction
  connection pooler (serverless-friendly). Schema + seed data: `supabase/schema.sql`.
- **Auth** — stateless signed cookie (no session table); passwords hashed with bcrypt.
- **Scoring engine** — `public/js/engine.js`, shared by the browser *and* the server, so a
  setup scores identically in the UI and the API, and every admin-added product runs through
  the same model.
- **AI ingestion** — `server/ai.js` calls Claude Haiku (cheapest capable model) with web
  search, validates the result against `server/rubric.js`, and shows an editable preview
  before saving. No API key → a clearly-labelled offline estimate.

## Run it locally (optional)

You don't need this to deploy, but if you want to run it on your own machine:

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL (a Supabase or local Postgres URL) and AUTH_SECRET
npm run setup-db            # loads supabase/schema.sql into that database (one time)
npm start                   # http://localhost:3000
```

Requires Node 18+ and a PostgreSQL connection string in `DATABASE_URL`.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string (**transaction pooler**, port 6543) |
| `AUTH_SECRET` | Long random string that signs login cookies |
| `ANTHROPIC_API_KEY` | Optional — enables real (web-sourced) AI Update; without it you get an offline estimate |
| `AI_MODEL` | Optional — defaults to `claude-haiku-4-5` |
| `PORT` | Local dev only |

## Admin

Admin isn't granted automatically. Register a normal account on the site, then run one line in
the Supabase SQL editor: `UPDATE users SET role='admin' WHERE email='you@example.com';` Log out
and back in — the **Admin** link appears. (Full steps in DEPLOY.md.)

## A note on the ratings

The string/racket numbers are structured estimates, calibrated to published specs and
Tennis-Warehouse-University-style playtest data — not a proprietary lab dataset or an official
association standard. `server/rubric.js` documents the axes, anchors, and reference frame.

---

*Tension Lab — by Mensin Tennis.*
