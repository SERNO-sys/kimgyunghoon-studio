-- Migration: add the `categories` table.
--
-- The account-deletion flow (DELETE /api/admin/account) and the generic D1
-- Table<T> abstraction reference a `categories` table, but it was never created
-- in the schema. This caused:
--   D1_ERROR: no such table: categories
-- when deleting an account, which surfaced as "Failed to delete account".
--
-- Run with: wrangler d1 execute DB --remote --file=./migrations/0003_add_categories_table.sql

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

CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id);
