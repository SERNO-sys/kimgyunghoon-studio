/**
 * AWIE V2 - Phase H.2: Editor Integration - Version History Service.
 *
 * The Version History Service surfaces the existing VersionSnapshot
 * infrastructure as a user-facing Version History. It is SERVER-SIDE ONLY and
 * MUST NEVER be imported by the client.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY
 *      snapshot METADATA (VersionHistoryEntry) and, for the detail view, a
 *      framework-agnostic RenderNode preview. This service is the boundary that
 *      enforces that rule.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      This service composes the Application Layer (ProjectRepository port) and
 *      the Runtime Layer (GoldenPathOrchestrator). It NEVER decides; it only
 *      wires. It NEVER mutates a snapshot and NEVER evaluates business meaning.
 *
 *   3. IMMUTABLE SNAPSHOTS (Section 1)
 *      The Version History is a READ-ONLY view over the immutable
 *      VersionSnapshots created by Publish. This service NEVER mutates a
 *      snapshot and NEVER moves the Release Pointer. It only reads.
 *
 *   4. PUBLISHED / DRAFT VISIBILITY
 *      The service reports whether an unpublished Draft exists in the Preview
 *      Session (via the injected hasDraft resolver), so the UI can distinguish
 *      Published versions from the working Draft.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import type { ProjectRepository } from '../../cms-core';
import type { GoldenPathOrchestrator } from '../../golden-path';
import type {
  VersionDetailResult,
  VersionHistoryEntry,
  VersionHistoryResult,
} from '../types';

/**
 * The Version History Service.
 *
 * Composes the Application Layer (ProjectRepository port) and the Runtime Layer
 * (GoldenPathOrchestrator). It is constructed with the shared ProjectRepository
 * (the SAME singleton the Publish Workflow writes to) and the pre-built
 * GoldenPathOrchestrator. It NEVER decides; it only wires.
 */
export class VersionHistoryService {
  /**
   * Constructs the Version History Service.
   *
   * @param repository The shared ProjectRepository port (the SAME singleton the
   *   Publish Workflow writes snapshots + the Release Pointer to).
   * @param goldenPath The Runtime Layer orchestrator (ThemeConfig -> RenderNode).
   * @param hasDraft A function that reports whether an unpublished Draft exists
   *   in the Preview Session for a project.
   */
  constructor(
    private readonly repository: ProjectRepository,
    private readonly goldenPath: GoldenPathOrchestrator,
    private readonly hasDraft: (projectId: string) => boolean,
  ) {}

  /**
   * Lists a Project's Version History.
   *
   * PHASE H.2 (Version History): Returns the immutable VersionSnapshots for the
   * project as METADATA ONLY (VersionHistoryEntry), newest first. It NEVER
   * returns the ThemeConfig. It also reports the currently Released (Live)
   * snapshot id and whether an unpublished Draft exists.
   *
   * @param projectId The id of the Project.
   * @returns The VersionHistoryResult carrying the snapshot metadata.
   */
  async listVersions(projectId: string): Promise<VersionHistoryResult> {
    // 1. Query the immutable snapshots (newest first) via the shared
    //    ProjectRepository port. This is a READ-ONLY query.
    const snapshots = await this.repository.listSnapshots(projectId);

    // 2. Resolve the currently Released (Live) snapshot id. The Release Pointer
    //    is the single, mutable "live" designation.
    const liveSnapshotId = await this.repository.loadReleasePointer(projectId);

    // 3. Map each immutable snapshot to its METADATA entry. The ThemeConfig is
    //    deliberately NOT included — the client NEVER receives it.
    const versions: VersionHistoryEntry[] = snapshots.map((snapshot) => ({
      snapshotId: snapshot.id,
      version: snapshot.version,
      schemaVersion: snapshot.schemaVersion,
      publishedBy: snapshot.publishedBy,
      publishedAt: snapshot.publishedAt,
      isLive: snapshot.id === liveSnapshotId,
    }));

    // 4. Return the metadata plus the Live id and Draft visibility. The client
    //    receives ONLY metadata — never the ThemeConfig.
    return {
      success: true,
      projectId,
      versions,
      liveSnapshotId,
      hasDraft: this.hasDraft(projectId),
    };
  }

  /**
   * Views a single Version's details.
   *
   * PHASE H.2 (Version History): Returns the snapshot METADATA plus a
   * framework-agnostic RenderNode preview of that version's home page. The
   * server renders the immutable snapshot via the GoldenPathOrchestrator
   * (Runtime Layer) and returns ONLY the RenderNode — the client NEVER receives
   * or holds the ThemeConfig.
   *
   * @param projectId The id of the Project.
   * @param snapshotId The id of the VersionSnapshot to view.
   * @param pageId The id of the page to render in the preview.
   * @returns The VersionDetailResult carrying the metadata + RenderNode preview.
   */
  async viewVersion(
    projectId: string,
    snapshotId: string,
    pageId: string,
  ): Promise<VersionDetailResult> {
    // 1. Load the immutable snapshot via the shared ProjectRepository port.
    //    This is a READ-ONLY query. It returns undefined if the snapshot does
    //    not exist or belongs to a different project.
    const snapshot = await this.repository.loadSnapshot(projectId, snapshotId);
    if (!snapshot) {
      throw new Error(
        `VersionHistoryService: snapshot "${snapshotId}" not found for project "${projectId}".`,
      );
    }

    // 2. Resolve the currently Released (Live) snapshot id.
    const liveSnapshotId = await this.repository.loadReleasePointer(projectId);

    // 3. Render the immutable snapshot via the GoldenPathOrchestrator (Runtime
    //    Layer). The Runtime NEVER decides; it only renders. The client
    //    receives ONLY the RenderNode preview — never the ThemeConfig.
    const render = this.goldenPath.renderPage(snapshot.config, pageId, {
      preview: true,
    });

    // 4. Return the metadata + RenderNode preview.
    return {
      success: true,
      projectId,
      version: {
        snapshotId: snapshot.id,
        version: snapshot.version,
        schemaVersion: snapshot.schemaVersion,
        publishedBy: snapshot.publishedBy,
        publishedAt: snapshot.publishedAt,
        isLive: snapshot.id === liveSnapshotId,
      },
      preview: render.renderNode,
      pageId,
    };
  }
}
