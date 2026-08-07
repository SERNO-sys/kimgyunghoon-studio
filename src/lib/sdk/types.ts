/**
 * AWIE V2 - Phase 13: Plugin SDK - Core Types.
 *
 * The Plugin SDK is the public-facing contract that external developers use to
 * author a Plugin. A Plugin may register new Renderers, Themes, or Components
 * STRICTLY by abiding by:
 *
 *   - Contract 001 (ThemeConfig): the immutable Single Source of Truth.
 *   - Contract 002 (RenderNode): the pure, serializable, framework-agnostic
 *     virtual node tree.
 *
 * Every Plugin is validated against the CompatibilityMatrix before it is
 * accepted by the platform.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This SDK does NOT modify the core. It
 * provides the extension surface ON TOP of the frozen core.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. REGISTRY PATTERN (Constitution #9)
 *      A Plugin declares extensions; the platform registers them into the
 *      appropriate registries. The SDK never mutates the core registries
 *      directly.
 *
 *   2. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure contract for
 *      plugin authors.
 *
 *   3. DETERMINISM (Constitution #12)
 *      A Plugin is a static, immutable declaration. The same Plugin always
 *      yields the same extensions.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { ThemeConfig } from '../theme-config/v2';
import type { RenderNode } from '../renderer-foundation/types';
import type {
  PluginArtifactKind,
  PluginCompatibilityRecord,
  PluginIdentity,
} from '../compatibility-matrix';

/**
 * The identity of a Plugin.
 *
 * A Plugin is a third-party extension artifact that ships against the frozen
 * Core. It is identified by a stable plugin id and a semantic version.
 */
export interface AwiePluginIdentity {
  /** The stable plugin id (e.g. "acme-editorial"). */
  readonly pluginId: string;
  /** The semantic version of the plugin (e.g. "1.0.0"). */
  readonly version: string;
  /** The plugin display name (for tooling / marketplace). */
  readonly name: string;
  /** The plugin author (for attribution). */
  readonly author?: string;
  /** A short description of the plugin. */
  readonly description?: string;
}

/**
 * The kind of extension a Plugin provides.
 *
 *   - 'renderer'  - the plugin ships a Renderer extension.
 *   - 'theme'     - the plugin ships a Theme bundle.
 *   - 'component' - the plugin ships a Component set.
 */
export type AwieExtensionKind = 'renderer' | 'theme' | 'component';

/**
 * The frozen Core version a Plugin targets.
 *
 * A Plugin declares which Core version it targets. The CompatibilityMatrix
 * validates that the Plugin's declared Core version is compatible with the
 * platform's frozen Core version.
 */
export interface AwieCoreTarget {
  /** The frozen Core version (e.g. "2.0.0"). */
  readonly version: string;
}

/**
 * The base contract every Plugin extension MUST satisfy.
 *
 * An extension is a pure, immutable declaration. It carries no behavior and
 * no business logic. It is validated against the CompatibilityMatrix before
 * the platform accepts it.
 */
export interface AwieExtension {
  /** The kind of extension. */
  readonly kind: AwieExtensionKind;
  /** The stable extension id (e.g. "acme-hero"). */
  readonly id: string;
  /** The semantic version of the extension (e.g. "1.0.0"). */
  readonly version: string;
  /** The frozen Core version this extension targets. */
  readonly core: AwieCoreTarget;
}

/**
 * The Plugin SDK entry point.
 *
 * A Plugin is a static, immutable declaration of one or more extensions. It
 * is the unit that external developers author and ship. The platform consumes
 * a Plugin, validates it against the CompatibilityMatrix, and registers its
 * extensions into the appropriate registries.
 *
 * A Plugin MUST NOT contain business logic. It is a pure declaration.
 */
export interface AwiePlugin {
  /** The Plugin identity. */
  readonly identity: AwiePluginIdentity;
  /** The frozen Core version this Plugin targets. */
  readonly core: AwieCoreTarget;
  /** The extensions this Plugin provides. */
  readonly extensions: readonly AwieExtension[];
}

/**
 * The result of validating a Plugin against the CompatibilityMatrix.
 *
 * This is a pure declaration of the validation outcome. It contains no logic.
 */
export interface AwiePluginValidationResult {
  /** The Plugin identity that was validated. */
  readonly plugin: PluginIdentity;
  /** Whether the Plugin is compatible with the frozen Core. */
  readonly compatible: boolean;
  /** The compatibility records evaluated for this Plugin. */
  readonly records: readonly PluginCompatibilityRecord[];
  /** The artifact kinds this Plugin provides. */
  readonly artifactKinds: readonly PluginArtifactKind[];
}

/**
 * Converts an AwiePlugin identity into the CompatibilityMatrix PluginIdentity.
 *
 * This is a pure, deterministic mapping. It contains no logic beyond the
 * structural mapping between the SDK identity and the matrix identity.
 *
 * @param identity The SDK Plugin identity.
 * @returns The CompatibilityMatrix PluginIdentity.
 */
export function toPluginIdentity(
  identity: AwiePluginIdentity,
): PluginIdentity {
  return {
    pluginId: identity.pluginId,
    version: identity.version,
  };
}

/**
 * The render context available to a Plugin extension at render time.
 *
 * STRICT CONSTRAINT: This context contains ONLY presentation data. It MUST
 * NEVER contain BusinessBrief, IndustryProfile, or RecipeBlueprint. The
 * renderer is intentionally ignorant of business semantics.
 */
export interface AwieRenderContext {
  /** The immutable ThemeConfig (the SSOT). */
  readonly config: ThemeConfig;
  /** The active locale (e.g. "ko", "en"). */
  readonly locale?: string;
  /** The active tenant identifier. */
  readonly tenant?: string;
  /** Whether this is a preview render. */
  readonly preview?: boolean;
}

/**
 * A framework-agnostic render function.
 *
 * A Plugin extension's render function consumes presentation data and returns
 * a RenderNode tree. It MUST be pure and deterministic: the same input always
 * produces the same RenderNode.
 *
 * @param props The component props (presentation data only).
 * @param context The pure render context.
 * @returns The RenderNode tree.
 */
export type AwieRenderFunction<P = Record<string, unknown>> = (
  props: P,
  context: AwieRenderContext,
) => RenderNode;
