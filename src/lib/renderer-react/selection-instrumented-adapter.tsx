/**
 * AWIE V2 - Phase 17.2: Selection-Instrumented React Adapter.
 *
 * ADR-011D, Section A.2 (Zone 2): The Main Canvas implements the Selection
 * Model — clicking an element selects it. To resolve which component was
 * clicked, the rendered DOM must carry the component's Semantic Component
 * Identity.
 *
 * THIS ADAPTER IS THE BRIDGE between the framework adapter and the Selection
 * Model:
 *
 *   - It WRAPS the DefaultReactAdapter (the pure framework materializer).
 *   - It injects `data-awie-id` onto every rendered element node via a
 *     `SelectionTarget` wrapper. The canvas click handler reads this attribute
 *     to resolve the selected component (ADR-011D, Section A.2).
 *   - It is a THIN WRAPPER (Constitutional Rule): it adds NO business logic and
 *     NO ThemeConfig interpretation. It only decorates the materialized React
 *     elements with the Semantic Component Identity it was given.
 *
 * AMENDMENT G - SEMANTIC COMPONENT IDENTITY PROPAGATOR (FROZEN):
 *
 *   The Semantic Component Identity is produced EXCLUSIVELY during Composition
 *   and already exists in the immutable ThemeConfig. It is carried verbatim
 *   into `RenderNode.metadata.semanticId` by the Section Renderer (the
 *   Carrier). This adapter is a PURE PROPAGATOR:
 *
 *     - It READS `RenderNode.metadata.semanticId`.
 *     - It injects ONLY `data-awie-id={semanticId}`.
 *     - It NEVER derives, reconstructs, renames, concatenates, or infers a
 *       Semantic Component Identity from RenderNode hierarchy, parent/child
 *       relationships, DOM structure, React keys, or runtime UUIDs.
 *
 *   FORBIDDEN ATTRIBUTES (removed): `data-node-id` and `data-component-id`.
 *   The DOM is an implementation detail and MUST NEVER become architecture.
 *
 *   FAIL-FAST (Constitutional Test): If `RenderNode.metadata.semanticId` is
 *   missing, the adapter MUST fail fast (development assertion / explicit
 *   error). It MUST NEVER generate a fallback id, use nodeId, use DOM id, use
 *   React key, or reconstruct an identity. No fallback identity generation is
 *   permitted.
 *
 * WHY A WRAPPER (NOT A CORE CHANGE):
 *
 *   - The DefaultReactAdapter is frozen infrastructure. It must remain pure and
 *     framework-agnostic. Selection instrumentation is an EDITOR concern, not a
 *     rendering concern.
 *   - The wrapper keeps the core adapter untouched (Zero Core Imports /
 *     Replaceability). Swapping the framework adapter requires changing only
 *     this wrapper.
 *
 * LAYOUT PRESERVATION:
 *
 *   - The `SelectionTarget` wrapper uses `display: contents`, which removes the
 *     wrapper's own box from the layout while its children participate in the
 *     parent's layout. This guarantees the rendered Theme is pixel-identical to
 *     the non-instrumented render.
 *   - Because the wrapper has no box of its own, the canvas computes the
 *     selection overlay geometry from the wrapper's FIRST ELEMENT CHILD (the
 *     actual rendered component root), which has a real bounding box.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure selection instrumentation for the Editor Shell.
 */

import * as React from 'react';
import type { RenderNode } from '../renderer-foundation';
import type { ReactAdapter, ReactComponentRegistry, ReactRenderOptions } from './types';
import { DefaultReactAdapter } from './adapter';

/**
 * The data attribute that carries a component's Semantic Component Identity on
 * the rendered DOM.
 *
 * The canvas click handler reads this to resolve the selected component. This
 * is the ONLY selection identity attribute permitted on the DOM (ADR-012 /
 * Amendment G). `data-node-id` and `data-component-id` are FORBIDDEN.
 */
export const DATA_AWIE_ID = 'data-awie-id';

/**
 * The CSS class applied to every selection target wrapper.
 *
 * The canvas uses this to locate selection targets and compute overlay
 * geometry.
 */
export const SELECTION_TARGET_CLASS = 'awie-selection-target';

/**
 * The metadata key that carries the Semantic Component Identity on a
 * RenderNode.
 *
 * This identity is produced EXCLUSIVELY during Composition and carried verbatim
 * by the Section Renderer. The adapter reads it and propagates it to the DOM.
 */
