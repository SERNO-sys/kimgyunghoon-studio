/**
 * AWIE V2 - Phase 14.5: CMS Infrastructure - DefaultCompositionService.
 *
 * This is the CONCRETE Composition Engine. It is the SOLE ORCHESTRATOR that
 * assembles the execution inputs into a ThemeConfig.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. The Sole Orchestrator. DefaultCompositionService implements
 *    ICompositionService. It is the ONLY component allowed to assemble the
 *    execution inputs into a ThemeConfig.
 *
 * 2. Reader Isolation. Readers MUST NOT know each other. This service is the
 *    exclusive orchestrator allowed to invoke multiple Readers. The four
 *    Readers (IStructureReader, IPresentationReader, ILocalizationReader,
 *    IFeatureReader) are injected via the constructor.
 *
 * 3. Zero Business Logic. compose(request) is a PURE PIPELINE:
 *    - Fetch the records via the Readers (StructureRecord, PresentationRecord,
 *      LocalizationRecord, FeatureRecord).
 *    - Merge/Map these passive DTOs directly into the ThemeConfig shape.
 *    - Do NOT write if (locale === '...') or any fallback logic. Just
 *      orchestrate and assemble.
 *
 * 4. Deterministic Assembly. The output MUST strictly match the ThemeConfig
 *    type imported from src/lib/theme-config/v2/types.
 *
 * 5. STRICTLY Side-Effect Free. This service MUST NOT mutate Project,
 *    LocaleVariant, Brand, Plugin, or any CMS model. Its singular, immutable
 *    responsibility is to output a ThemeConfig.
 * ============================================================================
 */

import type {
  ThemeConfig,
  ThemeResources,
  ThemeConfigMetadata,
  ThemeConfigVersioning,
  ThemePolicies,
  ThemeSeo,
  OpenGraphConfig,
  TwitterConfig,
  JsonLdNode,
  PageConfig,
  SectionConfig,
  AssetConfig,
  SiteSettings,
  MenuConfig,
  FormConfig,
} from '../../../lib/theme-config/v2/types';
import { CURRENT_SCHEMA_VERSION } from '../../../lib/theme-config/v2/types';
import type {
  CompositionRequest,
  ICompositionService,
  IStructureReader,
  IPresentationReader,
  ILocalizationReader,
  IFeatureReader,
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
  GlobalSeoRecord,
  LocalSeoRecord,
  PluginSeoRecord,
} from './types';


/**
 * The concrete Composition Engine.
 *
 * Implements ICompositionService. The constructor injects the four Readers.
 * This is the ONLY component allowed to invoke multiple Readers and assemble
 * the execution inputs into a ThemeConfig.
 */
export class DefaultCompositionService implements ICompositionService {
  private readonly structureReader: IStructureReader;
  private readonly presentationReader: IPresentationReader;
  private readonly localizationReader: ILocalizationReader;
  private readonly featureReader: IFeatureReader;

  constructor(
    structureReader: IStructureReader,
    presentationReader: IPresentationReader,
    localizationReader: ILocalizationReader,
    featureReader: IFeatureReader,
  ) {
    this.structureReader = structureReader;
    this.presentationReader = presentationReader;
    this.localizationReader = localizationReader;
    this.featureReader = featureReader;
  }

  /**
   * Composes a Project into a single immutable ThemeConfig.
   *
   * PURE PIPELINE: fetch the records via the Readers, then merge/map these
   * passive DTOs directly into the ThemeConfig shape. No business logic, no
   * fallback logic, no locale branching.
   *
   * @param request - The minimal composition request (projectId + context).
   * @returns A Promise resolving to the immutable execution contract.
   */
  async compose(request: CompositionRequest): Promise<ThemeConfig> {
    // 1. Fetch the raw read models via the injected Readers.
    const structure = await this.structureReader.read(request.projectId);
    const presentation = await this.presentationReader.read(request.projectId);
    const localization = await this.localizationReader.read(request.projectId);
    const feature = await this.featureReader.read(request.projectId);

    // 2. Assemble the ThemeConfig from the passive DTOs.
    return this.assemble(structure, presentation, localization, feature);
  }

  /**
   * Assembles the four raw read models into a ThemeConfig.
   *
   * This is a deterministic, side-effect-free mapping. Each passive DTO is
   * merged directly into the ThemeConfig shape. There is NO business logic,
   * NO fallback logic, and NO locale branching.
   */
  private assemble(
    structure: StructureRecord,
    presentation: PresentationRecord,
    localization: LocalizationRecord,
    feature: FeatureRecord,
  ): ThemeConfig {
    const now = new Date().toISOString();

    const versioning: ThemeConfigVersioning = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdVersion: '2.0.0',
      minimumReaderVersion: '2.0.0',
      migrationTarget: CURRENT_SCHEMA_VERSION,
    };

