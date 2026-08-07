/**
 * AWIE V2 - Section Registry.
 *
 * The Section Registry maps a SectionType (a plain string) to a SectionComponent
 * together with Component Metadata. It is the single point of registration for
 * all section renderers, including external plugins. Because SectionType is a
 * plain string, plugins can register new section types without recompiling the
 * core renderer.
 *
 * The registry is a pure data structure: it holds no business logic and never
 * renders anything itself. The engine resolves components through it.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { SectionComponent, SectionType } from './types';

/**
 * Component Metadata attached to every registered section.
 *
 * This allows the AI Engine to later discover what a section is capable of
 * (e.g. which capabilities it supports) without inspecting the component.
 */
export interface ComponentMetadata {
  /** The section type this component renders. */
  type: SectionType;
  /** The component that renders this section type. */
  component: SectionComponent;
  /** The semantic version of this component (e.g. "1.0.0"). */
  version: string;
  /** The capabilities this section supports (e.g. "i18n", "a11y", "analytics"). */
  capabilities: string[];
}

/** A single registry entry: a section type plus its component metadata. */
export type RegistryEntry = ComponentMetadata;

/**
 * Thrown when a section type is registered more than once.
 *
 * Duplicate registration is a programming error that would silently override a
 * previously registered component, so it is surfaced as an explicit error.
 */
export class DuplicateRegistrationError extends Error {
  constructor(type: SectionType) {
    super(`Section type "${type}" is already registered.`);
    this.name = 'DuplicateRegistrationError';
  }
}

/**
 * The Section Registry interface. Designed to be robust and plugin-friendly:
 *
 *   - register():      add or replace a component for a section type.
 *   - registerMany():  bulk-register multiple entries at once.
 *   - unregister():    remove a component for a section type.
 *   - resolve():       get the component for a section type (or undefined).
 *   - has():           whether a section type is registered.
 *   - list():          enumerate all registered section types.
 *   - metadata():      get the full metadata for a section type (or undefined).
 */
export interface SectionRegistry {
  /**
   * Registers a component for a section type.
   *
   * Throws a DuplicateRegistrationError if the type is already registered.
   * Returns the registry (chainable).
   */
  register(type: SectionType, component: SectionComponent, metadata?: Partial<Omit<ComponentMetadata, 'type' | 'component'>>): SectionRegistry;
  /** Bulk-registers multiple entries. Throws if any type is already registered. */
  registerMany(entries: RegistryEntry[]): SectionRegistry;
  /** Removes the component for a section type. Returns true if removed. */
  unregister(type: SectionType): boolean;
  /** Returns the component for a section type, or undefined if not registered. */
  resolve(type: SectionType): SectionComponent | undefined;
  /** Returns whether a section type is registered. */
  has(type: SectionType): boolean;
  /** Returns all registered section types. */
  list(): SectionType[];
  /** Returns the full metadata for a section type, or undefined if not registered. */
  metadata(type: SectionType): ComponentMetadata | undefined;
}

/**
 * A renderer plugin.
 *
 * Plugins are the extension mechanism for the renderer. A plugin installs
 * itself by registering sections (and optionally other capabilities) into the
 * registry. This keeps the core renderer closed for modification but open for
 * extension.
 */
export interface RendererPlugin {
  /** The plugin's unique identifier. */
  readonly id: string;
  /** The plugin's semantic version. */
  readonly version: string;
  /** Installs the plugin into the registry. */
  install(registry: SectionRegistry): void;
}

/**
 * The default in-memory Section Registry implementation.
 *
 * Uses a Map for O(1) lookups. Registration is strict: registering a type that
 * already exists throws a DuplicateRegistrationError.
 */
export class DefaultSectionRegistry implements SectionRegistry {
  private readonly entries = new Map<SectionType, ComponentMetadata>();

  register(
    type: SectionType,
    component: SectionComponent,
    metadata?: Partial<Omit<ComponentMetadata, 'type' | 'component'>>,
  ): SectionRegistry {
    if (this.entries.has(type)) {
      throw new DuplicateRegistrationError(type);
    }
    this.entries.set(type, {
      type,
      component,
      version: metadata?.version ?? '0.0.0',
      capabilities: metadata?.capabilities ?? [],
    });
    return this;
  }

  registerMany(entries: RegistryEntry[]): SectionRegistry {
    for (const entry of entries) {
      this.register(entry.type, entry.component, {
        version: entry.version,
        capabilities: entry.capabilities,
      });
    }
    return this;
  }

  unregister(type: SectionType): boolean {
    return this.entries.delete(type);
  }

  resolve(type: SectionType): SectionComponent | undefined {
    return this.entries.get(type)?.component;
  }

  has(type: SectionType): boolean {
    return this.entries.has(type);
  }

  list(): SectionType[] {
    return Array.from(this.entries.keys());
  }

  metadata(type: SectionType): ComponentMetadata | undefined {
    return this.entries.get(type);
  }
}
