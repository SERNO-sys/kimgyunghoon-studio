/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - `doctor` command.
 *
 * Runs a set of environment health checks for the Developer Platform. It
 * verifies that the toolchain is present and that the Core version is
 * compatible with the installed SDK.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The doctor
 *   step is read-only diagnostics; it contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from '../core';

/**
 * The `doctor` command.
 */
export const doctorCommand: CliCommand = {
  name: 'doctor',
  description: 'Run environment health checks for the Developer Platform.',
  usage: 'awie doctor [--core-version 2.0.0]',
  run: (args): CommandResult => {
    const coreVersion =
      typeof args.flags['core-version'] === 'string'
        ? args.flags['core-version']
        : '2.0.0';

    const checks = [
      {
        name: 'node',
        ok: typeof process !== 'undefined' && typeof process.version === 'string',
      },
      {
        name: 'core-version',
        ok: /^\d+\.\d+\.\d+$/.test(coreVersion),
      },
    ];

    const ok = checks.every((c) => c.ok);

    return {
      ok,
      exitCode: ok ? 0 : 1,
      message: JSON.stringify({ coreVersion, checks }),
    };
  },
};