    const metadata: ThemeConfigMetadata = {
      title: this.readString(localization.content, 'title'),
      tagline: this.readOptionalString(localization.content, 'tagline'),
      description: this.readOptionalString(localization.content, 'description'),
      locale: localization.locale,
      domain: this.readOptionalString(presentation.asset, 'domain'),
      favicon: this.readOptionalString(presentation.asset, 'favicon'),
      logo: this.readOptionalString(presentation.asset, 'logo'),
      createdAt: now,
      updatedAt: now,
      generator: 'awie-cms-composition',
      generatorVersion: '2.0.0',
    };

    const resources: ThemeResources = {
      pages: this.readArray<PageConfig>(structure.blueprint, 'pages'),
      sections: this.readArray<SectionConfig>(structure.blueprint, 'sections'),
      assets: this.readArray<AssetConfig>(presentation.asset, 'assets'),
      settings: this.readSettings(presentation.asset, feature.config),
      menus: this.readArray<MenuConfig>(structure.blueprint, 'menus'),
      forms: this.readArray<FormConfig>(structure.blueprint, 'forms'),
    };

    const policies: ThemePolicies = {};

    return {
      metadata,
      intent: this.readOptionalString(localization.content, 'intent') as
        | ThemeConfig['intent']
        | undefined,
      resources,
      seo: this.readSeo(presentation.globalSeo, localization.localSeo, feature.seo),
      policies,
    };
  }

  /**
   * Assembles the dedicated ThemeConfig.seo node from the three passive SEO
   * read models (Global SEO, Local SEO, and Plugin-contributed SEO).
   *
   * SEO IS PRESENTATION: This is a deterministic, side-effect-free assembly of
   * the provided read models. It is NOT a new domain.
   *
   * STRICT RULE — NO FALLBACK LOGIC: This method MUST NOT decide fallback
   * policies (e.g. "if local SEO is missing, use global"). Fallback is an
   * Application Layer business rule resolved BEFORE the Composition Boundary.
   * The Composer simply assembles the provided read models.
   *
   * DETERMINISTIC MERGE: The merge follows a fixed, immutable precedence:
   *   - Scalar fields (canonical, robots): Local SEO overrides Global SEO.
   *   - openGraph / twitter: Local SEO fields override Global SEO fields.
   *   - jsonLd: concatenated in order Global -> Local -> Plugin.
   * This is a pure assembly rule, NOT a runtime decision about missing data.
   */
  private readSeo(
    globalSeo: GlobalSeoRecord | undefined,
    localSeo: LocalSeoRecord | undefined,
    pluginSeo: PluginSeoRecord | undefined,
  ): ThemeSeo {
    const seo: ThemeSeo = {};

    // Scalar fields: Local SEO overrides Global SEO (fixed precedence).
    const canonical = localSeo?.canonical ?? globalSeo?.canonical;
    const robots = localSeo?.robots ?? globalSeo?.robots;
    if (canonical !== undefined) {
      seo.canonical = canonical;
    }
    if (robots !== undefined) {
      seo.robots = robots;
    }

    // openGraph: Local SEO fields override Global SEO fields.
    const openGraph = this.mergeOpenGraph(globalSeo?.openGraph, localSeo?.openGraph);
    if (openGraph !== undefined) {
      seo.openGraph = openGraph;
    }

    // twitter: Local SEO fields override Global SEO fields.
    const twitter = this.mergeTwitter(globalSeo?.twitter, localSeo?.twitter);
    if (twitter !== undefined) {
      seo.twitter = twitter;
    }

    // jsonLd: concatenated in order Global -> Local -> Plugin.
    const jsonLd = this.concatJsonLd(
      globalSeo?.jsonLd,
      localSeo?.jsonLd,
      pluginSeo?.jsonLd,
    );
    if (jsonLd.length > 0) {
      seo.jsonLd = jsonLd;
    }

    return seo;
  }

  /**
   * Merges the Global and Local OpenGraph read models into a single
   * OpenGraphConfig. Local SEO fields override Global SEO fields.
   *
   * This is a deterministic, side-effect-free assembly. It does NOT decide
   * fallback policies; it simply merges the provided read models.
   */
  private mergeOpenGraph(
    globalOpenGraph: unknown,
    localOpenGraph: unknown,
  ): OpenGraphConfig | undefined {
    const merged: OpenGraphConfig = {};

    const globalSource =
      typeof globalOpenGraph === 'object' && globalOpenGraph !== null
        ? (globalOpenGraph as Record<string, unknown>)
        : undefined;
    const localSource =
      typeof localOpenGraph === 'object' && localOpenGraph !== null
        ? (localOpenGraph as Record<string, unknown>)
        : undefined;

    for (const key of [
      'title',
      'description',
      'type',
      'image',
      'url',
      'siteName',
      'locale',
    ]) {
      const value = localSource?.[key] ?? globalSource?.[key];
      if (typeof value === 'string') {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  /**
   * Merges the Global and Local Twitter read models into a single
   * TwitterConfig. Local SEO fields override Global SEO fields.
   *
   * This is a deterministic, side-effect-free assembly. It does NOT decide
   * fallback policies; it simply merges the provided read models.
   */
  private mergeTwitter(
    globalTwitter: unknown,
    localTwitter: unknown,
  ): TwitterConfig | undefined {
    const merged: TwitterConfig = {};

    const globalSource =
      typeof globalTwitter === 'object' && globalTwitter !== null
        ? (globalTwitter as Record<string, unknown>)
        : undefined;
    const localSource =
      typeof localTwitter === 'object' && localTwitter !== null
        ? (localTwitter as Record<string, unknown>)
        : undefined;

    for (const key of [
      'card',
      'site',
      'creator',
      'title',
      'description',
      'image',
    ]) {
      const value = localSource?.[key] ?? globalSource?.[key];
      if (typeof value === 'string') {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  /**
   * Concatenates the Global, Local, and Plugin JSON-LD structured data nodes
   * into a single ordered array.
   *
   * This is a deterministic, side-effect-free assembly. It does NOT decide
   * fallback policies; it simply concatenates the provided read models.
   */
  private concatJsonLd(
    globalJsonLd: unknown[] | undefined,
    localJsonLd: unknown[] | undefined,
    pluginJsonLd: unknown[] | undefined,
  ): JsonLdNode[] {
    const result: JsonLdNode[] = [];

    for (const source of [globalJsonLd, localJsonLd, pluginJsonLd]) {
      if (Array.isArray(source)) {
        for (const node of source) {
          if (typeof node === 'object' && node !== null) {
            const record = node as Record<string, unknown>;
            const type = record['type'];
            if (typeof type === 'string') {
              result.push({
                type,
                data: record['data'] as Record<string, unknown>,
              });
            }
          }
        }
      }
    }

    return result;
  }


  /**
   * Reads a required string field from a raw record payload.
   *
   * This is a passive, deterministic read. It does NOT interpret or transform
   * business meaning; it simply extracts a field from the raw DTO.
   */
  private readString(source: unknown, key: string): string {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }
    return '';
  }

  /**
   * Reads an optional string field from a raw record payload.
   *
   * This is a passive, deterministic read. It does NOT interpret or transform
   * business meaning; it simply extracts a field from the raw DTO.
   */
  private readOptionalString(source: unknown, key: string): string | undefined {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Reads a flat array field from a raw record payload.
   *
   * This is a passive, deterministic read. It does NOT interpret or transform
   * business meaning; it simply extracts a field from the raw DTO.
   */
  private readArray<T>(source: unknown, key: string): T[] {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
    return [];
  }

  /**
   * Reads the SiteSettings by merging the presentation asset and the feature
   * configuration.
   *
   * This is a passive, deterministic merge of two raw DTOs. It does NOT
   * interpret or transform business meaning; it simply assembles the settings
   * object from the raw payloads.
   */
  private readSettings(
    presentation: unknown,
    feature: unknown,
  ): SiteSettings {
    const settings: SiteSettings = {};

    if (typeof presentation === 'object' && presentation !== null) {
      const source = presentation as Record<string, unknown>;
      for (const key of [
        'primaryColor',
        'secondaryColor',
        'backgroundColor',
        'textColor',
        'font',
        'spacing',
        'radius',
        'skin',
        'skeleton',
        'aiDesignReport',
      ]) {
        const value = source[key];
        if (value !== undefined) {
          (settings as Record<string, unknown>)[key] = value;
        }
      }
    }

    if (typeof feature === 'object' && feature !== null) {
      const source = feature as Record<string, unknown>;
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (value !== undefined) {
          (settings as Record<string, unknown>)[key] = value;
        }
      }
    }

    return settings;
  }
}
