/**
 * AWIE V2 - Phase 10: Immutable Semantic Component Contracts (Mandate 1).
 *
 * These are the STABLE, semantic presentation contracts for the core AWIE
 * components. They are designed to be robust enough that they will NOT need to
 * change for 5 years.
 *
 * DESIGN PRINCIPLES:
 *
 *   1. SEMANTIC NAMING
 *      Props use generic, semantic vocabulary (`heading`, `body`, `items`).
 *      They NEVER use page-specific or business-specific names (`title`,
 *      `imageUrl`, `businessName`).
 *
 *   2. IMMUTABLE CONTRACTS
 *      The contracts are intentionally minimal and stable. Adding a new
 *      component NEVER requires changing an existing contract. Optional fields
 *      are additive and backward-compatible.
 *
 *   3. DUMB COMPONENTS
 *      Components implementing these contracts know NOTHING about ThemeConfig,
 *      SectionConfig, or business data. They receive plain, already-resolved
 *      presentation data and render it.
 *
 *   4. FRAMEWORK-AGNOSTIC
 *      The prop shapes are plain data. Any framework (React, Vue, Svelte) can
 *      implement components conforming to these contracts.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation type modeling.
 */

// ---------------------------------------------------------------------------
// Shared semantic primitives
// ---------------------------------------------------------------------------

/**
 * A single call-to-action action.
 *
 * Generic presentation contract: an action has a label and a target. It does
 * not know whether the target is a route, a URL, or a modal trigger.
 */
export interface Action {
  /** The action label (e.g. "Learn more"). */
  label: string;
  /** The action target (e.g. "/about" or "https://..."). */
  target: string;
  /** The action variant (e.g. "primary", "secondary"). Optional. */
  variant?: string;
}

/**
 * A media reference.
 *
 * Generic presentation contract: a media item has a source and an optional
 * alternative text. It does not know whether the source is an asset id, a URL,
 * or a data URI.
 */
export interface Media {
  /** The media source. */
  src: string;
  /** The alternative text. Optional. */
  alt?: string;
}

// ---------------------------------------------------------------------------
// FeatureGrid contract
// ---------------------------------------------------------------------------

/**
 * A single feature item within a FeatureGrid.
 *
 * Semantic contract: a feature has a heading, an optional body, and an optional
 * icon. It does not know whether the icon is an image, an SVG, or a glyph.
 */
export interface FeatureItem {
  /** The feature heading. */
  heading: string;
  /** The feature body copy. Optional. */
  body?: string;
  /** The feature icon reference. Optional. */
  icon?: Media;
}

/**
 * The FeatureGrid contract.
 *
 * A grid of feature items. Uses generic semantic vocabulary: `heading`,
 * `body`, `items`.
 */
export interface FeatureGridProps {
  /** The grid heading. Optional. */
  heading?: string;
  /** The grid body copy. Optional. */
  body?: string;
  /** The ordered feature items. */
  items: FeatureItem[];
  /** The number of columns. Optional (defaults to the theme). */
  columns?: number;
}

// ---------------------------------------------------------------------------
// FAQ contract
// ---------------------------------------------------------------------------

/**
 * A single FAQ entry.
 *
 * Semantic contract: a question and its answer. Uses generic vocabulary:
 * `question`, `answer`.
 */
export interface FaqItem {
  /** The question. */
  question: string;
  /** The answer. */
  answer: string;
}

/**
 * The FAQ contract.
 *
 * A list of question/answer pairs. Uses generic semantic vocabulary:
 * `heading`, `items`.
 */
export interface FaqProps {
  /** The FAQ section heading. Optional. */
  heading?: string;
  /** The ordered FAQ items. */
  items: FaqItem[];
}

// ---------------------------------------------------------------------------
// CTA contract
// ---------------------------------------------------------------------------

/**
 * The CTA (Call-To-Action) contract.
 *
 * A prominent action block. Uses generic semantic vocabulary: `heading`,
 * `body`, `actions`.
 */
export interface CtaProps {
  /** The CTA heading. */
  heading: string;
  /** The CTA body copy. Optional. */
  body?: string;
  /** The call-to-action actions. */
  actions: Action[];
}
