/**
 * AWIE V2 - Phase 17.1: Editor Shell - Dumb Client Contract.
 *
 * THE EDITOR SHELL IS A DUMB CLIENT (ADR-011A / ADR-011D).
 *
 * The Shell NEVER holds, mutates, or decides the ThemeConfig. It sends
 * Commands (EditorCommandPayload) to the Server-Side Orchestration API and
 * renders the RenderNode preview the server returns. This module defines the
 * PURE SHELL-LEVEL types that the four-zone layout consumes.
 *
 * ARCHITECTURAL MANDATES (ADR-011D, Section A):
 *
 *   1. THE FOUR-ZONE SHELL IS FIXED.
 *      Left Sidebar (Component Tree), Main Canvas (Responsive Preview &
 *      Selection Model), Right Sidebar (Property Inspector), and Inline
 *      Editing (Lexical on double-click). No alternative layout may be
 *      invented during implementation.
 *
 *   2. THE SHELL NEVER DECIDES.
 *      Every interaction that changes state is a Command. The server is the
 *      sole orchestrator. The shell only PREPARES to emit EditorCommandPayloads.
 *
 *   3. THE SHELL NEVER HOLDS THE SSOT.
 *      The ThemeConfig NEVER crosses the wire. The shell only ever sees the
 *      RenderNode preview.
 *
 * AMENDMENT G - SEMANTIC COMPONENT IDENTITY (FROZEN):
 *
 *   All editor interactions use `selectedComponentId` (the Semantic Component
 *   Identity). They NEVER use `nodeId`. The Semantic Component Identity is
 *   produced EXCLUSIVELY during Composition and carried verbatim through the
 *   RenderNode metadata. The editor is a CONSUMER ONLY.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure shell-level type modeling for the Phase 17.1 Editor Shell.
 */

import type { RenderNode } from '@/lib/renderer-foundation';
import type { EditorCommandPayload } from '@/lib/editor-integration';
import type {
  SelectionSnapshot,
  SelectionCrumb,
  SelectionGeometry,
  SelectionTreeEntry,
} from './selection-model';
import { EMPTY_SELECTION_SNAPSHOT } from './selection-model';

// ---------------------------------------------------------------------------
// Responsive Breakpoints (ADR-011D, Section A.2 - Main Canvas)
// ---------------------------------------------------------------------------

/**
 * The responsive viewport presets the Main Canvas MUST support.
 *
 * ADR-011D mandates desktop / tablet / mobile breakpoints so the user can
 * preview the site at each viewport.
 */
export type EditorViewport = 'desktop' | 'tablet' | 'mobile';

/** The pixel width of each viewport preset. */
export const EDITOR_VIEWPORT_WIDTHS: Record<EditorViewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

// ---------------------------------------------------------------------------
// Selection Model (ADR-011D, Section A.2 - bidirectional selection)
// ---------------------------------------------------------------------------

/**
 * A selected component in the Editor Shell.
 *
 * The Selection Model is bidirectional: selecting in the tree selects on the
 * canvas; selecting on the canvas selects in the tree and populates the
 * inspector. For Phase 17.1 (Shell only), the selection is a pure UI state
 * that the shell tracks; it does NOT mutate the ThemeConfig.
 *
 * AMENDMENT G: `selectedComponentId` is the Semantic Component Identity — the
 * ONLY selection identity. `renderNodeId` exists ONLY for debugging and MUST
 * NEVER become the selection identity.
 */
export interface EditorSelection {
  /** The Semantic Component Identity of the selected component (if any). */
  readonly selectedComponentId: string | null;
  /** The component id of the selected node (e.g. "hero", "text"). */
  readonly componentId: string | null;
  /** The section id the selected component belongs to (if known). */
  readonly sectionId: string | null;
  /** The stable RenderNode id (DEBUG ONLY). */
  readonly renderNodeId: string | null;
}

/** An empty selection (nothing selected). */
export const EMPTY_SELECTION: EditorSelection = {
  selectedComponentId: null,
  componentId: null,
  sectionId: null,
  renderNodeId: null,
};

// ---------------------------------------------------------------------------
// Command Emission (Dumb Client - prepare only)
// ---------------------------------------------------------------------------

/**
 * The shell's command emission contract.
 *
 * The shell NEVER executes a Command itself. It PREPARES an
 * EditorCommandPayload and hands it to the parent orchestrator (the page that
 * owns the shell), which sends it to the Server-Side Orchestration API. This
 * keeps the shell a pure Dumb Client.
 *
 * For Phase 17.1 (Shell only), this is the contract the shell exposes so that
 * future steps (Selection, Inspector, Insert, Lexical, Autosave, History) can
 * emit Commands through it. The shell itself does not yet emit any Commands.
 */
