/**
 * AWIE V2 - Phase 14.6: CMS Infrastructure - The Revision Sync System.
 *
 * This module defines the STRICT boundary interfaces for the Revision Sync
 * System. It is INTERFACE ONLY. It contains NO concrete implementation.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES: STATE TRANSITION, NOT WORKFLOW
 * ============================================================================
 * 1. Not a Decision Engine.
 *
 *    The Revision Sync service is a deterministic state transition engine,
 *    NOT a workflow decision engine. It MUST NOT evaluate business rules
 *    (e.g. `if (reviewPassed)`). The Application/Workflow layer makes
 *    decisions; Revision Sync only records and enforces valid state
 *    transitions.
 *
 * 2. State Transition API.
 *
 *    Instead of specific lifecycle methods (like `publish`, `approve`), this
 *    subsystem exposes a generic state machine API:
 *    `transition(revisionId, targetState, context?)`.
 *
 * 3. Strict State Limits (YAGNI).
 *
 *    RevisionState is STRICTLY limited to the five essentials:
 *    'draft' | 'validated' | 'approved' | 'published' | 'archived'.
 *    Do NOT add states like `scheduled` or `rejected` — those belong to
 *    workflow logic, not revision persistence.
 *
 * 4. Incremental Generation Support.
 *
 *    The RevisionGap DTO MUST include an `affectedSections: string[]` field
 *    to support incremental AI generation (updating only changed sections
 *    instead of regenerating the entire page).
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// RevisionState (STRICTLY the five essentials)
// ---------------------------------------------------------------------------

/**
 * The strictly allowed revision states.
 *
 * STRICT RULE (YAGNI): This union is STRICTLY limited to the five essentials.
 * Do NOT add states like `scheduled` or `rejected` — those belong to workflow
 * logic, not revision persistence.
 */
export type RevisionState =
  | 'draft'
  | 'validated'
  | 'approved'
  | 'published'
  | 'archived';

// ---------------------------------------------------------------------------
// TransitionContext (DTO)
// ---------------------------------------------------------------------------

/**
 * The context for a revision state transition.
 *
 * This is a passive DTO. It carries the metadata needed to record a valid
 * state transition. It does NOT carry business rules or decision logic.
 */
export interface TransitionContext {
  /** The actor (user/system) performing the transition. */
  readonly actor: string;
  /** An optional reason/note for the transition. */
  readonly reason?: string;
  /** The timestamp of the transition (ISO 8601). */
  readonly at: string;
}

// ---------------------------------------------------------------------------
// RevisionGap (DTO)
// ---------------------------------------------------------------------------

/**
 * The gap between the master locale revision and the resolved revision.
 *
 * This DTO supports incremental AI generation: the `affectedSections` field
 * identifies which sections changed, so the AI can update only those sections
 * instead of regenerating the entire page.
 */
export interface RevisionGap {
  /** The revision of the master locale the variant was based on. */
  readonly sourceRevision: number;
  /** The revision the variant is currently at. */
  readonly resolvedRevision: number;
  /**
   * The sections affected by the gap. Supports incremental AI generation —
   * only these sections need to be regenerated, not the entire page.
   */
  readonly affectedSections: string[];
}

// ---------------------------------------------------------------------------
// IRevisionSyncService (SINGLE CONTRACT)
// ---------------------------------------------------------------------------

/**
 * The Revision Sync Service boundary.
 *
 * This is a deterministic state transition engine, NOT a workflow decision
 * engine. It records and enforces valid state transitions. It does NOT
 * evaluate business rules.
 *
 * STRICT RULES:
 * - Generic state machine API: `transition(revisionId, targetState, context?)`.
 * - No specific lifecycle methods (e.g. `publish`, `approve`).
 * - No business rule evaluation (e.g. `if (reviewPassed)`).
 * - RevisionState is STRICTLY limited to the five essentials.
 */
export interface IRevisionSyncService {
  /**
   * Transitions a revision to a target state.
   *
   * This is a deterministic state transition. It records and enforces a valid
   * state transition. It does NOT evaluate business rules — the
   * Application/Workflow layer makes decisions.
   *
   * @param revisionId - The id of the revision to transition.
   * @param targetState - The target RevisionState.
   * @param context - Optional transition context (actor, reason, timestamp).
   * @returns A Promise that resolves when the transition is recorded.
   */
  transition(
    revisionId: string,
    targetState: RevisionState,
    context?: TransitionContext,
  ): Promise<void>;

  /**
   * Calculates the gap between the master locale revision and the resolved
   * revision.
   *
   * @param revisionId - The id of the revision to calculate the gap for.
   * @returns A Promise resolving to the RevisionGap, including the affected
   *   sections for incremental AI generation.
   */
  calculateGap(revisionId: string): Promise<RevisionGap>;
}
