/**
 * AWIE V2 - The Recipe Merger (core orchestrator).
 *
 * Merges data from multiple sources into a complete, validated ThemeConfig.
 *
 * ARCHITECTURAL BOUNDARY (Phase 07.1):
 *   - The merger delegates ALL priority resolution to the PriorityResolver
 *     (Decision Policy). It contains NO hardcoded if/else priority chains.
 *   - The merger is COMPLETELY BLIND to the UI layout. It only produces a set
 *     of resolved semantic Features (and other conceptual strategies). The
 *     SectionMapper is the ONLY entity that translates Features into actual
 *     ThemeConfig UI Sections.
 *   - The final ThemeConfig is deeply immutable (treated as such) and flatly
 *     structured per Phase 06/07 rules.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration + mapping. It produces a ThemeConfig DATA structure and
 * NEVER renders UI components.
 */

import type { BusinessBrief } from '../question-engine/brief';
import type { IndustryProfile } from '../industry-registry';
import type {
  PageConfig,
  SectionConfig,
  ThemeConfig,
  ThemeResources,
} from '../theme-config/v2/types';
import type { RecipeBlueprint, FeatureId } from './types';
import { Feature } from './types';
import type { ContentPlan } from '../brain/content-plan';
import { ContentShape } from '../brain/content-plan';
import type { GeneratedContentSet } from '../brain/copywriter';
import { CAPABILITY_FEATURE_COMPATIBILITY } from '../brain/recipe-bridge';
import type { CapabilityId } from '../brain/capability';


import { PriorityResolver } from './priority-resolver';
import { SectionMapper } from './section-mapper';



/** User preferences that override recipe defaults. */
export interface UserPreferences {
  /** The site title. */
  title?: string;
  /** The site tagline. */
  tagline?: string;
  /** The site description. */
  description?: string;
  /** The primary color. */
  primaryColor?: string;
  /** The font pairing token. */
  font?: string;
  /** The preferred intent. */
  intent?: string;
  /** Arbitrary additional preferences. */
  [key: string]: unknown;
}

/** The inputs required to build a ThemeConfig. */
export interface MergeInput {
  /** The selected recipe. */
  recipe: RecipeBlueprint;
  /** The industry profile (from the Industry Registry). */
  industryProfile: IndustryProfile;
  /** The BusinessBrief (from the Question Engine). */
  brief: BusinessBrief;
  /** User preferences (highest priority). */
  userPreferences?: UserPreferences;
  /**
   * The AI #2 generated content set (Brain Step 08). When present, the merger
   * threads the generated copy into the matching semantic sections so the
   * produced ThemeConfig carries real content instead of empty placeholders.
   */
  content?: GeneratedContentSet;
  /**
   * The ContentPlan (Brain Step 07). Used to map each generated content item
   * back to its semantic capability so it can be routed to the correct section.
   */
  contentPlan?: ContentPlan;
}


/** The result of merging. */
export interface MergeResult {
  /** The produced ThemeConfig. */
  config: ThemeConfig;
  /** A list of conflict-resolution decisions made during the merge. */
  decisions: string[];
  /** A list of warnings (e.g. missing required capabilities). */
  warnings: string[];
}

/** System defaults (lowest priority). */
const SYSTEM_DEFAULTS = {
  locale: 'en',
  generator: 'awie-recipe-engine',
  generatorVersion: '0.1.0',
  font: 'sans',
  primaryColor: '#1f2937',
  backgroundColor: '#ffffff',
  textColor: '#111827',
} as const;

/** The set of valid intent values accepted by the ThemeConfig schema. */
const VALID_INTENTS = [
  'brand_experience',
  'authority',
  'conversion',
  'commerce',
  'community',
] as const;

/** A valid intent value. */
type IntentValue = (typeof VALID_INTENTS)[number];

/**
 * The RecipeMerger.
 *
 * The core orchestrator. It merges the recipe, industry profile, brief, and
 * user preferences into a valid ThemeConfig. It resolves semantic Features and
 * delegates all UI section construction to the SectionMapper.
 */
export class RecipeMerger {
  private readonly resolver = new PriorityResolver();
  private readonly sectionMapper = new SectionMapper();

