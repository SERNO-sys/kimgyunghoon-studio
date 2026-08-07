/**
 * AWIE V2 - Phase 14: CMS Infrastructure - Project Aggregate Root Data Model.
 *
 * This module defines the STRICT ID-based reference model for the CMS
 * Aggregate Root. It is PURE DATA MODELING for the CTO's review. It contains
 * NO Resolver logic, NO UI, and NO business logic.
 *
 * ============================================================================
 * MANDATORY ARCHITECTURE RULE (ADR-007 / ADR-008)
 * ============================================================================
 * The Project Aggregate Root is NOT a runtime model. It is a CMS orchestration
 * model. The Runtime MUST NEVER import or understand Project, LocaleVariant,
 * Brand, PluginSet, ThemePointer, or Snapshot models. Only the resolved
 * execution contract (ThemeConfig) may cross the CMS -> Runtime boundary.
 *
 * A LocaleVariant MUST NEVER hold a ThemeConfig. ThemeConfig is ONLY generated
 * dynamically via: Project -> Composition -> ThemeConfig.
 * ============================================================================
 *
 * The Aggregate Root acts as an ORCHESTRATOR, not a monolithic container. It
 * holds only stable ids that reference external collections. It never embeds
 * the full content of those collections.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** A stable, unique identifier for any CMS entity. */
export type CmsId = string;

/** An ISO-8601 timestamp string. */
export type Timestamp = string;

/** A BCP-47 locale tag (e.g. "ko-KR", "en-US", "ja-JP"). */
export type LocaleTag = string;

// ---------------------------------------------------------------------------
// LocaleVariant Status (STRICT ENUM)
// ---------------------------------------------------------------------------

/**
 * The publication status of a LocaleVariant.
 *
 * STRICT ENUM: No arbitrary strings are allowed. A LocaleVariant status MUST be
 * one of these four values. The Application Layer owns the transition rules;
 * the Runtime never does.
 */
export type LocaleVariantStatus =
  | 'Draft'
  | 'Published'
  | 'NeedsUpdate'
  | 'Archived';

/**
 * The ordered lifecycle sequence for a LocaleVariant status.
 *
 *   Draft -> Published -> NeedsUpdate -> Archived
 *
 * `NeedsUpdate` is a transient state: the master locale advanced beyond the
 * revision this variant was based on, so the variant must be re-synced before
 * it can be Published again.
 */
export const LOCALE_VARIANT_STATUS_ORDER: readonly LocaleVariantStatus[] = [
  'Draft',
  'Published',
  'NeedsUpdate',
  'Archived',
];

// ---------------------------------------------------------------------------
// LocaleVariant (STRICT REFERENCE MODEL)
// ---------------------------------------------------------------------------

/**
 * A single localized variant of a Project.
 *
 * A LocaleVariant is a STRICT REFERENCE MODEL. It holds NO presentation state
 * and NO ThemeConfig. It references external collections by stable id:
 *
 *   - contentId   -> native AI-generated text for this locale
 *   - assetSetId  -> locale-specific media
 *   - seoId       -> localized SEO metadata
 *   - routingId   -> localized paths
 *
 * Revision tracking:
 *   - sourceRevision    -> the revision of the master locale this variant was
 *                          based on.
 *   - resolvedRevision  -> the revision this variant is currently at.
 *
 * The GAP between `resolvedRevision` and the master locale's current revision
 * determines whether the variant is `NeedsUpdate`. Gap calculation is owned by
 * the Application Layer, never the Runtime.
 */
export interface LocaleVariant {
  /** The stable locale variant id. */
  readonly id: CmsId;
  /** The BCP-47 locale tag (e.g. "ko-KR"). */
  readonly locale: LocaleTag;
  /**
   * The publication status. STRICT ENUM — one of
   * Draft | Published | NeedsUpdate | Archived. No arbitrary strings.
   */
  readonly status: LocaleVariantStatus;
  /** The revision of the master locale this variant was based on. */
  readonly sourceRevision: number;
  /** The revision this variant is currently at (used to calculate the Gap). */
  readonly resolvedRevision: number;
  /** Reference to the native AI-generated text for this locale. */
  readonly contentId: CmsId;
  /** Reference to the locale-specific media set. */
  readonly assetSetId: CmsId;
  /** Reference to the localized SEO metadata. */
  readonly seoId: CmsId;
  /** Reference to the localized paths. */
  readonly routingId: CmsId;
  /** When this variant was created. */
  readonly createdAt: Timestamp;
  /** When this variant was last updated. */
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Project (AGGREGATE ROOT)
// ---------------------------------------------------------------------------

/**
 * The Project is the CMS Aggregate Root.
 *
 * It is an ORCHESTRATOR, not a monolithic container. It holds only stable ids
 * that reference external collections:
 *
 *   - brandId         -> Reference to Global Identity
 *   - themePointerId  -> Reference to the active theme
 *   - pluginSetId     -> Reference to global plugins
 *   - localeSetId     -> Reference to the locale collection
 *   - snapshotSetId   -> Reference to point-in-time backups
 *
 * The Project NEVER embeds the full content of these collections. It composes
 * them (via the Composition Service) into a single immutable ThemeConfig when
 * execution is required.
 *
 * MANDATORY: This model is NOT a runtime model. The Runtime MUST NEVER import
 * it. Only the resolved execution contract (ThemeConfig) crosses the boundary.
 */
export interface Project {
  /** The stable project id. */
  readonly id: CmsId;
  /** Reference to the Global Identity (Brand). */
  readonly brandId: CmsId;
  /** Reference to the active theme (ThemePointer). */
  readonly themePointerId: CmsId;
  /** Reference to the global plugin set (PluginSet). */
  readonly pluginSetId: CmsId;
  /** Reference to the locale collection (LocaleSet). */
  readonly localeSetId: CmsId;
  /** Reference to the point-in-time backups (SnapshotSet). */
  readonly snapshotSetId: CmsId;
  /** The display name of the project. */
  readonly name: string;
  /** When the project was created. */
  readonly createdAt: Timestamp;
  /** When the project was last updated. */
  readonly updatedAt: Timestamp;
}
