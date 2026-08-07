/**
 * AWIE V2 - Phase 10: ThemeCertifier Implementation (Mandate 3).
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
import {
  REQUIRED_ACCESSIBILITY_TOKENS,
  REQUIRED_COMPONENTS,
  type CertificationCheck,
  type CertificationResult,
  type ThemeCertifier,
} from './types';

/**
 * The default ThemeCertifier.
 *
 * Validates a Theme across five categories:
 *   - skins: the Theme must bundle a valid Skin.
 *   - typographies: the Theme must bundle a valid Typography.
 *   - layouts: the Theme must declare the layouts it supports.
 *   - componentMappings: the Theme must map every required component.
 *   - accessibility: the Theme must provide accessibility tokens.
 */
export class DefaultThemeCertifier implements ThemeCertifier {
  /**
   * Certifies a single Theme against all required categories.
   *
   * @param theme The Theme to certify.
   * @returns The certification result.
   */
  certify(theme: Theme): CertificationResult {
    const checks: CertificationCheck[] = [
      ...this.certifySkin(theme.skin),
      ...this.certifyTypography(theme.typography),
      ...this.certifyLayouts(theme),
      ...this.certifyComponentMappings(theme),
      ...this.certifyAccessibility(theme),
    ];

    const passedCount = checks.filter((check) => check.passed).length;
    const failedCount = checks.length - passedCount;

    return {
      theme,
      certified: failedCount === 0,
      checks,
      passedCount,
      failedCount,
    };
  }

  /**
   * Certifies a Skin in isolation.
   *
   * @param skin The Skin to certify.
   * @returns The certification checks for the Skin.
   */
  certifySkin(skin: Skin): CertificationCheck[] {
    const checks: CertificationCheck[] = [];

    // Required semantic colors.
    checks.push({
      category: 'skins',
      message: `Skin "${skin.id}" defines the required "primary" color`,
      passed: typeof skin.colors.primary === 'string' && skin.colors.primary.length > 0,
    });
    checks.push({
      category: 'skins',
      message: `Skin "${skin.id}" defines the required "surface" color`,
      passed: typeof skin.colors.surface === 'string' && skin.colors.surface.length > 0,
    });

    // Required radius tokens.
    checks.push({
      category: 'skins',
      message: `Skin "${skin.id}" defines the required radius tokens (sm, md, lg)`,
      passed:
        typeof skin.radius.sm === 'string' &&
        typeof skin.radius.md === 'string' &&
        typeof skin.radius.lg === 'string',
    });

    // Required shadow tokens.
    checks.push({
      category: 'skins',
      message: `Skin "${skin.id}" defines the required shadow tokens (card, elevated)`,
      passed:
        typeof skin.shadows.card === 'string' && typeof skin.shadows.elevated === 'string',
    });

    // Required motion tokens.
    checks.push({
      category: 'skins',
      message: `Skin "${skin.id}" defines the required motion tokens (fast, slow)`,
      passed:
        typeof skin.motion.fast === 'string' && typeof skin.motion.slow === 'string',
    });

    return checks;
  }

  /**
   * Certifies a Typography in isolation.
   *
   * @param typography The Typography to certify.
   * @returns The certification checks for the Typography.
   */
  certifyTypography(typography: Typography): CertificationCheck[] {
    const checks: CertificationCheck[] = [];

    // The font family is a token VALUE (never a structural key).
    checks.push({
      category: 'typographies',
      message: `Typography "${typography.id}" defines a font family token value`,
      passed: typeof typography.family === 'string' && typography.family.length > 0,
    });

    // Logical heading scale.
    checks.push({
      category: 'typographies',
      message: `Typography "${typography.id}" defines the logical heading scale (xl, lg, md)`,
      passed:
        typeof typography.headings.xl === 'string' &&
        typeof typography.headings.lg === 'string' &&
        typeof typography.headings.md === 'string',
    });

    // Logical body scale.
    checks.push({
      category: 'typographies',
      message: `Typography "${typography.id}" defines the logical body scale (lg, md, sm)`,
      passed:
        typeof typography.body.lg === 'string' &&
        typeof typography.body.md === 'string' &&
        typeof typography.body.sm === 'string',
    });

    // Logical caption scale.
    checks.push({
      category: 'typographies',
      message: `Typography "${typography.id}" defines the logical caption scale`,
      passed: typeof typography.caption.size === 'string',
    });

    // Logical line-height scale.
    checks.push({
      category: 'typographies',
      message: `Typography "${typography.id}" defines the logical line-height scale (heading, body)`,
      passed:
        typeof typography.lineHeights.heading === 'string' &&
        typeof typography.lineHeights.body === 'string',
    });

    return checks;
  }

  /**
   * Certifies the layouts a Theme declares.
   *
   * @param theme The Theme to certify.
   * @returns The certification checks for the layouts.
   */
  private certifyLayouts(theme: Theme): CertificationCheck[] {
    const checks: CertificationCheck[] = [];

    checks.push({
      category: 'layouts',
      message: `Theme "${theme.id}" declares at least one layout`,
      passed: Array.isArray(theme.layouts) && theme.layouts.length > 0,
    });

    checks.push({
      category: 'layouts',
      message: `Theme "${theme.id}" declares only non-empty layout ids`,
      passed:
        Array.isArray(theme.layouts) &&
        theme.layouts.every((layout) => typeof layout === 'string' && layout.length > 0),
    });

    return checks;
  }

  /**
   * Certifies the component mappings a Theme provides.
   *
   * @param theme The Theme to certify.
   * @returns The certification checks for the component mappings.
   */
  private certifyComponentMappings(theme: Theme): CertificationCheck[] {
    const checks: CertificationCheck[] = [];

    for (const component of REQUIRED_COMPONENTS) {
      const mappedLayout = theme.componentMappings[component];
      checks.push({
        category: 'componentMappings',
        message: `Theme "${theme.id}" maps required component "${component}" to a layout`,
        passed:
          typeof mappedLayout === 'string' &&
          mappedLayout.length > 0 &&
          theme.layouts.includes(mappedLayout),
      });
    }

    return checks;
  }

  /**
   * Certifies the accessibility tokens a Theme provides.
   *
   * @param theme The Theme to certify.
   * @returns The certification checks for the accessibility tokens.
   */
  private certifyAccessibility(theme: Theme): CertificationCheck[] {
    const checks: CertificationCheck[] = [];

    for (const token of REQUIRED_ACCESSIBILITY_TOKENS) {
      const value = theme.accessibility[token];
      checks.push({
        category: 'accessibility',
        message: `Theme "${theme.id}" provides the accessibility token "${token}"`,
        passed: typeof value === 'string' && value.length > 0,
      });
    }

    return checks;
  }
}
