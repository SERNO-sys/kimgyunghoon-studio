/**
 * AWIE V2 - React Adapter Types (Phase 08, Milestone 2C - DESIGN ONLY).
 *
 * The React Adapter is the framework-specific materialization layer. It
 * consumes the framework-agnostic RenderNode tree produced by the ThemeEngine
 * and materializes it into React elements.
 *
 * THE PIPELINE:
 *
 *   ThemeEngine -> RenderNode -> ReactAdapter -> React UI
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO HTML TAG ASSUMPTIONS
 *      A componentId is NEVER assumed to be a primitive HTML tag (e.g. "div",
 *      "section", "h1"). Every componentId MUST be resolved through the
 *      ReactComponentRegistry to an actual React component
 *      (React.ComponentType<any>). If a componentId is not registered, the
 *      adapter MUST fail fast — it MUST NOT fall back to rendering a raw HTML
 *      tag.
 *
 *   2. REGISTRY-DRIVEN RESOLUTION
 *      The React Adapter resolves componentId -> React.ComponentType via the
 *      ReactComponentRegistry BEFORE rendering. This keeps the mapping explicit
 *      and auditable, and prevents accidental injection of arbitrary HTML.
 *
 *   3. SEPARATION OF CONCERNS
 *      The React Adapter contains ZERO business logic and ZERO ThemeConfig
 *      interpretation. It ONLY walks the RenderNode tree and materializes it.
 *
 *   4. DESIGN ONLY
 *      This module defines the CONTRACTS. Concrete React components and the
 *      final adapter implementation are built in a later milestone.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure type modeling for the React materialization layer.
 */

import type { RenderNode } from '../renderer-foundation';

/**
 * A React component type. Any React component (function or class) that accepts
 * arbitrary props. This is intentionally loose (`any`) because the adapter is
 * generic and must accept any registered component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReactComponentType = React.ComponentType<any>;

/**
 * The ReactComponentRegistry.
 *
 * Maps a componentId (the implementation id resolved by the ThemeEngine) to an
 * actual React component. This is the ONLY way the React Adapter resolves a
 * componentId to a renderable component.
 *
 * CRITICAL: A componentId is NEVER a primitive HTML tag. It is always a key
 * into this registry. The registry is the single source of truth for the
 * componentId -> React component mapping.
 */
export interface ReactComponentRegistry {
  /**
   * Registers a React component under a componentId.
   *
   * @param componentId The implementation id (matches the ThemeEngine's
   *   componentId resolution).
   * @param component The React component to render for this id.
   */
  register(componentId: string, component: ReactComponentType): void;

  /**
   * Resolves a componentId to a React component. O(1) lookup.
   *
   * @param componentId The implementation id.
   * @returns The React component, or undefined if not registered.
   */
  get(componentId: string): ReactComponentType | undefined;

  /**
   * Returns whether a componentId is registered. O(1).
   *
   * @param componentId The implementation id.
   */
  has(componentId: string): boolean;
}

/**
 * The React Adapter.
 *
 * Consumes a framework-agnostic RenderNode tree and materializes it into a
 * React element tree. It resolves every element node's componentId through the
 * ReactComponentRegistry.
 */
export interface ReactAdapter {
  /**
   * Materializes a RenderNode tree into a React element tree.
   *
   * @param node The framework-agnostic RenderNode tree.
   * @param options Optional render options.
   * @returns The React element tree.
   */
  render(node: RenderNode, options?: ReactRenderOptions): React.ReactNode;
}

/**
 * Optional render options for the React Adapter.
 */
export interface ReactRenderOptions {
  /** A pre-built ReactComponentRegistry. If omitted, the adapter uses its own. */
  registry?: ReactComponentRegistry;
  /** A React key prefix for reconciliation. */
  keyPrefix?: string;
}
