/**
 * AWIE V2 - Phase 15.1: Preview System - Preview Readers.
 *
 * These are ALTERNATE implementations of the EXISTING Reader contracts
 * (IStructureReader, IPresentationReader, ILocalizationReader, IFeatureReader).
 * They fetch their Read Models from an IPreviewDatasetRepository.
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. No New Reader Contracts. We do NOT create new Reader interfaces. We create
 *    alternate implementations of the EXISTING contracts. Production injects
 *    Published Readers; Previews inject these Preview Readers.
 *
 * 2. Storage-Agnostic. These Readers rely on the IPreviewDatasetRepository port.
 *    The backing store (in-memory, Redis, Edge KV, DB) is swappable without
 *    touching these Readers.
 *
 * 3. Raw Read Models Only. Each Reader returns a RAW Read Model (*Record),
 *    NEVER a composed Context or ThemeConfig.
 *
 * 4. Strict Error Policy. Each Reader MUST throw NotFoundError when the dataset
 *    is not found. It MUST NEVER return null, and MUST NEVER attempt to resolve
 *    fallback data.
 * ============================================================================
 */

import type {
  IStructureReader,
  IPresentationReader,
  ILocalizationReader,
  IFeatureReader,
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
  NotFoundError,
} from '../resolvers/types';
import type { IPreviewDatasetRepository } from './types';

/**
 * A Preview implementation of IStructureReader.
 *
 * Fetches the StructureRecord from the Preview Dataset. It is injected into the
 * DefaultCompositionService in place of the Published Structure Reader.
 */
export class PreviewStructureReader implements IStructureReader {
  private readonly repository: IPreviewDatasetRepository;

  constructor(repository: IPreviewDatasetRepository) {
    this.repository = repository;
  }

  /**
   * Fetches the structural blueprint from the Preview Dataset.
   *
   * @param id - The stable id of the preview dataset.
   * @returns A Promise resolving to the raw StructureRecord.
   * @throws NotFoundError if the dataset is not found.
   */
  async read(id: string): Promise<StructureRecord> {
    const dataset = await this.repository.load(id);
    return dataset.structure;
  }
}

/**
 * A Preview implementation of IPresentationReader.
 *
 * Fetches the PresentationRecord from the Preview Dataset. It is injected into
 * the DefaultCompositionService in place of the Published Presentation Reader.
 */
export class PreviewPresentationReader implements IPresentationReader {
  private readonly repository: IPreviewDatasetRepository;

  constructor(repository: IPreviewDatasetRepository) {
    this.repository = repository;
  }

  /**
   * Fetches the visual/design asset from the Preview Dataset.
   *
   * @param id - The stable id of the preview dataset.
   * @returns A Promise resolving to the raw PresentationRecord.
   * @throws NotFoundError if the dataset is not found.
   */
  async read(id: string): Promise<PresentationRecord> {
    const dataset = await this.repository.load(id);
    return dataset.presentation;
  }
}

/**
 * A Preview implementation of ILocalizationReader.
 *
 * Fetches the LocalizationRecord from the Preview Dataset. It is injected into
 * the DefaultCompositionService in place of the Published Localization Reader.
 */
export class PreviewLocalizationReader implements ILocalizationReader {
  private readonly repository: IPreviewDatasetRepository;

  constructor(repository: IPreviewDatasetRepository) {
    this.repository = repository;
  }

  /**
   * Fetches the locale-specific content + revision state from the Preview
   * Dataset.
   *
   * @param id - The stable id of the preview dataset.
   * @returns A Promise resolving to the raw LocalizationRecord.
   * @throws NotFoundError if the dataset is not found.
   */
  async read(id: string): Promise<LocalizationRecord> {
    const dataset = await this.repository.load(id);
    return dataset.localization;
  }
}

/**
 * A Preview implementation of IFeatureReader.
 *
 * Fetches the FeatureRecord from the Preview Dataset. It is injected into the
 * DefaultCompositionService in place of the Published Feature Reader.
 */
export class PreviewFeatureReader implements IFeatureReader {
  private readonly repository: IPreviewDatasetRepository;

  constructor(repository: IPreviewDatasetRepository) {
    this.repository = repository;
  }

  /**
   * Fetches the plugin/feature configuration from the Preview Dataset.
   *
   * @param id - The stable id of the preview dataset.
   * @returns A Promise resolving to the raw FeatureRecord.
   * @throws NotFoundError if the dataset is not found.
   */
  async read(id: string): Promise<FeatureRecord> {
    const dataset = await this.repository.load(id);
    return dataset.feature;
  }
}

// Re-export the NotFoundError type for consumers of this module.
export type { NotFoundError };
