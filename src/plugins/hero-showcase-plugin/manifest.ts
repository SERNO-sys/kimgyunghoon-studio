/**
 * AWIE V2 - Phase 13.3: Hero Showcase Reference Plugin - Manifest.
 *
 * The official "Hero Showcase" Reference Plugin. It is intentionally kept
 * extremely simple so that an external developer can read it in ~30 minutes and
 * understand how to author a Plugin against the frozen AWIE Core.
 *
 * THE PRIME DIRECTIVE (Phase 13): The frozen Core Contracts are a DEPENDENCY,
 * never a target for modification. This Plugin provides a Renderer extension
 * ON TOP of the frozen core. It does NOT modify the core.
 *
 * ZERO CORE IMPORTS (Phase 13.3): A Reference Plugin MUST import ONLY from
 * `@awie/sdk` (or standard libraries). It MUST NEVER import an internal core
 * module (e.g. `src/lib/runtime`, `src/lib/theme-engine`, `src/lib/cms-core`).
 * The CI Architecture Guard enforces this rule on the `src/plugins/` directory.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure declaration for the Developer Platform.
 */

import type { PluginManifest } from '@awie/sdk';

/**
 * The Hero Showcase Plugin manifest.
 *
 * It declares:
 *   - identity: id "hero-showcase", version "1.0.0"
 *   - the SemVer range of the AWIE Core version it targets
 *   - the capabilities: it provides a Renderer extension (and nothing else)
 */
export const heroShowcaseManifest: PluginManifest = {
  id: 'hero-showcase',
  version: '1.0.0',
  author: 'AWIE Platform Team',
  coreVersion: '>=2.0.0 <3.0.0',
  capabilities: {
    renderer: true,
    theme: false,
    component: false,
  },
};
