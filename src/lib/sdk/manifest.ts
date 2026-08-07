/**
 * AWIE V2 - Phase 13.1: Plugin SDK - PluginManifest schema.
 *
 * The PluginManifest is the machine-readable declaration of a Plugin (the
 * equivalent of plugin.json). It is the FIRST artifact the PluginLoader reads
 * when a Plugin is discovered. It declares:
 *
 *   - identity (id, version, author)
 *   - the SemVer range of the AWIE Core version the Plugin targets
 *   - the capabilities (the explicit set of extensions the Plugin provides)
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. The PluginManifest is a pure declaration;
 * it contains NO logic.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. NO BUSINESS LOGIC (Constitution #10)
 *      This module contains NO business logic. It is a pure contract for the
 *      Developer Platform.
 *
 *   2. DETERMINISM (Constitution #12)
 *      A PluginManifest is a static, immutable declaration. The same manifest
 *      always yields the same capabilities.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Developer Platform.
 */

import type { AwieExtensionKind } from './types';

/**
 * The declared capabilities of a Plugin.
 *
 * A Plugin explicitly declares which extensions it provides. This is the
 * contract the PluginLoader uses to know what to register. A Plugin can only
 * provide the extension kinds declared here; it cannot silently inject others.
 */
export interface PluginCapabilities {
  /** Whether the Plugin provides Renderer extensions. */
  readonly renderer: boolean;
  /** Whether the Plugin provides Theme extensions. */
  readonly theme: boolean;
  /** Whether the Plugin provides Component extensions. */
  readonly component: boolean;
}

/**
 * The PluginManifest schema (equivalent to plugin.json).
 *
 * This is the machine-readable declaration of a Plugin. It is validated by the
 * PluginLoader before the Plugin is loaded.
 */
export interface PluginManifest {
  /** The stable plugin id (e.g. "acme-editorial"). */
  readonly id: string;
  /** The semantic version of the plugin (e.g. "1.0.0"). */
  readonly version: string;
  /** The plugin author (for attribution). */
  readonly author?: string;
  /**
   * The SemVer range of the AWIE Core version this Plugin targets
   * (e.g. ">=2.0.0 <3.0.0"). The PluginLoader validates that the running AWIE
   * Core version satisfies this range before loading.
   */
  readonly coreVersion: string;
  /** The explicit declaration of the extensions this Plugin provides. */
  readonly capabilities: PluginCapabilities;
}

/**
 * Returns the list of extension kinds a Plugin's capabilities declare.
 *
 * This is a pure, deterministic mapping from the capabilities declaration to
 * the concrete extension kinds. It contains no logic beyond the structural
 * mapping.
 *
 * @param capabilities The declared capabilities.
 * @returns The declared extension kinds.
 */
export function declaredExtensionKinds(
  capabilities: PluginCapabilities,
): AwieExtensionKind[] {
  const kinds: AwieExtensionKind[] = [];
  if (capabilities.renderer) kinds.push('renderer');
  if (capabilities.theme) kinds.push('theme');
  if (capabilities.component) kinds.push('component');
  return kinds;
}
