/**
 * AWIE V2 - Phase 16.3: Application Runtime Foundation - Zustand State Store.
 *
 * A thin AWIE-owned adapter that implements the IStateStore contract by
 * wrapping the mature OSS library **zustand** (vanilla store).
 *
 * ============================================================================
 * ADR-007 (Buy Before Build) — THE THIN ADAPTER PATTERN
 * ============================================================================
 * The Core Constitution depends ONLY on the IStateStore interface (defined in
 * ./types.ts). This concrete implementation wraps zustand's vanilla store so
 * that the OSS library NEVER leaks into the Core Constitution or the
 * HydrationEngine.
 *
 * Amendment A (Replaceability): The OSS library is isolated behind this
 * AWIE-owned adapter. Swapping the backing library requires changing ONLY this
 * file — never the IStateStore interface nor any of its consumers.
 *
 * Amendment B (Exit Strategy): Because consumers depend only on IStateStore,
 * the backing library can be replaced within one week without changing any
 * core contract.
 *
 * THE OVERLAY PATTERN:
 * The ThemeConfig is STRICTLY IMMUTABLE. This store holds ONLY the mutable
 * RuntimeState overlay. It has NO reference to, and NEVER touches, the
 * ThemeConfig.
 *
 * FRAMEWORK AGNOSTIC:
 * zustand's vanilla store is framework-agnostic (no React dependency). This
 * adapter preserves the Runtime's framework-agnosticism.
 * ============================================================================
 */

import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand';
import type { FeatureSlice, FeatureSlices, IStateStore, RuntimeState } from './types';

/**
 * The internal zustand store shape.
 *
 * The zustand store holds the RuntimeState and exposes the same mutation
 * operations that IStateStore requires. This shape is PRIVATE to this adapter
 * and is never exposed to consumers.
 */
interface ZustandState {
  readonly state: RuntimeState;
  setState: (patch: Partial<RuntimeState>) => void;
  patchSlice: <K extends keyof FeatureSlices>(
    sliceName: K,
    patch: FeatureSlice,
  ) => void;
}

/**
 * A thin AWIE-owned adapter implementing IStateStore by wrapping zustand's
 * vanilla store.
 *
 * The store internals (subscription, equality, middleware) are delegated to
 * zustand. This adapter preserves the immutable RuntimeState semantics and the
 * slice-scoped patchSlice() contract.
 */
export class ZustandStateStore implements IStateStore {
  private readonly store: StoreApi<ZustandState>;

  constructor(initialState: RuntimeState) {
    this.store = createStore<ZustandState>((set) => ({
      state: initialState,
      setState: (patch) =>
        set((current) => ({
          state: {
            ...current.state,
            ...patch,
          },
        })),
      patchSlice: (sliceName, patch) =>
        set((current) => {
          const existing = current.state.slices[sliceName] ?? {};
          return {
            state: {
              ...current.state,
              slices: {
                ...current.state.slices,
                [sliceName]: {
                  ...existing,
                  ...patch,
                },
              },
            },
          };
        }),
    }));
  }

  /**
   * Returns the current RuntimeState snapshot.
   */
  getState(): RuntimeState {
    return this.store.getState().state;
  }

  /**
   * Applies a partial patch to the RuntimeState, producing a NEW state object.
   *
   * This is an immutable update. The previous state object is never mutated.
   * Subscribers are notified with the new state.
   *
   * @param patch A partial RuntimeState to merge into the current state.
   */
  setState(patch: Partial<RuntimeState>): void {
    this.store.getState().setState(patch);
  }

  /**
   * Patches a SINGLE feature slice, producing a NEW state object.
   *
   * This is an immutable, slice-scoped update. Only the named slice is merged;
   * all other slices (and the rest of the state) are preserved.
   *
   * @param sliceName The name of the feature slice to patch.
   * @param patch The partial slice data to merge into the named slice.
   */
  patchSlice<K extends keyof FeatureSlices>(
    sliceName: K,
    patch: FeatureSlice,
  ): void {
    this.store.getState().patchSlice(sliceName, patch);
  }

  /**
   * Subscribes to state changes.
   *
   * @param listener The subscriber callback.
   * @returns An unsubscribe function.
   */
  subscribe(listener: (state: RuntimeState) => void): () => void {
    return this.store.subscribe((current) => listener(current.state));
  }
}
