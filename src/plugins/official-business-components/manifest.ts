/**
 * AWIE V2 - Phase 13.5: Official Business Components Plugin - Manifest.
 *
 * The official "Business Components" Plugin. It provides the semantic section
 * renderers that power the 6 Reference Products (Florist, Restaurant, Law Firm,
 * Clinic, Photographer, Church). It is the canonical example of a MODULAR,
 * SCALABLE plugin that external developers can extend.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This Plugin provides Renderer extensions
 * ON TOP of the frozen core. It does NOT modify the core.
 *
 * ZERO CORE IMPORTS (Phase 13.3): This Plugin imports ONLY from `@awie/sdk`.
 * It MUST NEVER import an internal core module. The CI Architecture Guard
 * enforces this rule on the `src/plugins/` directory.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure declaration for the Developer Platform.
 */

import type { PluginManifest } from '@awie/sdk';

/**
 * The Official Business Components Plugin manifest.
 *
 * It declares:
 *   - identity: id "official-business-components", version "1.0.0"
 *   - the SemVer range of the AWIE Core version it targets
 *   - the capabilities: it provides Renderer extensions (and nothing else)
 */
export const officialBusinessComponentsManifest: PluginManifest = {
  id: 'official-business-components',
  version: '1.0.0',
  author: 'AWIE Platform Team',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: {
    renderer: true,
    theme: false,
    component: false,
  },
};
