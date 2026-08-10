/**
 * AWIE V2 Brain — public barrel export.
 *
 * Exposes the foundational semantic/decision-side contracts established in
 * Step 01. These contracts are consumed by later Brain layers (Decision Engine,
 * Recipe Selection, Content Plan, Fact Validator).
 *
 * This module is PURE DATA MODELING. It contains no business logic, no Decision
 * Rules, no Recipe Rules, and no UI concepts.
 */

export * from './capability';
export * from './evidence';
export * from './business-meaning';
export * from './decision-context';
export * from './decision-plan';
export * from './decision-rules';
export * from './decision-rule-engine';
export * from './decision-state-resolver';
export * from './decision-planner';
export * from './recipe-bridge';
export * from './how-contract';
export * from './recipe-integration';
export * from './content-plan';
export * from './fact-validator';
export * from './copywriter';
export * from './theme-config-bridge';




