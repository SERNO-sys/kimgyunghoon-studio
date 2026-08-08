/**
 * AWIE V2 - Phase 12: CMS Core - Application Platform barrel export.
 *
 * The CMS Core is the Application Layer built ON TOP of the Runtime. It is a
 * strict Application Layer, NOT a simple CRUD application.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * Sub-modules:
 *   - domain/    - Organization -> Workspace -> Project hierarchy, lifecycle,
 *                 and RBAC permissions.
 *   - commands/  - The Command-Based Application Layer (Command, Handler,
 *                 EditorService executor).
 *   - patch/     - The immutable ThemePatch pipeline and VersionSnapshot
 *                 contract.
 *   - history/   - Command Identification & Inverse Patches (Undo/Redo).
 *   - audit/     - Audit Trail & Version Snapshots (commandHash + schemaVersion).
 *   - ports/     - Aggregate-Centric Persistence Ports (ProjectRepository).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure Application Layer modeling + orchestration.
 */


// Domain (MANDATE 1).
export type {
  CmsCapability,
  CmsId,
  CmsRole,
  Organization,
  Project,
  ProjectLifecycle,
  Timestamp,
  Workspace,
  WorkspaceMembership,
} from './domain';
export {
  can,
  canTransition,
  CAPABILITY_MIN_ROLE,
  LIFECYCLE_ORDER,
  ROLE_ORDER,
} from './domain';

// Commands (MANDATE 2).
export type {
  Command,
  CommandHandler,
  CommandResult,
  CommandType,
  DeleteComponentCommand,
  InsertComponentCommand,
  MoveComponentCommand,
  PublishProjectCommand,
  ReleaseProjectCommand,
  UpdateComponentCommand,
  UpdateHeadingCommand,
} from './commands';
export {
  createDeleteComponentCommand,
  createInsertComponentCommand,
  createMoveComponentCommand,
  createPublishProjectCommand,
  createReleaseProjectCommand,
  createUpdateComponentCommand,
  createUpdateHeadingCommand,
  DeleteComponentHandler,
  DELETE_COMPONENT_COMMAND,
  EditorService,
  InsertComponentHandler,
  INSERT_COMPONENT_COMMAND,
  MoveComponentHandler,
  MOVE_COMPONENT_COMMAND,
  PublishProjectHandler,
  PUBLISH_PROJECT_COMMAND,
  ReleaseProjectHandler,
  RELEASE_PROJECT_COMMAND,
  UpdateComponentHandler,
  UPDATE_COMPONENT_COMMAND,
  UpdateHeadingHandler,
  UPDATE_HEADING_COMMAND,
} from './commands';





// Patch (MANDATE 3).
export type {
  ThemePatch,
  ThemePatchEntry,
  ThemePatchOperation,
  VersionSnapshot,
} from './patch';
export { ThemePatchPipeline } from './patch';

// History (MANDATE 1: Command Identification & Inverse Patches).
export type { HistoryEntry, InversePatch } from './history';
export {
  CommandHistoryManager,
  InversePatchGenerator,
} from './history';

// Audit (MANDATE 2: Audit Trail & Version Snapshots).
export type { AuditRecord } from './audit';
export { AuditTrailManager, hashCommand } from './audit';

// Ports (MANDATE 3: Aggregate-Centric Persistence Ports).
export type { ProjectRepository } from './ports';

// Events (MANDATE 4: Application Events - DomainEvent envelope + decoupled
// subscribers). STRICTLY SEGREGATED from the RuntimeEventBus (Phase 11).
export type {
  ApplicationEventBus,
  ApplicationEventSubscriber,
  DomainEvent,
  HeadingUpdatedPayload,
  ProjectPublishedPayload,
  ProjectReleasedPayload,
} from './events';
export {
  createHeadingUpdatedEvent,
  createProjectPublishedEvent,
  createProjectReleasedEvent,
  DefaultApplicationEventBus,
  HEADING_UPDATED_EVENT,
  MockWebhookSubscriber,
  PROJECT_PUBLISHED_EVENT,
  PROJECT_RELEASED_EVENT,
  SearchIndexSubscriber,
  WebhookNotificationSubscriber,
} from './events';