export interface EditorCommandEmitter {
  /**
   * Prepares an EditorCommandPayload for emission. The shell calls this to
   * hand a Command to the orchestrator; it never sends it directly.
   */
  readonly emit: (payload: EditorCommandPayload) => void;
}

// ---------------------------------------------------------------------------
// Canvas Zoom (Phase 17.1 UX Polish)
// ---------------------------------------------------------------------------

/**
 * The zoom levels the Main Canvas MUST support.
 *
 * ADR-011D mandates responsive preview; the Phase 17.1 UX polish adds zoom
 * controls (25% / 50% / 75% / 100% / 150% / Fit) so the user can inspect the
 * canvas at any scale. Zoom is a PURE UI state — it never affects the
 * ThemeConfig or the RenderNode preview.
 */
export type EditorZoom = 0.25 | 0.5 | 0.75 | 1 | 1.5;

/** The discrete zoom presets offered by the zoom control. */
export const EDITOR_ZOOM_LEVELS: readonly EditorZoom[] = [0.25, 0.5, 0.75, 1, 1.5];

/** The default zoom (100%). */
export const DEFAULT_ZOOM: EditorZoom = 1;

// ---------------------------------------------------------------------------
// Command Queue Status (Phase 17.1 UX Polish - Bottom Status Bar)
// ---------------------------------------------------------------------------

/**
 * The command queue indicator states shown in the Bottom Status Bar.
 *
 * The shell is a Dumb Client (ADR-011A): it never executes Commands itself. It
 * only DISPLAYS the queue status the server reports. For Phase 17.1 (Shell
 * only), the status is a pure UI state; the Autosave / History steps will drive
 * it from the server's command queue.
 */
export type CommandQueueStatus = 'saving' | 'saved' | 'offline' | 'conflict';

/** A human-readable label for each command queue status. */
export const COMMAND_QUEUE_STATUS_LABELS: Record<CommandQueueStatus, string> = {
  saving: '저장 중...',
  saved: '저장됨',
  offline: '오프라인',
  conflict: '충돌',
};

// ---------------------------------------------------------------------------
// Breadcrumb Trail (Phase 17.1 UX Polish - selection depth context)
// ---------------------------------------------------------------------------

/**
 * A single crumb in the selection breadcrumb trail.
 *
 * The breadcrumb preserves selection depth context (e.g. Page > Hero > CTA >
 * Button). Each crumb maps to a Semantic Component Identity (ADR-012) — the
 * stable, human-readable id that binds the Tree, Canvas, Inspector, ActionId,
 * and PermissionTargetId.
 */
export interface EditorBreadcrumbCrumb {
  /** The Semantic Component Identity (ADR-012), e.g. "hero.cta.button". */
  readonly semanticId: string;
  /** The human-readable label shown in the breadcrumb. */
  readonly label: string;
  /** The stable RenderNode id this crumb maps to (DEBUG ONLY). */
  readonly renderNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Selection Model Re-exports (Phase 17.2)
// ---------------------------------------------------------------------------

/**
 * The fully-resolved selection snapshot produced by the Selection Model.
 *
 * Phase 17.2 replaces the flat Phase 17.1 `EditorSelection` with the resolved
 * selection snapshot. It carries the Semantic Component Identity breadcrumb
 * path, the resolved RenderNode, and the section id. It is immutable and pure —
 * it never mutates the ThemeConfig.
 *
 * AMENDMENT G: `selectedComponentId` is the Semantic Component Identity — the
 * ONLY selection identity. `renderNodeId` exists ONLY for debugging.
 */
export type { SelectionSnapshot, SelectionCrumb, SelectionGeometry, SelectionTreeEntry };

/** An empty (nothing-selected) selection snapshot. */
export { EMPTY_SELECTION_SNAPSHOT };

// ---------------------------------------------------------------------------
// Shell Props (the four-zone contract)
// ---------------------------------------------------------------------------

/**
 * The props the Editor Shell receives.
 *
 * The shell is a pure presentation container. It receives the RenderNode
 * preview (the canonical Runtime output) and a command emitter. It NEVER
 * receives or holds the ThemeConfig.
 */
export interface EditorShellProps {
  /** The RenderNode preview to render on the Main Canvas. */
  readonly renderNode: RenderNode | null;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
  /** The id of the project being edited (for telemetry / session identity). */
  readonly projectId: string;
  /** The id of the page being edited. */
  readonly pageId: string;
  /** Optional initial viewport for the Main Canvas. */
  readonly initialViewport?: EditorViewport;
}
