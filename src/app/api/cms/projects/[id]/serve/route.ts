/**
 * AWIE V2 - Phase 12.6: Delivery Layer - Public Serve API.
 *
 * MANDATE 2: This API Route is the Delivery Layer. It is the ONLY place where
 * the Released (Live) VersionSnapshot is loaded and rendered for public
 * consumption.
 *
 * THE FLOW:
 *
 *   Public GET /api/cms/projects/:id/serve?page=home
 *     -> Queries the Project's Current Release Pointer (MANDATE 2)
 *     -> Resolves the pointer to the active Released VersionSnapshot
 *     -> Runs the GoldenPathOrchestrator (Runtime Layer) to produce a RenderNode
 *     -> Returns the RenderNode with VALIDATION-BASED HTTP cache headers
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. RELEASED SNAPSHOT ONLY
 *      This route serves ONLY the Released (Live) VersionSnapshot. It NEVER
 *      serves the Draft. The Draft is the Editor's working copy; the Released
 *      snapshot is the immutable, published artifact. This is the decoupling
 *      between Publish (freeze) and Release (make live) established in
 *      MANDATE 1.
 *
 *   2. RELEASE POINTER ARCHITECTURE (MANDATE 2)
 *      The Serve API queries the Project's Current Release Pointer FIRST. The
 *      pointer is a thin, mutable designation (just a snapshot id) that
 *      resolves to the active VersionSnapshot. This explicitly separates the
 *      act of creating a snapshot (Publish) from designating it as live
 *      (Release), and enables INSTANT ROLLBACKS: to roll back, simply re-point
 *      the pointer at a previous snapshot id.
 *
 *   3. DELIVERY LAYER, NOT DECISION LAYER
 *      This route does NOT decide. It loads the Released snapshot, renders it
 *      via the GoldenPathOrchestrator (which composes the frozen pipeline), and
 *      returns the RenderNode. It NEVER interprets business meaning.
 *
 *   4. VALIDATION-BASED CACHING (MANDATE 1)
 *      The stable URL (/serve) is NOT immutable. This route uses
 *      validation-based caching: `Cache-Control: public, max-age=0,
 *      must-revalidate` with an ETag. It handles If-None-Match requests and
 *      returns 304 Not Modified when the client's cached copy is current.
 *      `immutable` is reserved strictly for versioned snapshot URLs
 *      (e.g. /serve?v={snapshotId}).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure Delivery Layer orchestration.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Runtime Layer (Golden Path) — the orchestrator that renders ThemeConfig into
// a RenderNode tree.
import {
  buildGoldenPathRegistries,
  DefaultGoldenPathOrchestrator,
  type GoldenPathOrchestrator,
} from '@/lib/golden-path';

// Application Layer (CMS Core) — the ProjectRepository port that loads the
// Released (Live) VersionSnapshot.
import type { ProjectRepository } from '@/lib/cms-core';

/**
 * A minimal in-memory ProjectRepository adapter for this milestone.
 *
 * Implements the Aggregate-Centric Persistence Port (MANDATE 3) AND the Release
 * Pointer architecture (MANDATE 2).
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
 * In a production deployment this would be backed by durable storage (D1). For
 * this milestone it is an in-memory adapter, which is sufficient to prove the
 * Delivery Layer flow. The wire contract is unchanged.
 */
class InMemoryProjectRepository implements ProjectRepository {
  /** The immutable VersionSnapshots, keyed by snapshot id. */
  private readonly snapshots = new Map<string, import('@/lib/cms-core').VersionSnapshot>();
  /** The Current Release Pointer: projectId -> active snapshot id. */
  private readonly releasePointer = new Map<string, string>();

