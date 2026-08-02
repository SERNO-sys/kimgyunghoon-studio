-- Migration: make the `settings` table use `id` as its primary key.
--
-- The generic D1 Table<T> abstraction (src/lib/db/d1-table.ts) assumes every
-- table has an `id` column and generates `WHERE id = ?` for findById/update/
-- delete and includes `id` in INSERTs. The old `settings` table used
-- `site_id` as its primary key, which caused:
--   D1_ERROR: no such column: id at offset 29: SQLITE_ERROR
-- when running upsertSettings/getSettingsBySiteId (e.g. during AI autobuild).
--
-- SQLite cannot alter a primary key in place, so we rebuild the table.
-- Run with: wrangler d1 execute DB --file=./migrations/0001_settings_id_primary_key.sql
-- NOTE: D1 does not support SQL BEGIN/COMMIT transaction statements, so this
-- file contains only plain DDL/DML statements (each is executed atomically).

-- 1. Create the new table with `id` as the primary key.
CREATE TABLE IF NOT EXISTS settings_new (
  id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  general TEXT NOT NULL DEFAULT '{}',
  contact TEXT NOT NULL DEFAULT '{}',
  analytics TEXT NOT NULL DEFAULT '{}',
  social TEXT NOT NULL DEFAULT '{}',
  pages TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Copy existing rows. `id` is set equal to the owning site's id.
INSERT INTO settings_new (id, site_id, general, contact, analytics, social, pages, updated_at)
SELECT site_id, site_id, general, contact, analytics, social, pages, updated_at
FROM settings;

-- 3. Swap the tables.
DROP TABLE settings;
ALTER TABLE settings_new RENAME TO settings;
