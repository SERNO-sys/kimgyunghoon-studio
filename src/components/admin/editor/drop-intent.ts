/**
 * AWIE V2 - Phase 17.4: Drag & Drop - DropIntent Layer (AWIE-owned BUILD).
 *
 * ADR-014 (Drag & Drop Strategy) FREEZES the pipeline:
 *
 *   Drag Event -> DropIntent -> InsertComponentCommand -> EditorCommandEmitter
 *
 * This module is the FIRST AWIE-owned layer of that pipeline. It defines the
 * generic, framework-agnostic **DropIntent** model and the **dnd-kit adapter**
 * that translates a raw drag event into a DropIntent.
 *
 * CONSTITUTIONAL MANDATES (ADR-014):
 *
 *   - AMENDMENT J (Drag Is Intent Only): Dragging NEVER mutates ThemeConfig.
 *     Dragging only produces a DropIntent (which later becomes an
 *     EditorCommandPayload). The Server performs the actual Composition. The
 *     client only previews the intended insertion.
 *
 *   - AMENDMENT L (Drop Target Is Semantic): Drop targets are identified ONLY
 *     by Semantic Component Identity. Drop calculations NEVER depend on DOM
 *     position, React keys, RenderNode ids, or visual coordinates as persistent
 *     identity. Visual coordinates are transient only.
 *
 *   - AMENDMENT G / ADR-012: The DropIntent binds to `selectedComponentId`
 *     (the Semantic Component Identity) — the ONLY identity. It NEVER uses
 *     nodeId, DOM id, React key, RenderNode id, tree index, or runtime UUID.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure intent-modeling + adapter layer. It does NOT compose, reorder, validate,
 * or decide the ThemeConfig. It produces intent only.
 */

import type { EditorCommandPayload } from '@/lib/editor-integration';

// ---------------------------------------------------------------------------
// DropIntent (the generic, framework-agnostic intent)
// ---------------------------------------------------------------------------

/**
 * The kind of composition intent a drop expresses.
 *
 * For Phase 17.4 the only supported intent is INSERT (dragging a NEW component
 * from the Left Sidebar palette into the Canvas). MOVE (reordering an existing
 * section) is a future capability (ADR-014, Capability 2) and is modeled here
 * so the pipeline is forward-compatible.
 */
export type DropIntentKind = 'insert' | 'move';

/**
 * The generic, framework-agnostic intent produced by a drag gesture.
 *
 * This is deliberately decoupled from dnd-kit. The dnd-kit adapter produces a
 * DropIntent; the Command Generator consumes a DropIntent. Neither the adapter
 * nor the generator knows about the other's framework.
 *
 * AMENDMENT L: `targetSemanticId` is the Semantic Component Identity of the
 * drop target — the ONLY identity used for drop calculations. Visual
 * coordinates are transient and are NOT part of the persistent intent.
 */
export interface DropIntent {
  /** The kind of composition intent (insert or move). */
  readonly kind: DropIntentKind;
  /**
   * The Semantic Component Identity of the component being dragged.
   *
   * For an INSERT this is the palette component id (e.g. "gallery"). For a
   * MOVE this is the Semantic Component Identity of the section being moved
   * (e.g. "hero").
   */
  readonly sourceComponentId: string;
  /**
   * The Semantic Component Identity of the drop target (AMENDMENT L).
   *
   * e.g. "hero.title" — the component AFTER which the new component should be
   * inserted. This is the ONLY identity used for drop calculations.
   */
  readonly targetSemanticId: string;
  /**
   * The section id the drop target belongs to (if known). Used to scope the
   * resulting Command to the correct section.
   */
  readonly sectionId: string | null;
}

// ---------------------------------------------------------------------------
// dnd-kit Adapter (the ONLY consumer of dnd-kit in the editor)
// ---------------------------------------------------------------------------

/**
 * The dnd-kit drag payload carried on the draggable element.
 *
 * This is the bridge between the dnd-kit interaction layer and the AWIE
 * DropIntent model. It carries ONLY the Semantic Component Identity of the
 * source (AMENDMENT G / ADR-012) — never a nodeId, DOM id, React key, RenderNode
 * id, tree index, or runtime UUID.
 */
