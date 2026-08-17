/**
 * AWIE V2 Brain — Recipe Bridge.
 *
 * The Recipe Bridge is the ONLY boundary that connects the Brain's semantic
 * DecisionPlan (WHAT) to the V2.6 Recipe layer (HOW). It is a pure
 * compatibility + selection concern. It NEVER mutates a DecisionPlan, NEVER
 * adds a capability, NEVER changes a capability state, and NEVER makes a
 * business decision.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - The Decision Engine decides WHAT the website needs (DecisionPlan).
 *   - The Recipe layer decides HOW the website is rendered (RecipeBlueprint).
 *   - The Recipe Bridge only answers: "Can this RecipeBlueprint represent this
 *     DecisionPlan without violating its semantic constraints?"
 *   - The Recipe Bridge does NOT decide business meaning. It does NOT select
 *     React components. It does NOT invent capabilities.
 *
 * The bridge is deterministic. Given the same DecisionPlan and the same
 * RecipeBlueprint, it always produces the same compatibility verdict.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure compatibility evaluation + selection.
 */

import type { DecisionPlan, PlannedCapability } from './decision-plan';
import type { CapabilityId, CapabilityStateValue } from './capability';
import type { RecipeBlueprint, FeatureId } from '../recipe-engine';

/**
 * Declarative compatibility mapping: which V2.6 Recipe Features can express a
 * given Brain Capability.
 *
 * This is a COMPATIBILITY vocabulary, not a business decision. It answers
 * "which recipe feature is capable of representing this business function?".
 * It is deliberately small and grounded in the existing V2.6 Feature
 * vocabulary (menu, reservation, address, hours, contact, gallery,
 * testimonials, team, blog, faq).
 *
 * A capability may be expressible by more than one feature. A recipe is
 * compatible with a capability if it maps at least one of these features.
 */
export const CAPABILITY_FEATURE_COMPATIBILITY: Record<
  CapabilityId,
  readonly FeatureId[]
> = {
  /**
   * Users discover offerings — expressible via menu, gallery, blog, or hero.
   * `hero` is the semantic Feature for primary hero content (headline /
   * subheadline / cta). It is additive; the existing menu/gallery/blog
   * mappings are preserved.
   */
  discovery: ['menu', 'gallery', 'blog', 'hero'],
  /** Users purchase — expressible via menu (purchasable items). */
  purchase: ['menu'],
  /** Users book — expressible via reservation. */
  booking: ['reservation'],
  /** Users inquire — expressible via contact. */
  inquiry: ['contact'],
  /** Business captures leads — expressible via contact (form). */
  lead_capture: ['contact'],
  /** Physical location matters — expressible via address. */
  location: ['address'],
  /** Trust formation — expressible via testimonials. */
  trust: ['testimonials'],
};

/**
 * A declarative per-recipe compatibility profile.
 *
 * This is the minimal adaptation that lets the bridge know whether a recipe
 * can express a Brain capability, and whether it requires concrete records to
 * satisfy a GENERIC capability.
 *
 * ARCHITECTURAL GAP (reported, not silently weakened):
 *   The V2.6 RecipeBlueprint does NOT natively declare whether a capability
 *   requires concrete records (e.g. a menu implies product records). The
 *   GENERIC state means "business meaning is clear but concrete data is
 *   insufficient". A recipe that fundamentally requires concrete records
 *   cannot satisfy a GENERIC capability without fabricating data. Because the
 *   V2.6 RecipeBlueprint cannot express this, the bridge carries it here as
 *   declarative metadata. This is an ADAPT, not a rewrite of the Recipe layer.
 */
export interface RecipeCompatibilityProfile {
  /** The recipeId this profile describes. */
  recipeId: string;
  /**
   * Brain capabilities this recipe can express, mapped to the recipe features
   * that express them. If omitted for a capability, the bridge falls back to
   * the recipe's actual feature mappings via CAPABILITY_FEATURE_COMPATIBILITY.
   */
  capabilities?: Partial<Record<CapabilityId, readonly FeatureId[]>>;
  /**
   * Capabilities that, when GENERIC, this recipe CANNOT satisfy without
   * concrete records. A GENERIC capability listed here makes the recipe
   * INCOMPATIBLE for that capability.
   */
  requiresConcreteRecords?: readonly CapabilityId[];
}

/** The verdict of a compatibility evaluation. */
export type CompatibilityVerdict = 'COMPATIBLE' | 'INCOMPATIBLE';

/** The compatibility verdict for a single planned capability. */
export interface CapabilityCompatibility {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The state the DecisionPlan assigned to this capability. */
  state: CapabilityStateValue;
  /** Whether the recipe can represent this capability under its state. */
  verdict: CompatibilityVerdict;
  /** A human-readable reason for the verdict. */
  reason: string;
}

