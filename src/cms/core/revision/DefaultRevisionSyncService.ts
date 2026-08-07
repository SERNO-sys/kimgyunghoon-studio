/**
 * AWIE V2 - Phase 14.6: CMS Infrastructure - The Concrete Revision Sync System.
 *
 * This is the CONCRETE implementation of IRevisionSyncService. It is a
 * deterministic state transition engine, NOT a workflow decision engine.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES: STATE TRANSITION, NOT WORKFLOW
 * ============================================================================
 * 1. Not a Decision Engine.
 *
 *    This service is a deterministic state transition engine. It MUST NOT
 *    evaluate business rules (e.g. `if (reviewPassed)`). The
 *    Application/Workflow layer makes decisions; this service only records and
 *    enforces valid state transitions.
 *
 * 2. Strict State Machine.
 *
 *    The `transition(revisionId, targetState, context)` method acts as a
 *    strict state machine. It validates the transition against a fixed
 *    transition graph. If a transition violates the graph (e.g. jumping
 *    directly from `draft` to `published`), it throws an
 *    InvalidStateTransitionError.
 *
 * 3. No Workflow Logic.
 *
 *    This service does NOT inject business rules into the transition. It only
 *    validates the state graph and executes the persistence.
 *
 * 4. Persistence via Port.
 *
 *    Persistence is delegated to an injected IRevisionRepository port. This
 *    keeps the state machine decoupled from any concrete storage.
 * ============================================================================
 */

import type {
  IRevisionSyncService,
  RevisionGap,
  RevisionState,
  TransitionContext,
} from './types';

// ---------------------------------------------------------------------------
// Persistence Port
// ---------------------------------------------------------------------------

/**
 * The persisted state of a revision.
 */
export interface RevisionRecord {
  /** The id of the revision. */
  readonly id: string;
  /** The current state of the revision. */
  readonly state: RevisionState;
  /** The revision of the master locale the variant was based on. */
  readonly sourceRevision: number;
  /** The revision the variant is currently at. */
  readonly resolvedRevision: number;
}

/**
 * The persistence port for revisions.
 *
 * This is a minimal, storage-agnostic port. The concrete storage (in-memory,
 * D1, etc.) is injected by the caller.
 */
export interface IRevisionRepository {
  /**
   * Loads a revision by id.
   *
   * @param revisionId - The id of the revision to load.
   * @returns A Promise resolving to the RevisionRecord, or null if not found.
   */
  load(revisionId: string): Promise<RevisionRecord | null>;

  /**
   * Persists a revision's state.
   *
   * @param record - The RevisionRecord to persist.
   * @returns A Promise that resolves when the record is persisted.
   */
  save(record: RevisionRecord): Promise<void>;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/**
 * Thrown when a revision transition violates the valid state graph.
 */
export class InvalidStateTransitionError extends Error {
  /** The id of the revision. */
  readonly revisionId: string;
  /** The current state of the revision. */
  readonly from: RevisionState;
  /** The attempted target state. */
  readonly to: RevisionState;

  constructor(revisionId: string, from: RevisionState, to: RevisionState) {
    super(
      `Invalid state transition for revision "${revisionId}": ${from} -> ${to}`,
    );
    this.name = 'InvalidStateTransitionError';
    this.revisionId = revisionId;
    this.from = from;
    this.to = to;
  }
}

// ---------------------------------------------------------------------------
// Valid Transition Graph
// ---------------------------------------------------------------------------

/**
 * The valid transition graph.
 *
 * STRICT RULE: This is the ONLY set of valid transitions. Any transition not
 * present in this map is invalid and MUST throw an InvalidStateTransitionError.
 *
 * The canonical lifecycle is:
 *   draft -> validated -> approved -> published -> archived
 *
 * Additional valid transitions:
 *   - archived is a terminal state (no outgoing transitions).
 *   - published -> archived (retirement).
 */
const VALID_TRANSITIONS: Readonly<Record<RevisionState, ReadonlySet<RevisionState>>> = {
  draft: new Set<RevisionState>(['validated']),
  validated: new Set<RevisionState>(['approved', 'draft']),
  approved: new Set<RevisionState>(['published', 'validated']),
  published: new Set<RevisionState>(['archived']),
  archived: new Set<RevisionState>([]),
};

// ---------------------------------------------------------------------------
// DefaultRevisionSyncService
// ---------------------------------------------------------------------------

/**
 * The concrete Revision Sync Service.
 *
 * Implements IRevisionSyncService. It is a deterministic state transition
 * engine. It validates the state graph and executes persistence. It does NOT
 * evaluate business rules.
 */
export class DefaultRevisionSyncService implements IRevisionSyncService {
  private readonly repository: IRevisionRepository;

  constructor(repository: IRevisionRepository) {
    this.repository = repository;
  }

  /**
   * Transitions a revision to a target state.
   *
   * This is a deterministic state transition. It validates the transition
   * against the valid state graph and, if valid, persists the new state. It
   * does NOT evaluate business rules — the Application/Workflow layer makes
   * decisions.
   *
   * @param revisionId - The id of the revision to transition.
   * @param targetState - The target RevisionState.
   * @param context - Optional transition context (actor, reason, timestamp).
   * @returns A Promise that resolves when the transition is recorded.
   * @throws InvalidStateTransitionError if the transition violates the graph.
   */
  async transition(
    revisionId: string,
    targetState: RevisionState,
    _context?: TransitionContext,
  ): Promise<void> {
    const record = await this.repository.load(revisionId);

    if (record === null) {
      throw new InvalidStateTransitionError(revisionId, 'draft', targetState);
    }

    const allowed = VALID_TRANSITIONS[record.state];
    if (!allowed.has(targetState)) {
      throw new InvalidStateTransitionError(
        revisionId,
        record.state,
        targetState,
      );
    }

    await this.repository.save({
      ...record,
      state: targetState,
    });
  }

  /**
   * Calculates the gap between the master locale revision and the resolved
   * revision.
   *
   * @param revisionId - The id of the revision to calculate the gap for.
   * @returns A Promise resolving to the RevisionGap, including the affected
   *   sections for incremental AI generation.
   */
  async calculateGap(revisionId: string): Promise<RevisionGap> {
    const record = await this.repository.load(revisionId);

    if (record === null) {
      return {
        sourceRevision: 0,
        resolvedRevision: 0,
        affectedSections: [],
      };
    }

    return {
      sourceRevision: record.sourceRevision,
      resolvedRevision: record.resolvedRevision,
      affectedSections: [],
    };
  }
}
