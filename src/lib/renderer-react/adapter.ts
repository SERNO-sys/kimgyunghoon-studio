/**
 * AWIE V2 - React Adapter (Phase 08, Milestone 2C - DESIGN ONLY).
 *
 * The React Adapter materializes a framework-agnostic RenderNode tree into a
 * React element tree.
 *
 * THE PIPELINE:
 *
 *   ThemeEngine -> RenderNode -> ReactAdapter -> React UI
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO HTML TAG ASSUMPTIONS
 *      A componentId is NEVER assumed to be a primitive HTML tag. Every
 *      componentId MUST be resolved through the ReactComponentRegistry to an
 *      actual React component. If a componentId is not registered, the adapter
 *      throws a ReactComponentNotFoundError — it NEVER falls back to rendering
 *      a raw HTML tag.
 *
 *   2. REGISTRY-DRIVEN RESOLUTION
 *      The adapter resolves componentId -> React.ComponentType via the
 *      ReactComponentRegistry BEFORE rendering.
 *
 *   3. SEPARATION OF CONCERNS
 *      The adapter contains ZERO business logic and ZERO ThemeConfig
 *      interpretation. It ONLY walks the RenderNode tree and materializes it.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import * as React from 'react';
import type { RenderNode } from '../renderer-foundation';
import type { ReactAdapter, ReactComponentRegistry, ReactRenderOptions } from './types';
import { InMemoryReactComponentRegistry, ReactComponentNotFoundError } from './registry';

/**
 * The default React Adapter.
 *
 * Walks a RenderNode tree and materializes it into React elements:
 *
 *   - "element"  -> resolves componentId via the ReactComponentRegistry and
 *                   creates a React element with the resolved component.
 *   - "text"     -> returns the raw text string.
 *   - "fragment" -> returns a React.Fragment wrapping the materialized children.
 *
 * The adapter NEVER assumes a componentId is an HTML tag. Unregistered
 * componentIds fail fast with a ReactComponentNotFoundError.
 */
export class DefaultReactAdapter implements ReactAdapter {
  /** The default ReactComponentRegistry (used when none is passed via options). */
  private readonly defaultRegistry: ReactComponentRegistry;

  constructor(registry?: ReactComponentRegistry) {
    this.defaultRegistry = registry ?? new InMemoryReactComponentRegistry();
  }

  /**
   * Materializes a RenderNode tree into a React element tree.
   *
   * @param node The framework-agnostic RenderNode tree.
   * @param options Optional render options.
   * @returns The React element tree.
   */
  render(node: RenderNode, options?: ReactRenderOptions): React.ReactNode {
    const registry = options?.registry ?? this.defaultRegistry;
    return this.materialize(node, registry, options?.keyPrefix ?? '');
  }

  /**
   * Recursively materializes a single RenderNode.
   */
  private materialize(
    node: RenderNode,
    registry: ReactComponentRegistry,
    keyPrefix: string,
  ): React.ReactNode {
    switch (node.type) {
      case 'text':
        return node.text;

      case 'fragment': {
        const children = node.children.map((child, index) =>
          this.materialize(child, registry, `${keyPrefix}${index}-`),
        );
        return React.createElement(
          React.Fragment,
          { key: node.key ?? `${keyPrefix}fragment` },
          ...children,
        );
      }

      case 'element': {
        // Resolve the componentId through the registry. NEVER assume it is an
        // HTML tag. Fail fast if it is not registered.
        const Component = registry.get(node.componentId);
        if (Component === undefined) {
          throw new ReactComponentNotFoundError(node.componentId);
        }

        const children = node.children.map((child, index) =>
          this.materialize(child, registry, `${keyPrefix}${index}-`),
        );

        return React.createElement(
          Component,
          { ...node.props, key: node.key ?? `${keyPrefix}${node.componentId}` },
          ...children,
        );
      }
    }
  }
}
