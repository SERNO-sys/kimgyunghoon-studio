/**
 * AWIE V2 - Phase 12.5: Editor Integration - Barrel Export.
 *
 * The Editor Integration layer defines the WIRE CONTRACT between the
 * Server-Side Orchestration API and the Dumb React Viewer.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The React UI NEVER instantiates or orchestrates the Runtime. It does
 *      NOT hold or mutate the ThemeConfig. It strictly sends Commands via HTTP
 *      POST and renders the RenderNode snapshot returned by the server.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The Next.js API Route is the ONLY place where the Application Layer
 *      (EditorService -> PatchPipeline) and the Runtime Layer
 *      (GoldenPathOrchestrator -> RenderNode) interact.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure wire-contract modeling for the integration layer.
 */

export type {
  EditorCommandError,
  EditorCommandPayload,
  EditorCommandResponse,
  EditorCommandResult,
  EditorHistoryError,
  EditorHistoryResponse,
  EditorHistoryResult,
  PreviewSession,
} from './types';


// Client-Side Dumb Viewer (MANDATE 2). This is the ONLY thing the client
// renders. It is exported separately so that server-only modules never import
// it (it is a React component).
export { DumbPreviewViewer } from './client';
