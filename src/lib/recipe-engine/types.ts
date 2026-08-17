/**
 * AWIE V2 - Recipe Engine Types.
 *
 * A Recipe is a reusable blueprint. It transforms Industry Registry
 * recommendations and the BusinessBrief into a complete, validated ThemeConfig.
 *
 * ARCHITECTURAL BOUNDARY (Phase 07.1):
 *   - A Recipe is a RECOMMENDATION, never a final configuration.
 *   - ThemeConfig is the Single Source of Truth (SSOT) for a site.
 *   - RecipeBlueprint therefore declares *preferred* values (preferredLayout,
 *     preferredSkin, ...). The final, decisive values live ONLY in ThemeConfig.
 *   - The blueprint is modularized into logical sub-types: presentation,
 *     content, strategy, assets, and mapping.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling.
 */

import type { IndustryId } from '../industry-registry';
import type {
  IntentType,
  SectionType,
  Skin,
  Skeleton,
} from '../theme-config/v2/types';

/** A stable identifier for a recipe (e.g. "modern-bistro"). */
export type RecipeId = string;

/** A stable identifier for a page within a recipe (e.g. "home"). */
export type RecipePageId = string;

/** A stable identifier for a section within a recipe (e.g. "hero"). */
export type RecipeSectionId = string;

/** A stable identifier for an asset within a recipe (e.g. "hero-bg"). */
export type RecipeAssetId = string;

/**
 * The Feature vocabulary.
 *
 * A Feature is a semantic capability-level concept derived from an industry
 * capability (e.g. "menu", "reservation", "contact"). Features are the
 * vocabulary the RecipeMerger operates on; they are NOT UI sections.
 *
 * STRICT CONSTRAINT: Features MUST be referenced via the `Feature` const object
 * (e.g. `Feature.Menu`), never as raw string literals. This guarantees type
 * safety across the entire Question Engine -> Recipe Engine -> Renderer
 * pipeline.
 */
export const Feature = {
  Menu: 'menu',
  Reservation: 'reservation',
  Address: 'address',
  Hours: 'hours',
  Contact: 'contact',
  Gallery: 'gallery',
  Testimonials: 'testimonials',
  Team: 'team',
  Blog: 'blog',
  Faq: 'faq',
  /**
   * Hero — a semantic Feature representing the primary hero content of a site
   * (headline / subheadline / cta). It is SEMANTIC content, NOT a UI
   * implementation detail. It is additive and does not replace any existing
   * Feature.
   */
  Hero: 'hero',
} as const;

/** The union of all valid Feature identifiers. */
export type FeatureId = (typeof Feature)[keyof typeof Feature];


// ---------------------------------------------------------------------------
// Strategy sub-types
// ---------------------------------------------------------------------------

/** The CTA strategy for the recipe. */
export interface CtaStrategy {
  /** The primary CTA label. */
  primaryLabel: string;
  /** The primary CTA target (route or action). */
  primaryTarget: string;
  /** Optional secondary CTA label. */
  secondaryLabel?: string;
  /** Optional secondary CTA target. */
  secondaryTarget?: string;
}

/** The hero strategy for the recipe. */
export interface HeroStrategy {
  /** The hero layout identifier. */
  layout: string;
  /** The hero headline template. */
  headline: string;
  /** The hero subheadline template. */
  subheadline: string;
}

/** The layout strategy for the recipe. */
export interface LayoutStrategy {
  /** The header layout identifier. */
  headerType: string;
  /** The footer layout identifier. */
  footerType: string;
  /** The overall page width token. */
  maxWidth: string;
}

/** The typography strategy for the recipe. */
export interface TypographyStrategy {
  /** The font pairing token. */
  fontPairing: string;
  /** The base font size token. */
  baseSize: string;
  /** The heading font weight. */
  headingWeight: string;
}

// ---------------------------------------------------------------------------
// Content sub-types
// ---------------------------------------------------------------------------

/** A page blueprint within a recipe. */
export interface RecipePage {
  /** The page id (e.g. "home"). */
  id: RecipePageId;
  /** The URL route (e.g. "/", "/about"). */
  route: string;
  /** The page title. */
  title: string;
  /** Whether this page is the home page. */
  isHome?: boolean;
  /** Ordered section ids composing this page. */
  sectionIds: RecipeSectionId[];
}

/** A section blueprint within a recipe. */
export interface RecipeSection {
  /** The section id (e.g. "hero"). */
  id: RecipeSectionId;
  /** The ThemeConfig section type. */
  type: SectionType;
  /** The layout identifier for this section. */
  layout: string;
  /** The section's content template. */
  content: Record<string, unknown>;
  /** Optional asset references. */
  assetIds?: RecipeAssetId[];
  /** Optional form reference. */
  formId?: string;
}

