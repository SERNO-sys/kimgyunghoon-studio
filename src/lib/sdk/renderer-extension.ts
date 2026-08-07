/**
 * AWIE V2 - Phase 13: Plugin SDK - RendererExtension.
 *
 * A RendererExtension lets a Plugin author extend the platform's rendering
 * capability by registering a new framework-agnostic section renderer.
 *
 * STRICT CONTRACT COMPLIANCE:
 *
 *   - Contract 001 (ThemeConfig): A RendererExtension consumes a ThemeConfig
 *     section (presentation data only) and produces a RenderNode. It NEVER
 *     reads BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *
 *   - Contract 002 (RenderNode): A RendererExtension returns a pure,
 *     serializable, framework-agnostic RenderNode tree. It NEVER returns a
 *     React/Vue element.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. A RendererExtension extends the renderer
 * ON TOP of the frozen core; it does not modify the core.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      A RendererExtension is a pure declaration. The platform registers it
 *      into the ComponentRegistry. The SDK never mutates the core registry
 *      directly.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure contract for
 *      plugin authors.
 *
 *   3. DETERMINISM (Constitution #12)
 *      A RendererExtension's render function MUST be pure and deterministic:
 *      the same input always produces the same RenderNode.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { AwieExtension, AwieRenderFunction } from './types';

/**
 * A RendererExtension.
 *
 * A RendererExtension registers a new framework-agnostic section renderer. It
 * maps a section type (e.g. "acme-hero") to a pure render function that
 * consumes presentation data and returns a RenderNode tree.
 *
 * The render function MUST abide by Contract 002 (RenderNode): it is pure,
 * serializable, deterministic, and framework-agnostic.
 */
export interface RendererExtension extends AwieExtension {
  /** The extension kind is always 'renderer'. */
  readonly kind: 'renderer';
  /**
   * The section type this renderer handles (e.g. "acme-hero"). This is the
   * semantic section type that the ThemeConfig references.
   */
  readonly sectionType: string;
  /**
   * The pure render function. It consumes presentation data and returns a
   * RenderNode tree. It MUST be deterministic and framework-agnostic.
   */
  readonly render: AwieRenderFunction;
}
