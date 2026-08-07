/**
 * AWIE V2 - Phase 11 M2: Migration Pipeline - barrel export.
 *
 * Migration is a PIPELINE, not a monolithic service. It is decomposed into a
 * VersionPolicy (detection/dictation), a MigrationRuleRegistry (O(1) rule
 * store), and a MigrationPipeline (sequential chaining).
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

// Contract types.
export type {
  MigrationPipeline,
  MigrationResult,
  MigrationRule,
  MigrationRuleRegistry,
  Version,
  VersionPolicy,
} from './types';

// VersionPolicy.
export { SemanticVersionPolicy } from './version-policy';

// MigrationRuleRegistry.
export { DefaultMigrationRuleRegistry } from './migration-rule-registry';

// MigrationPipeline.
export {
  DefaultMigrationPipeline,
  MigrationChainGapError,
} from './migration-pipeline';
