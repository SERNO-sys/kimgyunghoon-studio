/**
 * AWIE V2 - Phase 13.2: Plugin SDK - PluginLifecycle state machine.
 *
 * A strict, deterministic state machine that governs the lifecycle of a Plugin
 * from discovery to unload:
 *
 *   Discovered -> Validated -> Loaded -> Registered -> Enabled
 *                                                          |
 *                                                          v
 *   Unloaded <- Disabled <---------------------------------+
 *
 * The PluginLoader is the ONLY entity allowed to transition a Plugin through
 * this state machine. A Plugin cannot transition itself.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This state machine is pure infrastructure;
 * it contains NO business logic.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure, deterministic
 *      state machine.
 *
 *   2. DETERMINISM (Constitution #12)
 *      The state transitions are deterministic: the same current state and
 *      transition always produce the same next state (or an error).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

/**
 * The lifecycle states of a Plugin.
 *
 *   - 'discovered'  - The Plugin manifest has been read.
 *   - 'validated'   - The manifest passed SemVer + capability validation.
 *   - 'loaded'      - The Plugin's artifacts have been instantiated.
 *   - 'registered'  - The Plugin's artifacts have been registered into the
 *                     Core Registry (by the Loader).
 *   - 'enabled'     - The Plugin is active and its extensions are usable.
 *   - 'disabled'    - The Plugin is inactive; its extensions are not usable.
 *   - 'unloaded'    - The Plugin has been fully removed from the runtime.
 */
export type PluginLifecycleState =
  | 'discovered'
  | 'validated'
  | 'loaded'
  | 'registered'
  | 'enabled'
  | 'disabled'
  | 'unloaded';

/**
 * The valid lifecycle transitions.
 *
 * Each entry maps a current state to the set of allowed next states. Any
 * transition not listed here is illegal and MUST throw a
 * PluginLifecycleError.
 */
export const PLUGIN_LIFECYCLE_TRANSITIONS: Readonly<
  Record<PluginLifecycleState, readonly PluginLifecycleState[]>
> = {
  discovered: ['validated'],
  validated: ['loaded'],
  loaded: ['registered'],
  registered: ['enabled', 'unloaded'],
  enabled: ['disabled', 'unloaded'],
  disabled: ['enabled', 'unloaded'],
  unloaded: [],
};

/**
 * Thrown when an illegal lifecycle transition is attempted.
 */
export class PluginLifecycleError extends Error {
  /** The plugin id. */
  readonly pluginId: string;
  /** The current state. */
  readonly from: PluginLifecycleState;
  /** The attempted next state. */
  readonly to: PluginLifecycleState;

  constructor(
    pluginId: string,
    from: PluginLifecycleState,
    to: PluginLifecycleState,
  ) {
    super(
      `Illegal Plugin lifecycle transition for "${pluginId}": ` +
        `${from} -> ${to}. Allowed from ${from}: ` +
        PLUGIN_LIFECYCLE_TRANSITIONS[from].join(', ') || '(none)',
    );
    this.name = 'PluginLifecycleError';
    this.pluginId = pluginId;
    this.from = from;
    this.to = to;
  }
}

/**
 * Returns whether a lifecycle transition is legal.
 *
 * @param from The current state.
 * @param to The attempted next state.
 */
export function canTransition(
  from: PluginLifecycleState,
  to: PluginLifecycleState,
): boolean {
  return PLUGIN_LIFECYCLE_TRANSITIONS[from].includes(to);
}

/**
 * A strict Plugin lifecycle state machine.
 *
 * It tracks the current state of a single Plugin and enforces legal
 * transitions. It is deterministic: the same current state and transition
 * always produce the same result.
 */
export class PluginLifecycle {
  /** The plugin id this lifecycle tracks. */
  readonly pluginId: string;
  /** The current lifecycle state. */
  private state: PluginLifecycleState;

  /**
   * Creates a lifecycle machine for a Plugin in the 'discovered' state.
   *
   * @param pluginId The plugin id.
   */
  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.state = 'discovered';
  }

  /**
   * Returns the current lifecycle state.
   */
  get current(): PluginLifecycleState {
    return this.state;
  }

  /**
   * Attempts to transition the Plugin to a new state.
   *
   * @param to The target state.
   * @throws {PluginLifecycleError} If the transition is illegal.
   */
  transition(to: PluginLifecycleState): void {
    if (!canTransition(this.state, to)) {
      throw new PluginLifecycleError(this.pluginId, this.state, to);
    }
    this.state = to;
  }
}
