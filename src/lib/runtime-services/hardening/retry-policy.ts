/**
 * AWIE V2 - Phase 11 M3: Resilience Layer - RetryPolicy.
 *
 * A retry policy that retries a failing operation with exponential backoff. It
 * is a DISTINCT utility from the CircuitBreaker and is composed with it when
 * wrapping an external client.
 *
 * CRITICAL BOUNDARY: This wraps an ExternalClient adapter — it NEVER wraps a
 * platform RuntimeService. The core Runtime Services remain completely unaware
 * of resilience mechanics.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. EXTERNAL BOUNDARY - Protects external clients, never platform services.
 *   4. DISTINCT PATTERN - RetryPolicy is separate from CircuitBreaker.
 *   5. EXPONENTIAL BACKOFF - delay = baseDelayMs * backoffMultiplier^attempt.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { RetriesExhaustedError, type RetryPolicy, type RetryPolicyConfig } from './types';

/**
 * The default RetryPolicy.
 *
 * Retries a failing operation up to maxRetries times with exponential backoff.
 * The sleep function is injectable for deterministic testing.
 */
export class DefaultRetryPolicy implements RetryPolicy {
  /** The configuration. */
  private readonly config: RetryPolicyConfig;
  /** The sleep function (injectable for tests). */
  private readonly sleep: (ms: number) => void;

  /**
   * Constructs a DefaultRetryPolicy.
   *
   * @param config The retry policy configuration.
   * @param sleep An optional sleep function (defaults to a synchronous wait).
   */
  constructor(
    config: RetryPolicyConfig,
    sleep: (ms: number) => void = (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        /* busy-wait */
      }
    },
  ) {
    this.config = config;
    this.sleep = sleep;
  }

  /**
   * Executes an operation with retry.
   */
  execute<T>(operation: () => T): T {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return operation();
      } catch (error) {
        const isRetryable = this.config.isRetryable ? this.config.isRetryable(error) : true;
        if (!isRetryable || attempt >= this.config.maxRetries) {
          throw new RetriesExhaustedError(attempt + 1, error);
        }
        const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
        this.sleep(delay);
        attempt++;
      }
    }
  }
}
