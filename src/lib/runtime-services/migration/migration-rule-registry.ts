/**
 * AWIE V2 - Phase 11 M2: Migration Pipeline - MigrationRuleRegistry.
 *
 * The O(1) registry of migration rules, keyed by their `fromVersion`. The
 * pipeline uses this registry to resolve the next rule in a chain.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. O(1) LOOKUP - Uses a Map for O(1) get/has. No Array.find().
 *   2. ZERO BUSINESS LOGIC - The registry is pure infrastructure.
 *   3. ZERO RENDERING - The registry NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { MigrationRule, MigrationRuleRegistry, Version } from './types';

/**
 * The default MigrationRuleRegistry.
 *
 * Backed by a standard Map keyed by `fromVersion` for O(1) lookups.
 */
export class DefaultMigrationRuleRegistry implements MigrationRuleRegistry {
  /** The O(1) rule store, keyed by fromVersion. */
  private readonly store = new Map<Version, MigrationRule>();

  /**
   * Registers a migration rule.
   *
   * @param rule The rule to register.
   */
  register(rule: MigrationRule): void {
    this.store.set(rule.fromVersion, rule);
  }

  /**
   * Retrieves the rule that migrates FROM a given version.
   *
   * @param fromVersion The source version.
   * @returns The rule, or undefined if none is registered.
   */
  get(fromVersion: Version): MigrationRule | undefined {
    return this.store.get(fromVersion);
  }

  /**
   * Returns whether a rule exists for the given source version.
   *
   * @param fromVersion The source version.
   */
  has(fromVersion: Version): boolean {
    return this.store.has(fromVersion);
  }

  /**
   * Returns all registered rules.
   */
  list(): MigrationRule[] {
    return Array.from(this.store.values());
  }
}
