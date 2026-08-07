/**
 * AWIE V2 - Phase 16.3: Application Runtime Foundation - QueryClient Live Data
 * Adapter (base).
 *
 * A thin AWIE-owned base adapter that implements the IDomainLiveDataAdapter
 * contract by wrapping the mature OSS library **@tanstack/react-query**
 * (QueryClient).
 *
 * ============================================================================
 * ADR-007 (Buy Before Build) — THE THIN ADAPTER PATTERN
 * ============================================================================
 * The Core Constitution depends ONLY on the IDomainLiveDataAdapter interface
 * (defined in ./core/types.ts). This concrete base adapter wraps a
 * QueryClient so that the OSS library NEVER leaks into the Core Constitution
 * or the HydrationEngine.
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
 * DELEGATION:
 * Caching, deduplication, retry, and background refetch are delegated to the
 * QueryClient. The AWIE-owned adapter preserves the domain-mapping logic (raw
 * API -> feature slice shape), which is AWIE IP.
 *
 * THE OVERLAY PATTERN:
 * The ThemeConfig is STRICTLY IMMUTABLE. This adapter fetches LIVE data and
 * routes it into a feature slice. It patches DATA, NEVER presentation.
 * ============================================================================
 */

import { QueryClient } from '@tanstack/react-query';
import type {
  FeatureSlice,
  IDomainLiveDataAdapter,
  IRuntimeContext,
  LiveDataPatch,
} from '../core/types';

/**
 * The options for a QueryClient-backed live data adapter.
 */
export interface QueryClientLiveDataAdapterOptions {
  /**
   * The QueryClient that owns the fetch lifecycle (cache, dedup, retry,
   * background refetch). This is the OSS library handle, isolated behind this
   * adapter.
   */
  readonly queryClient: QueryClient;
}

/**
 * A thin AWIE-owned base adapter implementing IDomainLiveDataAdapter by
 * wrapping a QueryClient.
 *
 * Subclasses provide:
 * - sliceName: the feature slice this adapter owns.
 * - queryKey(): the stable TanStack Query key for this domain.
 * - fetchData(): the raw fetch function (the domain-mapping source).
 * - mapToSlice(): maps the fetched data into the feature slice shape.
 *
 * The QueryClient delegates caching, deduplication, retry, and background
 * refetch. The AWIE-owned subclass preserves the domain-mapping logic.
 */
export abstract class QueryClientLiveDataAdapter implements IDomainLiveDataAdapter {
  protected readonly queryClient: QueryClient;

  constructor(options: QueryClientLiveDataAdapterOptions) {
    this.queryClient = options.queryClient;
  }

  /**
   * The name of the feature slice this adapter owns (e.g., 'commerce').
   */
  abstract readonly sliceName: keyof import('../core/types').FeatureSlices;

  /**
   * The stable TanStack Query key for this domain.
   */
  protected abstract queryKey(): readonly unknown[];

  /**
   * The raw fetch function. This is the source of the domain data.
   */
  protected abstract fetchData(): Promise<unknown>;

  /**
   * Maps the fetched data into the feature slice shape. This is AWIE IP.
   */
  protected abstract mapToSlice(data: unknown): FeatureSlice;

  /**
   * Fetches a single live data patch for a given target.
   *
   * @param targetId The stable id of the component/slot.
   * @returns A LiveDataPatch, or undefined if no live data is available.
   */
  async fetch(targetId: string): Promise<LiveDataPatch | undefined> {
    const data = await this.fetchSliceData();
    if (data === undefined) {
      return undefined;
    }
    return { targetId, value: data };
  }

  /**
   * Fetches the full live data payload for this domain's slice.
   *
   * Caching, deduplication, retry, and background refetch are delegated to the
   * QueryClient. The fetched data is mapped into the feature slice shape by
   * the AWIE-owned subclass.
   *
   * @param _context The current runtime context.
   * @returns The live data to merge into this domain's feature slice, or
   *          undefined if no live data is available.
   */
  async fetchSlice(_context: IRuntimeContext): Promise<FeatureSlice | undefined> {
    const data = await this.fetchSliceData();
    if (data === undefined) {
      return undefined;
    }
    return this.mapToSlice(data);
  }

  /**
   * Resolves the live data through the QueryClient.
   *
   * The QueryClient owns the fetch lifecycle. If the query is already cached
   * and fresh, it returns the cached value without re-fetching. Otherwise it
   * fetches, caches, and applies retry/background-refetch semantics.
   */
  private async fetchSliceData(): Promise<unknown> {
    return this.queryClient.fetchQuery({
      queryKey: this.queryKey(),
      queryFn: () => this.fetchData(),
    });
  }
}
