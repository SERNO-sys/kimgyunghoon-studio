/**
 * AWIE V2 - Phase 16.5: CLI Toolkit - `new` command.
 *
 * ============================================================================
 * ADR-010 (Developer Experience & SDK Strategy) — GENERATOR OVER TEMPLATES
 * ============================================================================
 * The Architecture Review Board has FROZEN the `new` command UX as a GENERATOR
 * OVER TEMPLATES. The generator scaffolds a plugin from a capability-driven
 * prompt, producing a valid skeleton that imports ONLY from `@awie/sdk`.
 *
 * The generator is a pure function: it receives a capability selection and
 * returns a set of files. It contains NO filesystem coupling. The CLI runner
 * writes the files to disk.
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
 * The set of plugin capabilities a generator can scaffold.
 *
 * These map to the PluginCapability contract in the @awie/sdk test harness.
 */
export type PluginCapabilityKind =
  | 'renderer'
  | 'theme'
  | 'component'
  | 'data-adapter';

/**
 * The set of known plugin capabilities.
 */
const CAPABILITIES: readonly PluginCapabilityKind[] = [
  'renderer',
  'theme',
  'component',
  'data-adapter',
];

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
 * Parses the capability flags into a set of selected capabilities.
 *
 * The generator is capability-driven: the user selects which capabilities the
 * plugin should expose. If none are provided, a minimal plugin is generated.
 *
 * @param flags The parsed CLI flags.
 */
function parseCapabilities(
  flags: Readonly<Record<string, string | boolean>>,
): PluginCapabilityKind[] {
  const selected: PluginCapabilityKind[] = [];

  for (const capability of CAPABILITIES) {
    const flag = flags[capability];
    if (flag === true || (typeof flag === 'string' && flag !== 'false')) {
      selected.push(capability);
    }
  }

  return selected;
}

/**
 * Builds the manifest JSON for a scaffolded plugin.
 *
 * @param id The plugin id.
 * @param name The plugin display name.
 * @param coreVersion The target Core version.
 * @param capabilities The selected capabilities.
 */
function buildManifest(
  id: string,
  name: string,
  coreVersion: string,
  capabilities: PluginCapabilityKind[],
): string {
  const manifest = {
    id,
    name,
    version: '1.0.0',
    core: { version: coreVersion },
    capabilities: {
      renderers: capabilities.includes('renderer') ? ['*'] : [],
      themes: capabilities.includes('theme') ? ['*'] : [],
      components: capabilities.includes('component') ? ['*'] : [],
      dataAdapters: capabilities.includes('data-adapter') ? ['*'] : [],
    },
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Builds the entry point source for a scaffolded plugin.
 *
 * @param id The plugin id.
 * @param capabilities The selected capabilities.
 */
function buildEntrySource(
  id: string,
  capabilities: PluginCapabilityKind[],
): string {
  const hasRenderer = capabilities.includes('renderer');
  const hasTheme = capabilities.includes('theme');
  const hasComponent = capabilities.includes('component');
  const hasDataAdapter = capabilities.includes('data-adapter');

  const rendererExport = hasRenderer
    ? `\n  renderers: [\n    {\n      id: '${id}-hero',\n      type: 'hero',\n      render: (ctx) => ctx.renderNode,\n    },\n  ],`
    : '';
  const themeExport = hasTheme
    ? `\n  themes: [\n    {\n      id: '${id}-theme',\n      name: '${id} Theme',\n      skin: {},\n    },\n  ],`
    : '';
  const componentExport = hasComponent
    ? `\n  components: [\n    {\n      id: '${id}-card',\n      type: 'card',\n      render: (ctx) => ctx.renderNode,\n    },\n  ],`
    : '';
  const dataAdapterExport = hasDataAdapter
    ? `\n  dataAdapters: [\n    {\n      id: '${id}-adapter',\n      kind: 'data-adapter',\n      load: async () => ({}),\n    },\n  ],`
    : '';

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
 * Register your Renderer/Theme/Component/DataAdapter extensions here. The
 * PluginLoader registers them into the Core Registry via its narrow registry
 * ports.
 */
export const artifacts: LoadedPluginArtifacts = {${rendererExport}${themeExport}${componentExport}${dataAdapterExport}
};
`;
}

/**
 * The `new` command.
 *
 * A GENERATOR OVER TEMPLATES: it scaffolds a plugin from a capability-driven
 * prompt. The generator is a pure function that returns a set of files.
 */
export const newCommand: CliCommand = {
  name: 'new',
  description: 'Generate a new AWIE Plugin from a capability-driven template.',
  usage:
    'awie new plugin <name> [--renderer] [--theme] [--component] [--data-adapter] [--core-version 2.0.0]',
  run: (args): CommandResult => {
    const positionals = args.positionals;
    const kind = positionals[0];
    const name = positionals[1];

    if (kind !== 'plugin' || !name) {
      return {
        ok: false,
        exitCode: 1,
        message:
          'Usage: awie new plugin <name> [--renderer] [--theme] [--component] [--data-adapter] [--core-version 2.0.0]',
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

    const capabilities = parseCapabilities(args.flags);

    const files: Record<string, string> = {
      'awie.plugin.json': buildManifest(id, name, coreVersion, capabilities),
      'src/index.ts': buildEntrySource(id, capabilities),
    };

    // The scaffold is returned as a pure declaration. The CLI runner writes it
    // to disk. This keeps the command free of filesystem coupling.
    return {
      ok: true,
      exitCode: 0,
      message: JSON.stringify({
        id,
        coreVersion,
        capabilities,
        files,
      }),
    };
  },
};