export const SEMANTIC_ID_METADATA_KEY = 'semanticId';

/**
 * Reads the Semantic Component Identity from a RenderNode's metadata.
 *
 * AMENDMENT G: This is a PURE READ. The adapter NEVER derives, reconstructs,
 * renames, or infers the identity. It only reads the value that Composition
 * already produced and the Section Renderer already carried.
 *
 * @param node The RenderNode.
 * @returns The Semantic Component Identity, or undefined if absent.
 */
function readSemanticId(node: RenderNode): string | undefined {
  const value = node.metadata?.[SEMANTIC_ID_METADATA_KEY];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The SelectionTarget wrapper.
 *
 * A `display: contents` div that carries the component's Semantic Component
 * Identity (`data-awie-id`) without affecting layout. Clicking any descendant
 * resolves to this wrapper via `closest('[data-awie-id]')`.
 */
export function SelectionTarget({
  semanticId,
  children,
}: {
  /** The Semantic Component Identity (produced by Composition, carried by the
   *  Section Renderer, propagated here). */
  readonly semanticId: string;
  /** The rendered children (the actual component). */
  readonly children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      data-awie-id={semanticId}
      className={SELECTION_TARGET_CLASS}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  );
}

/**
 * The Selection-Instrumented React Adapter.
 *
 * Wraps a DefaultReactAdapter and injects `data-awie-id` onto every rendered
 * element node via a `SelectionTarget` wrapper. It is a THIN WRAPPER: it adds
 * no business logic and no ThemeConfig interpretation.
 *
 * AMENDMENT G: It is a PURE PROPAGATOR of the Semantic Component Identity. It
 * reads `RenderNode.metadata.semanticId` and injects ONLY `data-awie-id`. If
 * the identity is missing, it FAILS FAST — it never generates a fallback.
 */
export class SelectionInstrumentedAdapter implements ReactAdapter {
  /** The wrapped pure adapter. */
  private readonly inner: ReactAdapter;

  constructor(inner?: ReactAdapter) {
    this.inner = inner ?? new DefaultReactAdapter();
  }

  /**
   * Materializes a RenderNode tree into a React element tree, decorating every
   * element node with its Semantic Component Identity.
   *
   * @param node The framework-agnostic RenderNode tree.
   * @param options Optional render options.
   * @returns The React element tree with `data-awie-id` attributes.
   */
  render(node: RenderNode, options?: ReactRenderOptions): React.ReactNode {
    return this.materialize(node, options?.registry, options?.keyPrefix ?? '');
  }

  /**
   * Recursively materializes a single RenderNode, decorating element nodes with
   * their Semantic Component Identity.
   */
  private materialize(
    node: RenderNode,
    registry: ReactComponentRegistry | undefined,
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
        const children = node.children.map((child, index) =>
          this.materialize(child, registry, `${keyPrefix}${index}-`),
        );

        // Resolve the component through the registry (fail fast if missing).
        const Component = registry?.get(node.componentId);
        if (Component === undefined) {
          // Fall back to the inner adapter's resolution by delegating to it.
          // This preserves the fail-fast behavior of the DefaultReactAdapter.
          return this.inner.render(node, { registry, keyPrefix });
        }

        // AMENDMENT G - FAIL-FAST CONSTITUTIONAL TEST:
        //
        // The Semantic Component Identity MUST already exist on the RenderNode
        // (produced by Composition, carried by the Section Renderer). If it is
        // missing, the adapter MUST fail fast. It MUST NEVER generate a
        // fallback id, use nodeId, use DOM id, use React key, or reconstruct an
        // identity. No fallback identity generation is permitted.
        const semanticId = readSemanticId(node);
        if (semanticId === undefined) {
          throw new Error(
            `[AWIE Constitution] SelectionInstrumentedAdapter: RenderNode for component ` +
              `"${node.componentId}" is missing metadata.semanticId. The Semantic Component ` +
              `Identity is produced ONLY during Composition and MUST be carried verbatim by the ` +
              `Section Renderer. The adapter is a pure propagator and MUST NOT generate a ` +
              `fallback identity.`,
          );
        }

        return React.createElement(
          SelectionTarget,
          { key: node.key ?? `${keyPrefix}${node.componentId}`, semanticId },
          React.createElement(Component, { ...node.props }, ...children),
        );
      }
    }
  }
}
