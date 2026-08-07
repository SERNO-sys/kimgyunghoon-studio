/**
 * AWIE V2 - Phase 12: CMS Core - Domain barrel export.
 *
 * Re-exports the CMS Domain models: the Organization -> Workspace -> Project
 * hierarchy, the Project lifecycle state machine, and the RBAC permission
 * model.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling for the Application Layer.
 */

export type {
  CmsId,
  CmsRole,
  CmsCapability,
  Organization,
  Project,
  ProjectLifecycle,
  Timestamp,
  Workspace,
  WorkspaceMembership,
} from './types';

export {
  can,
  canTransition,
  CAPABILITY_MIN_ROLE,
  LIFECYCLE_ORDER,
  ROLE_ORDER,
} from './types';
