/**
 * AWIE V2 - Phase J.2: Operations & Observability - AuditLogRepository.
 *
 * A DURABLE Audit Trail adapter backed by Cloudflare D1. The audit log records
 * WHO performed critical Delivery actions (Publish / Rollback / Deployment) and
 * WHEN, for non-repudiation and observability.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. DURABLE PERSISTENCE (APPROVED MODIFICATION)
 *      The audit trail MUST persist to D1 (not in-memory) so it survives HMR
 *      and stateless edge terminations. This guarantees true observability and
 *      non-repudiation.
 *
 *   2. D1 IS RESOLVED LAZILY, PER CALL
 *      D1 is a REQUEST-SCOPED binding (`getRequestContext().env.DB`). It is NOT
 *      available at module-load time. This adapter therefore resolves the D1
 *      binding INSIDE each method call, never in the constructor.
 *
 *   3. IN-MEMORY FALLBACK (DEVELOPMENT PARITY)
 *      When no D1 binding is available (e.g. plain `next dev` without a
 *      Cloudflare request context), the adapter transparently delegates to an
 *      in-memory store. This preserves behavior in every environment.
 *
 *   4. IMMUTABLE, APPEND-ONLY RECORDS
 *      Audit records are NEVER mutated after creation. There is no UPDATE path.
 *      The table is append-only.
 *
 *   5. PURE INFRASTRUCTURE
 *      This adapter is pure server-side infrastructure. It NEVER renders, NEVER
 *      decides, and NEVER touches ThemeConfig. It is Application-layer
 *      bookkeeping only.
 *
 *   6. SECRET MASKING CHOKE POINT (Phase J.3)
 *      The repository is the FINAL defense line for secret masking. Every
 *      record is passed through the `maskSecrets` boundary INSIDE `record()`
 *      before it is persisted. API keys, cookies, tokens, and signatures are
 *      NEVER written to the durable audit trail, regardless of what a caller
 *      passes in. This is enforced at the single write choke point, not
 *      scattered across call sites.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import { getRequestContext } from '@cloudflare/next-on-pages';

import { maskSecrets } from '@/lib/security';


/**
 * A single durable audit record.
 *
 * Immutable after creation. Captures WHO (actorId) did WHAT (action) to WHICH
 * project (projectId), WHEN (createdAt), with a commandHash for non-repudiation.
 */
export interface AuditLogEntry {
  /** The stable audit record id. */
  readonly id: string;
  /** The id of the Project (Site) the action targeted. */
  readonly projectId: string;
  /** The id of the user who performed the action. */
  readonly actorId: string;
  /** The action performed (e.g. "publish", "rollback", "deployment"). */
  readonly action: string;
  /** A deterministic hash of the command payload for non-repudiation. */
  readonly commandHash: string;
  /** Optional human-readable detail (e.g. version, snapshot id). */
  readonly detail: string;
  /** When the action was performed (ISO-8601). */
  readonly createdAt: string;
}

/**
 * The D1 row shape for an AuditLogEntry.
 */
interface AuditLogRow {
  id: string;
  project_id: string;
  actor_id: string;
  action: string;
  command_hash: string;
  detail: string;
  created_at: string;
}

/**
 * The AuditLogRepository.
 *
 * Persists immutable AuditLogEntries to D1 (durable) with an in-memory fallback
 * for development parity. It is a plain persistence container. It NEVER renders
 * and NEVER decides.
 */
export class AuditLogRepository {
  /** The in-memory fallback used when no D1 binding is available. */
  private readonly memory: AuditLogEntry[] = [];

  /**
   * Resolves the D1 binding for the current request, or undefined when not
   * running inside a Cloudflare request context (e.g. plain `next dev`).
   *
   * @returns The D1 binding, or undefined if unavailable.
   */
  private resolveD1(): D1Database | undefined {
    try {
      const env = getRequestContext().env as { DB?: D1Database };
      return env.DB;
    } catch {
      // Not running inside a Cloudflare Pages/Workers request context.
      return undefined;
    }
  }

