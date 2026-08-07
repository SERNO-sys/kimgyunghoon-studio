/**
 * AWIE V2 - Phase 17.7: Autosave - TanStack Mutation Hook (THIN WRAP).
 *
 * ADR-011C (Autosave Strategy) + CTO CORRECTION (High-Velocity Mode):
 *
 *   Autosave Network Flow (Mutation Only): Do NOT build custom network state
 *   machines. Use TanStack Mutation.
 *
 *     enqueue -> debounce (1000ms) -> mutation.mutate(pendingCommands)
 *       -> Success -> clear()
 *
 *   The Mutation's built-in states (isPending, isError, etc.) are wired
 *   DIRECTLY to the Bottom Status Bar (Saving..., Saved, Offline).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. DUMB CLIENT (ADR-011A): This hook sends PENDING COMMANDS to the
 *      Server-Side Orchestration API. It NEVER executes, applies, or mutates
 *      the ThemeConfig. The server performs the actual Composition.
 *
 *   2. THIN WRAP (Buy Before Build): TanStack Query is the WRAPPED async
 *      solution (Section 3 - Async -> TanStack Query). We do NOT build our own
 *      network state machine.
 *
 *   3. MUTATION ONLY: This is a Mutation (write), not a Query (read). The
 *      server returns the NEW RenderNode preview; the client renders it.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure debounced flush pipeline for the Autosave step.
 */

'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import type { EditorCommandPayload, EditorCommandResponse } from '@/lib/editor-integration';
import { useAutosaveStore, selectPendingCommands } from './autosave-store';
import type { CommandQueueStatus } from './types';

/** The debounce window (ms) before a pending batch is flushed. */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

/**
 * The Server-Side Orchestration API endpoint for a project's commands.
 *
 * The Dumb Client POSTs a batch of pending commands here. The server executes
 * them (Application Layer), applies the resulting patches to produce a NEW
 * ThemeConfig, and returns the NEW RenderNode preview (Runtime Layer).
 */
function commandsEndpoint(projectId: string): string {
  return `/api/cms/projects/${projectId}/commands`;
}

/**
 * The Autosave Mutation hook.
 *
 * Implements the CTO-approved simplified pipeline:
 *
 *   enqueue -> debounce (1000ms) -> mutation.mutate(pendingCommands)
 *     -> Success -> clear()
 *
 * It exposes:
 *   - `status`: the derived CommandQueueStatus ('saving' | 'saved' | 'offline')
 *     wired directly from the Mutation's built-in states.
 *   - `flushNow`: force an immediate flush (e.g. on unmount / before publish).
 *   - `pendingCount`: the number of commands awaiting a debounced flush.
 *
 * The Mutation's built-in states are the ONLY network state machine. There is
 * no custom dispatcher, worker, or scheduler.
 */
export function useAutosave(projectId: string) {
  const pendingCommands = useAutosaveStore(selectPendingCommands);
  const clear = useAutosaveStore((state) => state.clear);

  // The debounce timer ref. Cleared on unmount to avoid a flush after teardown.
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // The TanStack Mutation. This is the ONLY network state machine.
  const mutation = useMutation<EditorCommandResponse, Error, readonly EditorCommandPayload[]>({
    mutationFn: async (commands) => {
      const response = await fetch(commandsEndpoint(projectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commands),
      });
      if (!response.ok) {
        throw new Error(`Autosave failed (${response.status})`);
      }
      return (await response.json()) as EditorCommandResponse;
    },
    onSuccess: () => {
      // SUCCESS -> clear(). The pending buffer is drained.
      clear();
    },
  });

  // Flush the pending commands immediately (used by the debounce timer and by
  // explicit flushNow calls). It snapshots the current pending list and hands
  // it to the Mutation.
  const flush = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Snapshot the pending list. If empty, there is nothing to flush.
    const batch = useAutosaveStore.getState().pendingCommands;
    if (batch.length === 0) {
      return;
    }
    mutation.mutate(batch);
  }, [mutation]);

  // Debounced flush: whenever the pending list grows, (re)arm the debounce
  // timer. After AUTOSAVE_DEBOUNCE_MS of inactivity, the batch is flushed.
  React.useEffect(() => {
    if (pendingCommands.length === 0) {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      flush();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [pendingCommands, flush]);

  // Flush any remaining pending commands on unmount (best-effort autosave).
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const batch = useAutosaveStore.getState().pendingCommands;
      if (batch.length > 0) {
        // Fire-and-forget flush on unmount. The server is idempotent via
        // commandId, so a duplicate is safe.
        void fetch(commandsEndpoint(projectId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Derive the CommandQueueStatus DIRECTLY from the Mutation's built-in states.
  // This is the ONLY mapping from network state to the Bottom Status Bar.
  const status: CommandQueueStatus = mutation.isPending
    ? 'saving'
    : mutation.isError
      ? 'offline'
      : 'saved';

  return {
    status,
    pendingCount: pendingCommands.length,
    flushNow: flush,
    isSaving: mutation.isPending,
    isError: mutation.isError,
  };
}
