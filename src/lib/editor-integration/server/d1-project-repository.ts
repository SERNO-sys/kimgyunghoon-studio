/**
 * AWIE V2 - Phase I.5: Editor Integration - D1ProjectRepository.
 *
 * A durable ProjectRepository adapter that implements the frozen
 * Aggregate-Centric Persistence Port (MANDATE 3) AND the Release Pointer
 * architecture (MANDATE 2) on top of Cloudflare D1.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE PORT IS FROZEN
 *      This class implements the `ProjectRepository` interface EXACTLY. It adds
 *      NO new methods and changes NO signatures. Every consumer
 *      (PublishOrchestrator, VersionHistoryService, VersionRollbackService, the
 *      Delivery Layer) depends on the interface, so swapping the concrete
 *      adapter requires ZERO changes above this boundary.
 *
 *   2. D1 IS RESOLVED LAZILY, PER CALL
 *      D1 is a REQUEST-SCOPED binding (`getRequestContext().env.DB`). It is NOT
 *      available at module-load time. This adapter therefore resolves the D1
 *      binding INSIDE each method call, never in the constructor. This keeps
 *      the module-level singleton pattern in `state.ts` intact and requires no
 *      change to any caller.
 *
 *   3. IN-MEMORY FALLBACK (DEVELOPMENT PARITY)
 *      When no D1 binding is available (e.g. plain `next dev` without a
 *      Cloudflare request context), the adapter transparently delegates to the
 *      existing InMemoryProjectRepository. This preserves the exact behavior
 *      the integration layer already relies on, so the wire contract is
 *      unchanged in every environment.
 *
 *   4. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER (MANDATE 2)
 *      The adapter maintains TWO separate D1 tables:
 *        - `version_snapshots`: the immutable VersionSnapshots created by
 *          Publish. The `config` (ThemeConfig) is serialized to a TEXT column.
 *        - `release_pointer`: the single, mutable designation of which snapshot
 *          is currently "Live" (just a snapshot id).
 *      This explicitly separates Publish (creates a snapshot) from Release
 *      (updates the pointer). To roll back, the pointer is simply re-pointed at
 *      a previous snapshot id — the snapshots themselves are never mutated.
 *
 *   5. PURE INFRASTRUCTURE
 *      This adapter is pure server-side infrastructure. It NEVER renders, NEVER
 *      decides, and NEVER mutates a snapshot after creation. It is a plain
 *      persistence container for the integration layer.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';
import type { ProjectRepository } from '../../cms-core';
import type { VersionSnapshot } from '../../cms-core';
import type { Project, ProjectLifecycle } from '../../cms-core';
import { InMemoryProjectRepository } from './project-repository';

/**
 * The D1 row shape for an immutable VersionSnapshot.
 *
 * The `config` (ThemeConfig) is a nested object and is serialized to a TEXT
 * column. All other fields are scalar and map 1:1 to the VersionSnapshot.
 */
interface VersionSnapshotRow {
  id: string;
  project_id: string;
  version: string;
  schema_version: string;
  config: string;
  published_by: string;
  published_at: string;
  audit_trail_id: string;
}

/**
 * The D1 row shape for the Release Pointer.
 *
 * The Release Pointer is the single, mutable designation of which snapshot is
 * currently "Live". It is a thin pointer (just a snapshot id), NOT the snapshot
 * itself.
 */
interface ReleasePointerRow {
  project_id: string;
  snapshot_id: string;
}

/**
 * The D1 row shape for a Project lifecycle state.
 */
interface LifecycleRow {
  project_id: string;
  lifecycle: string;
}

/**
 * The D1ProjectRepository.
 *
 * Implements the frozen Aggregate-Centric Persistence Port (MANDATE 3) and the
 * Release Pointer architecture (MANDATE 2) on top of Cloudflare D1. It resolves
 * the D1 binding lazily per call and falls back to the in-memory repository when
 * no D1 binding is available. It is a plain persistence container. It NEVER
 * renders and NEVER decides.
 */
export class D1ProjectRepository implements ProjectRepository {
  /** The in-memory fallback used when no D1 binding is available. */
  private readonly memory = new InMemoryProjectRepository();

  /**
   * Resolves the D1 binding for the current request, or undefined when not
   * running inside a Cloudflare request context (e.g. plain `next dev`).
   *
   * @returns The D1 binding, or undefined if unavailable.
   */
  private resolveD1(): D1Database | undefined {
    try {
      const env = getRequestContext().env as { DB?: D1Database };
      return env.DB;
    } catch {
      // Not running inside a Cloudflare Pages/Workers request context.
      return undefined;
    }
  }

  /**
   * Serializes a VersionSnapshot into its D1 row shape.
   *
   * The `config` (ThemeConfig) is a nested object and is serialized to a TEXT
   * column. All other fields are scalar.
   *
   * @param snapshot The immutable VersionSnapshot to serialize.
   * @returns The D1 row shape.
   */
  private toRow(snapshot: VersionSnapshot): VersionSnapshotRow {
    return {
      id: snapshot.id,
      project_id: snapshot.projectId,
      version: snapshot.version,
      schema_version: snapshot.schemaVersion,
      config: JSON.stringify(snapshot.config),
      published_by: snapshot.publishedBy,
      published_at: snapshot.publishedAt,
      audit_trail_id: snapshot.auditTrailId,
    };
  }

