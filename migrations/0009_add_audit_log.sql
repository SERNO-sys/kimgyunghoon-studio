-- AWIE V2 - Phase J.2: Operations & Observability - Durable Audit Log.
--
-- Creates the D1 table backing the durable Audit Trail. The audit log records
-- WHO performed critical Delivery actions (Publish / Rollback / Deployment) and
-- WHEN, for non-repudiation and observability.
--
-- ARCHITECTURAL MANDATES:
--
--   1. DURABLE PERSISTENCE
--      The audit log MUST persist to D1 (not in-memory) so it survives HMR and
--      stateless edge terminations. This guarantees true observability and
--      non-repudiation.
--
--   2. IMMUTABLE RECORDS
--      Audit records are NEVER mutated after creation. The table is
--      append-only. There is no UPDATE path.
--
--   3. PURE INFRASTRUCTURE
--      This table is a plain persistence container. It NEVER renders, NEVER
--      decides, and NEVER touches ThemeConfig. It is Application-layer
--      bookkeeping only.
--
--   4. PROJECT SCOPING
--      Every row is scoped by `project_id` (the Site id) so the audit trail can
--      be queried per project.

-- The durable, append-only audit log.
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  command_hash TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for querying a project's audit trail newest-first.
CREATE INDEX IF NOT EXISTS idx_audit_log_project
  ON audit_log (project_id, created_at DESC);
