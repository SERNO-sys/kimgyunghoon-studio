/**
 * AWIE V2 - Golden Path Section Renderers (Phase 12, Integration).
 *
 * The DUMB translation layer between ThemeConfig sections and the semantic
 * presentation components.
 *
 * Each section renderer is a framework-agnostic RendererComponent that:
 *   1. Reads the section's content/settings (from the SSOT ThemeConfig).
 *   2. Produces a RenderNode whose props are the SEMANTIC presentation contract
 *      (e.g. HeroProps, TextProps).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC
 *      These components NEVER interpret business meaning. They only map section
 *      data to presentation data. They do not know what a "business" is, what
 *      an "industry" is, or what a "recipe" is.
 *
 *   2. SEMANTIC PROPS ONLY
 *      The produced RenderNode props use generic presentation vocabulary
 *      (`heading`, `body`, `media`, `actions`). They NEVER use page-specific
 *      names like `title`, `imageUrl`, or `businessName`.
 *
 *   3. DETERMINISM
 *      The same section always produces the same RenderNode. No randomness, no
 *      side-effects, no external state.
 *
 *   4. SEMANTIC COMPONENT IDENTITY CARRIER (Amendment G)
 *      The Semantic Component Identity is produced EXCLUSIVELY during
 *      Composition and already exists in the immutable ThemeConfig (the
 *      section's `id`, e.g. "hero", "pricing"). Section Renderers are
 *      CARRIERS, not Producers. They MUST copy the identity into
 *      `RenderNode.metadata.semanticId` verbatim. They MUST NEVER invent,
 *      derive, rename, concatenate, or reconstruct semantic identities.
 *
 *   5. IDENTITY COPY RULE (CTO Amendment, Phase 17.2 Conditional Approval)
 *      "ThemeConfig's identity is merely COPIED to the RenderNode."
 *      Renderers MUST preserve identity. Renderers MUST NEVER create, derive,
 *      rename, concatenate, or normalize identities. The value written to
 *      `metadata.semanticId` MUST be byte-for-byte identical to the identity
 *      that already exists in the immutable ThemeConfig. There is NO
 *      transformation, NO fallback, NO reconstruction.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation translation infrastructure.
 */

import type { RenderContext, RenderNode, RendererComponent } from '../renderer-foundation';
import type { SectionConfig } from '../theme-config/v2/types';

/**
 * A helper to read a string value from a section's content.
 *
 * @param section The section config.
 * @param key The content key.
 * @returns The string value, or undefined.
 */
function contentString(section: SectionConfig, key: string): string | undefined {
  const value = section.content[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * The Hero section renderer.
 *
 * Translates a "hero" section into a RenderNode whose props conform to the
 * semantic HeroProps contract (heading, body, media, actions). It reads the
 * section's content and settings and maps them to presentation data.
 *
 * SEMANTIC COMPONENT IDENTITY (Amendment G): The section's `id` (from the
 * immutable ThemeConfig) IS the Semantic Component Identity. This renderer is
 * a CARRIER: it copies `section.id` into `metadata.semanticId` verbatim. It
 * NEVER invents or derives the identity.
 */
export const HeroSectionRenderer: RendererComponent = {
  name: 'golden-path.hero',
  render(props: Record<string, unknown>, context: RenderContext): RenderNode {
    const section = props.section as SectionConfig;

    // Resolve the hero media through the asset resolver (never raw storage).
    const assetId = contentString(section, 'media');
    const mediaSrc = assetId ? context.assetResolver.resolve(assetId) : undefined;

    // Build the semantic presentation props.
    const semanticProps: Record<string, unknown> = {
      heading: contentString(section, 'heading') ?? '',
      body: contentString(section, 'subheading') ?? contentString(section, 'body'),
    };

    if (mediaSrc) {
      semanticProps.media = {
        src: mediaSrc,
        alt: contentString(section, 'mediaAlt'),
      };
    }

    // Map any actions (label + target) to the semantic Action contract.
    const rawActions = section.content['actions'];
    if (Array.isArray(rawActions)) {
      semanticProps.actions = rawActions
        .filter(
          (action): action is Record<string, unknown> =>
            typeof action === 'object' && action !== null,
        )
        .map((action) => ({
          label: typeof action['label'] === 'string' ? action['label'] : '',
          target: typeof action['target'] === 'string' ? action['target'] : '#',
          variant: typeof action['variant'] === 'string' ? action['variant'] : undefined,
        }));
    }

    return {
      type: 'element',
      componentId: 'hero',
      props: semanticProps,
      children: [],
      id: section.id,
      key: section.id,
      metadata: {
        sectionType: section.type,
        // Amendment G: CARRIER ONLY. Copy the Semantic Component Identity from
        // the immutable ThemeConfig (section.id) verbatim. NEVER derive it.
        semanticId: section.id,
      },
    };
  },
};

/**
 * The Text section renderer.
 *
 * Translates a "text" section into a RenderNode whose props conform to the
 * semantic TextProps contract (heading, body). It reads the section's content
 * and maps it to presentation data.
 *
 * SEMANTIC COMPONENT IDENTITY (Amendment G): The section's `id` (from the
 * immutable ThemeConfig) IS the Semantic Component Identity. This renderer is
 * a CARRIER: it copies `section.id` into `metadata.semanticId` verbatim. It
 * NEVER invents or derives the identity.
 */
export const TextSectionRenderer: RendererComponent = {
  name: 'golden-path.text',
  render(props: Record<string, unknown>, context: RenderContext): RenderNode {
    const section = props.section as SectionConfig;

    const semanticProps: Record<string, unknown> = {
      heading: contentString(section, 'heading'),
      body: contentString(section, 'body'),
    };

    return {
      type: 'element',
      componentId: 'text',
      props: semanticProps,
      children: [],
      id: section.id,
      key: section.id,
      metadata: {
        sectionType: section.type,
        // Amendment G: CARRIER ONLY. Copy the Semantic Component Identity from
        // the immutable ThemeConfig (section.id) verbatim. NEVER derive it.
        semanticId: section.id,
      },
    };
  },
};

/**
 * The default set of section renderers, keyed by section type.
 *
 * This is the Bootstrap's default mapping from semantic section types to the
 * framework-agnostic section renderer components. It is a pure registry of
 * presentation translations.
 */
export const DEFAULT_SECTION_RENDERERS: Readonly<Record<string, RendererComponent>> = {
  hero: HeroSectionRenderer,
  text: TextSectionRenderer,
};
