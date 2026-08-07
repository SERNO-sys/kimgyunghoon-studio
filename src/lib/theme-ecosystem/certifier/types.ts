/**
 * AWIE V2 - Phase 10: ThemeCertifier Types (Mandate 3).
 *
 * The ThemeCertifier is an automated test layer that strictly validates any
 * new Theme. It asserts the existence of required Skins, Typographies,
 * Layouts, Component Mappings, and Accessibility tokens.
 *
 * A Theme is PURE DATA. The certifier is PURE LOGIC. Neither may call an AI
 * API. The certifier only validates the deterministic structure of a Theme.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { Skin, Theme, Typography } from '../assets/types';

// ---------------------------------------------------------------------------
// Certification categories
// ---------------------------------------------------------------------------

/**
 * The certification categories a Theme must satisfy.
 *
 * These mirror the required asset groups the certifier asserts:
 *   - skins: the Theme must bundle a valid Skin.
 *   - typographies: the Theme must bundle a valid Typography.
 *   - layouts: the Theme must declare the layouts it supports.
 *   - componentMappings: the Theme must map every required component.
 *   - accessibility: the Theme must provide accessibility tokens.
 */
export type CertificationCategory =
  | 'skins'
  | 'typographies'
  | 'layouts'
  | 'componentMappings'
  | 'accessibility';

/**
 * A single certification check result.
 */
export interface CertificationCheck {
  /** The category this check belongs to. */
  category: CertificationCategory;
  /** A human-readable description of the check. */
  message: string;
  /** Whether the check passed. */
  passed: boolean;
}

/**
 * The result of certifying a single Theme.
 */
export interface CertificationResult {
  /** The certified Theme. */
  theme: Theme;
  /** Whether the Theme passed ALL checks. */
  certified: boolean;
  /** The individual check results. */
  checks: CertificationCheck[];
  /** The number of passed checks. */
  passedCount: number;
  /** The number of failed checks. */
  failedCount: number;
}

// ---------------------------------------------------------------------------
// Required component mappings
// ---------------------------------------------------------------------------

/**
 * The set of semantic components a Theme MUST map.
 *
 * A Theme must provide a mapping for every required component so the Renderer
 * can resolve any componentId. This is the "Component Mappings" certification
 * category.
 */
export const REQUIRED_COMPONENTS = [
  'hero',
  'featureGrid',
  'faq',
  'cta',
  'footer',
] as const;

/** The union of required component ids. */
export type RequiredComponentId = (typeof REQUIRED_COMPONENTS)[number];

// ---------------------------------------------------------------------------
// Required accessibility tokens
// ---------------------------------------------------------------------------

/**
 * The set of accessibility tokens a Theme MUST provide.
 *
 * These tokens guarantee the Theme is usable by all users. This is the
 * "Accessibility" certification category.
 */
export const REQUIRED_ACCESSIBILITY_TOKENS = [
  'focusRing',
  'contrastTextOnPrimary',
  'contrastTextOnSurface',
] as const;

/** The union of required accessibility token keys. */
export type RequiredAccessibilityToken = (typeof REQUIRED_ACCESSIBILITY_TOKENS)[number];

// ---------------------------------------------------------------------------
// The ThemeCertifier contract
// ---------------------------------------------------------------------------

/**
 * The ThemeCertifier.
 *
 * An automated test layer that strictly validates any new Theme. It asserts
 * the existence of required Skins, Typographies, Layouts, Component Mappings,
 * and Accessibility tokens.
 */
export interface ThemeCertifier {
  /**
   * Certifies a single Theme against all required categories.
   *
   * @param theme The Theme to certify.
   * @returns The certification result.
   */
  certify(theme: Theme): CertificationResult;

  /**
   * Certifies a Skin in isolation.
   *
   * @param skin The Skin to certify.
   * @returns The certification checks for the Skin.
   */
  certifySkin(skin: Skin): CertificationCheck[];

  /**
   * Certifies a Typography in isolation.
   *
   * @param typography The Typography to certify.
   * @returns The certification checks for the Typography.
   */
  certifyTypography(typography: Typography): CertificationCheck[];
}
