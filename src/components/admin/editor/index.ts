/**
 * AWIE V2 - Phase 17.2: Editor Shell - barrel export.
 *
 * Exposes the four-zone Editor Shell and its Dumb Client contract types.
 *
 * AMENDMENT G: Selection is exposed ONLY through the SelectionSnapshot. The
 * Semantic Component Identity (`selectedComponentId`) is the ONLY selection
 * identity. `renderNodeId` exists ONLY for debugging.
 */

export { EditorShell } from './EditorShell';
export { EditorTopBar } from './EditorTopBar';
export { EditorLeftSidebar } from './EditorLeftSidebar';
export { EditorCanvas } from './EditorCanvas';
export { EditorRightSidebar } from './EditorRightSidebar';

export {
  EDITOR_VIEWPORT_WIDTHS,
  EDITOR_ZOOM_LEVELS,
  DEFAULT_ZOOM,
  COMMAND_QUEUE_STATUS_LABELS,
  EMPTY_SELECTION,
  EMPTY_SELECTION_SNAPSHOT,
  type EditorViewport,
  type EditorSelection,
  type EditorCommandEmitter,
  type EditorShellProps,
  type EditorZoom,
  type CommandQueueStatus,
  type EditorBreadcrumbCrumb,
  type SelectionSnapshot,
  type SelectionCrumb,
  type SelectionGeometry,
  type SelectionTreeEntry,
} from './types';

// Phase 17.2 - Selection Model (AWIE-owned BUILD, ADR-011D Section B.5).
export { SelectionModel } from './selection-model';

// Phase 17.7 - Component Deletion (ADR-011D + Amendment G).
//
//   The client-side command generator translates a user's intent to delete a
//   component into a DeleteComponentCommand (an EditorCommandPayload). It binds
//   to the Semantic Component Identity — the ONLY identity. The Command is
//   handed to the EditorCommandEmitter (Dumb Client); the server performs the
//   actual Composition.
export {
  generateDeleteComponentCommand,
  DELETE_COMPONENT_COMMAND_TYPE,
} from './delete-component';


// Phase 17.7 - Autosave (ADR-011C + CTO CORRECTION).
//
//   The Autosave pipeline is a THIN WRAP over Zustand (pending-command buffer)
//   and TanStack Mutation (debounced flush). There is NO custom queue manager,
//   dispatcher, worker, or scheduler. The Mutation's built-in states drive the
//   Bottom Status Bar directly.
export { useAutosaveStore, selectPendingCommands } from './autosave-store';
export { useAutosave, AUTOSAVE_DEBOUNCE_MS } from './use-autosave';


