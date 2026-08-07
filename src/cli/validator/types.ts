/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Plugin Validator types.
 *
 * The `awie validate` command runs STRICT OFFLINE checks before a plugin is
 * loaded. It asserts:
 *
 *   1. Valid Manifest
 *   2. Core Version compatibility (SemVer)
 *   3. Strict adherence to Core Contracts
 *   4. Zero Core Imports (AST-based: no direct core module imports)
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   validator performs OFFLINE static analysis only. It never loads or executes
 *   a plugin against the Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * The severity of a validation finding.
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * A single validation finding.
 *
 * A pure declaration of a problem (or note) discovered during validation.
 */
export interface ValidationFinding {
  /** The severity. */
  readonly severity: ValidationSeverity;
  /** The check that produced the finding (e.g. "manifest", "semver"). */
  readonly check: string;
  /** A human-readable message. */
  readonly message: string;
  /** The file the finding relates to (if any). */
  readonly file?: string;
}

/**
 * The result of a plugin validation.
 *
 * A pure declaration of the validation outcome. It contains no logic.
 */
export interface ValidationResult {
  /** Whether the plugin passed all checks (no errors). */
  readonly ok: boolean;
  /** The findings (errors and warnings). */
  readonly findings: readonly ValidationFinding[];
  /** The number of errors. */
  readonly errorCount: number;
  /** The number of warnings. */
  readonly warningCount: number;
}

/**
 * The options for a validation run.
 *
 * A pure declaration of the validation configuration.
 */
export interface ValidationOptions {
  /** The running AWIE Core version (e.g. "2.0.0"). */
  readonly coreVersion: string;
  /** Whether warnings should be treated as errors (strict mode). */
  readonly strict: boolean;
}
