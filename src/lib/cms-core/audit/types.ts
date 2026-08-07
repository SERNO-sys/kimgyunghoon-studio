/**
 * AWIE V2 - Phase 12 M2: CMS Core - Audit Types.
 *
 * MANDATE 2: Audit Trail & Version Snapshots.
 *
 * The AuditRecord MUST include a commandHash (hash of the command payload)
 * alongside the patch summary for strict auditing. When a PublishProjectCommand
 * is executed, the resulting VersionSnapshot MUST explicitly include the
 * schemaVersion (e.g. "v2.0") to integrate securely with the Phase 11 Migration
 * Pipeline.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION DATA MODELING. It defines the shape of an
 * AuditRecord. It contains NO rendering and NO runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data modeling for the Application Layer.
 */

import type { CmsId, Timestamp } from '../domain/types';

/**
 * An immutable Audit Record.
 *
 * An AuditRecord is a permanent, immutable record of a Command execution. It
 * captures WHO did WHAT, WHEN, and the resulting patch summary. It is NEVER
 * mutated after creation.
 */
export interface AuditRecord {
  /** The stable audit record id. */
  readonly id: CmsId;
  /** The id of the Command that was executed. */
  readonly commandId: CmsId;
  /** The type of the Command that was executed. */
  readonly commandType: string;
  /**
   * The hash of the command payload.
   *
   * MANDATE 2: The commandHash is a deterministic hash of the command payload.
   * It enables strict auditing: any tampering with the command payload after
   * execution can be detected by recomputing the hash and comparing.
   */
  readonly commandHash: string;
  /** The id of the Project the command targeted. */
  readonly projectId: CmsId;
  /** The id of the user who executed the command. */
  readonly actorId: CmsId;
  /** A summary of the patch produced by the command. */
  readonly patchSummary: string;
  /** When the command was executed. */
  readonly executedAt: Timestamp;
}
