/**
 * AWIE V2 - Phase 13.3: Plugin SDK - PluginLoader (Sandbox Orchestrator).
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
 *   The Loader depends on narrow REGISTRY PORTS (interfaces), NOT on the
 *   concrete Core Registry implementations. This guarantees that Plugins
 *   cannot reach the Core Registry directly — the Loader is the sole
 *   orchestrator that receives the ports and performs registration.
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
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import { PluginLifecycle } from '../lifecycle';
import { versionSatisfies } from '../semver';
import { declaredExtensionKinds } from '../manifest';
import type { PluginManifest } from '../manifest';
import type {
  LoadedPluginArtifacts,
  PluginContext,
  PluginLoadResult,
  PluginRecord,
  PluginRegistryPorts,
} from './types';

/**
 * Thrown when a Plugin fails validation.
 */
export class PluginValidationError extends Error {
  /** The plugin id. */
  readonly pluginId: string;

  constructor(pluginId: string, message: string) {
    super(`Plugin "${pluginId}" failed validation: ${message}`);
    this.name = 'PluginValidationError';
    this.pluginId = pluginId;
  }
}

/**
 * Thrown when a Plugin attempts to register an id that already exists in the
 * Core Registry.
 *
 * This enforces the "NO SILENT OVERWRITES" policy (Phase 13.3). A collision is
 * an explicit error, never a silent overwrite.
 */
export class PluginCollisionError extends Error {
  /** The plugin id. */
  readonly pluginId: string;
  /** The colliding resource id. */
  readonly resourceId: string;
  /** The registry kind that collided (renderer | theme | component). */
  readonly kind: 'renderer' | 'theme' | 'component';

  constructor(
    pluginId: string,
    resourceId: string,
    kind: 'renderer' | 'theme' | 'component',
  ) {
    super(
      `Plugin "${pluginId}" cannot register ${kind} "${resourceId}": ` +
        'a resource with that id already exists in the Core Registry. ' +
        'Silent overwrites are forbidden.',
    );
    this.name = 'PluginCollisionError';
    this.pluginId = pluginId;
    this.resourceId = resourceId;
    this.kind = kind;
  }
}


/**
 * The PluginLoader (Sandbox Orchestrator).
 *
 * It is the ONLY entity allowed to mutate the Core Registry. It orchestrates
 * the full Plugin lifecycle:
 *
 *   Discovered -> Validated -> Loaded -> Registered -> Enabled
 *
 * A Plugin is discovered via its manifest, validated against the running AWIE
 * Core version (SemVer) and its declared capabilities, loaded into an artifact
 * bundle, and registered into the Core Registry via the narrow registry ports.
 *
 * The Loader NEVER exposes the registry ports to Plugins. Plugins only provide
 * their artifacts; the Loader performs all registration.
 */
export class PluginLoader {
  /** The running AWIE Core version (e.g. "2.0.0"). */
  private readonly coreVersion: string;
  /** The registry ports the Loader uses to register Plugin artifacts. */
  private readonly ports: PluginRegistryPorts;
  /** The runtime records of managed Plugins, keyed by plugin id. */
  private readonly records = new Map<string, PluginRecord>();

  /**
   * Creates a PluginLoader.
   *
   * @param coreVersion The running AWIE Core version (e.g. "2.0.0").
   * @param ports The registry ports the Loader uses to register artifacts.
   */
  constructor(coreVersion: string, ports: PluginRegistryPorts) {
    this.coreVersion = coreVersion;
    this.ports = ports;
  }

  /**
   * Returns the runtime record of a Plugin, if it is being managed.
   *
   * @param pluginId The plugin id.
   */
  get(pluginId: string): PluginRecord | undefined {
    return this.records.get(pluginId);
  }

  /**
   * Returns the lifecycle state of a Plugin, if it is being managed.
   *
   * @param pluginId The plugin id.
   */
  stateOf(pluginId: string): PluginRecord['state'] | undefined {
    return this.records.get(pluginId)?.state;
  }

