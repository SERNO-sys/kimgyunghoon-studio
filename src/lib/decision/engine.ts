/**
 * K.2 Decision Layer — DecisionEngine.
 *
 * The DecisionEngine is the pure, side-effect-only orchestrator of the AI
 * decision surface. It enforces the decision rules in a single place:
 *
 *   1. **Validate** — a draft may be rejected before it is ever persisted.
 *   2. **Commit** — a validated draft is written atomically via the
 *      `DecisionWriter` port, guarded by an optimistic concurrency token.
 *   3. **Report** — the caller receives a structured `DecisionResult` so it can
 *      distinguish `committed`, `conflict`, and `rejected` without inspecting
 *      internals.
 *
 * The engine is pure: it holds no state, imports no Core, no renderer, and no
 * runtime services. All persistence is delegated to the injected `writer`.
 */

import type {
  DecisionDraft,
  DecisionResult,
  DecisionValidator,
  DecisionWriter,
} from './schema';

export interface DecisionEngineOptions {
  writer: DecisionWriter;
  /** Optional validators run in order; the first rejection wins. */
  validators?: DecisionValidator[];
}

export class DecisionEngine {
  private readonly writer: DecisionWriter;
  private readonly validators: DecisionValidator[];

  constructor(options: DecisionEngineOptions) {
    this.writer = options.writer;
    this.validators = options.validators ?? [];
  }

  /**
   * Attempt to commit an AI draft. Returns a structured result; never throws
   * for expected outcomes (validation rejection or concurrency conflict).
   */
  async commit<T>(draft: DecisionDraft<T>): Promise<DecisionResult> {
    // 1. Validate — reject before any side effect.
    for (const validator of this.validators) {
      const reason = validator.validate(draft as DecisionDraft<unknown>);
      if (reason) {
        return { outcome: 'rejected', reason };
      }
    }

    // 2. Commit — atomic, revision-guarded write.
    const newRevision = await this.writer.commit(
      draft.siteId,
      draft.surface,
      draft.baseRevision,
      draft.payload
    );

    // 3. Report — null means the optimistic concurrency guard rejected a stale
    //    write. This is a conflict, never a silent overwrite.
    if (newRevision === null) {
      return {
        outcome: 'conflict',
        reason: `Stale draft: site ${draft.siteId} has moved past revision ${draft.baseRevision}.`,
      };
    }

    return { outcome: 'committed', newRevision };
  }
}
