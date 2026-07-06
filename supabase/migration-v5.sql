-- ============================================================
-- Tension Lab — v5 migration (Clubs)
-- Adds: usernames + clubs, memberships/invites, shared posts,
--       likes and comments. Safe to run on your existing database.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- ============================================================

-- usernames
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username)) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS clubs (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  description   TEXT NOT NULL DEFAULT '',
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_members (
  id         SERIAL PRIMARY KEY,
  club_id    INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',   -- 'admin' | 'member'
  status     TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'requested' | 'invited'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);

CREATE TABLE IF NOT EXISTS club_posts (
  id         SERIAL PRIMARY KEY,
  club_id    INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind       TEXT NOT NULL,                    -- 'combo' | 'feedback'
  data       JSONB NOT NULL,                   -- self-contained snapshot
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  id       SERIAL PRIMARY KEY,
  post_id  INTEGER NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);

-- the default club everyone belongs to
INSERT INTO clubs (name, slug, description, is_default)
VALUES ('Thailand Tennis Club', 'thailand-tennis-club', 'The home club for every Tension Lab player. Share your setups and match feedback here.', true)
ON CONFLICT (slug) DO NOTHING;
