-- Milestone H — Phase H.1: Scheduled Publishing.
--
-- Add scheduling columns to the posts table.
--
-- `scheduled_at` stores the ISO datetime at which a post should auto-publish.
-- When set to a future datetime, the post is held in `status = 'scheduled'`
-- and flips to `published` lazily on the next read after the due time.
--
-- `published_at` records the actual datetime the post became published. It is
-- set once when the post transitions to `published` (either immediately or via
-- the scheduled lazy-flip). Both columns are nullable and non-breaking.
ALTER TABLE posts ADD COLUMN scheduled_at TEXT;
ALTER TABLE posts ADD COLUMN published_at TEXT;