  async loadProject(): Promise<import('@/lib/cms-core').Project | undefined> {
    return undefined;
  }
  async saveProject(): Promise<void> {
    // No-op for this milestone.
  }
  async publish(
    projectId: string,
    snapshot: import('@/lib/cms-core').VersionSnapshot,
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
  ): Promise<import('@/lib/cms-core').VersionSnapshot | undefined> {
    // Resolve the pointer to the active snapshot. If the pointer is set but
    // the snapshot is missing (e.g. a dangling pointer), return undefined.
    const pointer = this.releasePointer.get(projectId);
    if (pointer === undefined) {
      return undefined;
    }
    return this.snapshots.get(pointer);
  }
  async archive(): Promise<void> {
    // No-op for this milestone.
  }
  async loadLifecycle(): Promise<
    import('@/lib/cms-core').ProjectLifecycle | undefined
  > {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Server-side singleton (in-memory for this milestone).
//
// The ProjectRepository is the Aggregate-Centric Persistence Port (MANDATE 3).
// In a production deployment this would be backed by durable storage (D1). For
// this milestone it is an in-memory adapter, which is sufficient to prove the
// Delivery Layer flow. The wire contract is unchanged.
// ---------------------------------------------------------------------------
const projectRepository: ProjectRepository = new InMemoryProjectRepository();

// The GoldenPathOrchestrator is constructed once from the frozen registries.
// It is stateless and deterministic, so a singleton is safe.
const goldenPath: GoldenPathOrchestrator = new DefaultGoldenPathOrchestrator(
  buildGoldenPathRegistries(),
);

/**
 * The Public Serve API.
 *
 * Loads the Released (Live) VersionSnapshot for a Project and renders the
 * requested page into a RenderNode tree with validation-based HTTP cache
 * headers.
 *
 * @param request The Next.js request.
 * @param context The route context carrying the project id.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  // 1. Resolve the requested page id. Defaults to the home page.
  const pageId = request.nextUrl.searchParams.get('page') ?? 'home';

  // 2. Query the Project's Current Release Pointer (MANDATE 2). The pointer is
  //    the single, mutable designation of which snapshot is "Live". This
  //    explicitly separates Publish (creates a snapshot) from Release (updates
  //    the pointer).
  const releasePointer = await projectRepository.loadReleasePointer(projectId);
  if (releasePointer === undefined) {
    return NextResponse.json(
      {
        success: false,
        error: `Project "${projectId}" has no Released (Live) snapshot. Publish and Release a snapshot first.`,
      },
      { status: 404 },
    );
  }

  // 3. Resolve the pointer to the active Released VersionSnapshot. If the
  //    pointer is set but the snapshot is missing (dangling pointer), the
  //    Project is not consistently live.
  const snapshot = await projectRepository.loadReleasedSnapshot(projectId);
  if (!snapshot) {
    return NextResponse.json(
      {
        success: false,
        error: `Project "${projectId}" Release Pointer points to a missing snapshot "${releasePointer}".`,
      },
      { status: 404 },
    );
  }

  // 4. Conditional GET (MANDATE 1): If the client's cached copy matches the
  //    current snapshot version (via If-None-Match), return 304 Not Modified.
  //    This is validation-based caching: the client revalidates on every
  //    request, but the body is only transferred when the snapshot changes.
  const etag = `"${snapshot.version}"`;
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-AWIE-Snapshot': snapshot.id,
        'X-AWIE-Version': snapshot.version,
      },
    });
  }

  // 5. Render the requested page via the GoldenPathOrchestrator (Runtime
  //    Layer). The orchestrator composes the frozen pipeline:
  //    ThemeConfig -> ThemeEngine -> RenderNode -> React Adapter.
  //
  //    NOTE: The RenderNode is the canonical, framework-agnostic Runtime
  //    output. The React element tree is NOT serialized over the wire; the
  //    client materializes the RenderNode via its own framework adapter.
  try {
    const result = goldenPath.renderPage(snapshot.config, pageId);

    // 6. Return the RenderNode with VALIDATION-BASED cache headers (MANDATE 1).
    //    The stable URL (/serve) is NOT immutable. `max-age=0, must-revalidate`
    //    forces revalidation on every request, and the ETag enables 304
    //    responses. `immutable` is reserved strictly for versioned snapshot
    //    URLs (e.g. /serve?v={snapshotId}).
    return NextResponse.json(
      {
        success: true,
        projectId,
        pageId,
        snapshotId: snapshot.id,
        version: snapshot.version,
        renderNode: result.renderNode,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
          ETag: etag,
          'X-AWIE-Snapshot': snapshot.id,
          'X-AWIE-Version': snapshot.version,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Render failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
