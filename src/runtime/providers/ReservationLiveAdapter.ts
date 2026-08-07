/**
 * AWIE V2 - Phase 16.3: Application Runtime Foundation - Reservation Live
 * Adapter.
 *
 * A domain-scoped live data adapter for the 'reservation' feature slice.
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
 * The ThemeConfig is STRICTLY IMMUTABLE. This adapter fetches LIVE reservation
 * data (e.g., bookings, availability) and routes it into the 'reservation'
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
 * The reservation live data adapter.
 *
 * It owns the 'reservation' feature slice. fetchSlice() returns the live
 * reservation payload (bookings, availability) to merge into that slice. The
 * fetch lifecycle (cache, dedup, retry, background refetch) is delegated to
 * the QueryClient.
 */
export class ReservationLiveAdapter extends QueryClientLiveDataAdapter {
  readonly sliceName = 'reservation' as const;

  constructor(options: QueryClientLiveDataAdapterOptions) {
    super(options);
  }

  /**
   * The stable TanStack Query key for the reservation domain.
   */
  protected queryKey(): readonly unknown[] {
    return ['awie', 'runtime', 'reservation'];
  }

  /**
   * The raw fetch function. This is the source of the reservation data.
   *
   * In a production integration this would call the reservation API. Here it
   * returns a deterministic mock payload.
   */
  protected async fetchData(): Promise<unknown> {
    return {
      bookings: [],
      availability: { open: true },
    };
  }

  /**
   * Maps the fetched reservation data into the 'reservation' feature slice
   * shape. This is AWIE IP.
   */
  protected mapToSlice(data: unknown): FeatureSlice {
    const raw = data as { bookings?: unknown; availability?: unknown };
    return {
      bookings: raw.bookings ?? [],
      availability: raw.availability ?? { open: true },
    };
  }
}
