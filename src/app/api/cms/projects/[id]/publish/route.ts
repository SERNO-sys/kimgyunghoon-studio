/**
 * AWIE V2 - Phase 12.6: Editor Integration - Publish Workflow API.
 *
 * The Publish Workflow entry point. This is the SERVER-SIDE route that the Dumb
 * Client calls to publish a Project. It is the ONLY place where the Publish
 * Workflow (PublishOrchestrator) is wired to the shared Preview Session (Draft)
 * and the shared ProjectRepository (snapshots + release pointer).
 *
 * THE FLOW (Dumb Client -> Published):
 *
 *   Dumb Client sends a Publish intent via HTTP POST
 *     -> This route authenticates the user
 *     -> Resolves the Project's Draft ThemeConfig (Preview Session)
 *     -> PublishOrchestrator executes the Publish Workflow:
 *          - PublishProjectCommand freezes the Draft into an immutable
 *            VersionSnapshot
 *          - ProjectRepository.publish() persists the snapshot
 *          - ReleaseProjectCommand designates the snapshot as Live
 *          - ProjectRepository.release() updates the Release Pointer
 *     -> This route returns a PublishResult { success, projectId, snapshot,
 *        releasedSnapshotId, version, publishedAt }
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER executes Publish/Release. It sends a single Publish
 *      intent via HTTP POST. The client NEVER receives or holds the ThemeConfig
 *      — it receives ONLY the PublishResult metadata.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the PublishOrchestrator, the ProjectRepository,
 *      or any Runtime service. All orchestration happens server-side, in this
 *      route.
 *
 *   3. PUBLISH AND RELEASE ARE DECOUPLED (MANDATE 1)
 *      The PublishOrchestrator performs both Publish (freeze snapshot) and
 *      Release (update pointer) in sequence for the "Publish & Make Live"
 *      workflow. The underlying commands remain decoupled, enabling future
 *      Scheduled Releases, Stage environments, and Blue/Green deployments.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  PublishOrchestrator,
  projectRepository,
  previewStore,
} from '@/lib/editor-integration/server';
import {
  requireSiteOwnership,
  guardError,
  isValidVersion,
  publishRateLimit,
} from '@/lib/security';
import { getDb } from '@/lib/db/client';

// This route is Cloudflare Edge-compatible: it uses only Web-standard APIs
// (NextResponse/NextRequest), Cloudflare-native D1 via getRequestContext(), and
// Edge-safe in-memory services. Declaring the Edge runtime enables Cloudflare
// Pages Production deployment.
export const runtime = 'edge';

/**
 * The Publish Workflow API.

 *
 * Receives a Publish intent from the Dumb Client, executes the Publish Workflow
 * via the PublishOrchestrator, and returns the PublishResult metadata.
 *
 * @param request The Next.js request.
 * @param context The route context carrying the project id.
 */
export async function POST(
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
  const session = guard.session;

  // 2. RATE LIMITING BOUNDARY: Prevent abuse of the publish endpoint. Keyed by
  //    actor + route. (Preparation boundary; production path is Cloudflare-native.)
  if (!publishRateLimit.allow(`${session.userId}:publish`)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 },
    );
  }

  // 3. Parse the Publish intent. The client sends ONLY the semantic version to
  //    assign to the published snapshot. It NEVER sends the ThemeConfig.
  let version: string;
  try {
    const body = (await request.json()) as { version?: unknown };
    if (typeof body.version !== 'string' || body.version.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Invalid publish payload: version required' },
        { status: 400 },
      );
    }
    version = body.version.trim();
    // Strictly validate the version string to block injection / path traversal.
    if (!isValidVersion(version)) {
      return NextResponse.json(
        { success: false, error: 'Invalid version format' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  // 3. Resolve the Project's Draft ThemeConfig (Preview Session). If no session
  //    exists, we cannot publish an unknown Draft. In a production deployment
  //    this would load the project's persisted Draft.
  const draft = previewStore.getDraft(projectId);
  if (!draft) {
    return NextResponse.json(
      {
        success: false,
        error: `No Preview Session for project "${projectId}". Initialize the session first.`,
      },
      { status: 404 },
    );
  }

  // 4. Build the PublishOrchestrator for this project. The orchestrator wires
  //    the shared ProjectRepository (persistence port) to the Draft resolver
  //    (Preview Session). It is constructed per-request from the project's
  //    Draft ThemeConfig.
  const orchestrator = new PublishOrchestrator(
    projectRepository,
    (pid) => {
      const current = previewStore.getDraft(pid);
      if (!current) {
        throw new Error(`No Draft ThemeConfig for project "${pid}".`);
      }
      return current;
    },
  );

  // 5. Execute the Publish Workflow and return the PublishResult. The client
  //    receives ONLY the result metadata — never the ThemeConfig.
  try {
    const result = await orchestrator.publish(
      projectId,
      session.userId,
      version,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Publish workflow failed';
    return NextResponse.json(
      { success: false, projectId, error: message },
      { status: 500 },
    );
  }
}
