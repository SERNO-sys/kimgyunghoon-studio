/**
 * AWIE V2 - Phase 14.2/14.3: CMS Infrastructure - Composition Service Boundary
 * and Read-Model Adapters.
 *
 * This module defines the STRICT boundary interfaces for the Composition Layer.
 * It is INTERFACE ONLY. It contains NO concrete classes (e.g. ProjectResolver),
 * NO cache logic, and NO concrete Reader implementations.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. Interface Only. ICompositionService and the I*Reader interfaces are pure
 *    interfaces. Concrete implementations are defined separately and are NOT
 *    part of this module.
 *
 * 2. Minimal DTO. CompositionRequest contains ONLY minimal primitives. It
 *    NEVER passes Aggregate Roots (like Project) as arguments.
 *
 * 3. Single Contract. ICompositionService exposes EXACTLY ONE method:
 *    compose(request): Promise<ThemeConfig>.
 *
 * 4. Infrastructure Isolation. Cache is an infrastructure detail. There are NO
 *    cache-related methods (no composeWithCache). Caching is layered on top of
 *    this interface, never inside it.
 *
 * 5. Readers, NOT Providers. The fetching layer uses the term Reader to prevent
 *    it from accidentally performing composition.
 *
 * 6. The "No Composition" Rule. Readers are immutable read-model adapters.
 *    They MUST NOT compose, merge, interpret, or transform business meaning.
 *    The Composition Service is the ONLY component allowed to assemble
 *    execution inputs.
 *
 * 7. Raw Read Models Only. Readers MUST return Raw Read Models (*Record /
 *    *Source), NEVER a composed Context or ThemeConfig.
 *
 * 8. Responsibility-Centric, Not Entity-Centric. Readers are NOT mapped 1:1
 *    with CMS Entities. They follow responsibility boundaries:
 *      - IStructureReader      -> structural blueprints (StructureRecord)
 *      - IPresentationReader   -> visual/design assets (PresentationRecord)
 *      - ILocalizationReader   -> locale content + revision states (LocalizationRecord)
 *      - IFeatureReader        -> plugin/feature configs (FeatureRecord)
 *
 * 9. Strict Error Policy. If a record is not found or is invalid, the Reader
 *    MUST throw a standard error (e.g. NotFoundError). NEVER return null, and
 *    NEVER attempt to resolve fallback locales or default data inside the
 *    Reader.
 *
 * 10. STRICTLY Side-Effect Free. ICompositionService MUST NOT mutate Project,
 *     LocaleVariant, Brand, Plugin, or any CMS model. Its singular, immutable
 *     responsibility is to output a ThemeConfig.
 * ============================================================================
 */

import type { ThemeConfig } from '../../../lib/theme-config/v2/types';

// ---------------------------------------------------------------------------
// Composition Context
// ---------------------------------------------------------------------------

/**
 * The execution context in which a composition is requested.
 *
 * This is a minimal primitive discriminator. It tells the Composition Service
 * which resolution strategy to apply, but it does NOT carry CMS state.
 */
export type CompositionContext = 'edge' | 'build' | 'preview' | 'publish';

// ---------------------------------------------------------------------------
// CompositionRequest (MINIMAL DTO)
// ---------------------------------------------------------------------------

/**
 * The minimal input DTO for a composition request.
 *
 * STRICT RULES:
 * - Contains ONLY minimal primitives. No Aggregate Roots (Project, Brand,
 *   LocaleVariant, PluginSet, ThemePointer, Snapshot) are ever passed.
 * - Locale fields are NOT hardcoded here. Locale resolution is an internal
 *   concern of the Composition Service and is deferred to a later step.
 * - The DTO is immutable (readonly).
 */
export interface CompositionRequest {
  /** The stable project id to compose. */
  readonly projectId: string;
  /** The execution context (edge | build | preview | publish). */
  readonly context?: CompositionContext;
}

// ---------------------------------------------------------------------------
// ICompositionService (SINGLE CONTRACT)
// ---------------------------------------------------------------------------