  /**
   * Merges all inputs into a ThemeConfig.
   */
  merge(input: MergeInput): MergeResult {
    const decisions: string[] = [];
    const warnings: string[] = [];

    const { recipe, industryProfile, brief, userPreferences = {} } = input;

    // -------------------------------------------------------------------------
    // 1. Resolve the enabled semantic Features from the industry profile.
    //    The merger deals ONLY with capabilities/features, never UI sections.
    // -------------------------------------------------------------------------
    const { enabledFeatures, requiredFeatures, unmappedRequirements } =
      this.resolveFeatures(recipe, industryProfile);

    // -------------------------------------------------------------------------
    // 2. Delegate ALL UI section construction to the SectionMapper.
    // -------------------------------------------------------------------------
    const mapped = this.sectionMapper.map(
      recipe,
      enabledFeatures,
      requiredFeatures,
      unmappedRequirements,
    );

    decisions.push(...mapped.decisions);
    warnings.push(...mapped.warnings);
    const sections = mapped.sections;

    // -------------------------------------------------------------------------
    // 2b. Thread the AI #2 generated content into the semantic sections.
    //     The Brain pipeline produces a GeneratedContentSet (Step 08) that is
    //     keyed by ContentPlan requirement id (`content-<capability>`). We map
    //     each generated item back to its capability via the ContentPlan and
    //     write the copy into the matching section's content. This is the ONLY
    //     place generated copy enters the ThemeConfig; without it the sections
    //     would render as empty placeholders.
    // -------------------------------------------------------------------------
    if (input.content && input.contentPlan) {
      this.applyGeneratedContent(
        recipe,
        sections,
        input.content,
        input.contentPlan,
        decisions,
        warnings,
      );
    }


    // -------------------------------------------------------------------------
    // 3. Build the pages, injecting any required sections that were missing.
    // -------------------------------------------------------------------------
    const pages = this.buildPages(recipe, sections, decisions);


    // -------------------------------------------------------------------------
    // 4. Resolve metadata (title/tagline/description/locale) by priority.
    // -------------------------------------------------------------------------
    const title = this.resolver.resolve({
      user: userPreferences.title,
      recipe: recipe.content.defaultContent.title,
      system: 'Untitled Site',
      label: 'title',
    });
    const tagline = this.resolver.resolve({
      user: userPreferences.tagline,
      brief: brief.personality?.tone,
      recipe: recipe.content.defaultContent.tagline,
      system: '',
      label: 'tagline',
    });
    const description = this.resolver.resolve({
      user: userPreferences.description,
      brief: brief.goals?.primary,
      recipe: recipe.content.defaultContent.description,
      system: '',
      label: 'description',
    });
    const locale = this.resolver.resolve({
      user: userPreferences.locale as string | undefined,
      recipe: recipe.content.defaultContent.locale,
      system: SYSTEM_DEFAULTS.locale,
      label: 'locale',
    });
    decisions.push(title.decision, tagline.decision, description.decision, locale.decision);

    // -------------------------------------------------------------------------
    // 5. Resolve intent by priority.
    // -------------------------------------------------------------------------
    const intent = this.resolveIntent(userPreferences, brief, recipe, decisions);

    // -------------------------------------------------------------------------
    // 6. Resolve visual settings (skin/skeleton/typography) by priority.
    // -------------------------------------------------------------------------
    const primaryColor = this.resolver.resolve({
      user: userPreferences.primaryColor,
      recipe: recipe.presentation.preferredSkin.colorPalette,
      system: SYSTEM_DEFAULTS.primaryColor,
      label: 'primaryColor',
    });
    const font = this.resolver.resolve({
      user: userPreferences.font,
      recipe: recipe.presentation.preferredTypography.fontPairing,
      system: SYSTEM_DEFAULTS.font,
      label: 'font',
    });
    decisions.push(primaryColor.decision, font.decision);

    // -------------------------------------------------------------------------
    // 7. Assemble the ThemeConfig (deeply immutable, flatly structured).
    // -------------------------------------------------------------------------
    const resources: ThemeResources = {
      pages,
      sections,
      assets: recipe.assets.assets.map((asset) => ({
        id: asset.id,
        url: asset.url,
        mimeType: asset.mimeType,
        alt: asset.alt,
      })),
      settings: {
        primaryColor: primaryColor.value,
        font: font.value,
        backgroundColor: SYSTEM_DEFAULTS.backgroundColor,
        textColor: SYSTEM_DEFAULTS.textColor,
        skin: {
          colorPalette: primaryColor.value,
          fontPairing: font.value,
          buttonStyle: recipe.presentation.preferredSkin.buttonStyle,
        },
        skeleton: {
          headerType: recipe.presentation.preferredSkeleton.headerType,
          heroType: recipe.presentation.preferredSkeleton.heroType,
        },
        aiDesignReport: {
          analyzedIndustry: industryProfile.industryId,
          reasoning: `Recipe "${recipe.recipeId}" selected for industry "${industryProfile.industryId}".`,
        },
      },
      menus: [
        {
          id: 'main',
          label: 'Main',
          items: pages
            .filter((page) => !page.hidden)
            .map((page) => ({ label: page.title, target: page.route })),
        },
      ],
      forms: [],
    };

    // Referential integrity: the merger MUST NOT emit a ThemeConfig with
    // dangling references. The recipe blueprint defines no forms collection,
    // so any section.formId that does not resolve to a defined form is
    // stripped. This keeps the ThemeConfig valid for the ThemeValidator.
    const formIds = new Set(resources.forms.map((f) => f.id));
    for (const section of resources.sections) {
      if (section.formId !== undefined && !formIds.has(section.formId)) {
        const dangling = section.formId;
        delete section.formId;
        decisions.push(
          `Section "${section.id}" formId "${dangling}" stripped (no matching form defined).`,
        );
      }
    }

    const config: ThemeConfig = {
      metadata: {
        title: title.value,
        tagline: tagline.value,
        description: description.value,
        locale: locale.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generator: SYSTEM_DEFAULTS.generator,
        generatorVersion: SYSTEM_DEFAULTS.generatorVersion,
      },
      intent,
      resources,
      policies: {},
    };

    return { config, decisions, warnings };
  }

