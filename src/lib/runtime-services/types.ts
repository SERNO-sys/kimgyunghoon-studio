/**
 * AWIE V2 - Phase 11: Runtime Services Foundation Types.
 *
 * The Runtime Services layer is a set of INDEPENDENT platform services that
 * execute the runtime. They are NOT the Renderer, NOT the Theme Engine, and
 * NOT the Decision Engines. They are pure infrastructure that the runtime
 * pipeline consumes.
 *
 * THE ULTIMATE LAW OF RUNTIME SERVICES:
 *
 *   "AI decides. Runtime executes."
 *
 * Runtime Services are the EXECUTION layer. They:
 *
 *   1. RESOLVE  - turn ids into usable values (Asset Resolver).
 *   2. TRANSFORM - process data deterministically (Localization, Media, SEO).
 *   3. STORE    - cache values for performance (Cache).
 *   4. OBSERVE  - emit analytics and performance signals (Analytics, Performance).
 *   5. PROTECT  - enforce security policies (Security).
 *   6. ENSURE   - guarantee accessibility (Accessibility).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. ZERO BUSINESS LOGIC (The Ignorance Principle)
 *      Runtime Services MUST NEVER import BusinessBrief, IndustryProfile,
 *      RecipeBlueprint, Question Engine, Industry Registry, or Recipe Engine.
 *      They operate ONLY on ThemeConfig (the SSOT) and pure data.
 *
 *   2. ZERO RENDERING
 *      Runtime Services MUST NEVER render UI. They are NOT the Renderer. They
 *      produce data, metadata, and signals that the Renderer and Adapters
 *      consume.
 *
 *   3. DETERMINISM
 *      Same input -> same output. Runtime Services are deterministic and
 *      side-effect free (except where explicitly a side-effect service such as
 *      Analytics or Cache, which are isolated behind interfaces).
 *
 *   4. REGISTRY PATTERN
 *      Services are registered and resolved via the universal ResourceRegistry
 *      pattern (Constitution Article IV). O(1) map lookups. No Array.find().
 *
 *   5. INDEPENDENCE
 *      Each service is independently instantiable and testable. No service
 *      depends on another service's internals.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

import type { ThemeConfig } from '../theme-config/v2';

// ---------------------------------------------------------------------------
// Service Identity
// ---------------------------------------------------------------------------

/**
 * The stable identifier of a runtime service.
 *
 * Each service is registered under a stable id in the RuntimeServiceRegistry.
 * The ids are semantic and framework-agnostic.
 */
export type RuntimeServiceId =
  | 'asset-resolver'
  | 'localization'
  | 'cache'
  | 'media-pipeline'
  | 'seo'
  | 'accessibility'
  | 'analytics'
  | 'performance'
  | 'security';

// ---------------------------------------------------------------------------
// Asset Resolver
// ---------------------------------------------------------------------------

/**
 * A resolved asset descriptor.
 *
 * The Asset Resolver turns an asset id into a usable, fully-qualified URL plus
 * optional metadata. It NEVER reads raw storage keys directly; it always goes
 * through this service.
 */
export interface ResolvedAsset {
  /** The resolved, fully-qualified URL. */
  url: string;
  /** The asset MIME type, when known. */
  mimeType?: string;
  /** The asset width in pixels, when known. */
  width?: number;
  /** The asset height in pixels, when known. */
  height?: number;
  /** Alt text for accessibility, when known. */
  alt?: string;
}

/**
 * The Asset Resolver service.
 *
 * Resolves an asset id to a usable URL. This is the concrete implementation of
 * the `AssetResolver` interface defined in the Renderer Foundation. The
 * Renderer consumes this service through its RenderContext.
 *
 * The Asset Resolver is a PLATFORM SERVICE. It is NOT the Renderer. It only
 * resolves ids to URLs.
 */