export interface DragSourcePayload {
  /** The Semantic Component Identity of the dragged component. */
  readonly sourceComponentId: string;
  /** The kind of intent this drag expresses. */
  readonly kind: DropIntentKind;
  /** The section id the source belongs to (if known). */
  readonly sectionId: string | null;
}

/**
 * The dnd-kit droppable payload carried on the drop target.
 *
 * AMENDMENT L: The drop target is identified ONLY by its Semantic Component
 * Identity. Visual coordinates are transient and are NEVER part of this payload.
 */
export interface DropTargetPayload {
  /** The Semantic Component Identity of the drop target. */
  readonly targetSemanticId: string;
  /** The section id the drop target belongs to (if known). */
  readonly sectionId: string | null;
}

/**
 * The dnd-kit adapter.
 *
 * Translates a raw drag event (the source payload + the target payload) into a
 * generic DropIntent. This is the ONLY place in the editor that knows about
 * dnd-kit's data model. Swapping dnd-kit for React DnD or Pragmatic Drag and
 * Drop requires changing ONLY this adapter (ADR-014, Replaceability).
 *
 * AMENDMENT J: This produces intent only. It NEVER mutates the ThemeConfig.
 */
export const DropIntentAdapter = {
  /**
   * Builds a DropIntent from a drag source and a drop target.
   *
   * @param source The dnd-kit drag source payload (Semantic Component Identity).
   * @param target The dnd-kit drop target payload (Semantic Component Identity).
   * @returns A generic DropIntent, or null if either identity is missing.
   */
  fromDragEvent(
    source: DragSourcePayload | null,
    target: DropTargetPayload | null,
  ): DropIntent | null {
    if (!source || !target) {
      return null;
    }
    // AMENDMENT L: The drop target is identified ONLY by its Semantic Component
    // Identity. Visual coordinates are transient and are NOT part of the intent.
    return {
      kind: source.kind,
      sourceComponentId: source.sourceComponentId,
      targetSemanticId: target.targetSemanticId,
      sectionId: target.sectionId ?? source.sectionId,
    };
  },
};

// ---------------------------------------------------------------------------
// Command Generator (the SECOND AWIE-owned layer of the pipeline)
// ---------------------------------------------------------------------------

/**
 * The command type for inserting a new component into the composition.
 *
 * This is a stable, semantic command type (CommandType = string). The server
 * translates this wire payload into a full Command (adding actorId, createdAt,
 * requiredCapability) before executing it (ADR-011A / Phase 12.5).
 */
export const INSERT_COMPONENT_COMMAND_TYPE = 'composition.insert-component';

/**
 * The command type for moving an existing component within the composition.
 *
 * Modeled for future capability (ADR-014, Capability 2). Not yet emitted.
 */
export const MOVE_COMPONENT_COMMAND_TYPE = 'composition.move-component';

/**
 * The Command Generator.
 *
 * A SEPARATE pure function that takes a DropIntent and converts it into an
 * InsertComponentCommand (an EditorCommandPayload). This is the boundary where
 * intent becomes a Command — but it is STILL a Dumb Client payload. The server
 * performs the actual Composition (Amendment J).
 *
 * AMENDMENT J: The generated Command is intent only. It is handed to the
 * EditorCommandEmitter, which sends it to the Server-Side Orchestration API.
 * The client NEVER applies the Command itself.
 */
export function generateInsertComponentCommand(
  intent: DropIntent,
  clientSequence: number,
): EditorCommandPayload {
  // The value carries the composition intent: the source component id and the
  // Semantic Component Identity of the drop target (AMENDMENT L). The server
  // interprets this to perform the actual insertion.
  return {
    type: INSERT_COMPONENT_COMMAND_TYPE,
    commandId: `insert-${intent.sourceComponentId}-${Date.now()}-${clientSequence}`,
    sectionId: intent.sectionId ?? undefined,
    value: JSON.stringify({
      sourceComponentId: intent.sourceComponentId,
      targetSemanticId: intent.targetSemanticId,
    }),
    clientSequence,
  };
}
