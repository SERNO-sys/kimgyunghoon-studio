/**
 * AWIE V2 - Phase 12.5: Editor Integration - Server-Side Barrel Export.
 *
 * This module is SERVER-SIDE ONLY. It MUST NEVER be imported by the client.
 * It exports the Server-Side Orchestrator, which is the ONLY place where the
 * Application Layer (EditorService) and the Runtime Layer
 * (GoldenPathOrchestrator) interact.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

export { ServerSideOrchestrator } from './orchestrator';
export { PreviewSessionStore } from './preview-session-store';
