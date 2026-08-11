/**
 * AWIE Design Intelligence — ThemeConfig Bridge.
 *
 * This is the ONLY boundary that writes a VisualDesignDecision (HOW) into the
 * renderer-facing ThemeConfig. It is a pure ADAPTER: it does NOT make design
 * decisions, it does NOT re-interpret the user's input, and it does NOT create
 * a second Brain. It only materializes an already-produced decision into the
 * ThemeConfig's existing, renderer-consumable slots.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - Design Intelligence decides (HOW) → VisualDesignDecision.
 *   - This bridge WRITES that decision into ThemeConfig.
 *   - The Renderer consumes ThemeConfig only. It never sees this bridge.
 *
 * WRITE TARGETS (all within the existing ThemeConfig v2 shape):
 *   - resources.settings.design        → the full design decision (index sig).
 *   - resources.settings.skin          → palette / typography tokens.
 *   - resources.settings.skeleton      → hero variant / layout language.
 *   - section.settings.variant         → per-section variant.
 *   - section.settings.imageTreatment  → per-section image treatment.
 *   - resources.menus                  → default menu preserved + custom menus.
 *   - resources.pages                  → custom pages (menu → page → route).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It is a thin
 * deterministic adapter over the existing ThemeConfig v2 contract.
 */

import type { SectionConfig, ThemeConfig } from '../theme-config/v2/types';
import type { RecipeBlueprint } from '../recipe-engine/types';
import type { VisualDesignDecision } from './types';



/** The default menu that is ALWAYS preserved. */
export const DEFAULT_MENU = [
  { label: 'HOME', target: '/' },
  { label: 'ABOUT', target: '/about' },
  { label: 'DIARY', target: '/diary' },
  { label: 'CONTACT', target: '/contact' },
] as const;

/**
 * The ThemeConfig Bridge input.
 *
 * The VisualDesignDecision (produced by Design Intelligence) plus the
 * ThemeConfig produced by the existing RecipeMerger. The bridge never mutates
 * the decision; it writes it into the config.
 */
export interface DesignThemeConfigBridgeInput {
  /** The VisualDesignDecision (HOW). Never mutated. */
  decision: VisualDesignDecision;
  /** The ThemeConfig produced by the existing RecipeMerger. */
  config: ThemeConfig;
  /**
   * The selected RecipeBlueprint (optional). When present, the bridge lifts
   * recipe-level CTA copy (strategy.cta) into the renderer-facing
   * ctaLabel / ctaHref content fields. It is never used to re-interpret the
   * user's input.
   */
  recipe?: RecipeBlueprint;
}


/**
 * The ThemeConfig Bridge result.
 *
 * On success it returns the enriched ThemeConfig (a new object; the input
 * config is never mutated). On failure it returns a structured error.
 */
export type DesignThemeConfigBridgeResult =
  | { ok: true; config: ThemeConfig }
  | { ok: false; error: { message: string } };

/**
 * The Design Intelligence ThemeConfig Bridge.
 *
 * Writes the VisualDesignDecision into the renderer-facing ThemeConfig. It is
 * deterministic: the same decision + config always produces the same result.
 */
export class DesignThemeConfigBridge {
  /**
   * Enriches a ThemeConfig with the VisualDesignDecision.
   *
   * The input config is never mutated; a new config object is returned. All
   * writes target existing ThemeConfig v2 slots (settings index signature,
   * section settings index signature, menus, pages).
   */
  build(input: DesignThemeConfigBridgeInput): DesignThemeConfigBridgeResult {
    const { decision, config, recipe } = input;

    // 1. Write the full design decision into settings.design.
    const settings = {
      ...config.resources.settings,
      design: decision,
      skin: {
        ...config.resources.settings.skin,
        colorPalette: this.paletteToken(decision),
        fontPairing: this.fontToken(decision),
      },
      skeleton: {
        ...config.resources.settings.skeleton,
        heroType: decision.heroVariant,
        headerType: this.headerType(decision),
      },
    };

    // 2. Apply hero variant + image treatment to the hero section, and the
    //    section variant to each matching section. Also lift the recipe's
    //    content into the renderer-facing content contract (title / subtitle /
    //    body / ctaLabel / ctaHref / images) so the Renderer can consume it.
    const sections = config.resources.sections.map((section) => {
      const sectionSettings = { ...(section.settings ?? {}) };

      if (section.type === 'hero') {
        sectionSettings.variant = decision.heroVariant;
        sectionSettings.imageTreatment = decision.imageTreatment;
        sectionSettings.ctaPriority = decision.ctaPriority;
      } else {
        const variant = this.sectionVariantFor(decision, section.type);
        if (variant) {
          sectionSettings.variant = variant;
        }
        sectionSettings.imageTreatment = decision.imageTreatment;
      }

      const content = this.normalizeContent(
        section,
        recipe,
        config.resources.assets,
      );

      return { ...section, content, settings: sectionSettings };
    });


    // 3. Preserve the default menu and append custom menus.
    const menus = this.buildMenus(decision, config);

    // 4. Preserve default pages and append custom pages. Custom pages must
    //    reference sections that actually exist in resources.sections, so the
    //    sections array is passed through and any missing referenced section is
    //    materialized as a real definition.
    const { pages, missingSections } = this.buildPages(decision, config, sections);

    // Merge any materialized sections into the sections collection so every
    // page reference resolves to a real, renderable section definition.
    const allSections = missingSections.length > 0
      ? [...sections, ...missingSections]
      : sections;

    const resources = {
      ...config.resources,
      settings,
      sections: allSections,
      menus,
      pages,
    };


    return {
      ok: true,
      config: { ...config, resources },
    };
  }

