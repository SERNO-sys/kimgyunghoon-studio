/**
 * AWIE V2 - Phase 17.2: Selection Model.
 *
 * ADR-011D, Section A.2 (Zone 2) + Section B.5: The bidirectional Selection
 * Model is AWIE-owned BUILD (core IP). It synchronizes the tree, canvas, and
 * inspector around a single selected component.
 *
 * THE SELECTION MODEL IS A DUMB CLIENT MODEL:
 *
 *   - It NEVER holds, mutates, or decides the ThemeConfig.
 *   - It consumes the RenderNode preview the server returns (the canonical
 *     Runtime output) and resolves a selection against it.
 *   - It is a PURE, framework-agnostic model: it contains no React, no DOM,
 *     and no business logic. It only walks the RenderNode tree.
 *
 * AMENDMENT G - SEMANTIC COMPONENT IDENTITY (FROZEN):
 *
 *   The Semantic Component Identity is produced EXCLUSIVELY during Composition
 *   and already exists in the immutable ThemeConfig. It is carried verbatim
 *   into `RenderNode.metadata.semanticId` by the Section Renderer (the
 *   Carrier). The Selection Model is a PURE RESOLVER:
 *
 *     - Selection is resolved ONLY by Semantic Component Identity
 *       (`metadata.semanticId`).
 *     - It NEVER resolves by nodeId, RenderNode id, DOM id, tree index, or
 *       runtime UUID.
 *     - `renderNodeId` exists ONLY for debugging. It MUST NEVER become the
 *       selection identity.
 *
 * WHAT THE MODEL OWNS (ADR-011D, Section B.5):
 *
 *   1. COMPONENT RESOLUTION
 *      Given a selected Semantic Component Identity, resolve the RenderNode and
 *      its full ancestor path within the RenderNode tree.
 *
 *   2. SEMANTIC COMPONENT IDENTITY (ADR-012)
 *      The stable, human-readable identity (e.g. "hero", "pricing.card.buy")
 *      that binds the Tree, Canvas, Inspector, ActionId, and PermissionTargetId.
 *      Each crumb maps to a Semantic Component Identity.
 *
 *   3. SECTION RESOLUTION
 *      Resolve the sectionId the selected component belongs to (the nearest
 *      ancestor element that is a top-level section).
 *
 *   4. BIDIRECTIONAL SYNC
 *      The model exposes a single `select(semanticId)` entry point. Both the
 *      tree and the canvas call it; the model resolves the same selection state
 *      regardless of the source. This is the bidirectional contract.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure selection modeling for the Editor Shell.
 */

import type { RenderNode } from '@/lib/renderer-foundation';

// ---------------------------------------------------------------------------
// Semantic Component Identity (ADR-012 / Amendment G)
// ---------------------------------------------------------------------------

/**
 * The metadata key that carries the Semantic Component Identity on a RenderNode.
 *
 * This identity is produced EXCLUSIVELY during Composition and carried verbatim
 * by the Section Renderer. The Selection Model reads it as a PURE RESOLVER.
 */
export const SEMANTIC_ID_METADATA_KEY = 'semanticId';

/**
 * A single crumb in the selection's Semantic Component Identity path.
 *
 * Each crumb maps to a Semantic Component Identity (ADR-012) — the stable,
 * human-readable id that binds the Tree, Canvas, Inspector, ActionId, and
 * PermissionTargetId. The full path (e.g. Page > Hero > CTA > Button) is the
 * selection's depth context.
 */
