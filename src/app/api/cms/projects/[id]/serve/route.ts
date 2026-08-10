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
 *   Public GET /api/cms/projects/:id/serve?v={snapshotId}&page=home
 *     -> Loads the SPECIFIC immutable VersionSnapshot by id (MILESTONE I)
 *     -> Runs the GoldenPathOrchestrator (Runtime Layer) to produce a RenderNode
 *     -> Returns the RenderNode with IMMUTABLE HTTP cache headers
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. RELEASED SNAPSHOT ONLY (STABLE URL)
 *      The stable URL (/serve) serves ONLY the Released (Live) VersionSnapshot.
 *      It NEVER serves the Draft. The Draft is the Editor's working copy; the
 *      Released snapshot is the immutable, published artifact. This is the
 *      decoupling between Publish (freeze) and Release (make live) established
 *      in MANDATE 1.
 *
 *   2. RELEASE POINTER ARCHITECTURE (MANDATE 2)
 *      The stable URL (/serve) queries the Project's Current Release Pointer
 *      FIRST. The pointer is a thin, mutable designation (just a snapshot id)
 *      that resolves to the active VersionSnapshot. This explicitly separates
 *      the act of creating a snapshot (Publish) from designating it as live
 *      (Release), and enables INSTANT ROLLBACKS: to roll back, simply re-point
 *      the pointer at a previous snapshot id.
 *
 *   3. VERSIONED SNAPSHOT URL (MILESTONE I)
 *      The versioned URL (/serve?v={snapshotId}) serves a SPECIFIC immutable
 *      VersionSnapshot by id, bypassing the Release Pointer entirely. It is the
 *      canonical, permanent URL for a given published artifact. Because the
 *      snapshot is immutable, this URL is served with `immutable` cache-control
 *      (the ONLY place `immutable` is allowed, per ADR-006). It NEVER serves
 *      the Draft.
 *
 *   4. DELIVERY LAYER, NOT DECISION LAYER
 *      This route does NOT decide. It loads the requested snapshot (Released or
 *      versioned), renders it via the GoldenPathOrchestrator (which composes the
 *      frozen pipeline), and returns the RenderNode. It NEVER interprets
 *      business meaning.
 *
 *   5. VALIDATION-BASED CACHING (MANDATE 1)
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

// The DeliveryCache service (Phase H.4) is the SINGLE source of truth for the
// frozen Delivery Layer caching contract (ADR-006). It computes the ETag and
// cache-control headers and decides Conditional GET (304 vs 200). The route is
// a THIN WRAPPER around it — it never re-implements caching logic.
//
// The ProjectRepository is the SHARED singleton that the Publish Workflow
// (PublishOrchestrator) writes to. Sharing the repository is what makes the
// Release path actually serve published snapshots: Publish writes snapshots +
// the Release Pointer here, and this Delivery Layer reads them back from the
// same store. In a production deployment this would be backed by durable
// storage (D1) and shared across all routes via the persistence layer.
import {
  DeliveryCache,
  projectRepository,
} from '@/lib/editor-integration/server';
import { isValidId, isValidPageId } from '@/lib/security';

// This route is Cloudflare Edge-compatible: it uses only Web-standard APIs
// (NextResponse/NextRequest), Cloudflare-native D1 via getRequestContext(), and
// Edge-safe in-memory services. Declaring the Edge runtime enables Cloudflare
// Pages Production deployment.
export const runtime = 'edge';

// The GoldenPathOrchestrator is constructed once from the frozen registries.

// It is stateless and deterministic, so a singleton is safe.
const goldenPath: GoldenPathOrchestrator = new DefaultGoldenPathOrchestrator(
  buildGoldenPathRegistries(),
);

