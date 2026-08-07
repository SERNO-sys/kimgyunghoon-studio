/**
 * AWIE V2 - Renderer Foundation Types (Phase 08, Milestone 1 + 2A + 2B).
 *
 * The Renderer Foundation is the framework-agnostic core of the rendering
 * pipeline. It defines the contracts that ANY concrete renderer (React, Vue,
 * Vanilla JS, ...) must implement. It contains NO UI components and NO business
 * logic.
 *
 * THE ULTIMATE LAW OF THE RENDERER:
 *
 *   "The Renderer ONLY knows ThemeConfig, trusts ThemeConfig, and renders
 *    ThemeConfig."
 *
 * THE RENDERER IS DUMB. Its ONLY responsibilities are:
 *
 *   1. LOOKUP      - O(1) map lookups via ResourceRegistry<T>.
 *   2. COMPOSITION - Build a RenderNode tree.
 *   3. OUTPUT      - Return the RenderNode tree.
 *
 * It does NOT validate, does NOT resolve routes, does NOT build the ResourceMap
 * itself, and does NOT freeze its own registries. Those are the
 * responsibilities of dedicated external layers.
 *
 * THE RENDERING PIPELINE (Adapter Pattern):
 *
 *   ThemeEngine -> RenderNode -> React Adapter (Future Phase) -> React UI
 *
 * The ThemeEngine NEVER returns React/Vue elements. It produces a
 * framework-agnostic virtual node structure (RenderNode). A future adapter
 * (e.g. React Adapter) consumes the RenderNode tree and materializes it into
 * the target framework's UI.
 *
 * Architectural mandates enforced here:
 *
 *   1. ZERO BUSINESS LOGIC (The Ignorance Principle)
 *      The Renderer Foundation NEVER imports IndustryRegistry, RecipeBlueprint,
 *      BusinessBrief, or evaluates Capability. It ONLY consumes the flat
 *      ThemeConfig data.
 *
 *   2. UNIVERSAL ResourceRegistry<T> (O(1) Lookup + Immutability)
 *      All UI resolution MUST be O(1) map lookups. Array.find() and heavy
 *      switch/case resolution are BANNED. The SAME generic ResourceRegistry<T>
 *      interface is used to instantiate ComponentRegistry, LayoutRegistry,
 *      SkinRegistry, and TypographyRegistry. Each registry is independent and
 *      can be frozen to guarantee reproducible renders.
 *
 *   3. PURE RenderContext
 *      RenderContext contains ONLY presentation data (locale, theme, resource
 *      map, asset resolver). It NEVER carries BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint.
 *
 *   4. ADAPTER PATTERN (Framework Agnostic Strictness)
 *      The ThemeEngine returns a framework-agnostic RenderNode tree, never a
 *      React/Vue element. Framework-specific adapters materialize RenderNode
 *      into concrete UI in a future phase.
 *
 *   5. SEPARATION OF CONCERNS (The Dumb Renderer)
 *      - Validation lives in a dedicated ThemeValidator, NOT the engine.
 *      - Route resolution lives in Phase 04 (Routing), NOT the engine.
 *      - ResourceMap construction lives in a ThemeResourceBuilder, NOT the
 *        engine. The engine consumes the ResourceMap, never the raw arrays.
 *      - Registry freezing lives in an external Bootstrap layer, NOT the engine.
 *
 *   6. COMPONENT ID RESOLUTION (Semantics vs Implementation)
 *      Components are resolved by their implementation id (componentId), NOT by
 *      the semantic section.type. Section semantics and component
 *      implementation are strictly separated.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure type modeling for the rendering foundation.
 */

import type { ThemeConfig } from '../theme-config/v2';

// ---------------------------------------------------------------------------
// Universal ResourceRegistry<T>
// ---------------------------------------------------------------------------

/**
 * The universal, generic resource registry.
 *
 * Provides O(1) map-based lookups for ANY kind of renderer resource. The SAME
 * interface is used for components, layouts, skins, and typography. Concrete
 * registries MUST back this with a Map (never Array.find()).
 *
 * IMMUTABILITY: A registry can be frozen. Once freeze() is called, any further
 * register() attempt MUST throw a RegistryFrozenError. This guarantees
 * reproducible renders and immutable registries post-initialization.
 *
 * NOTE: Freezing is the responsibility of an external Bootstrap layer. The
 * ThemeEngine MUST NOT call freeze() automatically.
 *
 * @typeParam T The type of the registered resource.
 */
