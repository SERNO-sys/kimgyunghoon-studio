/**
 * AWIE V2 - Phase 10: Preview Pipeline Types (Mandate 4).
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
import type { Theme } from '../assets/types';

/**
 * A single theme preview.
 *
 * A preview is a deterministic RenderNode tree for a given Theme, ready to be
 * materialized by a framework adapter (e.g. React Adapter).
 */
export interface ThemePreview {
  /** The Theme this preview renders. */
  theme: Theme;
  /** The framework-agnostic RenderNode tree for the preview. */
  node: RenderNode;
}

/**
 * The Preview Pipeline.
 *
 * Given a BusinessBrief and a set of recipeIds, it produces a ThemePreview for
 * each requested Theme. It is PURE ORCHESTRATION — it makes no business
 * decisions and never calls an AI API.
 */
export interface PreviewPipeline {
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
  ): ThemePreview[];
}

/**
 * The BusinessBrief.
 *
 * A minimal, presentation-relevant subset of the full BusinessBrief. The
 * Preview Pipeline only consumes the presentation-relevant fields (title,
 * tagline, description). It does NOT consume business decisions.
 *
 * NOTE: This is a presentation-facing projection. The full BusinessBrief lives
 * in the Question Engine (Phase 05). The Preview Pipeline intentionally
 * depends only on this minimal projection to remain business-agnostic.
 */
export interface BusinessBrief {
  /** The site title. */
  title: string;
  /** The site tagline. */
  tagline?: string;
  /** The site description. */
  description?: string;
}
