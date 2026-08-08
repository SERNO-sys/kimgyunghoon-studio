/**
 * AWIE V2 - Phase H.2: Editor Integration - Version History Detail API.
 *
 * The Version History Detail entry point. This is the SERVER-SIDE route that the
 * Dumb Client calls to preview a specific VersionSnapshot. It is the ONLY place
 * where the VersionHistoryService is wired to the shared ProjectRepository
 * (snapshots + release pointer) and the shared Preview Session (Draft).
 *
 * THE FLOW (Dumb Client -> Version Preview):
 *
 *   Dumb Client sends a GET intent via HTTP GET
 *     -> This route authenticates the user
 *     -> VersionHistoryService.loadVersion() loads the immutable
 *        VersionSnapshot by id via the shared ProjectRepository
 *     -> Renders the snapshot's ThemeConfig into a RenderNode via the
 *        GoldenPathOrchestrator (Runtime Layer)
 *     -> This route returns the VersionHistoryDetailResult (RenderNode ONLY)
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY the
 *      rendered RenderNode (the framework-agnostic Runtime output). This route
 *      is the boundary that enforces that rule.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the VersionHistoryService, the
 *      ProjectRepository, or any Runtime service. All orchestration happens
 *      server-side, in this route.
 *
 *   3. IMMUTABLE SNAPSHOTS (Section 1)
 *      The Version History is a READ-ONLY view over the immutable
 *      VersionSnapshots created by Publish. This route NEVER mutates a snapshot
 *      and NEVER moves the Release Pointer. It only reads and renders.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Runtime Layer (Golden Path) — the orchestrator that renders ThemeConfig into
// a RenderNode tree. It is a stateless singleton, safe to construct here.
import {
  buildGoldenPathRegistries,
  DefaultGoldenPathOrchestrator,
  type GoldenPathOrchestrator,
} from '@/lib/golden-path';

import {
  VersionHistoryService,
  projectRepository,
  previewStore,
} from '@/lib/editor-integration/server';
import { requireSiteOwnership, guardError, isValidId } from '@/lib/security';
import { getDb } from '@/lib/db/client';


// The GoldenPathOrchestrator is constructed once from the frozen registries.
// It is stateless and deterministic, so a singleton is safe.
const goldenPath: GoldenPathOrchestrator = new DefaultGoldenPathOrchestrator(
  buildGoldenPathRegistries(),
);

/**
 * The Version History Detail API.
 *
 * Loads a specific VersionSnapshot and renders it into a RenderNode. The client
 * NEVER receives or holds the ThemeConfig.
 *
 * @param request The Next.js request.
 * @param context The route context carrying the project id and snapshot id.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; snapshotId: string }> },
) {
  const { id: projectId, snapshotId } = await context.params;

  // 1. SECURITY BOUNDARY: Authenticate AND enforce tenant isolation. The
  //    authenticated session MUST own the project (site). Anonymous access and
  //    cross-tenant access are EXPLICITLY rejected. This also strictly validates
  //    the projectId to block injection / path traversal / SSRF.
  const db = getDb();
  const guard = await requireSiteOwnership(request, db, projectId);
  if (!guard.ok) {
    return guardError(guard);
  }

  // 2. Strictly validate the snapshotId to block injection / path traversal.
  if (!isValidId(snapshotId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid snapshot id' },
      { status: 400 },
    );
  }

  // 3. Resolve the requested page id. Defaults to the home page.
  const pageId = request.nextUrl.searchParams.get('page') ?? 'home';

  // 4. Build the VersionHistoryService for this project. It wires the shared
  //    ProjectRepository (persistence port) to the Draft visibility resolver
  //    (Preview Session). It is constructed per-request.
  const service = new VersionHistoryService(
    projectRepository,
    goldenPath,
    (pid) => previewStore.getDraft(pid) !== undefined,
  );

  // 4. Execute the Version History detail query and return the RenderNode. The
  //    client receives ONLY the rendered RenderNode — never the ThemeConfig.
  try {
    const result = await service.viewVersion(projectId, snapshotId, pageId);
    return NextResponse.json(result);

  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Version History query failed';
    return NextResponse.json(
      { success: false, projectId, snapshotId, error: message },
      { status: 500 },
    );
  }
}
