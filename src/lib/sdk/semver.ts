/**
 * AWIE V2 - Phase 13.1: Plugin SDK - SemVer utility.
 *
 * A lightweight, dependency-free Semantic Versioning (SemVer 2.0.0) utility.
 * It is used to validate that a Plugin's declared coreVersion range matches the
 * currently running AWIE Core version before the Plugin is loaded.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This utility is pure infrastructure; it
 * contains NO business logic.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure, deterministic
 *      version-comparison utility.
 *
 *   2. DETERMINISM (Constitution #12)
 *      Version comparison is deterministic: the same inputs always produce the
 *      same result.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * A parsed SemVer version.
 *
 * Follows SemVer 2.0.0: MAJOR.MINOR.PATCH[-prerelease][+build].
 */
export interface SemVer {
  /** The major version. */
  readonly major: number;
  /** The minor version. */
  readonly minor: number;
  /** The patch version. */
  readonly patch: number;
  /** The optional prerelease identifier (e.g. "beta.1"). */
  readonly prerelease?: string;
  /** The optional build metadata (e.g. "build.5"). */
  readonly build?: string;
}

/**
 * Thrown when a version string is not valid SemVer.
 */
export class InvalidSemVerError extends Error {
  /** The invalid version string. */
  readonly version: string;

  constructor(version: string) {
    super(`Invalid SemVer version: "${version}". Expected MAJOR.MINOR.PATCH.`);
    this.name = 'InvalidSemVerError';
    this.version = version;
  }
}

/**
 * The SemVer regex. Captures MAJOR, MINOR, PATCH, prerelease, and build.
 */
const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

/**
 * Parses a SemVer string into a structured SemVer object.
 *
 * @param version The version string (e.g. "2.0.0", "2.1.3-beta.1").
 * @returns The parsed SemVer.
 * @throws {InvalidSemVerError} If the version string is not valid SemVer.
 */
