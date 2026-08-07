/**
 * AWIE V2 - Phase 13.5: Official Business Components Plugin - Entry Point.
 *
 * The official "Business Components" Plugin. It provides the semantic section
 * renderers that power the 6 Reference Products. It is the canonical example of
 * a MODULAR, SCALABLE plugin that external developers can extend.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This Plugin provides Renderer extensions
 * ON TOP of the frozen core. It does NOT modify the core.
 *
 * ZERO CORE IMPORTS (Phase 13.3): This Plugin imports ONLY from `@awie/sdk`.
 * It MUST NEVER import an internal core module (e.g. `src/lib/runtime`,
 * `src/lib/theme-engine`, `src/lib/cms-core`). The CI Architecture Guard
 * enforces this rule on the `src/plugins/` directory.
 *
 * MANDATE 4 (PluginContext): The Plugin receives runtime context ONLY through
 * the `initialize` hook, which the PluginLoader invokes with a PluginContext.
 * The Plugin NEVER imports Core services directly.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure declaration for the Developer Platform.
 */

import type { LoadedPluginArtifacts, PluginContext } from '@awie/sdk';
import { officialBusinessComponentsManifest } from './manifest';
import { officialBusinessRenderers } from './renderers';

/**
 * The Plugin's initialize hook.
 *
 * The PluginLoader invokes this with a PluginContext during the 'load' phase.
 * This is the ONLY way the Plugin receives runtime context (plugin id, core
 * version, and a namespaced logger). The Plugin NEVER imports Core services
 * directly.
 *
 * @param context The PluginContext provided by the PluginLoader.
 */
function initialize(context: PluginContext): void {
  context.logger.info(
    `initialized against AWIE Core ${context.coreVersion} ` +
      `(pluginId=${context.pluginId}, renderers=${officialBusinessRenderers.length})`,
  );
}

/**
 * The Official Business Components Plugin's loaded artifacts.
 *
 * It provides the full set of semantic section renderers and an initialize
 * hook. The PluginLoader registers the renderers into the Core Registry via its
 * narrow registry ports.
 */
export const officialBusinessComponentsArtifacts: LoadedPluginArtifacts = {
  renderers: officialBusinessRenderers,
  themes: [],
  components: [],
  initialize,
};

export { officialBusinessComponentsManifest } from './manifest';
export { officialBusinessRenderers } from './renderers';
