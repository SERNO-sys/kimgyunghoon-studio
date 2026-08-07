/**
 * AWIE V2 - Phase 13: Plugin SDK - ComponentExtension.
 *
 * A ComponentExtension lets a Plugin author ship a set of framework-agnostic
 * section components (e.g. "acme-hero", "acme-gallery"). Each component maps a
 * section type to a pure render function that returns a RenderNode tree.
 *
 * STRICT CONTRACT COMPLIANCE:
 *
 *   - Contract 001 (ThemeConfig): A ComponentExtension consumes ThemeConfig
 *     sections (presentation data only) and produces RenderNodes. It NEVER
 *     reads BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *
 *   - Contract 002 (RenderNode): A ComponentExtension returns pure,
 *     serializable, framework-agnostic RenderNode trees. It NEVER returns a
 *     React/Vue element.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. A ComponentExtension ships ON TOP of the
 * frozen core; it does not modify the core.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      A ComponentExtension is a pure declaration. The platform registers its
 *      components into the ComponentRegistry. The SDK never mutates the core
 *      registry directly.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure contract for
 *      plugin authors.
 *
 *   3. DETERMINISM (Constitution #12)
 *      A ComponentExtension's render functions MUST be pure and deterministic:
 *      the same input always produces the same RenderNode.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { AwieExtension, AwieRenderFunction } from './types';

/**
 * A single framework-agnostic component within a ComponentExtension.
 *
 * A component maps a section type to a pure render function. It is a pure,
 * immutable declaration.
 */
export interface AwieComponent {
  /** The stable component id (e.g. "acme-hero"). */
  readonly id: string;
  /** The semantic section type this component handles (e.g. "acme-hero"). */
  readonly sectionType: string;
  /**
   * The pure render function. It consumes presentation data and returns a
   * RenderNode tree. It MUST be deterministic and framework-agnostic.
   */
  readonly render: AwieRenderFunction;
}

/**
 * A ComponentExtension.
 *
 * A ComponentExtension ships a set of framework-agnostic section components.
 * Each component abides by Contract 002 (RenderNode): it is pure,
 * serializable, deterministic, and framework-agnostic.
 */
export interface ComponentExtension extends AwieExtension {
  /** The extension kind is always 'component'. */
  readonly kind: 'component';
  /** The components this extension provides. */
  readonly components: readonly AwieComponent[];
}
