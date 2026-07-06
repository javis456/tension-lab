-- ============================================================
-- Tension Lab — v6 migration
-- Adds: captions on club posts + one-time username change lock.
-- Safe to run on your existing database.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================
ALTER TABLE club_posts ADD COLUMN IF NOT EXISTS caption TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS username_change_used BOOLEAN NOT NULL DEFAULT false;
