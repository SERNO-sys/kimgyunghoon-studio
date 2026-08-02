-- Add publish state columns to the sites table.
-- is_published tracks whether the site has been published at least once.
-- deploy_version stores the latest deployment version string.
ALTER TABLE sites ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN deploy_version TEXT NOT NULL DEFAULT '';