  /**
   * Resolves the section variant for a given section type from the decision's
   * ordered section plan.
   *
   * This is a pure lookup into the decision's section plan. Unknown types fall
   * back to the first non-hero section variant.
   */
  private sectionVariantFor(
    decision: VisualDesignDecision,
    type: string,
  ): string | undefined {
    const match = decision.sections.find((section) => section.type === type);
    if (match) {
      return match.variant;
    }
    // Fallback: the first non-hero section variant.
    const first = decision.sections.find((section) => section.type !== 'hero');
    return first?.variant;
  }

  /**
   * Builds the navigation menus.
   *
   * The default menu (HOME / ABOUT / DIARY / CONTACT) is ALWAYS preserved.
   * Custom menus derived from the decision's section plan are appended after
   * it. Existing menus in the config are preserved and merged.
   */
  private buildMenus(
    decision: VisualDesignDecision,
    config: ThemeConfig,
  ): ThemeConfig['resources']['menus'] {
    const existing = config.resources.menus ?? [];

    // Build the main menu: default items + custom menu items.
    const defaultItems = DEFAULT_MENU.map((item) => ({ ...item }));
    const customItems = this.customMenuItems(decision);

    const mainMenu = {
      id: 'main',
      label: 'Main',
      items: [...defaultItems, ...customItems],
    };

    // Preserve any existing menus that are not the main menu.
    const otherMenus = existing.filter((menu) => menu.id !== 'main');

    return [mainMenu, ...otherMenus];
  }

  /**
   * Derives custom menu items from the decision's section plan.
   *
   * Sections that represent a distinct navigable page (gallery, services,
   * products, programs, classes, etc.) become real menu entries. Each entry
   * points to a real route.
   */
  private customMenuItems(
    decision: VisualDesignDecision,
  ): { label: string; target: string }[] {
    const items: { label: string; target: string }[] = [];
    for (const section of decision.sections) {
      const route = this.routeForSection(section.type, section.label);
      if (route) {
        items.push({ label: section.label, target: route });
      }
    }
    return items;
  }

  /**
   * Builds the pages collection.
   *
   * Preserves all existing pages and appends custom pages (menu → page →
   * route) derived from the decision's section plan. Each custom page is a
   * real page definition with a route and a section reference.
   *
   * SECTION-REFERENCE INVARIANT: every custom page's `sectionIds` entry must
   * resolve to a section that actually exists in `resources.sections`. The
   * section-mapper keys sections by their feature id (e.g. `team`, `gallery`),
   * which may differ from the section type (e.g. `features`). If a referenced
   * section is missing, a minimal definition is materialized so the renderer
   * can always resolve the page. This keeps the Recipe → ThemeConfig →
   * Renderer contract consistent.
   */
  private buildPages(
    decision: VisualDesignDecision,
    config: ThemeConfig,
    sections: SectionConfig[],
  ): {
    pages: ThemeConfig['resources']['pages'];
    missingSections: SectionConfig[];
  } {

    const existing = config.resources.pages ?? [];

    const customPages = decision.sections
      .map((section) => {
        const route = this.routeForSection(section.type, section.label);
        if (!route) {
          return null;
        }
        return {
          id: `page-${section.type}`,
          route,
          title: section.label,
          sectionIds: [section.type],
          hidden: false,
        };
      })
      .filter((page): page is NonNullable<typeof page> => page !== null);

    // Materialize any section referenced by a custom page that does not yet
    // exist in resources.sections. The section id equals the section type so
    // the page reference resolves, and the type is a valid registered
    // SectionType so the renderer can render it.
    const existingIds = new Set(sections.map((section) => section.id));
    const missingSections: SectionConfig[] = [];
    for (const page of customPages) {
      for (const sectionId of page.sectionIds) {
        if (!existingIds.has(sectionId)) {
          missingSections.push({
            id: sectionId,
            type: sectionId as SectionConfig['type'],
            content: {},
            settings: {},
          });
          existingIds.add(sectionId);
        }
      }
    }

    return {
      pages: [...existing, ...customPages],
      missingSections,
    };
  }



