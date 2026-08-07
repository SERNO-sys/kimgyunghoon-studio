/**
 * AWIE V2 - Phase 12 M2: CMS Core - Ports barrel export.
 *
 * MANDATE 3: Aggregate-Centric Persistence Ports.
 *
 * Re-exports the pure persistence Ports the Application Layer depends on. These
 * are PURE INTERFACES with use-case-driven methods (saveProject, publish,
 * archive) rather than generic CRUD.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is a
 * pure contract for the Application Layer.
 */

export type { ProjectRepository } from './project-repository';