/** The compatibility result for a whole RecipeBlueprint against a DecisionPlan. */
export interface RecipeCompatibilityResult {
  /** The recipeId that was evaluated. */
  recipeId: string;
  /** The overall verdict. INCOMPATIBLE if any capability is INCOMPATIBLE. */
  verdict: CompatibilityVerdict;
  /** Per-capability compatibility evaluations. */
  capabilities: CapabilityCompatibility[];
  /** The reasons for any INCOMPATIBLE verdicts. */
  reasons: string[];
}

/**
 * A semantic state preserved across the bridge.
 *
 * The V2.6 Recipe layer has no native GENERIC / DORMANT / DROP concept. The
 * bridge preserves these states as metadata so the downstream RecipeMerger /
 * Content Plan can honor them without the bridge fabricating content.
 */
export interface PreservedCapabilityState {
  /** The semantic capability identifier. */
  capability: CapabilityId;
  /** The preserved state. */
  state: CapabilityStateValue;
  /** How the bridge preserved this state. */
  note: string;
}

/** The output of the Recipe Bridge. */
export interface RecipeBridgeOutput {
  /** The selected HOW blueprint. */
  recipe: RecipeBlueprint;
  /** The compatibility result for the selected recipe. */
  compatibility: RecipeCompatibilityResult;
  /** Semantic states preserved across the bridge (GENERIC / DORMANT / DROP). */
  preserved: PreservedCapabilityState[];
  /** The unchanged DecisionPlan reference (WHAT). Never mutated. */
  plan: DecisionPlan;
}

/**
 * The Recipe Bridge.
 *
 * Evaluates RecipeBlueprints against a DecisionPlan and selects the best
 * compatible recipe. It is deterministic and never mutates the DecisionPlan.
 */
export class RecipeBridge {
  /**
   * @param profiles Declarative compatibility profiles keyed by recipeId.
   *                 Optional — recipes without a profile are evaluated using
   *                 their actual feature mappings only.
   */
  constructor(
    private readonly profiles: ReadonlyMap<string, RecipeCompatibilityProfile> = new Map(),
  ) {}

  /**
   * Evaluates a single RecipeBlueprint against a DecisionPlan.
   *
   * Returns a deterministic compatibility result. The DecisionPlan is never
   * mutated.
   */
  checkCompatibility(
    plan: DecisionPlan,
    recipe: RecipeBlueprint,
  ): RecipeCompatibilityResult {
    const profile = this.profiles.get(recipe.recipeId);
    const capabilities: CapabilityCompatibility[] = [];
    const reasons: string[] = [];

    for (const planned of plan.capabilities) {
      const evaluation = this.evaluateCapability(planned, recipe, profile);
      capabilities.push(evaluation);
      if (evaluation.verdict === 'INCOMPATIBLE') {
        reasons.push(evaluation.reason);
      }
    }

    const verdict: CompatibilityVerdict =
      reasons.length > 0 ? 'INCOMPATIBLE' : 'COMPATIBLE';

    return { recipeId: recipe.recipeId, verdict, capabilities, reasons };
  }

  /**
   * Selects the best compatible recipe for a DecisionPlan.
   *
   * Iterates the provided recipes, keeps only COMPATIBLE ones, and returns the
   * first (deterministic order). Returns undefined if no recipe is compatible.
   */
  selectRecipe(
    plan: DecisionPlan,
    recipes: readonly RecipeBlueprint[],
  ): RecipeBridgeOutput | undefined {
    for (const recipe of recipes) {
      const compatibility = this.checkCompatibility(plan, recipe);
      if (compatibility.verdict === 'COMPATIBLE') {
        return {
          recipe,
          compatibility,
          preserved: this.preserveStates(plan),
          plan,
        };
      }
    }
    return undefined;
  }

  /**
   * Preserves the GENERIC / DORMANT / DROP states of the DecisionPlan.
   *
   * ACTIVE capabilities are not "preserved" here — they are the concrete
   * requirements the recipe must satisfy. GENERIC / DORMANT / DROP are the
   * states the V2.6 Recipe layer cannot natively express, so the bridge records
   * them for downstream layers.
   */
  private preserveStates(plan: DecisionPlan): PreservedCapabilityState[] {
    const preserved: PreservedCapabilityState[] = [];
    for (const planned of plan.capabilities) {
      switch (planned.state) {
        case 'GENERIC':
          preserved.push({
            capability: planned.capability,
            state: 'GENERIC',
            note:
              'Business meaning is clear but concrete data is insufficient; recipe must not fabricate records.',
          });
          break;
        case 'DORMANT':
          preserved.push({
            capability: planned.capability,
            state: 'DORMANT',
            note:
              'Not exposed now; may be activated later via CMS/data entry. Must not be rendered as active content.',
          });
          break;
        case 'DROP':
          preserved.push({
            capability: planned.capability,
            state: 'DROP',
            note:
              'Excluded from the current site scope and budget. Must not be activated.',
          });
          break;
        default:
          // ACTIVE is a concrete requirement, not a preserved state.
          break;
      }
    }
    return preserved;
  }

