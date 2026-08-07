/**
 * AWIE V2 - Phase 11 M3: Execution Control - CancellationToken.
 *
 * A cooperative cancellation token. Allows a user or the system to request that
 * a heavy task (e.g. a media pipeline, a large render) be aborted. The
 * executing code checks `isCancelled()` / `throwIfCancelled()` at safe points
 * and aborts cooperatively.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. COOPERATIVE - Cancellation is cooperative, not a force-kill.
 *   4. IDEMPOTENT - cancel() may be called multiple times safely.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { CancelledError, type CancellationToken } from './types';

/**
 * The default CancellationToken.
 *
 * Backed by a simple boolean flag. Once cancelled, it stays cancelled.
 */
export class DefaultCancellationToken implements CancellationToken {
  /** Whether cancellation has been requested. */
  private cancelled = false;

  /**
   * Returns whether cancellation has been requested.
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Requests cancellation. Idempotent.
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Throws a CancelledError if cancellation has been requested.
   */
  throwIfCancelled(): void {
    if (this.cancelled) {
      throw new CancelledError();
    }
  }
}
