/**
 * AWIE V2 - Semantic Presentation Component Types (Phase 09B, Mandate 2).
 *
 * These are the GENERIC, semantic presentation contracts for the React UI
 * components. They are deliberately framework-agnostic in naming and contain
 * NO page-specific or business-specific vocabulary.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SEMANTIC PROPS ONLY
 *      Components use generic presentation contracts (e.g. `heading`, `body`,
 *      `media`, `actions`). They NEVER use page-specific names like `title`,
 *      `imageUrl`, `businessName`, or `heroHeadline`.
 *
 *   2. DUMB COMPONENTS
 *      These components know NOTHING about ThemeConfig or SectionConfig. They
 *      receive plain, already-resolved presentation data and render it. They
 *      do not interpret, validate, or transform business data.
 *
 *   3. FRAMEWORK-AGNOSTIC CONTRACTS
 *      The prop shapes are plain data. Any framework (React, Vue, Svelte) can
 *      implement components conforming to these contracts.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation type modeling.
 */

/**
 * A single call-to-action action.
 *
 * Generic presentation contract: an action has a label and a target. It does
 * not know whether the target is a route, a URL, or a modal trigger — that is
 * resolved by the framework adapter.
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
 * or a data URI — that is resolved by the framework adapter.
 */
export interface Media {
  /** The media source. */
  src: string;
  /** The alternative text. Optional. */
  alt?: string;
}

/**
 * The semantic props for a Hero component.
 *
 * A hero is a prominent, full-width presentation block. It uses generic
 * presentation vocabulary: `heading`, `body`, `media`, `actions`.
 */
export interface HeroProps {
  /** The primary heading text. */
  heading: string;
  /** The supporting body text. Optional. */
  body?: string;
  /** The hero media (image/video). Optional. */
  media?: Media;
  /** The call-to-action actions. Optional. */
  actions?: Action[];
}

/**
 * The semantic props for a Text component.
 *
 * A text block presents a heading and/or body copy. It uses generic
 * presentation vocabulary: `heading`, `body`.
 */
export interface TextProps {
  /** The heading text. Optional. */
  heading?: string;
  /** The body copy. Optional. */
  body?: string;
}
