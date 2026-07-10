-- ============================================================
-- Tension Lab — v8 migration (Explore: shared string combinations)
-- Paste into Supabase -> SQL Editor -> New query -> Run. Safe & idempotent.
-- ============================================================
CREATE TABLE IF NOT EXISTS explore_combos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  config      JSONB NOT NULL,
  scores      JSONB NOT NULL,
  archetype   TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS combo_votes (
  id       SERIAL PRIMARY KEY,
  combo_id INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dir      SMALLINT NOT NULL,
  UNIQUE(combo_id, user_id)
);
CREATE TABLE IF NOT EXISTS combo_rackets (
  id        SERIAL PRIMARY KEY,
  combo_id  INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  racket_id INTEGER NOT NULL REFERENCES rackets(id) ON DELETE CASCADE,
  added_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(combo_id, racket_id)
);
CREATE TABLE IF NOT EXISTS combo_racket_votes (
  id              SERIAL PRIMARY KEY,
  combo_racket_id INTEGER NOT NULL REFERENCES combo_rackets(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dir             SMALLINT NOT NULL,
  UNIQUE(combo_racket_id, user_id)
);
CREATE TABLE IF NOT EXISTS combo_comments (
  id        SERIAL PRIMARY KEY,
  combo_id  INTEGER NOT NULL REFERENCES explore_combos(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body      TEXT NOT NULL,
  racket_id INTEGER REFERENCES rackets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_explore_created ON explore_combos(created_at DESC);
