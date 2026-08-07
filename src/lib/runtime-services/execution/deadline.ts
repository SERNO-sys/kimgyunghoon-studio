/**
 * AWIE V2 - Phase 11 M3: Execution Control - Deadline.
 *
 * A hard execution deadline. Encapsulates a timeout for a unit of work. The
 * executing code checks `isExpired()` / `throwIfExpired()` at safe points and
 * aborts when the deadline has passed.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. COOPERATIVE - Deadlines are cooperative, not a force-kill.
 *   4. DETERMINISTIC - Given the same timeout, the same deadline shape is
 *      produced.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { DeadlineExceededError, type Deadline } from './types';

/**
 * The default Deadline.
 *
 * Computes an absolute expiry timestamp from a relative timeout (in ms). The
 * clock is injectable for deterministic testing.
 */
export class DefaultDeadline implements Deadline {
  /** The absolute expiry timestamp (epoch ms). */
  private readonly expiresAt: number;
  /** The clock used to read the current time. */
  private readonly now: () => number;

  /**
   * Constructs a DefaultDeadline.
   *
   * @param timeoutMs The relative timeout in milliseconds.
   * @param now An optional clock (defaults to Date.now). Injectable for tests.
   */
  constructor(timeoutMs: number, now: () => number = () => Date.now()) {
    this.now = now;
    this.expiresAt = now() + timeoutMs;
  }

  /**
   * Returns whether the deadline has expired.
   */
  isExpired(): boolean {
    return this.now() >= this.expiresAt;
  }

  /**
   * Returns the remaining time in milliseconds (0 if expired).
   */
  remainingMs(): number {
    const remaining = this.expiresAt - this.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Throws a DeadlineExceededError if the deadline has expired.
   */
  throwIfExpired(): void {
    if (this.isExpired()) {
      throw new DeadlineExceededError();
    }
  }
}
