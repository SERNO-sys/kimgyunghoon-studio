/**
 * AWIE V2 - The Recipe Selector.
 *
 * Takes an IndustryProfile and evaluates registered recipes to find the most
 * compatible blueprint.
 *
 * The scoring is fully abstracted behind composable RecipeRules. The Selector
 * core contains NO domain-specific scoring logic — it simply iterates the
 * configured rules and sums their weighted evaluations:
 *
 *   score = rules.reduce((acc, rule) => acc + rule.evaluate(profile), 0)
 *
 * This keeps the Selector Open-Closed Principle (OCP) compliant: adding a new
 * scoring dimension is a matter of registering a new RecipeRule, not editing
 * the Selector core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure scoring + selection.
 */

import type { IndustryProfile } from '../industry-registry';
import type { RecipeBlueprint } from './types';
import type { RecipeRegistry } from './registry';

/**
 * A composable scoring rule.
 *
 * Each rule evaluates a recipe against an industry profile and returns a
 * normalized score in [0, 1]. The Selector sums the weighted evaluations of all
 * registered rules.
 */
export interface RecipeRule {
  /** A stable identifier for the rule (e.g. "capability-coverage"). */
  id: string;
  /** The weight of this rule in the final score. */
  weight: number;
  /**
   * Evaluates the recipe against the profile, returning a score in [0, 1].
   */
  evaluate(recipe: RecipeBlueprint, profile: IndustryProfile): number;
}

/**
 * Scores a recipe by how many of the industry's enabled capabilities it maps
 * to semantic features.
 */
export class CapabilityCoverageRule implements RecipeRule {
  readonly id = 'capability-coverage';

  constructor(public weight: number) {}

  evaluate(recipe: RecipeBlueprint, profile: IndustryProfile): number {
    const capabilities = Object.keys(profile.capabilities).filter(
      (key) => profile.capabilities[key] === true,
    );
    if (capabilities.length === 0) {
      return 1;
    }
    const mapped = capabilities.filter((cap) =>
      recipe.mapping.capabilityFeatures.some((m) => m.capability === cap),
    ).length;
    return mapped / capabilities.length;
  }
}

/**
 * Scores a recipe by how many of the industry's enabled requirements it maps
 * to semantic features.
 */
export class RequirementCoverageRule implements RecipeRule {
  readonly id = 'requirement-coverage';

  constructor(public weight: number) {}

  evaluate(recipe: RecipeBlueprint, profile: IndustryProfile): number {
    const requirements = Object.keys(profile.requirements).filter(
      (key) => profile.requirements[key] === true,
    );
    if (requirements.length === 0) {
      return 1;
    }
    const satisfied = requirements.filter((req) =>
      recipe.mapping.capabilityFeatures.some((m) => m.capability === req),
    ).length;
    return satisfied / requirements.length;
  }
}

/** The result of selecting a recipe. */
export interface SelectionResult {
  /** The selected recipe, or undefined if none matched. */
  recipe: RecipeBlueprint | undefined;
  /** The compatibility score of the selected recipe (0..1). */
  score: number;
  /** All candidate recipes with their scores, sorted descending. */
  candidates: Array<{ recipe: RecipeBlueprint; score: number }>;
}

/**
 * The RecipeSelector.
 *
 * Evaluates registered recipes against an IndustryProfile using a set of
 * composable RecipeRules and returns the most compatible blueprint.
 */
export class RecipeSelector {
  /**
   * @param registry The recipe registry to select from.
   * @param rules The scoring rules to apply. Defaults to capability + requirement
   *              coverage with equal weights.
   */
  constructor(
    private readonly registry: RecipeRegistry,
    private readonly rules: RecipeRule[] = [
      new CapabilityCoverageRule(0.5),
      new RequirementCoverageRule(0.5),
    ],
  ) {}

  /**
   * Selects the most compatible recipe for the given industry profile.
   *
   * Returns undefined if no recipe supports the industry.
   */
  select(profile: IndustryProfile): SelectionResult {
    const candidates = this.registry
      .match(profile.industryId)
      .map((recipe) => ({ recipe, score: this.score(recipe, profile) }))
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    return {
      recipe: best?.recipe,
      score: best?.score ?? 0,
      candidates,
    };
  }

  /**
   * Computes a compatibility score (0..1) for a recipe against a profile by
   * summing the weighted evaluations of all registered rules.
   */
  private score(recipe: RecipeBlueprint, profile: IndustryProfile): number {
    const totalWeight = this.rules.reduce((acc, rule) => acc + rule.weight, 0);
    if (totalWeight === 0) {
      return 0;
    }
    const weighted = this.rules.reduce(
      (acc, rule) => acc + rule.weight * rule.evaluate(recipe, profile),
      0,
    );
    return weighted / totalWeight;
  }
}
