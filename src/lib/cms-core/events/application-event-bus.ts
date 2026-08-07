/**
 * AWIE V2 - Phase 12 M3: CMS Core - ApplicationEventBus.
 *
 * The STRICTLY SEGREGATED bus for BUSINESS domain events. This is NOT the
 * RuntimeEventBus (Phase 11). The RuntimeEventBus is for infrastructure
 * (Cache, Health, Performance). The ApplicationEventBus is for business
 * domains (ProjectPublished, HeadingUpdated). They MUST NEVER be merged.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The Application Layer is the SOLE publisher of Application Events. The
 * Runtime MUST NEVER publish Application Events. Subscribers are isolated
 * side-effect handlers (webhooks, search indexing, notifications) that react
 * to events WITHOUT the Application Service invoking them directly.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure event infrastructure for the Application Layer.
 */

import type {
  ApplicationEventBus,
  ApplicationEventSubscriber,
  DomainEvent,
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
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * The default ApplicationEventBus.
 *
 * A synchronous pub/sub for business domain events. Subscribers are invoked in
 * subscription order. Each subscriber is isolated: if one subscriber throws,
 * the error is captured and the remaining subscribers still receive the event
 * (fail-open, never fail-fast). This guarantees that a misbehaving side-effect
 * can never break the Application Layer.
 *
 * IMMUTABILITY: Every published event is DEEP-FROZEN before delivery.
 * Subscribers receive a read-only view and MUST NOT mutate the event or its
 * payload. This guarantees that a subscriber can never corrupt the event for
 * other subscribers or the publishing service.
 *
 * The bus is deterministic in its contract: publish/subscribe/unsubscribe/clear.
 */
export class DefaultApplicationEventBus implements ApplicationEventBus {
  /** The set of active subscribers. */
  private readonly subscribers = new Set<ApplicationEventSubscriber>();

  /**
   * Publishes a DomainEvent to all subscribers.
   *
   * The event is deep-frozen before delivery, guaranteeing that subscribers
   * receive an immutable view. Subscribers are isolated: a throwing subscriber
   * does not prevent other subscribers from receiving the event.
   *
   * @param event The DomainEvent to publish.
   */
  publish(event: DomainEvent): void {
    const frozen = deepFreeze(event);
    for (const subscriber of this.subscribers) {
      try {
        subscriber(frozen);
      } catch {
        // Fail-open: a misbehaving side-effect must never break the
        // Application Layer. The error is intentionally swallowed to preserve
        // isolation.
      }
    }
  }

  /**
   * Subscribes to Application Events.
   *
   * @param subscriber The subscriber function.
   * @returns An unsubscribe function.
   */
  subscribe(subscriber: ApplicationEventSubscriber): () => void {
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
