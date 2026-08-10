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
import { resolveThemeTokens } from './theme-tokens';


/** The React context that carries the resolved ThemeTokens. */
export const ThemeContext = React.createContext<ThemeTokens | null>(null);

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
