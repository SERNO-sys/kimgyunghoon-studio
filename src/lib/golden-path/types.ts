/**
 * AWIE V2 - Golden Path Types (Phase 12, Integration).
 *
 * The Golden Path is the ORCHESTRATION layer that wires the frozen architecture
 * end-to-end. It is NOT a new engine, NOT a new renderer, and NOT a new
 * decision-maker. It is a pure composition layer that connects the existing,
 * ratified components:
 *
 *   CMS Command (Application) -> ThemeConfig (SSOT) -> ThemeEngine (Runtime)
 *     -> RenderNode -> React Adapter (Framework) -> React UI
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO DECISIONS
 *      The Golden Path NEVER decides. It only wires. It does not interpret
 *      business meaning, does not validate (that is the ThemeValidator's job),
 *      and does not render (that is the ThemeEngine + Adapter's job).
 *
 *   2. LAYER BOUNDARIES PRESERVED
 *      - The Application Layer (CMS Core) handles Commands, Audits, Permissions.
 *      - The Runtime (ThemeEngine) handles Rendering.
 *      - The Framework Adapter (React) materializes RenderNode into UI.
 *      The Golden Path merely composes these layers. It NEVER moves a
 *      responsibility across a boundary.
 *
 *   3. DETERMINISM
 *      The Golden Path is deterministic: the same ThemeConfig always produces
 *      the same RenderNode tree, and the same RenderNode tree always produces
 *      the same React element tree.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration for the integration layer.
 */

import type { ThemeConfig } from '../theme-config/v2/types';
import type { RenderNode } from '../renderer-foundation';
import type { ReactComponentType } from '../renderer-react';

/**
 * The result of a Golden Path render.
 *
 * Carries the framework-agnostic RenderNode tree AND the materialized React
 * element tree. The RenderNode is the canonical output of the Runtime; the
 * React element is the framework-specific materialization.
 */
export interface GoldenPathRenderResult {
  /** The framework-agnostic RenderNode tree (canonical Runtime output). */
  readonly renderNode: RenderNode;
  /** The materialized React element tree (Framework Adapter output). */
  readonly reactElement: React.ReactNode;
  /** The id of the ThemeConfig that was rendered. */
  readonly configId: string;
}

/**
 * The Golden Path orchestrator.
 *
 * Composes the frozen pipeline:
 *
 *   ThemeConfig -> ThemeEngine -> RenderNode -> React Adapter -> React UI
 *
 * It is constructed with the pre-built registries (components, layouts, skins,
 * typography) and the React component registry. It NEVER decides; it only
 * wires the existing components together.
 */
export interface GoldenPathOrchestrator {
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
  ): GoldenPathRenderResult;
}

/**
 * Optional render options for the Golden Path.
 */
export interface GoldenPathRenderOptions {
  /** The active locale (e.g. "ko", "en"). */
  locale?: string;
  /** The active tenant identifier. */
  tenant?: string;
  /** Whether this is a preview render. */
  preview?: boolean;
}

/**
 * The set of registries the Golden Path needs to render.
 *
 * These are independent infrastructure objects populated by a Bootstrap layer.
 * The Golden Path consumes them; it never populates them.
 */
export interface GoldenPathRegistries {
  /** The framework-agnostic component registry. */
  readonly components: import('../renderer-foundation').ComponentRegistry;
  /** The framework-agnostic layout registry. */
  readonly layouts: import('../renderer-foundation').LayoutRegistry;
  /** The framework-agnostic skin registry. */
  readonly skins: import('../renderer-foundation').SkinRegistry;
  /** The framework-agnostic typography registry. */
  readonly typography: import('../renderer-foundation').TypographyRegistry;
  /** The React component registry (componentId -> React component). */
  readonly reactComponents: import('../renderer-react').ReactComponentRegistry;
}

/**
 * A framework-agnostic renderer component that bridges a ThemeConfig section
 * to semantic presentation props.
 *
 * This is the DUMB translation layer: it reads the section's content/settings
 * and produces a RenderNode whose props are the semantic presentation contract
 * (e.g. HeroProps, TextProps). It NEVER interprets business meaning; it only
 * maps section data to presentation data.
 */
export interface SectionRendererComponent {
  /** A stable, human-readable component name. */
  readonly name: string;
  /**
   * Translates a section into a RenderNode.
   *
   * @param section The section config (content + settings).
   * @param context The pure render context.
   * @returns The RenderNode tree.
   */
  render(
    section: import('../theme-config/v2/types').SectionConfig,
    context: import('../renderer-foundation').RenderContext,
  ): RenderNode;
}

/**
 * A registry of section renderer components, keyed by section type.
 *
 * Maps a semantic section type (e.g. "hero", "text") to the framework-agnostic
 * component that translates it into a RenderNode. This keeps the section
 * semantics and the component implementation strictly separated.
 */
export interface SectionRendererRegistry {
  /**
   * Registers a section renderer component under a section type.
   *
   * @param sectionType The semantic section type.
   * @param component The section renderer component.
   */
  register(sectionType: string, component: SectionRendererComponent): void;

  /**
   * Resolves a section type to its section renderer component. O(1) lookup.
   *
   * @param sectionType The semantic section type.
   * @returns The section renderer component, or undefined if not registered.
   */
  get(sectionType: string): SectionRendererComponent | undefined;

  /**
   * Returns whether a section type is registered. O(1).
   *
   * @param sectionType The semantic section type.
   */
  has(sectionType: string): boolean;
}

/**
 * A React component type that accepts semantic presentation props.
 *
 * This is a convenience alias for the React component type used by the
 * framework adapter. It is intentionally loose because the adapter is generic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SemanticReactComponent = ReactComponentType;
