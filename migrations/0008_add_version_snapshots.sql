-- AWIE V2 - Phase I.5: Durable Persistence (D1ProjectRepository).
--
-- Creates the D1 tables backing the frozen Aggregate-Centric Persistence Port
-- (ProjectRepository) and the Release Pointer architecture.
--
-- ARCHITECTURAL MANDATES:
--
--   1. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER
--      `version_snapshots` stores the IMMUTABLE VersionSnapshots created by
--      Publish. The `config` (ThemeConfig) is serialized to a TEXT column.
--      `release_pointer` stores the SINGLE, mutable designation of which
--      snapshot is currently "Live" (just a snapshot id). This explicitly
--      separates Publish (creates a snapshot) from Release (updates the
--      pointer). To roll back, the pointer is simply re-pointed at a previous
--      snapshot id — the snapshots themselves are never mutated.
--
--   2. PURE INFRASTRUCTURE
--      These tables are plain persistence containers. They NEVER render, NEVER
--      decide, and NEVER mutate a snapshot after creation.
--
--   3. PROJECT SCOPING
--      Every row is scoped by `project_id`. The Release Pointer is unique per
--      project (one "live" designation per project).

-- The immutable VersionSnapshots created by Publish.
CREATE TABLE IF NOT EXISTS version_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  config TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at TEXT NOT NULL,
  audit_trail_id TEXT NOT NULL
);

-- Index for listing a project's snapshots newest-first (Version History).
CREATE INDEX IF NOT EXISTS idx_version_snapshots_project
  ON version_snapshots (project_id, published_at DESC);

-- The single, mutable Release Pointer: which snapshot is currently "Live".
-- One row per project. The pointer is a thin designation (just a snapshot id),
-- NOT the snapshot itself.
CREATE TABLE IF NOT EXISTS release_pointer (
  project_id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL
);

-- The Project lifecycle state (draft / published / archived).
CREATE TABLE IF NOT EXISTS project_lifecycle (
  project_id TEXT PRIMARY KEY,
  lifecycle TEXT NOT NULL
);