/**
 * The Composition Service boundary.
 *
 * The CMS side is responsible for composition. This interface is the single
 * contract through which the Runtime receives its execution input.
 *
 * STRICT RULES:
 * - EXACTLY ONE method: compose(request): Promise<ThemeConfig>.
 * - The output is the immutable execution contract (ThemeConfig). Only this
 *   contract crosses the CMS -> Runtime boundary.
 * - STRICTLY SIDE-EFFECT FREE: this service MUST NOT mutate Project,
 *   LocaleVariant, Brand, Plugin, or any CMS model. Its singular, immutable
 *   responsibility is to output a ThemeConfig.
 * - Cache is an infrastructure detail and is NOT part of this interface.
 */
export interface ICompositionService {
  /**
   * Composes a Project into a single immutable ThemeConfig.
   *
   * @param request - The minimal composition request (projectId + context).
   * @returns A Promise resolving to the immutable execution contract.
   */
  compose(request: CompositionRequest): Promise<ThemeConfig>;
}

// ---------------------------------------------------------------------------
// Read-Model Adapters (READERS, NOT PROVIDERS)
// ---------------------------------------------------------------------------

/**
 * A standard error thrown by a Reader when a record is not found or is invalid.
 *
 * STRICT ERROR POLICY: Readers MUST throw this error on missing/invalid data.
 * They MUST NEVER return null, and MUST NEVER attempt to resolve fallback
 * locales or default data inside the Reader.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Raw Read Models (*Record DTOs)
// ---------------------------------------------------------------------------

/**
 * A raw structural blueprint read model.
 *
 * RAW READ MODEL ONLY: This is a passive data carrier. It carries NO composed
 * Context and NO ThemeConfig. It is NOT interpreted or transformed by the
 * Reader that returns it.
 */
export interface StructureRecord {
  /** The stable id of the structural blueprint. */
  readonly id: string;
  /** The structural blueprint payload (raw, uninterpreted). */
  readonly blueprint: unknown;
}

/**
 * A passive Global SEO read model.
 *
 * SEO IS PRESENTATION: This is a passive data carrier for site-level SEO
 * metadata (OpenGraph, Twitter, Canonical, JSON-LD). It is NOT a new domain.
 * It carries NO composed Context and NO ThemeConfig. It is NOT interpreted or
 * transformed by the Reader that returns it.
 */
export interface GlobalSeoRecord {
  /** The canonical URL for the site. */
  readonly canonical?: string;
  /** The robots directive (e.g. "index,follow"). */
  readonly robots?: string;
  /** The site-level OpenGraph metadata. */
  readonly openGraph?: unknown;
  /** The site-level Twitter Card metadata. */
  readonly twitter?: unknown;
  /** The site-level JSON-LD structured data nodes. */
  readonly jsonLd?: unknown[];
}

/**
 * A passive Local SEO read model.
 *
 * SEO IS PRESENTATION: This is a passive data carrier for locale-specific SEO
 * metadata (localized OpenGraph, Twitter, Canonical, JSON-LD). It is NOT a new
 * domain. It carries NO composed Context and NO ThemeConfig. It is NOT
 * interpreted or transformed by the Reader that returns it.
 */
export interface LocalSeoRecord {
  /** The localized canonical URL. */
  readonly canonical?: string;
  /** The localized robots directive. */
  readonly robots?: string;
  /** The localized OpenGraph metadata. */
  readonly openGraph?: unknown;
  /** The localized Twitter Card metadata. */
  readonly twitter?: unknown;
  /** The localized JSON-LD structured data nodes. */
  readonly jsonLd?: unknown[];
}

/**
 * A passive Plugin-contributed SEO read model.
 *
 * SEO IS PRESENTATION: This is a passive data carrier for structured data
 * schemas contributed by plugins (e.g. Product, MusicRecording JSON-LD). It is
 * NOT a new domain. It carries NO composed Context and NO ThemeConfig. It is
 * NOT interpreted or transformed by the Reader that returns it.
 */
export interface PluginSeoRecord {
  /** The JSON-LD structured data nodes contributed by the plugin. */
  readonly jsonLd?: unknown[];
}

/**
 * A raw visual/design asset read model.
 *
 * RAW READ MODEL ONLY: This is a passive data carrier. It carries NO composed
 * Context and NO ThemeConfig. It is NOT interpreted or transformed by the
 * Reader that returns it.
 */
