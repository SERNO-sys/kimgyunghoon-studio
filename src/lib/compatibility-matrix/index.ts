/**
 * AWIE V2 - Phase 12.7: Compatibility Matrix - barrel export.
 *
 * MANDATE 2 (Phase 12.7): Primer for Phase 13 (Developer Platform).
 *
 * This module establishes the ARCHITECTURAL CONTRACT for validating future
 * plugins (Themes, Components, Renderers, Adapters) against the frozen
 * platform. It defines the CompatibilityMatrix schema interface ONLY. It does
 * NOT implement the full validation logic yet — that is Phase 13 work.
 *
 * THE PRIME DIRECTIVE (Phase 12.7): NO NEW CORE FEATURES.
 * This is a pure CONTRACT. It introduces no new architectural layer, no new
 * engine, and no new decision-maker. It is a data model that future plugins
 * must conform to so they can be validated against the platform.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the future Developer Platform.
 */

export type {
  AdapterIdentity,
  CompatibilityMatrix,
  CompatibilityRecord,
  CompatibilityStatus,
  ComponentIdentity,
  CoreVersion,
  PluginArtifactKind,
  PluginCompatibilityRecord,
  PluginIdentity,
  RendererIdentity,
  ThemeIdentity,
} from './types';


