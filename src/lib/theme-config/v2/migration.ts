/**
 * AWIE V2 - ThemeConfig migration adapter.
 *
 * Older ThemeConfig versions migrate through adapters. The renderer supports
 * only the current schema version. This adapter:
 *
 *   - supports(): reports whether a given input can be migrated
 *   - migrate():  converts a legacy config into ThemeConfig v2
 *   - validate(): validates the migrated result
 *   - preview():  generates a migration report without mutating anything
 *
 * The legacy shape is the pre-v2 ThemeConfig (see src/types/site.ts) which used
 * a flat `presetId`/`skin`/`skeleton`/`sections`/`content`/`pages` structure.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It maps
 * data shapes only — it does NOT inject industry-specific defaults.
 */

import { CURRENT_SCHEMA_VERSION } from './types';
import type { ThemeConfig } from './types';
import { ThemeConfigValidator } from './validator';
import type { ThemeConfigValidationResult } from './validator';

/** The legacy ThemeConfig shape (pre-v2). */
export interface LegacyThemeConfig {
  presetId?: string;
  colorPalette?: string;
  fontPairing?: string;
  layoutStyle?: string;
  buttonStyle?: string;
  intentType?: string;
  skin?: {
    color_palette?: string;
    font_pairing?: string;
  };
  skeleton?: {
    header_type?: string;
    hero_type?: string;
  };
  aiDesignReport?: {
    analyzed_industry?: string;
    reasoning?: string;
  };
  sections?: string[];
  content?: {
    hero_title?: string;
    hero_subtitle?: string;
    about_bio?: string;
  };
  pages?: Array<{
    id?: string;
    slug?: string;
    title?: string;
    description?: string;
  }>;
}

/** The result of a migration. */
export interface MigrationResult {
  /** The migrated ThemeConfig v2. */
  config: ThemeConfig;
  /** The validation result of the migrated config. */
  validation: ThemeConfigValidationResult;
  /** Human-readable notes about the migration. */
  notes: string[];
}

/** A single entry in a migration preview report. */
export interface MigrationPreviewEntry {
  /** The source field being migrated. */
  source: string;
  /** The destination field in the v2 config. */
  destination: string;
  /** Whether the value was mapped, defaulted, or dropped. */
  status: 'mapped' | 'defaulted' | 'dropped';
  /** A human-readable note. */
  note: string;
}

/** A migration preview report. */
export interface MigrationPreview {
  /** Whether the input is a supported legacy config. */
  supported: boolean;
  /** The target schema version. */
  targetVersion: number;
  /** The per-field mapping report. */
  entries: MigrationPreviewEntry[];
}

/**
 * Migrates a legacy ThemeConfig into ThemeConfig v2.
 */
export class ThemeConfigMigrationAdapter {
  private readonly validator: ThemeConfigValidator;

  constructor(validator?: ThemeConfigValidator) {
    this.validator = validator ?? new ThemeConfigValidator();
  }

