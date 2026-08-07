/**
 * AWIE V2 - Phase 12: CMS Core - Patch Types.
 *
 * Editor Commands MUST NOT mutate ThemeConfig in place. Instead, every Command
 * is translated into an IMMUTABLE ThemePatch by the ThemePatchPipeline. This
 * preserves the established patch philosophy: the ThemeConfig SSOT is never
 * mutated directly; a new config is produced by applying a patch.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION DATA MODELING. It defines the shape of an
 * immutable patch and an immutable version snapshot. It contains NO rendering
 * and NO runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';

// ---------------------------------------------------------------------------
// ThemePatch
// ---------------------------------------------------------------------------

/**
 * The operation of a single immutable patch entry.
 *
 *   - 'replace' - replace the value at `path` with `value`.
 *   - 'add'     - add `value` at `path` (e.g. a new section).
 *   - 'remove'  - remove the value at `path`.
 *
 * Paths follow a JSON-Pointer-like convention rooted at the ThemeConfig, e.g.
 * `resources.sections[hero].content.heading`.
 */
export type ThemePatchOperation = 'replace' | 'add' | 'remove';

/**
 * A single immutable patch entry.
 *
 * A patch entry describes a targeted, deterministic change to a ThemeConfig.
 * It NEVER mutates the config directly; it is a declarative description of a
 * change that the ThemePatchPipeline applies to produce a NEW config.
 */
export interface ThemePatchEntry {
  /** The patch operation. */
  readonly op: ThemePatchOperation;
  /** The JSON-Pointer-like path within the ThemeConfig. */
  readonly path: string;
  /** The value to replace/add (absent for 'remove'). */
  readonly value?: unknown;
}

/**
 * An immutable ThemePatch.
 *
 * A ThemePatch is an ordered list of ThemePatchEntry operations. Applying a
 * patch to a ThemeConfig produces a NEW ThemeConfig; the original is never
 * mutated. This is the foundation for Undo/Redo, History, and Audit Trails.
 */
export interface ThemePatch {
  /** The stable patch id. */
  readonly id: CmsId;
  /** The ordered patch operations. */
  readonly operations: readonly ThemePatchEntry[];
  /** The id of the ThemeConfig this patch was derived from. */
  readonly baseConfigId: CmsId;
  /** When the patch was created. */
  readonly createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Version Snapshot
// ---------------------------------------------------------------------------

/**
 * An immutable Version Snapshot of a ThemeConfig.
 *
 * When a PublishProjectCommand is executed, the Application Layer MUST create a
 * permanent, immutable snapshot of the ThemeConfig and persist an Audit Trail.
 * A VersionSnapshot is that immutable record. It is NEVER mutated after
 * creation.
 */
export interface VersionSnapshot {
  /** The stable snapshot id. */
  readonly id: CmsId;
  /** The id of the Project this snapshot belongs to. */
  readonly projectId: CmsId;
  /** The semantic version of this snapshot (e.g. "1.0.0"). */
  readonly version: string;
  /**
   * The ThemeConfig schema version (e.g. "v2.0").
   *
   * MANDATE 2: When a PublishProjectCommand is executed, the resulting
   * VersionSnapshot MUST explicitly include the schemaVersion. This integrates
   * securely with the Phase 11 Migration Pipeline, which uses the schemaVersion
   * to determine whether a config needs migration before it can be rendered.
   */
  readonly schemaVersion: string;
  /** The immutable ThemeConfig captured at publish time. */
  readonly config: ThemeConfig;
  /** The id of the user who published this snapshot. */
  readonly publishedBy: CmsId;
  /** When the snapshot was created (publish time). */
  readonly publishedAt: Timestamp;
  /** The id of the audit trail entry recording this publish. */
  readonly auditTrailId: CmsId;
}


