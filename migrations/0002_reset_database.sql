-- Reset the D1 database to a clean initial state.
--
-- Drops all application tables (removing any development/test data) and
-- recreates them from the canonical schema (src/lib/db/schema.sql).
--
-- NOTE: `_cf_KV` is a Cloudflare-internal table and is intentionally left
-- untouched. D1 does not support SQL BEGIN/COMMIT transaction statements, so
-- this file contains only plain DDL statements (each is executed atomically).
--
-- Run with: wrangler d1 execute DB --remote --file=./migrations/0002_reset_database.sql

-- 1. Drop application tables (children first to satisfy FK constraints).
DROP TABLE IF EXISTS deploy_versions;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS domains;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS users;


-- 2. Recreate the schema from scratch.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'ko' CHECK (language IN ('ko', 'en')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  theme TEXT NOT NULL DEFAULT 'default' CHECK (theme IN ('default', 'dark', 'warm')),
  -- V2 Theme System: optional design-system config (JSON). When NULL, consumers
  -- fall back to the DEFAULT_PRESET so existing sites render exactly as before.
  theme_config TEXT,
  maintenance BOOLEAN NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT 0,
  deploy_version TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  general TEXT NOT NULL DEFAULT '{}',
  contact TEXT NOT NULL DEFAULT '{}',
  analytics TEXT NOT NULL DEFAULT '{}',
  social TEXT NOT NULL DEFAULT '{}',
  pages TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  content TEXT NOT NULL DEFAULT '',
  audio_url TEXT,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(site_id, slug)
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deploy_versions (

  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Recreate indexes.
CREATE INDEX IF NOT EXISTS idx_sites_owner ON sites(owner_id);
CREATE INDEX IF NOT EXISTS idx_domains_site ON domains(site_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_posts_site ON posts(site_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(site_id, status);
CREATE INDEX IF NOT EXISTS idx_media_site ON media(site_id);
CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id);
CREATE INDEX IF NOT EXISTS idx_deploy_versions_site ON deploy_versions(site_id);
