/**
 * AWIE V2 - Golden Path Orchestrator (Phase 12, Integration).
 *
 * The pure composition layer that wires the frozen pipeline end-to-end:
 *
 *   ThemeConfig (SSOT) -> ThemeEngine -> RenderNode -> React Adapter -> React UI
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO DECISIONS
 *      The orchestrator NEVER decides. It does not validate (that is the
 *      ThemeValidator's job), does not resolve routes (Phase 04 does), and does
 *      not interpret business meaning. It ONLY composes the existing, ratified
 *      components.
 *
 *   2. LAYER BOUNDARIES PRESERVED
 *      - The ThemeEngine (Runtime) produces the framework-agnostic RenderNode.
 *      - The React Adapter (Framework) materializes the RenderNode into React.
 *      The orchestrator merely calls them in sequence. It NEVER moves a
 *      responsibility across a boundary.
 *
 *   3. DETERMINISM
 *      The orchestrator is deterministic: the same ThemeConfig + page always
 *      produces the same RenderNode tree and the same React element tree.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration for the integration layer.
 */

import {
  DefaultThemeEngine,
  type AssetResolver,
  type ThemeEngine,
} from '../renderer-foundation';
import { DefaultReactAdapter, type ReactAdapter } from '../renderer-react';
import type { ThemeConfig } from '../theme-config/v2/types';
import type {
  GoldenPathOrchestrator,
  GoldenPathRegistries,
  GoldenPathRenderOptions,
  GoldenPathRenderResult,
} from './types';


/**
 * Thrown when a page id is not found in the ThemeConfig.
 */
export class GoldenPathPageNotFoundError extends Error {
  /** The unregistered page id. */
  readonly pageId: string;

  constructor(pageId: string) {
    super(
      `GoldenPath: page "${pageId}" not found in the ThemeConfig. ` +
        'The ThemeConfig must be validated before rendering.',
    );
    this.name = 'GoldenPathPageNotFoundError';
    this.pageId = pageId;
  }
}

/**
 * The default Golden Path orchestrator.
 *
 * Composes the frozen pipeline:
 *
 *   ThemeConfig -> ThemeEngine -> RenderNode -> React Adapter -> React UI
 *
 * It is constructed with the pre-built registries (components, layouts, skins,
 * typography) and the React component registry. It NEVER decides; it only
 * wires the existing components together.
 */
export class DefaultGoldenPathOrchestrator implements GoldenPathOrchestrator {
  /** The framework-agnostic registries consumed by the ThemeEngine. */
  private readonly registries: GoldenPathRegistries;
  /** The React Adapter (Framework). Materializes the RenderNode into React. */
  private readonly reactAdapter: ReactAdapter;
  /** The React component registry (componentId -> React component). */
  private readonly reactComponents: GoldenPathRegistries['reactComponents'];

  constructor(registries: GoldenPathRegistries) {
    this.registries = registries;

    // The React Adapter consumes the React component registry.
    this.reactAdapter = new DefaultReactAdapter(registries.reactComponents);
    this.reactComponents = registries.reactComponents;
  }

  /**
   * Builds the AssetResolver for a given ThemeConfig.
   *
   * The Asset Resolver is a PLATFORM SERVICE (Phase 11). It resolves a section's
   * asset id to its concrete URL by looking it up in the config's flat asset
   * registry (the SSOT). It NEVER decides; it only maps id -> url. If an asset
   * id is not registered, it returns undefined (the section renderer decides
   * how to handle a missing media).
   *
   * @param config The validated ThemeConfig (the SSOT).
   * @returns An AssetResolver backed by the config's asset registry.
   */
  private buildAssetResolver(config: ThemeConfig): AssetResolver {
    const assets = new Map<string, string>();
    for (const asset of config.resources.assets) {
      assets.set(asset.id, asset.url);
    }
    return {
      resolve: (assetId: string): string | undefined => assets.get(assetId),
    };
  }


  /**
   * Renders a page from a ThemeConfig into a RenderNode tree AND a React
   * element tree.
   *
   * @param config The ALREADY-VALIDATED immutable ThemeConfig (the SSOT).
   * @param pageId The id of the page to render.
   * @param options Optional render options (locale, tenant, preview).
   * @returns The GoldenPathRenderResult.
   */
  renderPage(
    config: ThemeConfig,
    pageId: string,
    options?: GoldenPathRenderOptions,
  ): GoldenPathRenderResult {
    // Resolve the page by id. The orchestrator does NOT resolve routes; it
    // only looks up the page in the config's flat page collection.
    const page = config.resources.pages.find((p) => p.id === pageId);
    if (page === undefined) {
      throw new GoldenPathPageNotFoundError(pageId);
    }

    // STEP 1: ThemeEngine (Runtime) -> framework-agnostic RenderNode tree.
    //
    // The ThemeEngine is constructed per-render with an AssetResolver derived
    // from THIS config's asset registry (the SSOT). The Asset Resolver is a
    // platform service (Phase 11); the orchestrator wires it in. The engine is
    // stateless and deterministic, so per-render construction is safe.
    const themeEngine: ThemeEngine = new DefaultThemeEngine({
      components: this.registries.components,
      layouts: this.registries.layouts,
      skins: this.registries.skins,
      typography: this.registries.typography,
      assetResolver: this.buildAssetResolver(config),
    });

    const renderNode = themeEngine.renderPage(config, page, {
      locale: options?.locale,
      tenant: options?.tenant,
      preview: options?.preview,
    });


    // STEP 2: React Adapter (Framework) -> React element tree.
    const reactElement = this.reactAdapter.render(renderNode, {
      registry: this.reactComponents,
    });

    return {
      renderNode,
      reactElement,
      configId: config.metadata.title,
    };
  }
}
