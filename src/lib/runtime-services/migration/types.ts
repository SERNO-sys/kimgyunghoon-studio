/**
 * AWIE V2 - Phase 11 M2: Migration Pipeline - Contract Types.
 *
 * Migration is a PIPELINE, not a monolithic service. It is decomposed into:
 *   - VersionPolicy: detects and dictates versioning rules (WHAT to migrate).
 *   - MigrationRule: a single, atomic, versioned transformation (HOW to migrate).
 *   - MigrationRuleRegistry: the O(1) registry of available rules.
 *   - MigrationPipeline: chains rules sequentially (v1 -> v1.1 -> v1.5 -> v2).
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. SEPARATION OF CONCERNS - VersionPolicy (detection/dictation) is SEPARATE
 *      from migration execution (rules). They are never merged.
 *   2. CHAINING - The pipeline applies rules sequentially, never in one
 *      hardcoded step.
 *   3. ZERO BUSINESS LOGIC - Migration is pure infrastructure. It NEVER imports
 *      BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   4. ZERO RENDERING - Migration NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

/**
 * A semantic version string (e.g. "1.0.0", "1.1.0", "2.0.0").
 */
export type Version = string;

/**
 * The VersionPolicy contract.
 *
 * A VersionPolicy is responsible for:
 *   - DETECTING the current version of a payload.
 *   - DICTATING the versioning rules (e.g. how versions compare, what the
 *     target version is).
 *
 * It is SEPARATE from migration execution. The policy decides; the pipeline
 * executes.
 */
export interface VersionPolicy {
  /**
   * Detects the version of a payload.
   *
   * @param payload The payload to inspect.
   * @returns The detected version.
   */
  detectVersion(payload: unknown): Version;

  /**
   * Returns whether a migration is required to bring a payload from its
   * current version up to the target version.
   *
   * @param current The current version.
   * @param target The target version.
   */
  requiresMigration(current: Version, target: Version): boolean;

  /**
   * Compares two versions.
   *
   * @param a The first version.
   * @param b The second version.
   * @returns A negative number if a < b, zero if a === b, positive if a > b.
   */
  compare(a: Version, b: Version): number;
}

// ---------------------------------------------------------------------------
// Migration Rules
// ---------------------------------------------------------------------------

/**
 * A single, atomic, versioned migration rule.
 *
 * Each rule transforms a payload from one version to the next. Rules are
 * composable: the pipeline chains them sequentially.
 */
export interface MigrationRule {
  /** The version this rule migrates FROM. */
  readonly fromVersion: Version;
  /** The version this rule migrates TO. */
  readonly toVersion: Version;

  /**
   * Applies the migration to a payload.
   *
   * @param payload The payload to migrate.
   * @returns The migrated payload.
   */
  migrate(payload: unknown): unknown;
}

/**
 * The MigrationRuleRegistry contract.
 *
 * Backed by an O(1) Map (universal registry pattern). It stores rules keyed by
 * their `fromVersion`, enabling the pipeline to look up the next rule in O(1).
 */
export interface MigrationRuleRegistry {
  /**
   * Registers a migration rule.
   *
   * @param rule The rule to register.
   */
  register(rule: MigrationRule): void;

  /**
   * Retrieves the rule that migrates FROM a given version.
   *
   * @param fromVersion The source version.
   * @returns The rule, or undefined if none is registered.
   */
  get(fromVersion: Version): MigrationRule | undefined;

  /**
   * Returns whether a rule exists for the given source version.
   *
   * @param fromVersion The source version.
   */
  has(fromVersion: Version): boolean;

  /**
   * Returns all registered rules.
   */
  list(): MigrationRule[];
}

// ---------------------------------------------------------------------------
// Migration Pipeline
// ---------------------------------------------------------------------------

/**
 * The result of a migration run.
 */
export interface MigrationResult {
  /** The migrated payload. */
  readonly payload: unknown;
  /** The version the payload was migrated to. */
  readonly targetVersion: Version;
  /** The ordered list of rules that were applied. */
  readonly appliedRules: readonly MigrationRule[];
  /** Whether any migration was required. */
  readonly migrated: boolean;
}

/**
 * The MigrationPipeline contract.
 *
 * The pipeline chains rules sequentially (v1 -> v1.1 -> v1.5 -> v2) rather than
 * doing it all in one hardcoded step. It uses a VersionPolicy to detect the
 * current version and a MigrationRuleRegistry to resolve the next rule.
 */
export interface MigrationPipeline {
  /**
   * Migrates a payload from its detected version up to the target version.
   *
   * @param payload The payload to migrate.
   * @param targetVersion The target version.
   * @returns The migration result.
   */
  migrate(payload: unknown, targetVersion: Version): MigrationResult;
}
