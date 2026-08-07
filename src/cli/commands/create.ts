/**
 * AWIE V2 - Phase 13.4: CLI Toolkit - `create` command.
 *
 * Scaffolds a new AWIE Plugin project in under 5 minutes. It generates a
 * minimal, valid plugin skeleton that imports ONLY from `@awie/sdk`.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   The CLI is a DX TOOL. It does NOT modify the frozen AWIE Core. The
 *   generated skeleton is a pure declaration for the Developer Platform; it
 *   contains NO business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { CliCommand, CommandResult } from '../core';

/**
 * The default AWIE Core version the scaffold targets.
 */
const DEFAULT_CORE_VERSION = '2.0.0';

/**
 * Sanitizes a plugin id into a valid npm-style package name segment.
 *
 * @param raw The raw plugin name.
 */
function sanitizeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Builds the manifest JSON for a scaffolded plugin.
 *
 * @param id The plugin id.
 * @param name The plugin display name.
 * @param coreVersion The target Core version.
 */
function buildManifest(id: string, name: string, coreVersion: string): string {
  const manifest = {
    id,
    name,
    version: '1.0.0',
    core: { version: coreVersion },
    capabilities: {
      renderers: [],
      themes: [],
      components: [],
    },
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Builds the entry point source for a scaffolded plugin.
 *
 * @param id The plugin id.
 */
function buildEntrySource(id: string): string {
  return `/**
 * ${id} - AWIE Plugin entry point.
 *
 * This plugin imports ONLY from "@awie/sdk". It MUST NEVER import an internal
 * Core module (e.g. src/lib/runtime, src/lib/theme-engine, src/lib/cms-core).
 * The CI Architecture Guard enforces this rule.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure declaration for the Developer Platform.
 */

import type { LoadedPluginArtifacts } from '@awie/sdk';

/**
 * The plugin's loaded artifacts.
 *
 * Register your Renderer/Theme/Component extensions here. The PluginLoader
 * registers them into the Core Registry via its narrow registry ports.
 */
export const artifacts: LoadedPluginArtifacts = {
  renderers: [],
  themes: [],
  components: [],
};
`;
}

/**
 * The `create` command.
 */
export const createCommand: CliCommand = {
  name: 'create',
  description: 'Scaffold a new AWIE Plugin project.',
  usage: 'awie create plugin <name> [--core-version 2.0.0]',
  run: (args): CommandResult => {
    const positionals = args.positionals;
    const kind = positionals[0];
    const name = positionals[1];

    if (kind !== 'plugin' || !name) {
      return {
        ok: false,
        exitCode: 1,
        message: 'Usage: awie create plugin <name> [--core-version 2.0.0]',
      };
    }

    const id = sanitizeId(name);
    if (!id) {
      return {
        ok: false,
        exitCode: 1,
        message: `Invalid plugin name: "${name}". Use letters, numbers, and dashes.`,
      };
    }

    const coreVersion =
      typeof args.flags['core-version'] === 'string'
        ? args.flags['core-version']
        : DEFAULT_CORE_VERSION;

    const files: Record<string, string> = {
      'awie.plugin.json': buildManifest(id, name, coreVersion),
      'src/index.ts': buildEntrySource(id),
    };

    // The scaffold is returned as a pure declaration. The CLI runner writes it
    // to disk. This keeps the command free of filesystem coupling.
    return {
      ok: true,
      exitCode: 0,
      message: JSON.stringify({ id, coreVersion, files }),
    };
  },
};
