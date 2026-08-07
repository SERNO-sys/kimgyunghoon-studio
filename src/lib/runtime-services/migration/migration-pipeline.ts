/**
 * AWIE V2 - Phase 11 M2: Migration Pipeline - DefaultMigrationPipeline.
 *
 * The pipeline chains migration rules sequentially (v1 -> v1.1 -> v1.5 -> v2)
 * rather than doing it all in one hardcoded step. It uses a VersionPolicy to
 * detect the current version and a MigrationRuleRegistry to resolve the next
 * rule in the chain.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. SEPARATION OF CONCERNS - The pipeline EXECUTES migrations. It does NOT
 *      dictate versioning rules (that is the VersionPolicy's job).
 *   2. CHAINING - Rules are applied sequentially, never in one hardcoded step.
 *   3. O(1) LOOKUP - Uses the MigrationRuleRegistry (Map) for O(1) rule lookup.
 *      No Array.find().
 *   4. ZERO BUSINESS LOGIC - The pipeline is pure infrastructure.
 *   5. ZERO RENDERING - The pipeline NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  MigrationPipeline,
  MigrationResult,
  MigrationRule,
  MigrationRuleRegistry,
  Version,
  VersionPolicy,
} from './types';

/**
 * Thrown when the pipeline cannot find a rule to migrate FROM a given version.
 *
 * This indicates a gap in the registered migration rules (a broken chain).
 */
export class MigrationChainGapError extends Error {
  /** The version with no outgoing migration rule. */
  readonly fromVersion: Version;

  constructor(fromVersion: Version) {
    super(
      `Migration chain gap: no rule registered to migrate FROM version "${fromVersion}". ` +
        'The migration rule chain is incomplete.',
    );
    this.name = 'MigrationChainGapError';
    this.fromVersion = fromVersion;
  }
}

/**
 * The default MigrationPipeline.
 *
 * Given a payload and a target version, it:
 *   1. Detects the current version via the VersionPolicy.
 *   2. If no migration is required, returns the payload unchanged.
 *   3. Otherwise, repeatedly resolves the next rule from the registry and
 *      applies it, chaining until the target version is reached.
 *
 * The chain is resolved in O(1) per step via the registry Map.
 */
export class DefaultMigrationPipeline implements MigrationPipeline {
  /** The VersionPolicy that detects and dictates versioning rules. */
  private readonly policy: VersionPolicy;
  /** The MigrationRuleRegistry that resolves the next rule. */
  private readonly registry: MigrationRuleRegistry;

  /**
   * Constructs a DefaultMigrationPipeline.
   *
   * @param policy The VersionPolicy used to detect the current version.
   * @param registry The MigrationRuleRegistry used to resolve rules.
   */
  constructor(policy: VersionPolicy, registry: MigrationRuleRegistry) {
    this.policy = policy;
    this.registry = registry;
  }

  /**
   * Migrates a payload from its detected version up to the target version.
   *
   * @param payload The payload to migrate.
   * @param targetVersion The target version.
   * @returns The migration result.
   * @throws {MigrationChainGapError} If the rule chain has a gap.
   */
  migrate(payload: unknown, targetVersion: Version): MigrationResult {
    const current = this.policy.detectVersion(payload);

    // No migration required if already at or beyond the target.
    if (!this.policy.requiresMigration(current, targetVersion)) {
      return {
        payload,
        targetVersion,
        appliedRules: [],
        migrated: false,
      };
    }

    const appliedRules: MigrationRule[] = [];
    let working = payload;
    let version = current;

    // Chain rules sequentially until the target version is reached.
    while (this.policy.requiresMigration(version, targetVersion)) {
      const rule = this.registry.get(version);
      if (!rule) {
        throw new MigrationChainGapError(version);
      }
      working = rule.migrate(working);
      appliedRules.push(rule);
      version = rule.toVersion;
    }

    return {
      payload: working,
      targetVersion,
      appliedRules,
      migrated: true,
    };
  }
}
