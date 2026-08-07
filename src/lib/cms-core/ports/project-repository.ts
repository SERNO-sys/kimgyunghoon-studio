/**
 * AWIE V2 - Phase 12 M2: CMS Core - ProjectRepository Port.
 *
 * MANDATE 3: Aggregate-Centric Persistence Ports.
 *
 * Define pure TypeScript interfaces for data access focused on Aggregates
 * (e.g., ProjectRepository). Do NOT create fine-grained config repositories
 * like ThemeConfigRepository at the App layer.
 *
 * Use Use-Case-driven methods (e.g., saveProject(), publish(), archive()) rather
 * than generic CRUD.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * A Port is a PURE INTERFACE. It declares the data-access contract the
 * Application Layer depends on. It contains NO implementation and NO business
 * logic. Concrete adapters (e.g., a D1 adapter) implement this interface.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Application Layer.
 */

import type { CmsId, Project, ProjectLifecycle } from '../domain/types';
import type { VersionSnapshot } from '../patch/types';

/**
 * The ProjectRepository port.
 *
 * An aggregate-centric persistence contract for the Project aggregate. Methods
 * are USE-CASE-DRIVEN (saveProject, publish, archive) rather than generic CRUD.
 * This keeps the Application Layer focused on intent, not on low-level data
 * access.
 *
 * A concrete adapter (e.g., a D1 or in-memory adapter) implements this
 * interface. The Application Layer depends ONLY on this interface.
 */
export interface ProjectRepository {
  /**
   * Loads a Project aggregate by id.
   *
   * @param projectId The Project id.
   * @returns The Project aggregate, or undefined if not found.
   */
  loadProject(projectId: CmsId): Promise<Project | undefined>;

  /**
   * Saves a Project aggregate.
   *
   * This is a use-case-driven save: it persists the entire Project aggregate
   * (including its current ThemeConfig and lifecycle state).
   *
   * @param project The Project aggregate to save.
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Publishes a Project.
   *
   * MANDATE 1 (Phase 12.6): Publishing FREEZES the current Draft into an
   * immutable VersionSnapshot. It does NOT make the snapshot live. This is a
   * use-case-driven method: it persists the immutable VersionSnapshot created
   * at publish time.
   *
   * @param projectId The Project id.
   * @param snapshot The immutable VersionSnapshot created at publish time.
   */
  publish(projectId: CmsId, snapshot: VersionSnapshot): Promise<void>;

  /**
   * Releases a Project snapshot.
   *
   * MANDATE 1 (Phase 12.6): Releasing designates a SPECIFIC VersionSnapshot as
   * the active "Live" version. This is decoupled from Publish: a Project may
   * have many Published snapshots, but only ONE Released (Live) snapshot at a
   * time. This enables Scheduled Releases, Stage environments, and Blue/Green
   * deployments.
   *
   * MANDATE 2 (Phase 12.6): Releasing UPDATES the Project's Current Release
   * Pointer to point at the given snapshot id. The pointer is the single,
   * mutable "live" designation. It is separate from the immutable snapshot
   * itself, which enables INSTANT ROLLBACKS: to roll back, simply point the
   * pointer at a previous snapshot id.
   *
   * @param projectId The Project id.
   * @param snapshotId The id of the VersionSnapshot to designate as Live.
   */
  release(projectId: CmsId, snapshotId: CmsId): Promise<void>;

  /**
   * Loads the Project's Current Release Pointer.
   *
   * MANDATE 2 (Phase 12.6): The Release Pointer is the single, mutable
   * designation of which VersionSnapshot is currently "Live". It is a thin
   * pointer (just a snapshot id), NOT the snapshot itself. This explicitly
   * separates the act of creating a snapshot (Publish) from designating it as
   * live (Release).
   *
   * The Delivery Layer (Public Serve API) queries this pointer FIRST, then
   * resolves the pointer to the actual VersionSnapshot. This enables instant
   * rollbacks: to roll back, the pointer is simply re-pointed at a previous
   * snapshot id.
   *
   * @param projectId The Project id.
   * @returns The id of the currently Released (Live) VersionSnapshot, or
   *          undefined if no snapshot has been released yet.
   */
  loadReleasePointer(projectId: CmsId): Promise<CmsId | undefined>;

  /**
   * Loads the currently Released (Live) VersionSnapshot for a Project.
   *
   * MANDATE 2 (Phase 12.6): The Delivery Layer (Public Serve API) uses this to
   * load the Released Snapshot and render it. It returns undefined if no
   * snapshot has been released yet.
   *
   * @param projectId The Project id.
   * @returns The Released VersionSnapshot, or undefined if none is Live.
   */
  loadReleasedSnapshot(projectId: CmsId): Promise<VersionSnapshot | undefined>;


  /**
   * Archives a Project.
   *
   * This is a use-case-driven method: it transitions the Project to the
   * Archived lifecycle state.
   *
   * @param projectId The Project id.
   */
  archive(projectId: CmsId): Promise<void>;

  /**
   * Loads the current lifecycle state of a Project.
   *
   * @param projectId The Project id.
   * @returns The current lifecycle state, or undefined if not found.
   */
  loadLifecycle(projectId: CmsId): Promise<ProjectLifecycle | undefined>;
}


