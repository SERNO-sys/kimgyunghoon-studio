/**
 * AWIE V2 - Phase 15.1: Preview System - Preview Dataset Types.
 *
 * Preview is NOT an architecture problem; it is a Dependency Injection (DI)
 * problem. The Preview System reuses the EXISTING Reader contracts
 * (IStructureReader, IPresentationReader, ILocalizationReader, IFeatureReader)
 * by providing ALTERNATE implementations that read from a Preview Dataset.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. No New Reader Contracts. We do NOT create new Reader interfaces. We create
 *    alternate implementations of the EXISTING contracts (e.g.
 *    PreviewPresentationReader implements IPresentationReader). Production
 *    injects Published Readers; Previews inject Preview Readers.
 *
 * 2. Storage-Agnostic Preview Dataset. The Materializer and the Preview Readers
 *    rely on an IPreviewDatasetRepository port. This allows us to swap the
 *    backing store (in-memory, Redis, Edge KV, DB) without touching the
 *    Materializer or the Readers.
 *
 * 3. Execution Contract is Singular. There is NO PreviewThemeConfig. The
 *    DefaultCompositionService blindly consumes the injected Preview Readers
 *    and produces the exact same ThemeConfig execution contract.
 *
 * 4. Preview Dataset = Read Models. A PreviewDataset is a passive container of
 *    the four Raw Read Models (StructureRecord, PresentationRecord,
 *    LocalizationRecord, FeatureRecord). It carries NO composed Context and NO
 *    ThemeConfig.
 * ============================================================================
 */

import type {
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
} from '../resolvers/types';

// ---------------------------------------------------------------------------
// Preview Dataset (Read Models)
// ---------------------------------------------------------------------------

/**
 * A passive container of the four Raw Read Models that constitute a preview.
 *
 * RAW READ MODEL ONLY: A PreviewDataset is a passive data carrier. It carries
 * NO composed Context and NO ThemeConfig. It is NOT interpreted or transformed
 * by the Materializer that produces it, nor by the Preview Readers that consume
 * it.
 *
 * The four records mirror the four Reader responsibilities:
 *   - structure     -> consumed by PreviewStructureReader (IStructureReader)
 *   - presentation  -> consumed by PreviewPresentationReader (IPresentationReader)
 *   - localization  -> consumed by PreviewLocalizationReader (ILocalizationReader)
 *   - feature       -> consumed by PreviewFeatureReader (IFeatureReader)
 */
export interface PreviewDataset {
  /** The stable id of the preview dataset. */
  readonly id: string;
  /** The structural blueprint read model. */
  readonly structure: StructureRecord;
  /** The visual/design asset read model. */
  readonly presentation: PresentationRecord;
  /** The locale-specific content + revision state read model. */
  readonly localization: LocalizationRecord;
  /** The plugin/feature configuration read model. */
  readonly feature: FeatureRecord;
}

// ---------------------------------------------------------------------------
// IPreviewDatasetRepository (STORAGE-AGNOSTIC PORT)
// ---------------------------------------------------------------------------

/**
 * The storage-agnostic port for persisting and retrieving Preview Datasets.
 *
 * INFRASTRUCTURE ONLY: This interface is the seam that allows the Preview
 * System to swap its backing store (in-memory, Redis, Edge KV, DB) without
 * touching the Materializer or the Preview Readers.
 *
 * STRICT RULES:
 * - MUST ONLY contain save(dataset) and load(id).
 * - MUST NOT contain composition, fallback, or business logic.
 * - load MUST throw NotFoundError when a dataset is not found (matching the
 *   Reader strict error policy).
 */
export interface IPreviewDatasetRepository {
  /**
   * Persists a Preview Dataset under its id.
   *
   * @param dataset - The passive Preview Dataset to persist.
   * @returns A Promise resolving when the write completes.
   */
  save(dataset: PreviewDataset): Promise<void>;

  /**
   * Loads a Preview Dataset by id.
   *
   * @param id - The stable id of the preview dataset.
   * @returns A Promise resolving to the Preview Dataset.
   * @throws NotFoundError if the dataset is not found.
   */
  load(id: string): Promise<PreviewDataset>;
}
