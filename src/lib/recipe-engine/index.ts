/**
 * AWIE V2 - Recipe Engine barrel export.
 *
 * The Recipe Engine transforms Industry Registry recommendations and the
 * BusinessBrief into a complete, validated ThemeConfig. It produces a
 * ThemeConfig DATA structure and NEVER renders UI components.
 *
 * Phase 07 is DESIGN ONLY. The final AI generation is intentionally not hooked
 * up yet.
 */
export {
  Feature,
  type CapabilityFeatureMapping,
  type CtaStrategy,
  type DefaultContentStrategy,
  type FeatureId,
  type HeroStrategy,

  type LayoutStrategy,
  type RecipeAsset,
  type RecipeAssetId,
  type RecipeAssets,
  type RecipeBlueprint,
  type RecipeContent,
  type RecipeId,
  type RecipeMapping,
  type RecipePage,
  type RecipePageId,
  type RecipePresentation,
  type RecipeSection,
  type RecipeSectionId,
  type RecipeStrategy,
  type SectionMappingStrategy,
  type TypographyStrategy,
} from './types';

export {
  PRIORITY_ORDER,
  PriorityResolver,
  type PrioritySource,
  type ResolveInput,
  type ResolveResult,
} from './priority-resolver';

export {
  SectionMapper,
  type SectionMappingResult,
} from './section-mapper';

export {
  DuplicateRecipeError,
  RecipeRegistry,
  UnknownRecipeError,
} from './registry';

export {
  CapabilityCoverageRule,
  RecipeSelector,
  RequirementCoverageRule,
  type RecipeRule,
  type SelectionResult,
} from './selector';

export {
  RecipeMerger,
  type MergeInput,
  type MergeResult,
  type UserPreferences,
} from './merger';

export {
  MODERN_BISTRO_RECIPE,
  MOCK_RECIPES,
} from './mocks';
