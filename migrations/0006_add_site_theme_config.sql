-- V2 Theme System - Phase 3
-- Add the theme_config column to the sites table.
--
-- `theme_config` stores the site's design-system config (e.g. the curated
-- preset id chosen by the AI or the admin). It is stored as JSON text and is
-- optional: when NULL, consumers fall back to the DEFAULT_PRESET so existing
-- sites render exactly as before (non-breaking).
ALTER TABLE sites ADD COLUMN theme_config TEXT;