  /**
   * Serializes an AuditLogEntry into its D1 row shape.
   *
   * @param entry The immutable audit entry to serialize.
   * @returns The D1 row shape.
   */
  private toRow(entry: AuditLogEntry): AuditLogRow {
    return {
      id: entry.id,
      project_id: entry.projectId,
      actor_id: entry.actorId,
      action: entry.action,
      command_hash: entry.commandHash,
      detail: entry.detail,
      created_at: entry.createdAt,
    };
  }

  /**
   * Deserializes a D1 row back into an AuditLogEntry.
   *
   * @param row The D1 row shape.
   * @returns The immutable audit entry.
   */
  private fromRow(row: AuditLogRow): AuditLogEntry {
    return {
      id: row.id,
      projectId: row.project_id,
      actorId: row.actor_id,
      action: row.action,
      commandHash: row.command_hash,
      detail: row.detail,
      createdAt: row.created_at,
    };
  }

  /**
   * Masks secret-bearing content inside the `detail` field.
   *
   * The `detail` field is a string. It may be a JSON-serialized structured
   * object (the common case from `recordSecurityEvent`) or a plain string. This
   * helper parses JSON detail, runs it through `maskSecrets`, and re-serializes
   * it. Plain strings are passed through `maskSecrets` directly. This is the
   * FINAL defense line: even if a caller passes unmasked secret-bearing detail,
   * it is redacted here before it is persisted.
   *
   * @param detail The raw detail string to sanitize.
   * @returns The masked detail string.
   */
  private maskDetail(detail: string): string {
    if (typeof detail !== 'string' || detail.length === 0) return detail;
    try {
      const parsed: unknown = JSON.parse(detail);
      return JSON.stringify(maskSecrets(parsed));
    } catch {
      // Not JSON — treat as a plain string and mask it directly.
      return String(maskSecrets(detail));
    }
  }

  /**
   * Records an immutable AuditLogEntry.
   *
   * SECURITY BOUNDARY: The `detail` field is passed through `maskSecrets`
   * BEFORE it is persisted. Any secret-bearing content (apiKey, token, cookie,
   * password, signature, etc.) is replaced with `[REDACTED]`. This guarantees
   * that secrets are NEVER written to the durable audit trail, regardless of
   * what a caller passes in.
   *
   * The entry is append-only and NEVER mutated after creation.
   *
   * @param entry The immutable audit entry to persist.
   */
  async record(entry: AuditLogEntry): Promise<void> {
    const d1 = this.resolveD1();
    if (!d1) {
      this.memory.push({
        ...entry,
        detail: this.maskDetail(entry.detail),
      });
      return;
    }

    const row = this.toRow({
      ...entry,
      detail: this.maskDetail(entry.detail),
    });
    await d1
      .prepare(
        `INSERT INTO audit_log
          (id, project_id, actor_id, action, command_hash, detail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.id,
        row.project_id,
        row.actor_id,
        row.action,
        row.command_hash,
        row.detail,
        row.created_at,
      )
      .run();
  }


  /**
   * Returns the audit trail for a specific Project, newest first.
   *
   * @param projectId The Project (Site) id.
   */
  async forProject(projectId: string): Promise<AuditLogEntry[]> {
    const d1 = this.resolveD1();
    if (!d1) {
      return this.memory
        .filter((entry) => entry.projectId === projectId)
        .slice()
        .reverse();
    }

    const { results } = await d1
      .prepare(
        `SELECT * FROM audit_log
         WHERE project_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(projectId)
      .all<AuditLogRow>();

    return results.map((row) => this.fromRow(row));
  }

  /**
   * Returns the full audit trail, newest first.
   */
  async all(): Promise<AuditLogEntry[]> {
    const d1 = this.resolveD1();
    if (!d1) {
      return this.memory.slice().reverse();
    }

    const { results } = await d1
      .prepare(`SELECT * FROM audit_log ORDER BY created_at DESC`)
      .all<AuditLogRow>();

    return results.map((row) => this.fromRow(row));
  }
}
