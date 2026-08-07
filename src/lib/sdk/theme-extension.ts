/**
 * AWIE V2 - Phase 13: Plugin SDK - ThemeExtension.
 *
 * A ThemeExtension lets a Plugin author ship a complete Theme bundle: a named,
 * versioned collection of presentation resources (skins, typography, layouts,
 * components) that conform to the frozen Core.
 *
 * STRICT CONTRACT COMPLIANCE:
 *
 *   - Contract 001 (ThemeConfig): A ThemeExtension produces presentation
 *     resources that are consumed by ThemeConfig. It NEVER produces business
 *     logic. It is a pure, immutable declaration.
 *
 *   - Contract 002 (RenderNode): A ThemeExtension's components return pure,
 *     serializable, framework-agnostic RenderNode trees. They NEVER return
 *     React/Vue elements.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. A ThemeExtension ships ON TOP of the frozen
 * core; it does not modify the core.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      A ThemeExtension is a pure declaration. The platform registers its
 *      resources into the appropriate registries. The SDK never mutates the
 *      core registries directly.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure contract for
 *      plugin authors.
 *
 *   3. DETERMINISM (Constitution #12)
 *      A ThemeExtension is a static, immutable declaration. The same Theme
 *      always yields the same resources.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { AwieExtension } from './types';

/**
 * A named bundle of visual tokens (colors, radii, shadows, motion).
 *
 * This is a pure, immutable declaration of presentation tokens. It contains no
 * logic.
 */
export interface ThemeSkin {
  /** The stable skin id (e.g. "acme-dark"). */
  readonly id: string;
  /** The color tokens. */
  readonly colors: Readonly<Record<string, string>>;
  /** The border-radius tokens. */
  readonly radius: Readonly<Record<string, string>>;
  /** The shadow tokens. */
  readonly shadows: Readonly<Record<string, string>>;
  /** The motion tokens. */
  readonly motion: Readonly<Record<string, string>>;
}

/**
 * A named bundle of font tokens (families, sizes, weights, line-heights).
 *
 * This is a pure, immutable declaration of typography tokens. It contains no
 * logic.
 */
export interface ThemeTypography {
  /** The stable typography id (e.g. "acme-serif"). */
  readonly id: string;
  /** The font family tokens. */
  readonly families: Readonly<Record<string, string>>;
  /** The font size tokens. */
  readonly sizes: Readonly<Record<string, string>>;
  /** The font weight tokens. */
  readonly weights: Readonly<Record<string, string>>;
  /** The line-height tokens. */
  readonly lineHeights: Readonly<Record<string, string>>;
}

/**
 * A ThemeExtension.
 *
 * A ThemeExtension ships a complete Theme bundle: a named, versioned
 * collection of skins, typography, and layouts. It is a pure, immutable
 * declaration that conforms to the frozen Core.
 *
 * The Theme's resources are consumed by ThemeConfig (Contract 001) and its
 * components return RenderNode trees (Contract 002).
 */
export interface ThemeExtension extends AwieExtension {
  /** The extension kind is always 'theme'. */
  readonly kind: 'theme';
  /** The skins this Theme provides. */
  readonly skins: readonly ThemeSkin[];
  /** The typography bundles this Theme provides. */
  readonly typography: readonly ThemeTypography[];
  /**
   * The layout ids this Theme provides. Layouts are composition wrappers that
   * arrange child RenderNodes. They are referenced by id and resolved via the
   * LayoutRegistry.
   */
  readonly layoutIds: readonly string[];
}