  // ---------------------------------------------------------------------------
  // Feature resolution (capability-level only; no UI knowledge)
  // ---------------------------------------------------------------------------

  /**
   * Resolves the enabled and required semantic Features from the industry
   * profile via the recipe's capability->feature mappings.
   *
   * Also detects required capabilities that have NO feature mapping in the
   * recipe (unmappedRequirements). These are passed to the SectionMapper for
   * default-section injection.
   */
  private resolveFeatures(
    recipe: RecipeBlueprint,
    profile: IndustryProfile,
  ): {
    enabledFeatures: FeatureId[];
    requiredFeatures: FeatureId[];
    unmappedRequirements: string[];
  } {
    const enabledFeatures: FeatureId[] = [];
    const requiredFeatures: FeatureId[] = [];
    const mappedCapabilities = new Set(
      recipe.mapping.capabilityFeatures.map((m) => m.capability),
    );

    for (const mapping of recipe.mapping.capabilityFeatures) {
      const enabled = profile.capabilities[mapping.capability] === true;
      if (enabled) {
        enabledFeatures.push(mapping.feature);
      }
      const required = profile.requirements[mapping.capability] === true;
      if (required) {
        requiredFeatures.push(mapping.feature);
      }
    }

    // Detect required capabilities that the recipe does not map to a feature.
    const unmappedRequirements = Object.keys(profile.requirements).filter(
      (capability) =>
        profile.requirements[capability] === true &&
        !mappedCapabilities.has(capability),
    );

    return { enabledFeatures, requiredFeatures, unmappedRequirements };
  }


  // ---------------------------------------------------------------------------
  // Generated content threading (Brain Step 08 → ThemeConfig)
  // ---------------------------------------------------------------------------

  /**
   * Threads the AI #2 generated content into the semantic sections.
   *
   * Each generated item is keyed by a ContentPlan requirement id
   * (`content-<capability>`). We resolve the requirement back to its semantic
   * capability, then translate that capability into the recipe's feature
   * vocabulary via the canonical CAPABILITY_FEATURE_COMPATIBILITY map,
   * intersect it with the features the recipe actually declares, and route the
   * generated copy into the matching section(s).
   *
   * This is a pure, deterministic mapping — it never invents content and never
   * changes the section structure. When a capability has no feature in the
   * recipe that can express it, a warning is emitted (never a silent drop) so
   * the caller can see that generated copy was not threaded.
   */
  private applyGeneratedContent(
    recipe: RecipeBlueprint,
    sections: SectionConfig[],
    content: GeneratedContentSet,
    contentPlan: ContentPlan,
    decisions: string[],
    warnings: string[],
  ): void {
    // Build requirementId -> capability lookup from the ContentPlan.
    const capabilityByRequirement = new Map<string, string>();
    for (const requirement of contentPlan.requirements) {
      capabilityByRequirement.set(requirement.id, requirement.capability);
    }

    // The set of features this recipe actually declares. Generated content may
    // only be routed to a section whose feature id is present in this set.
    const recipeFeatures = new Set<FeatureId>(
      recipe.mapping.capabilityFeatures.map((m) => m.feature),
    );

    for (const item of content.items) {
      const capability = capabilityByRequirement.get(item.requirementId);
      if (!capability) {
        continue;
      }

      // Translate the Brain capability into the recipe feature vocabulary.
      // CAPABILITY_FEATURE_COMPATIBILITY is the canonical capability -> feature
      // map; we intersect it with the features the recipe actually declares so
      // we never route content to a section the recipe does not produce.
      const candidateFeatures =
        CAPABILITY_FEATURE_COMPATIBILITY[capability as CapabilityId] ?? [];
      let targetFeatures = candidateFeatures.filter((feature: FeatureId) =>
        recipeFeatures.has(feature),
      );

      // HERO-PRIORITY ROUTING RULE (deterministic):
      // A generated item whose semantic shape is `hero` carries hero copy
      // (headline / subheadline / cta). When the recipe declares a `hero`
      // feature, that copy MUST be routed to the hero section ONLY — never
      // duplicated into a sibling feature (e.g. gallery) that also expresses
      // the same capability. This keeps the hero copy in the hero section and
      // prevents the gallery from being overwritten with hero boilerplate.
      if (item.shape === ContentShape.Hero && targetFeatures.includes(Feature.Hero)) {
        targetFeatures = [Feature.Hero];
      }

      if (targetFeatures.length === 0) {
        warnings.push(
          `Generated content "${item.id}" for capability "${capability}" was not threaded: recipe "${recipe.recipeId}" declares no feature that can express it.`,
        );
        continue;
      }

      // Route to every section whose id matches a resolved feature.
      const targets = sections.filter((s) =>
        targetFeatures.includes(s.id as FeatureId),
      );
      if (targets.length === 0) {
        warnings.push(
          `Generated content "${item.id}" for capability "${capability}" resolved to feature(s) [${targetFeatures.join(
            ', ',
          )}] but no matching section exists in the recipe.`,
        );
        continue;
      }

      for (const section of targets) {
        section.content = {
          ...section.content,
          ...this.toSectionContent(item),
        };
        decisions.push(
          `Generated content "${item.id}" applied to section "${section.id}" (capability "${capability}", feature "${section.id}").`,
        );
      }
    }
  }

