/**
 * AWIE V2 - Phase 12: CMS Core - Patch barrel export.
 *
 * Re-exports the immutable ThemePatch and VersionSnapshot contracts, and the
 * ThemePatchPipeline that applies patches to produce NEW ThemeConfigs.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

export type {
  ThemePatch,
  ThemePatchEntry,
  ThemePatchOperation,
  VersionSnapshot,
} from './types';

export { ThemePatchPipeline } from './pipeline';
