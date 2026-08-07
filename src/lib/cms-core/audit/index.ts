/**
 * AWIE V2 - Phase 12 M2: CMS Core - Audit barrel export.
 *
 * MANDATE 2: Audit Trail & Version Snapshots.
 *
 * Re-exports the Audit subsystem: the AuditRecord contract, the command hash
 * utility, and the AuditTrailManager that records immutable audit records.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

export type { AuditRecord } from './types';

export { AuditTrailManager, hashCommand } from './audit-trail-manager';
