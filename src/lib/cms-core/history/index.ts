/**
 * AWIE V2 - Phase 12 M2: CMS Core - History barrel export.
 *
 * MANDATE 1: Command Identification & Inverse Patches.
 *
 * Re-exports the Command History subsystem: the Inverse Patch contract, the
 * InversePatchGenerator, and the CommandHistoryManager that uses Inverse Patches
 * for efficient Undo/Redo.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

export type { HistoryEntry, InversePatch } from './types';

export { InversePatchGenerator } from './inverse-patch';

export { CommandHistoryManager } from './command-history-manager';
