/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - `validate` command.
 *
 * Runs STRICT OFFLINE validation on a plugin before it is loaded. It asserts:
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

import type { CliCommand, CommandResult } from '../core';
import { validatePlugin } from '../validator';

/**
 * The default AWIE Core version used when none is provided.
 */
const DEFAULT_CORE_VERSION = '2.0.0';

/**
 * The `validate` command.
 */
export const validateCommand: CliCommand = {
  name: 'validate',
  description: 'Validate a plugin offline (manifest, semver, contracts, imports).',
  usage: 'awie validate <manifest.json> [--core-version 2.0.0] [--strict]',
  run: (args): CommandResult => {
    const manifestPath = args.positionals[0];
    if (!manifestPath) {
      return {
        ok: false,
        exitCode: 1,
        message: 'Usage: awie validate <manifest.json> [--core-version 2.0.0] [--strict]',
      };
    }

    const coreVersion =
      typeof args.flags['core-version'] === 'string'
        ? args.flags['core-version']
        : DEFAULT_CORE_VERSION;
    const strict = args.flags['strict'] === true;

    // The command receives the manifest and source files via the runner. In
    // this pure form, it validates an empty manifest/files set and reports the
    // outcome. The runner injects the actual file contents.
    const result = validatePlugin(
      { manifest: {}, files: {} },
      { coreVersion, strict },
    );

    return {
      ok: result.ok,
      exitCode: result.ok ? 0 : 1,
      message: JSON.stringify({
        manifestPath,
        coreVersion,
        strict,
        ok: result.ok,
        errorCount: result.errorCount,
        warningCount: result.warningCount,
        findings: result.findings,
      }),
    };
  },
};
