/**
 * AWIE V2 - Phase 12: CMS Core - Domain Types.
 *
 * The CMS Domain models the multi-tenant content structure as a strict
 * hierarchy:
 *
 *   Organization -> Workspace -> Project
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION DOMAIN MODELING. It contains NO rendering,
 * NO caching, and NO runtime execution. It is the Application Layer's SSOT for
 * structure, lifecycle, and permissions.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling for the Application Layer.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** A stable, unique identifier for any CMS entity. */
export type CmsId = string;

/** An ISO-8601 timestamp string. */
export type Timestamp = string;

// ---------------------------------------------------------------------------
// Project Lifecycle
// ---------------------------------------------------------------------------

/**
 * The lifecycle state of a Project.
 *
 * The lifecycle is a STRICT, ordered state machine:
 *
 *   Draft -> Review -> Published -> Archived
 *
 * Transitions are validated by the Application Layer (never the Runtime).
 * A Project may only move forward through the lifecycle; it cannot skip states.
 */
export type ProjectLifecycle =
  | 'draft'
  | 'review'
  | 'published'
  | 'archived';

/** The ordered lifecycle sequence (used for transition validation). */
export const LIFECYCLE_ORDER: readonly ProjectLifecycle[] = [
  'draft',
  'review',
  'published',
  'archived',
];

/**
 * Returns whether a lifecycle transition is valid.
 *
 * A transition is valid only when moving to the NEXT state in the ordered
 * sequence. This enforces the strict Draft -> Review -> Published -> Archived
 * state machine. The Application Layer owns this rule; the Runtime never does.
 */
export function canTransition(
  from: ProjectLifecycle,
  to: ProjectLifecycle,
): boolean {
  const fromIndex = LIFECYCLE_ORDER.indexOf(from);
  const toIndex = LIFECYCLE_ORDER.indexOf(to);
  return toIndex === fromIndex + 1;
}

// ---------------------------------------------------------------------------
// RBAC Roles & Permissions
// ---------------------------------------------------------------------------

/**
 * The RBAC roles in the CMS.
 *
 * The role hierarchy is cumulative:
 *
 *   Viewer < Editor < Publisher < Owner
 *
 *   - viewer    - read-only access to a Project.
 *   - editor    - can edit content (issue content commands).
 *   - publisher - can edit AND publish (transition to published).
 *   - owner     - full control (manage members, archive, delete).
 */
export type CmsRole = 'viewer' | 'editor' | 'publisher' | 'owner';

/** The ordered role hierarchy (used for permission checks). */
export const ROLE_ORDER: readonly CmsRole[] = [
  'viewer',
  'editor',
  'publisher',
  'owner',
];

/**
 * The set of named capabilities a role may exercise.
 *
 * These are the INTENT-LEVEL actions the Application Layer authorizes. They
 * map 1:1 to Command types. The Runtime never evaluates these; the Application
 * Layer does, before a Command is executed.
 */
export type CmsCapability =
  | 'project:read'
  | 'project:edit'
  | 'project:review'
  | 'project:publish'
  | 'project:archive'
  | 'project:delete'
  | 'project:manage-members';

/** The minimum role required to exercise each capability. */
export const CAPABILITY_MIN_ROLE: Readonly<Record<CmsCapability, CmsRole>> = {
  'project:read': 'viewer',
  'project:edit': 'editor',
  'project:review': 'editor',
  'project:publish': 'publisher',
  'project:archive': 'owner',
  'project:delete': 'owner',
  'project:manage-members': 'owner',
};

/**
 * Returns whether a role is permitted to exercise a capability.
 *
 * Permission is granted when the role's rank is >= the capability's minimum
 * required role rank. This is a pure, deterministic function owned by the
 * Application Layer.
 */
export function can(role: CmsRole, capability: CmsCapability): boolean {
  const roleRank = ROLE_ORDER.indexOf(role);
  const requiredRank = ROLE_ORDER.indexOf(CAPABILITY_MIN_ROLE[capability]);
  return roleRank >= requiredRank;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/** A user's membership in a Workspace with a specific role. */
export interface WorkspaceMembership {
  /** The user id. */
  readonly userId: CmsId;
  /** The role granted to the user within the Workspace. */
  readonly role: CmsRole;
  /** When the membership was granted. */
  readonly grantedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

/**
 * The top-level tenant in the CMS hierarchy.
 *
 * An Organization owns one or more Workspaces. It is the root of the
 * multi-tenant structure.
 */
export interface Organization {
  /** The stable organization id. */
  readonly id: CmsId;
  /** The display name of the organization. */
  readonly name: string;
  /** The ids of the Workspaces owned by this Organization. */
  readonly workspaceIds: readonly CmsId[];
  /** When the organization was created. */
  readonly createdAt: Timestamp;
  /** When the organization was last updated. */
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/**
 * A Workspace is a tenant-scoped container within an Organization.
 *
 * A Workspace groups Projects and holds the membership (RBAC) for its users.
 * Permissions are evaluated at the Workspace scope.
 */
export interface Workspace {
  /** The stable workspace id. */
  readonly id: CmsId;
  /** The id of the owning Organization. */
  readonly organizationId: CmsId;
  /** The display name of the workspace. */
  readonly name: string;
  /** The ids of the Projects in this Workspace. */
  readonly projectIds: readonly CmsId[];
  /** The memberships (RBAC) of this Workspace. */
  readonly memberships: readonly WorkspaceMembership[];
  /** When the workspace was created. */
  readonly createdAt: Timestamp;
  /** When the workspace was last updated. */
  readonly updatedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

/**
 * A Project is the unit of content in the CMS.
 *
 * A Project owns a ThemeConfig (the SSOT) and moves through the lifecycle
 * state machine. The Project is the entity that Commands target and that
 * Version Snapshots capture.
 */
export interface Project {
  /** The stable project id. */
  readonly id: CmsId;
  /** The id of the owning Workspace. */
  readonly workspaceId: CmsId;
  /** The display name of the project. */
  readonly name: string;
  /** The current lifecycle state. */
  readonly lifecycle: ProjectLifecycle;
  /** The id of the current ThemeConfig (the SSOT) for this project. */
  readonly themeConfigId: CmsId;
  /** The id of the user who created the project. */
  readonly createdBy: CmsId;
  /** When the project was created. */
  readonly createdAt: Timestamp;
  /** When the project was last updated. */
  readonly updatedAt: Timestamp;
}