  /**
   * Returns whether the given input can be migrated by this adapter.
   */
  supports(input: unknown): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }
    const candidate = input as Record<string, unknown>;
    // A v2 config already has a `metadata` field — not a legacy config.
    if (candidate.metadata && typeof candidate.metadata === 'object') {
      return false;
    }
    // Legacy configs carry at least one recognizable field.
    return (
      'presetId' in candidate ||
      'skin' in candidate ||
      'skeleton' in candidate ||
      'sections' in candidate ||
      'content' in candidate ||
      'pages' in candidate
    );
  }

  /**
   * Generates a migration preview report without mutating anything.
   */
  preview(input: unknown): MigrationPreview {
    const entries: MigrationPreviewEntry[] = [];

    if (!this.supports(input)) {
      return { supported: false, targetVersion: CURRENT_SCHEMA_VERSION, entries };
    }

    const legacy = input as LegacyThemeConfig;

    entries.push({
      source: 'pages[0].title / content.hero_title',
      destination: 'metadata.title',
      status: this.firstString(legacy.pages?.[0]?.title, legacy.content?.hero_title)
        ? 'mapped'
        : 'defaulted',
      note: 'Site title',
    });
    entries.push({
      source: 'skin.color_palette / colorPalette',
      destination: 'resources.settings.skin.colorPalette',
      status: legacy.skin?.color_palette || legacy.colorPalette ? 'mapped' : 'defaulted',
      note: 'Color palette',
    });
    entries.push({
      source: 'skin.font_pairing / fontPairing',
      destination: 'resources.settings.skin.fontPairing',
      status: legacy.skin?.font_pairing || legacy.fontPairing ? 'mapped' : 'defaulted',
      note: 'Font pairing',
    });
    entries.push({
      source: 'skeleton.header_type / layoutStyle',
      destination: 'resources.settings.skeleton.headerType',
      status: legacy.skeleton?.header_type || legacy.layoutStyle ? 'mapped' : 'defaulted',
      note: 'Header layout',
    });
    entries.push({
      source: 'skeleton.hero_type',
      destination: 'resources.settings.skeleton.heroType',
      status: legacy.skeleton?.hero_type ? 'mapped' : 'defaulted',
      note: 'Hero layout',
    });
    entries.push({
      source: 'intentType',
      destination: 'intent',
      status: this.asIntent(legacy.intentType) ? 'mapped' : 'dropped',
      note: 'Business intent (dropped if not a valid IntentType)',
    });
    entries.push({
      source: 'sections[]',
      destination: 'resources.sections[]',
      status: legacy.sections && legacy.sections.length > 0 ? 'mapped' : 'defaulted',
      note: 'Section definitions (promoted to self-contained sections)',
    });
    entries.push({
      source: 'pages[]',
      destination: 'resources.pages[]',
      status: legacy.pages && legacy.pages.length > 0 ? 'mapped' : 'defaulted',
      note: 'Navigation pages',
    });
    entries.push({
      source: 'content.hero_subtitle / about_bio',
      destination: 'metadata.description',
      status: legacy.content?.hero_subtitle || legacy.content?.about_bio ? 'mapped' : 'dropped',
      note: 'Description',
    });

    return { supported: true, targetVersion: CURRENT_SCHEMA_VERSION, entries };
  }

  /**
   * Migrates a legacy ThemeConfig into ThemeConfig v2.
   */
  migrate(input: unknown): MigrationResult {
    const notes: string[] = [];

    if (!this.supports(input)) {
      throw new Error(
        'ThemeConfigMigrationAdapter: input is not a supported legacy ThemeConfig'
      );
    }

    const legacy = input as LegacyThemeConfig;

    // --- Metadata ---
    const title = this.firstString(
      legacy.pages?.[0]?.title,
      legacy.content?.hero_title,
      'Untitled Site'
    );
    const description = this.firstString(
      legacy.pages?.[0]?.description,
      legacy.content?.hero_subtitle,
      legacy.content?.about_bio
    );
    const now = new Date().toISOString();

    // --- Skin / Skeleton / AiDesignReport (moved into resources.settings) ---
    const skin = legacy.skin
      ? {
          colorPalette:
            legacy.skin.color_palette ?? legacy.colorPalette ?? 'default',
          fontPairing: legacy.skin.font_pairing ?? legacy.fontPairing ?? 'sans',
          buttonStyle: legacy.buttonStyle,
        }
      : undefined;

    const skeleton = legacy.skeleton
      ? {
          headerType: legacy.skeleton.header_type ?? legacy.layoutStyle ?? 'logo-left',
          heroType: legacy.skeleton.hero_type ?? 'cover',
        }
      : undefined;

    const aiDesignReport = legacy.aiDesignReport
      ? {
          analyzedIndustry:
            legacy.aiDesignReport.analyzed_industry ?? 'unknown',
          reasoning: legacy.aiDesignReport.reasoning ?? '',
        }
      : undefined;

    // --- Intent ---
    const intent = this.asIntent(legacy.intentType);

    // --- Sections ---
    // Legacy `sections` was an ordered list of section identifiers. We promote
    // each to a self-contained section with a generic `custom` type and empty
    // content, preserving order.
    const sectionIds = legacy.sections ?? [];
    const sections = sectionIds.map((id, index) => ({
      id,
      type: 'custom' as const,
      content: {},
      settings: { order: index },
    }));

    // --- Pages ---
    // Legacy `pages` were navigation pages. We build a home page referencing
    // all sections, plus one page per legacy page entry.
    const pages: ThemeConfig['resources']['pages'] = [
      {
        id: 'home',
        route: '/',
        title,
        description,
        sectionIds,
        isHome: true,
      },
      ...(legacy.pages ?? []).map((page, index) => ({
        id: page.id ?? `page-${index + 1}`,
        route: `/${page.slug ?? page.id ?? `page-${index + 1}`}`,
        title: page.title ?? `Page ${index + 1}`,
        description: page.description,
        sectionIds: [],
      })),
    ];

    // --- Assets ---
    const assets: ThemeConfig['resources']['assets'] = [];

    // --- Settings ---
    const settings: ThemeConfig['resources']['settings'] = {
      skin,
      skeleton,
      aiDesignReport,
    };

    // --- Menus ---
    const menus = [
      {
        id: 'main',
        label: 'Main',
        items: pages
          .filter((p) => !p.isHome)
          .map((p) => ({ label: p.title, target: `page:${p.id}` })),
      },
    ];

    // --- Forms ---
    const forms: ThemeConfig['resources']['forms'] = [];

    const config: ThemeConfig = {
      metadata: {
        title,
        description,
        createdAt: now,
        updatedAt: now,
        generator: 'awie-migration-adapter',
        generatorVersion: CURRENT_SCHEMA_VERSION.toString(),
      },
      intent,
      resources: {
        pages,
        sections,
        assets,
        settings,
        menus,
        forms,
      },
      policies: {},
    };

    notes.push(
      `Migrated legacy ThemeConfig to schema v${CURRENT_SCHEMA_VERSION}`
    );
    if (sectionIds.length === 0) {
      notes.push('Legacy config had no sections; home page is empty');
    }

    const validation = this.validator.validate(config);
    return { config, validation, notes };
  }

  /**
   * Validates a ThemeConfig v2 (or migrates + validates a legacy config).
   */
  validate(input: unknown): ThemeConfigValidationResult {
    if (this.supports(input)) {
      return this.migrate(input).validation;
    }
    return this.validator.validate(input);
  }

  /** Returns the first defined string among the given values. */
  private firstString(...values: Array<string | undefined>): string {
    for (const value of values) {
      if (value && value.trim().length > 0) {
        return value;
      }
    }
    return 'Untitled Site';
  }

  /** Coerces a legacy intent string into a valid IntentType, if possible. */
  private asIntent(value: string | undefined): ThemeConfig['intent'] {
    const valid = [
      'brand_experience',
      'authority',
      'conversion',
      'commerce',
      'community',
    ] as const;
    if (value && (valid as readonly string[]).includes(value)) {
      return value as ThemeConfig['intent'];
    }
    return undefined;
  }
}
