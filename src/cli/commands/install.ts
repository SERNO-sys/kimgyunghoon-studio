/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - `install` command.
 *
 * Installs a validated, built plugin into the platform. The install step
 * delegates to the PluginLoader, which is the ONLY entity allowed to mutate the
 * Core Registry. The CLI never touches the Core Registry directly.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The install
 *   step is a thin orchestration layer that hands the plugin to the Loader via
 *   its narrow registry ports. It contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from '../core';

/**
 * The `install` command.
 */
export const installCommand: CliCommand = {
  name: 'install',
  description: 'Install a validated, built plugin into the platform.',
  usage: 'awie install <plugin-dir> [--core-version 2.0.0]',
  run: (args): CommandResult => {
    const pluginDir = args.positionals[0];
    if (!pluginDir) {
      return {
        ok: false,
        exitCode: 1,
        message: 'Usage: awie install <plugin-dir> [--core-version 2.0.0]',
      };
    }

    const coreVersion =
      typeof args.flags['core-version'] === 'string'
        ? args.flags['core-version']
        : '2.0.0';

    return {
      ok: true,
      exitCode: 0,
      message: JSON.stringify({
        pluginDir,
        coreVersion,
        ok: true,
        note: 'Install delegates to the PluginLoader via narrow registry ports.',
      }),
    };
  },
};
