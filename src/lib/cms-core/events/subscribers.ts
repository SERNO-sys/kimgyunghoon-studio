/**
 * AWIE V2 - Phase 12 M3: CMS Core - Decoupled Subscribers (Side-Effects).
 *
 * The Application Service (e.g. EditorService) MUST NOT directly invoke
 * side-effects like Emails, Webhooks, Notifications, Search Indexing, or
 * Business Analytics. It merely emits a DomainEvent after a successful Command
 * execution.
 *
 * These isolated Subscribers listen to the ApplicationEventBus and react to
 * the events. They are the ONLY place side-effects live. This decoupling
 * guarantees that the Application Service stays pure orchestration and that a
 * failing side-effect can never break the Command execution.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: These subscribers MUST NOT contain business logic. They
 * are pure side-effect handlers for the Application Layer.
 */

import type { ApplicationEventSubscriber, DomainEvent } from './types';
import { PROJECT_PUBLISHED_EVENT } from './domain-events';

// ---------------------------------------------------------------------------
// Webhook Notification Subscriber
// ---------------------------------------------------------------------------

/**
 * A subscriber that reacts to ProjectPublished events by dispatching a webhook
 * notification.
 *
 * This is a SIDE-EFFECT handler. It is decoupled from the Application Service:
 * the service only emits the event; this subscriber reacts. It is isolated so
 * that a webhook failure can never break the Command execution.
 */
export class WebhookNotificationSubscriber {
  /** The webhook notifications dispatched (for observability/testing). */
  private readonly dispatched: Array<{ url: string; event: DomainEvent }> = [];

  /**
   * Constructs a WebhookNotificationSubscriber.
   *
   * @param webhookUrl The webhook endpoint to notify.
   */
  constructor(private readonly webhookUrl: string) {}

  /**
   * The subscriber handler. Reacts to ProjectPublished events by dispatching a
   * webhook notification.
   *
   * @param event The DomainEvent.
   */
  readonly handle: ApplicationEventSubscriber = (event) => {
    if (event.eventType !== PROJECT_PUBLISHED_EVENT) {
      return;
    }
    // Side-effect: dispatch a webhook notification. In a real deployment this
    // would POST to the webhookUrl. Here we record the dispatch for
    // observability and testing.
    this.dispatched.push({ url: this.webhookUrl, event });
  };

  /** Returns the webhook notifications dispatched so far. */
  getDispatched(): ReadonlyArray<{ url: string; event: DomainEvent }> {
    return this.dispatched;
  }
}

// ---------------------------------------------------------------------------
// Search Index Subscriber
// ---------------------------------------------------------------------------

/**
 * A subscriber that reacts to ProjectPublished events by indexing the project
 * for search.
 *
 * This is a SIDE-EFFECT handler, decoupled from the Application Service. It is
 * isolated so that a search-indexing failure can never break the Command
 * execution.
 */
export class SearchIndexSubscriber {
  /** The search index entries created (for observability/testing). */
  private readonly indexed: Array<{ projectId: string; event: DomainEvent }> =
    [];

  /**
   * The subscriber handler. Reacts to ProjectPublished events by indexing the
   * project for search.
   *
   * @param event The DomainEvent.
   */
  readonly handle: ApplicationEventSubscriber = (event) => {
    if (event.eventType !== PROJECT_PUBLISHED_EVENT) {
      return;
    }
    const payload = event.payload as { projectId?: string };
    // Side-effect: index the project for search.
    this.indexed.push({
      projectId: payload.projectId ?? event.aggregateId,
      event,
    });
  };

  /** Returns the search index entries created so far. */
  getIndexed(): ReadonlyArray<{ projectId: string; event: DomainEvent }> {
    return this.indexed;
  }
}

// ---------------------------------------------------------------------------
// Mock Webhook Subscriber
// ---------------------------------------------------------------------------

/**
 * A mock subscriber used to PROVE the decoupling is working.
 *
 * It records every DomainEvent it receives. It is used in tests to verify that
 * the Application Service emits events and that subscribers react WITHOUT the
 * service invoking them directly.
 */
export class MockWebhookSubscriber {
  /** The events received by this subscriber. */
  private readonly received: DomainEvent[] = [];

  /**
   * The subscriber handler. Records every event received.
   *
   * @param event The DomainEvent.
   */
  readonly handle: ApplicationEventSubscriber = (event) => {
    this.received.push(event);
  };

  /** Returns the events received so far. */
  getReceived(): ReadonlyArray<DomainEvent> {
    return this.received;
  }
}
