/**
 * AWIE V2 - Golden Path (Phase 12, Integration).
 *
 * The pure composition layer that wires the frozen architecture end-to-end:
 *
 *   CMS Command (Application) -> ThemeConfig (SSOT) -> ThemeEngine (Runtime)
 *     -> RenderNode -> React Adapter (Framework) -> React UI
 *
 * The Golden Path is NOT a new engine, NOT a new renderer, and NOT a new
 * decision-maker. It is a pure orchestration layer that connects the existing,
 * ratified components. It NEVER decides; it only wires.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration for the integration layer.
 */

export * from './types';
export * from './section-renderers';
export * from './bootstrap';
export * from './orchestrator';
