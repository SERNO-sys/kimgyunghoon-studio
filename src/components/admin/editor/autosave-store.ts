/**
 * AWIE V2 - Phase 17.7: Autosave - Pending Commands Store (THIN ZUSTAND STATE).
 *
 * ADR-011C (Autosave Strategy) + CTO CORRECTION (High-Velocity Mode):
 *
 *   The "Queue" is NOT a QueueManager, QueueDispatcher, QueueWorker, or
 *   Scheduler. It is simply a Zustand state:
 *
 *     pendingCommands: EditorCommandPayload[]
 *     enqueue(command)  - append a command to the pending list.
 *     clear()           - empty the pending list (after a successful flush).
 *
 *   That is ALL. There is no queue over-engineering.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. DUMB CLIENT (ADR-011A): This store holds PENDING COMMANDS ONLY. It NEVER
 *      executes, applies, or mutates the ThemeConfig. The server performs the
 *      actual Composition.
 *
 *   2. THIN WRAP (Buy Before Build): Zustand is the WRAPPED state solution
 *      (Section 3 - State -> Zustand). We do NOT build our own state manager.
 *
 *   3. AUTOSAVE READINESS: Each command carries a stable commandId and a
 *      clientSequence (EditorCommandPayload), enabling idempotent replay and
 *      optimistic reconciliation on the server.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure pending-command buffer for the Autosave pipeline.
 */

import { create } from 'zustand';
import type { EditorCommandPayload } from '@/lib/editor-integration';

/**
 * The Autosave pending-command store state.
 *
 * `pendingCommands` is the ONLY queue. It is drained by the Autosave Mutation
 * (use-autosave.ts) after a debounce window. There is no dispatcher, worker, or
 * scheduler — just this array.
 */
interface AutosaveStoreState {
  /** The pending commands awaiting a debounced flush. */
  readonly pendingCommands: readonly EditorCommandPayload[];
  /** Append a command to the pending list. */
  readonly enqueue: (command: EditorCommandPayload) => void;
  /** Empty the pending list (called after a successful flush). */
  readonly clear: () => void;
}

/**
 * The singleton Autosave store.
 *
 * This is a module-level singleton so the EditorCommandEmitter (created in the
 * Editor Shell) and the Autosave Mutation hook share the SAME pending buffer.
 */
export const useAutosaveStore = create<AutosaveStoreState>((set) => ({
  pendingCommands: [],
  enqueue: (command) =>
    set((state) => ({ pendingCommands: [...state.pendingCommands, command] })),
  clear: () => set({ pendingCommands: [] }),
}));

/**
 * A convenience selector for the pending commands array.
 *
 * Returns a stable reference so React only re-renders when the array identity
 * changes (i.e. on enqueue/clear), not on every store update.
 */
export function selectPendingCommands(state: AutosaveStoreState): readonly EditorCommandPayload[] {
  return state.pendingCommands;
}
