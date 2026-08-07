/**
 * AWIE V2 - Phase 10: Theme Assets Barrel (Mandate 2).
 *
 * Exports the pure JSON Theme asset types and the asset registry.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data.
 */

export type {
  AccessibilityTokens,
  Skin,
  SkinColors,
  SkinMotion,
  SkinRadius,
  SkinShadows,
  Theme,
  Typography,
} from './types';

export {
  BOLD_SKIN,
  CLASSIC_TYPOGRAPHY,
  DARK_SKIN,
  EDITORIAL_TYPOGRAPHY,
  LIGHT_SKIN,
  MODERN_TYPOGRAPHY,
  SKINS,
  THEMES,
  TYPOGRAPHIES,
} from './registry';