/** The default content strategy for the recipe. */
export interface DefaultContentStrategy {
  /** The default site title. */
  title: string;
  /** The default tagline. */
  tagline: string;
  /** The default description (SEO). */
  description: string;
  /** The default locale. */
  locale: string;
}

// ---------------------------------------------------------------------------
// Assets sub-type
// ---------------------------------------------------------------------------

/** An asset blueprint within a recipe. */
export interface RecipeAsset {
  /** The asset id (e.g. "hero-bg"). */
  id: RecipeAssetId;
  /** The asset URL or storage key. */
  url: string;
  /** The asset MIME type. */
  mimeType?: string;
  /** Alt text for accessibility. */
  alt?: string;
}

// ---------------------------------------------------------------------------
// Mapping sub-types
// ---------------------------------------------------------------------------

/**
 * Maps an industry capability (e.g. "supportsMenu") to a semantic feature
 * (e.g. "menu"). This is the capability-level vocabulary the RecipeMerger
 * operates on. It does NOT reference any UI section.
 */
export interface CapabilityFeatureMapping {
  /** The industry capability key (e.g. "supportsMenu"). */
  capability: string;
  /** The semantic feature this capability maps to (e.g. "menu"). */
  feature: FeatureId;
}

/**
 * Maps a semantic feature (e.g. "menu") to a ThemeConfig section type and
 * layout. This is the SectionMapping layer's vocabulary; it is the ONLY place
 * that knows how a feature becomes a UI section.
 */
export interface SectionMappingStrategy {
  /** The semantic feature this mapping responds to (e.g. "menu"). */
  feature: FeatureId;
  /** The ThemeConfig section type this feature maps to (e.g. "features"). */
  sectionType: SectionType;
  /** The layout identifier for the mapped section. */
  layout: string;
  /** The page this section should be placed on (e.g. "home"). */
  page: RecipePageId;
  /** The position/order of the section within the page. */
  order: number;
  /** Whether this mapping is mandatory (required by the industry). */
  required?: boolean;
}

// ---------------------------------------------------------------------------
// Modularized RecipeBlueprint
// ---------------------------------------------------------------------------

/**
 * The presentation module. These are RECOMMENDATIONS (preferred*), never final
 * configuration. The final values live only in ThemeConfig.
 */
export interface RecipePresentation {
  /** The preferred layout strategy. */
  preferredLayout: LayoutStrategy;
  /** The preferred skin (visual style module). */
  preferredSkin: Skin;
  /** The preferred skeleton (structural module). */
  preferredSkeleton: Skeleton;
  /** The preferred typography strategy. */
  preferredTypography: TypographyStrategy;
}

/** The content module: pages, sections, and default content. */
export interface RecipeContent {
  /** The pages defined by this recipe. */
  pages: RecipePage[];
  /** The sections defined by this recipe. */
  sections: RecipeSection[];
  /** The default content strategy. */
  defaultContent: DefaultContentStrategy;
}

/** The strategy module: intent, CTA, and hero. */
export interface RecipeStrategy {
  /** The business intents this recipe is suited for. */
  intent: IntentType[];
  /** The CTA strategy. */
  cta: CtaStrategy;
  /** The hero strategy. */
  hero: HeroStrategy;
}

/** The assets module. */
export interface RecipeAssets {
  /** The assets defined by this recipe. */
  assets: RecipeAsset[];
}

/** The mapping module: capability->feature and feature->section mappings. */
export interface RecipeMapping {
  /** Maps industry capabilities to semantic features. */
  capabilityFeatures: CapabilityFeatureMapping[];
  /** Maps semantic features to ThemeConfig sections. */
  sectionMappings: SectionMappingStrategy[];
}

/**
 * The RecipeBlueprint.
 *
 * A reusable, presentation-layer blueprint. It declares which industries it
 * supports and how their capabilities map to semantic features (and, via the
 * SectionMapping layer, to ThemeConfig sections).
 *
 * All configuration values are RECOMMENDATIONS (preferred*). ThemeConfig is
 * the SSOT for the final, decisive values.
 */
export interface RecipeBlueprint {
  /** The stable recipe id. */
  recipeId: RecipeId;
  /** The industries this recipe supports. */
  supportedIndustries: IndustryId[];
  /** The presentation module (recommendations only). */
  presentation: RecipePresentation;
  /** The content module. */
  content: RecipeContent;
  /** The strategy module. */
  strategy: RecipeStrategy;
  /** The assets module. */
  assets: RecipeAssets;
  /** The mapping module. */
  mapping: RecipeMapping;
}
