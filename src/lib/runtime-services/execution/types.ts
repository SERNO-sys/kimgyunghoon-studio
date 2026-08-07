/**
 * AWIE V2 - Phase 11 M3: Execution Control - Contract Types.
 *
 * This module defines the execution-control primitives that flow through the
 * runtime:
 *
 *   - TraceContext: rich, nested tracing metadata (NOT a bare UUID string).
 *   - CancellationToken: cooperative cancellation of heavy tasks.
 *   - Deadline: a hard execution timeout.
 *   - ExecutionContext: bundles trace + cancellation + deadline for a unit of
 *     work.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - These are pure infrastructure primitives.
 *   2. ZERO RENDERING - They NEVER render UI.
 *   3. COOPERATIVE - Cancellation and deadlines are cooperative: the executing
 *      code checks them and aborts. They do NOT force-kill threads.
 *   4. NESTED - TraceContext supports parent/child nesting for background jobs,
 *      previews, and other nested operations.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

/**
 * A rich, nested tracing context.
 *
 * Unlike a bare UUID string, a TraceContext carries the full correlation chain:
 * the root trace id, the parent operation's trace id (for nesting), the request
 * id, the tenant id, and the timestamp. This enables distributed tracing across
 * background jobs, previews, and nested pipeline stages.
 */
export interface TraceContext {
  /** The root trace id for the entire operation tree. */
  readonly traceId: string;
  /** The trace id of the parent operation, if this is a nested operation. */
  readonly parentTraceId?: string;
  /** The id of the originating request (e.g. an HTTP request id). */
  readonly requestId?: string;
  /** The id of the tenant/site this operation belongs to. */
  readonly tenantId?: string;
  /** The ISO-8601 timestamp when the trace was created. */
  readonly timestamp: string;
}

/**
 * A cooperative cancellation token.
 *
 * Allows a user or the system to request that a heavy task (e.g. a media
 * pipeline, a large render) be aborted. The executing code MUST check
 * `isCancelled()` at safe points and abort cooperatively.
 */
export interface CancellationToken {
  /**
   * Returns whether cancellation has been requested.
   */
  isCancelled(): boolean;

  /**
   * Requests cancellation. Idempotent.
   */
  cancel(): void;

  /**
   * Throws a CancelledError if cancellation has been requested.
   *
   * Call this at safe points inside a long-running task to abort cooperatively.
   */
  throwIfCancelled(): void;
}

/**
 * A hard execution deadline.
 *
 * Encapsulates a timeout for a unit of work. The executing code checks
 * `isExpired()` at safe points and aborts when the deadline has passed.
 */
export interface Deadline {
  /**
   * Returns whether the deadline has expired.
   */
  isExpired(): boolean;

  /**
   * Returns the remaining time in milliseconds (0 if expired).
   */
  remainingMs(): number;

  /**
   * Throws a DeadlineExceededError if the deadline has expired.
   */
  throwIfExpired(): void;
}

/**
 * The execution context passed through a unit of work.
 *
 * Bundles the trace context, an optional cancellation token, and an optional
 * deadline. This is the single object threaded through the execution flow so
 * that every stage can observe tracing, cancellation, and timeout.
 */
export interface ExecutionContext {
  /** The rich tracing context. */
  readonly trace: TraceContext;
  /** The cooperative cancellation token (optional). */
  readonly cancellation?: CancellationToken;
  /** The hard execution deadline (optional). */
  readonly deadline?: Deadline;
}

/**
 * Thrown when a task is cancelled via a CancellationToken.
 */
export class CancelledError extends Error {
  constructor(message = 'The operation was cancelled.') {
    super(message);
    this.name = 'CancelledError';
  }
}

/**
 * Thrown when a task exceeds its Deadline.
 */
export class DeadlineExceededError extends Error {
  constructor(message = 'The operation exceeded its deadline.') {
    super(message);
    this.name = 'DeadlineExceededError';
  }
}