export interface ResourceRegistry<T> {
  /**
   * Registers a resource under a stable id. Registering an existing id
   * overwrites the previous entry (last-write-wins).
   *
   * @param id The stable resource id.
   * @param resource The resource to register.
   * @throws {RegistryFrozenError} If the registry has been frozen.
   */
  register(id: string, resource: T): void;

  /**
   * Retrieves a resource by id. O(1) map lookup.
   *
   * @param id The stable resource id.
   * @returns The resource, or undefined if not registered.
   */
  get(id: string): T | undefined;

  /**
   * Returns whether a resource with the given id is registered. O(1).
   *
   * @param id The stable resource id.
   */
  has(id: string): boolean;

  /**
   * Returns all registered resources. Order is not guaranteed.
   */
  list(): T[];

  /**
   * Freezes the registry. After this call, any register() attempt MUST throw a
   * RegistryFrozenError. This is irreversible.
   */
  freeze(): void;

  /**
   * Returns whether the registry has been frozen.
   */
  isFrozen(): boolean;
}

// ---------------------------------------------------------------------------
// Specific Registries (all inherit the SAME generic ResourceRegistry<T>)
// ---------------------------------------------------------------------------

/**
 * A renderer component. Framework-agnostic: a component is any callable that
 * accepts a props object and returns a RenderNode tree. Concrete renderers
 * (React, Vue, Vanilla) provide their own component types that conform to this.
 */
export interface RendererComponent<P = Record<string, unknown>> {
  /** A stable, human-readable component name (for telemetry/debugging). */
  readonly name: string;
  /**
   * Renders the component into a framework-agnostic RenderNode tree.
   *
   * @param props The component props.
   * @param context The pure render context.
   */
  render(props: P, context: RenderContext): RenderNode;
}

/**
 * The ComponentRegistry. Maps a component implementation id (e.g. "hero",
 * "text") to the component that renders it. All lookups are O(1).
 */
export interface ComponentRegistry extends ResourceRegistry<RendererComponent> {}

/**
 * A layout renderer. A layout wraps a page's sections (e.g. header + main +
 * footer). Framework-agnostic: it returns a RenderNode tree.
 *
 * LAYOUTS ARE COMPOSITION WRAPPERS ONLY. They arrange child RenderNodes and
 * MUST NEVER render business components directly.
 */
export interface LayoutRenderer {
  /** A stable, human-readable layout name. */
  readonly name: string;
  /**
   * Renders a layout given the page's ordered section RenderNode outputs.
   *
   * @param sections The already-rendered section RenderNodes, in page order.
   * @param context The pure render context.
   */
  render(sections: RenderNode[], context: RenderContext): RenderNode;
}

/**
 * The LayoutRegistry. Maps a layout id (e.g. "split", "centered") to the
 * layout renderer. All lookups are O(1).
 */
export interface LayoutRegistry extends ResourceRegistry<LayoutRenderer> {}

/**
 * A skin. A skin is a named bundle of visual tokens (colors, radii, shadows,
 * motion) that a section can apply. It is derived from ThemeConfig settings but
 * is registered as a reusable resource.
 */
export interface SkinResource {
  /** A stable skin id (e.g. "dark", "light"). */
  readonly id: string;
  /** The color tokens. */
  colors: Record<string, string>;
  /** The border-radius tokens. */
  radius: Record<string, string>;
  /** The shadow tokens. */
  shadows: Record<string, string>;
  /** The motion tokens. */
  motion: Record<string, string>;
}

/**
 * The SkinRegistry. Maps a skin id to its visual token bundle. All lookups are
 * O(1).
 */
export interface SkinRegistry extends ResourceRegistry<SkinResource> {}

/**
 * A typography resource. A named bundle of font tokens (families, sizes,
 * weights, line-heights).
 */
export interface TypographyResource {
  /** A stable typography id (e.g. "serif", "sans"). */
  readonly id: string;
  /** The font family tokens. */
  families: Record<string, string>;
  /** The font size tokens. */
  sizes: Record<string, string>;
  /** The font weight tokens. */
  weights: Record<string, string>;
  /** The line-height tokens. */
  lineHeights: Record<string, string>;
}

/**
 * The TypographyRegistry. Maps a typography id to its font token bundle. All
 * lookups are O(1).
 */
export interface TypographyRegistry extends ResourceRegistry<TypographyResource> {}

// ---------------------------------------------------------------------------
// RenderNode (Framework-Agnostic Virtual Node)
// ---------------------------------------------------------------------------

/**
 * The type of a RenderNode.
 *
 *   - "element": a virtual element backed by a registered component.
 *   - "text":    a plain text leaf.
 *   - "fragment": an ordered list of child RenderNodes.
 */
export type RenderNodeType = 'element' | 'text' | 'fragment';

