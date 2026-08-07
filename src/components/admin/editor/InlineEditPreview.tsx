/**
 * AWIE V2 - Phase 17.6: Inline Editing - Editor Preview Materializer.
 *
 * ADR-011D (Editor Layout Contract) FREEZES Inline Editing as the fourth zone:
 * double-clicking a text node swaps it for an inline Lexical editor, and on
 * blur/Enter the editor closes and emits an UpdateComponentCommand.
 *
 * THIS COMPONENT IS THE EDITOR-OWNED PREVIEW MATERIALIZER. It renders the
 * RenderNode preview through the SelectionInstrumentedAdapter (the frozen,
 * thin wrapper) EXCEPT for the node currently being edited, which it swaps for
 * the isolated LexicalInlineEditor.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   - ZERO CORE IMPORTS: This is an EDITOR concern. It does NOT modify the
 *     frozen SelectionInstrumentedAdapter or the DefaultReactAdapter. It is a
 *     consumer that reuses the adapter's public surface (SelectionTarget,
 *     DATA_AWIE_ID, the component registry).
 *
 *   - AMENDMENT L (Editor Isolation): The LexicalInlineEditor is FULLY
 *     isolated. It receives ONLY a plain text seed and onSave/onCancel
 *     callbacks. It NEVER knows the Semantic Component Identity, ThemeConfig,
 *     RenderNode, or EditorCommand. THIS component (the integration layer)
 *     supplies the seed and translates the editor's text output into an AWIE
 *     command.
 *
 *   - AMENDMENT G (Semantic Component Identity): The edited node is identified
 *     ONLY by its Semantic Component Identity (`data-awie-id`). The swap is
 *     decided by comparing the node's semanticId to the editing target. It
 *     NEVER uses nodeId, DOM id, React key, RenderNode id, tree index, or
 *     runtime UUID.
 *
 *   - DUMB CLIENT: This component produces intent only. On save it calls
 *     `onSave(semanticId, value)`; the parent (EditorCanvas) generates the
 *     UpdateComponentCommand and hands it to the EditorCommandEmitter. This
 *     component NEVER mutates ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure editor preview materializer + integration boundary.
 */

'use client';

import * as React from 'react';
import type { RenderNode } from '@/lib/renderer-foundation';
import type { ReactComponentRegistry } from '@/lib/renderer-react';
import { SelectionTarget, DATA_AWIE_ID } from '@/lib/renderer-react';
import { LexicalInlineEditor } from './LexicalInlineEditor';

/**
 * The props for the editor preview materializer.
 *
 * AMENDMENT L: The LexicalInlineEditor is isolated. This component is the
 * integration boundary that supplies the text seed and translates the editor's
 * output into an AWIE command (via the parent).
 */
export interface InlineEditPreviewProps {
  /** The RenderNode tree to render. */
  readonly renderNode: RenderNode;
  /** The component registry (resolves componentId -> React component). */
  readonly registry: ReactComponentRegistry;
  /**
   * The Semantic Component Identity of the node currently being edited, or
   * null if no node is being edited (Amendment G).
   */
  readonly editingSemanticId: string | null;
  /**
   * Called when the inline editor commits. The parent generates the
   * UpdateComponentCommand and hands it to the EditorCommandEmitter.
   *
   * @param semanticId The Semantic Component Identity of the edited node.
   * @param value The new plain-text value.
   */
  readonly onSave: (semanticId: string, value: string) => void;
  /** Called when the inline editor cancels (Escape). No save occurs. */
  readonly onCancel: () => void;
}

/**
 * Reads the Semantic Component Identity from a RenderNode's metadata.
 *
 * AMENDMENT G: This is a PURE READ. It NEVER derives, reconstructs, renames, or
 * infers the identity. It only reads the value that Composition produced and
 * the Section Renderer carried.
 */
