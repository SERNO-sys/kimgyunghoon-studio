/**
 * AWIE V2 - Phase 12 M3: CMS Core - Application Events (DomainEvent envelope).
 *
 * The Application Layer is the SOLE publisher of DomainEvents. These events
 * describe BUSINESS domain facts (ProjectPublished, HeadingUpdated) that have
 * already occurred. They are emitted AFTER a Command executes successfully.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT SEGREGATION (MANDATE 1):
 *   The ApplicationEventBus is STRICTLY SEPARATE from the RuntimeEventBus
 *   (Phase 11). The RuntimeEventBus is for infrastructure (Cache, Health,
 *   Performance). The ApplicationEventBus is for business domains. They MUST
 *   NEVER be merged or reused interchangeably.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure event modeling for the Application Layer.
 */

import type { CmsId, Timestamp } from '../domain/types';

// ---------------------------------------------------------------------------
// Domain Event Envelope
// ---------------------------------------------------------------------------

/**
 * The UNIVERSAL DomainEvent envelope.
 *
 * Every DomainEvent published by the Application Layer conforms to this strict
 * envelope. It is the single, stable contract that decouples the Application
 * Service (publisher) from the Subscribers (side-effects).
 *
 * The envelope is IMMUTABLE and DEEP-FROZEN before delivery, guaranteeing that
 * a subscriber can never corrupt the event for other subscribers.
 */
export interface DomainEvent {
  /** The UNIQUE event id (stable identity for replay/dedup). */
  readonly eventId: CmsId;
  /** The semantic event type (e.g. "project.published"). */
  readonly eventType: string;
  /** When the event occurred (ISO-8601). */
  readonly occurredAt: Timestamp;
  /** The id of the aggregate the event belongs to (e.g. projectId). */
  readonly aggregateId: CmsId;
  /**
   * The business payload of the event.
   *
   * The payload is a structured, immutable object. Subscribers narrow it to a
   * concrete payload type based on the eventType. It is typed as `unknown` to
   * preserve type safety while allowing any structured payload shape.
   */
  readonly payload: Readonly<unknown>;
  /** Optional metadata (correlation, causation, actor, etc.). */
  readonly metadata: Readonly<Record<string, unknown>>;

}

// ---------------------------------------------------------------------------
// Application Event Bus
// ---------------------------------------------------------------------------

/**
 * A subscriber to Application Events.
 *
 * A subscriber is a pure side-effect handler: it receives a DomainEvent and
 * reacts (e.g. send a webhook, index search, notify). It MUST NOT mutate the
 * event. It MUST NOT publish new Application Events (only the Application
 * Service publishes).
 */
export type ApplicationEventSubscriber = (event: DomainEvent) => void;

/**
 * The ApplicationEventBus contract.
 *
 * This is the STRICTLY SEGREGATED bus for business domain events. It is NOT
 * the RuntimeEventBus. The Application Layer publishes; isolated Subscribers
 * react.
 */
export interface ApplicationEventBus {
  /**
   * Publishes a DomainEvent to all subscribers.
   *
   * The event is deep-frozen before delivery. Subscribers are isolated: a
   * throwing subscriber does not prevent other subscribers from receiving the
   * event (fail-open).
   */
  publish(event: DomainEvent): void;
  /**
   * Subscribes to Application Events.
   *
   * @param subscriber The subscriber function.
   * @returns An unsubscribe function.
   */
  subscribe(subscriber: ApplicationEventSubscriber): () => void;
  /** Removes all subscribers. */
  clear(): void;
}
