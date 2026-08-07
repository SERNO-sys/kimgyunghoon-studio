/**
 * AWIE V2 - Phase 17.6: Inline Editing - Integration Layer (AWIE-owned BUILD).
 *
 * ADR-011D (Editor Layout Contract) FREEZES Inline Editing as the fourth zone:
 * double-clicking a text node swaps it for an inline Lexical editor, and on
 * blur/Enter the editor closes and emits an UpdateComponentCommand.
 *
 * AMENDMENT L - EDITOR ISOLATION (FROZEN):
 *
 *   Lexical MUST NEVER know ThemeConfig, RenderNode, PropertySchema,
 *   SelectionSnapshot, or EditorCommand. Lexical only edits text.
 *
 *   The INTEGRATION LAYER translates editor events into AWIE commands.
 *
 * This module IS that integration layer. It is the ONLY place that:
 *
 *   1. Decides WHICH components are inline-editable (Semantic Component
 *      Identity based, Amendment G).
 *   2. Translates a raw text value (produced by the isolated Lexical wrapper)
 *      into an UpdateComponentCommand (an EditorCommandPayload).
 *
 * CONSTITUTIONAL MANDATES:
 *
 *   - DUMB CLIENT (ADR-011A): This layer produces intent only. It NEVER mutates
 *     ThemeConfig. The generated Command is handed to the EditorCommandEmitter,
 *     which sends it to the Server-Side Orchestration API. The server performs
 *     the actual Composition.
 *
 *   - AMENDMENT G / ADR-012: The Command binds to `selectedComponentId` (the
 *     Semantic Component Identity) — the ONLY identity. It NEVER uses nodeId,
 *     DOM id, React key, RenderNode id, tree index, or runtime UUID.
 *
 *   - AMENDMENT L: This module MUST NOT import Lexical. Lexical is isolated
 *     inside the thin wrapper (LexicalInlineEditor). This layer only consumes
 *     the plain text value the wrapper produces.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure intent-modeling + translation layer. It does NOT compose, validate, or
 * decide the ThemeConfig. It produces intent only.
 */

import type { EditorCommandPayload } from '@/lib/editor-integration';

// ---------------------------------------------------------------------------
// Editable Component Detection (Semantic Component Identity based)
// ---------------------------------------------------------------------------

/**
 * The command type for updating a text value within the composition.
 *
 * This is a stable, semantic command type (CommandType = string). The server
 * translates this wire payload into a full Command (adding actorId, createdAt,
 * requiredCapability) before executing it (ADR-011A / Phase 12.5).
 */
export const UPDATE_COMPONENT_COMMAND_TYPE = 'content.update-component';

/**
 * The set of component ids that are inline-editable.
 *
 * AMENDMENT G: Editable components are identified by their Semantic Component
 * Identity (e.g. "text", "hero"). This is the ONLY identity used to decide
 * editability. Non-text components (e.g. "gallery", "cta") are NOT editable and
 * ignore double-click.
 *
 * This is a pure, declarative allow-list. It contains NO business logic.
 */
const EDITABLE_COMPONENT_IDS: ReadonlySet<string> = new Set(['text', 'hero']);

/**
 * Whether a component (identified by its Semantic Component Identity) supports
 * inline editing.
 *
 * AMENDMENT G: The check is performed on the Semantic Component Identity — the
 * ONLY selection identity. It NEVER inspects nodeId, DOM id, React key, RenderNode
 * id, tree index, or runtime UUID.
 *
 * @param semanticId The Semantic Component Identity of the component.
 * @returns true if the component is inline-editable.
 */
export function isInlineEditable(semanticId: string): boolean {
  // The root segment of the Semantic Component Identity is the component id
  // (e.g. "hero.title" -> "hero"). This is a pure string operation — no
  // business logic.
  const componentId = semanticId.split('.')[0];
  return EDITABLE_COMPONENT_IDS.has(componentId);
}

// ---------------------------------------------------------------------------
// Command Generator (translates editor events into AWIE commands)
// ---------------------------------------------------------------------------

/**
 * The result of an inline edit session.
 *
 * This is the PURE OUTPUT of the isolated Lexical wrapper. It carries ONLY the
 * Semantic Component Identity of the edited component and the new plain-text
 * value. It contains NO Lexical types, NO ThemeConfig, NO RenderNode — the
 * wrapper and this layer are fully decoupled (Amendment L).
 */
export interface InlineEditResult {
  /** The Semantic Component Identity of the edited component (Amendment G). */
  readonly semanticId: string;
  /** The section id the edited component belongs to (if known). */
  readonly sectionId: string | null;
  /** The new plain-text value produced by the editor. */
  readonly value: string;
}

/**
 * The Command Generator for inline edits.
 *
 * A SEPARATE pure function that takes an InlineEditResult and converts it into
 * an UpdateComponentCommand (an EditorCommandPayload). This is the boundary
 * where an editor event becomes a Command — but it is STILL a Dumb Client
 * payload. The server performs the actual Composition.
 *
 * AMENDMENT L: This is the integration layer translating editor events into
 * AWIE commands. Lexical itself never sees this Command.
 *
 * DUMB CLIENT RULE: The generated Command is intent only. It is handed to the
 * EditorCommandEmitter, which sends it to the Server-Side Orchestration API.
 * The client NEVER applies the Command itself.
 *
 * @param result The InlineEditResult produced by the editor session.
 * @param clientSequence A monotonically increasing per-session counter
 *   (Autosave readiness).
 * @returns An UpdateComponentCommand (EditorCommandPayload).
 */
export function generateUpdateComponentCommand(
  result: InlineEditResult,
  clientSequence: number,
): EditorCommandPayload {
  // The value carries the composition intent: the Semantic Component Identity
  // of the edited component and the new text value (Amendment G). The server
  // interprets this to perform the actual update.
  return {
    type: UPDATE_COMPONENT_COMMAND_TYPE,
    commandId: `update-${result.semanticId}-${Date.now()}-${clientSequence}`,
    sectionId: result.sectionId ?? undefined,
    value: JSON.stringify({
      semanticId: result.semanticId,
      value: result.value,
    }),
    clientSequence,
  };
}