  /**
   * Maps a generated content item's structured semantic fields into the
   * section content contract.
   *
   * The AI #2 output carries semantic fields (headline, subheadline, title,
   * body, cta, items). These are written into the section's `content` record
   * so the renderer can consume them. The flattened `body` is retained for
   * backward compatibility with consumers that read a single text field.
   */
  private toSectionContent(item: GeneratedContentSet['items'][number]): Record<
    string,
    unknown
  > {
    const fields = item.fields;
    const content: Record<string, unknown> = {};

    if (fields.headline !== undefined) content.headline = fields.headline;
    if (fields.subheadline !== undefined) {
      content.subheadline = fields.subheadline;
    }
    if (fields.title !== undefined) content.title = fields.title;
    if (fields.body !== undefined) content.body = fields.body;
    if (fields.cta !== undefined) content.cta = fields.cta;
    if (fields.items !== undefined && fields.items.length > 0) {
      content.items = fields.items;
    }

    // Always retain the flattened body for legacy consumers.
    if (content.body === undefined) content.body = item.body;

    return content;
  }



  // ---------------------------------------------------------------------------
  // Page building
  // ---------------------------------------------------------------------------


  /** Builds the pages, injecting required sections into the appropriate page. */
  private buildPages(
    recipe: RecipeBlueprint,
    sections: SectionConfig[],
    decisions: string[],
  ): PageConfig[] {
    const pages: PageConfig[] = recipe.content.pages.map((page) => ({
      id: page.id,
      route: page.route,
      title: page.title,
      isHome: page.isHome,
      sectionIds: page.sectionIds.filter((id) =>
        sections.some((s) => s.id === id),
      ),
    }));

    // Ensure every section is referenced by at least one page. Sections not
    // referenced by the recipe pages are appended to the home page.
    const home = pages.find((p) => p.isHome) ?? pages[0];
    if (home) {
      for (const section of sections) {
        const referenced = pages.some((p) => p.sectionIds.includes(section.id));
        if (!referenced) {
          home.sectionIds.push(section.id);
          decisions.push(
            `Section "${section.id}" appended to page "${home.id}".`,
          );
        }
      }
    }

    return pages;
  }

  // ---------------------------------------------------------------------------
  // Intent resolution (delegated to PriorityResolver)
  // ---------------------------------------------------------------------------

  /**
   * Resolves the intent by priority.
   *
   * The intent is a constrained enum in the ThemeConfig schema. The brief goal
   * is a free-form string, so it is only accepted when it is already a valid
   * intent value. Otherwise we fall back to the recipe's intent. This
   * guarantees the merger NEVER emits a schema-invalid ThemeConfig.
   */
  private resolveIntent(
    userPreferences: UserPreferences,
    brief: BusinessBrief,
    recipe: RecipeBlueprint,
    decisions: string[],
  ): ThemeConfig['intent'] {
    const briefGoal = brief.goals?.primary;
    const validBriefIntent = VALID_INTENTS.includes(briefGoal as IntentValue)
      ? (briefGoal as IntentValue)
      : undefined;

    const resolved = this.resolver.resolve<ThemeConfig['intent']>({
      user: userPreferences.intent as ThemeConfig['intent'] | undefined,
      brief: validBriefIntent,
      recipe: recipe.strategy.intent[0],
      system: undefined as ThemeConfig['intent'],
      label: 'intent',
    });
    decisions.push(resolved.decision);
    return resolved.value;
  }
}
