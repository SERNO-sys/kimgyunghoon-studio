/**
 * AWIE V2 - Phase 13.3: Plugin SDK - PluginLoader types.
 *
 * The PluginLoader is the ONLY entity allowed to mutate the Core Registry.
 * Plugins provide their artifacts (via the SDK) to the Loader; the Loader
 * transitions them through the PluginLifecycle and registers them.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 *
 *   Plugins MUST NEVER import Core services directly. They strictly depend on
 *   the @awie/sdk boundary. The Loader is the ONLY bridge between the Plugin
 *   world and the Core Registry world.
 *
 *   To enforce this, the Loader depends on narrow REGISTRY PORTS (interfaces),
 *   NOT on the concrete Core Registry implementations. This keeps the Loader
 *   decoupled from the Core and guarantees that Plugins cannot reach the Core
 *   Registry directly.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. The Loader consumes the Core Registry via
 * ports; it does not modify the Core.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      The Loader registers Plugin artifacts into the Core Registry via narrow
 *      ports. Plugins never touch the registry directly.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is pure infrastructure.
 *
 *   3. DETERMINISM (Constitution #12)
 *      The Loader's orchestration is deterministic: the same Plugin always
 *      produces the same lifecycle outcome.
 *
 *   4. NO SILENT OVERWRITES (Phase 13.3)
 *      If a Plugin attempts to register an id that already exists in the Core
 *      Registry, the Loader MUST reject the registration with a collision
 *      error. Silent overwrites are forbidden.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { PluginManifest } from '../manifest';
import type { PluginLifecycleState } from '../lifecycle';
import type {
  ComponentExtension,
  RendererExtension,
  ThemeExtension,
} from '../index';

/**
 * The runtime context passed to a Plugin when it is initialized.
 *
 * A Plugin MUST NEVER import Core configs or services directly. Instead, the
 * Loader constructs a PluginContext and passes it to the Plugin's initialize
 * hook. This keeps the Plugin fully decoupled from the Core and guarantees the
 * @awie/sdk boundary is the ONLY dependency a Plugin has.
 */
export interface PluginContext {
  /** The stable plugin id. */
  readonly pluginId: string;
  /** The running AWIE Core version (e.g. "2.0.0"). */
  readonly coreVersion: string;
  /**
   * A minimal, namespaced logger. Plugins use this instead of console directly
   * so the platform can route, filter, or silence plugin logs.
   */
  readonly logger: {
    /** Logs an informational message. */
    info(message: string): void;
    /** Logs a warning message. */
    warn(message: string): void;
    /** Logs an error message. */
    error(message: string): void;
  };
}

/**
 * A narrow registry port for registering Renderer extensions.
 *
 * The Loader depends on this interface, NOT on the concrete Core Registry. This
 * guarantees that Plugins cannot reach the Core Registry directly.
 *
 * The `has` method enables the Loader's collision policy: the Loader rejects a
 * registration if the id already exists, preventing silent overwrites.
 */
export interface RendererRegistryPort {
  /**
   * Registers a Renderer extension under a stable id.
   *
   * @param id The stable resource id.
   * @param resource The Renderer extension to register.
   */
  register(id: string, resource: RendererExtension): void;
  /**
   * Returns whether a resource with the given id is already registered.
   *
   * @param id The stable resource id.
   */
  has(id: string): boolean;
}

/**
 * A narrow registry port for registering Theme extensions.
 *
 * The Loader depends on this interface, NOT on the concrete Core Registry. This
 * guarantees that Plugins cannot reach the Core Registry directly.
 *
 * The `has` method enables the Loader's collision policy.
 */
export interface ThemeRegistryPort {
  /**
   * Registers a Theme extension under a stable id.
   *
   * @param id The stable resource id.
   * @param resource The Theme extension to register.
   */
  register(id: string, resource: ThemeExtension): void;
  /**
   * Returns whether a resource with the given id is already registered.
   *
   * @param id The stable resource id.
   */
  has(id: string): boolean;
}

/**
 * A narrow registry port for registering Component extensions.
 *
 * The Loader depends on this interface, NOT on the concrete Core Registry. This
 * guarantees that Plugins cannot reach the Core Registry directly.
 *
 * The `has` method enables the Loader's collision policy.
 */
export interface ComponentRegistryPort {
  /**
   * Registers a Component extension under a stable id.
   *
   * @param id The stable resource id.
   * @param resource The Component extension to register.
   */
  register(id: string, resource: ComponentExtension): void;
  /**
   * Returns whether a resource with the given id is already registered.
   *
   * @param id The stable resource id.
   */
  has(id: string): boolean;
}

/**
 * The set of registry ports the Loader depends on.
 *
 * The Loader is the ONLY entity that receives these ports and uses them to
 * register Plugin artifacts. Plugins never receive these ports.
 */
export interface PluginRegistryPorts {
  /** The Renderer registry port. */
  readonly renderers: RendererRegistryPort;
  /** The Theme registry port. */
  readonly themes: ThemeRegistryPort;
  /** The Component registry port. */
  readonly components: ComponentRegistryPort;
}

/**
 * A loaded Plugin artifact bundle.
 *
 * This is the set of instantiated extensions a Plugin provides, as declared by
 * its manifest capabilities. It is produced by the PluginLoader during the
 * 'load' phase.
 */
export interface LoadedPluginArtifacts {
  /** The Renderer extensions the Plugin provides. */
  readonly renderers: readonly RendererExtension[];
  /** The Theme extensions the Plugin provides. */
  readonly themes: readonly ThemeExtension[];
  /** The Component extensions the Plugin provides. */
  readonly components: readonly ComponentExtension[];
  /**
   * An optional initialize hook. When provided, the Loader invokes it with a
   * PluginContext during the 'load' phase. This is the ONLY way a Plugin
   * receives runtime context — it never imports Core services directly.
   */
  readonly initialize?: (context: PluginContext) => void;
}

/**
 * The runtime record of a Plugin managed by the Loader.
 *
 * It tracks the Plugin's manifest, its lifecycle state, and its loaded
 * artifacts. It is immutable from the Plugin's perspective; only the Loader
 * mutates it.
 */
export interface PluginRecord {
  /** The Plugin manifest. */
  readonly manifest: PluginManifest;
  /** The current lifecycle state. */
  readonly state: PluginLifecycleState;
  /** The loaded artifacts (empty until the Plugin is loaded). */
  readonly artifacts: LoadedPluginArtifacts;
}

/**
 * The result of a Plugin load operation.
 *
 * A pure declaration of the load outcome. It contains no logic.
 */
export interface PluginLoadResult {
  /** The Plugin id. */
  readonly pluginId: string;
  /** The final lifecycle state. */
  readonly state: PluginLifecycleState;
  /** Whether the load succeeded. */
  readonly ok: boolean;
  /** An optional error message if the load failed. */
  readonly error?: string;
}
