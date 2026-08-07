/**
 * AWIE V2 - Phase 11 M2: Feature Flags - Contract Types.
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
 *   2. ZERO BUSINESS LOGIC - The service is pure infrastructure. It NEVER
 *      imports BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   3. ZERO RENDERING - The service NEVER renders UI.
 *   4. DETERMINISTIC - The same flag + context always yields the same result.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

// ---------------------------------------------------------------------------
// Feature Flag Context
// ---------------------------------------------------------------------------

/**
 * The evaluation context for a feature flag.
 *
 * The context is an opaque, caller-provided bag of attributes (e.g. tenant id,
 * environment, user role, region). The FeatureFlagService does NOT interpret
 * these attributes — it only matches them against the flag's rules.
 */
export interface FeatureFlagContext {
  /** Arbitrary context attributes keyed by name. */
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

// ---------------------------------------------------------------------------
// Feature Flag Rules
// ---------------------------------------------------------------------------

/**
 * A single evaluation rule for a feature flag.
 *
 * A rule matches when the context attribute named `attribute` equals `value`.
 * If `attribute` is absent from the context, the rule does NOT match.
 */
export interface FeatureFlagRule {
  /** The context attribute to match against. */
  readonly attribute: string;
  /** The value the attribute must equal for the rule to match. */
  readonly value: string | number | boolean;
}

/**
 * A feature flag definition.
 *
 * A flag is enabled when ANY of its rules match the context. If a flag has no
 * rules, it is enabled by default (a "global" flag).
 */
export interface FeatureFlag {
  /** The stable flag id (e.g. "new-checkout"). */
  readonly id: string;
  /** The rules that enable the flag. Empty rules => always enabled. */
  readonly rules: readonly FeatureFlagRule[];
}

// ---------------------------------------------------------------------------
// Feature Flag Service
// ---------------------------------------------------------------------------

/**
 * The FeatureFlagService contract.
 *
 * The service evaluates flags against a caller-provided context. It is
 * stateless with respect to Tenant/Environment: it never knows about them. The
 * application layer is responsible for building the context.
 */
export interface FeatureFlagService {
  /**
   * Evaluates a feature flag against a context.
   *
   * @param flagId The flag id to evaluate.
   * @param context The caller-provided evaluation context.
   * @returns Whether the flag is enabled for the given context.
   */
  evaluate(flagId: string, context: FeatureFlagContext): boolean;

  /**
   * Registers a feature flag definition.
   *
   * @param flag The flag to register.
   */
  register(flag: FeatureFlag): void;

  /**
   * Returns whether a flag is registered.
   *
   * @param flagId The flag id.
   */
  has(flagId: string): boolean;
}
