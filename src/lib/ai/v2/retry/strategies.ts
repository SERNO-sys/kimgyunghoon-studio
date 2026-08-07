/**
 * AWIE V2 - Retry strategies.
 *
 * Concrete RetryStrategy implementations. Each strategy is independently
 * testable and replaceable via the RetryStrategy interface.
 *
 * STRICT CONSTRAINT: These strategies MUST NOT contain any business logic.
 * They are pure infrastructure.
 */

import type {
  AttemptOutcome,
  ExponentialBackoffStrategyOptions,
  ProviderRetryStrategyOptions,
  RetryStrategy,
  ValidationRetryStrategyOptions,
} from './types';


/**
 * Retries only when validation failed (the model produced invalid output).
 * Provider failures are not retried by this strategy. Uses a fixed delay.
 */
export class ValidationRetryStrategy implements RetryStrategy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;

  constructor(options: ValidationRetryStrategyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 0;
  }

  shouldRetry(attempt: number, outcome: AttemptOutcome): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }
    return outcome.status === 'validation_failed';
  }

  delayMs(): number {
    return this.baseDelayMs;
  }
}

/**
 * Retries ONLY retryable provider failures (e.g. HTTP 500, 429 rate limits,
 * timeouts). Validation failures are NOT retried by this strategy — they are
 * handled by the ValidationRetryStrategy. Uses exponential backoff with jitter.
 */
export class ProviderRetryStrategy implements RetryStrategy {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly factor: number;
  private readonly maxDelayMs: number;
  private readonly jitter: number;

  constructor(options: ProviderRetryStrategyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 4;
    this.baseDelayMs = options.baseDelayMs ?? 200;
    this.factor = options.factor ?? 2;
    this.maxDelayMs = options.maxDelayMs ?? 5000;
    this.jitter = options.jitter ?? 0.2;
  }

  shouldRetry(attempt: number, outcome: AttemptOutcome): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }
    if (outcome.status !== 'provider_failed') {
      return false;
    }
    return outcome.result.error?.retryable ?? false;
  }

  delayMs(attempt: number): number {
    const exp = Math.pow(this.factor, attempt - 1);
    const base = Math.min(this.baseDelayMs * exp, this.maxDelayMs);
    const jitterAmount = base * this.jitter;
    const jittered = base - jitterAmount + Math.random() * jitterAmount * 2;
    return Math.max(0, Math.round(jittered));
  }
}

/**
 * Retries validation failures AND retryable provider failures (e.g. rate
 * limits, timeouts) using exponential backoff with jitter.
 */
export class ExponentialBackoffStrategy implements RetryStrategy {

  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly factor: number;
  private readonly maxDelayMs: number;
  private readonly jitter: number;

  constructor(options: ExponentialBackoffStrategyOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? 4;
    this.baseDelayMs = options.baseDelayMs ?? 200;
    this.factor = options.factor ?? 2;
    this.maxDelayMs = options.maxDelayMs ?? 5000;
    this.jitter = options.jitter ?? 0.2;
  }

  shouldRetry(attempt: number, outcome: AttemptOutcome): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }
    if (outcome.status === 'validation_failed') {
      return true;
    }
    if (outcome.status === 'provider_failed') {
      return outcome.result.error?.retryable ?? false;
    }
    return false;
  }

  delayMs(attempt: number): number {
    const exp = Math.pow(this.factor, attempt - 1);
    const base = Math.min(this.baseDelayMs * exp, this.maxDelayMs);
    const jitterAmount = base * this.jitter;
    const jittered = base - jitterAmount + Math.random() * jitterAmount * 2;
    return Math.max(0, Math.round(jittered));
  }
}
