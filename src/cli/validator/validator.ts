/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - Plugin Validator orchestrator.
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

import {
  parseSemVer,
  parseSemVerRange,
  satisfiesRange,
} from '@awie/sdk';
import type { ValidationFinding, ValidationOptions, ValidationResult } from './types';
import { validateManifest } from './manifest';
import { scanForCoreImports } from './zero-core-imports';

/**
 * The input to a validation run.
 *
 * A pure declaration of the plugin artifacts to validate.
 */
export interface ValidationInput {
  /** The raw manifest object (parsed from JSON). */
  readonly manifest: unknown;
  /** A map of source file path -> source text. */
  readonly files: Readonly<Record<string, string>>;
}

/**
 * Validates the manifest's declared core version against the running Core.
 *
 * @param manifest The raw manifest object.
 * @param options The validation options.
 * @returns The findings for the core version check.
 */
function validateCoreVersion(
  manifest: unknown,
  options: ValidationOptions,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const m = manifest as Record<string, unknown> | null;
  const core = m?.core as Record<string, unknown> | undefined;
  const declared = core?.version;

  if (typeof declared !== 'string' || declared.trim() === '') {
    // The manifest validator already reports a missing core.version.
    return findings;
  }

  try {
    const version = parseSemVer(options.coreVersion);
    const range = parseSemVerRange(declared);
    if (!satisfiesRange(version, range)) {
      findings.push({
        severity: 'error',
        check: 'semver',
        message: `Plugin declares core version "${declared}" but the running Core is "${options.coreVersion}".`,
      });
    }
  } catch {
    findings.push({
      severity: 'error',
      check: 'semver',
      message: `Plugin declares an invalid core version range: "${declared}".`,
    });
  }

  return findings;
}

/**
 * Runs the full offline validation pipeline.
 *
 * @param input The plugin artifacts to validate.
 * @param options The validation options.
 * @returns The validation result.
 */
export function validatePlugin(
  input: ValidationInput,
  options: ValidationOptions,
): ValidationResult {
  const findings: ValidationFinding[] = [];

  // 1. Valid Manifest
  findings.push(...validateManifest(input.manifest));

  // 2. Core Version compatibility (SemVer)
  findings.push(...validateCoreVersion(input.manifest, options));

  // 3 & 4. Zero Core Imports (AST-based)
  findings.push(...scanForCoreImports(input.files));

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  // In strict mode, warnings are treated as errors.
  const effectiveErrors = options.strict ? errorCount + warningCount : errorCount;

  return {
    ok: effectiveErrors === 0,
    findings,
    errorCount,
    warningCount,
  };
}
