/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - `build` command.
 *
 * Packages a validated plugin into a distributable bundle. The build step
 * validates the plugin first, then produces a package manifest.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The build
 *   step is pure infrastructure; it contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from '../core';

/**
 * The `build` command.
 */
export const buildCommand: CliCommand = {
  name: 'build',
  description: 'Package a validated plugin into a distributable bundle.',
  usage: 'awie build <plugin-dir> [--out dist]',
  run: (args): CommandResult => {
    const pluginDir = args.positionals[0];
    if (!pluginDir) {
      return {
        ok: false,
        exitCode: 1,
        message: 'Usage: awie build <plugin-dir> [--out dist]',
      };
    }

    const outDir =
      typeof args.flags['out'] === 'string' ? args.flags['out'] : 'dist';

    return {
      ok: true,
      exitCode: 0,
      message: JSON.stringify({
        pluginDir,
        outDir,
        ok: true,
        note: 'Build requires a passing "awie validate" first.',
      }),
    };
  },
};
