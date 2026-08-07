/**
 * AWIE V2 - Phase 12.7: Compatibility Matrix - Contract Types.
 *
 * MANDATE 2 (Phase 12.7): Primer for Phase 13 (Developer Platform).
 *
 * This module establishes the ARCHITECTURAL CONTRACT for validating future
 * plugins (Themes, Components, Renderers, Adapters) against the frozen
 * platform. It defines the CompatibilityMatrix schema interface ONLY. It does
 * NOT implement the full validation logic yet — that is Phase 13 work.
 *
 * THE PRIME DIRECTIVE (Phase 12.7): NO NEW CORE FEATURES.
 * This is a pure CONTRACT. It introduces no new architectural layer, no new
 * engine, and no new decision-maker. It is a data model that future plugins
 * must conform to so they can be validated against the platform.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      The CompatibilityMatrix is a registry of compatibility records. Each
 *      record declares whether a specific combination of platform artifacts is
 *      compatible. It is a pure, declarative data structure.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO validation logic, NO decision logic, and NO
 *      interpretation. It is a pure schema/contract. The actual validation
 *      algorithm is Phase 13 work and will live in a separate module.
 *
 *   3. DETERMINISM (Constitution #12)
 *      The matrix is a static, immutable declaration. The same matrix always
 *      yields the same compatibility answers. It is frozen after construction.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the future Developer Platform.
 */

/**
 * The identity of a Theme artifact.
 *
 * A Theme is a named, versioned bundle of presentation resources (skins,
 * typography, layouts, components). It is the top-level artifact a plugin
 * author ships.
 */
export interface ThemeIdentity {
  /** The stable theme id (e.g. "minimal", "editorial"). */
  readonly themeId: string;
  /** The semantic version of the theme (e.g. "1.2.0"). */
  readonly version: string;
}

/**
 * The identity of a Component artifact.
 *
 * A Component is a framework-agnostic section renderer (e.g. "hero", "text").
 * It translates a ThemeConfig section into semantic presentation props.
 */
export interface ComponentIdentity {
  /** The stable component id (e.g. "hero", "text"). */
  readonly componentId: string;
  /** The semantic version of the component (e.g. "1.0.0"). */
  readonly version: string;
}

/**
 * The identity of a Renderer artifact.
 *
 * A Renderer is the framework-agnostic engine that turns a ThemeConfig into a
 * RenderNode tree. The platform ships a canonical Renderer; plugins may extend
 * it with additional section renderers.
 */
export interface RendererIdentity {
  /** The stable renderer id (e.g. "awie-renderer"). */
  readonly rendererId: string;
  /** The semantic version of the renderer (e.g. "2.0.0"). */
  readonly version: string;
}

/**
 * The identity of an Adapter artifact.
 *
 * An Adapter is the framework-specific materializer that turns a RenderNode
 * into a concrete UI tree (e.g. React, Vue). Each framework has its own
 * adapter.
 */
export interface AdapterIdentity {
  /** The stable adapter id (e.g. "react", "vue"). */
  readonly adapterId: string;
  /** The semantic version of the adapter (e.g. "18.0.0"). */
  readonly version: string;
}

// ---------------------------------------------------------------------------
// PLUGIN MATRIX (Phase 13 — Developer Platform)
//
// MANDATE 3 (Core Freeze & ADR Lock): The CompatibilityMatrix schema is
// extended to explicitly include the future PLUGIN MATRIX:
//
//   Plugin × Renderer × Theme × Version
//
// A Plugin is a third-party extension artifact (a Theme bundle, a Component
// set, a Renderer extension, or an Adapter) that ships against the frozen
// Core. The Plugin Matrix declares whether a specific Plugin is compatible
// with a specific Renderer, Theme, and Version of the frozen Core.
//
// THE PRIME DIRECTIVE: NO NEW CORE FEATURES. These interfaces are a pure
// CONTRACT. They introduce no new engine, no new decision-maker, and no
// business logic. They are the data model that future plugins must conform to
// so they can be programmatically validated against the frozen core versions.
// ---------------------------------------------------------------------------

/**
 * The identity of a Plugin artifact.
 *
 * A Plugin is a third-party extension that ships against the frozen Core. It
 * is identified by a stable plugin id and a semantic version. A Plugin may
 * bundle one or more platform artifacts (Themes, Components, Renderers,
 * Adapters).
 */
export interface PluginIdentity {
  /** The stable plugin id (e.g. "acme-editorial"). */
  readonly pluginId: string;
  /** The semantic version of the plugin (e.g. "1.0.0"). */
  readonly version: string;
}

/**
 * The kind of artifact a Plugin provides.
 *
 *   - 'theme'     - the plugin ships a Theme bundle.
 *   - 'component' - the plugin ships a Component set.
 *   - 'renderer'  - the plugin ships a Renderer extension.
 *   - 'adapter'   - the plugin ships a Framework Adapter.
 */
export type PluginArtifactKind = 'theme' | 'component' | 'renderer' | 'adapter';

/**
 * The frozen Core version a Plugin is validated against.
 *
 * The Core is frozen at a specific version. A Plugin declares which Core
 * version it targets. The Plugin Matrix validates that the Plugin's declared
 * Core version is compatible with the platform's frozen Core version.
 */
export interface CoreVersion {
  /** The frozen Core version (e.g. "2.0.0"). */
  readonly version: string;
}

/**
 * A single Plugin Matrix record.
 *
 * Declares the compatibility of a specific Plugin against a specific
 * Renderer, Theme, and Core Version. This is the atomic unit of the Plugin
 * Matrix.
 *
 * The record is IMMUTABLE and DETERMINISTIC. It is a pure declaration; it
 * contains no logic.
 */
