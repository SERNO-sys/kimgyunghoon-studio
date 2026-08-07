/**
 * AWIE V2 - Phase 15.1: Preview System - PreviewMaterializer.
 *
 * The PreviewMaterializer (a Dataset Factory) is the ONLY component whose job
 * is to take a Draft and materialize it into a "Preview Dataset" (Read Models).
 *
 * ============================================================================
 * CRITICAL ARCHITECTURE RULES (ADR-007 / ADR-008)
 * ============================================================================
 * 1. Materializer, NOT Resolver. This is NOT a Resolver. It does NOT compose,
 *    validate, or decide. Its ONLY job is to transform a Draft into the four
 *    Raw Read Models (StructureRecord, PresentationRecord, LocalizationRecord,
 *    FeatureRecord) and persist them as a PreviewDataset.
 *
 * 2. Storage-Agnostic. The Materializer relies on the IPreviewDatasetRepository
 *    port. It does NOT hardcode in-memory storage. The backing store (in-memory,
 *    Redis, Edge KV, DB) is swappable without touching this class.
 *
 * 3. No Composition. The Materializer produces Read Models ONLY. It NEVER
 *    produces a ThemeConfig. Composition is performed later by the unmodified
 *    DefaultCompositionService consuming the injected Preview Readers.
 *
 * 4. No Draft Leakage. The Draft is consumed HERE and converted into passive
 *    Read Models. Draft concepts NEVER cross into the Composition Boundary.
 * ============================================================================
 */

import type {
  StructureRecord,
  PresentationRecord,
  LocalizationRecord,
  FeatureRecord,
  GlobalSeoRecord,
  LocalSeoRecord,
  PluginSeoRecord,
} from '../resolvers/types';
import type { PreviewDataset, IPreviewDatasetRepository } from './types';

// ---------------------------------------------------------------------------
// Draft (INPUT)
// ---------------------------------------------------------------------------

/**
 * The Draft input to the PreviewMaterializer.
 *
 * A Draft is the unsaved, in-progress state of a Project's composition inputs.
 * It is a passive data carrier. The Materializer consumes it and converts it
 * into the four Raw Read Models.
 *
 * NOTE: The Draft shape is intentionally minimal and opaque. The Materializer
 * extracts the four read-model payloads from it. Draft concepts are consumed
 * HERE and never leak into the Composition Boundary.
 */
export interface Draft {
  /** The stable id of the draft. */
  readonly id: string;
  /** The structural blueprint payload (raw, uninterpreted). */
  readonly structure: unknown;
  /** The visual/design asset payload (raw, uninterpreted). */
  readonly presentation: unknown;
  /** The locale-specific content + revision state payload (raw, uninterpreted). */
  readonly localization: unknown;
  /** The plugin/feature configuration payload (raw, uninterpreted). */
  readonly feature: unknown;
}

// ---------------------------------------------------------------------------
// PreviewMaterializer
// ---------------------------------------------------------------------------

/**
 * The Dataset Factory that materializes a Draft into a Preview Dataset.
 *
 * Its ONLY job is to take a Draft and materialize it into the four Raw Read
 * Models, then persist them via the IPreviewDatasetRepository port.
 *
 * STRICT RULES:
 * - Does NOT compose, validate, or decide.
 * - Does NOT produce a ThemeConfig.
 * - Relies on the injected IPreviewDatasetRepository (storage-agnostic).
 */
export class PreviewMaterializer {
  private readonly repository: IPreviewDatasetRepository;

  constructor(repository: IPreviewDatasetRepository) {
    this.repository = repository;
  }

  /**
   * Materializes a Draft into a Preview Dataset and persists it.
   *
   * @param draft - The Draft to materialize.
   * @returns A Promise resolving to the persisted Preview Dataset.
   */
  async materialize(draft: Draft): Promise<PreviewDataset> {
    const dataset: PreviewDataset = {
      id: draft.id,
      structure: this.toStructureRecord(draft),
      presentation: this.toPresentationRecord(draft),
      localization: this.toLocalizationRecord(draft),
      feature: this.toFeatureRecord(draft),
    };

    await this.repository.save(dataset);
    return dataset;
  }

