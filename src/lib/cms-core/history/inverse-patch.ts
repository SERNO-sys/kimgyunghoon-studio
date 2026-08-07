/**
 * AWIE V2 - Phase 12 M2: CMS Core - Inverse Patch Generator.
 *
 * MANDATE 1: Command Identification & Inverse Patches.
 *
 * When the Patch Pipeline executes a Command, it generates the Patch AND the
 * Inverse Patch simultaneously. The Inverse Patch is the exact reverse of the
 * forward patch: applying it to the config produced by the forward patch
 * restores the config to its prior state.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION INFRASTRUCTURE. It derives the inverse of a
 * declarative patch. It contains NO rendering and NO runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

import type { CmsId } from '../domain/types';
import type { ThemeConfig } from '../../theme-config/v2/types';
import type { ThemePatch, ThemePatchEntry } from '../patch/types';
import type { InversePatch } from './types';

/**
 * The InversePatchGenerator.
 *
 * Derives the Inverse Patch of a forward ThemePatch. The inverse is computed
 * from the forward patch operations AND the base config (the config the forward
 * patch was applied to), so that 'replace' operations can capture the original
 * value that must be restored.
 */
export class InversePatchGenerator {
  /**
   * Generates the Inverse Patch for a forward ThemePatch.
   *
   * The inverse operations are the reverse of the forward operations:
   *   - 'replace' -> 'replace' with the ORIGINAL value (read from baseConfig).
   *   - 'add'     -> 'remove' (remove what was added).
   *   - 'remove'  -> 'add' with the ORIGINAL value (read from baseConfig).
   *
   * @param patch The forward ThemePatch.
   * @param commandId The id of the Command that produced the forward patch.
   * @param baseConfig The config the forward patch was applied to (read-only).
   * @returns The InversePatch that reverses the forward patch.
   */
  generate(
    patch: ThemePatch,
    commandId: CmsId,
    baseConfig: ThemeConfig,
  ): InversePatch {
    // Reverse the operations so the inverse restores state in the correct order.
    const reversed = [...patch.operations].reverse();
    const inverseOperations: ThemePatchEntry[] = reversed.map((entry) =>
      this.invertEntry(entry, baseConfig),
    );

    return {
      id: `inverse-${patch.id}`,
      forwardPatchId: patch.id,
      commandId,
      operations: inverseOperations,
      baseConfigId: patch.baseConfigId,
      createdAt: patch.createdAt,
    };
  }

  /**
   * Inverts a single patch entry.
   *
   * @param entry The forward patch entry.
   * @param baseConfig The config the forward patch was applied to.
   * @returns The inverse patch entry.
   */
  private invertEntry(
    entry: ThemePatchEntry,
    baseConfig: ThemeConfig,
  ): ThemePatchEntry {
    switch (entry.op) {
      case 'replace':
        // Restore the original value that was replaced.
        return {
          op: 'replace',
          path: entry.path,
          value: this.readValue(baseConfig, entry.path),
        };
      case 'add':
        // Remove what was added.
        return { op: 'remove', path: entry.path };
      case 'remove':
        // Re-add the original value that was removed.
        return {
          op: 'add',
          path: entry.path,
          value: this.readValue(baseConfig, entry.path),
        };
    }
  }

  /**
   * Reads the value at a JSON-Pointer-like path from a config.
   *
   * @param config The config to read from.
   * @param path The path to read.
   * @returns The value at the path (or undefined if absent).
   */
  private readValue(config: ThemeConfig, path: string): unknown {
    const segments = path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter((segment) => segment.length > 0);

    let current: unknown = config;
    for (const segment of segments) {
      if (
        current === null ||
        typeof current !== 'object' ||
        !(segment in (current as Record<string, unknown>))
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }
}
