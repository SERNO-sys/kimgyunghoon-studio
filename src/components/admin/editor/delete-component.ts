/**
 * AWIE V2 - Phase 17.7: Component Deletion - Integration Layer (AWIE-owned BUILD).
 *
 * ADR-011D (Editor Layout Contract) + Amendment G (Semantic Component Identity)
 * FREEZE the deletion pipeline:
 *
 *   User Action -> DeleteComponentCommand -> EditorCommandEmitter
 *
 * This module is the AWIE-owned integration layer that translates a user's
 * intent to delete a component into a DeleteComponentCommand (an
 * EditorCommandPayload). It is the CLIENT-SIDE counterpart to the server-side
 * DeleteComponentHandler (cms-core/commands/delete-component.ts), which the
 * ServerSideOrchestrator already translates and executes.
 *
 * CONSTITUTIONAL MANDATES:
 *
 *   - DUMB CLIENT (ADR-011A): This layer produces intent only. It NEVER mutates
 *     ThemeConfig. The generated Command is handed to the EditorCommandEmitter,
 *     which sends it to the Server-Side Orchestration API. The server performs
 *     the actual Composition (removing the section from resources AND its id
 *     from the page section order).
 *
 *   - AMENDMENT G / ADR-012: The Command binds to `semanticId` (the Semantic
 *     Component Identity) — the ONLY identity. It NEVER uses nodeId, DOM id,
 *     React key, RenderNode id, tree index, or runtime UUID. These identities
 *     MUST survive framework swap, hydration, rerender, drag/drop, history, and
 *     undo/redo (Section 10).
 *
 *   - HISTORY (ADR-011B): The server-side DeleteComponentHandler produces ONLY
 *     `remove` operations, which are inverted by the existing
 *     InversePatchGenerator. Delete is therefore fully undoable with NO new
 *     history infrastructure. This layer emits the Command; it never touches
 *     history.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure intent-modeling + translation layer. It does NOT compose, validate, or
 * decide the ThemeConfig. It produces intent only.
 */

import type { EditorCommandPayload } from '@/lib/editor-integration';

// ---------------------------------------------------------------------------
// Command Type (Semantic, stable wire contract)
// ---------------------------------------------------------------------------

/**
 * The command type for deleting a component from the composition.
 *
 * This is a stable, semantic command type (CommandType = string). The server
 * translates this wire payload into a full Command (adding actorId, createdAt,
 * requiredCapability) before executing it (ADR-011A / Phase 12.5). It MUST
 * match the server-side `DELETE_COMPONENT_COMMAND` constant so the
 * ServerSideOrchestrator routes it to the DeleteComponentHandler.
 */
export const DELETE_COMPONENT_COMMAND_TYPE = 'composition.delete-component';

// ---------------------------------------------------------------------------
// Command Generator (translates a user action into an AWIE command)
// ---------------------------------------------------------------------------

/**
 * The Command Generator for component deletion.
 *
 * A SEPARATE pure function that takes the Semantic Component Identity of the
 * component to delete and converts it into a DeleteComponentCommand (an
 * EditorCommandPayload). This is the boundary where a user action becomes a
 * Command — but it is STILL a Dumb Client payload. The server performs the
 * actual Composition.
 *
 * AMENDMENT G: The Command binds to `semanticId` (the Semantic Component
 * Identity) — the ONLY identity. It NEVER uses nodeId, DOM id, React key,
 * RenderNode id, tree index, or runtime UUID.
 *
 * DUMB CLIENT RULE: The generated Command is intent only. It is handed to the
 * EditorCommandEmitter, which sends it to the Server-Side Orchestration API.
 * The client NEVER applies the Command itself.
 *
 * @param semanticId The Semantic Component Identity of the component to delete
 *   (e.g. "hero", "hero.title"). This is the ONLY identity used.
 * @param sectionId The section id the component belongs to (if known). Used to
 *   scope the resulting Command to the correct section.
 * @param clientSequence A monotonically increasing per-session counter
 *   (Autosave readiness).
 * @returns A DeleteComponentCommand (EditorCommandPayload).
 */
export function generateDeleteComponentCommand(
  semanticId: string,
  sectionId: string | null,
  clientSequence: number,
): EditorCommandPayload {
  // The value carries the composition intent: the Semantic Component Identity
  // of the component to delete (Amendment G). The server interprets this to
  // perform the actual deletion.
  return {
    type: DELETE_COMPONENT_COMMAND_TYPE,
    commandId: `delete-${semanticId}-${Date.now()}-${clientSequence}`,
    sectionId: sectionId ?? undefined,
    value: JSON.stringify({
      semanticId,
    }),
    clientSequence,
  };
}