  /**
   * Evaluates a single planned capability against a recipe.
   *
   * The evaluation is state-aware:
   *   - DROP:   always COMPATIBLE (must not be activated).
   *   - DORMANT: always COMPATIBLE (must not be rendered as active content).
   *   - GENERIC: COMPATIBLE only if the recipe can express the capability
   *              WITHOUT requiring concrete records.
   *   - ACTIVE: COMPATIBLE only if the recipe can express the capability.
   */
  private evaluateCapability(
    planned: PlannedCapability,
    recipe: RecipeBlueprint,
    profile: RecipeCompatibilityProfile | undefined,
  ): CapabilityCompatibility {
    const { capability, state } = planned;

    switch (state) {
      case 'DROP':
        return {
          capability,
          state,
          verdict: 'COMPATIBLE',
          reason: `DROP capability "${capability}" is preserved; it must not be activated.`,
        };
      case 'DORMANT':
        return {
          capability,
          state,
          verdict: 'COMPATIBLE',
          reason: `DORMANT capability "${capability}" is preserved; it must not be rendered as active content.`,
        };
      case 'GENERIC':
        return this.evaluateGeneric(capability, recipe, profile);
      case 'ACTIVE':
        return this.evaluateActive(capability, recipe, profile);
    }
  }

  /** Evaluates an ACTIVE capability: the recipe must be able to express it. */
  private evaluateActive(
    capability: CapabilityId,
    recipe: RecipeBlueprint,
    profile: RecipeCompatibilityProfile | undefined,
  ): CapabilityCompatibility {
    if (this.canExpress(capability, recipe, profile)) {
      return {
        capability,
        state: 'ACTIVE',
        verdict: 'COMPATIBLE',
        reason: `Recipe "${recipe.recipeId}" can express ACTIVE capability "${capability}".`,
      };
    }
    return {
      capability,
      state: 'ACTIVE',
      verdict: 'INCOMPATIBLE',
      reason: `Recipe "${recipe.recipeId}" cannot express ACTIVE capability "${capability}".`,
    };
  }

  /** Evaluates a GENERIC capability: recipe must express it without concrete records. */
  private evaluateGeneric(
    capability: CapabilityId,
    recipe: RecipeBlueprint,
    profile: RecipeCompatibilityProfile | undefined,
  ): CapabilityCompatibility {
    if (!this.canExpress(capability, recipe, profile)) {
      return {
        capability,
        state: 'GENERIC',
        verdict: 'INCOMPATIBLE',
        reason: `Recipe "${recipe.recipeId}" cannot express GENERIC capability "${capability}".`,
      };
    }
    if (this.requiresConcreteRecords(capability, profile)) {
      return {
        capability,
        state: 'GENERIC',
        verdict: 'INCOMPATIBLE',
        reason: `Recipe "${recipe.recipeId}" requires concrete records for GENERIC capability "${capability}"; it would fabricate data.`,
      };
    }
    return {
      capability,
      state: 'GENERIC',
      verdict: 'COMPATIBLE',
      reason: `Recipe "${recipe.recipeId}" can express GENERIC capability "${capability}" without concrete records.`,
    };
  }

  /**
   * Determines whether a recipe can express a capability.
   *
   * Uses the profile's declared capabilities when present; otherwise falls back
   * to the recipe's actual feature mappings intersected with the declarative
   * CAPABILITY_FEATURE_COMPATIBILITY vocabulary.
   */
  private canExpress(
    capability: CapabilityId,
    recipe: RecipeBlueprint,
    profile: RecipeCompatibilityProfile | undefined,
  ): boolean {
    const declared = profile?.capabilities?.[capability];
    if (declared && declared.length > 0) {
      return this.recipeHasAnyFeature(recipe, declared);
    }

    const compatibleFeatures = CAPABILITY_FEATURE_COMPATIBILITY[capability];
    return this.recipeHasAnyFeature(recipe, compatibleFeatures);
  }

  /** Whether the recipe maps at least one of the given features. */
  private recipeHasAnyFeature(
    recipe: RecipeBlueprint,
    features: readonly FeatureId[],
  ): boolean {
    const recipeFeatures = new Set(
      recipe.mapping.capabilityFeatures.map((m) => m.feature),
    );
    return features.some((feature) => recipeFeatures.has(feature));
  }

  /** Whether the profile declares that this capability requires concrete records. */
  private requiresConcreteRecords(
    capability: CapabilityId,
    profile: RecipeCompatibilityProfile | undefined,
  ): boolean {
    return profile?.requiresConcreteRecords?.includes(capability) ?? false;
  }
}
