/**
 * AWIE V2 - Phase 10: Theme Asset Registry (Mandate 2).
 *
 * A registry of pure JSON Skins and Typographies. These are PURE DATA — they
 * contain NO logic and MUST NEVER call an AI API. They only provide the
 * deterministic design tokens that the Renderer consumes.
 *
 * The registry is the single source of truth for the available Skins and
 * Typographies. The ThemeCertifier and the Compatibility Matrix Test consume
 * this registry to validate every combination.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data.
 */

import type { Skin, Theme, Typography } from './types';

// ---------------------------------------------------------------------------
// Skins — pure JSON design tokens
// ---------------------------------------------------------------------------

/** The "light" Skin. */
export const LIGHT_SKIN: Skin = {
  id: 'light',
  colors: {
    primary: '#2563eb',
    surface: '#ffffff',
    accent: '#f59e0b',
    text: '#111827',
    muted: '#6b7280',
  },
  radius: { sm: '4px', md: '8px', lg: '16px' },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.08)',
    elevated: '0 8px 24px rgba(0,0,0,0.12)',
  },
  motion: { fast: '150ms', slow: '400ms' },
};

/** The "dark" Skin. */
export const DARK_SKIN: Skin = {
  id: 'dark',
  colors: {
    primary: '#60a5fa',
    surface: '#0f172a',
    accent: '#fbbf24',
    text: '#f8fafc',
    muted: '#94a3b8',
  },
  radius: { sm: '4px', md: '8px', lg: '16px' },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.4)',
    elevated: '0 8px 24px rgba(0,0,0,0.6)',
  },
  motion: { fast: '150ms', slow: '400ms' },
};

/** The "bold" Skin. */
export const BOLD_SKIN: Skin = {
  id: 'bold',
  colors: {
    primary: '#dc2626',
    surface: '#fef2f2',
    accent: '#111827',
    text: '#1f2937',
    muted: '#6b7280',
  },
  radius: { sm: '0px', md: '0px', lg: '0px' },
  shadows: {
    card: '0 4px 0 rgba(0,0,0,0.9)',
    elevated: '0 8px 0 rgba(0,0,0,0.9)',
  },
  motion: { fast: '100ms', slow: '300ms' },
};

// ---------------------------------------------------------------------------
// Typographies — logical semantics, decoupled from physical fonts
// ---------------------------------------------------------------------------

/** The "modern" Typography (logical semantics only). */
export const MODERN_TYPOGRAPHY: Typography = {
  id: 'modern',
  family: 'Inter, sans-serif',
  headings: { xl: '3rem', lg: '2.25rem', md: '1.5rem' },
  body: { lg: '1.125rem', md: '1rem', sm: '0.875rem' },
  caption: { size: '0.75rem' },
  lineHeights: { heading: '1.2', body: '1.6' },
};

/** The "classic" Typography (logical semantics only). */
export const CLASSIC_TYPOGRAPHY: Typography = {
  id: 'classic',
  family: 'Georgia, serif',
  headings: { xl: '2.75rem', lg: '2rem', md: '1.375rem' },
  body: { lg: '1.125rem', md: '1rem', sm: '0.875rem' },
  caption: { size: '0.75rem' },
  lineHeights: { heading: '1.25', body: '1.7' },
};

/** The "editorial" Typography (logical semantics only). */
export const EDITORIAL_TYPOGRAPHY: Typography = {
  id: 'editorial',
  family: 'Merriweather, serif',
  headings: { xl: '3.25rem', lg: '2.5rem', md: '1.625rem' },
  body: { lg: '1.25rem', md: '1.0625rem', sm: '0.9375rem' },
  caption: { size: '0.8125rem' },
  lineHeights: { heading: '1.15', body: '1.8' },
};

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

/** All available Skins. */
export const SKINS: Skin[] = [LIGHT_SKIN, DARK_SKIN, BOLD_SKIN];

/** All available Typographies. */
export const TYPOGRAPHIES: Typography[] = [
  MODERN_TYPOGRAPHY,
  CLASSIC_TYPOGRAPHY,
  EDITORIAL_TYPOGRAPHY,
];

/**
 * The default component mappings every Theme provides.
 *
 * Maps each required semantic component to a layout id. The Renderer resolves
 * a componentId through this mapping.
 */
const DEFAULT_COMPONENT_MAPPINGS: Record<string, string> = {
  hero: 'hero-split',
  featureGrid: 'grid-3',
  faq: 'accordion',
  cta: 'cta-banner',
  footer: 'footer-standard',
};

/**
 * The default layouts every Theme supports.
 */
const DEFAULT_LAYOUTS: string[] = [
  'hero-split',
  'grid-3',
  'accordion',
  'cta-banner',
  'footer-standard',
];

/**
 * Builds the accessibility tokens for a Theme from its Skin.
 *
 * The contrast text colors are derived deterministically from the Skin's
 * semantic colors. This is pure data derivation — no AI, no logic beyond
 * mapping the Skin's own tokens.
 */
function buildAccessibility(skin: Skin): Theme['accessibility'] {
  return {
    focusRing: `2px solid ${skin.colors.primary}`,
    contrastTextOnPrimary: skin.colors.text ?? '#ffffff',
    contrastTextOnSurface: skin.colors.text ?? '#111827',
  };
}

/**
 * All available Themes (Skin × Typography combinations).
 *
 * This is the full cross-product used by the Compatibility Matrix Test to
 * mathematically prove 0 rendering crashes across every combination.
 */
export const THEMES: Theme[] = SKINS.flatMap((skin) =>
  TYPOGRAPHIES.map((typography) => ({
    id: `${skin.id}-${typography.id}`,
    skin,
    typography,
    layouts: DEFAULT_LAYOUTS,
    componentMappings: DEFAULT_COMPONENT_MAPPINGS,
    accessibility: buildAccessibility(skin),
  })),
);


