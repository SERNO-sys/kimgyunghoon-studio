/**
 * V2 Theme System - Phase 1
 *
 * Defines the theme configuration data structure used to drive the design
 * system. This is intentionally additive and non-breaking: existing sites
 * that do not yet carry a `theme` field fall back to the DEFAULT_PRESET.
 */

/**
 * The set of design presets available in the V2 design system.
 * - 'default' : current service default (Warm Stone) look & feel
 * - 'modern'  : clean, contemporary layout
 * - 'warm'    : warm, organic tone
 * - 'luxury'  : premium, high-end styling
 * - 'minimal' : monochrome, minimal styling
 */
export type ThemePresetId =
  | 'default'
  | 'modern'
  | 'warm'
  | 'luxury'
  | 'minimal';

/**
 * AWIE (AI Website Intelligence Engine) - Decision Engine types.
 *
 * The AI does not pick a random pretty color. It analyzes the user's business
 * intent and selects a logical Skin + Skeleton combination from a constrained
 * set of options. These types model that decision so the AI's imagination is
 * controlled and answers stay within a defined spec.
 */

/**
 * The user's primary business objective, inferred by the AI from their input.
 * - 'brand_experience' : emotional, visual brand storytelling (e.g. cafe, art)
 * - 'authority'        : trust & expertise first (e.g. medical, legal)
 * - 'conversion'       : drive a specific action (e.g. booking, contact)
 * - 'commerce'         : sell products / showcase a catalog
 * - 'community'        : gather and engage an audience (e.g. blog, forum)
 */
export type IntentType =
  | 'brand_experience'
  | 'authority'
  | 'conversion'
  | 'commerce'
  | 'community';

/** Color palette identifiers available to the AI decision engine. */
export type ColorPaletteId = 'warm' | 'minimal' | 'trust' | 'luxury' | 'vibrant';

/** Font pairing identifiers available to the AI decision engine. */
export type FontPairingId = 'sans' | 'serif' | 'mono';

/** Header layout identifiers available to the AI decision engine. */
export type HeaderType = 'logo-left' | 'logo-center' | 'sidebar';

/** Hero (main banner) layout identifiers available to the AI decision engine. */
export type HeroType = 'cover' | 'split' | 'minimal';

/**
 * The visual style module chosen by the AI. Mirrors the AWIE blueprint's
 * "Skin" concept (Color Palette + Font Pairing).
 */
export interface Skin {
  color_palette: ColorPaletteId;
  font_pairing: FontPairingId;
}

/**
 * The structural module chosen by the AI. Mirrors the AWIE blueprint's
 * "Skeleton" concept (Header Type + Hero Type).
 */
export interface Skeleton {
  header_type: HeaderType;
  hero_type: HeroType;
}

/**
 * The AI's design rationale. Exposed to the user after site creation so they
 * trust that the AI analyzed their business rather than guessing.
 */
export interface AiDesignReport {
  /** The industry the AI inferred from the user's input (e.g. "브런치 카페"). */
  analyzed_industry: string;
  /** A short, human-readable explanation of why this design was chosen. */
  reasoning: string;
}

/**
 * Theme configuration for a site. All fields are optional so that a partial
 * config can be layered on top of a preset (e.g. only overriding the color
 * palette while inheriting the rest from the preset).
 */
export interface ThemeConfig {
  /** The base design preset id. Defaults to 'default'. */
  presetId: ThemePresetId;
  /** Identifier of the color palette to apply (preset-specific). */
  colorPalette?: string;
  /** Identifier of the font pairing to apply (preset-specific). */
  fontPairing?: string;
  /** Identifier of the layout style to apply (preset-specific). */
  layoutStyle?: string;
  /** Identifier of the button style to apply (preset-specific). */
  buttonStyle?: string;

  // ---- AWIE Decision Engine (V2) ----
  /** The business intent the AI inferred from the user's input. */
  intentType?: IntentType;
  /** The visual style module (Skin) chosen by the AI. */
  skin?: Skin;
  /** The structural module (Skeleton) chosen by the AI. */
  skeleton?: Skeleton;
  /** The AI's design rationale, shown to the user after creation. */
  aiDesignReport?: AiDesignReport;
  /** Ordered list of section identifiers composing the page layout. */
  sections?: string[];
}
