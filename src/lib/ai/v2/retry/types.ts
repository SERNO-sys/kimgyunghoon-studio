/**
 * AWIE V2 - Retry Engine types.
 *
 * The Retry Engine wraps the execution pipeline. It catches validation
 * failures, calls PromptBuilder.buildRepair(), and re-executes the
 * Provider -> Sanitizer -> Validator loop until the output is valid or the
 * retry budget is exhausted.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { AIRequest, AIResult } from '../types';

/** The outcome of a single pipeline attempt. */
export type AttemptOutcome<T = unknown> =
  | { status: 'success'; result: AIResult; data: T }
  | { status: 'validation_failed'; result: AIResult; errors: string[] }
  | { status: 'provider_failed'; result: AIResult };

/**
 * A retry strategy decides whether to retry and how long to wait before the
 * next attempt. Strategies are independently testable and replaceable.
 */
export interface RetryStrategy {
  /**
   * Returns whether another attempt should be made given the current attempt
   * number (1-based) and the last outcome.
   */
  shouldRetry(attempt: number, outcome: AttemptOutcome): boolean;

  /**
   * Returns the delay in milliseconds before the next attempt.
   */
  delayMs(attempt: number, outcome: AttemptOutcome): number;
}

/** Options for the ValidationRetryStrategy. */
export interface ValidationRetryStrategyOptions {
  /** Maximum number of attempts (including the first). Defaults to 3. */
  maxAttempts?: number;
  /** Delay between attempts in milliseconds. Defaults to 0. */
  baseDelayMs?: number;
}

/** Options for the ProviderRetryStrategy. */
export interface ProviderRetryStrategyOptions {
  /** Maximum number of attempts (including the first). Defaults to 4. */
  maxAttempts?: number;
  /** Base delay in milliseconds. Defaults to 200. */
  baseDelayMs?: number;
  /** Backoff multiplier. Defaults to 2. */
  factor?: number;
  /** Maximum delay cap in milliseconds. Defaults to 5000. */
  maxDelayMs?: number;
  /** Maximum jitter ratio (0..1) applied to each delay. Defaults to 0.2. */
  jitter?: number;
}

/** Options for the ExponentialBackoffStrategy. */
export interface ExponentialBackoffStrategyOptions {
  /** Maximum number of attempts (including the first). Defaults to 4. */
  maxAttempts?: number;
  /** Base delay in milliseconds. Defaults to 200. */
  baseDelayMs?: number;
  /** Backoff multiplier. Defaults to 2. */
  factor?: number;
  /** Maximum delay cap in milliseconds. Defaults to 5000. */
  maxDelayMs?: number;
  /** Maximum jitter ratio (0..1) applied to each delay. Defaults to 0.2. */
  jitter?: number;
}


/** Options for constructing a PipelineExecutor. */
export interface PipelineExecutorOptions {
  /** The retry strategy to use. */
  strategy: RetryStrategy;
  /** Whether to sleep between attempts. Disable in tests. Defaults to true. */
  sleep?: boolean;
}
