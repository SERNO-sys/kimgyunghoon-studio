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
}
