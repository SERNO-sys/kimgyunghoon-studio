/**
 * AWIE V2 - Phase 18.1: Selection Event Bus (BUILD - AWIE core IP).
 *
 * Section 13 (Selection Events) - FROZEN:
 *
 *   SelectionChanged
 *   SelectionCleared
 *   SelectionHovered
 *   SelectionFocused
 *
 *   "UI components never manipulate each other directly. Everything flows
 *    through events."
 *
 * THIS MODULE IS THE EVENT BUS that replaces the Phase 17.2 prop-drilling
 * selection flow. It is a THIN ZUSTAND WRAP (Buy Before Build - Section 3:
 * State -> Zustand). It is the SINGLE source of truth for the bidirectional
 * selection contract: Canvas, Tree, Inspector, and TopBar all publish and
 * subscribe through this bus. No UI component manipulates another directly.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SEMANTIC COMPONENT IDENTITY ONLY (Amendment G / ADR-012):
 *      The bus carries ONLY the Semantic Component Identity (`semanticId`).
 *      It NEVER carries a nodeId, RenderNode id, DOM id, React key, tree index,
 *      or runtime UUID. It NEVER carries a component object, RenderNode, or
 *      ThemeConfig.
 *
 *   2. DUMB CLIENT (ADR-011A):
 *      The bus holds ONLY pure UI state (`selectedComponentId`). It NEVER
 *      holds, mutates, or decides the ThemeConfig. The server is the sole
 *      orchestrator of Composition.
 *
 *   3. SELECTION SNAPSHOT ONLY (Section 11):
 *      The bus exposes the selected Semantic Component Identity. The resolved
 *      SelectionSnapshot is DERIVED by the Selection Model (selection-model.ts)
 *      from the RenderNode preview + this identity. The bus never shares
 *      component objects.
 *
 *   4. THIN WRAP (Buy Before Build):
 *      Zustand is the WRAPPED state solution. We do NOT build our own event
 *      emitter. The store's `set`/`get` IS the publish/subscribe mechanism.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure selection event bus for the Editor Shell.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Selection Events (Section 13, FROZEN)
// ---------------------------------------------------------------------------

/**
 * A Selection Event (Section 13).
 *
 * Each event carries ONLY the Semantic Component Identity (`semanticId`) of the
 * affected component — the ONLY selection identity (Amendment G / ADR-012). It
 * NEVER carries a nodeId, RenderNode id, DOM id, React key, tree index, or
 * runtime UUID, and NEVER carries a component object or ThemeConfig.
 */
export type SelectionEvent =
  | { readonly type: 'SelectionChanged'; readonly semanticId: string | null }
  | { readonly type: 'SelectionCleared' }
  | { readonly type: 'SelectionHovered'; readonly semanticId: string | null }
  | { readonly type: 'SelectionFocused'; readonly semanticId: string | null };

// ---------------------------------------------------------------------------
// The Selection Event Bus (Zustand WRAP)
// ---------------------------------------------------------------------------

/**
 * The Selection Event Bus store state.
 *
 * `selectedComponentId` is the ONLY persistent selection state (pure UI state).
 * It is the Semantic Component Identity of the currently selected component, or
 * null when nothing is selected. The bus NEVER holds the ThemeConfig.
 */
interface SelectionEventBusState {
  /** The Semantic Component Identity of the selected component (null = none). */
  readonly selectedComponentId: string | null;
  /** The Semantic Component Identity of the hovered component (null = none). */
  readonly hoveredComponentId: string | null;
  /** The Semantic Component Identity of the focused (inline-editing) component. */
  readonly focusedComponentId: string | null;
  /** Publish a SelectionChanged event (select a component). */
  readonly select: (semanticId: string | null) => void;
  /** Publish a SelectionCleared event (clear the selection). */
  readonly clear: () => void;
  /** Publish a SelectionHovered event (hover a component). */
  readonly hover: (semanticId: string | null) => void;
  /** Publish a SelectionFocused event (focus a component for inline editing). */
  readonly focus: (semanticId: string | null) => void;
}

/**
 * The singleton Selection Event Bus.
 *
 * This is a module-level singleton so the Canvas, Tree, Inspector, and TopBar
 * share the SAME bus. Each action publishes the corresponding Selection Event
 * (Section 13). The bus carries ONLY Semantic Component Identities.
 */
export const useSelectionEventBus = create<SelectionEventBusState>((set) => ({
  selectedComponentId: null,
  hoveredComponentId: null,
  focusedComponentId: null,

  // SelectionChanged: select a component by its Semantic Component Identity.
  select: (semanticId) => set({ selectedComponentId: semanticId }),

  // SelectionCleared: clear the selection.
  clear: () => set({ selectedComponentId: null }),

  // SelectionHovered: hover a component (drives the hover overlay).
  hover: (semanticId) => set({ hoveredComponentId: semanticId }),

  // SelectionFocused: focus a component for inline editing.
  focus: (semanticId) => set({ focusedComponentId: semanticId }),
}));

// ---------------------------------------------------------------------------
// Convenience selectors (stable references for React re-render control)
// ---------------------------------------------------------------------------

/**
 * Selects the selected Semantic Component Identity.
 *
 * Returns a primitive so React only re-renders when the identity changes.
 */
export function selectSelectedComponentId(state: SelectionEventBusState): string | null {
  return state.selectedComponentId;
}

/**
 * Selects the hovered Semantic Component Identity.
 */
export function selectHoveredComponentId(state: SelectionEventBusState): string | null {
  return state.hoveredComponentId;
}

/**
 * Selects the focused (inline-editing) Semantic Component Identity.
 */
export function selectFocusedComponentId(state: SelectionEventBusState): string | null {
  return state.focusedComponentId;
}
