/**
 * AWIE V2 - Phase 12 M3: CMS Core - Application Events barrel export.
 *
 * Re-exports the Application Event modeling: the UNIVERSAL DomainEvent
 * envelope, the ApplicationEventBus contract + implementation, the concrete
 * DomainEvent factories, and the decoupled Subscribers (side-effects).
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

export type {
  ApplicationEventBus,
  ApplicationEventSubscriber,
  DomainEvent,
} from './types';

export { DefaultApplicationEventBus } from './application-event-bus';


export {
  createHeadingUpdatedEvent,
  createProjectPublishedEvent,
  createProjectReleasedEvent,
  HEADING_UPDATED_EVENT,
  PROJECT_PUBLISHED_EVENT,
  PROJECT_RELEASED_EVENT,
} from './domain-events';
export type {
  HeadingUpdatedPayload,
  ProjectPublishedPayload,
  ProjectReleasedPayload,
} from './domain-events';


export {
  MockWebhookSubscriber,
  SearchIndexSubscriber,
  WebhookNotificationSubscriber,
} from './subscribers';
