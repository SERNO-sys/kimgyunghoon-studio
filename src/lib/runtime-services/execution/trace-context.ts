/**
 * AWIE V2 - Phase 11 M3: Execution Control - TraceContext factory.
 *
 * A rich, nested tracing context. Unlike a bare UUID string, a TraceContext
 * carries the full correlation chain (traceId, parentTraceId, requestId,
 * tenantId, timestamp) so that nested operations (background jobs, previews,
 * pipeline stages) can be correlated end-to-end.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. NESTED - child() creates a nested trace that links back to its parent.
 *   4. DETERMINISTIC - Given the same inputs, the same trace shape is produced.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { TraceContext } from './types';

/**
 * Generates a unique id for a trace.
 *
 * Uses a monotonic counter + timestamp + random suffix. This is a lightweight,
 * collision-resistant id generator suitable for runtime tracing. It is NOT a
 * cryptographic id.
 *
 * @returns A unique trace id.
 */
function generateId(): string {
  const counter = (globalThis as { __awieTraceCounter?: number }).__awieTraceCounter ?? 0;
  (globalThis as { __awieTraceCounter?: number }).__awieTraceCounter = counter + 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `tr-${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}

/**
 * Creates a new root TraceContext.
 *
 * @param options Optional request/tenant correlation ids.
 * @returns A new root TraceContext.
 */
export function createTraceContext(options?: {
  requestId?: string;
  tenantId?: string;
}): TraceContext {
  return {
    traceId: generateId(),
    requestId: options?.requestId,
    tenantId: options?.tenantId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a nested TraceContext that links back to a parent.
 *
 * The child inherits the parent's requestId and tenantId (correlation chain),
 * records the parent's traceId as parentTraceId, and gets its own fresh
 * traceId. This supports nested operations such as background jobs and
 * previews.
 *
 * @param parent The parent TraceContext.
 * @returns A nested child TraceContext.
 */
export function createChildTraceContext(parent: TraceContext): TraceContext {
  return {
    traceId: generateId(),
    parentTraceId: parent.traceId,
    requestId: parent.requestId,
    tenantId: parent.tenantId,
    timestamp: new Date().toISOString(),
  };
}
