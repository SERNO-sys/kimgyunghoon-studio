/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - StdoutSink.
 *
 * The default Sink that writes structured diagnostic records to stdout. It is
 * the reference implementation of the Sink contract. Future sinks (DatadogSink,
 * OTelSink) implement the same contract and plug into the SinkRegistry.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. PLUGGABLE - This sink is one of many. It implements the Sink contract
 *      and is registered in the SinkRegistry.
 *   2. ZERO BUSINESS LOGIC - The sink is pure infrastructure.
 *   3. ZERO RENDERING - The sink NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { DiagnosticRecord, Sink } from './types';

/**
 * The stdout Sink.
 *
 * Writes each diagnostic record as a single-line JSON document to stdout. This
 * is machine-parseable and suitable for log aggregation.
 */
export class StdoutSink implements Sink {
  /** The stable sink id. */
  readonly id = 'stdout';

  /**
   * Writes a diagnostic record to stdout as a JSON line.
   *
   * @param record The structured diagnostic record.
   */
  write(record: DiagnosticRecord): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(record));
  }
}