export function parseSemVer(version: string): SemVer {
  const match = SEMVER_RE.exec(version.trim());
  if (!match) {
    throw new InvalidSemVerError(version);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Compares two SemVer versions.
 *
 * Returns:
 *   - a negative number if `a` < `b`
 *   - zero if `a` === `b`
 *   - a positive number if `a` > `b`
 *
 * Per SemVer 2.0.0 precedence rules: build metadata is ignored for precedence.
 * A version with a prerelease has LOWER precedence than the same version
 * without a prerelease.
 *
 * @param a The first version.
 * @param b The second version.
 */
export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Precedence: no prerelease > prerelease.
  if (a.prerelease === undefined && b.prerelease === undefined) return 0;
  if (a.prerelease === undefined) return 1;
  if (b.prerelease === undefined) return -1;

  // Compare prerelease identifiers.
  const aIds = a.prerelease.split('.');
  const bIds = b.prerelease.split('.');
  const len = Math.max(aIds.length, bIds.length);
  for (let i = 0; i < len; i++) {
    const aId = aIds[i];
    const bId = bIds[i];
    if (aId === undefined) return -1;
    if (bId === undefined) return 1;
    if (aId === bId) continue;

    const aNum = /^\d+$/.test(aId);
    const bNum = /^\d+$/.test(bId);
    if (aNum && bNum) {
      const diff = Number(aId) - Number(bId);
      if (diff !== 0) return diff;
    } else if (aNum) {
      return -1; // numeric identifiers have lower precedence.
    } else if (bNum) {
      return 1;
    } else {
      const diff = aId.localeCompare(bId);
      if (diff !== 0) return diff;
    }
  }
  return 0;
}

/**
 * A single SemVer range constraint.
 *
 * Supports the following operators:
 *   - exact: "2.0.0"
 *   - caret: "^2.0.0"  (>=2.0.0 <3.0.0)
 *   - tilde: "~2.1.0"  (>=2.1.0 <2.2.0)
 *   - comparison: ">=2.0.0", ">2.0.0", "<=2.0.0", "<2.0.0"
 */
export type SemVerOperator = 'exact' | 'caret' | 'tilde' | 'gte' | 'gt' | 'lte' | 'lt';

/**
 * A parsed range constraint.
 */
export interface SemVerConstraint {
  /** The operator. */
  readonly operator: SemVerOperator;
  /** The target version. */
  readonly version: SemVer;
}

/**
 * Thrown when a range string is not a supported SemVer range.
 */
export class InvalidSemVerRangeError extends Error {
  /** The invalid range string. */
  readonly range: string;

  constructor(range: string) {
    super(
      `Invalid SemVer range: "${range}". Supported: "2.0.0", "^2.0.0", ` +
        '"~2.1.0", ">=2.0.0", ">2.0.0", "<=2.0.0", "<2.0.0".',
    );
    this.name = 'InvalidSemVerRangeError';
    this.range = range;
  }
}

/**
 * Parses a single SemVer range constraint.
 *
 * @param range The range string (e.g. ">=2.0.0", "^2.0.0", "2.0.0").
 * @returns The parsed constraint.
 * @throws {InvalidSemVerRangeError} If the range is not supported.
 */
export function parseSemVerConstraint(range: string): SemVerConstraint {
  const trimmed = range.trim();
  const match = /^(>=|<=|>|<|\^|~)?(\d+\.\d+\.\d+.*)$/.exec(trimmed);
  if (!match) {
    throw new InvalidSemVerRangeError(range);
  }
  const operator = match[1] ?? 'exact';
  const version = parseSemVer(match[2]);
  switch (operator) {
    case '^':
      return { operator: 'caret', version };
    case '~':
      return { operator: 'tilde', version };
    case '>=':
      return { operator: 'gte', version };
    case '>':
      return { operator: 'gt', version };
    case '<=':
      return { operator: 'lte', version };
    case '<':
      return { operator: 'lt', version };
    default:
      return { operator: 'exact', version };
  }
}

/**
 * Returns whether a version satisfies a single constraint.
 *
 * @param version The version to test.
 * @param constraint The constraint to satisfy.
 */
export function satisfiesConstraint(
  version: SemVer,
  constraint: SemVerConstraint,
): boolean {
  const target = constraint.version;
  switch (constraint.operator) {
    case 'exact':
      return compareSemVer(version, target) === 0;
    case 'caret':
      // ^X.Y.Z => >=X.Y.Z <(X+1).0.0
      return (
        compareSemVer(version, target) >= 0 &&
        version.major === target.major
      );
    case 'tilde':
      // ~X.Y.Z => >=X.Y.Z <X.(Y+1).0
      return (
        compareSemVer(version, target) >= 0 &&
        version.major === target.major &&
        version.minor === target.minor
      );
    case 'gte':
      return compareSemVer(version, target) >= 0;
    case 'gt':
      return compareSemVer(version, target) > 0;
    case 'lte':
      return compareSemVer(version, target) <= 0;
    case 'lt':
      return compareSemVer(version, target) < 0;
  }
}

/**
 * A SemVer range composed of one or more constraints.
 *
 * A version satisfies the range if it satisfies ALL constraints (AND
 * semantics). For example, ">=2.0.0 <3.0.0" requires the version to be at
 * least 2.0.0 AND less than 3.0.0.
 */
export interface SemVerRange {
  /** The raw range string. */
  readonly raw: string;
  /** The parsed constraints. */
  readonly constraints: readonly SemVerConstraint[];
}

/**
 * Parses a SemVer range string into a structured range.
 *
 * Supports space-separated AND constraints (e.g. ">=2.0.0 <3.0.0").
 *
 * @param range The range string.
 * @returns The parsed range.
 * @throws {InvalidSemVerRangeError} If the range is not supported.
 */
export function parseSemVerRange(range: string): SemVerRange {
  const parts = range.trim().split(/\s+/);
  const constraints = parts.map(parseSemVerConstraint);
  return { raw: range.trim(), constraints };
}

/**
 * Returns whether a version satisfies a SemVer range.
 *
 * @param version The version to test.
 * @param range The range to satisfy.
 */
export function satisfiesRange(version: SemVer, range: SemVerRange): boolean {
  return range.constraints.every((c) => satisfiesConstraint(version, c));
}

/**
 * Convenience: returns whether a version string satisfies a range string.
 *
 * @param version The version string (e.g. "2.1.0").
 * @param range The range string (e.g. ">=2.0.0 <3.0.0").
 * @throws {InvalidSemVerError} If the version is invalid.
 * @throws {InvalidSemVerRangeError} If the range is invalid.
 */
export function versionSatisfies(version: string, range: string): boolean {
  return satisfiesRange(parseSemVer(version), parseSemVerRange(range));
}
