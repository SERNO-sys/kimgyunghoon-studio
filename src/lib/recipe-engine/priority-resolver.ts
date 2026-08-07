/**
 * AWIE V2 - The Priority Resolver (Decision Policy).
 *
 * Encapsulates the strict 5-step Decision Priority used across the Recipe
 * Engine:
 *
 *   1. User preferences
 *   2. BusinessBrief
 *   3. Industry Registry
 *   4. Recipe defaults (recommendations)
 *   5. System defaults
 *
 * The RecipeMerger delegates ALL priority resolution to this policy object.
 * This keeps the merger clean and Open-Closed Principle (OCP) compliant: adding
 * a new priority source requires only extending the ordered source list, not
 * modifying the merger's control flow.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure resolution policy.
 */

/** The ordered priority sources, from highest to lowest precedence. */
export type PrioritySource =
  | 'user'
  | 'brief'
  | 'industry'
  | 'recipe'
  | 'system';

/** The ordered list of sources, highest precedence first. */
export const PRIORITY_ORDER: readonly PrioritySource[] = [
  'user',
  'brief',
  'industry',
  'recipe',
  'system',
];

/** The inputs required to resolve a single value by priority. */
export interface ResolveInput<T> {
  /** The value from user preferences (highest priority). */
  user?: T;
  /** The value from the BusinessBrief. */
  brief?: T;
  /** The value from the Industry Registry. */
  industry?: T;
  /** The value from the recipe (recommendation). */
  recipe?: T;
  /** The system default (lowest priority, always defined). */
  system: T;
  /** A human-readable label for the resolved field (e.g. "title"). */
  label: string;
}

/** The result of resolving a single value by priority. */
export interface ResolveResult<T> {
  /** The resolved value. */
  value: T;
  /** The source that provided the winning value. */
  source: PrioritySource;
  /** A human-readable decision record for auditability. */
  decision: string;
}

/**
 * The PriorityResolver.
 *
 * Resolves a single value by walking the ordered priority sources and picking
 * the first defined value. The system default is always defined, so the result
 * is guaranteed to be defined.
 */
export class PriorityResolver {
  /**
   * Resolves a value by priority.
   *
   * @param input The candidate values keyed by priority source.
   * @returns The resolved value, its source, and a decision record.
   */
  resolve<T>(input: ResolveInput<T>): ResolveResult<T> {
    const candidates: Array<[PrioritySource, T | undefined]> = [
      ['user', input.user],
      ['brief', input.brief],
      ['industry', input.industry],
      ['recipe', input.recipe],
      ['system', input.system],
    ];

    for (const [source, value] of candidates) {
      if (value !== undefined) {
        return {
          value,
          source,
          decision: `${input.label}: ${source} applied.`,
        };
      }
    }

    // The system default is always defined, so this branch is unreachable in
    // practice, but kept for type-safety.
    return {
      value: input.system,
      source: 'system',
      decision: `${input.label}: system default applied.`,
    };
  }
}
