/**
 * AWIE V2 - Phase 11 M2: Runtime Coordination - RuntimeEventBus.
 *
 * A lightweight internal pub/sub for observability. Services emit RuntimeEvents
 * on the bus; diagnostics (loggers, metrics, tracing) subscribe to it.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. EVENT-DRIVEN OBSERVABILITY - Services MUST NOT print raw console logs.
 *      They emit RuntimeEvents on the RuntimeEventBus; diagnostics subscribe.
 *   2. DECOUPLING - Services MUST NOT depend directly on other services. The
 *      event bus decouples emitters from subscribers.
 *   3. ZERO BUSINESS LOGIC - The event bus is pure infrastructure. It NEVER
 *      imports BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   4. ZERO RENDERING - The event bus NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  RuntimeEvent,
  RuntimeEventBus,
  RuntimeEventSubscriber,
} from './types';

/**
 * Recursively freezes a value so that it (and all nested objects/arrays) is
 * deeply immutable.
 *
 * @param value The value to freeze.
 * @returns The frozen value.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  // Freeze the object itself first, then recurse into its own enumerable
  // properties. Object.freeze is idempotent, so re-freezing is safe.
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * The default RuntimeEventBus.
 *
 * A synchronous pub/sub. Subscribers are invoked in subscription order. Each
 * subscriber is isolated: if one subscriber throws, the error is captured and
 * the remaining subscribers still receive the event (fail-open, never
 * fail-fast). This guarantees that a misbehaving diagnostic can never break the
 * runtime.
 *
 * IMMUTABILITY: Every emitted event is DEEP-FROZEN before delivery. Subscribers
 * receive a read-only view and MUST NOT mutate the event or its payload. This
 * guarantees that a subscriber can never corrupt the event for other
 * subscribers or the emitting service.
 *
 * The bus is deterministic in its contract: emit/subscribe/unsubscribe/clear.
 */
export class DefaultRuntimeEventBus implements RuntimeEventBus {
  /** The set of active subscribers. */
  private readonly subscribers = new Set<RuntimeEventSubscriber>();

  /**
   * Emits an event to all subscribers.
   *
   * The event is deep-frozen before delivery, guaranteeing that subscribers
   * receive an immutable view. Subscribers are isolated: a throwing subscriber
   * does not prevent other subscribers from receiving the event.
   *
   * @param event The event to emit.
   */
  emit(event: RuntimeEvent): void {
    // Deep-freeze the event so subscribers cannot mutate it. This enforces the
    // immutability mandate: subscribers must never mutate the event.
    const frozen = deepFreeze(event);
    for (const subscriber of this.subscribers) {
      try {
        subscriber(frozen);
      } catch {
        // Fail-open: a misbehaving diagnostic must never break the runtime.
        // The error is intentionally swallowed to preserve isolation.
      }
    }
  }


  /**
   * Subscribes to events.
   *
   * @param subscriber The subscriber function.
   * @returns An unsubscribe function.
   */
  subscribe(subscriber: RuntimeEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Removes all subscribers.
   */
  clear(): void {
    this.subscribers.clear();
  }
}
