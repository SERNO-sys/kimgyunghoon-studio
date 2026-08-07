/**
 * AWIE V2 - Phase 16.2: Application Runtime Foundation - Adapter Registry.
 *
 * The registry of domain live data adapters.
 *
 * ============================================================================
 * THE OVERLAY PATTERN
 * ============================================================================
 * The ThemeConfig is STRICTLY IMMUTABLE. The Runtime MUST NEVER mutate the
 * ThemeConfig. Instead, the Runtime maintains a mutable RuntimeState. The UI
 * is the result of ThemeConfig (Immutable) + RuntimeState (Mutable Overlay).
 *
 * This registry orchestrates live data. It does NOT own presentation. It
 * routes each domain adapter's fetched data into the correct feature slice of
 * the RuntimeState via the StateStore's patchSlice() method.
 *
 * FEATURE SLICES:
 * Each domain (commerce, reservation, crm, analytics) owns a named feature
 * slice. triggerAll() fetches live data from every registered adapter and
 * patches ONLY the owning slice, leaving all other slices untouched.
 *
 * FRAMEWORK AGNOSTIC:
 * This registry does NOT depend on React, Vue, or any specific UI framework.
 * ============================================================================
 */

import type { StateStore } from './StateStore';
import type {
  FeatureSlices,
  IAdapterRegistry,
  IDomainLiveDataAdapter,
  IRuntimeContext,
} from './types';

/**
 * The registry of domain live data adapters.
 *
 * It registers domain adapters and, on triggerAll(), fetches live data from
 * each adapter and routes it into the correct feature slice of the
 * RuntimeState. It NEVER touches presentation.
 */
export class AdapterRegistry implements IAdapterRegistry {
  private readonly adapters = new Map<keyof FeatureSlices, IDomainLiveDataAdapter>();

  /**
   * Registers a domain live data adapter.
   *
   * @param adapter The domain adapter to register.
   */
  register(adapter: IDomainLiveDataAdapter): void {
    this.adapters.set(adapter.sliceName, adapter);
  }

  /**
   * Resolves an adapter by slice name.
   *
   * @param sliceName The name of the feature slice.
   * @returns The registered adapter, or undefined if none is registered.
   */
  get(sliceName: keyof FeatureSlices): IDomainLiveDataAdapter | undefined {
    return this.adapters.get(sliceName);
  }

  /**
   * Lists all registered slice names.
   */
  list(): readonly (keyof FeatureSlices)[] {
    return [...this.adapters.keys()];
  }

  /**
   * Triggers every registered adapter to fetch live data and routes it into
   * the correct feature slice of the RuntimeState.
   *
   * This is an immutable, slice-scoped update. Each adapter patches ONLY its
   * owning slice; all other slices (and the rest of the state) are preserved.
   *
   * @param store The StateStore to patch.
   * @param context The current runtime context.
   */
  async triggerAll(store: StateStore, context: IRuntimeContext): Promise<void> {
    for (const adapter of this.adapters.values()) {
      const sliceData = await adapter.fetchSlice(context);
      if (sliceData !== undefined) {
        store.patchSlice(adapter.sliceName, sliceData);
      }
    }
  }
}
