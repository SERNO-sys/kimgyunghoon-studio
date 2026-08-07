/**
 * AWIE V2 - Phase 16.3: Application Runtime Foundation - Commerce Live Adapter.
 *
 * A domain-scoped live data adapter for the 'commerce' feature slice.
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
 * The ThemeConfig is STRICTLY IMMUTABLE. This adapter fetches LIVE commerce
 * data (e.g., cart, product prices, inventory) and routes it into the
 * 'commerce' feature slice. It patches DATA, NEVER presentation.
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
 * The commerce live data adapter.
 *
 * It owns the 'commerce' feature slice. fetchSlice() returns the live commerce
 * payload (cart, prices, inventory) to merge into that slice. The fetch
 * lifecycle (cache, dedup, retry, background refetch) is delegated to the
 * QueryClient.
 */
export class CommerceLiveAdapter extends QueryClientLiveDataAdapter {
  readonly sliceName = 'commerce' as const;

  constructor(options: QueryClientLiveDataAdapterOptions) {
    super(options);
  }

  /**
   * The stable TanStack Query key for the commerce domain.
   */
  protected queryKey(): readonly unknown[] {
    return ['awie', 'runtime', 'commerce'];
  }

  /**
   * The raw fetch function. This is the source of the commerce data.
   *
   * In a production integration this would call the commerce API. Here it
   * returns a deterministic mock payload.
   */
  protected async fetchData(): Promise<unknown> {
    return {
      cart: { items: 0, total: 0 },
      currency: 'USD',
    };
  }

  /**
   * Maps the fetched commerce data into the 'commerce' feature slice shape.
   * This is AWIE IP.
   */
  protected mapToSlice(data: unknown): FeatureSlice {
    const raw = data as { cart?: unknown; currency?: string };
    return {
      cart: raw.cart ?? { items: 0, total: 0 },
      currency: raw.currency ?? 'USD',
    };
  }
}
