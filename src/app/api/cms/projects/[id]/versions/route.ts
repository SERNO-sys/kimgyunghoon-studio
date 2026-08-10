/**
 * AWIE V2 - Phase H.2: Editor Integration - Version History List API.
 *
 * The Version History List entry point. This is the SERVER-SIDE route that the
 * Dumb Client calls to list a Project's Version History. It is the ONLY place
 * where the VersionHistoryService is wired to the shared ProjectRepository
 * (snapshots + release pointer) and the shared Preview Session (Draft).
 *
 * THE FLOW (Dumb Client -> Version History):
 *
 *   Dumb Client sends a GET intent via HTTP GET
 *     -> This route authenticates the user
 *     -> VersionHistoryService.listVersions() queries the immutable
 *        VersionSnapshots (newest first) via the shared ProjectRepository
 *     -> Resolves the currently Released (Live) snapshot id
 *     -> Reports whether an unpublished Draft exists in the Preview Session
 *     -> This route returns the VersionHistoryResult (METADATA ONLY)
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY
 *      snapshot METADATA (VersionHistoryEntry). This route is the boundary that
 *      enforces that rule.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the VersionHistoryService, the
 *      ProjectRepository, or any Runtime service. All orchestration happens
 *      server-side, in this route.
 *
 *   3. IMMUTABLE SNAPSHOTS (Section 1)
 *      The Version History is a READ-ONLY view over the immutable
 *      VersionSnapshots created by Publish. This route NEVER mutates a snapshot
 *      and NEVER moves the Release Pointer. It only reads.
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
import { requireSiteOwnership, guardError } from '@/lib/security';
import { getDb } from '@/lib/db/client';

// This route is Cloudflare Edge-compatible: it uses only Web-standard APIs
// (NextResponse/NextRequest), Cloudflare-native D1 via getRequestContext(), and
// Edge-safe in-memory services. Declaring the Edge runtime enables Cloudflare
// Pages Production deployment.
export const runtime = 'edge';

// The GoldenPathOrchestrator is constructed once from the frozen registries.

// It is stateless and deterministic, so a singleton is safe. It is required by
// the VersionHistoryService contract (used by the detail view); the list view
// simply does not invoke renderPage.
const goldenPath: GoldenPathOrchestrator = new DefaultGoldenPathOrchestrator(
  buildGoldenPathRegistries(),
);


/**
 * The Version History List API.
 *
 * Lists a Project's Version History as METADATA ONLY. The client NEVER receives
 * or holds the ThemeConfig.
 *
 * @param request The Next.js request.
 * @param context The route context carrying the project id.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  // 1. SECURITY BOUNDARY: Authenticate AND enforce tenant isolation. The
  //    authenticated session MUST own the project (site). Anonymous access and
  //    cross-tenant access are EXPLICITLY rejected. This also strictly validates
  //    the projectId to block injection / path traversal / SSRF.
  const db = getDb();
  const guard = await requireSiteOwnership(request, db, projectId);
  if (!guard.ok) {
    return guardError(guard);
  }

  // 2. Build the VersionHistoryService for this project. It wires the shared
  //    ProjectRepository (persistence port) to the Draft visibility resolver
  //    (Preview Session). It is constructed per-request. The list view only
  //    queries metadata; renderPage is not invoked here.
  const service = new VersionHistoryService(
    projectRepository,
    goldenPath,
    (pid) => previewStore.getDraft(pid) !== undefined,
  );


  // 3. Execute the Version History query and return the metadata. The client
  //    receives ONLY the snapshot metadata — never the ThemeConfig.
  try {
    const result = await service.listVersions(projectId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Version History query failed';
    return NextResponse.json(
      { success: false, projectId, error: message },
      { status: 500 },
    );
  }
}
