-- ============================================================
-- Tension Lab — v7 migration (racket photos)
-- Stores a replica image per racket, right in the database
-- (no extra storage service needed). Safe to run on your DB.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================
CREATE TABLE IF NOT EXISTS racket_images (
  racket_id    INTEGER PRIMARY KEY REFERENCES rackets(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data         BYTEA NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
