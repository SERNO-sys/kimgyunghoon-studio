/**
 * AWIE V2 - Phase 11 M3: Resilience Layer - barrel export.
 *
 * Re-exports the resilience utilities (CircuitBreaker, RetryPolicy) and the
 * ExternalClient adapter that demonstrates the critical boundary.
 */

export * from './types';
export * from './circuit-breaker';
export * from './retry-policy';
export * from './external-client';
