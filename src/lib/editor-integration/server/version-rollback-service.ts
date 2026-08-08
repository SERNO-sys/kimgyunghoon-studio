/**
 * AWIE V2 - Phase H.3: Editor Integration - Version Rollback Service.
 *
 * The Version Rollback Service exposes the EXISTING rollback capability of the
 * frozen architecture (Release Pointer re-pointing) as a user-facing Version
 * Rollback product surface. It is SERVER-SIDE ONLY and MUST NEVER be imported
 * by the client.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client sends a single POST intent to roll back to a specific
 *      VersionSnapshot. It receives ONLY metadata (VersionRollbackResult) — the
 *      rolled-back snapshot's identity, version, schema version, publish time,
 *      and publisher. It NEVER receives or holds the ThemeConfig.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      This service composes the Application Layer (ProjectRepository port). It
 *      NEVER decides; it only wires. It NEVER mutates a snapshot and NEVER
 *      evaluates business meaning.
 *
 *   3. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER (Section 1)
 *      The VersionSnapshots created by Publish are IMMUTABLE and are NEVER
 *      mutated by a rollback. Rollback ONLY re-points the Release Pointer at a
 *      previous snapshot id via the existing `repository.release()` capability.
 *      This is the single, mutable "live" designation. It is the SAME mechanism
 *      the Delivery Layer (Public Serve API) reads first, so a rollback takes
 *      effect instantly.
 *
 *   4. NO NEW INFRASTRUCTURE (Buy Before Build)
 *      Rollback is NOT new infrastructure. It is the existing Release Pointer
 *      re-pointing capability surfaced through a product boundary. This service
 *      is a THIN WRAPPER that validates the target snapshot exists and belongs
 *      to the project, then re-points the pointer. It adds NO new persistence,
 *      NO new mutation, and NO new business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import type { ProjectRepository } from '../../cms-core';
import type { VersionRollbackResult } from '../types';

/**
 * The Version Rollback Service.
 *
 * Composes the Application Layer (ProjectRepository port). It is constructed
 * with the shared ProjectRepository (the SAME singleton the Publish Workflow
 * writes snapshots + the Release Pointer to). It NEVER decides; it only wires.
 */
export class VersionRollbackService {
  /**
   * Constructs the Version Rollback Service.
   *
   * @param repository The shared ProjectRepository port (the SAME singleton the
   *   Publish Workflow writes snapshots + the Release Pointer to).
   */
  constructor(private readonly repository: ProjectRepository) {}

  /**
   * Rolls a Project back to a specific VersionSnapshot.
   *
   * PHASE H.3 (Version Rollback): The Dumb Client sends a single POST intent to
   * roll back to a specific VersionSnapshot. This service:
   *
   *   1. Loads the target snapshot (READ-ONLY). It returns undefined if the
   *      snapshot does not exist or belongs to a different project.
   *   2. Re-points the Release Pointer at that snapshot via the existing
   *      `repository.release()` capability. The snapshots themselves are NEVER
   *      mutated — only the single, mutable "live" designation moves.
   *   3. Returns ONLY metadata (VersionRollbackResult). The client NEVER
   *      receives or holds the ThemeConfig.
   *
   * @param projectId The id of the Project.
   * @param snapshotId The id of the VersionSnapshot to roll back to.
   * @returns The VersionRollbackResult carrying the rolled-back snapshot's
   *   metadata.
   */
  async rollback(
    projectId: string,
    snapshotId: string,
  ): Promise<VersionRollbackResult> {
    // 1. Load the target immutable snapshot via the shared ProjectRepository
    //    port. This is a READ-ONLY query. It returns undefined if the snapshot
    //    does not exist or belongs to a different project.
    const snapshot = await this.repository.loadSnapshot(projectId, snapshotId);
    if (!snapshot) {
      throw new Error(
        `VersionRollbackService: snapshot "${snapshotId}" not found for project "${projectId}".`,
      );
    }

    // 2. Re-point the Release Pointer at the target snapshot via the existing
    //    `repository.release()` capability. This is the SAME rollback mechanism
    //    the frozen architecture already provides (Section 1, MANDATE 2). The
    //    immutable snapshot is NEVER mutated — only the single, mutable "live"
    //    designation moves. The Delivery Layer reads this pointer first, so the
    //    rollback takes effect instantly.
    await this.repository.release(projectId, snapshotId);

    // 3. Return ONLY metadata. The client NEVER receives or holds the
    //    ThemeConfig — it receives the rolled-back snapshot's identity, version,
    //    schema version, publish time, and publisher.
    return {
      success: true,
      projectId,
      liveSnapshotId: snapshot.id,
      version: snapshot.version,
      schemaVersion: snapshot.schemaVersion,
      publishedAt: snapshot.publishedAt,
      publishedBy: snapshot.publishedBy,
    };
  }
}
