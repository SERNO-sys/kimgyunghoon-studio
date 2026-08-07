/**
 * AWIE V2 - Phase 11 M3: Execution Control - ExecutionContext factory.
 *
 * Bundles a TraceContext, an optional CancellationToken, and an optional
 * Deadline into a single object threaded through the execution flow. Every
 * stage can observe tracing, cancellation, and timeout without coupling to any
 * concrete implementation.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. COOPERATIVE - Cancellation and deadlines are cooperative.
 *   4. COMPOSABLE - An ExecutionContext can be created from any combination of
 *      trace, cancellation, and deadline.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { CancellationToken, Deadline, ExecutionContext, TraceContext } from './types';

/**
 * Creates an ExecutionContext.
 *
 * @param trace The rich tracing context.
 * @param options Optional cancellation token and/or deadline.
 * @returns A new ExecutionContext.
 */
export function createExecutionContext(
  trace: TraceContext,
  options?: {
    cancellation?: CancellationToken;
    deadline?: Deadline;
  },
): ExecutionContext {
  return {
    trace,
    cancellation: options?.cancellation,
    deadline: options?.deadline,
  };
}
