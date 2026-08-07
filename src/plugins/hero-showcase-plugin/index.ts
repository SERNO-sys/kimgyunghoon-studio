/**
 * AWIE V2 - Phase 13.3: Hero Showcase Reference Plugin - Entry Point.
 *
 * The official "Hero Showcase" Reference Plugin. It is the canonical example
 * that external developers read to understand how to author a Plugin against
 * the frozen AWIE Core.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This Plugin provides a Renderer extension
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
import { heroShowcaseManifest } from './manifest';
import { heroShowcaseRenderer } from './hero-renderer';

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
    `initialized against AWIE Core ${context.coreVersion} (pluginId=${context.pluginId})`,
  );
}

/**
 * The Hero Showcase Plugin's loaded artifacts.
 *
 * It provides a single Renderer extension (the custom Hero renderer) and an
 * initialize hook. The PluginLoader registers the renderer into the Core
 * Registry via its narrow registry ports.
 */
export const heroShowcaseArtifacts: LoadedPluginArtifacts = {
  renderers: [heroShowcaseRenderer],
  themes: [],
  components: [],
  initialize,
};

export { heroShowcaseManifest } from './manifest';
export { heroShowcaseRenderer, heroShowcaseRender } from './hero-renderer';
