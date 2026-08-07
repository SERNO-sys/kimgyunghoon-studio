/**
 * AWIE V2 - ComponentAdapterRegistry (Phase 09B, Mandate 3).
 *
 * The adapter-friendly component registration concept.
 *
 * Instead of hardwiring React into the core (framework-agnostic) registry, this
 * registry holds component DEFINITIONS/RESOLVERS that the React adapter
 * translates into actual React.ComponentType instances.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. ADAPTER-FRIENDLY REGISTRATION
 *      The core registry (renderer-foundation) stays framework-agnostic. This
 *      registry is the React-side translation layer: it maps a componentId to a
 *      RESOLVER that produces a React component. The resolver indirection keeps
 *      the registration decoupled from any single concrete component instance.
 *
 *   2. RESOLVER INDIRECTION
 *      A resolver is a function `() => React.ComponentType`. This allows lazy
 *      registration, code-splitting, and swapping implementations without
 *      touching the core registry.
 *
 *   3. O(1) LOOKUP
 *      Backed by a Map for O(1) componentId -> resolver lookups, consistent
 *      with the rest of the AWIE registry architecture.
 *
 *   4. NO BUSINESS LOGIC
 *      This registry contains zero business logic. It is pure infrastructure.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { ReactComponentType } from './types';

/**
 * A component resolver.
 *
 * A function that produces a React component. The resolver indirection allows
 * lazy registration and implementation swapping without coupling the registry
 * to a single concrete component instance.
 */
export type ComponentResolver = () => ReactComponentType;

/**
 * The ComponentAdapterRegistry.
 *
 * Maps a componentId to a resolver that produces a React component. The React
 * adapter resolves a componentId through this registry to obtain the actual
 * React.ComponentType to render.
 */
export interface ComponentAdapterRegistry {
  /**
   * Registers a component resolver under a componentId.
   *
   * @param componentId The implementation id (matches the ThemeEngine's
   *   componentId resolution).
   * @param resolver A function that produces the React component.
   */
  register(componentId: string, resolver: ComponentResolver): void;

  /**
   * Resolves a componentId to a React component. O(1) lookup.
   *
   * @param componentId The implementation id.
   * @returns The React component, or undefined if not registered.
   */
  resolve(componentId: string): ReactComponentType | undefined;

  /**
   * Returns whether a componentId is registered. O(1).
   *
   * @param componentId The implementation id.
   */
  has(componentId: string): boolean;
}

/**
 * Thrown when a componentId is not registered in the ComponentAdapterRegistry.
 */
export class ComponentAdapterNotFoundError extends Error {
  /** The unregistered componentId. */
  readonly componentId: string;

  constructor(componentId: string) {
    super(
      `ComponentAdapterRegistry: no component resolver registered for ` +
        `componentId "${componentId}".`,
    );
    this.name = 'ComponentAdapterNotFoundError';
    this.componentId = componentId;
  }
}

/**
 * The default in-memory ComponentAdapterRegistry.
 *
 * Backed by a Map for O(1) lookups. Registers componentId -> resolver.
 */
export class InMemoryComponentAdapterRegistry implements ComponentAdapterRegistry {
  /** The underlying Map (O(1) lookups). */
  private readonly map = new Map<string, ComponentResolver>();

  /**
   * Registers a component resolver under a componentId.
   *
   * @param componentId The implementation id.
   * @param resolver A function that produces the React component.
   */
  register(componentId: string, resolver: ComponentResolver): void {
    this.map.set(componentId, resolver);
  }

  /**
   * Resolves a componentId to a React component. O(1) lookup.
   *
   * @param componentId The implementation id.
   * @returns The React component, or undefined if not registered.
   */
  resolve(componentId: string): ReactComponentType | undefined {
    const resolver = this.map.get(componentId);
    return resolver === undefined ? undefined : resolver();
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
