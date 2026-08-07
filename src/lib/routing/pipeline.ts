/**
 * AWIE V2 - Routing Pipeline.
 *
 * Orchestrates the deterministic, framework-agnostic routing flow:
 *
 *   HostNormalizer -> TenantResolver -> PreviewResolver -> PublicationGuard
 *     -> RoutingResult
 *
 * The pipeline NEVER loads, parses, or validates the ThemeConfig. It strictly
 * stops at returning the themeConfigId. RoutingResult contains ONLY routing
 * decisions.
 *
 * Extensibility:
 *   - PreResolve / PostResolve hooks (for future Geo/Language/A-B routing).
 *   - RoutingCache (for future scaling).
 *   - RoutingPlugin (installs hooks).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  NormalizedHost,
  PostResolveHook,
  PreResolveHook,
  RoutingCache,
  RoutingPlugin,
  RoutingRequest,
  RoutingResult,
} from './types';
import { HostNormalizer, normalizeHost } from './normalizer';
import {
  PreviewResolver,
  PublicationGuard,
  TenantResolver,
  type DomainRepository,
} from './resolver';
import { assertPreviewValid } from './security';
import { SiteNotPublishedError } from './errors';

/** Options for constructing the routing pipeline. */
export interface RoutingPipelineOptions {
  /** The domain repository backing resolution. */
  repository: DomainRepository;
  /** Optional pre-resolve hooks. */
  preResolve?: PreResolveHook[];
  /** Optional post-resolve hooks. */
  postResolve?: PostResolveHook[];
  /** Optional routing cache. */
  cache?: RoutingCache;
  /** Optional routing plugins. */
  plugins?: RoutingPlugin[];
}

/**
 * The routing pipeline.
 *
 * Deterministic and framework-agnostic. Adapters map their request into a
 * RoutingRequest and call resolve().
 */
export class RoutingPipeline {
  private readonly normalizer: HostNormalizer;
  private readonly tenantResolver: TenantResolver;
  private readonly previewResolver: PreviewResolver;
  private readonly publicationGuard: PublicationGuard;
  private readonly preResolve: PreResolveHook[];
  private readonly postResolve: PostResolveHook[];
  private readonly cache?: RoutingCache;

  constructor(options: RoutingPipelineOptions) {
    this.normalizer = new HostNormalizer();
    this.tenantResolver = new TenantResolver(options.repository);
    this.previewResolver = new PreviewResolver(options.repository);
    this.publicationGuard = new PublicationGuard();
    this.cache = options.cache;

    // Collect hooks from options and plugins.
    this.preResolve = [...(options.preResolve ?? [])];
    this.postResolve = [...(options.postResolve ?? [])];
    for (const plugin of options.plugins ?? []) {
      const hooks = plugin.install();
      this.preResolve.push(...(hooks.preResolve ?? []));
      this.postResolve.push(...(hooks.postResolve ?? []));
    }
  }

  /**
   * Resolves a routing request into a RoutingResult.
   *
   * Flow:
   *   1. Run pre-resolve hooks.
   *   2. Normalize the host.
   *   3. Check the cache.
   *   4. Resolve the tenant (Domain -> Tenant).
   *   5. Guard publication state (PreviewResolver + PublicationGuard).
   *   6. Build the RoutingResult.
   *   7. Run post-resolve hooks.
   */
  resolve(request: RoutingRequest): RoutingResult {
    // 1. Pre-resolve hooks.
    let current = request;
    for (const hook of this.preResolve) {
      current = hook.beforeResolve(current);
    }

    // 2. Normalize the host BEFORE tenant resolution.
    const host = this.normalizer.normalize(current.host);

    // 3. Cache lookup.
    if (this.cache) {
      const cached = this.cache.get(host);
      if (cached) {
        return cached;
      }
    }

    // 4. Resolve the tenant (Domain -> Tenant -> ThemeConfig).
    const tenant = this.tenantResolver.resolve(host);

    // 5. Publication guard.
    const isPublic = this.publicationGuard.isPubliclyRoutable(tenant.publicationState);
    let isPreview = false;

    if (!isPublic) {
      const preview = this.previewResolver.resolve(tenant.id);
      if (!preview) {
        throw new SiteNotPublishedError(host, tenant.publicationState);
      }
      const now = current.now ?? new Date().toISOString();
      assertPreviewValid(preview, current.previewToken, now);
      isPreview = true;
    }

    // 6. Build the RoutingResult (routing decisions ONLY).
    const result: RoutingResult = {
      tenantId: tenant.id,
      themeConfigId: tenant.themeConfigId,
      isPreview,
      locale: tenant.locale,
      canonicalUrl: buildCanonicalUrl(tenant.canonicalHost, current.path),
      publicationState: tenant.publicationState,
      host,
    };

    // Cache the result.
    if (this.cache) {
      this.cache.set(host, result);
    }

    // 7. Post-resolve hooks.
    for (const hook of this.postResolve) {
      hook.afterResolve(result);
    }

    return result;
  }
}

/**
 * Builds a canonical URL from a canonical host and a request path.
 */
export function buildCanonicalUrl(host: NormalizedHost, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${cleanPath}`;
}
