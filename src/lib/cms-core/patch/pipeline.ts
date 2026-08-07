/**
 * AWIE V2 - Phase 12: CMS Core - ThemePatchPipeline.
 *
 * The ThemePatchPipeline translates Editor Commands into immutable patches and
 * applies those patches to produce NEW ThemeConfigs. It NEVER mutates a
 * ThemeConfig in place. This preserves the established patch philosophy and
 * enables Undo/Redo, History, and Audit Trails.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The pipeline is PURE APPLICATION INFRASTRUCTURE. It applies declarative
 * patches to data. It contains NO rendering and NO runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { ThemePatch, ThemePatchEntry } from './types';

/**
 * The ThemePatchPipeline.
 *
 * Applies an immutable ThemePatch to a ThemeConfig, producing a NEW ThemeConfig
 * (deep-copied) with the patch operations applied. The original ThemeConfig is
 * NEVER mutated.
 */
export class ThemePatchPipeline {
  /**
   * Applies a ThemePatch to a ThemeConfig, producing a NEW ThemeConfig.
   *
   * The input config is deep-cloned first, so the original is never mutated.
   * Each patch operation is then applied to the clone. The result is a new,
   * independent ThemeConfig.
   *
   * @param config The current ThemeConfig (read-only; never mutated).
   * @param patch The immutable ThemePatch to apply.
   * @returns A NEW ThemeConfig with the patch applied.
   */
  apply(config: ThemeConfig, patch: ThemePatch): ThemeConfig {
    // Deep-clone the config so the original is never mutated.
    const next = structuredClone(config) as ThemeConfig;

    for (const entry of patch.operations) {
      this.applyEntry(next, entry);
    }

    // Stamp the new config's updatedAt to reflect the change.
    next.metadata.updatedAt = patch.createdAt;

    return next;
  }

  /**
   * Applies a single patch entry to a ThemeConfig (in place on the clone).
   *
   * @param config The cloned ThemeConfig to mutate.
   * @param entry The patch entry to apply.
   */
  private applyEntry(config: ThemeConfig, entry: ThemePatchEntry): void {
    const { op, path, value } = entry;

    // Parse the path into segments. Supports dotted keys and array indices,
    // e.g. "resources.sections[0].content.heading".
    const segments = this.parsePath(path);

    // Navigate to the parent of the target segment.
    const parent = this.resolveParent(config, segments);
    const key = segments[segments.length - 1];

    switch (op) {
      case 'replace':
      case 'add':
        parent[key] = value;
        break;
      case 'remove':
        // If the target is an array index, splice it out so the array actually
        // shrinks (delete would leave a sparse hole). Otherwise delete the key.
        if (Array.isArray(parent) && /^\d+$/.test(key)) {
          parent.splice(Number(key), 1);
        } else {
          delete parent[key];
        }
        break;
    }
  }

  /**
   * Parses a JSON-Pointer-like path into segments.
   *
   * Supports dotted keys and array indices, e.g.
   * "resources.sections[0].content.heading" ->
   * ["resources", "sections", "0", "content", "heading"].
   *
   * @param path The path string.
   * @returns The parsed segments.
   */
  private parsePath(path: string): string[] {
    return path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter((segment) => segment.length > 0);
  }

  /**
   * Resolves the parent object of the target segment.
   *
   * @param root The root object (the ThemeConfig).
   * @param segments The full path segments.
   * @returns The parent object containing the target key.
   */
  private resolveParent(
    root: object,
    segments: string[],
  ): Record<string, unknown> {
    let current = root as Record<string, unknown>;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const next = current[segment];
      if (next === undefined || typeof next !== 'object' || next === null) {
        throw new Error(
          `ThemePatchPipeline: cannot resolve path segment "${segment}" (path "${segments.join('.')}").`,
        );
      }
      current = next as Record<string, unknown>;
    }
    return current;
  }

}