/**
 * A framework-agnostic virtual node.
 *
 * The ThemeEngine produces a RenderNode tree. It is the ONLY output of the
 * rendering pipeline. A future adapter (e.g. React Adapter) walks this tree and
 * materializes it into the target framework's UI.
 *
 * The RenderNode is intentionally framework-agnostic: it carries no React/Vue
 * types. It is a plain, serializable data structure.
 *
 * The optional `id`, `key`, and `metadata` fields prepare the tree for future
 * visual editors, drag-and-drop, and hydration.
 */
export type RenderNode =
  | {
      /** The node type. */
      type: 'element';
      /** The registered component id (resolved via ComponentRegistry). */
      componentId: string;
      /** The props passed to the component. */
      props: Record<string, unknown>;
      /** The child RenderNodes. */
      children: RenderNode[];
      /** Optional stable node id (for visual editors / hydration). */
      id?: string;
      /** Optional reconciliation key (for drag-and-drop / lists). */
      key?: string;
      /** Optional arbitrary metadata (for editors / tooling). */
      metadata?: Record<string, unknown>;
    }
  | {
      /** The node type. */
      type: 'text';
      /** The text content. */
      text: string;
      /** Optional stable node id (for visual editors / hydration). */
      id?: string;
      /** Optional reconciliation key (for drag-and-drop / lists). */
      key?: string;
      /** Optional arbitrary metadata (for editors / tooling). */
      metadata?: Record<string, unknown>;
    }
  | {
      /** The node type. */
      type: 'fragment';
      /** The ordered child RenderNodes. */
      children: RenderNode[];
      /** Optional stable node id (for visual editors / hydration). */
      id?: string;
      /** Optional reconciliation key (for drag-and-drop / lists). */
      key?: string;
      /** Optional arbitrary metadata (for editors / tooling). */
      metadata?: Record<string, unknown>;
    };

// ---------------------------------------------------------------------------
// Pure Render Context
// ---------------------------------------------------------------------------

/**
 * The pure render context passed to every renderer component/layout.
 *
 * STRICT CONSTRAINT: This context contains ONLY presentation data (locale,
 * theme, resource map, asset resolver). It MUST NEVER contain BusinessBrief,
 * IndustryProfile, or RecipeBlueprint. The renderer is intentionally ignorant
 * of business semantics.
 */
export interface RenderContext {
  /** The current route being rendered. */
  route: string;
  /** The immutable ThemeConfig (the SSOT). */
  config: ThemeConfig;
  /** The O(1) resource map (pages/sections/assets keyed by id). */
  resourceMap: ResourceMap;
  /** The asset resolver (resolves an asset id to a usable URL). */
  assetResolver: AssetResolver;
  /** The component registry (O(1) component-id -> component). */
  components: ComponentRegistry;
  /** The layout registry (O(1) layout-id -> layout). */
  layouts: LayoutRegistry;
  /** The skin registry (O(1) skin-id -> tokens). */
  skins: SkinRegistry;
  /** The typography registry (O(1) typography-id -> tokens). */
  typography: TypographyRegistry;
  /** The active locale (e.g. "ko", "en"). Reserved for future i18n. */
  locale?: string;
  /** The active tenant identifier. Reserved for future multi-tenancy. */
  tenant?: string;
  /** Whether this is a preview render. Reserved for future preview mode. */
  preview?: boolean;
}

/**
 * An indexed, read-only map of resources keyed by ResourceId. Built once from
 * the ThemeConfig before rendering. All lookups (Pages -> Sections -> Assets)
 * MUST use this map — never Array.find().
 */
export interface ResourceMap {
  /** Pages keyed by id. */
  pages: ReadonlyMap<string, import('../theme-config/v2').PageConfig>;
  /** Sections keyed by id. */
  sections: ReadonlyMap<string, import('../theme-config/v2').SectionConfig>;
  /** Assets keyed by id. */
  assets: ReadonlyMap<string, import('../theme-config/v2').AssetConfig>;
}

/**
 * Resolves an asset id to a usable URL. The renderer never reads raw asset
 * storage keys directly; it always goes through this resolver.
 */
export interface AssetResolver {
  /**
   * Resolves an asset id to a usable URL.
   *
   * @param assetId The asset id to resolve.
   * @returns The usable URL, or undefined if the asset is unknown.
   */
  resolve(assetId: string): string | undefined;
}

// ---------------------------------------------------------------------------
// ThemeResourceBuilder (dedicated ResourceMap construction layer)
// ---------------------------------------------------------------------------

