-- ============================================================
-- Tension Lab — v4 migration
-- Adds: email confirmation for new sign-ups.
-- Existing accounts are marked verified so nobody is locked out.
-- Safe to run on your existing database.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token);