  /**
   * Discovers a Plugin from its manifest.
   *
   * This transitions the Plugin to the 'discovered' state. It does NOT validate
   * or register anything.
   *
   * @param manifest The Plugin manifest.
   */
  discover(manifest: PluginManifest): void {
    const lifecycle = new PluginLifecycle(manifest.id);
    this.records.set(manifest.id, {
      manifest,
      state: lifecycle.current,
      artifacts: emptyArtifacts(),
    });
  }

  /**
   * Validates a discovered Plugin.
   *
   * This transitions the Plugin from 'discovered' to 'validated'. It validates:
   *
   *   1. The Plugin's declared coreVersion range is satisfied by the running
   *      AWIE Core version (SemVer).
   *   2. The Plugin declares at least one capability.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not discovered, or fails
   *         validation.
   */
  validate(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    const lifecycle = new PluginLifecycle(pluginId);
    lifecycle.transition('validated');

    // SemVer coreVersion validation.
    if (!versionSatisfies(this.coreVersion, record.manifest.coreVersion)) {
      throw new PluginValidationError(
        pluginId,
        `coreVersion "${record.manifest.coreVersion}" is not satisfied by ` +
          `the running AWIE Core version "${this.coreVersion}".`,
      );
    }

    // Capability validation: at least one capability must be declared.
    const kinds = declaredExtensionKinds(record.manifest.capabilities);
    if (kinds.length === 0) {
      throw new PluginValidationError(
        pluginId,
        'the Plugin declares no capabilities. At least one of renderer, ' +
          'theme, or component must be declared.',
      );
    }

    this.updateState(pluginId, 'validated');
  }

