/**
 * AWIE V2 - Phase 14.4: CMS Infrastructure - CachedCompositionService Decorator.
 *
 * This is the Read-Through / Write-Through Decorator that layers the L1
 * Composition Cache (CMS side) on top of the inner ICompositionService.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. Request != Identity. A CompositionRequest merely ASKS for a composition.
 *    The actual cache key is a CompositionIdentity, derived via the injected
 *    IIdentityResolver.
 *
 * 2. Infrastructure Only (No Invalidation in Decorator). This Decorator ONLY
 *    performs Read-Through / Write-Through. It does NOT invalidate, delete, or
 *    flush the cache. Invalidation belongs entirely to the Application Layer.
 *
 * 3. Error Passthrough. If the inner service throws an error (e.g.
 *    NotFoundError), the cache MUST NOT store it. The error bubbles up
 *    immediately.
 *
 * 4. STRICTLY Side-Effect Free. This Decorator MUST NOT mutate Project,
 *    LocaleVariant, Brand, Plugin, or any CMS model. Its singular, immutable
 *    responsibility is to output a ThemeConfig.
 * ============================================================================
 */

import type { ThemeConfig } from '../../../lib/theme-config/v2/types';
import type {
  CompositionRequest,
  ICompositionCacheProvider,
  ICompositionService,
  IIdentityResolver,
} from './types';

/**
 * A Read-Through / Write-Through Decorator over an inner ICompositionService.
 *
 * Implements ICompositionService. The constructor injects:
 * - inner: ICompositionService (the actual composer)
 * - cache: ICompositionCacheProvider (the L1 Composition Cache)
 * - identityResolver: IIdentityResolver (derives the cache key)
 *
 * compose(request) workflow:
 *   1. Resolve the CompositionIdentity via the injected IIdentityResolver.
 *   2. cache.get(identity).
 *   3. On a miss: call inner.compose(request), then cache.set(identity, result).
 *   4. Return the ThemeConfig.
 *
 * STRICT RULES:
 * - The cache is ONLY read-through / write-through. There is NO invalidation,
 *   deletion, or flushing here. Invalidation belongs to the Application Layer.
 * - If the inner service throws (e.g. NotFoundError), the error is NOT cached
 *   and bubbles up immediately.
 */
export class CachedCompositionService implements ICompositionService {
  private readonly inner: ICompositionService;
  private readonly cache: ICompositionCacheProvider;
  private readonly identityResolver: IIdentityResolver;

  constructor(
    inner: ICompositionService,
    cache: ICompositionCacheProvider,
    identityResolver: IIdentityResolver,
  ) {
    this.inner = inner;
    this.cache = cache;
    this.identityResolver = identityResolver;
  }

  /**
   * Composes a Project into a single immutable ThemeConfig, using the L1
   * Composition Cache as a Read-Through / Write-Through layer.
   *
   * @param request - The minimal composition request (projectId + context).
   * @returns A Promise resolving to the immutable execution contract.
   */
  async compose(request: CompositionRequest): Promise<ThemeConfig> {
    // 1. Resolve the immutable CompositionIdentity (cache key).
    const identity = this.identityResolver.resolve(request);

    // 2. Read-Through: attempt a cache hit.
    const cached = await this.cache.get(identity);
    if (cached !== null) {
      return cached;
    }

    // 3. Cache miss: delegate to the inner composer.
    const result = await this.inner.compose(request);

    // 4. Write-Through: store the result under the identity.
    //
    //    NOTE: If inner.compose throws (e.g. NotFoundError), this line is never
    //    reached. The error bubbles up immediately and is NEVER cached.
    await this.cache.set(identity, result);

    return result;
  }
}
