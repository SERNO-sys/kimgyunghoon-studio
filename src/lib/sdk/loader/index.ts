/**
 * AWIE V2 - Phase 13.3: Plugin SDK - PluginLoader barrel export.
 *
 * The PluginLoader is the ONLY entity allowed to mutate the Core Registry.
 * Plugins provide their artifacts (via the SDK) to the Loader; the Loader
 * transitions them through the PluginLifecycle and registers them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

export type {
  ComponentRegistryPort,
  LoadedPluginArtifacts,
  PluginContext,
  PluginLoadResult,
  PluginRecord,
  PluginRegistryPorts,
  RendererRegistryPort,
  ThemeRegistryPort,
} from './types';

export {
  PluginCollisionError,
  PluginLoader,
  PluginValidationError,
} from './plugin-loader';


