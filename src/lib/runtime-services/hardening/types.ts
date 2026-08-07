/**
 * AWIE V2 - Phase 11 M3: Resilience Layer - Contract Types.
 *
 * This module defines the resilience utilities that protect EXTERNAL
 * integrations (CDN clients, external CMS adapters, third-party APIs) from
 * cascading failures.
 *
 * CRITICAL BOUNDARY: The CircuitBreaker and RetryPolicy protect EXTERNAL
 * integrations, NOT the platform services themselves. They wrap an
 * ExternalClient adapter — they NEVER wrap a platform RuntimeService. The core
 * Runtime Services remain completely unaware of resilience mechanics.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. EXTERNAL BOUNDARY - Resilience wraps external clients, never platform
 *      services.
 *   4. DISTINCT PATTERNS - CircuitBreaker and RetryPolicy are SEPARATE
 *      utilities. They are composed, not merged.
 *   5. DETERMINISTIC - Given the same inputs, the same state transitions occur.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

/**
 * The state of a circuit breaker.
 *
 *   - 'closed'   - normal operation; calls pass through.
 *   - 'open'     - the circuit is tripped; calls fail fast without invoking the
 *                  protected operation.
 *   - 'half-open' - a probe call is allowed to test recovery.
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * The configuration of a CircuitBreaker.
 */
export interface CircuitBreakerConfig {
  /**
   * The number of consecutive failures required to trip the circuit from
   * 'closed' to 'open'.
   */
  readonly failureThreshold: number;
  /**
   * The number of successful probe calls required in 'half-open' to reset the
   * circuit back to 'closed'.
   */
  readonly successThreshold: number;
  /**
   * The time (ms) the circuit stays 'open' before transitioning to 'half-open'.
   */
  readonly openTimeoutMs: number;
}

/**
 * The CircuitBreaker contract.
 *
 * Protects an external integration. When the circuit is 'open', calls fail fast
 * with a CircuitOpenError without invoking the protected operation.
 */
export interface CircuitBreaker {
  /**
   * Returns the current circuit state.
   */
  state(): CircuitState;

  /**
   * Executes a protected operation through the circuit.
   *
   * @param operation The operation to execute.
   * @returns The operation's result.
   * @throws {CircuitOpenError} If the circuit is open.
   */
  execute<T>(operation: () => T): T;

  /**
   * Records a successful call (used internally by execute, exposed for
   * observability/testing).
   */
  recordSuccess(): void;

  /**
   * Records a failed call (used internally by execute, exposed for
   * observability/testing).
   */
  recordFailure(): void;
}

/**
 * The configuration of a RetryPolicy.
 */
export interface RetryPolicyConfig {
  /**
   * The maximum number of retry attempts (excluding the initial call).
   */
  readonly maxRetries: number;
  /**
   * The base delay (ms) between retries. The actual delay is
   * baseDelayMs * backoffMultiplier^attempt.
   */
  readonly baseDelayMs: number;
  /**
   * The backoff multiplier (default 2 for exponential backoff).
   */
  readonly backoffMultiplier: number;
  /**
   * An optional predicate deciding whether a thrown error is retryable.
   * Defaults to retrying all errors.
   */
  readonly isRetryable?: (error: unknown) => boolean;
}

/**
 * The RetryPolicy contract.
 *
 * Retries a failing operation with exponential backoff. It is a DISTINCT
 * utility from the CircuitBreaker and is composed with it when wrapping an
 * external client.
 */
export interface RetryPolicy {
  /**
   * Executes an operation with retry.
   *
   * @param operation The operation to execute.
   * @returns The operation's result.
   * @throws The last error if all retries are exhausted.
   */
  execute<T>(operation: () => T): T;
}

/**
 * Thrown when a CircuitBreaker is open and a call fails fast.
 */
export class CircuitOpenError extends Error {
  constructor(message = 'The circuit is open; the call failed fast.') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Thrown when a RetryPolicy exhausts all retry attempts.
 */
export class RetriesExhaustedError extends Error {
  /** The number of attempts made (initial + retries). */
  readonly attempts: number;

  constructor(attempts: number, cause?: unknown) {
    super(`All ${attempts} retry attempts were exhausted.`);
    this.name = 'RetriesExhaustedError';
    this.attempts = attempts;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
