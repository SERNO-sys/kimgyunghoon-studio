/**
 * AWIE V2 - Phase 12.6: Editor Integration - InMemoryProjectRepository.
 *
 * A shared, server-side ProjectRepository adapter that implements the
 * Aggregate-Centric Persistence Port (MANDATE 3) AND the Release Pointer
 * architecture (MANDATE 2).
 *
 * MANDATE 2: The adapter maintains TWO separate stores:
 *   - `snapshots`: the immutable VersionSnapshots created by Publish.
 *   - `releasePointer`: the single, mutable designation of which snapshot is
 *     currently "Live" (just a snapshot id).
 *
 * This explicitly separates Publish (creates a snapshot) from Release (updates
 * the pointer). To roll back, the pointer is simply re-pointed at a previous
 * snapshot id — the snapshots themselves are never mutated.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SHARED SINGLETON
 *      This adapter is a server-side singleton shared by BOTH the Publish
 *      Workflow (which writes snapshots + the release pointer) and the Delivery
 *      Layer (Public Serve API, which reads them). This is the ONLY way the
 *      Release path can actually serve a published snapshot. In a production
 *      deployment this would be backed by durable storage (D1); the wire
 *      contract is unchanged.
 *
 *   2. THE STORE IS PURE INFRASTRUCTURE
 *      The store holds immutable VersionSnapshots and the release pointer. It
 *      NEVER renders, NEVER decides, and NEVER mutates a snapshot after
 *      creation. It is a plain in-memory container for the integration layer.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import type { ProjectRepository } from '../../cms-core';
import type { VersionSnapshot } from '../../cms-core';
import type { Project, ProjectLifecycle } from '../../cms-core';

/**
 * The shared in-memory ProjectRepository adapter.
 *
 * Implements the Aggregate-Centric Persistence Port (MANDATE 3) and the Release
 * Pointer architecture (MANDATE 2). It is a plain in-memory container. It NEVER
 * renders and NEVER decides.
 */
export class InMemoryProjectRepository implements ProjectRepository {
  /** The immutable VersionSnapshots, keyed by snapshot id. */
  private readonly snapshots = new Map<string, VersionSnapshot>();
  /** The Current Release Pointer: projectId -> active snapshot id. */
  private readonly releasePointer = new Map<string, string>();
  /** The lifecycle state per project. */
  private readonly lifecycles = new Map<string, ProjectLifecycle>();

  async loadProject(): Promise<Project | undefined> {
    return undefined;
  }
  async saveProject(): Promise<void> {
    // No-op for this milestone.
  }
  async publish(
    projectId: string,
    snapshot: VersionSnapshot,
  ): Promise<void> {
    // Publish FREEZES the current Draft into an immutable VersionSnapshot. It
    // does NOT update the Release Pointer. The snapshot is stored by id.
    this.snapshots.set(snapshot.id, snapshot);
    void projectId;
  }
  async release(projectId: string, snapshotId: string): Promise<void> {
    // Release UPDATES the Current Release Pointer to point at the given
    // snapshot id. This is the ONLY mutation of the "live" designation. The
    // snapshot itself is immutable and never touched.
    this.releasePointer.set(projectId, snapshotId);
  }
  async loadReleasePointer(projectId: string): Promise<string | undefined> {
    // The Delivery Layer queries the pointer FIRST, then resolves it to the
    // actual snapshot. Returns undefined if no snapshot has been released.
    return this.releasePointer.get(projectId);
  }
  async loadReleasedSnapshot(
    projectId: string,
  ): Promise<VersionSnapshot | undefined> {
    // Resolve the pointer to the active snapshot. If the pointer is set but
    // the snapshot is missing (e.g. a dangling pointer), return undefined.
    const pointer = this.releasePointer.get(projectId);
    if (pointer === undefined) {
      return undefined;
    }
    return this.snapshots.get(pointer);
  }
  async listSnapshots(projectId: string): Promise<VersionSnapshot[]> {
    // PHASE H.2 (Version History): A READ-ONLY query that surfaces the existing
    // VersionSnapshot infrastructure. It returns the immutable snapshots for
    // the project, ordered by publish time (newest first). It NEVER mutates a
    // snapshot and NEVER evaluates business meaning.
    return Array.from(this.snapshots.values())
      .filter((snapshot) => snapshot.projectId === projectId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  async loadSnapshot(
    projectId: string,
    snapshotId: string,
  ): Promise<VersionSnapshot | undefined> {
    // PHASE H.2 (Version History): A READ-ONLY query used to view the details
    // of a specific version. It returns the immutable snapshot, or undefined if
    // it does not exist or belongs to a different project.
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot === undefined || snapshot.projectId !== projectId) {
      return undefined;
    }
    return snapshot;
  }
  async archive(): Promise<void> {

    // No-op for this milestone.
  }
  async loadLifecycle(
    projectId: string,
  ): Promise<ProjectLifecycle | undefined> {
    return this.lifecycles.get(projectId);
  }
}