  /**
   * Extracts the StructureRecord from the Draft.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply wraps the raw payload in the Read
   * Model shape.
   */
  private toStructureRecord(draft: Draft): StructureRecord {
    return {
      id: `${draft.id}:structure`,
      blueprint: draft.structure,
    };
  }

  /**
   * Extracts the PresentationRecord from the Draft.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply wraps the raw payload in the Read
   * Model shape, and extracts the passive Global SEO read model (if present).
   */
  private toPresentationRecord(draft: Draft): PresentationRecord {
    return {
      id: `${draft.id}:presentation`,
      asset: draft.presentation,
      globalSeo: this.readGlobalSeo(draft.presentation),
    };
  }

  /**
   * Extracts the LocalizationRecord from the Draft.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply wraps the raw payload in the Read
   * Model shape, and extracts the passive Local SEO read model (if present).
   */
  private toLocalizationRecord(draft: Draft): LocalizationRecord {
    return {
      id: `${draft.id}:localization`,
      locale: this.readLocale(draft.localization),
      resolvedRevision: this.readRevision(draft.localization),
      content: draft.localization,
      localSeo: this.readLocalSeo(draft.localization),
    };
  }

  /**
   * Extracts the FeatureRecord from the Draft.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply wraps the raw payload in the Read
   * Model shape, and extracts the passive Plugin-contributed SEO read model
   * (if present).
   */
  private toFeatureRecord(draft: Draft): FeatureRecord {
    return {
      pluginId: `${draft.id}:feature`,
      config: draft.feature,
      seo: this.readPluginSeo(draft.feature),
    };
  }

  /**
   * Extracts the passive Global SEO read model from the presentation payload.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply extracts the globalSeo field from the
   * raw payload.
   */
  private readGlobalSeo(source: unknown): GlobalSeoRecord | undefined {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)['globalSeo'];
      if (typeof value === 'object' && value !== null) {
        return value as GlobalSeoRecord;
      }
    }
    return undefined;
  }

  /**
   * Extracts the passive Local SEO read model from the localization payload.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply extracts the localSeo field from the
   * raw payload.
   */
  private readLocalSeo(source: unknown): LocalSeoRecord | undefined {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)['localSeo'];
      if (typeof value === 'object' && value !== null) {
        return value as LocalSeoRecord;
      }
    }
    return undefined;
  }

  /**
   * Extracts the passive Plugin-contributed SEO read model from the feature
   * payload.
   *
   * This is a passive, deterministic extraction. It does NOT interpret or
   * transform business meaning; it simply extracts the seo field from the raw
   * payload.
   */
  private readPluginSeo(source: unknown): PluginSeoRecord | undefined {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)['seo'];
      if (typeof value === 'object' && value !== null) {
        return value as PluginSeoRecord;
      }
    }
    return undefined;
  }

  /**
   * Reads the BCP-47 locale tag from the localization payload.
   *
   * This is a passive, deterministic read. It does NOT resolve fallback
   * locales; it simply extracts the locale field from the raw payload.
   */
  private readLocale(source: unknown): string {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)['locale'];
      if (typeof value === 'string') {
        return value;
      }
    }
    return '';
  }

  /**
   * Reads the resolved revision from the localization payload.
   *
   * This is a passive, deterministic read. It does NOT compute or decide
   * revisions; it simply extracts the revision field from the raw payload.
   */
  private readRevision(source: unknown): number {
    if (typeof source === 'object' && source !== null) {
      const value = (source as Record<string, unknown>)['resolvedRevision'];
      if (typeof value === 'number') {
        return value;
      }
    }
    return 0;
  }
}
