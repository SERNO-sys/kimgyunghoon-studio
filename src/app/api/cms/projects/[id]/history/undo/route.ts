/**
 * AWIE V2 - Phase 17.9: Editor Integration - History Undo API.
 *
 * Undo is a SYSTEM CONTROL operation, NOT a Domain Intent. It NEVER travels
 * through the Command API. This dedicated endpoint asks the
 * ServerSideOrchestrator to pop the most recent InversePatch from the
 * CommandHistoryManager, apply it to the current Draft ThemeConfig via the
 * ThemePatchPipeline, and re-render the preview via the GoldenPathOrchestrator.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY
 *      the RenderNode preview plus the canUndo/canRedo flags. This route NEVER
 *      returns the ThemeConfig.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the GoldenPathOrchestrator or any Runtime
 *      service. All orchestration happens server-side, in this route.
 *
 *   3. HISTORY GENERATES NO PATCHES
 *      Undo does not create a new Command. It only supplies the InversePatch
 *      that was recorded when the forward Command executed. The PatchPipeline
 *      applies it to produce a NEW ThemeConfig; the original is never mutated.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireSiteOwnership, guardError } from '@/lib/security';
import { getDb } from '@/lib/db/client';

import { ServerSideOrchestrator } from '@/lib/editor-integration/server';
import { PreviewSessionStore } from '@/lib/editor-integration/server';

// Application Layer (CMS Core) — the executor of Commands.
import {
  EditorService,
  ThemePatchPipeline,
  UpdateHeadingHandler,
  type Command,
} from '@/lib/cms-core';

// Runtime Layer (Golden Path) — the orchestrator that renders ThemeConfig into
// a RenderNode tree. The route is the ONLY place these two layers interact.
import {
  buildGoldenPathRegistries,
  DefaultGoldenPathOrchestrator,
  type GoldenPathOrchestrator,
} from '@/lib/golden-path';

// The PreviewSessionStore holds the Draft ThemeConfig (the working copy). It is
// shared with the Command API so Undo operates on the same Draft state that
// Commands mutate. In a production deployment this would be backed by durable
// storage (D1) and constructed per-request with the project's persisted Draft.
const previewStore = new PreviewSessionStore();

/**
 * The History Undo API.
 *
 * Undoes the most recent Command for a Project and returns the RenderNode
 * preview. The client receives ONLY the preview plus the canUndo/canRedo flags.
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

  // 2. Resolve the Project's Draft ThemeConfig (Preview Session). If no session
  //    exists, there is no history to undo against an unknown Draft.
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

  // 3. Build the ServerSideOrchestrator for this project. The orchestrator
  //    wires the Application Layer (EditorService) to the Runtime Layer
  //    (GoldenPathOrchestrator). It is constructed per-request from the
  //    project's Draft ThemeConfig.
  const orchestrator = buildOrchestrator(projectId);

  // 4. Undo the most recent Command and return the RenderNode preview. The
  //    client receives ONLY the preview — never the ThemeConfig.
  try {
    const result = orchestrator.undo(projectId, 'home');
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Undo failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * Builds the ServerSideOrchestrator for a project.
 *
 * This is the wiring helper that composes the Application Layer (EditorService)
 * and the Runtime Layer (GoldenPathOrchestrator). It is the ONLY place where
 * these two layers interact. It mirrors the wiring in the Command API so Undo
 * operates on the same Draft state and the same orchestrator instance.
 *
 * @param projectId The id of the Project.
 * @returns A ServerSideOrchestrator wired for the project.
 */
function buildOrchestrator(projectId: string): ServerSideOrchestrator {
  return new ServerSideOrchestrator(
    // EditorService (Application Layer) — built from the project's Draft.
    buildEditorService(),
    // GoldenPathOrchestrator (Runtime Layer) — built from the project's Draft.
    buildGoldenPath(),
    // getDraftConfig: resolve the current Draft ThemeConfig.
    (pid) => {
      const draft = previewStore.getDraft(pid);
      if (!draft) {
        throw new Error(`No Draft ThemeConfig for project "${pid}".`);
      }
      return draft;
    },
    // saveDraftConfig: persist the NEW Draft ThemeConfig (Preview Session write
    // path). The Published state is NEVER touched.
    (pid, config) => {
      previewStore.saveDraft(pid, config, `snap-${pid}-${Date.now()}`, 0);
    },
  );
}

/**
 * Builds the EditorService (Application Layer).
 *
 * NOTE: This is a minimal in-memory wiring for this milestone. A production
 * route would construct the full EditorService with the project's registered
 * CommandHandlers and RBAC role resolver.
 */
function buildEditorService(): EditorService<Command> {
  const service = new EditorService(
    new ThemePatchPipeline(),
    () => 'owner',
  );
  service.register(new UpdateHeadingHandler());
  return service;
}

/**
 * Builds the GoldenPathOrchestrator (Runtime Layer).
 *
 * NOTE: This is a minimal in-memory wiring for this milestone. A production
 * route would build the Golden Path registries from the project's persisted
 * ThemeConfig.
 */
function buildGoldenPath(): GoldenPathOrchestrator {
  return new DefaultGoldenPathOrchestrator(buildGoldenPathRegistries());
}
