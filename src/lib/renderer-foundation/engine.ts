/**
 * AWIE V2 - Renderer Foundation Engine (Phase 08, Milestone 2B).
 *
 * The DUMB orchestrator. The ThemeEngine ONLY composes. It NEVER interprets.
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
 *
 * COMPONENT ID RESOLUTION: Components are resolved by their implementation id
 * (componentId), NOT by the semantic section.type. Section semantics and
 * component implementation are strictly separated.
 *
 * LAYOUTS ARE COMPOSITION WRAPPERS ONLY: They arrange child RenderNodes and
 * MUST NEVER render business components directly.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure. NO React/Vue imports.
 */

import type { ThemeConfig } from '../theme-config/v2';
import type {
  AssetResolver,
  ComponentRegistry,
  LayoutRegistry,
  RenderContext,
  RenderNode,
  RenderOptions,
  ResourceMap,
  SkinRegistry,
  ThemeEngine,
  TypographyRegistry,
} from './types';
import { DefaultThemeResourceBuilder } from './pipeline';

/**
 * The default ThemeEngine.
 *
 * A deterministic, side-effect-free orchestrator that composes a RenderNode
 * tree from a validated ThemeConfig, a resolved PageConfig, and a pre-built
 * ResourceMap.
 *
 * The engine is constructed with the O(1) registries (components, layouts,
 * skins, typography) and an optional AssetResolver. The ResourceMap is either
 * passed via RenderOptions or built lazily with a DefaultThemeResourceBuilder.
 */
export class DefaultThemeEngine implements ThemeEngine {
  /** The component registry (O(1) component-id -> component). */
  private readonly components: ComponentRegistry;
  /** The layout registry (O(1) layout-id -> layout). */
  private readonly layouts: LayoutRegistry;
  /** The skin registry (O(1) skin-id -> tokens). */
  private readonly skins: SkinRegistry;
  /** The typography registry (O(1) typography-id -> tokens). */
  private readonly typography: TypographyRegistry;
  /** The asset resolver. */
  private readonly assetResolver: AssetResolver;
  /** The default ResourceMap builder (used when none is passed via options). */
  private readonly resourceBuilder: DefaultThemeResourceBuilder;

  constructor(options: {
    components: ComponentRegistry;
    layouts: LayoutRegistry;
    skins: SkinRegistry;
    typography: TypographyRegistry;
    assetResolver?: AssetResolver;
  }) {
    this.components = options.components;
    this.layouts = options.layouts;
    this.skins = options.skins;
    this.typography = options.typography;
    this.assetResolver = options.assetResolver ?? {
      resolve: (assetId: string): string | undefined => assetId,
    };
    this.resourceBuilder = new DefaultThemeResourceBuilder();
  }

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
    page: ThemeConfig['resources']['pages'][number],
    options?: RenderOptions,
  ): RenderNode {
    const resourceMap = options?.resourceMap ?? this.resourceBuilder.build(config);
    const context = this.buildContext(config, page.route, resourceMap, options);

    // Compose the ordered section RenderNodes.
    const sectionNodes: RenderNode[] = [];
    for (const sectionId of page.sectionIds) {
      const section = resourceMap.sections.get(sectionId);
      if (section === undefined) {
        // Referential integrity is guaranteed by the ThemeValidator. If a
        // section is missing here, the config was not validated. Fail fast.
        throw new Error(
          `DefaultThemeEngine: section "${sectionId}" not found in ResourceMap. ` +
            'The ThemeConfig must be validated before rendering.',
        );
      }
      sectionNodes.push(this.renderSectionNode(section, context));
    }

    // Wrap the sections in the page's layout (composition wrapper only).
    return this.renderLayout(page, sectionNodes, context);
  }

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
  ): RenderNode {
    const resourceMap = options?.resourceMap ?? this.resourceBuilder.build(config);
    const section = resourceMap.sections.get(sectionId);
    if (section === undefined) {
      throw new Error(
        `DefaultThemeEngine: section "${sectionId}" not found in ResourceMap.`,
      );
    }
    const context = this.buildContext(config, '', resourceMap, options);
    return this.renderSectionNode(section, context);
  }

  /**
   * Builds the pure RenderContext.
   */
  private buildContext(
    config: ThemeConfig,
    route: string,
    resourceMap: ResourceMap,
    options?: RenderOptions,
  ): RenderContext {
    return {
      route,
      config,
      resourceMap,
      assetResolver: this.assetResolver,
      components: this.components,
      layouts: this.layouts,
      skins: this.skins,
      typography: this.typography,
      locale: options?.locale,
      tenant: options?.tenant,
      preview: options?.preview,
    };
  }

  /**
   * Renders a single section into a RenderNode.
   *
   * COMPONENT ID RESOLUTION: The component is resolved by its implementation id
   * (componentId), NOT by the semantic section.type. If a section declares an
   * explicit componentId (in its settings), that wins. Otherwise the section
   * type is used as the component implementation id.
   *
   * IMMUTABILITY: The engine executes the component's render() and returns the
   * resulting RenderNode DIRECTLY. It MUST NOT mutate or inject node.id,
   * node.key, or node.metadata into the returned RenderNode. The engine
   * orchestrates rendering; it does NOT rewrite the component's output. Any
   * necessary section metadata is passed via the props.
   */
  private renderSectionNode(
    section: ThemeConfig['resources']['sections'][number],
    context: RenderContext,
  ): RenderNode {
    // Prefer the explicit componentId over the semantic section.type.
    const componentId =
      (section.settings?.['componentId'] as string | undefined) ?? section.type;

    const component = this.components.get(componentId);
    if (component === undefined) {
      throw new Error(
        `DefaultThemeEngine: no component registered for id "${componentId}" ` +
          `(section "${section.id}").`,
      );
    }

    const props: Record<string, unknown> = {
      section,
      content: section.content,
      settings: section.settings,
    };

    // Execute the component's render() and return the result DIRECTLY.
    // The engine does NOT mutate or inject id/key/metadata into the output.
    return component.render(props, context);
  }

  /**
   * Renders the page's layout as a composition wrapper.
   *
   * LAYOUTS ARE COMPOSITION WRAPPERS ONLY: They arrange child RenderNodes and
   * MUST NEVER render business components directly.
   */
  private renderLayout(
    page: ThemeConfig['resources']['pages'][number],
    sectionNodes: RenderNode[],
    context: RenderContext,
  ): RenderNode {
    const layoutId = (page as { layoutId?: string }).layoutId ?? 'default';
    const layout = this.layouts.get(layoutId);

    if (layout === undefined) {
      // No layout registered: fall back to a plain fragment composition.
      return {
        type: 'fragment',
        children: sectionNodes,
        id: page.id,
        key: page.id,
        metadata: { pageId: page.id, layoutId },
      };
    }

    // The layout is a composition wrapper. It arranges the already-rendered
    // section RenderNodes. It never renders business components directly.
    return layout.render(sectionNodes, context);
  }
}
