/**
 * AWIE V2 - ThemeProvider.
 *
 * The ThemeProvider converts the raw ThemeConfig.resources.settings into
 * structured ThemeTokens (colors, spacing, typography, radius, shadows) and
 * injects them into the React context for section components to consume.
 *
 * IMMUTABILITY: The ThemeProvider MUST NEVER mutate the ThemeConfig. It reads
 * the config and produces a derived, read-only ThemeTokens object. The raw
 * settings are exposed as a read-only reference for advanced use.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It maps
 * data shapes only — it does NOT branch on industry, intent, or any business
 * semantics.
 *
 * CLIENT COMPONENT: This module uses React Context (createContext/useContext)
 * and exports a React component. It MUST be a Client Component so it can be
 * imported by Server Component pages (which pass the serializable ThemeConfig
 * down as props). Client Components are still server-rendered for the initial
 * HTML, so the Edge runtime and SSR output are preserved.
 */
'use client';

import * as React from 'react';

import type { ThemeConfig } from '../theme-config/v2';
import type { ThemeTokens } from './types';
import { PRESETS, FONT_PAIRINGS, DEFAULT_PRESET } from '../../constants/presets';


/** The React context that carries the resolved ThemeTokens. */
export const ThemeContext = React.createContext<ThemeTokens | null>(null);

/** The default fallback tokens used when a value is absent. */
const DEFAULT_TOKENS: ThemeTokens = {
  colors: {
    primary: '#1a1a2e',
    secondary: '#16213e',
    background: '#ffffff',
    text: '#1a1a2e',
  },
  spacing: {
    base: '1rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
    xl: '4rem',
  },
  typography: {
    font: 'sans-serif',
    headingFont: 'sans-serif',
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 20px rgba(0,0,0,0.1)',
  },
  zIndex: {
    base: 0,
    sticky: 100,
    overlay: 1000,
    modal: 1100,
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  motion: {
    reduced: false,
  },
  raw: {} as ThemeConfig['resources']['settings'],
};


/**
 * Resolves a font pairing token to its concrete font classes.
 *
 * Falls back to the default pairing when the token is unknown or absent so the
 * renderer never collapses.
 */
function resolveFontPairing(
  token: string | undefined,
): { heading: string; body: string } {
  if (token && Object.prototype.hasOwnProperty.call(FONT_PAIRINGS, token)) {
    return FONT_PAIRINGS[token as keyof typeof FONT_PAIRINGS];
  }
  return FONT_PAIRINGS.default;
}

/**
 * Resolves the raw settings into structured ThemeTokens.
 *
 * This is a pure function: it reads the config and returns a new tokens object.
 * It never mutates the config. Missing values fall back to sensible defaults so
 * rendering never collapses.
 */
export function resolveThemeTokens(config: ThemeConfig): ThemeTokens {

  const settings = config.resources.settings;

  // Resolve the palette token (e.g. "modern", "warm", "minimal") to the
  // concrete colors defined in the existing preset system. Design Intelligence
  // never generates arbitrary HEX values — it selects an existing palette.
  const paletteToken = settings.skin?.colorPalette;
  const preset =
    (paletteToken && PRESETS[paletteToken as keyof typeof PRESETS]?.colors)
      ? PRESETS[paletteToken as keyof typeof PRESETS]
      : DEFAULT_PRESET;


  const colors = {
    primary: settings.primaryColor ?? preset.colors.primary ?? DEFAULT_TOKENS.colors.primary,
    secondary: settings.secondaryColor ?? DEFAULT_TOKENS.colors.secondary,
    background: settings.backgroundColor ?? preset.colors.background ?? DEFAULT_TOKENS.colors.background,
    text: settings.textColor ?? preset.colors.foreground ?? DEFAULT_TOKENS.colors.text,
  };

  const spacing = {
    base: settings.spacing ?? DEFAULT_TOKENS.spacing.base,
    sm: DEFAULT_TOKENS.spacing.sm,
    md: DEFAULT_TOKENS.spacing.md,
    lg: DEFAULT_TOKENS.spacing.lg,
    xl: DEFAULT_TOKENS.spacing.xl,
  };

  // Resolve the font token (e.g. "default", "modern", "warm", "minimal") to
  // the concrete font classes defined in the existing typography system.
  const fontToken = settings.skin?.fontPairing;
  const pairing = resolveFontPairing(fontToken);

  const typography = {
    font: settings.font ?? pairing.body ?? DEFAULT_TOKENS.typography.font,
    headingFont: settings.font ?? pairing.heading ?? DEFAULT_TOKENS.typography.headingFont,
  };




  const radius = {
    sm: DEFAULT_TOKENS.radius.sm,
    md: settings.radius ?? DEFAULT_TOKENS.radius.md,
    lg: DEFAULT_TOKENS.radius.lg,
  };

  const shadows = {
    sm: DEFAULT_TOKENS.shadows.sm,
    md: DEFAULT_TOKENS.shadows.md,
    lg: DEFAULT_TOKENS.shadows.lg,
  };

  return {
    colors,
    spacing,
    typography,
    radius,
    shadows,
    zIndex: DEFAULT_TOKENS.zIndex,
    breakpoints: DEFAULT_TOKENS.breakpoints,
    animation: DEFAULT_TOKENS.animation,
    motion: DEFAULT_TOKENS.motion,
    raw: settings,
  };
}


/** Props for the ThemeProvider. */
export interface ThemeProviderProps {
  /** The immutable ThemeConfig. */
  config: ThemeConfig;
  /** The children to render within the theme context. */
  children: React.ReactNode;
}

/**
 * Provides the resolved ThemeTokens to the component tree.
 *
 * The ThemeConfig is treated as immutable input. The provider derives tokens
 * once and never mutates the config.
 */
export function ThemeProvider({ config, children }: ThemeProviderProps): React.ReactElement {
  const tokens = React.useMemo(() => resolveThemeTokens(config), [config]);
  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}

/**
 * A hook that returns the current ThemeTokens.
 *
 * Throws if used outside of a ThemeProvider.
 */
export function useTheme(): ThemeTokens {
  const tokens = React.useContext(ThemeContext);
  if (tokens === null) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return tokens;
}
