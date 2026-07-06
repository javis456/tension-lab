-- ============================================================
-- Tension Lab — v3 migration (Racket Room)
-- Adds: user-owned rackets + game-feedback (with shareable links).
-- Safe to run on your existing database; it won't touch your data.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================

-- user-owned rackets live in the same table (owner_user_id = NULL means global)
ALTER TABLE rackets ADD COLUMN IF NOT EXISTS owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rackets_owner ON rackets(owner_user_id);

CREATE TABLE IF NOT EXISTS feedback (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setup_id      INTEGER REFERENCES setups(id) ON DELETE SET NULL,
  racket_label  TEXT NOT NULL DEFAULT '',
  combo_label   TEXT NOT NULL DEFAULT '',
  algo_scores   JSONB NOT NULL,
  player_scores JSONB NOT NULL,
  overall       INTEGER,
  notes         TEXT NOT NULL DEFAULT '',
  share_id      TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