export interface AssetResolverService {
  /** The stable service id. */
  readonly id: 'asset-resolver';
  /**
   * Resolves an asset id to a usable URL.
   *
   * @param assetId The asset id to resolve.
   * @returns The resolved asset, or undefined if the asset is unknown.
   */
  resolve(assetId: string): ResolvedAsset | undefined;
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

/**
 * A locale dictionary. Maps a translation key to its localized string.
 */
export type LocaleDictionary = Readonly<Record<string, string>>;

/**
 * The Localization service.
 *
 * Provides locale-aware string lookup. The Renderer consumes this through its
 * RenderContext.locale. The Localization service is deterministic: given the
 * same locale and key, it always returns the same string.
 *
 * The Localization service is a PLATFORM SERVICE. It is NOT the Renderer. It
 * only translates keys to strings.
 */
export interface LocalizationService {
  /** The stable service id. */
  readonly id: 'localization';
  /**
   * Returns the active locale.
   */
  getLocale(): string;
  /**
   * Translates a key in the active locale.
   *
   * @param key The translation key.
   * @param params Optional interpolation parameters (e.g. { name: "World" }).
   * @returns The localized string, or the key itself if not found.
   */
  translate(key: string, params?: Record<string, string | number>): string;
  /**
   * Returns whether a key exists in the active locale.
   *
   * @param key The translation key.
   */
  has(key: string): boolean;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * A cache entry with an optional TTL.
 */
export interface CacheEntry<T> {
  /** The cached value. */
  value: T;
  /** The absolute expiry timestamp (ms since epoch), or undefined for no expiry. */
  expiresAt?: number;
}

/**
 * The Cache service.
 *
 * A generic, key-value cache abstraction. It is a PLATFORM SERVICE that
 * improves runtime performance. It is isolated behind an interface so the
 * underlying store (in-memory, KV, CDN) can be swapped without affecting
 * consumers.
 *
 * The Cache service is deterministic in its contract: get/set/delete/has.
 */
export interface CacheService {
  /** The stable service id. */
  readonly id: 'cache';
  /**
   * Retrieves a cached value by key.
   *
   * @param key The cache key.
   * @returns The cached value, or undefined if absent or expired.
   */
  get<T>(key: string): T | undefined;
  /**
   * Stores a value under a key with an optional TTL.
   *
   * @param key The cache key.
   * @param value The value to store.
   * @param ttlMs Optional time-to-live in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs?: number): void;
  /**
   * Deletes a cached value by key.
   *
   * @param key The cache key.
   */
  delete(key: string): void;
  /**
   * Returns whether a key exists and is not expired.
   *
   * @param key The cache key.
   */
  has(key: string): boolean;
  /**
   * Clears all cached values.
   */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Media Pipeline
// ---------------------------------------------------------------------------

/**
 * A media transformation request.
 */
export interface MediaTransformRequest {
  /** The source asset id or URL. */
  source: string;
  /** The target width in pixels. */
  width?: number;
  /** The target height in pixels. */
  height?: number;
  /** The target format (e.g. "webp", "avif", "jpeg"). */
  format?: string;
  /** The target quality (0-100). */
  quality?: number;
}

/**
 * A media transformation result.
 */
export interface MediaTransformResult {
  /** The transformed URL. */
  url: string;
  /** The resulting width in pixels. */
  width?: number;
  /** The resulting height in pixels. */
  height?: number;
  /** The resulting format. */
  format?: string;
}

/**
 * The Media Pipeline service.
 *
 * Processes media assets (image optimization, format conversion, resizing).
 * It is a PLATFORM SERVICE that produces transformed media URLs. It is NOT the
 * Renderer and contains NO business logic.
 */
export interface MediaPipelineService {
  /** The stable service id. */
  readonly id: 'media-pipeline';
  /**
   * Transforms a media asset according to a request.
   *
   * @param request The transformation request.
   * @returns The transformation result.
   */
  transform(request: MediaTransformRequest): MediaTransformResult;
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

/**
 * SEO metadata for a page.
 */
export interface SeoMetadata {
  /** The page title. */
  title: string;
  /** The page description. */
  description?: string;
  /** The canonical URL. */
  canonical?: string;
  /** The Open Graph title. */
  ogTitle?: string;
  /** The Open Graph description. */
  ogDescription?: string;
  /** The Open Graph image URL. */
  ogImage?: string;
  /** The Open Graph type (e.g. "website", "article"). */
  ogType?: string;
  /** The robots directive (e.g. "index,follow"). */
  robots?: string;
  /** The Twitter card type. */
  twitterCard?: string;
}

/**
 * The SEO service.
 *
 * Derives SEO metadata from the ThemeConfig (the SSOT). It reads the config's
 * metadata (title, description, domain) and produces a deterministic SEO
 * metadata object. It is a PLATFORM SERVICE that produces data — it does NOT
 * render HTML.
 */
export interface SeoService {
  /** The stable service id. */
  readonly id: 'seo';
  /**
   * Builds SEO metadata for a page from the ThemeConfig.
   *
   * @param config The immutable ThemeConfig (the SSOT).
   * @param pageId The page id to build metadata for.
   * @param options Optional overrides (canonical URL, robots).
   * @returns The SEO metadata.
   */
  build(
    config: ThemeConfig,
    pageId: string,
    options?: SeoBuildOptions,
  ): SeoMetadata;
}

/** Optional SEO build options. */
export interface SeoBuildOptions {
  /** The canonical URL override. */
  canonical?: string;
  /** The robots directive override. */
  robots?: string;
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

/**
 * An accessibility attribute set for an element.
 */
export interface AccessibilityAttributes {
  /** The ARIA role. */
  role?: string;
  /** The ARIA label. */
  'aria-label'?: string;
  /** The ARIA described-by reference. */
  'aria-describedby'?: string;
  /** The ARIA hidden state. */
  'aria-hidden'?: boolean;
  /** The ARIA live region. */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  /** The tab index. */
  tabIndex?: number;
  /** Arbitrary extra accessibility attributes. */
  [key: string]: unknown;
}

/**
 * The Accessibility service.
 *
 * Derives accessibility attributes for semantic components. It is a PLATFORM
 * SERVICE that produces accessibility data. It is NOT the Renderer and contains
 * NO business logic.
 */
export interface AccessibilityService {
  /** The stable service id. */
  readonly id: 'accessibility';
  /**
   * Builds accessibility attributes for a semantic component.
   *
   * @param componentId The semantic component id (e.g. "hero", "featureGrid").
   * @param label An optional accessible label.
   * @returns The accessibility attributes.
   */
  attributes(componentId: string, label?: string): AccessibilityAttributes;
}

// ---------------------------------------------------------------------------
// Analytics Hooks
// ---------------------------------------------------------------------------

/**
 * An analytics event.
 */
export interface AnalyticsEvent {
  /** The event name (e.g. "page_view", "cta_click"). */
  name: string;
  /** The event properties. */
  properties?: Record<string, unknown>;
  /** The event timestamp (ISO-8601). */
  timestamp: string;
}

/**
 * The Analytics Hooks service.
 *
 * Emits analytics events. It is a PLATFORM SERVICE that observes runtime
 * activity. It is isolated behind an interface so the underlying analytics
 * provider (GA, Plausible, custom) can be swapped without affecting consumers.
 */
export interface AnalyticsService {
  /** The stable service id. */
  readonly id: 'analytics';
  /**
   * Emits an analytics event.
   *
   * @param event The event to emit.
   */
  track(event: AnalyticsEvent): void;
}

// ---------------------------------------------------------------------------
// Runtime Performance
// ---------------------------------------------------------------------------

/**
 * A performance measurement.
 */
export interface PerformanceMeasurement {
  /** The measurement name (e.g. "render", "asset-resolve"). */
  name: string;
  /** The duration in milliseconds. */
  durationMs: number;
  /** The measurement start timestamp (ISO-8601). */
  startedAt: string;
}

/**
 * The Runtime Performance service.
 *
 * Measures runtime performance. It is a PLATFORM SERVICE that observes
 * execution timing. It is isolated behind an interface so the underlying
 * performance sink (console, metrics provider) can be swapped.
 */
export interface PerformanceService {
  /** The stable service id. */
  readonly id: 'performance';
  /**
   * Starts a named measurement and returns a stop function.
   *
   * @param name The measurement name.
   * @returns A function that stops the measurement and records the duration.
   */
  start(name: string): () => PerformanceMeasurement;
  /**
   * Records a completed measurement.
   *
   * @param measurement The measurement to record.
   */
  record(measurement: PerformanceMeasurement): void;
}

// ---------------------------------------------------------------------------
// Security Services
// ---------------------------------------------------------------------------

/**
 * A Content Security Policy directive set.
 */
export interface ContentSecurityPolicy {
  /** The default-src directive. */
  defaultSrc?: string[];
  /** The script-src directive. */
  scriptSrc?: string[];
  /** The style-src directive. */
  styleSrc?: string[];
  /** The img-src directive. */
  imgSrc?: string[];
  /** The connect-src directive. */
  connectSrc?: string[];
  /** The font-src directive. */
  fontSrc?: string[];
  /** The frame-ancestors directive. */
  frameAncestors?: string[];
}

/**
 * The Security service.
 *
 * Provides security primitives: HTML sanitization, Content Security Policy
 * generation, and safe URL validation. It is a PLATFORM SERVICE that protects
 * the runtime. It is NOT the Renderer and contains NO business logic.
 */
export interface SecurityService {
  /** The stable service id. */
  readonly id: 'security';
  /**
   * Sanitizes an HTML string, removing dangerous content.
   *
   * @param html The raw HTML string.
   * @returns The sanitized HTML string.
   */
  sanitizeHtml(html: string): string;
  /**
   * Builds a Content Security Policy header value.
   *
   * @param csp The CSP directive set.
   * @returns The CSP header value string.
   */
  buildCsp(csp: ContentSecurityPolicy): string;
  /**
   * Validates that a URL is safe (http/https only, no javascript:).
   *
   * @param url The URL to validate.
   * @returns True if the URL is safe.
   */
  isSafeUrl(url: string): boolean;
}

// ---------------------------------------------------------------------------
// Runtime Service Registry
// ---------------------------------------------------------------------------

/**
 * The union of all runtime services.
 *
 * This is the set of services that the RuntimeServiceRegistry can hold. Each
 * service is identified by its stable `id`.
 */
export type RuntimeService =
  | AssetResolverService
  | LocalizationService
  | CacheService
  | MediaPipelineService
  | SeoService
  | AccessibilityService
  | AnalyticsService
  | PerformanceService
  | SecurityService;

/**
 * The Runtime Service Registry.
 *
 * A registry of all platform runtime services, keyed by their stable id. It
 * provides O(1) lookups. It is the single access point for the runtime pipeline
 * to obtain any platform service.
 *
 * The registry is a PLATFORM INFRASTRUCTURE object. It is NOT the Renderer and
 * contains NO business logic.
 */
export interface RuntimeServiceRegistry {
  /**
   * Registers a runtime service under its stable id.
   *
   * @param service The service to register.
   */
  register(service: RuntimeService): void;
  /**
   * Retrieves a runtime service by id.
   *
   * @param id The stable service id.
   * @returns The service, or undefined if not registered.
   */
  get(id: RuntimeServiceId): RuntimeService | undefined;
  /**
   * Returns whether a service with the given id is registered.
   *
   * @param id The stable service id.
   */
  has(id: RuntimeServiceId): boolean;
  /**
   * Returns all registered services.
   */
  list(): RuntimeService[];
  /**
   * Freezes the registry. After this call, any register() attempt throws.
   */
  freeze(): void;
  /**
   * Returns whether the registry has been frozen.
   */
  isFrozen(): boolean;
}
