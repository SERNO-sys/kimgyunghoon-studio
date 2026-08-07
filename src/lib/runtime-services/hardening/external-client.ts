/**
 * AWIE V2 - Phase 11 M3: Resilience Layer - ExternalClient adapter.
 *
 * Demonstrates the CRITICAL BOUNDARY of the resilience layer: the CircuitBreaker
 * and RetryPolicy wrap an EXTERNAL client adapter (e.g. a CDN client, an
 * external CMS adapter, a third-party API), NOT a platform RuntimeService.
 *
 * The core Runtime Services (AssetResolver, Cache, etc.) remain completely
 * unaware of resilience mechanics. Resilience is applied at the boundary where
 * the platform talks to the outside world.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. EXTERNAL BOUNDARY - Resilience wraps external clients, never platform
 *      services.
 *   4. COMPOSITION - The CircuitBreaker and RetryPolicy are composed here, but
 *      remain DISTINCT utilities.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { CircuitBreaker, RetryPolicy } from './types';

/**
 * The contract of an external client adapter.
 *
 * This is the seam between the platform and an external integration. A concrete
 * implementation (e.g. a CDN client) is wrapped by the resilience layer.
 */
export interface ExternalClient {
  /**
   * Performs an external operation (e.g. fetch a remote asset, purge a CDN
   * cache entry).
   *
   * @param key The external resource key.
   * @returns The external result.
   */
  fetch(key: string): string;
}

/**
 * A resilient wrapper around an ExternalClient.
 *
 * Composes a CircuitBreaker and a RetryPolicy to protect the external
 * integration. The CircuitBreaker fails fast when the external service is
 * down; the RetryPolicy retries transient failures with backoff.
 *
 * This wrapper is applied to the EXTERNAL client — it is NEVER applied to a
 * platform RuntimeService.
 */
export class ResilientExternalClient implements ExternalClient {
  /** The underlying external client. */
  private readonly inner: ExternalClient;
  /** The circuit breaker. */
  private readonly breaker: CircuitBreaker;
  /** The retry policy. */
  private readonly retry: RetryPolicy;

  /**
   * Constructs a ResilientExternalClient.
   *
   * @param inner The underlying external client to protect.
   * @param breaker The circuit breaker.
   * @param retry The retry policy.
   */
  constructor(inner: ExternalClient, breaker: CircuitBreaker, retry: RetryPolicy) {
    this.inner = inner;
    this.breaker = breaker;
    this.retry = retry;
  }

  /**
   * Performs an external operation through the resilience layer.
   *
   * The retry policy handles transient failures; the circuit breaker fails fast
   * when the external service is persistently down.
   */
  fetch(key: string): string {
    return this.breaker.execute(() => this.retry.execute(() => this.inner.fetch(key)));
  }
}
