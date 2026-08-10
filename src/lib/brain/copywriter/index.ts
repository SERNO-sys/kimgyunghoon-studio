/**
 * AWIE V2 Brain — AI #2 Copywriter barrel export (Step 11).
 *
 * Exposes the AI #2 expression-layer contracts: the output contract, the
 * provider-independent interface, the deterministic prompt builder, and the
 * deterministic mock provider.
 *
 * This module is PURE DATA MODELING + deterministic translation. It contains no
 * business logic, no Decision Rules, no Recipe Rules, and no UI concepts. It
 * does NOT connect to any external LLM API.
 */

export * from './types';
export * from './prompt-builder';
export * from './mock-provider';
