/**
 * AWIE V2 - Phase 10: Pure JSON Theme Assets (Mandate 2).
 *
 * Themes are PURE DATA. A Theme MUST NEVER call an AI API. It only consumes
 * the deterministic RenderNode and Theme Tokens.
 *
 * DESIGN PRINCIPLES:
 *
 *   1. SKIN AS PURE JSON TOKENS
 *      A Skin is a flat, serializable JSON object of design tokens: `primary`,
 *      `surface`, `radius`, `shadow`. It contains NO logic and NO references to
 *      any framework.
 *
 *   2. TYPOGRAPHY BY LOGICAL SEMANTICS
 *      Typography is defined strictly by logical semantics (`Heading XL`,
 *      `Body M`, `Caption`), COMPLETELY decoupled from physical font names.
 *      The actual font family is just a token VALUE, never a structural key.
 *
 *   3. SERIALIZABLE
 *      Every asset is JSON-serializable (no functions, no class instances).
 *      This guarantees themes can be stored, transmitted, and versioned as
 *      plain data.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling.
 */

// ---------------------------------------------------------------------------
// Skin — pure JSON design tokens
// ---------------------------------------------------------------------------

/**
 * The color tokens of a Skin.
 *
 * Pure JSON: flat string values. `primary` and `surface` are the two required
 * semantic colors; `accent`, `text`, and `muted` are optional refinements.
 */
export interface SkinColors {
  /** The primary brand color. */
  primary: string;
  /** The surface (background) color. */
  surface: string;
  /** The accent color. Optional. */
  accent?: string;
  /** The primary text color. Optional. */
  text?: string;
  /** The muted/secondary text color. Optional. */
  muted?: string;
}

/**
 * The radius tokens of a Skin.
 *
 * Pure JSON: flat string values (e.g. "4px", "8px", "16px").
 */
export interface SkinRadius {
  /** The small radius token. */
  sm: string;
  /** The medium radius token. */
  md: string;
  /** The large radius token. */
  lg: string;
}

/**
 * The shadow tokens of a Skin.
 *
 * Pure JSON: flat string values (e.g. "0 2px 8px rgba(0,0,0,0.2)").
 */
export interface SkinShadows {
  /** The card shadow token. */
  card: string;
  /** The elevated shadow token. */
  elevated: string;
}

/**
 * The motion tokens of a Skin.
 *
 * Pure JSON: flat string values (e.g. "150ms", "400ms").
 */
export interface SkinMotion {
  /** The fast transition duration. */
  fast: string;
  /** The slow transition duration. */
  slow: string;
}

/**
 * A Skin — a pure JSON collection of design tokens.
 *
 * A Skin is the visual module of a Theme. It is fully serializable and contains
 * NO logic. The `id` is a stable identifier (e.g. "dark", "light", "bold").
 */
export interface Skin {
  /** The stable skin id (e.g. "dark", "light", "bold"). */
  id: string;
  /** The color tokens. */
  colors: SkinColors;
  /** The radius tokens. */
  radius: SkinRadius;
  /** The shadow tokens. */
  shadows: SkinShadows;
  /** The motion tokens. */
  motion: SkinMotion;
}

// ---------------------------------------------------------------------------
// Typography — logical semantics, decoupled from physical fonts
// ---------------------------------------------------------------------------

/**
 * The logical typography scale.
 *
 * Typography is defined STRICTLY by logical semantics, NOT by physical font
 * names. The actual font family is a token VALUE (`family`), never a
 * structural key. This decouples the design system from any specific font.
 */
export interface Typography {
  /** The stable typography id (e.g. "modern", "classic", "editorial"). */
  id: string;
  /**
   * The font family token VALUE (e.g. "Inter, sans-serif"). This is a value,
   * not a structural key — the logical scale above is what matters.
   */
  family: string;
  /** The logical heading scale. */
  headings: {
    /** The largest heading (e.g. "Heading XL"). */
    xl: string;
    /** The large heading (e.g. "Heading L"). */
    lg: string;
    /** The medium heading (e.g. "Heading M"). */
    md: string;
  };
  /** The logical body scale. */
  body: {
    /** The large body (e.g. "Body L"). */
    lg: string;
    /** The medium body (e.g. "Body M"). */
    md: string;
    /** The small body (e.g. "Body S"). */
    sm: string;
  };
  /** The logical caption scale. */
  caption: {
    /** The caption size (e.g. "Caption"). */
    size: string;
  };
  /** The logical line-height scale. */
  lineHeights: {
    /** The heading line-height. */
    heading: string;
    /** The body line-height. */
    body: string;
  };
}

// ---------------------------------------------------------------------------
// Theme asset bundle
// ---------------------------------------------------------------------------

/**
 * The accessibility tokens of a Theme.
 *
 * Pure JSON: flat string values. These tokens guarantee the Theme is usable by
 * all users. This is the "Accessibility" certification category.
 */
export interface AccessibilityTokens {
  /** The focus ring token (e.g. "2px solid #2563eb"). */
  focusRing: string;
  /** The text color on the primary color (contrast). */
  contrastTextOnPrimary: string;
  /** The text color on the surface color (contrast). */
  contrastTextOnSurface: string;
}

/**
 * A Theme — a pure JSON bundle of a Skin, a Typography, and the required
 * layout/component/accessibility declarations.
 *
 * A Theme is PURE DATA. It contains NO logic and MUST NEVER call an AI API.
 * It only provides the deterministic design tokens that the Renderer consumes.
 */
export interface Theme {
  /** The stable theme id (e.g. "modern-dark"). */
  id: string;
  /** The Skin (pure JSON design tokens). */
  skin: Skin;
  /** The Typography (logical semantics, decoupled from physical fonts). */
  typography: Typography;
  /** The layouts this Theme supports (e.g. ["hero-split", "grid-3"]). */
  layouts: string[];
  /**
   * The component mappings this Theme provides.
   *
   * Maps a semantic component id (e.g. "hero", "featureGrid") to a layout id.
   * The Renderer resolves a componentId through this mapping.
   */
  componentMappings: Record<string, string>;
  /** The accessibility tokens. */
  accessibility: AccessibilityTokens;
}


