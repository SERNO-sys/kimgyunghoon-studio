/**
 * AWIE V2 - Phase 11 M3: Resilience Layer - CircuitBreaker.
 *
 * A circuit breaker that protects an EXTERNAL integration (CDN client, external
 * CMS adapter, third-party API) from cascading failures.
 *
 * CRITICAL BOUNDARY: This wraps an ExternalClient adapter — it NEVER wraps a
 * platform RuntimeService. The core Runtime Services remain completely unaware
 * of resilience mechanics.
 *
 * State machine:
 *   - 'closed'    -> normal operation; calls pass through. After
 *                    failureThreshold consecutive failures, transitions to
 *                    'open'.
 *   - 'open'      -> calls fail fast with CircuitOpenError. After openTimeoutMs,
 *                    transitions to 'half-open'.
 *   - 'half-open' -> a probe call is allowed. On successThreshold consecutive
 *                    successes, resets to 'closed'. On any failure, returns to
 *                    'open'.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. EXTERNAL BOUNDARY - Protects external clients, never platform services.
 *   4. DETERMINISTIC - Given the same inputs, the same state transitions occur.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import {
  CircuitOpenError,
  type CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitState,
} from './types';

/**
 * The default CircuitBreaker.
 *
 * The clock is injectable for deterministic testing.
 */
export class DefaultCircuitBreaker implements CircuitBreaker {
  /** The configuration. */
  private readonly config: CircuitBreakerConfig;
  /** The clock used to read the current time. */
  private readonly now: () => number;

  /** The current circuit state. */
  private currentState: CircuitState = 'closed';
  /** The consecutive failure count (in 'closed'). */
  private failureCount = 0;
  /** The consecutive success count (in 'half-open'). */
  private successCount = 0;
  /** The timestamp when the circuit was opened. */
  private openedAt = 0;

  /**
   * Constructs a DefaultCircuitBreaker.
   *
   * @param config The circuit breaker configuration.
   * @param now An optional clock (defaults to Date.now). Injectable for tests.
   */
  constructor(config: CircuitBreakerConfig, now: () => number = () => Date.now()) {
    this.config = config;
    this.now = now;
  }

  /**
   * Returns the current circuit state.
   */
  state(): CircuitState {
    // If open and the timeout has elapsed, transition to half-open lazily.
    if (this.currentState === 'open' && this.now() - this.openedAt >= this.config.openTimeoutMs) {
      this.currentState = 'half-open';
      this.successCount = 0;
    }
    return this.currentState;
  }

  /**
   * Executes a protected operation through the circuit.
   */
  execute<T>(operation: () => T): T {
    const state = this.state();
    if (state === 'open') {
      throw new CircuitOpenError();
    }
    try {
      const result = operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Records a successful call.
   */
  recordSuccess(): void {
    if (this.currentState === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else {
      // In 'closed', a success resets the failure count.
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed call.
   */
  recordFailure(): void {
    if (this.currentState === 'half-open') {
      // A failure in half-open trips the circuit back to open.
      this.trip();
      return;
    }
    this.failureCount++;
    if (this.failureCount >= this.config.failureThreshold) {
      this.trip();
    }
  }

  /**
   * Trips the circuit to 'open'.
   */
  private trip(): void {
    this.currentState = 'open';
    this.openedAt = this.now();
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Resets the circuit to 'closed'.
   */
  private reset(): void {
    this.currentState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}
