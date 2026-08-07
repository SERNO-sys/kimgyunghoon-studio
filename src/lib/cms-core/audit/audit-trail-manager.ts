/**
 * AWIE V2 - Phase 12 M2: CMS Core - AuditTrailManager.
 *
 * MANDATE 2: Audit Trail & Version Snapshots.
 *
 * The AuditTrailManager records immutable AuditRecords for every Command
 * execution. Each AuditRecord includes a commandHash (a deterministic hash of
 * the command payload) alongside the patch summary for strict auditing.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * This module is PURE APPLICATION INFRASTRUCTURE. It records immutable audit
 * records. It contains NO rendering and NO runtime execution.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure for the Application Layer.
 */

import type { CmsId, Timestamp } from '../domain/types';
import type { Command } from '../commands/types';
import type { ThemePatch } from '../patch/types';
import type { AuditRecord } from './types';

/**
 * Computes a deterministic hash of a command payload.
 *
 * The hash is a stable string derived from the command's stable fields. It is
 * used for strict auditing: any tampering with the command payload after
 * execution can be detected by recomputing the hash and comparing.
 *
 * @param command The command to hash.
 * @returns A deterministic hash string.
 */
export function hashCommand(command: Command): string {
  const payload = JSON.stringify({
    type: command.type,
    commandId: command.commandId,
    projectId: command.projectId,
    actorId: command.actorId,
    createdAt: command.createdAt,
  });
  // A simple deterministic FNV-1a hash over the serialized payload.
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `cmd-${(hash >>> 0).toString(16)}`;
}

/**
 * The AuditTrailManager.
 *
 * Records immutable AuditRecords for Command executions and provides read access
 * to the audit trail. AuditRecords are NEVER mutated after creation.
 */
export class AuditTrailManager {
  /** The ordered audit trail. */
  private readonly records: AuditRecord[] = [];

  /**
   * Records an AuditRecord for a Command execution.
   *
   * @param params The audit record parameters.
   * @returns The immutable AuditRecord.
   */
  record(params: {
    command: Command;
    patch: ThemePatch;
    executedAt?: Timestamp;
  }): AuditRecord {
    const record: AuditRecord = {
      id: `audit-${params.command.commandId}`,
      commandId: params.command.commandId,
      commandType: params.command.type,
      commandHash: hashCommand(params.command),
      projectId: params.command.projectId,
      actorId: params.command.actorId,
      patchSummary: this.summarizePatch(params.patch),
      executedAt: params.executedAt ?? new Date().toISOString(),
    };
    this.records.push(record);
    return record;
  }

  /**
   * Returns the full audit trail (oldest first).
   */
  all(): readonly AuditRecord[] {
    return this.records;
  }

  /**
   * Returns the audit records for a specific Project.
   *
   * @param projectId The Project id.
   */
  forProject(projectId: CmsId): readonly AuditRecord[] {
    return this.records.filter((record) => record.projectId === projectId);
  }

  /**
   * Summarizes a ThemePatch into a compact, human-readable string.
   *
   * @param patch The ThemePatch to summarize.
   * @returns A compact summary of the patch operations.
   */
  private summarizePatch(patch: ThemePatch): string {
    const ops = patch.operations
      .map((entry) => `${entry.op}:${entry.path}`)
      .join(', ');
    return `[${patch.id}] ${ops}`;
  }
}
