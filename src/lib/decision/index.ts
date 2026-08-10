/**
 * K.2 Decision Layer — public surface.
 *
 * The Decision Layer is the single, side-effect-only boundary through which an
 * AI-generated draft may be committed to a project. It enforces optimistic
 * concurrency (no last-writer-wins) and keeps business logic out of the AI
 * decision surface.
 *
 * Import from this barrel only — never from the internal modules directly.
 */

export {
  DecisionEngine,
  type DecisionEngineOptions,
} from './engine';
export {
  createDraftWriter,
} from './draft-writer';
export type {
  DecisionDraft,
  DecisionOutcome,
  DecisionResult,
  DecisionSurface,
  DecisionValidator,
  DecisionWriter,
} from './schema';
