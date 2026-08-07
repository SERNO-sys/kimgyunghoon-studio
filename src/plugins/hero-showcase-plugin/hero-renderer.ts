/**
 * AWIE V2 - Phase 13.3: Hero Showcase Reference Plugin - Custom Hero Renderer.
 *
 * The official "Hero Showcase" Reference Plugin's Renderer extension. It
 * demonstrates how a Plugin author extends the platform's rendering capability
 * by registering a framework-agnostic section renderer.
 *
 * STRICT CONTRACT COMPLIANCE:
 *
 *   - Contract 001 (ThemeConfig): This renderer consumes a ThemeConfig section
 *     (presentation data only) and produces a RenderNode. It NEVER reads
 *     BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *
 *   - Contract 002 (RenderNode): This renderer returns a pure, serializable,
 *     framework-agnostic RenderNode tree. It NEVER returns a React/Vue element.
 *
 * ZERO CORE IMPORTS (Phase 13.3): This Plugin imports ONLY from `@awie/sdk`.
 * It MUST NEVER import an internal core module. The CI Architecture Guard
 * enforces this rule on the `src/plugins/` directory.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC (Constitution #10)
 *      This renderer NEVER interprets business meaning. It only maps section
 *      presentation data to a RenderNode.
 *
 *   2. DETERMINISM (Constitution #12)
 *      This renderer is pure and deterministic: the same input always produces
 *      the same RenderNode.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure presentation translation for the Developer Platform.
 */

import type { AwieRenderContext, AwieRenderFunction, RendererExtension } from '@awie/sdk';

/**
 * The semantic props this renderer consumes.
 *
 * These are presentation-only props (heading, body, media, actions). The
 * renderer NEVER reads business semantics.
 */
interface HeroShowcaseProps {
  /** The hero heading. */
  heading?: string;
  /** The hero body text. */
  body?: string;
  /** The hero media (resolved asset URL). */
  media?: { src: string; alt?: string };
  /** The hero call-to-action buttons. */
  actions?: { label: string; target: string; variant?: string }[];
}

/**
 * The pure render function for the Hero Showcase renderer.
 *
 * It consumes presentation props and returns a RenderNode tree. The RenderNode
 * uses a DISTINCT componentId (`hero-showcase`) and a DISTINCT `badge` prop so
 * that the platform can prove (in tests) that THIS plugin's renderer is active
 * rather than the Core's default hero renderer.
 *
 * @param props The presentation props.
 * @param context The pure render context.
 * @returns The RenderNode tree.
 */
export const heroShowcaseRender: AwieRenderFunction<HeroShowcaseProps> = (
  props,
  context: AwieRenderContext,
): ReturnType<AwieRenderFunction<HeroShowcaseProps>> => {
  // Build the semantic presentation props.
  const semanticProps: Record<string, unknown> = {
    heading: props.heading ?? '',
    body: props.body ?? '',
    // The plugin's signature badge. This is the marker the platform uses to
    // prove the plugin's renderer is active (vs. the Core default hero).
    badge: 'Powered by Hero Showcase Plugin',
  };

  if (props.media) {
    semanticProps.media = props.media;
  }
  if (props.actions) {
    semanticProps.actions = props.actions;
  }

  return {
    type: 'element',
    componentId: 'hero-showcase',
    props: semanticProps,
    children: [],
    id: 'hero-showcase',
    key: 'hero-showcase',
    metadata: {
      sectionType: 'hero',
      plugin: 'hero-showcase',
      locale: context.locale,
    },
  };
};

/**
 * The Hero Showcase Renderer extension.
 *
 * It declares:
 *   - kind: 'renderer'
 *   - id: 'hero-showcase'
 *   - sectionType: 'hero' (the semantic section type it handles)
 *   - the pure render function
 */
export const heroShowcaseRenderer: RendererExtension = {
  kind: 'renderer',
  id: 'hero-showcase',
  version: '1.0.0',
  core: { version: '2.0.0' },
  sectionType: 'hero',
  render: heroShowcaseRender,
};
