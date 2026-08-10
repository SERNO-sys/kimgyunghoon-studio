/**
 * K.2 Decision Layer — Schema & Types.
 *
 * The Decision Layer is the single, side-effect-only boundary through which an
 * AI-generated draft may be committed to a project. It exists to enforce two
 * constitutional guarantees on the AI decision surface:
 *
 *   1. **No last-writer-wins.** A stale AI draft can never silently overwrite a
 *      newer one. Every commit is guarded by an optimistic concurrency token
 *      (`revision`) and fails loudly on conflict.
 *   2. **No business-logic pollution.** The DecisionEngine only *decides* and
 *      *persists*; it never renders, prices, or evaluates permissions. Those
 *      concerns live in their own boundaries.
 *
 * This module is pure — it defines the contract and the decision rules. It
 * imports no Core, no renderer, and no runtime services.
 */

/** The set of surfaces an AI draft may target. */
export type DecisionSurface = 'themeConfig' | 'settings' | 'pages';

/**
 * The outcome of a decision attempt. `committed` means the draft was written
 * atomically; `conflict` means the optimistic concurrency guard rejected a
 * stale write; `rejected` means the draft failed validation and was refused.
 */
export type DecisionOutcome = 'committed' | 'conflict' | 'rejected';

/** A validated, ready-to-commit AI draft. */
export interface DecisionDraft<T = unknown> {
  /** The project (site) this draft targets. */
  siteId: string;
  /** Which surface of the project this draft mutates. */
  surface: DecisionSurface;
  /** The optimistic concurrency token the draft was based on. */
  baseRevision: number;
  /** The payload to persist. Shape depends on `surface`. */
  payload: T;
}

/** The result returned by the DecisionEngine after an attempt. */
export interface DecisionResult {
  outcome: DecisionOutcome;
  /** Present when `outcome === 'committed'`. */
  newRevision?: number;
  /** Human-readable reason, present on `conflict` / `rejected`. */
  reason?: string;
}

/**
 * The persistence port the DecisionEngine depends on. Kept minimal and
 * framework-agnostic so the engine stays pure and testable.
 */
export interface DecisionWriter {
  /**
   * Atomically persist `payload` for `siteId` only if the current revision
   * still equals `baseRevision`. Returns the new revision on success, or
   * `null` when the precondition fails (stale write).
   */
  commit(
    siteId: string,
    surface: DecisionSurface,
    baseRevision: number,
    payload: unknown
  ): Promise<number | null>;
}

/** A validator that may reject a draft before it is committed. */
export interface DecisionValidator<T = unknown> {
  /** Returns an error string to reject, or `null` to allow. */
  validate(draft: DecisionDraft<T>): string | null;
}
