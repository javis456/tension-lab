-- ============================================================
-- Tension Lab — v2 migration
-- Adds: favorites (My Rackets / My Strings) + site visitor counter.
-- Safe to run on your existing database; it won't touch your data.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('racket','string')),
  item_id    INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, item_id)
);

CREATE TABLE IF NOT EXISTS site_stats (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);
INSERT INTO site_stats (key, value) VALUES ('visits', 0) ON CONFLICT (key) DO NOTHING;
