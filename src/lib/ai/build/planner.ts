/**
 * AWIE V2 - Milestone A2: Server-side BuildPlanner.
 *
 * Transforms a completed BusinessBrief into a deterministic ThemeConfig by
 * composing the existing, frozen engines:
 *
 *   BusinessBrief
 *     -> IndustryResolver (normalize + match industry)
 *     -> RecipeSelector  (score + pick recipe)
 *     -> RecipeMerger    (merge brief + profile + recipe -> ThemeConfig)
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The AI NEVER decides layout. The Planner is fully deterministic.
 *   - ThemeConfig is the immutable SSOT. The Planner produces a NEW ThemeConfig
 *     and NEVER mutates Core.
 *   - This module is a thin WRAPPER (Buy Before Build) over existing engines.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration + mapping.
 */

import type { BusinessBrief } from '../../question-engine/brief';
import type { IndustryProfile } from '../../industry-registry';
import {
  IndustryRegistry,
  IndustryResolver,
  GENERIC_PROFILE,
  MOCK_INDUSTRY_PROFILES,
} from '../../industry-registry';
import {
  RecipeRegistry,
  RecipeSelector,
  RecipeMerger,
  MOCK_RECIPES,
  type MergeResult,
} from '../../recipe-engine';
import type { ThemeConfig } from '../../theme-config/v2/types';

/** The input required to plan a site build. */
export interface PlanInput {
  /** The completed BusinessBrief. */
  brief: BusinessBrief;
  /** Optional user preferences that override recipe defaults. */
  userPreferences?: Record<string, unknown>;
}

/** The result of planning a site build. */
export interface PlanResult {
  /** The produced ThemeConfig (immutable SSOT). */
  config: ThemeConfig;
  /** The resolved industry profile. */
  industry: IndustryProfile;
  /** Whether the industry matched a registered profile. */
  industryMatched: boolean;
  /** The selected recipe id, if any. */
  recipeId: string | undefined;
  /** The recipe compatibility score (0..1). */
  recipeScore: number;
  /** The merge decisions recorded by the RecipeMerger. */
  decisions: string[];
  /** The merge warnings recorded by the RecipeMerger. */
  warnings: string[];
}

/**
 * The BuildPlanner.
 *
 * Resolves the industry from the brief's businessType, selects the most
 * compatible recipe, and merges everything into a ThemeConfig.
 */
export class BuildPlanner {
  private readonly industryResolver: IndustryResolver;
  private readonly recipeSelector: RecipeSelector;
  private readonly recipeMerger: RecipeMerger;

  constructor() {
    // Build the registries from the design-only mocks. In a future milestone
    // these are replaced by the real registry data sources.
    const industryRegistry = new IndustryRegistry();
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      industryRegistry.register(profile);
    }

    const recipeRegistry = new RecipeRegistry();
    for (const recipe of MOCK_RECIPES) {
      recipeRegistry.register(recipe);
    }

    this.industryResolver = new IndustryResolver(
      industryRegistry,
      GENERIC_PROFILE,
    );
    this.recipeSelector = new RecipeSelector(recipeRegistry);
    this.recipeMerger = new RecipeMerger();
  }

  /**
   * Plans a site build from a BusinessBrief.
   */
  plan(input: PlanInput): PlanResult {
    const { brief, userPreferences = {} } = input;

    // 1. Resolve the industry from the brief's business type.
    const rawBusinessType = brief.businessType?.primary ?? '';
    const resolution = this.industryResolver.resolve(rawBusinessType);
    const industry = resolution.profile;

    // 2. Select the most compatible recipe.
    const selection = this.recipeSelector.select(industry);
    const recipe = selection.recipe;

    // 3. Merge into a ThemeConfig. If no recipe matched, fall back to the
    //    generic profile + a minimal merge so the flow never hard-fails.
    let merge: MergeResult;
    if (recipe) {
      merge = this.recipeMerger.merge({
        recipe,
        industryProfile: industry,
        brief,
        userPreferences,
      });
    } else {
      // No recipe supports this industry: merge the generic profile against
      // the first registered recipe (or a minimal empty merge).
      const fallbackRecipe = this.recipeSelector.select(GENERIC_PROFILE).recipe;
      merge = fallbackRecipe
        ? this.recipeMerger.merge({
            recipe: fallbackRecipe,
            industryProfile: GENERIC_PROFILE,
            brief,
            userPreferences,
          })
        : this.emptyMerge(brief, userPreferences);
    }

    return {
      config: merge.config,
      industry,
      industryMatched: resolution.matched,
      recipeId: recipe?.recipeId,
      recipeScore: selection.score,
      decisions: merge.decisions,
      warnings: merge.warnings,
    };
  }

  /** Produces a minimal ThemeConfig when no recipe is available at all. */
  private emptyMerge(
    brief: BusinessBrief,
    userPreferences: Record<string, unknown>,
  ): MergeResult {
    const title =
      (userPreferences.title as string) ||
      brief.businessType?.primary ||
      'Untitled Site';
    const config: ThemeConfig = {
      metadata: {
        title,
        tagline: brief.personality?.tone ?? '',
        description: brief.goals?.primary ?? '',
        locale: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generator: 'awie-build-planner',
        generatorVersion: '0.1.0',
      },
      intent: 'brand_experience',
      resources: {
        pages: [],
        sections: [],
        assets: [],
        settings: {
          primaryColor: '#1f2937',
          font: 'sans',
          backgroundColor: '#ffffff',
          textColor: '#111827',
          skin: {
            colorPalette: '#1f2937',
            fontPairing: 'sans',
            buttonStyle: 'rounded',
          },
          skeleton: {
            headerType: 'sticky',
            heroType: 'split',
          },
          aiDesignReport: {
            analyzedIndustry: 'generic',
            reasoning: 'No recipe matched; produced a minimal ThemeConfig.',
          },
        },
        menus: [],
        forms: [],
      },
      policies: {},
    };
    return {
      config,
      decisions: ['No recipe matched; produced a minimal ThemeConfig.'],
      warnings: ['No recipe available for the resolved industry.'],
    };
  }
}
