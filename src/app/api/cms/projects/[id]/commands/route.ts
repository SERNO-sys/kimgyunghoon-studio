/**
 * AWIE V2 - Phase 12.5: Editor Integration - Server-Side Orchestration API.
 *
 * MANDATE 1: This API Route is the ONLY place where the Application Layer and
 * the Runtime Layer interact.
 *
 * THE FLOW:
 *
 *   Dumb Client sends a Command (wire payload) via HTTP POST
 *     -> This route authenticates the user
 *     -> Resolves the Project's Draft ThemeConfig (Preview Session)
 *     -> ServerSideOrchestrator executes the Command (Application Layer)
 *     -> GoldenPathOrchestrator generates a NEW RenderNode tree (Runtime Layer)
 *     -> This route returns a CommandResult { success, commandId, snapshotId, preview }
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY
 *      the RenderNode preview. This route NEVER returns the ThemeConfig.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The client NEVER imports the GoldenPathOrchestrator or any Runtime
 *      service. All orchestration happens server-side, in this route.
 *
 *   3. PREVIEW SESSIONS
 *      The Editor state is DECOUPLED from the Published state via a Preview
 *      Session. Each Command produces a NEW snapshot. The Published state is
 *      NEVER mutated by a Preview Session Command.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireSiteOwnership, guardError } from '@/lib/security';
import { getDb } from '@/lib/db/client';

import type { EditorCommandPayload } from '@/lib/editor-integration';
import { ServerSideOrchestrator } from '@/lib/editor-integration/server';
import { PreviewSessionStore } from '@/lib/editor-integration/server';

// Application Layer (CMS Core) — the executor of Commands.
import {
  DeleteComponentHandler,
  EditorService,
  InsertComponentHandler,
  MoveComponentHandler,
  ThemePatchPipeline,
  UpdateComponentHandler,
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


// ---------------------------------------------------------------------------
// Server-side singletons (in-memory for this milestone).
//
// The PreviewSessionStore holds the Draft ThemeConfig (the working copy) and
// the PreviewSession metadata. The ServerSideOrchestrator wires the Application
// Layer (EditorService) to the Runtime Layer (GoldenPathOrchestrator).
//
// NOTE: In a production deployment these would be backed by durable storage
// (D1) and constructed per-request with the project's persisted Draft. For this
// milestone they are in-memory singletons, which is sufficient to prove the
// architecture. The wire contract is unchanged.
// ---------------------------------------------------------------------------
const previewStore = new PreviewSessionStore();

// The orchestrator is constructed lazily because it depends on the Golden Path
// registries and the EditorService, which are built from the project's initial
// ThemeConfig. For this milestone we expose a factory that the route wires.
// The route below demonstrates the full flow with a minimal in-memory wiring.
// A production route would resolve the project's persisted ThemeConfig and
// build the EditorService + GoldenPathOrchestrator from it.

/**
 * The Server-Side Orchestration API.
 *
 * Receives a Command wire payload from the Dumb Client, executes it via the
 * ServerSideOrchestrator, and returns the RenderNode preview.
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

  // 2. Parse the Command wire payload.
  let payload: EditorCommandPayload;
  try {
    const body = (await request.json()) as Partial<EditorCommandPayload>;
    if (
      typeof body.type !== 'string' ||
      typeof body.commandId !== 'string' ||
      typeof body.clientSequence !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid command payload' },
        { status: 400 },
      );
    }
    payload = {
      type: body.type,
      commandId: body.commandId,
      sectionId: body.sectionId,
      value: body.value,
      clientSequence: body.clientSequence,
    };
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  // 3. Resolve the Project's Draft ThemeConfig (Preview Session). If no session
  //    exists, we cannot execute a Command against an unknown Draft. In a
  //    production deployment this would load the project's persisted Draft.
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

  // 4. Build the ServerSideOrchestrator for this project. The orchestrator
  //    wires the Application Layer (EditorService) to the Runtime Layer
  //    (GoldenPathOrchestrator). It is constructed per-request from the
  //    project's Draft ThemeConfig.
  //
  //    NOTE: For this milestone, the EditorService and GoldenPathOrchestrator
  //    are built by the route's wiring helper. A production route would resolve
  //    them from the project's persisted registries. The wire contract is
  //    unchanged.
  const orchestrator = buildOrchestrator(projectId);

  // 5. Execute the Command and return the RenderNode preview. The client
  //    receives ONLY the preview — never the ThemeConfig.
  try {
    const result = orchestrator.execute(
      projectId,
      session.userId,
      payload,
      'home',
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command failed';
    return NextResponse.json(
      { success: false, commandId: payload.commandId, error: message },
      { status: 500 },
    );
  }
}

/**
 * Builds the ServerSideOrchestrator for a project.
 *
 * This is the wiring helper that composes the Application Layer (EditorService)
 * and the Runtime Layer (GoldenPathOrchestrator). It is the ONLY place where
 * these two layers interact.
 *
 * NOTE: For this milestone, the EditorService and GoldenPathOrchestrator are
 * built from the project's Draft ThemeConfig using the Golden Path bootstrap
 * and the CMS Core EditorService. A production route would resolve them from
 * the project's persisted registries.
 *
 * @param projectId The id of the Project.
 * @returns A ServerSideOrchestrator wired for the project.
 */
function buildOrchestrator(projectId: string): ServerSideOrchestrator {
  // The orchestrator reads and writes the Draft through the PreviewSessionStore.
  // This keeps the Editor state decoupled from the Published state.
  return new ServerSideOrchestrator(
    // EditorService (Application Layer) — built from the project's Draft.
    // For this milestone we use a minimal in-memory EditorService. A production
    // route would construct the full EditorService with the project's handlers.
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
  service.register(new UpdateComponentHandler());
  service.register(new InsertComponentHandler());
  service.register(new DeleteComponentHandler());
  service.register(new MoveComponentHandler());
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


