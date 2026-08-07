/**
 * AWIE V2 - Phase 16.3: Application Runtime Foundation - CRM Live Adapter.
 *
 * A domain-scoped live data adapter for the 'crm' feature slice.
 *
 * ============================================================================
 * ADR-007 (Buy Before Build) — THE THIN ADAPTER PATTERN
 * ============================================================================
 * This adapter extends QueryClientLiveDataAdapter, which wraps the mature OSS
 * library @tanstack/react-query (QueryClient). Caching, deduplication, retry,
 * and background refetch are delegated to the QueryClient. The OSS library
 * NEVER leaks into the Core Constitution or the HydrationEngine.
 *
 * Amendment A (Replaceability): The OSS library is isolated behind this
 * AWIE-owned adapter. Swapping the backing library requires changing ONLY the
 * adapter implementations — never the IDomainLiveDataAdapter interface nor any
 * of its consumers.
 *
 * Amendment B (Exit Strategy): Because consumers depend only on
 * IDomainLiveDataAdapter, the backing library can be replaced within one week
 * without changing any core contract.
 *
 * THE OVERLAY PATTERN:
 * The ThemeConfig is STRICTLY IMMUTABLE. This adapter fetches LIVE CRM data
 * (e.g., leads, contacts, customer segments) and routes it into the 'crm'
 * feature slice. It patches DATA, NEVER presentation.
 *
 * FRAMEWORK AGNOSTIC:
 * This adapter does NOT depend on React, Vue, or any specific UI framework.
 * ============================================================================
 */

import type { FeatureSlice } from '../core/types';
import {
  QueryClientLiveDataAdapter,
  type QueryClientLiveDataAdapterOptions,
} from './QueryClientLiveDataAdapter';

/**
 * The CRM live data adapter.
 *
 * It owns the 'crm' feature slice. fetchSlice() returns the live CRM payload
 * (leads, contacts, segments) to merge into that slice. The fetch lifecycle
 * (cache, dedup, retry, background refetch) is delegated to the QueryClient.
 */
export class CrmLiveAdapter extends QueryClientLiveDataAdapter {
  readonly sliceName = 'crm' as const;

  constructor(options: QueryClientLiveDataAdapterOptions) {
    super(options);
  }

  /**
   * The stable TanStack Query key for the CRM domain.
   */
  protected queryKey(): readonly unknown[] {
    return ['awie', 'runtime', 'crm'];
  }

  /**
   * The raw fetch function. This is the source of the CRM data.
   *
   * In a production integration this would call the CRM API. Here it returns a
   * deterministic mock payload.
   */
  protected async fetchData(): Promise<unknown> {
    return {
      leads: [],
      segments: [],
    };
  }

  /**
   * Maps the fetched CRM data into the 'crm' feature slice shape. This is AWIE
   * IP.
   */
  protected mapToSlice(data: unknown): FeatureSlice {
    const raw = data as { leads?: unknown; segments?: unknown };
    return {
      leads: raw.leads ?? [],
      segments: raw.segments ?? [],
    };
  }
}
