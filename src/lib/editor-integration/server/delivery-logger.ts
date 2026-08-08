/**
 * AWIE V2 - Phase J.2: Operations & Observability - DeliveryLogger.
 *
 * A structured, JSON-lines logger for the Delivery Layer. It emits a single
 * JSON object per line to stdout, enabling machine-parseable observability
 * without any third-party agent.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. PURE INFRASTRUCTURE
 *      The logger is pure infrastructure. It NEVER contains business logic,
 *      NEVER mutates ThemeConfig, and NEVER renders UI.
 *
 *   2. STRUCTURED OUTPUT
 *      Every log line is a single JSON object with a stable shape:
 *        { ts, level, service, event, projectId?, actorId?, durationMs?, ...fields }
 *      This is machine-parseable and greppable.
 *
 *   3. THIN WRAPPER
 *      The logger is a thin wrapper over the platform's stdout. It does NOT
 *      introduce a new logging framework. It is replaceable in one week.
 *
 *   4. NO BUSINESS DECISIONS
 *      The logger records WHAT happened. It NEVER decides whether something is
 *      good or bad, and NEVER evaluates business meaning.
 *
 *   5. SECRET MASKING (Phase J.3)
 *      Every structured entry is passed through the `maskSecrets` boundary
 *      before it is written to stdout. API keys, cookies, tokens, and
 *      signatures are NEVER printed in the structured logs. This is enforced at
 *      the single log choke point, not scattered across call sites.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import { maskSecrets } from '@/lib/security';

/**
 * The severity level of a log entry.
 */
export type DeliveryLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * The stable shape of a structured log entry.
 */
export interface DeliveryLogEntry {
  /** The ISO-8601 timestamp. */
  readonly ts: string;
  /** The severity level. */
  readonly level: DeliveryLogLevel;
  /** The emitting service (e.g. "delivery.publish"). */
  readonly service: string;
  /** The event name (e.g. "publish.completed"). */
  readonly event: string;
  /** The id of the Project (Site) the event relates to, if any. */
  readonly projectId?: string;
  /** The id of the user who triggered the event, if any. */
  readonly actorId?: string;
  /** The duration of the operation in milliseconds, if measured. */
  readonly durationMs?: number;
  /** Additional structured fields. */
  readonly fields?: Readonly<Record<string, unknown>>;
}

/**
 * The DeliveryLogger.
 *
 * Emits structured JSON-lines to stdout. It is a thin, replaceable wrapper. It
 * NEVER decides and NEVER mutates.
 */
export class DeliveryLogger {
  /** The output writer (injectable for tests). */
  private readonly out: (line: string) => void;
  /** The clock used to timestamp entries. */
  private readonly now: () => string;

  /**
   * Constructs a DeliveryLogger.
   *
   * @param out An optional output writer (defaults to console.log).
   * @param now An optional clock (defaults to new Date().toISOString()).
   */
  constructor(
    out: (line: string) => void = (line) => console.log(line),
    now: () => string = () => new Date().toISOString(),
  ) {
    this.out = out;
    this.now = now;
  }

  /**
   * Emits a structured log entry as a single JSON line.
   *
   * SECURITY BOUNDARY: The entry is passed through `maskSecrets` BEFORE it is
   * serialized. Any secret-bearing field (apiKey, token, cookie, password,
   * signature, etc.) is replaced with `[REDACTED]`. This guarantees that
   * secrets are NEVER printed in the structured logs, regardless of what a
   * caller passes in.
   *
   * @param entry The structured log entry to emit.
   */
  private emit(entry: DeliveryLogEntry): void {
    this.out(JSON.stringify(maskSecrets(entry)));
  }

  /**
   * Emits a debug-level entry.
   *
   * @param service The emitting service.
   * @param event The event name.
   * @param fields Optional structured fields.
   */
  debug(
    service: string,
    event: string,
    fields?: Omit<DeliveryLogEntry, 'ts' | 'level' | 'service' | 'event'>,
  ): void {
    this.emit({ ts: this.now(), level: 'debug', service, event, ...fields });
  }

  /**
   * Emits an info-level entry.
   *
   * @param service The emitting service.
   * @param event The event name.
   * @param fields Optional structured fields.
   */
  info(
    service: string,
    event: string,
    fields?: Omit<DeliveryLogEntry, 'ts' | 'level' | 'service' | 'event'>,
  ): void {
    this.emit({ ts: this.now(), level: 'info', service, event, ...fields });
  }

  /**
   * Emits a warn-level entry.
   *
   * @param service The emitting service.
   * @param event The event name.
   * @param fields Optional structured fields.
   */
  warn(
    service: string,
    event: string,
    fields?: Omit<DeliveryLogEntry, 'ts' | 'level' | 'service' | 'event'>,
  ): void {
    this.emit({ ts: this.now(), level: 'warn', service, event, ...fields });
  }

  /**
   * Emits an error-level entry.
   *
   * @param service The emitting service.
   * @param event The event name.
   * @param fields Optional structured fields.
   */
  error(
    service: string,
    event: string,
    fields?: Omit<DeliveryLogEntry, 'ts' | 'level' | 'service' | 'event'>,
  ): void {
    this.emit({ ts: this.now(), level: 'error', service, event, ...fields });
  }
}