/**
 * The dedicated ThemeResourceBuilder.
 *
 * ResourceMap construction is a SEPARATE concern from rendering. The
 * ThemeEngine is DUMB and consumes a pre-built ResourceMap — it NEVER knows the
 * internal array structure of ThemeConfig. The ThemeResourceBuilder converts
 * the flat ThemeConfig arrays into the O(1) ResourceMap.
 */
export interface ThemeResourceBuilder {
  /**
   * Builds the O(1) ResourceMap from a ThemeConfig.
   *
   * @param config The immutable ThemeConfig (the SSOT).
   * @returns The indexed ResourceMap.
   */
  build(config: ThemeConfig): ResourceMap;
}

// ---------------------------------------------------------------------------
// ThemeValidator (dedicated validation layer, OUTSIDE the engine)
// ---------------------------------------------------------------------------

/**
 * The dedicated ThemeValidator.
 *
 * Validation is a SEPARATE concern from rendering. The ThemeEngine is DUMB and
 * ONLY accepts already-validated configs. The ThemeValidator is invoked by an
 * external orchestration layer (e.g. the Bootstrap layer) BEFORE the engine
 * renders.
 *
 * The ThemeValidator fails fast if required sections, layouts, or skins are
 * missing, or if referential integrity is broken.
 */
export interface ThemeValidator {
  /**
   * Validates a ThemeConfig. Throws if the config is invalid.
   *
   * @param config The ThemeConfig to validate.
   * @throws {ThemeValidationError} If the config is invalid.
   */
  validate(config: ThemeConfig): void;
}

// ---------------------------------------------------------------------------
// ThemeEngine
// ---------------------------------------------------------------------------

/**
 * The core ThemeEngine interface.
 *
 * The ThemeEngine is the framework-agnostic orchestrator that consumes an
 * ALREADY-VALIDATED ThemeConfig, a resolved PageConfig, and a pre-built
 * ResourceMap, and produces a RenderNode tree. It is the single entry point for
 * the rendering pipeline. Concrete renderers (React, Vue, Vanilla) implement
 * this interface.
 *
 * THE ENGINE IS DUMB. It ONLY:
 *   1. LOOKUP      - O(1) lookups via the registries and the ResourceMap.
 *   2. COMPOSITION - Build a RenderNode tree.
 *   3. OUTPUT      - Return the RenderNode tree.
 *
 * It does NOT validate (use ThemeValidator), does NOT resolve routes (Phase 04
 * does), does NOT build the ResourceMap (use ThemeResourceBuilder), and does
 * NOT freeze its own registries (the Bootstrap layer does).
 *
 * The engine NEVER branches on business semantics and NEVER mutates the
 * ThemeConfig. It returns a framework-agnostic RenderNode tree, never a
 * React/Vue element. It is deterministic and side-effect free: rendering the
 * same validated ThemeConfig always produces the same RenderNode tree.
 */
export interface ThemeEngine {
  /**
   * Renders a page into a framework-agnostic RenderNode tree.
   *
   * The page is passed in as an already-resolved PageConfig. The engine does
   * NOT resolve routes — Phase 04 (Routing) is responsible for that.
   *
   * @param config The ALREADY-VALIDATED immutable ThemeConfig (the SSOT).
   * @param page The resolved page to render.
   * @param options Optional render options (locale, tenant, preview).
   * @returns The RenderNode tree for the page.
   */
  renderPage(
    config: ThemeConfig,
    page: import('../theme-config/v2').PageConfig,
    options?: RenderOptions,
  ): RenderNode;

  /**
   * Renders a single section by id into a framework-agnostic RenderNode tree.
   *
   * @param config The ALREADY-VALIDATED immutable ThemeConfig.
   * @param sectionId The section id to render.
   * @param options Optional render options.
   * @returns The RenderNode tree for the section.
   */
  renderSection(
    config: ThemeConfig,
    sectionId: string,
    options?: RenderOptions,
  ): RenderNode;
}

/** Optional render options. */
export interface RenderOptions {
  /** The active locale (e.g. "ko", "en"). */
  locale?: string;
  /** The active tenant identifier. */
  tenant?: string;
  /** Whether this is a preview render. */
  preview?: boolean;
  /** A pre-built ResourceMap. If omitted, the engine uses a default builder. */
  resourceMap?: ResourceMap;
}

/**
 * The set of O(1) registries. These are independent infrastructure objects.
 * An external Bootstrap layer populates and freezes them.
 */
export interface RenderRegistries {
  /** The component registry. */
  components: ComponentRegistry;
  /** The layout registry. */
  layouts: LayoutRegistry;
  /** The skin registry. */
  skins: SkinRegistry;
  /** The typography registry. */
  typography: TypographyRegistry;
}