// The DeliveryCache service (Phase H.4) is the SINGLE source of truth for the
// frozen Delivery Layer caching contract (ADR-006). It is stateless and
// deterministic, so a singleton is safe. The route is a THIN WRAPPER around it.
const deliveryCache = new DeliveryCache();

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

  // 1. SECURITY BOUNDARY (INPUT VALIDATION): This is the PUBLIC Delivery Layer,
  //    so it is intentionally NOT authenticated (published sites are public).
  //    However, the `page` and `v` (snapshotId) query params are strictly
  //    validated to block path traversal / injection / SSRF. The projectId is
  //    also validated before it is used to query the repository.
  if (!isValidId(projectId)) {
    return NextResponse.json(
      { success: false, code: 'validation.rejected', message: 'Invalid project id' },
      { status: 400 },
    );
  }

  // 1a. Resolve the requested page id. Defaults to the home page.
  const pageId = request.nextUrl.searchParams.get('page') ?? 'home';
  if (!isValidPageId(pageId)) {
    return NextResponse.json(
      { success: false, code: 'validation.rejected', message: 'Invalid page id' },
      { status: 400 },
    );
  }

  // 2. Resolve the requested snapshot.
  //
  //    MILESTONE I (Versioned Snapshot URLs): The optional `v` query param
  //    selects a SPECIFIC immutable VersionSnapshot by id. When present, the
  //    route serves that exact snapshot (bypassing the Release Pointer) with
  //    IMMUTABLE cache-control — the canonical, permanent URL for a published
  //    artifact. When absent, the route falls through to the stable URL flow:
  //    it queries the Release Pointer and serves the Released (Live) snapshot
  //    with VALIDATION-BASED cache-control.
  //
  //    This is a THIN WRAPPER decision: the route only selects WHICH snapshot
  //    to load. It never interprets business meaning and never mutates state.
  const requestedSnapshotId =
    request.nextUrl.searchParams.get('v') ?? undefined;

  // 2b. Strictly validate the versioned snapshot id (if present) to block
  //     injection / path traversal / SSRF.
  if (requestedSnapshotId !== undefined && !isValidId(requestedSnapshotId)) {
    return NextResponse.json(
      { success: false, code: 'validation.rejected', message: 'Invalid snapshot id' },
      { status: 400 },
    );
  }

  // 3. Load the snapshot.
  //
  //    Versioned URL: load the specific immutable snapshot by id. If it does
  //    not exist, the URL is invalid (404).
  //
  //    Stable URL: query the Project's Current Release Pointer (MANDATE 2) and
  //    resolve it to the active Released VersionSnapshot. The pointer is the
  //    single, mutable designation of which snapshot is "Live".
  let snapshot;
  let versioned = false;
  if (requestedSnapshotId) {
    versioned = true;
    snapshot = await projectRepository.loadSnapshot(
      projectId,
      requestedSnapshotId,
    );
    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: `Project "${projectId}" has no VersionSnapshot "${requestedSnapshotId}".`,
        },
        { status: 404 },
      );
    }
  } else {
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

    // If the pointer is set but the snapshot is missing (dangling pointer), the
    // Project is not consistently live.
    snapshot = await projectRepository.loadReleasedSnapshot(projectId);
    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: `Project "${projectId}" Release Pointer points to a missing snapshot "${releasePointer}".`,
        },
        { status: 404 },
      );
    }
  }

  // 4. Conditional GET (MANDATE 1): The DeliveryCache service (Phase H.4)
  //    decides whether the client's cached copy is current. If the client's
  //    `If-None-Match` matches the ETag derived from the snapshot version, the
  //    route returns 304 Not Modified (no body).
  //
  //    Stable URL (/serve): NOT immutable, so `versioned` is false — the
  //    service applies `max-age=0, must-revalidate` (validation-based caching).
  //
  //    Versioned URL (/serve?v={snapshotId}): IMMUTABLE, so `versioned` is true
  //    — the service applies `immutable` cache-control (the ONLY place
  //    `immutable` is allowed, per ADR-006). An immutable URL is never
  //    revalidated, so a 304 is not applicable here.
  const decision = deliveryCache.decide(
    snapshot.version,
    request.headers.get('if-none-match'),
    versioned,
  );
  if (decision.notModified) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: decision.etag,
        'Cache-Control': decision.cacheControl,
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

    // 6. Return the RenderNode with the appropriate cache headers. The
    //    DeliveryCache service (Phase H.4) is the SINGLE source of truth for
    //    the frozen caching contract (ADR-006): validation-based for the stable
    //    URL, immutable for the versioned URL.
    return NextResponse.json(
      {
        success: true,
        projectId,
        pageId,
        snapshotId: snapshot.id,
        version: snapshot.version,
        versioned,
        renderNode: result.renderNode,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': decision.cacheControl,
          ETag: decision.etag,
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


