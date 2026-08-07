/**
 * AWIE V2 - Budgets & Advanced Validation.
 *
 * The QuestionBudget interface manages stop conditions dynamically — the
 * engine does NOT hardcode "2-5 questions". The budget is a pluggable policy
 * that decides when to stop asking.
 *
 * The Validator catches four classes of problems:
 *   - Duplicate: the same question/slot asked twice.
 *   - Contradiction: two answers that directly contradict each other.
 *   - Derived Conflict: a derived fact conflicts with an existing slot value
 *     (e.g. a "Restaurant" that explicitly lists "No food").
 *   - Impossible Combination: a combination of slot values that cannot coexist.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure validation policy.
 */

import type { BusinessBrief, BusinessBriefPatch, SlotKey } from './brief';
import type { ConversationState, Question } from './state';

/** The category of a validation problem. */
export type ValidationCategory =
  | 'duplicate'
  | 'contradiction'
  | 'derived_conflict'
  | 'impossible_combination';

/** A single validation problem. */
export interface ValidationProblem {
  /** The category of the problem. */
  category: ValidationCategory;
  /** A human-readable description. */
  message: string;
  /** The slot(s) involved. */
  slots: SlotKey[];
  /** The severity of the problem. */
  severity: 'error' | 'warning';
}

/** The result of a validation pass. */
export interface ValidationResult {
  /** Whether the input is valid (no errors). */
  ok: boolean;
  /** All problems found. */
  problems: ValidationProblem[];
}

/**
 * The QuestionBudget.
 *
 * A pluggable policy that manages stop conditions dynamically. Implementations
 * may base the budget on slot count, confidence thresholds, or a max question
 * count.
 */
export interface QuestionBudget {
  /** Whether the engine should stop asking questions. */
  shouldStop(state: ConversationState): boolean;
  /** The maximum number of questions allowed. */
  readonly maxQuestions: number;
}

/**
 * A default budget: stops when all core slots reach a confidence threshold or
 * the max question count is reached.
 */
export class DefaultQuestionBudget implements QuestionBudget {
  readonly maxQuestions: number;
  private readonly confidenceThreshold: number;

  constructor(maxQuestions = 5, confidenceThreshold = 0.8) {
    this.maxQuestions = maxQuestions;
    this.confidenceThreshold = confidenceThreshold;
  }

  shouldStop(state: ConversationState): boolean {
    if (state.history.length >= this.maxQuestions) {
      return true;
    }
    // Stop when every core slot has reached the confidence threshold.
    const coreSlots: SlotKey[] = [
      'businessType',
      'goals',
      'audience',
      'personality',
      'services',
      'contactPreference',
    ];
    return coreSlots.every((slot) => (state.confidence[slot] ?? 0) >= this.confidenceThreshold);
  }
}

/**
 * The Validator.
 *
 * Detects duplicate, contradiction, derived conflict, and impossible
 * combination problems across the brief, patch, and conversation state.
 */
export class Validator {
  /**
   * Validates a proposed patch against the current brief and state.
   */
  validate(
    current: BusinessBrief,
    patch: BusinessBriefPatch,
    state: ConversationState,
  ): ValidationResult {
    const problems: ValidationProblem[] = [];

    // 1. Duplicate: the patch targets a slot that is already confidently filled.
    const patchSlotKeys = (Object.keys(patch) as (keyof BusinessBriefPatch)[]).filter(
      (key): key is SlotKey => key !== 'confidence',
    );
    for (const slot of patchSlotKeys) {
      const existing = current[slot];
      const existingConfidence = state.confidence[slot] ?? 0;
      if (existing !== undefined && existingConfidence >= 0.9) {
        problems.push({
          category: 'duplicate',
          message: `Slot "${slot}" is already filled with high confidence (${Math.round(
            existingConfidence * 100,
          )}%).`,
          slots: [slot],
          severity: 'warning',
        });
      }
    }


    // 2. Contradiction: the patch contradicts an existing slot value.
    this.detectContradictions(current, patch, problems);

    // 3. Derived conflict: a derived fact conflicts with an existing slot.
    this.detectDerivedConflicts(current, state, problems);

    // 4. Impossible combination: slot values that cannot coexist.
    this.detectImpossibleCombinations(current, patch, problems);

    const hasError = problems.some((p) => p.severity === 'error');
    return { ok: !hasError, problems };
  }

  /** Detects direct contradictions between the patch and the current brief. */
  private detectContradictions(
    current: BusinessBrief,
    patch: BusinessBriefPatch,
    problems: ValidationProblem[],
  ): void {
    // businessType contradiction: patch says "restaurant", brief says "cafe".
    if (current.businessType && patch.businessType) {
      const a = current.businessType.primary.toLowerCase();
      const b = patch.businessType.primary.toLowerCase();
      if (a !== b) {
        problems.push({
          category: 'contradiction',
          message: `Business type "${a}" contradicts extracted "${b}".`,
          slots: ['businessType'],
          severity: 'error',
        });
      }
    }
  }

  /** Detects derived facts that conflict with existing slot values. */
  private detectDerivedConflicts(
    current: BusinessBrief,
    state: ConversationState,
    problems: ValidationProblem[],
  ): void {
    for (const fact of state.derivedFacts) {
      const slotValue = current[fact.slot];
      if (!slotValue) {
        continue;
      }
      // A "Restaurant" that explicitly lists "No food" is a derived conflict.
      if (fact.slot === 'businessType' && fact.value.toLowerCase() === 'restaurant') {
        const services = current.services?.items ?? [];
        const noFood = services.some((s) => /no food|no meals|no dining/i.test(s));
        if (noFood) {
          problems.push({
            category: 'derived_conflict',
            message: 'Derived fact "restaurant" conflicts with services listing "No food".',
            slots: ['businessType', 'services'],
            severity: 'error',
          });
        }
      }
    }
  }

  /** Detects impossible combinations of slot values. */
  private detectImpossibleCombinations(
    current: BusinessBrief,
    patch: BusinessBriefPatch,
    problems: ValidationProblem[],
  ): void {
    const businessType = patch.businessType?.primary ?? current.businessType?.primary;
    const services = patch.services?.items ?? current.services?.items ?? [];

    // A business type that cannot coexist with the listed services.
    if (businessType && services.length > 0) {
      const bt = businessType.toLowerCase();
      const hasFood = services.some((s) => /food|meal|dining|restaurant/i.test(s));
      const isRestaurant = bt === 'restaurant' || bt.includes('restaurant');
      if (isRestaurant && !hasFood) {
        problems.push({
          category: 'impossible_combination',
          message: 'A restaurant must offer food, but no food services are listed.',
          slots: ['businessType', 'services'],
          severity: 'warning',
        });
      }
    }
  }
}