  /**
   * Deserializes a D1 row back into a VersionSnapshot.
   *
   * The `config` (ThemeConfig) is parsed back from its TEXT column. If the
   * stored config is corrupt, the row is treated as missing (undefined) rather
   * than crashing the request.
   *
   * @param row The D1 row shape.
   * @returns The immutable VersionSnapshot, or undefined if the config is
   *   corrupt.
   */
  private fromRow(row: VersionSnapshotRow): VersionSnapshot | undefined {
    try {
      return {
        id: row.id,
        projectId: row.project_id,
        version: row.version,
        schemaVersion: row.schema_version,
        config: JSON.parse(row.config) as VersionSnapshot['config'],
        publishedBy: row.published_by,
        publishedAt: row.published_at,
        auditTrailId: row.audit_trail_id,
      };
    } catch {
      // Corrupt stored config. Treat as missing rather than crashing.
      return undefined;
    }
  }

  async loadProject(): Promise<Project | undefined> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.loadProject();
    // The Project aggregate is not persisted in this adapter's tables. The
    // Project lifecycle is tracked separately (see loadLifecycle). This method
    // returns undefined, matching the in-memory adapter's behavior.
    return undefined;
  }

  async saveProject(): Promise<void> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.saveProject();
    // No-op for this milestone, matching the in-memory adapter.
  }

  async publish(
    projectId: string,
    snapshot: VersionSnapshot,
  ): Promise<void> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.publish(projectId, snapshot);

    // Publish FREEZES the current Draft into an immutable VersionSnapshot. It
    // does NOT update the Release Pointer. The snapshot is stored by id.
    const row = this.toRow(snapshot);
    await d1
      .prepare(
        `INSERT INTO version_snapshots
          (id, project_id, version, schema_version, config, published_by, published_at, audit_trail_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.id,
        row.project_id,
        row.version,
        row.schema_version,
        row.config,
        row.published_by,
        row.published_at,
        row.audit_trail_id,
      )
      .run();
  }

  async release(projectId: string, snapshotId: string): Promise<void> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.release(projectId, snapshotId);

    // Release UPDATES the Current Release Pointer to point at the given
    // snapshot id. This is the ONLY mutation of the "live" designation. The
    // snapshot itself is immutable and never touched.
    await d1
      .prepare(
        `INSERT INTO release_pointer (project_id, snapshot_id)
         VALUES (?, ?)
         ON CONFLICT(project_id) DO UPDATE SET snapshot_id = excluded.snapshot_id`,
      )
      .bind(projectId, snapshotId)
      .run();
  }

  async loadReleasePointer(projectId: string): Promise<string | undefined> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.loadReleasePointer(projectId);

    // The Delivery Layer queries the pointer FIRST, then resolves it to the
    // actual snapshot. Returns undefined if no snapshot has been released.
    const row = await d1
      .prepare(
        `SELECT snapshot_id FROM release_pointer WHERE project_id = ?`,
      )
      .bind(projectId)
      .first<ReleasePointerRow>();
    return row?.snapshot_id;
  }

  async loadReleasedSnapshot(
    projectId: string,
  ): Promise<VersionSnapshot | undefined> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.loadReleasedSnapshot(projectId);

    // Resolve the pointer to the active snapshot. If the pointer is set but the
    // snapshot is missing (e.g. a dangling pointer), return undefined.
    const pointer = await this.loadReleasePointer(projectId);
    if (pointer === undefined) {
      return undefined;
    }
    return this.loadSnapshot(projectId, pointer);
  }

  async listSnapshots(projectId: string): Promise<VersionSnapshot[]> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.listSnapshots(projectId);

    // PHASE H.2 (Version History): A READ-ONLY query that surfaces the existing
    // VersionSnapshot infrastructure. It returns the immutable snapshots for
    // the project, ordered by publish time (newest first). It NEVER mutates a
    // snapshot and NEVER evaluates business meaning.
    const { results } = await d1
      .prepare(
        `SELECT * FROM version_snapshots
         WHERE project_id = ?
         ORDER BY published_at DESC`,
      )
      .bind(projectId)
      .all<VersionSnapshotRow>();

    const snapshots: VersionSnapshot[] = [];
    for (const row of results) {
      const snapshot = this.fromRow(row);
      if (snapshot) snapshots.push(snapshot);
    }
    return snapshots;
  }

  async loadSnapshot(
    projectId: string,
    snapshotId: string,
  ): Promise<VersionSnapshot | undefined> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.loadSnapshot(projectId, snapshotId);

    // PHASE H.2 (Version History): A READ-ONLY query used to view the details
    // of a specific version. It returns the immutable snapshot, or undefined if
    // it does not exist or belongs to a different project.
    const row = await d1
      .prepare(
        `SELECT * FROM version_snapshots
         WHERE id = ? AND project_id = ?`,
      )
      .bind(snapshotId, projectId)
      .first<VersionSnapshotRow>();
    if (!row) return undefined;
    return this.fromRow(row);
  }

  async archive(): Promise<void> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.archive();
    // No-op for this milestone, matching the in-memory adapter.
  }

  async loadLifecycle(
    projectId: string,
  ): Promise<ProjectLifecycle | undefined> {
    const d1 = this.resolveD1();
    if (!d1) return this.memory.loadLifecycle(projectId);

    const row = await d1
      .prepare(`SELECT lifecycle FROM project_lifecycle WHERE project_id = ?`)
      .bind(projectId)
      .first<LifecycleRow>();
    return row?.lifecycle as ProjectLifecycle | undefined;
  }
}
