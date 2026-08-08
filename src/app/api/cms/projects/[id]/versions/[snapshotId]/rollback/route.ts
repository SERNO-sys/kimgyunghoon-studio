/**
 * AWIE V2 - Phase H.3: Editor Integration - Version Rollback API.
 *
 * The Version Rollback entry point. This is the SERVER-SIDE route that the Dumb
 * Client calls to roll a Project back to a specific VersionSnapshot. It is the
 * ONLY place where the VersionRollbackService is wired to the shared
 * ProjectRepository (snapshots + release pointer).
 *
 * THE FLOW (Dumb Client -> Version Rollback):
 *
 *   Dumb Client sends a POST intent via HTTP POST
 *     -> This route authenticates the user
 *     -> VersionRollbackService.rollback() loads the immutable VersionSnapshot
 *        by id via the shared ProjectRepository
 *     -> Re-points the Release Pointer at that snapshot via the existing
 *        `repository.release()` capability (the frozen rollback mechanism)
 *     -> This route returns the VersionRollbackResult (metadata ONLY)
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client sends a single POST intent and receives ONLY metadata
 *      (VersionRollbackResult) — the rolled-back snapshot's identity, version,
 *      schema version, publish time, and publisher. It NEVER receives or holds
 *      the ThemeConfig. This route is the boundary that enforces that rule.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the VersionRollbackService, the
 *      ProjectRepository, or any Runtime service. All orchestration happens
 *      server-side, in this route.
 *
 *   3. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER (Section 1)
 *      The VersionSnapshots created by Publish are IMMUTABLE and are NEVER
 *      mutated by a rollback. Rollback ONLY re-points the Release Pointer at a
 *      previous snapshot id via the existing `repository.release()` capability.
 *      This is the single, mutable "live" designation. The Delivery Layer reads
 *      this pointer first, so a rollback takes effect instantly.
 *
 *   4. NO NEW INFRASTRUCTURE (Buy Before Build)
 *      Rollback is NOT new infrastructure. It is the existing Release Pointer
 *      re-pointing capability surfaced through a product boundary. This route
 *      adds NO new persistence, NO new mutation, and NO new business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  VersionRollbackService,
  projectRepository,
} from '@/lib/editor-integration/server';
import {
  requireSiteOwnership,
  guardError,
  isValidId,
  publishRateLimit,
} from '@/lib/security';
import { getDb } from '@/lib/db/client';


/**
 * The Version Rollback API.
 *
 * Rolls a Project back to a specific VersionSnapshot by re-pointing the Release
 * Pointer. The client NEVER receives or holds the ThemeConfig.
 *
 * @param request The Next.js request.
 * @param context The route context carrying the project id and snapshot id.
 */
export async function POST(
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
  const session = guard.session;

  // 2. Strictly validate the snapshotId to block injection / path traversal.
  if (!isValidId(snapshotId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid snapshot id' },
      { status: 400 },
    );
  }

  // 3. RATE LIMITING BOUNDARY: Prevent abuse of the rollback endpoint.
  if (!publishRateLimit.allow(`${session.userId}:rollback`)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 },
    );
  }

  // 4. Build the VersionRollbackService for this project. It wires the shared
  //    ProjectRepository (persistence port). It is constructed per-request.
  const service = new VersionRollbackService(projectRepository);

  // 3. Execute the Version Rollback and return the metadata. The client
  //    receives ONLY the rolled-back snapshot's metadata — never the
  //    ThemeConfig.
  try {
    const result = await service.rollback(projectId, snapshotId);
    return NextResponse.json(result);

  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Version Rollback failed';
    return NextResponse.json(
      { success: false, projectId, snapshotId, error: message },
      { status: 500 },
    );
  }
}