  /**
   * Maps a section type + label to a real route.
   *
   * Only sections that represent a distinct navigable page produce a route.
   * Hero, about, diary, and contact are already covered by the default menu.
   */
  private routeForSection(type: string, label: string): string | null {
    switch (type) {
      case 'hero':
      case 'about':
      case 'diary':
      case 'contact':
        return null;
      case 'gallery':
        return '/gallery';
      case 'features':
        return '/services';
      case 'cta':
        return '/booking';
      case 'text':
        return '/story';
      default:
        // A custom section type becomes a slugified route.
        const slug = label
          .toLowerCase()
          .replace(/[^a-z0-9\uac00-\ud7af]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return slug ? `/${slug}` : null;
    }
  }

  /**
   * Resolves a stable palette token from the decision.
   *
   * Design Intelligence does NOT generate arbitrary HEX values. It selects a
   * palette token that maps to the EXISTING project palette system
   * (src/constants/presets.ts: default / modern / warm / luxury / minimal).
   * The renderer's theme-provider resolves these tokens to concrete colors.
   */
  private paletteToken(decision: VisualDesignDecision): string {
    switch (decision.primaryArchetype) {
      case 'WARM_HUMAN':
        return 'warm';
      case 'TRUST_PROFESSIONAL':
        return 'default';
      case 'VISUAL_SHOWCASE':
        return 'minimal';
      case 'MODERN_SERVICE':
        return 'modern';
      case 'CALM_WELLNESS':
        return 'warm';
      case 'MINIMAL_EDITORIAL':
      default:
        return 'minimal';
    }
  }

  /**
   * Resolves a stable font token from the decision.
   *
   * Design Intelligence does NOT generate arbitrary font families. It selects
   * a token that maps to the EXISTING project typography system
   * (src/constants/presets.ts FONT_PAIRINGS: default / modern / warm / luxury /
   * minimal). The renderer's theme-provider resolves these to font classes.
   */
  private fontToken(decision: VisualDesignDecision): string {
    switch (decision.typography) {
      case 'EDITORIAL':
        return 'default';
      case 'FRIENDLY':
        return 'warm';
      case 'PROFESSIONAL':
        return 'default';
      case 'NEUTRAL':
        return 'minimal';
      case 'MODERN':
        return 'modern';
      case 'CALM':
        return 'warm';
      default:
        return 'default';
    }
  }


  /**
   * Resolves the header layout token from the decision.
   */
  private headerType(decision: VisualDesignDecision): string {
    switch (decision.primaryArchetype) {
      case 'MINIMAL_EDITORIAL':
        return 'minimal';
      case 'VISUAL_SHOWCASE':
        return 'overlay';
      case 'TRUST_PROFESSIONAL':
        return 'structured';
      default:
        return 'default';
    }
  }

  /**
   * Normalizes a section's content into the renderer-facing content contract.
   *
   * The RecipeMerger copies the recipe's content verbatim into
   * `section.content` using recipe-contract field names (headline /
   * subheadline / heading / body / items / images). The Renderer consumes a
   * different, stable content contract (title / subtitle / body / ctaLabel /
   * ctaHref / images). This method is a pure, deterministic ADAPTER that lifts
   * the recipe content into the renderer contract WITHOUT inventing copy:
   *
   *   - title    ← existing title, else headline, else heading
   *   - subtitle ← existing subtitle, else subheadline
   *   - body     ← existing body, else description, else text
   *   - ctaLabel / ctaHref ← existing values, else the recipe's strategy.cta
   *   - imageUrl / images  ← resolved from the section's assetIds
   *
   * Existing renderer-contract values are ALWAYS preserved. Nothing is
   * removed, and no business copy is fabricated.
   */
  private normalizeContent(
    section: SectionConfig,
    recipe: RecipeBlueprint | undefined,
    assets: ThemeConfig['resources']['assets'],
  ): Record<string, unknown> {
    const content = { ...(section.content ?? {}) } as Record<string, unknown>;

    // Title: prefer an existing renderer title, else recipe headline/heading.
    if (content.title === undefined) {
      const title = content.headline ?? content.heading;
      if (title !== undefined) {
        content.title = title;
      }
    }

    // Subtitle: prefer an existing subtitle, else recipe subheadline.
    if (content.subtitle === undefined && content.subheadline !== undefined) {
      content.subtitle = content.subheadline;
    }

    // Body: prefer an existing body, else recipe description/text.
    if (content.body === undefined) {
      const body = content.description ?? content.text;
      if (body !== undefined) {
        content.body = body;
      }
    }

    // CTA: prefer existing ctaLabel/ctaHref, else the recipe's strategy.cta.
    if (recipe?.strategy?.cta) {
      if (content.ctaLabel === undefined && recipe.strategy.cta.primaryLabel) {
        content.ctaLabel = recipe.strategy.cta.primaryLabel;
      }
      if (content.ctaHref === undefined && recipe.strategy.cta.primaryTarget) {
        content.ctaHref = recipe.strategy.cta.primaryTarget;
      }
    }

    // Images: resolve the section's assetIds to concrete asset URLs.
    if (section.assetIds && section.assetIds.length > 0) {
      const urls = section.assetIds
        .map((id) => assets.find((asset) => asset.id === id)?.url)
        .filter((url): url is string => Boolean(url));
      if (urls.length > 0) {
        if (section.type === 'hero' && content.imageUrl === undefined) {
          content.imageUrl = urls[0];
        }
        if (content.images === undefined) {
          content.images = urls;
        }
      }
    }

    return content;
  }
}


