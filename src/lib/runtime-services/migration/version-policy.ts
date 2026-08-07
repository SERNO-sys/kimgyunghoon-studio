/**
 * AWIE V2 - Phase 11 M2: Migration Pipeline - SemanticVersionPolicy.
 *
 * A VersionPolicy that detects and dictates versioning rules for payloads that
 * carry a `version` field (e.g. `{ version: "1.0.0", ... }`). It uses semantic
 * versioning (major.minor.patch) for comparison.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. SEPARATION OF CONCERNS - This policy DETECTS and DICTATES versioning
 *      rules. It NEVER executes migrations. Execution belongs to the pipeline.
 *   2. ZERO BUSINESS LOGIC - The policy is pure infrastructure.
 *   3. ZERO RENDERING - The policy NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { Version, VersionPolicy } from './types';

/**
 * Parses a semantic version string into its numeric components.
 *
 * @param version The semantic version (e.g. "1.2.3").
 * @returns The [major, minor, patch] tuple.
 */
function parseVersion(version: Version): [number, number, number] {
  const parts = version.split('.').map((part) => {
    const num = Number.parseInt(part, 10);
    return Number.isNaN(num) ? 0 : num;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * The default semantic VersionPolicy.
 *
 * Detects the version from a payload's `version` field (defaulting to "0.0.0"
 * if absent) and compares versions using semantic versioning rules.
 */
export class SemanticVersionPolicy implements VersionPolicy {
  /** The default version when a payload has no detectable version. */
  private readonly defaultVersion: Version;

  /**
   * Constructs a SemanticVersionPolicy.
   *
   * @param defaultVersion The version to assume when a payload has no
   *   detectable version. Defaults to "0.0.0".
   */
  constructor(defaultVersion: Version = '0.0.0') {
    this.defaultVersion = defaultVersion;
  }

  /**
   * Detects the version of a payload.
   *
   * If the payload is an object with a string `version` field, that value is
   * used. Otherwise, the default version is returned.
   *
   * @param payload The payload to inspect.
   */
  detectVersion(payload: unknown): Version {
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'version' in payload &&
      typeof (payload as Record<string, unknown>).version === 'string'
    ) {
      return (payload as Record<string, unknown>).version as string;
    }
    return this.defaultVersion;
  }

  /**
   * Returns whether a migration is required to bring a payload from its
   * current version up to the target version.
   *
   * A migration is required when the current version is strictly less than the
   * target version.
   *
   * @param current The current version.
   * @param target The target version.
   */
  requiresMigration(current: Version, target: Version): boolean {
    return this.compare(current, target) < 0;
  }

  /**
   * Compares two semantic versions.
   *
   * @param a The first version.
   * @param b The second version.
   * @returns A negative number if a < b, zero if a === b, positive if a > b.
   */
  compare(a: Version, b: Version): number {
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);

    if (aMajor !== bMajor) {
      return aMajor - bMajor;
    }
    if (aMinor !== bMinor) {
      return aMinor - bMinor;
    }
    return aPatch - bPatch;
  }
}
