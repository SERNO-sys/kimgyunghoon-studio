/**
 * AWIE V2 - Phase 12.5: Editor Integration - Client-Side Barrel Export.
 *
 * This module is CLIENT-SIDE ONLY. It exports the Dumb React Viewer (MANDATE 2),
 * which is the ONLY thing the client renders. It NEVER imports the ThemeConfig,
 * the GoldenPathOrchestrator, or any Runtime service.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure client-side presentation for the integration layer.
 */

export { DumbPreviewViewer } from './DumbPreviewViewer';
