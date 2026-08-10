/**
 * AWIE V2 Brain — Recipe Integration (Step 08).
 *
 * The Recipe Integration composes the Step 07 Universal HOW Contract with the
 * existing V2.6 Recipe layer to deterministically produce a valid Recipe
 * selection OR a precise incompatibility result.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *
 *   AI #1
 *     ↓
 *   Business Meaning
 *     ↓
 *   Decision Engine
 *     ↓
 *   DecisionPlan                    = WHAT
 *     ↓
 *   Universal HOW Contract          = semantic HOW compatibility
 *     ↓
 *   V2.6 Recipe                     = HOW assembly
 *     ↓
 *   ThemeConfig
 *     ↓
 *   Renderer                        = RENDER
 *
 * This module is the ONLY place that composes the HOW compatibility verdict
 * (Step 07) with the V2.6 Recipe compatibility verdict (Step 05 RecipeBridge).
 * It is a pure, deterministic integration concern. It NEVER:
 *   - mutates a DecisionPlan,
 *   - adds a capability,
 *   - removes a capability,
 *   - changes a capability state (ACTIVE / GENERIC / DORMANT / DROP),
 *   - resurrects a DROP capability,
 *   - activates a DORMANT capability,
 *   - fabricates evidence or concrete records,
 *   - infers a capability from a HOW primitive,
 *   - becomes a hidden Decision Engine.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It composes
 * two already-approved compatibility evaluators. It does NOT reimplement their
 * logic. It does NOT reference React, HTML, CSS, ThemeConfig, or Renderer.
 */

import type { DecisionPlan } from './decision-plan';
import type { CapabilityId, CapabilityStateValue } from './capability';
import {
  CAPABILITY_HOW_COMPATIBILITY,
  evaluateHowCompatibility,
  type HowCompatibilityResult,
  type HowPrimitiveId,
  type HowPrimitiveProfile,
} from './how-contract';
import {
  RecipeBridge,
  type RecipeCompatibilityResult,
} from './recipe-bridge';
import type { RecipeBlueprint } from '../recipe-engine';

/**
 * The overall integration verdict.
 *
 * COMPATIBLE means the recipe can faithfully represent the DecisionPlan under
 * both the HOW constraints and the V2.6 Recipe capability constraints.
 * INCOMPATIBLE means at least one layer cannot represent the plan without
 * violating a semantic constraint (e.g. fabricating records or evidence).
 */
export type IntegrationVerdict = 'COMPATIBLE' | 'INCOMPATIBLE';

/**
 * The per-capability integration evaluation.
 *
 * This is the semantic trace for a single planned capability across both the
 * HOW layer and the V2.6 Recipe layer. It preserves the capability state and
 * records the verdicts from each layer.
 */
export interface CapabilityIntegration {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The state the DecisionPlan assigned to this capability. */
  state: CapabilityStateValue;
  /** The HOW compatibility verdict for this capability's primitives. */
  howVerdict: 'COMPATIBLE' | 'INCOMPATIBLE';
  /** The V2.6 Recipe compatibility verdict for this capability. */
  recipeVerdict: 'COMPATIBLE' | 'INCOMPATIBLE';
  /** The combined verdict. INCOMPATIBLE if either layer is INCOMPATIBLE. */
  verdict: IntegrationVerdict;
  /** A human-readable reason for the combined verdict. */
  reason: string;
}

/**
 * The full integration result for a single RecipeBlueprint against a
 * DecisionPlan.
 *
 * It preserves:
 *   - the original DecisionPlan (never mutated),
 *   - the capability states,
 *   - the HOW compatibility results (Step 07),
 *   - the V2.6 Recipe compatibility results (Step 05),
 *   - the selected Recipe when compatible,
 *   - an explicit reason when incompatible.
 */
export interface RecipeIntegrationResult {
  /** The recipeId that was evaluated. */
  recipeId: string;
  /** The overall integration verdict. */
  verdict: IntegrationVerdict;
  /** The HOW compatibility result (Step 07). */
  how: HowCompatibilityResult;
  /** The V2.6 Recipe compatibility result (Step 05). */
  recipe: RecipeCompatibilityResult;
  /** The per-capability integration trace. */
  capabilities: CapabilityIntegration[];
  /** The reasons for any INCOMPATIBLE verdicts. */
  reasons: string[];
  /** The unchanged DecisionPlan reference (WHAT). Never mutated. */
  plan: DecisionPlan;
}

/**
 * The Recipe Integration.
 *
 * Composes the Step 07 HOW compatibility evaluator with the Step 05 V2.6
 * RecipeBridge. It is deterministic: the same DecisionPlan + HOW profile +
 * RecipeBlueprint always produces the same result.
 */
export class RecipeIntegration {
  private readonly bridge: RecipeBridge;