export interface PresentationRecord {
  /** The stable id of the presentation asset. */
  readonly id: string;
  /** The visual/design asset payload (raw, uninterpreted). */
  readonly asset: unknown;
  /** The passive Global SEO read model (site-level SEO metadata). */
  readonly globalSeo?: GlobalSeoRecord;
}

/**
 * A raw locale-specific content + revision state read model.
 *
 * RAW READ MODEL ONLY: This is a passive data carrier. It carries NO composed
 * Context and NO ThemeConfig. It is NOT interpreted or transformed by the
 * Reader that returns it.
 */
export interface LocalizationRecord {
  /** The stable id of the locale record. */
  readonly id: string;
  /** The BCP-47 locale tag (e.g. "ko-KR"). */
  readonly locale: string;
  /** The revision this locale record is currently at. */
  readonly resolvedRevision: number;
  /** The locale-specific content payload (raw, uninterpreted). */
  readonly content: unknown;
  /** The passive Local SEO read model (locale-specific SEO metadata). */
  readonly localSeo?: LocalSeoRecord;
}

/**
 * A raw plugin/feature configuration read model.
 *
 * RAW READ MODEL ONLY: This is a passive data carrier. It carries NO composed
 * Context and NO ThemeConfig. It is NOT interpreted or transformed by the
 * Reader that returns it.
 *
 * GENERIC CONFIG (Level B Refinement): The config is generic over TConfig so
 * that Product Plugins (e.g. Music, Commerce) can contribute strongly-typed
 * domain configuration through the EXISTING FeatureRecord contract. This is a
 * domain feature, NOT an architectural exception. Plugins MUST NOT create new
 * SPIs, new Readers, or new Composition logic.
 */
export interface FeatureRecord<TConfig = unknown> {
  /** The stable id of the plugin that contributed this feature configuration. */
  readonly pluginId: string;
  /** The plugin/feature configuration payload (raw, uninterpreted). */
  readonly config: TConfig;
  /** The passive Plugin-contributed SEO read model (structured data schemas). */
  readonly seo?: PluginSeoRecord;
}


// ---------------------------------------------------------------------------
// Reader Interfaces (RESPONSIBILITY-CENTRIC)
// ---------------------------------------------------------------------------

/**
 * Fetches structural blueprints.
 *
 * RESPONSIBILITY-CENTRIC: This Reader is NOT mapped 1:1 to a CMS Entity. It
 * owns the single responsibility of fetching structural blueprints.
 *
 * STRICT RULES:
 * - Returns a RAW Read Model (StructureRecord), NEVER a composed Context or
 *   ThemeConfig.
 * - MUST NOT compose, merge, interpret, or transform business meaning.
 * - MUST throw NotFoundError on missing/invalid data. NEVER return null, and
 *   NEVER resolve fallback locales or default data.
 */
export interface IStructureReader {
  /**
   * Fetches a structural blueprint by id.
   *
   * @param id - The stable id of the structural blueprint.
   * @returns A Promise resolving to the raw StructureRecord.
   * @throws NotFoundError if the record is not found or is invalid.
   */
  read(id: string): Promise<StructureRecord>;
}

/**
 * Fetches visual/design assets.
 *
 * RESPONSIBILITY-CENTRIC: This Reader is NOT mapped 1:1 to a CMS Entity. It
 * owns the single responsibility of fetching visual/design assets.
 *
 * STRICT RULES:
 * - Returns a RAW Read Model (PresentationRecord), NEVER a composed Context or
 *   ThemeConfig.
 * - MUST NOT compose, merge, interpret, or transform business meaning.
 * - MUST throw NotFoundError on missing/invalid data. NEVER return null, and
 *   NEVER resolve fallback locales or default data.
 */
export interface IPresentationReader {
  /**
   * Fetches a presentation asset by id.
   *
   * @param id - The stable id of the presentation asset.
   * @returns A Promise resolving to the raw PresentationRecord.
   * @throws NotFoundError if the record is not found or is invalid.
   */
  read(id: string): Promise<PresentationRecord>;
}

