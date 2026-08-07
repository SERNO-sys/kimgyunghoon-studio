/**
 * AWIE V2 - StyleAdapter (Phase 09B, Mandate 1).
 *
 * A PURE, framework-independent utility that converts a SkinResource and a
 * TypographyResource into a flat dictionary of CSS Custom Properties
 * (CSS variables).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. FRAMEWORK-INDEPENDENT
 *      The StyleAdapter is a pure function. It imports NO React, NO Vue, and
 *      NO DOM APIs. It returns a plain `Record<string, string>`.
 *
 *   2. NO RenderContext
 *      The StyleAdapter MUST NOT read RenderContext. It only consumes the two
 *      presentation resources it is given (SkinResource + TypographyResource).
 *
 *   3. NO DOM INJECTION
 *      The StyleAdapter NEVER touches the DOM. It does not call
 *      `document.documentElement.style.setProperty(...)` or any equivalent.
 *      DOM injection is the responsibility of the framework adapter (React,
 *      Vue, Vanilla). The framework takes the returned dictionary and handles
 *      injection itself.
 *
 *   4. DETERMINISTIC
 *      Given the same SkinResource and TypographyResource, the StyleAdapter
 *      ALWAYS returns the exact same dictionary. This is guaranteed by
 *      iterating the token maps in a stable, insertion-ordered manner and
 *      emitting a fixed, predictable key naming scheme.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure presentation infrastructure.
 */

import type { SkinResource, TypographyResource } from './types';

/**
 * A flat dictionary of CSS Custom Properties.
 *
 * Keys are CSS variable names WITHOUT the leading `--` (e.g. `color-primary`).
 * The framework adapter is responsible for prefixing with `--` and injecting
 * them into the DOM. Keeping the keys unprefixed keeps this utility pure and
 * framework-agnostic.
 */
export type CssVariableDictionary = Record<string, string>;

/**
 * The StyleAdapter interface.
 *
 * A pure converter from presentation resources to a CSS variable dictionary.
 * Implementations MUST be side-effect free and deterministic.
 */
export interface StyleAdapter {
  /**
   * Converts a SkinResource and a TypographyResource into a flat dictionary of
   * CSS Custom Properties.
   *
   * @param skin The skin resource (colors, radius, shadows, motion).
   * @param typography The typography resource (families, sizes, weights, line-heights).
   * @returns A flat dictionary of CSS variable names -> values.
   */
  toCssVariables(skin: SkinResource, typography: TypographyResource): CssVariableDictionary;
}

/**
 * The default StyleAdapter.
 *
 * Emits a deterministic, flat dictionary of CSS Custom Properties from a skin
 * and a typography resource. The naming scheme is:
 *
 *   - colors:      `color-<token>`        (e.g. `color-primary`)
 *   - radius:      `radius-<token>`       (e.g. `radius-sm`)
 *   - shadows:     `shadow-<token>`       (e.g. `shadow-card`)
 *   - motion:      `motion-<token>`       (e.g. `motion-fast`)
 *   - font family: `font-family-<token>`  (e.g. `font-family-body`)
 *   - font size:   `font-size-<token>`    (e.g. `font-size-lg`)
 *   - font weight: `font-weight-<token>`  (e.g. `font-weight-bold`)
 *   - line height: `line-height-<token>`  (e.g. `line-height-body`)
 *
 * The dictionary is built by iterating each token map in insertion order, so
 * the output is fully deterministic for a given input.
 */
export class DefaultStyleAdapter implements StyleAdapter {
  /**
   * Converts a SkinResource and a TypographyResource into a flat dictionary of
   * CSS Custom Properties.
   */
  toCssVariables(skin: SkinResource, typography: TypographyResource): CssVariableDictionary {
    const variables: CssVariableDictionary = {};

    // Skin tokens.
    for (const [token, value] of Object.entries(skin.colors)) {
      variables[`color-${token}`] = value;
    }
    for (const [token, value] of Object.entries(skin.radius)) {
      variables[`radius-${token}`] = value;
    }
    for (const [token, value] of Object.entries(skin.shadows)) {
      variables[`shadow-${token}`] = value;
    }
    for (const [token, value] of Object.entries(skin.motion)) {
      variables[`motion-${token}`] = value;
    }

    // Typography tokens.
    for (const [token, value] of Object.entries(typography.families)) {
      variables[`font-family-${token}`] = value;
    }
    for (const [token, value] of Object.entries(typography.sizes)) {
      variables[`font-size-${token}`] = value;
    }
    for (const [token, value] of Object.entries(typography.weights)) {
      variables[`font-weight-${token}`] = value;
    }
    for (const [token, value] of Object.entries(typography.lineHeights)) {
      variables[`line-height-${token}`] = value;
    }

    return variables;
  }
}
