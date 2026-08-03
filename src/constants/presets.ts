import type { ThemeConfig } from '@/types/site';

/**
 * V2 Theme System - Phase 1
 *
 * Design presets. Each preset metadata-izes the design style values that the
 * service currently uses. The DEFAULT_PRESET mirrors the existing default
 * look & feel so that sites without an explicit theme config render exactly
 * as they do today (non-breaking).
 */

/**
 * The default design preset. This represents the current service default
 * styling (Warm Stone palette, default typography/layout/button styles).
 * Used as the fallback whenever a site has no `theme` data.
 */
export const DEFAULT_PRESET: ThemeConfig = {
  presetId: 'default',
  colorPalette: 'warm-stone',
  fontPairing: 'default',
  layoutStyle: 'classic',
  buttonStyle: 'default',
};

/**
 * Registry of all available presets keyed by preset id.
 * Phase 1 only ships the default preset; additional presets (modern, warm,
 * luxury, minimal) will be added in later phases.
 */
export const PRESETS: Record<ThemeConfig['presetId'], ThemeConfig> = {
  default: DEFAULT_PRESET,
  modern: {
    presetId: 'modern',
    colorPalette: 'modern',
    fontPairing: 'modern',
    layoutStyle: 'modern',
    buttonStyle: 'modern',
  },
  warm: {
    presetId: 'warm',
    colorPalette: 'warm',
    fontPairing: 'warm',
    layoutStyle: 'warm',
    buttonStyle: 'warm',
  },
  luxury: {
    presetId: 'luxury',
    colorPalette: 'luxury',
    fontPairing: 'luxury',
    layoutStyle: 'luxury',
    buttonStyle: 'luxury',
  },
  minimal: {
    presetId: 'minimal',
    colorPalette: 'minimal',
    fontPairing: 'minimal',
    layoutStyle: 'minimal',
    buttonStyle: 'minimal',
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
): ThemeConfig {
  if (!theme) {
    return DEFAULT_PRESET;
  }

  const base = PRESETS[theme.presetId] ?? DEFAULT_PRESET;
  return {
    ...base,
    ...theme,
  };
}