/**
 * Fetches locale-specific content and revision states.
 *
 * RESPONSIBILITY-CENTRIC: This Reader is NOT mapped 1:1 to a CMS Entity. It
 * owns the single responsibility of fetching locale content and revision
 * states.
 *
 * STRICT RULES:
 * - Returns a RAW Read Model (LocalizationRecord), NEVER a composed Context or
 *   ThemeConfig.
 * - MUST NOT compose, merge, interpret, or transform business meaning.
 * - MUST throw NotFoundError on missing/invalid data. NEVER return null, and
 *   NEVER resolve fallback locales or default data.
 */
export interface ILocalizationReader {
  /**
   * Fetches a locale record by id.
   *
   * @param id - The stable id of the locale record.
   * @returns A Promise resolving to the raw LocalizationRecord.
   * @throws NotFoundError if the record is not found or is invalid.
   */
  read(id: string): Promise<LocalizationRecord>;
}

/**
 * Fetches plugin/feature configurations.
 *
 * RESPONSIBILITY-CENTRIC: This Reader is NOT mapped 1:1 to a CMS Entity. It
 * owns the single responsibility of fetching plugin/feature configurations.
 *
 * STRICT RULES:
 * - Returns a RAW Read Model (FeatureRecord), NEVER a composed Context or
 *   ThemeConfig.
 * - MUST NOT compose, merge, interpret, or transform business meaning.
 * - MUST throw NotFoundError on missing/invalid data. NEVER return null, and
 *   NEVER resolve fallback locales or default data.
 */
export interface IFeatureReader<TConfig = unknown> {
  /**
   * Fetches a feature configuration by id.
   *
   * @param id - The stable id of the feature configuration.
   * @returns A Promise resolving to the raw FeatureRecord.
   * @throws NotFoundError if the record is not found or is invalid.
   */
  read(id: string): Promise<FeatureRecord<TConfig>>;
}

// ---------------------------------------------------------------------------
// Composition Identity & Cache (Phase 14.4)
// ---------------------------------------------------------------------------

/**
 * The immutable identity of a composition.
 *
 * CRITICAL DISTINCTION: A CompositionRequest is NOT a Cache Identity. A
 * CompositionRequest (e.g. projectId, context) merely ASKS for a composition.
 * The actual cache key MUST be a CompositionIdentity.
 *
 * For now, CompositionIdentity represents a deterministic hash or a strict
 * versioned string of the resolved references (e.g. ProjectHash + Locale).
 * Revision logic is NOT hardcoded here; this type is defined conceptually.
 */
export type CompositionIdentity = string;

/**
 * Resolves a CompositionRequest into an immutable CompositionIdentity.
 *
 * This is the injected strategy/utility used to derive the cache key from an
 * execution request. It is a pure, deterministic function of the resolved
 * references. It MUST NOT perform composition or mutate any CMS model.
 */
export interface IIdentityResolver {
  /**
   * Derives the immutable CompositionIdentity for a given request.
   *
   * @param request - The minimal composition request.
   * @returns The deterministic CompositionIdentity (cache key).
   */
  resolve(request: CompositionRequest): CompositionIdentity;
}

/**
 * The Composition Cache Provider (L1 Composition Cache on the CMS side).
 *
 * INFRASTRUCTURE ONLY: This interface is used by the CachedCompositionService
 * Decorator, which performs ONLY Read-Through / Write-Through.
 *
 * STRICT RULES:
 * - MUST ONLY contain get(identity) and set(identity, config).
 * - MUST NOT contain invalidate(), delete(), or flush(). Invalidation belongs
 *   entirely to the Application Layer, NOT to this provider interface used by
 *   the Decorator.
 */
export interface ICompositionCacheProvider {
  /**
   * Reads a cached ThemeConfig by its CompositionIdentity.
   *
   * @param identity - The immutable composition identity (cache key).
   * @returns A Promise resolving to the cached ThemeConfig, or null on a miss.
   */
  get(identity: CompositionIdentity): Promise<ThemeConfig | null>;

  /**
   * Writes a ThemeConfig into the cache under its CompositionIdentity.
   *
   * @param identity - The immutable composition identity (cache key).
   * @param config - The immutable execution contract to cache.
   * @returns A Promise resolving when the write completes.
   */
  set(identity: CompositionIdentity, config: ThemeConfig): Promise<void>;
}
