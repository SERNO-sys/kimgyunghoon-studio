/**
 * AWIE V2 - Phase 12 M2: CMS Core - CommandHistoryManager.
 *
 * MANDATE 1: Command Identification & Inverse Patches.
 *
 * The CommandHistoryManager maintains an ordered stack of HistoryEntries, each
 * correlating a Command, its forward ThemePatch, and its Inverse Patch. It uses
 * the Inverse Patches for highly efficient Undo/Redo operations: instead of
 * storing full config snapshots, it stores the small, targeted inverse
 * operations.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION INFRASTRUCTURE. It tracks command history and
 * produces the patches needed for Undo/Redo. It contains NO rendering and NO
 * runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

import type { CmsId } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { HistoryEntry, InversePatch } from './types';

/**
 * The CommandHistoryManager.
 *
 * Maintains an ordered history of executed Commands per Project. Supports:
 *   - record()  - record a Command execution (forward patch + inverse patch).
 *   - undo()    - return the Inverse Patch to reverse the most recent command.
 *   - redo()    - return the forward Patch to re-apply a reverted command.
 *   - history() - return the full ordered history for a Project.
 */
export class CommandHistoryManager {
  /** Per-project ordered history of executed commands. */
  private readonly historyByProject = new Map<CmsId, HistoryEntry[]>();
  /** Per-project redo stack (forward patches of reverted commands). */
  private readonly redoByProject = new Map<CmsId, HistoryEntry[]>();

  /**
   * Records a Command execution.
   *
   * @param entry The HistoryEntry correlating the command, patch, and inverse.
   */
  record(entry: HistoryEntry): void {
    const list = this.historyByProject.get(entry.projectId) ?? [];
    list.push(entry);
    this.historyByProject.set(entry.projectId, list);
    // A new command invalidates the redo stack.
    this.redoByProject.delete(entry.projectId);
  }

  /**
   * Returns the Inverse Patch to undo the most recent command for a Project.
   *
   * @param projectId The Project id.
   * @returns The InversePatch to undo, or undefined if there is nothing to undo.
   */
  undo(projectId: CmsId): InversePatch | undefined {
    const list = this.historyByProject.get(projectId);
    if (!list || list.length === 0) {
      return undefined;
    }
    const entry = list.pop() as HistoryEntry;
    const redo = this.redoByProject.get(projectId) ?? [];
    redo.push(entry);
    this.redoByProject.set(projectId, redo);
    return entry.inverse;
  }

  /**
   * Returns the forward Patch to redo a reverted command for a Project.
   *
   * @param projectId The Project id.
   * @returns The forward ThemePatch to redo, or undefined if there is nothing
   *   to redo.
   */
  redo(projectId: CmsId): ThemePatch | undefined {
    const redo = this.redoByProject.get(projectId);
    if (!redo || redo.length === 0) {
      return undefined;
    }
    const entry = redo.pop() as HistoryEntry;
    const list = this.historyByProject.get(projectId) ?? [];
    list.push(entry);
    this.historyByProject.set(projectId, list);
    return entry.patch;
  }

  /**
   * Returns the full ordered history for a Project.
   *
   * @param projectId The Project id.
   * @returns The ordered history entries (oldest first).
   */
  history(projectId: CmsId): readonly HistoryEntry[] {
    return this.historyByProject.get(projectId) ?? [];
  }

  /**
   * Returns whether a Project has any history to undo.
   *
   * @param projectId The Project id.
   */
  canUndo(projectId: CmsId): boolean {
    return (this.historyByProject.get(projectId)?.length ?? 0) > 0;
  }

  /**
   * Returns whether a Project has any history to redo.
   *
   * @param projectId The Project id.
   */
  canRedo(projectId: CmsId): boolean {
    return (this.redoByProject.get(projectId)?.length ?? 0) > 0;
  }
}
