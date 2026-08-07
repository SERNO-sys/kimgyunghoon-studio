/**
 * AWIE V2 - React Component Registry (Phase 08, Milestone 2C - DESIGN ONLY).
 *
 * The concrete ReactComponentRegistry. Maps a componentId to an actual React
 * component (React.ComponentType<any>).
 *
 * CRITICAL: A componentId is NEVER a primitive HTML tag. It is always a key
 * into this registry. The registry is the single source of truth for the
 * componentId -> React component mapping.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { ReactComponentRegistry, ReactComponentType } from './types';

/**
 * Thrown when a componentId is not registered in the ReactComponentRegistry.
 *
 * The adapter MUST fail fast rather than fall back to rendering a raw HTML tag.
 */
export class ReactComponentNotFoundError extends Error {
  /** The unregistered componentId. */
  readonly componentId: string;

  constructor(componentId: string) {
    super(
      `ReactComponentRegistry: no React component registered for componentId ` +
        `"${componentId}". The adapter does NOT fall back to HTML tags.`,
    );
    this.name = 'ReactComponentNotFoundError';
    this.componentId = componentId;
  }
}

/**
 * The default in-memory ReactComponentRegistry.
 *
 * Backed by a Map for O(1) lookups. Registers componentId -> React component.
 */
export class InMemoryReactComponentRegistry implements ReactComponentRegistry {
  /** The underlying Map (O(1) lookups). */
  private readonly map = new Map<string, ReactComponentType>();

  /**
   * Registers a React component under a componentId.
   *
   * @param componentId The implementation id.
   * @param component The React component to render for this id.
   */
  register(componentId: string, component: ReactComponentType): void {
    this.map.set(componentId, component);
  }

  /**
   * Resolves a componentId to a React component. O(1) lookup.
   *
   * @param componentId The implementation id.
   * @returns The React component, or undefined if not registered.
   */
  get(componentId: string): ReactComponentType | undefined {
    return this.map.get(componentId);
  }

  /**
   * Returns whether a componentId is registered. O(1).
   *
   * @param componentId The implementation id.
   */
  has(componentId: string): boolean {
    return this.map.has(componentId);
  }
}