  /**
   * @param howProfiles Declarative HOW profiles keyed by recipeId (Step 07).
   * @param bridge      The Step 05 RecipeBridge. Defaults to a fresh bridge.
   */
  constructor(
    private readonly howProfiles: ReadonlyMap<string, HowPrimitiveProfile> = new Map(),
    bridge?: RecipeBridge,
  ) {
    this.bridge = bridge ?? new RecipeBridge();
  }

  /**
   * Evaluates a single RecipeBlueprint against a DecisionPlan.
   *
   * Runs the HOW compatibility evaluation (Step 07) and the V2.6 Recipe
   * compatibility evaluation (Step 05), then composes them into a single
   * deterministic verdict. The DecisionPlan is never mutated.
   */
  evaluate(
    plan: DecisionPlan,
    recipe: RecipeBlueprint,
  ): RecipeIntegrationResult {
    const howProfile = this.howProfiles.get(recipe.recipeId);
    const how = howProfile
      ? evaluateHowCompatibility(plan, howProfile)
      : this.emptyHowResult(recipe.recipeId);
    const recipeResult = this.bridge.checkCompatibility(plan, recipe);

    const capabilities: CapabilityIntegration[] = [];
    const reasons: string[] = [];

    for (const planned of plan.capabilities) {
      const integration = this.evaluateCapability(
        planned.capability,
        how,
        recipeResult,
      );
      capabilities.push(integration);
      if (integration.verdict === 'INCOMPATIBLE') {
        reasons.push(integration.reason);
      }
    }

    // Aggregate the reasons from both layers, preserving order and avoiding
    // duplicates.
    for (const reason of how.reasons) {
      if (!reasons.includes(reason)) reasons.push(reason);
    }
    for (const reason of recipeResult.reasons) {
      if (!reasons.includes(reason)) reasons.push(reason);
    }

    const verdict: IntegrationVerdict =
      reasons.length > 0 ? 'INCOMPATIBLE' : 'COMPATIBLE';

    return {
      recipeId: recipe.recipeId,
      verdict,
      how,
      recipe: recipeResult,
      capabilities,
      reasons,
      plan,
    };
  }

  /**
   * Selects the best compatible RecipeBlueprint for a DecisionPlan.
   *
   * Iterates the provided recipes in order, keeps only COMPATIBLE ones, and
   * returns the first (deterministic order). Returns undefined if no recipe is
   * compatible.
   */
  select(
    plan: DecisionPlan,
    recipes: readonly RecipeBlueprint[],
  ): RecipeIntegrationResult | undefined {
    for (const recipe of recipes) {
      const result = this.evaluate(plan, recipe);
      if (result.verdict === 'COMPATIBLE') {
        return result;
      }
    }
    return undefined;
  }

  /**
   * Evaluates a single capability across both layers.
   *
   * The combined verdict is INCOMPATIBLE if either the HOW layer or the V2.6
   * Recipe layer cannot represent the capability under its state.
   */
  private evaluateCapability(
    capability: CapabilityId,
    how: HowCompatibilityResult,
    recipe: RecipeCompatibilityResult,
  ): CapabilityIntegration {
    const howEntry = how.primitives.find((p) =>
      this.primitiveServesCapability(p.primitive, capability),
    );
    const recipeEntry = recipe.capabilities.find(
      (c) => c.capability === capability,
    );

    const howVerdict: 'COMPATIBLE' | 'INCOMPATIBLE' =
      howEntry?.verdict ?? 'COMPATIBLE';
    const recipeVerdict: 'COMPATIBLE' | 'INCOMPATIBLE' =
      recipeEntry?.verdict ?? 'COMPATIBLE';

    const state = recipeEntry?.state ?? 'ACTIVE';

    if (howVerdict === 'INCOMPATIBLE' || recipeVerdict === 'INCOMPATIBLE') {
      const howReason = howEntry?.reason ?? '';
      const recipeReason = recipeEntry?.reason ?? '';
      return {
        capability,
        state,
        howVerdict,
        recipeVerdict,
        verdict: 'INCOMPATIBLE',
        reason: `Capability "${capability}" is INCOMPATIBLE. HOW: ${howReason} Recipe: ${recipeReason}`,
      };
    }

    return {
      capability,
      state,
      howVerdict,
      recipeVerdict,
      verdict: 'COMPATIBLE',
      reason: `Capability "${capability}" is COMPATIBLE across HOW and Recipe layers.`,
    };
  }

  /**
   * Determines whether a HOW primitive serves a given capability.
   *
   * This is a pure lookup against the Step 07 declarative compatibility
   * vocabulary. It NEVER infers a capability from a primitive.
   */
  private primitiveServesCapability(
    primitive: HowPrimitiveId,
    capability: CapabilityId,
  ): boolean {
    return CAPABILITY_HOW_COMPATIBILITY[capability].includes(primitive);
  }

  /** Returns an empty HOW result when no profile is registered for a recipe. */
  private emptyHowResult(recipeId: string): HowCompatibilityResult {
    return {
      recipeId,
      verdict: 'COMPATIBLE',
      primitives: [],
      reasons: [],
    };
  }
}
