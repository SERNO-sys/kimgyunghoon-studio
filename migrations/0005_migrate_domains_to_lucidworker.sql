-- Migrate existing tenant domains to the canonical lucidworker.com subdomain
-- form. The tenant subdomain is the first segment of the site UUID (e.g.
-- `e801f11c` for `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), so the canonical
-- public URL becomes `https://e801f11c.lucidworker.com`.
--
-- This replaces any legacy `*.pages.dev` nested subdomains (e.g.
-- `<siteId>.kimgyunghoon-studio.pages.dev`) which are not valid public tenant
-- URLs. Custom user-owned domains are left untouched.

-- 1) Rewrite existing `*.pages.dev` domains to the canonical
--    `[subdomain].lucidworker.com` form and mark them verified.
UPDATE domains
SET domain = substr(site_id, 1, instr(site_id, '-') - 1) || '.lucidworker.com',
    verified = 1,
    updated_at = datetime('now')
WHERE domain LIKE '%.pages.dev';

-- 2) Ensure every site has a canonical `[subdomain].lucidworker.com` domain
--    record. Insert one (verified + primary) if it is missing. `INSERT OR
--    IGNORE` skips sites that already have the canonical domain (e.g. after
--    step 1) thanks to the UNIQUE constraint on `domains.domain`.
--    NOTE: the `sites` table's primary key column is `id` (not `site_id`).
INSERT OR IGNORE INTO domains (id, site_id, domain, verified, is_primary, created_at, updated_at)
SELECT
  'dom-' || substr(id, 1, instr(id, '-') - 1),
  id,
  substr(id, 1, instr(id, '-') - 1) || '.lucidworker.com',
  1,
  1,
  datetime('now'),
  datetime('now')
FROM sites;