  /**
   * Loads a validated Plugin's artifacts.
   *
   * This transitions the Plugin from 'validated' to 'loaded'. The artifacts
   * are the instantiated extensions the Plugin provides, as declared by its
   * manifest capabilities.
   *
   * @param pluginId The plugin id.
   * @param artifacts The loaded Plugin artifacts.
   * @throws {PluginValidationError} If the Plugin is not validated.
   */
  load(pluginId: string, artifacts: LoadedPluginArtifacts): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== 'validated') {
      throw new PluginValidationError(
        pluginId,
        `cannot load from state "${record.state}". The Plugin must be ` +
          'validated first.',
      );
    }

    // If the Plugin provides an initialize hook, invoke it with a PluginContext.
    // This is the ONLY way a Plugin receives runtime context. It never imports
    // Core services directly.
    if (artifacts.initialize) {
      artifacts.initialize(this.buildContext(pluginId));
    }

    this.records.set(pluginId, {
      manifest: record.manifest,
      state: 'loaded',
      artifacts,
    });
  }


  /**
   * Registers a loaded Plugin's artifacts into the Core Registry.
   *
   * This is the ONLY place where Plugin artifacts are registered into the Core
   * Registry. The Loader is the sole orchestrator that receives the registry
   * ports and performs registration. Plugins never touch the registry.
   *
   * This transitions the Plugin from 'loaded' to 'registered'.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not loaded.
   */
  register(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== 'loaded') {
      throw new PluginValidationError(
        pluginId,
        `cannot register from state "${record.state}". The Plugin must be ` +
          'loaded first.',
      );
    }

    // Register each artifact into the appropriate Core Registry port. Before
    // registering, enforce the collision policy: if an id already exists, reject
    // with a PluginCollisionError. Silent overwrites are forbidden.
    for (const renderer of record.artifacts.renderers) {
      if (this.ports.renderers.has(renderer.id)) {
        throw new PluginCollisionError(pluginId, renderer.id, 'renderer');
      }
      this.ports.renderers.register(renderer.id, renderer);
    }
    for (const theme of record.artifacts.themes) {
      if (this.ports.themes.has(theme.id)) {
        throw new PluginCollisionError(pluginId, theme.id, 'theme');
      }
      this.ports.themes.register(theme.id, theme);
    }
    for (const component of record.artifacts.components) {
      if (this.ports.components.has(component.id)) {
        throw new PluginCollisionError(pluginId, component.id, 'component');
      }
      this.ports.components.register(component.id, component);
    }

    this.updateState(pluginId, 'registered');
  }


  /**
   * Enables a registered Plugin.
   *
   * This transitions the Plugin from 'registered' to 'enabled'. Once enabled,
   * the Plugin's extensions are usable.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not registered.
   */
  enable(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== 'registered' && record.state !== 'disabled') {
      throw new PluginValidationError(
        pluginId,
        `cannot enable from state "${record.state}". The Plugin must be ` +
          'registered or disabled.',
      );
    }
    this.updateState(pluginId, 'enabled');
  }

  /**
   * Disables an enabled Plugin.
   *
   * This transitions the Plugin from 'enabled' to 'disabled'. Once disabled,
   * the Plugin's extensions are not usable.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not enabled.
   */
  disable(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (record.state !== 'enabled') {
      throw new PluginValidationError(
        pluginId,
        `cannot disable from state "${record.state}". The Plugin must be ` +
          'enabled.',
      );
    }
    this.updateState(pluginId, 'disabled');
  }

  /**
   * Unloads a Plugin.
   *
   * This transitions the Plugin to the 'unloaded' state. It is the terminal
   * state; the Plugin is fully removed from the runtime.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not registered, enabled,
   *         or disabled.
   */
  unload(pluginId: string): void {
    const record = this.requireRecord(pluginId);
    if (
      record.state !== 'registered' &&
      record.state !== 'enabled' &&
      record.state !== 'disabled'
    ) {
      throw new PluginValidationError(
        pluginId,
        `cannot unload from state "${record.state}". The Plugin must be ` +
          'registered, enabled, or disabled.',
      );
    }
    this.updateState(pluginId, 'unloaded');
  }

  /**
   * Convenience: runs the full load pipeline for a Plugin.
   *
   * Discover -> Validate -> Load -> Register -> Enable. Returns a
   * PluginLoadResult describing the outcome.
   *
   * @param manifest The Plugin manifest.
   * @param artifacts The loaded Plugin artifacts.
   */
  install(
    manifest: PluginManifest,
    artifacts: LoadedPluginArtifacts,
  ): PluginLoadResult {
    try {
      this.discover(manifest);
      this.validate(manifest.id);
      this.load(manifest.id, artifacts);
      this.register(manifest.id);
      this.enable(manifest.id);
      return {
        pluginId: manifest.id,
        state: this.stateOf(manifest.id) ?? 'unloaded',
        ok: true,
      };
    } catch (error) {
      return {
        pluginId: manifest.id,
        state: this.stateOf(manifest.id) ?? 'discovered',
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Builds the PluginContext passed to a Plugin's initialize hook.
   *
   * The context is the ONLY runtime information a Plugin receives. It contains
   * the plugin id, the running Core version, and a namespaced logger. Plugins
   * never import Core services directly.
   *
   * @param pluginId The plugin id.
   */
  private buildContext(pluginId: string): PluginContext {
    return {
      pluginId,
      coreVersion: this.coreVersion,
      logger: {
        info: (message) => console.log(`[awie:${pluginId}] ${message}`),
        warn: (message) => console.warn(`[awie:${pluginId}] ${message}`),
        error: (message) => console.error(`[awie:${pluginId}] ${message}`),
      },
    };
  }

  /**
   * Requires a managed Plugin record, throwing if it does not exist.
   *
   * @param pluginId The plugin id.
   * @throws {PluginValidationError} If the Plugin is not managed.
   */
  private requireRecord(pluginId: string): PluginRecord {

    const record = this.records.get(pluginId);
    if (!record) {
      throw new PluginValidationError(
        pluginId,
        'the Plugin has not been discovered. Call discover() first.',
      );
    }
    return record;
  }

  /**
   * Updates the lifecycle state of a managed Plugin record.
   *
   * @param pluginId The plugin id.
   * @param state The new lifecycle state.
   */
  private updateState(pluginId: string, state: PluginRecord['state']): void {
    const record = this.requireRecord(pluginId);
    this.records.set(pluginId, {
      manifest: record.manifest,
      state,
      artifacts: record.artifacts,
    });
  }
}

/**
 * Returns an empty artifact bundle.
 */
function emptyArtifacts(): LoadedPluginArtifacts {
  return { renderers: [], themes: [], components: [] };
}
