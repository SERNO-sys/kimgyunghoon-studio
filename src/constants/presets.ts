import type { ThemeConfig } from '@/types/site';

/**
 * V2 Theme System - Phase 2
 *
 * Design presets. Each preset metadata-izes the design style values that the
 * service uses. The DEFAULT_PRESET mirrors the existing default look & feel so
 * that sites without an explicit theme config render exactly as they do today
 * (non-breaking).
 *
 * Each preset carries:
 *  - `colorPalette` : identifier of the color palette
 *  - `fontPairing`  : identifier of the font pairing (maps to Tailwind font
 *                     classes via the FONT_PAIRINGS map)
 *  - `layoutStyle`  : identifier of the layout style
 *  - `buttonStyle`  : identifier of the button style
 *  - `colors`       : concrete color tokens used to drive the rendered theme
 *                     (background, foreground, primary, card)
 */

export interface ThemePreset extends ThemeConfig {
  /** Human-readable preset name shown in the admin UI. */
  name: string;
  /** Short description shown in the admin UI. */
  description: string;
  /** Concrete color tokens applied to the rendered site. */
  colors: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

/**
 * The default design preset. Represents the current service default styling
 * (Warm Stone palette, default typography/layout/button styles). Used as the
 * fallback whenever a site has no `theme` data.
 */
export const DEFAULT_PRESET: ThemePreset = {
  presetId: 'default',
  name: 'Warm Stone',
  description: 'Default warm and organic tone for a classic feel.',
  colorPalette: 'warm-stone',
  fontPairing: 'default',
  layoutStyle: 'classic',
  buttonStyle: 'default',
  colors: {
    background: '#f8f5ed',
    foreground: '#29241f',
    primary: '#92400e',
    card: '#fffdf8',
  },
};

/**
 * Registry of all available presets keyed by preset id.
 */
export const PRESETS: Record<ThemeConfig['presetId'], ThemePreset> = {
  default: DEFAULT_PRESET,
  modern: {
    presetId: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary layout with a crisp blue accent.',
    colorPalette: 'modern',
    fontPairing: 'modern',
    layoutStyle: 'modern',
    buttonStyle: 'modern',
    colors: {
      background: '#f8fafc',
      foreground: '#0f172a',
      primary: '#2563eb',
      card: '#ffffff',
    },
  },
  warm: {
    presetId: 'warm',
    name: 'Warm Accent',
    description: 'Stronger amber accents on a light, cozy base.',
    colorPalette: 'warm',
    fontPairing: 'warm',
    layoutStyle: 'warm',
    buttonStyle: 'warm',
    colors: {
      background: '#fff7ed',
      foreground: '#431407',
      primary: '#c2410c',
      card: '#ffedd5',
    },
  },
  luxury: {
    presetId: 'luxury',
    name: 'Luxury',
    description: 'Premium, high-end styling with deep gold and charcoal.',
    colorPalette: 'luxury',
    fontPairing: 'luxury',
    layoutStyle: 'luxury',
    buttonStyle: 'luxury',
    colors: {
      background: '#0c0a09',
      foreground: '#fafaf9',
      primary: '#d4af37',
      card: '#1c1917',
    },
  },
  minimal: {
    presetId: 'minimal',
    name: 'Minimal',
    description: 'Clean monochrome look with subtle contrast.',
    colorPalette: 'minimal',
    fontPairing: 'minimal',
    layoutStyle: 'minimal',
    buttonStyle: 'minimal',
    colors: {
      background: '#ffffff',
      foreground: '#171717',
      primary: '#404040',
      card: '#f5f5f5',
    },
  },
};

/**
 * Font pairing metadata. Maps a `fontPairing` identifier to concrete Tailwind
 * font-family classes applied to the rendered site.
 */
export const FONT_PAIRINGS: Record<string, { heading: string; body: string }> = {
  default: {
    heading: 'font-serif',
    body: 'font-sans',
  },
  modern: {
    heading: 'font-sans',
    body: 'font-sans',
  },
  warm: {
    heading: 'font-serif',
    body: 'font-sans',
  },
  luxury: {
    heading: 'font-serif',
    body: 'font-sans',
  },
  minimal: {
    heading: 'font-sans',
    body: 'font-sans',
  },
};

/**
 * Resolves the effective theme config for a site.
 *
 * If the site carries an explicit `theme` config, it is merged on top of the
 * preset it references (so partial overrides are supported). If the site has
 * no theme data at all, the DEFAULT_PRESET is returned as the fallback.
 */
export function resolveThemeConfig(
  theme?: ThemeConfig | null
): ThemePreset {
  if (!theme) {
    return DEFAULT_PRESET;
  }

  const base = PRESETS[theme.presetId] ?? DEFAULT_PRESET;
  return {
    ...base,
    ...theme,
  };
}

/**
 * Returns the font pairing classes for a given preset id.
 */
export function getFontPairing(
  presetId: ThemeConfig['presetId']
): { heading: string; body: string } {
  const preset = PRESETS[presetId] ?? DEFAULT_PRESET;
  return FONT_PAIRINGS[preset.fontPairing ?? 'default'] ?? FONT_PAIRINGS.default;
}
