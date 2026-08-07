/**
 * AWIE V2 - Phase 17.9: History - Keyboard Shortcuts Hook (THIN WRAP).
 *
 * ADR-016 (Workflow Constitution) + ADR-015 (History OSS Survey):
 *
 *   This hook is the ONLY place the editor binds keyboard shortcuts to the
 *   History API. It is a THIN WRAP over two OSS solutions:
 *
 *     1. `react-hotkeys-hook`  -> declarative keydown binding (mod+z / mod+shift+z)
 *     2. TanStack Query        -> the Mutation network state machine
 *
 * THE STATE RULE (ADR-016, Section 1):
 *
 *   "Derived data is not state. Do not store what can be derived."
 *
 *   `canUndo` and `canRedo` are DERIVED from the last History mutation response.
 *   They are NOT stored in a Zustand store. They are read directly from the
 *   TanStack mutation result. There is NO persistent client state here.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. DUMB CLIENT (ADR-011A): This hook POSTs a SYSTEM CONTROL operation
 *      (undo/redo) to the History API. It NEVER executes, applies, or mutates
 *      the ThemeConfig. The server performs the actual Patch application.
 *
 *   2. THIN WRAP (Buy Before Build): TanStack Query is the WRAPPED async
 *      solution (Section 3 - Async -> TanStack Query). `react-hotkeys-hook` is
 *      the WRAPPED keyboard solution (ADR-015). We do NOT build our own network
 *      state machine or keydown listener.
 *
 *   3. MUTATION ONLY: Undo/Redo are Mutations (writes), not Queries (reads).
 *      The server returns the NEW RenderNode preview; the client renders it.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure keyboard-to-mutation binding for the History step.
 */

'use client';

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useMutation } from '@tanstack/react-query';
import type { EditorHistoryResponse } from '@/lib/editor-integration';

/** The History Undo API endpoint for a project. */
function undoEndpoint(projectId: string): string {
  return `/api/cms/projects/${projectId}/history/undo`;
}

/** The History Redo API endpoint for a project. */
function redoEndpoint(projectId: string): string {
  return `/api/cms/projects/${projectId}/history/redo`;
}

/**
 * The History Keyboard Shortcuts hook.
 *
 * Binds `mod+z` (undo) and `mod+shift+z` (redo) to the History API via two
 * TanStack Mutations. It exposes:
 *
 *   - `undo`: trigger an undo (also bound to mod+z).
 *   - `redo`: trigger a redo (also bound to mod+shift+z).
 *   - `canUndo`: DERIVED from the undo mutation's last response (State Rule).
 *   - `canRedo`: DERIVED from the redo mutation's last response (State Rule).
 *   - `isUndoing` / `isRedoing`: the Mutation's built-in pending states.
 *
 * The Mutation's built-in states are the ONLY network state machine. There is
 * no custom dispatcher, worker, or scheduler.
 *
 * @param projectId The id of the project being edited.
 * @param onResult Optional callback receiving the server's EditorHistoryResult
 *   (e.g. to update the canvas preview). The client NEVER holds the ThemeConfig.
 */
export function useHistoryShortcuts(
  projectId: string,
  onResult?: (result: EditorHistoryResponse) => void,
) {
  // The Undo Mutation. This is the ONLY network state machine for undo.
  const undoMutation = useMutation<EditorHistoryResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch(undoEndpoint(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Undo failed (${response.status})`);
      }
      return (await response.json()) as EditorHistoryResponse;
    },
    onSuccess: (result) => {
      onResult?.(result);
    },
  });

  // The Redo Mutation. This is the ONLY network state machine for redo.
  const redoMutation = useMutation<EditorHistoryResponse, Error, void>({
    mutationFn: async () => {
      const response = await fetch(redoEndpoint(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Redo failed (${response.status})`);
      }
      return (await response.json()) as EditorHistoryResponse;
    },
    onSuccess: (result) => {
      onResult?.(result);
    },
  });

  // Stable trigger callbacks (no-op while a mutation is in flight to prevent
  // double-firing from a held key).
  const undo = useCallback(() => {
    if (!undoMutation.isPending) {
      undoMutation.mutate();
    }
  }, [undoMutation]);

  const redo = useCallback(() => {
    if (!redoMutation.isPending) {
      redoMutation.mutate();
    }
  }, [redoMutation]);

  // Bind the keyboard shortcuts. `mod` = Cmd on macOS, Ctrl elsewhere.
  // `preventDefault` stops the browser's native undo/redo from firing.
  useHotkeys('mod+z', undo, { preventDefault: true }, [undo]);
  useHotkeys('mod+shift+z', redo, { preventDefault: true }, [redo]);

  // THE STATE RULE (ADR-016): canUndo/canRedo are DERIVED from the mutation
  // responses. They are NOT stored. If the server has not yet responded, the
  // buttons default to disabled (false).
  const canUndo = undoMutation.data?.success === true
    ? undoMutation.data.canUndo
    : false;
  const canRedo = redoMutation.data?.success === true
    ? redoMutation.data.canRedo
    : false;

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoing: undoMutation.isPending,
    isRedoing: redoMutation.isPending,
    isError: undoMutation.isError || redoMutation.isError,
  };
}