export interface PluginCompatibilityRecord {
  /** The Plugin artifact in the combination. */
  readonly plugin: PluginIdentity;
  /** The kind of artifact the Plugin provides. */
  readonly artifactKind: PluginArtifactKind;
  /** The Renderer the Plugin is validated against. */
  readonly renderer: RendererIdentity;
  /** The Theme the Plugin is validated against. */
  readonly theme: ThemeIdentity;
  /** The frozen Core version the Plugin is validated against. */
  readonly core: CoreVersion;
  /** The declared compatibility status. */
  readonly status: CompatibilityStatus;
  /**
   * An optional human-readable note explaining the status (e.g. why a Plugin
   * is incompatible with a specific Core version). This is metadata, NOT
   * logic.
   */
  readonly note?: string;
}


/**
 * The compatibility status of a single matrix record.
 *
 *   - 'compatible'  - The combination is fully supported and validated.
 *   - 'incompatible'- The combination is known to be broken and MUST NOT be
 *                     used together.
 *   - 'untested'    - The combination has not been validated yet. It is
 *                     allowed but not guaranteed.
 */
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'untested';

/**
 * A single CompatibilityMatrix record.
 *
 * Declares the compatibility of a specific combination of platform artifacts:
 * a Theme × Component × Renderer × Adapter. This is the atomic unit of the
 * matrix.
 *
 * The record is IMMUTABLE and DETERMINISTIC. It is a pure declaration; it
 * contains no logic.
 */
export interface CompatibilityRecord {
  /** The Theme artifact in the combination. */
  readonly theme: ThemeIdentity;
  /** The Component artifact in the combination. */
  readonly component: ComponentIdentity;
  /** The Renderer artifact in the combination. */
  readonly renderer: RendererIdentity;
  /** The Adapter artifact in the combination. */
  readonly adapter: AdapterIdentity;
  /** The declared compatibility status. */
  readonly status: CompatibilityStatus;
  /**
   * An optional human-readable note explaining the status (e.g. why a
   * combination is incompatible). This is metadata, NOT logic.
   */
  readonly note?: string;
}

/**
 * The CompatibilityMatrix schema interface.
 *
 * A registry of CompatibilityRecords. It is the architectural contract that
 * future plugins (Phase 13) must conform to so they can be validated against
 * the platform.
 *
 * This interface declares the SHAPE of the matrix. The concrete implementation
 * (with the actual validation algorithm) is Phase 13 work and is intentionally
 * NOT implemented here.
 *
 * ARCHITECTURAL MANDATES:
 *   - REGISTRY PATTERN: records are registered and looked up by key.
 *   - NO BUSINESS LOGIC: this is a pure contract.
 *   - DETERMINISM: the matrix is immutable once frozen.
 */
export interface CompatibilityMatrix {
  /**
   * Registers a compatibility record.
   *
   * @param record The record to register.
   */
  register(record: CompatibilityRecord): void;

  /**
   * Looks up the compatibility status for a specific combination of artifacts.
   *
   * @param theme The Theme artifact.
   * @param component The Component artifact.
   * @param renderer The Renderer artifact.
   * @param adapter The Adapter artifact.
   * @returns The declared CompatibilityStatus, or 'untested' if the exact
   *          combination has not been registered.
   */
  status(
    theme: ThemeIdentity,
    component: ComponentIdentity,
    renderer: RendererIdentity,
    adapter: AdapterIdentity,
  ): CompatibilityStatus;

  /**
   * Returns whether a specific combination is registered in the matrix.
   *
   * @param theme The Theme artifact.
   * @param component The Component artifact.
   * @param renderer The Renderer artifact.
   * @param adapter The Adapter artifact.
   */
  has(
    theme: ThemeIdentity,
    component: ComponentIdentity,
    renderer: RendererIdentity,
    adapter: AdapterIdentity,
  ): boolean;

  // -------------------------------------------------------------------------
  // PLUGIN MATRIX (Phase 13 — Developer Platform)
  //
  // MANDATE 3 (Core Freeze & ADR Lock): These methods extend the matrix to
  // support the future PLUGIN MATRIX: Plugin × Renderer × Theme × Version.
  // They enable future plugins to be PROGRAMMATICALLY VALIDATED against the
  // frozen core versions. They are pure contract declarations; the concrete
  // validation algorithm is Phase 13 work.
  // -------------------------------------------------------------------------

  /**
   * Registers a Plugin Matrix record.
   *
   * @param record The PluginCompatibilityRecord to register.
   */
  registerPlugin(record: PluginCompatibilityRecord): void;

  /**
   * Looks up the compatibility status of a Plugin against a specific
   * Renderer, Theme, and Core Version.
   *
   * @param plugin The Plugin artifact.
   * @param renderer The Renderer artifact.
   * @param theme The Theme artifact.
   * @param core The frozen Core version.
   * @returns The declared CompatibilityStatus, or 'untested' if the exact
   *          combination has not been registered.
   */
  pluginStatus(
    plugin: PluginIdentity,
    renderer: RendererIdentity,
    theme: ThemeIdentity,
    core: CoreVersion,
  ): CompatibilityStatus;

  /**
   * Returns whether a specific Plugin combination is registered in the matrix.
   *
   * @param plugin The Plugin artifact.
   * @param renderer The Renderer artifact.
   * @param theme The Theme artifact.
   * @param core The frozen Core version.
   */
  hasPlugin(
    plugin: PluginIdentity,
    renderer: RendererIdentity,
    theme: ThemeIdentity,
    core: CoreVersion,
  ): boolean;

  /**
   * Freezes the matrix, guaranteeing determinism. After freezing, no further
   * records can be registered.
   */
  freeze(): void;

  /**
   * Returns whether the matrix has been frozen.
   */
  isFrozen(): boolean;
}