export interface SelectionCrumb {
  /** The Semantic Component Identity segment, e.g. "hero", "cta", "button". */
  readonly semanticId: string;
  /** The human-readable label shown in the breadcrumb / tree. */
  readonly label: string;
  /** The stable RenderNode id this crumb maps to (DEBUG ONLY). */
  readonly renderNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Selection Snapshot (ADR-011D, Section B.5 / Amendment G)
// ---------------------------------------------------------------------------

/**
 * The Selection Snapshot.
 *
 * Selection is exposed ONLY through this snapshot. UI components (Canvas, Tree,
 * Inspector, TopBar) consume snapshots only — they NEVER share component
 * objects.
 *
 * AMENDMENT G: `selectedComponentId` is the Semantic Component Identity (the
 * ONLY selection identity). `renderNodeId` exists ONLY for debugging and MUST
 * NEVER become the selection identity.
 */
export interface SelectionSnapshot {
  /** The Semantic Component Identity of the selected component (null when
   *  nothing is selected). This is the ONLY selection identity. */
  readonly selectedComponentId: string | null;
  /** The full Semantic Component Identity path (Page > Hero > CTA > Button). */
  readonly breadcrumb: readonly SelectionCrumb[];
  /** The section id the selected component belongs to (nearest top-level
   *  section). */
  readonly sectionId: string | null;
  /** The stable RenderNode id of the selected node. DEBUG ONLY — it MUST NEVER
   *  become the selection identity. */
  readonly renderNodeId: string | null;
  /** The resolved RenderNode (null when nothing is selected). */
  readonly node: RenderNode | null;
  /** Whether the selection is empty. */
  readonly isEmpty: boolean;
}

/** An empty (nothing-selected) selection snapshot. */
export const EMPTY_SELECTION_SNAPSHOT: SelectionSnapshot = {
  selectedComponentId: null,
  breadcrumb: [],
  sectionId: null,
  renderNodeId: null,
  node: null,
  isEmpty: true,
};

// ---------------------------------------------------------------------------
// Tree Entry (for the Left Sidebar Component Tree)
// ---------------------------------------------------------------------------

/**
 * A single entry in the flattened Component Tree.
 *
 * The Left Sidebar renders the RenderNode hierarchy as a navigable tree. Each
 * entry maps to a RenderNode and carries its depth for indentation.
 */
export interface SelectionTreeEntry {
  /** The Semantic Component Identity of this entry (the selection identity). */
  readonly semanticId: string;
  /** The component id (for element nodes) or node type (for text/fragment). */
  readonly componentId: string;
  /** The depth in the tree (0 = root). */
  readonly depth: number;
  /** The human-readable label. */
  readonly label: string;
  /** The stable RenderNode id (DEBUG ONLY). */
  readonly renderNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Selection Geometry (for the Canvas Overlay)
// ---------------------------------------------------------------------------

/**
 * The bounding-box geometry of the selected component on the canvas.
 *
 * The Selection Overlay Layer (ADR-011D, Section A.2) draws the selected
 * component's bounding box HERE — never on the component's own CSS/border. The
 * geometry is computed by the canvas from the selected component's DOM element
 * (getBoundingClientRect) and passed to the overlay.
 */
export interface SelectionGeometry {
  /** The top offset (px), relative to the canvas preview container. */
  readonly top: number;
  /** The left offset (px), relative to the canvas preview container. */
  readonly left: number;
  /** The width (px). */
  readonly width: number;
  /** The height (px). */
  readonly height: number;
}

// ---------------------------------------------------------------------------
// Pure tree-walking helpers
// ---------------------------------------------------------------------------

/**
 * Reads the Semantic Component Identity from a RenderNode's metadata.
 *
 * AMENDMENT G: This is a PURE READ. The model NEVER derives, reconstructs,
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
 * Recursively finds a RenderNode by Semantic Component Identity and returns it
 * along with its ancestor path (root-first).
 *
 * AMENDMENT G: The search key is the Semantic Component Identity ONLY. It never
 * searches by nodeId, RenderNode id, DOM id, tree index, or runtime UUID.
 *
 * @param node The current node.
 * @param targetSemanticId The Semantic Component Identity to find.
 * @param ancestors The ancestor path accumulated so far (root-first).
 * @returns The found node + ancestor path, or null.
 */
function findNodeWithPath(
  node: RenderNode,
  targetSemanticId: string,
  ancestors: RenderNode[],
): { node: RenderNode; path: RenderNode[] } | null {
  const semanticId = readSemanticId(node);
  if (semanticId === targetSemanticId) {
    return { node, path: [...ancestors, node] };
  }

  if (node.type === 'element' || node.type === 'fragment') {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const result = findNodeWithPath(child, targetSemanticId, [...ancestors, node]);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Returns the human-readable label for a RenderNode.
 *
 * Element nodes are labeled by their componentId; text nodes by "텍스트";
 * fragment nodes by "그룹".
 */
function nodeLabel(node: RenderNode): string {
  switch (node.type) {
    case 'element':
      return node.componentId;
    case 'text':
      return '텍스트';
    case 'fragment':
      return '그룹';
  }
}

/**
 * Determines whether a RenderNode is a top-level section.
 *
 * A top-level section is an element node whose parent is the root (i.e. it is
 * a direct child of the page root). The sectionId of a selected component is
 * the nearest top-level section ancestor.
 */
function isTopLevelSection(node: RenderNode, path: RenderNode[]): boolean {
  // A top-level section is an element whose parent is the root. In the path,
  // the root is path[0]; a top-level section is path[1] (if it is an element).
  if (path.length < 2) {
    return false;
  }
  return node.type === 'element';
}

/**
 * Resolves the sectionId for a selected component.
 *
 * Walks the ancestor path (root-first) and returns the Semantic Component
 * Identity of the nearest top-level section ancestor (the first element node
 * that is a direct child of the root). Falls back to the root node's Semantic
 * Component Identity if no section is found.
 */
function resolveSectionId(path: RenderNode[]): string | null {
  // The root is path[0]. A top-level section is a direct child of the root
  // (path[1]) that is an element node.
  for (let i = 1; i < path.length; i++) {
    const node = path[i];
    if (node.type === 'element') {
      return readSemanticId(node) ?? null;
    }
  }
  // Fall back to the root node's Semantic Component Identity.
  if (path.length > 0) {
    return readSemanticId(path[0]) ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The Selection Model
// ---------------------------------------------------------------------------

/**
 * The Selection Model.
 *
 * A pure, framework-agnostic model that resolves a selected Semantic Component
 * Identity against a RenderNode tree. It is the single source of truth for the
 * bidirectional selection contract (ADR-011D, Section A.4 rule 2): both the
 * tree and the canvas call `select(semanticId)`, and the model produces the
 * same resolved selection regardless of the source.
 *
 * AMENDMENT G: Selection is resolved ONLY by Semantic Component Identity. The
 * model NEVER resolves by nodeId, RenderNode id, DOM id, tree index, or runtime
 * UUID. `renderNodeId` is exposed ONLY for debugging.
 *
 * The model is stateless and immutable: it takes a RenderNode tree and a
 * Semantic Component Identity and returns a SelectionSnapshot. It never mutates
 * the ThemeConfig and never holds the ThemeConfig.
 */
export class SelectionModel {
  /**
   * Resolves a selection against a RenderNode tree.
   *
   * @param renderNode The RenderNode preview (the canonical Runtime output).
   * @param selectedComponentId The Semantic Component Identity of the selected
   *   component (null to clear the selection).
   * @returns The fully-resolved SelectionSnapshot.
   */
  static resolve(
    renderNode: RenderNode | null,
    selectedComponentId: string | null,
  ): SelectionSnapshot {
    if (!renderNode || !selectedComponentId) {
      return EMPTY_SELECTION_SNAPSHOT;
    }

    const found = findNodeWithPath(renderNode, selectedComponentId, []);
    if (!found) {
      return EMPTY_SELECTION_SNAPSHOT;
    }

    const { node, path } = found;
    const componentId = node.type === 'element' ? node.componentId : node.type;
    const sectionId = resolveSectionId(path);

    // Build the Semantic Component Identity breadcrumb path (root-first).
    const breadcrumb: SelectionCrumb[] = path.map((ancestor) => ({
      semanticId: readSemanticId(ancestor) ?? nodeLabel(ancestor),
      label: nodeLabel(ancestor),
      renderNodeId: ancestor.id ?? null,
    }));

    return {
      selectedComponentId,
      breadcrumb,
      sectionId,
      renderNodeId: node.id ?? null,
      node,
      isEmpty: false,
    };
  }

  /**
   * Flattens a RenderNode tree into a displayable Component Tree entry list.
   *
   * This is a PURE presentation transform used by the Left Sidebar. It reads
   * the RenderNode (the server's output) and produces a flat list of tree
   * entries. It never reads or mutates the ThemeConfig.
   *
   * @param renderNode The RenderNode preview.
   * @returns The flattened tree entries.
   */
  static flattenTree(renderNode: RenderNode | null): readonly SelectionTreeEntry[] {
    if (!renderNode) {
      return [];
    }
    const acc: SelectionTreeEntry[] = [];
    const walk = (node: RenderNode, depth: number): void => {
      acc.push({
        semanticId: readSemanticId(node) ?? nodeLabel(node),
        componentId: node.type === 'element' ? node.componentId : node.type,
        depth,
        label: nodeLabel(node),
        renderNodeId: node.id ?? null,
      });
      if (node.type === 'element' || node.type === 'fragment') {
        for (let i = 0; i < node.children.length; i++) {
          walk(node.children[i], depth + 1);
        }
      }
    };
    walk(renderNode, 0);
    return acc;
  }
}
