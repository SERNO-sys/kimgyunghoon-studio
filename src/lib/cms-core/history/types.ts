/**
 * AWIE V2 - Phase 12 M2: CMS Core - History Types.
 *
 * MANDATE 1: Command Identification & Inverse Patches.
 *
 * Every Command MUST have a unique commandId (crucial for Replay, Retry, and
 * Audit). When the Patch Pipeline executes a Command, it generates the Patch
 * AND the Inverse Patch simultaneously. The CommandHistoryManager uses these
 * Inverse Patches for highly efficient Undo/Redo operations.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION DATA MODELING. It defines the shape of an
 * Inverse Patch and a History Entry. It contains NO rendering and NO runtime
 * execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling for the Application Layer.
 */

import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';

/**
 * An Inverse Patch.
 *
 * An Inverse Patch is the exact reverse of a ThemePatch. Applying the Inverse
 * Patch to the config produced by the original patch restores the config to its
 * prior state. This is the foundation for efficient Undo/Redo: instead of
 * storing full snapshots, we store the small, targeted inverse operations.
 *
 * The Inverse Patch is generated SIMULTANEOUSLY with the forward patch, so the
 * Application Layer always has both directions available.
 */
export interface InversePatch {
  /** The stable inverse patch id (correlated to the forward patch). */
  readonly id: CmsId;
  /** The id of the forward ThemePatch this inverse reverses. */
  readonly forwardPatchId: CmsId;
  /** The id of the Command that produced the forward patch. */
  readonly commandId: CmsId;
  /** The ordered inverse operations (reverse of the forward operations). */
  readonly operations: ThemePatch['operations'];

  /** The id of the ThemeConfig this inverse restores to. */
  readonly baseConfigId: CmsId;
  /** When the inverse patch was created. */
  readonly createdAt: Timestamp;
}

/**
 * A History Entry.
 *
 * A History Entry correlates a Command, its forward ThemePatch, and its Inverse
 * Patch. The CommandHistoryManager maintains an ordered stack of these entries
 * to support Undo/Redo.
 */
export interface HistoryEntry {
  /** The id of the Command that was executed. */
  readonly commandId: CmsId;
  /** The id of the Project the command targeted. */
  readonly projectId: CmsId;
  /** The forward ThemePatch produced by the command. */
  readonly patch: ThemePatch;
  /** The Inverse Patch that reverses the forward patch. */
  readonly inverse: InversePatch;
  /** When the command was executed. */
  readonly executedAt: Timestamp;
}
