/**
 * AWIE V2 - Phase 10: Preview Pipeline Implementation (Mandate 4).
 *
 * The Preview Pipeline is the Phase 10.5 preparation. It orchestrates the
 * generation of theme previews: given a BusinessBrief and a set of recipeIds,
 * it produces a framework-agnostic RenderNode tree for each theme preview.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - The Preview Pipeline is PURE ORCHESTRATION. It does NOT make business
 *     decisions. It consumes a BusinessBrief (already resolved by the Question
 *     Engine) and recipeIds (already selected by the Recipe Engine).
 *   - It produces RenderNode trees (framework-agnostic). It NEVER returns
 *     React/Vue elements.
 *   - It MUST NEVER call an AI API. Theme previews are deterministic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { RenderNode } from '../../renderer-foundation/types';
import { THEMES } from '../assets/registry';
import type { Theme } from '../assets/types';
import type { BusinessBrief, PreviewPipeline, ThemePreview } from './types';

/**
 * The default Preview Pipeline.
 *
 * Builds a deterministic RenderNode tree for each requested Theme. The tree is
 * composed from the Theme's componentMappings and the brief's presentation
 * data. It is framework-agnostic and ready for a framework adapter.
 */
export class DefaultPreviewPipeline implements PreviewPipeline {
  /**
   * Generates theme previews for the given brief and recipe ids.
   *
   * @param brief The BusinessBrief (already resolved by the Question Engine).
   * @param recipeIds The recipe ids (already selected by the Recipe Engine).
   * @param themeIds The theme ids to preview. If omitted, all certified themes.
   * @returns The ordered theme previews.
   */
  generateThemePreviews(
    brief: BusinessBrief,
    recipeIds: string[],
    themeIds?: string[],
  ): ThemePreview[] {
    const themes = this.selectThemes(themeIds);
    return themes.map((theme) => ({
      theme,
      node: this.buildPreviewNode(theme, brief, recipeIds),
    }));
  }

  /**
   * Selects the Themes to preview.
   *
   * @param themeIds The requested theme ids. If omitted, all themes.
   * @returns The ordered Themes.
   */
  private selectThemes(themeIds?: string[]): Theme[] {
    if (!themeIds || themeIds.length === 0) {
      return THEMES;
    }
    return THEMES.filter((theme) => themeIds.includes(theme.id));
  }

  /**
   * Builds the framework-agnostic RenderNode tree for a Theme preview.
   *
   * The tree is composed from the Theme's componentMappings. Each required
   * component is resolved to its mapped layout and rendered as an element node
   * with the brief's presentation data as props.
   *
   * @param theme The Theme to preview.
   * @param brief The BusinessBrief.
   * @param recipeIds The recipe ids.
   * @returns The RenderNode tree.
   */
  private buildPreviewNode(
    theme: Theme,
    brief: BusinessBrief,
    recipeIds: string[],
  ): RenderNode {
    const children: RenderNode[] = [];

    // Hero component.
    children.push(
      this.element(theme, 'hero', {
        heading: brief.title,
        body: brief.tagline ?? brief.description ?? '',
      }),
    );

    // FeatureGrid component.
    children.push(
      this.element(theme, 'featureGrid', {
        heading: 'Key Features',
        items: [
          { heading: 'Feature One', body: 'A semantic feature description.' },
          { heading: 'Feature Two', body: 'A semantic feature description.' },
          { heading: 'Feature Three', body: 'A semantic feature description.' },
        ],
      }),
    );

    // FAQ component.
    children.push(
      this.element(theme, 'faq', {
        heading: 'Frequently Asked Questions',
        items: [
          { question: 'Question One?', answer: 'A semantic answer.' },
          { question: 'Question Two?', answer: 'A semantic answer.' },
        ],
      }),
    );

    // CTA component.
    children.push(
      this.element(theme, 'cta', {
        heading: 'Get Started',
        body: brief.description ?? '',
        actions: [{ label: 'Learn More', target: '/about' }],
      }),
    );

    // Footer component.
    children.push(
      this.element(theme, 'footer', {
        text: `${brief.title} — ${recipeIds.join(', ')}`,
      }),
    );

    return {
      type: 'fragment',
      children,
      metadata: {
        preview: true,
        themeId: theme.id,
        recipeIds,
      },
    };
  }

  /**
   * Builds a single element RenderNode for a component.
   *
   * @param theme The Theme (for the component mapping).
   * @param componentId The semantic component id.
   * @param props The component props.
   * @returns The element RenderNode.
   */
  private element(
    theme: Theme,
    componentId: string,
    props: Record<string, unknown>,
  ): RenderNode {
    const layout = theme.componentMappings[componentId];
    return {
      type: 'element',
      componentId,
      props: {
        ...props,
        layout,
      },
      children: [],
      metadata: {
        themeId: theme.id,
        layout,
      },
    };
  }
}
