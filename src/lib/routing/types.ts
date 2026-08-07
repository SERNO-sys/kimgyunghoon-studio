/**
 * AWIE V2 - Routing Core Types.
 *
 * The routing layer is the entry point of the multi-site SaaS platform. It
 * resolves an incoming host (custom domain or subdomain) to a Tenant, and a
 * Tenant to a ThemeConfig — WITHOUT ever loading, parsing, or validating the
 * ThemeConfig itself.
 *
 * CRITICAL CONSTRAINT: Routing MUST NEVER load, parse, or validate the
 * ThemeConfig. The pipeline strictly stops at returning the themeConfigId.
 * RoutingResult contains ONLY routing decisions.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure type modeling for the routing pipeline.
 */

/** A normalized hostname (lowercase, no port, no www). */
export type NormalizedHost = string;

/** A stable, unique identifier for a tenant. */
export type TenantId = string;

/** A stable, unique identifier for a ThemeConfig. */
export type ThemeConfigId = string;

/** An ISO-8601 timestamp string. */
export type Timestamp = string;

/**
 * The publication state of a site.
 *
 * Declared as a string union so it can be extended beyond the core states
 * without breaking the pipeline. The pipeline only branches on whether a site
 * is publicly routable (Published) or requires a preview token (Draft/Review/
 * Scheduled/Archived).
 */
export type PublicationState =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

/** The canonical publication state constants. */
export const PublicationState = {
  Draft: 'draft',
  Review: 'review',
  Scheduled: 'scheduled',
  Published: 'published',
  Archived: 'archived',
} as const;

/**
 * The result of a routing decision.
 *
 * Contains ONLY routing decisions — never the ThemeConfig itself. The renderer
 * uses themeConfigId to load the config in a separate step.
 */
export interface RoutingResult {
  /** The resolved tenant id. */
  tenantId: TenantId;
  /** The resolved ThemeConfig id (NOT the config itself). */
  themeConfigId: ThemeConfigId;
  /** Whether this is a preview render (requires noindex). */
  isPreview: boolean;
  /** The resolved locale (e.g. "ko", "en"). */
  locale: string;
  /** The canonical URL for this route. */
  canonicalUrl: string;
  /** The publication state of the resolved site. */
  publicationState: PublicationState;
  /** The normalized host that was resolved. */
  host: NormalizedHost;
}

/**
 * A preview context with expiration tracking.
 *
 * Preview tokens MUST support expiration. A token is valid only while
 * `now <= expiresAt` and `now >= issuedAt`.
 */
export interface PreviewContext {
  /** The preview token value. */
  token: string;
  /** When the token was issued (ISO-8601). */
  issuedAt: Timestamp;
  /** When the token expires (ISO-8601). */
  expiresAt: Timestamp;
  /** The editor who issued the token. */
  editorId: string;
  /** The tenant this preview grants access to. */
  tenantId: TenantId;
}

/**
 * The incoming routing request.
 *
 * Framework-agnostic: the adapter (e.g. a Next.js or Cloudflare Worker) maps
 * its request into this shape before invoking the pipeline.
 */
export interface RoutingRequest {
  /** The raw host header (e.g. "WWW.EXAMPLE.COM:443"). */
  host: string;
  /** The request path (e.g. "/", "/about"). */
  path: string;
  /** An optional preview token. */
  previewToken?: string;
  /** The current time (ISO-8601). Used for deterministic preview expiry. */
  now?: Timestamp;
}

/**
 * A pre-resolve hook.
 *
 * Runs before tenant resolution. Reserved for future Geo/Language routing.
 * The pipeline invokes it when provided.
 */
export interface PreResolveHook {
  /** A stable identifier for the hook. */
  readonly id: string;
  /** Runs before resolution. May return a modified request. */
  beforeResolve(request: RoutingRequest): RoutingRequest;
}

/**
 * A post-resolve hook.
 *
 * Runs after a routing result is produced. Reserved for future analytics and
 * instrumentation.
 */
export interface PostResolveHook {
  /** A stable identifier for the hook. */
  readonly id: string;
  /** Runs after resolution. */
  afterResolve(result: RoutingResult): void;
}

/**
 * A routing cache.
 *
 * Reserved for future scaling. Implementations may cache normalized host ->
 * routing decisions to avoid repeated repository lookups.
 */
export interface RoutingCache {
  /** Returns a cached result for a host, or undefined. */
  get(host: NormalizedHost): RoutingResult | undefined;
  /** Stores a result for a host. */
  set(host: NormalizedHost, result: RoutingResult): void;
  /** Invalidates a cached result for a host. */
  invalidate(host: NormalizedHost): void;
}

/**
 * A routing plugin.
 *
 * Reserved for future Geo/Language/A-B routing. A plugin installs itself into
 * the pipeline by registering hooks.
 */
export interface RoutingPlugin {
  /** The plugin's unique identifier. */
  readonly id: string;
  /** The plugin's semantic version. */
  readonly version: string;
  /** Installs the plugin, returning any hooks it contributes. */
  install(): { preResolve?: PreResolveHook[]; postResolve?: PostResolveHook[] };
}
