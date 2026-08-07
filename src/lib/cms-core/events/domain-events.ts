/**
 * AWIE V2 - Phase 12 M3: CMS Core - Domain Event Factories.
 *
 * Concrete DomainEvent factories for the Application Layer. Each factory
 * produces a fully-formed DomainEvent conforming to the strict envelope:
 *   { eventId, eventType, occurredAt, aggregateId, payload, metadata }
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The Application Layer is the SOLE publisher of these events. The Runtime
 * MUST NEVER publish Application Events.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure event modeling for the Application Layer.
 */

import type { CmsId, Timestamp } from '../domain/types';
import type { DomainEvent } from './types';

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/** The stable event type for a Project being published. */
export const PROJECT_PUBLISHED_EVENT = 'project.published';

/** The stable event type for a Project snapshot being released (made Live). */
export const PROJECT_RELEASED_EVENT = 'project.released';

/** The stable event type for a section heading being updated. */
export const HEADING_UPDATED_EVENT = 'content.heading-updated';


// ---------------------------------------------------------------------------
// ProjectPublished
// ---------------------------------------------------------------------------

/**
 * The payload of a ProjectPublished event.
 */
export interface ProjectPublishedPayload {
  /** The id of the published Project. */
  readonly projectId: CmsId;
  /** The id of the VersionSnapshot created on publish. */
  readonly snapshotId: CmsId;
  /** The id of the ThemeConfig that was published. */
  readonly themeConfigId: CmsId;
  /** The id of the user who published. */
  readonly publishedBy: CmsId;
}

/**
 * Creates a ProjectPublished DomainEvent.
 *
 * @param params The event parameters.
 * @returns A fully-formed ProjectPublished DomainEvent.
 */
export function createProjectPublishedEvent(params: {
  eventId: CmsId;
  projectId: CmsId;
  snapshotId: CmsId;
  themeConfigId: CmsId;
  publishedBy: CmsId;
  occurredAt?: Timestamp;
  metadata?: Readonly<Record<string, unknown>>;
}): DomainEvent {
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const payload: ProjectPublishedPayload = {
    projectId: params.projectId,
    snapshotId: params.snapshotId,
    themeConfigId: params.themeConfigId,
    publishedBy: params.publishedBy,
  };
  return {
    eventId: params.eventId,
    eventType: PROJECT_PUBLISHED_EVENT,
    occurredAt,
    aggregateId: params.projectId,
    payload,
    metadata: params.metadata ?? {},
  };
}


// ---------------------------------------------------------------------------
// ProjectReleased
// ---------------------------------------------------------------------------

/**
 * The payload of a ProjectReleased event.
 */
export interface ProjectReleasedPayload {
  /** The id of the released Project. */
  readonly projectId: CmsId;
  /** The id of the VersionSnapshot designated as the Live version. */
  readonly snapshotId: CmsId;
  /** The id of the ThemeConfig that was released. */
  readonly themeConfigId: CmsId;
  /** The id of the user who released. */
  readonly releasedBy: CmsId;
}

/**
 * Creates a ProjectReleased DomainEvent.
 *
 * @param params The event parameters.
 * @returns A fully-formed ProjectReleased DomainEvent.
 */
export function createProjectReleasedEvent(params: {
  eventId: CmsId;
  projectId: CmsId;
  snapshotId: CmsId;
  themeConfigId: CmsId;
  releasedBy: CmsId;
  occurredAt?: Timestamp;
  metadata?: Readonly<Record<string, unknown>>;
}): DomainEvent {
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const payload: ProjectReleasedPayload = {
    projectId: params.projectId,
    snapshotId: params.snapshotId,
    themeConfigId: params.themeConfigId,
    releasedBy: params.releasedBy,
  };
  return {
    eventId: params.eventId,
    eventType: PROJECT_RELEASED_EVENT,
    occurredAt,
    aggregateId: params.projectId,
    payload,
    metadata: params.metadata ?? {},
  };
}


// ---------------------------------------------------------------------------
// HeadingUpdated
// ---------------------------------------------------------------------------


/**
 * The payload of a HeadingUpdated event.
 */
export interface HeadingUpdatedPayload {
  /** The id of the Project. */
  readonly projectId: CmsId;
  /** The id of the section whose heading changed. */
  readonly sectionId: CmsId;
  /** The new heading value. */
  readonly heading: string;
  /** The id of the user who made the change. */
  readonly editedBy: CmsId;
}

/**
 * Creates a HeadingUpdated DomainEvent.
 *
 * @param params The event parameters.
 * @returns A fully-formed HeadingUpdated DomainEvent.
 */
export function createHeadingUpdatedEvent(params: {
  eventId: CmsId;
  projectId: CmsId;
  sectionId: CmsId;
  heading: string;
  editedBy: CmsId;
  occurredAt?: Timestamp;
  metadata?: Readonly<Record<string, unknown>>;
}): DomainEvent {
  const occurredAt = params.occurredAt ?? new Date().toISOString();
  const payload: HeadingUpdatedPayload = {
    projectId: params.projectId,
    sectionId: params.sectionId,
    heading: params.heading,
    editedBy: params.editedBy,
  };
  return {
    eventId: params.eventId,
    eventType: HEADING_UPDATED_EVENT,
    occurredAt,
    aggregateId: params.projectId,
    payload,
    metadata: params.metadata ?? {},
  };
}
