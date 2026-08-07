/**
 * AWIE V2 - Phase 11 M2: Feature Flags - DefaultFeatureFlagService.
 *
 * A context-driven FeatureFlagService. The service itself MUST NOT know about
 * Tenant or Environment. The application layer passes a FeatureFlagContext; the
 * runtime service only evaluates the rules against that context.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. CONTEXT-DRIVEN - The service evaluates rules against a caller-provided
 *      context. It NEVER knows about Tenant or Environment directly.
 *   2. O(1) LOOKUP - Uses a Map for O(1) flag lookup. No Array.find().
 *   3. ZERO BUSINESS LOGIC - The service is pure infrastructure.
 *   4. ZERO RENDERING - The service NEVER renders UI.
 *   5. DETERMINISTIC - The same flag + context always yields the same result.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  FeatureFlag,
  FeatureFlagContext,
  FeatureFlagService,
} from './types';

/**
 * The default context-driven FeatureFlagService.
 *
 * Backed by a Map keyed by flag id for O(1) lookups. A flag is enabled when ANY
 * of its rules match the context. A flag with no rules is always enabled.
 */
export class DefaultFeatureFlagService implements FeatureFlagService {
  /** The O(1) flag store, keyed by flag id. */
  private readonly store = new Map<string, FeatureFlag>();

  /**
   * Evaluates a feature flag against a context.
   *
   * A flag is enabled when ANY of its rules match the context. A flag with no
   * rules is always enabled. An unknown flag evaluates to false (fail-closed).
   *
   * @param flagId The flag id to evaluate.
   * @param context The caller-provided evaluation context.
   * @returns Whether the flag is enabled for the given context.
   */
  evaluate(flagId: string, context: FeatureFlagContext): boolean {
    const flag = this.store.get(flagId);
    if (!flag) {
      // Fail-closed: an unknown flag is disabled.
      return false;
    }
    // A flag with no rules is a "global" flag: always enabled.
    if (flag.rules.length === 0) {
      return true;
    }
    // Enabled when ANY rule matches the context.
    return flag.rules.some((rule) => {
      const actual = context.attributes[rule.attribute];
      return actual !== undefined && actual === rule.value;
    });
  }

  /**
   * Registers a feature flag definition.
   *
   * @param flag The flag to register.
   */
  register(flag: FeatureFlag): void {
    this.store.set(flag.id, flag);
  }

  /**
   * Returns whether a flag is registered.
   *
   * @param flagId The flag id.
   */
  has(flagId: string): boolean {
    return this.store.has(flagId);
  }
}
