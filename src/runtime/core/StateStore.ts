/**
 * AWIE V2 - Phase 16.1/16.2: Application Runtime Foundation - State Store.
 *
 * A simple, framework-agnostic observable store (pub/sub) that holds the
 * RuntimeState.
 *
 * ============================================================================
 * THE OVERLAY PATTERN
 * ============================================================================
 * The ThemeConfig is STRICTLY IMMUTABLE. The Runtime MUST NEVER mutate the
 * ThemeConfig. Instead, the Runtime maintains a mutable RuntimeState. The UI
 * is the result of ThemeConfig (Immutable) + RuntimeState (Mutable Overlay).
 *
 * This StateStore holds ONLY the mutable RuntimeState overlay. It has NO
 * reference to, and NEVER touches, the ThemeConfig.
 *
 * FRAMEWORK AGNOSTIC:
 * This store does NOT depend on React, Vue, or any specific UI framework. It
 * is a plain pub/sub observable store. Framework-specific layers subscribe to
 * it and translate snapshots into their own rendering model.
 *
 * FEATURE SLICES (Phase 16.2):
 * The RuntimeState is partitioned into named feature slices (e.g., commerce,
 * reservation, crm, analytics). patchSlice() updates ONLY the named slice,
 * leaving all other slices untouched. This prevents updates in one domain from
 * overwriting another domain.
 * ============================================================================
 */

import type { FeatureSlice, FeatureSlices, RuntimeState } from './types';

/**
 * A subscriber callback invoked whenever the RuntimeState changes.
 */
export type StateSubscriber = (state: RuntimeState) => void;

/**
 * A framework-agnostic observable store holding the RuntimeState.
 *
 * It supports:
 * - getState(): snapshot-based read of the current state.
 * - setState(patch): immutable update (produces a NEW state object).
 * - patchSlice(sliceName, patch): immutable update of a SINGLE feature slice,
 *   leaving all other slices untouched.
 * - subscribe(listener): pub/sub subscription; returns an unsubscribe fn.
 */
export class StateStore {
  private state: RuntimeState;
  private readonly subscribers = new Set<StateSubscriber>();

  constructor(initialState: RuntimeState) {
    this.state = initialState;
  }

  /**
   * Returns the current RuntimeState snapshot.
   *
   * This is a snapshot-based read. The returned object is the current state;
   * callers MUST NOT mutate it directly. Use setState to update.
   */
  getState(): RuntimeState {
    return this.state;
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
    this.state = {
      ...this.state,
      ...patch,
    };
    this.notify();
  }

  /**
   * Patches a SINGLE feature slice, producing a NEW state object.
   *
   * This is an immutable, slice-scoped update. Only the named slice is merged;
   * all other slices (and the rest of the state) are preserved. This prevents
   * updates in one domain (e.g., commerce) from overwriting another domain
   * (e.g., reservation).
   *
   * @param sliceName The name of the feature slice to patch.
   * @param patch The partial slice data to merge into the named slice.
   */
  patchSlice<K extends keyof FeatureSlices>(
    sliceName: K,
    patch: FeatureSlice,
  ): void {
    const current = this.state.slices[sliceName] ?? {};
    this.state = {
      ...this.state,
      slices: {
        ...this.state.slices,
        [sliceName]: {
          ...current,
          ...patch,
        },
      },
    };
    this.notify();
  }

  /**
   * Subscribes to state changes.
   *
   * @param listener The subscriber callback.
   * @returns An unsubscribe function.
   */
  subscribe(listener: StateSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.state);
    }
  }
}