function readSemanticId(node: RenderNode): string | undefined {
  const value = node.metadata?.semanticId;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The editor preview materializer.
 *
 * Recursively materializes the RenderNode tree. For the node currently being
 * edited (matched by Semantic Component Identity), it renders the isolated
 * LexicalInlineEditor in place of the static component. All other nodes render
 * through the standard selection-instrumented path.
 *
 * AMENDMENT L: The LexicalInlineEditor receives ONLY a plain text seed and
 * onSave/onCancel. It never sees the Semantic Component Identity, ThemeConfig,
 * RenderNode, or EditorCommand.
 */
export function InlineEditPreview({
  renderNode,
  registry,
  editingSemanticId,
  onSave,
  onCancel,
}: InlineEditPreviewProps): React.ReactElement {
  return (
    <>{materialize(renderNode, registry, editingSemanticId, onSave, onCancel, '')}</>
  );
}

/**
 * Recursively materializes a single RenderNode.
 *
 * AMENDMENT G: The edited node is matched ONLY by its Semantic Component
 * Identity. The swap is decided by comparing the node's semanticId to the
 * editing target — never by nodeId, DOM id, React key, RenderNode id, tree
 * index, or runtime UUID.
 */
function materialize(
  node: RenderNode,
  registry: ReactComponentRegistry,
  editingSemanticId: string | null,
  onSave: (semanticId: string, value: string) => void,
  onCancel: () => void,
  keyPrefix: string,
): React.ReactNode {
  switch (node.type) {
    case 'text':
      return node.text;

    case 'fragment': {
      const children = node.children.map((child, index) =>
        materialize(child, registry, editingSemanticId, onSave, onCancel, `${keyPrefix}${index}-`),
      );
      return React.createElement(
        React.Fragment,
        { key: node.key ?? `${keyPrefix}fragment` },
        ...children,
      );
    }

    case 'element': {
      const semanticId = readSemanticId(node);
      const Component = registry.get(node.componentId);

      // AMENDMENT G: The edited node is matched ONLY by its Semantic Component
      // Identity. If this node is the editing target, swap it for the isolated
      // LexicalInlineEditor.
      if (semanticId !== undefined && semanticId === editingSemanticId) {
        // AMENDMENT L: The LexicalInlineEditor receives ONLY a plain text seed
        // and onSave/onCancel. It never sees the Semantic Component Identity,
        // ThemeConfig, RenderNode, or EditorCommand. THIS component supplies
        // the seed and translates the editor's text output into an AWIE command
        // (via the parent).
        const seed = extractTextSeed(node);
        return React.createElement(
          SelectionTarget,
          { key: node.key ?? `${keyPrefix}${node.componentId}`, semanticId },
          React.createElement(LexicalInlineEditor, {
            initialValue: seed,
            onSave: (value) => onSave(semanticId, value),
            onCancel,
          }),
        );
      }

      // Standard path: render the registered component (or fall back to a
      // plain element if the component is not registered).
      const children = node.children.map((child, index) =>
        materialize(child, registry, editingSemanticId, onSave, onCancel, `${keyPrefix}${index}-`),
      );

      if (Component === undefined) {
        // Fall back to a plain element (the DefaultReactAdapter's behavior for
        // unregistered components). This preserves the fail-fast spirit without
        // importing the frozen adapter.
        return React.createElement(
          SelectionTarget,
          { key: node.key ?? `${keyPrefix}${node.componentId}`, semanticId: semanticId ?? node.componentId },
          React.createElement(node.componentId, { ...node.props }, ...children),
        );
      }

      return React.createElement(
        SelectionTarget,
        { key: node.key ?? `${keyPrefix}${node.componentId}`, semanticId: semanticId ?? node.componentId },
        React.createElement(Component, { ...node.props }, ...children),
      );
    }
  }
}

/**
 * Extracts the plain-text seed for the inline editor from an element RenderNode.
 *
 * AMENDMENT L: This is a PURE READ of the node's presentation props. It
 * produces a plain string — the ONLY thing the isolated LexicalInlineEditor
 * consumes. It contains NO business logic.
 *
 * @param node The element RenderNode being edited (narrowed to the 'element'
 *   variant, which carries `props`).
 * @returns The plain-text seed (heading + body, or the first text prop).
 */
function extractTextSeed(node: Extract<RenderNode, { type: 'element' }>): string {
  const props = node.props as Record<string, unknown>;
  // Prefer heading, then body, then any string prop. This is a pure,
  // declarative read — no business logic.
  if (typeof props.heading === 'string') {
    return props.heading;
  }
  if (typeof props.body === 'string') {
    return props.body;
  }
  return '';
}


