/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - DefaultNormalizer.
 *
 * The FIRST stage of the diagnostics pipeline. It transforms a raw RuntimeEvent
 * into a structured DiagnosticRecord.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. LAYERED - The normalizer is a single, independent layer. It does NOT
 *      write to sinks (that is the Sink's job).
 *   2. ZERO BUSINESS LOGIC - The normalizer is pure infrastructure.
 *   3. ZERO RENDERING - The normalizer NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { RuntimeEvent } from '../core';
import type { DiagnosticLevel, DiagnosticRecord, Normalizer } from './types';

/**
 * Maps a runtime event name to a normalized severity level.
 *
 * Events containing "fail", "error", or "degraded" are 'error'/'warn';
 * otherwise 'info'. This is a deterministic, infrastructure-level heuristic.
 *
 * @param name The raw event name.
 */
function inferLevel(name: string): DiagnosticLevel {
  if (name.includes('fail') || name.includes('error')) {
    return 'error';
  }
  if (name.includes('degraded') || name.includes('warn')) {
    return 'warn';
  }
  return 'info';
}

/**
 * The default Normalizer.
 *
 * Converts a RuntimeEvent into a DiagnosticRecord by:
 *   - normalizing the event name (':' -> '.')
 *   - inferring a severity level from the event name
 *   - carrying the payload through as structured fields
 */
export class DefaultNormalizer implements Normalizer {
  /**
   * Normalizes a runtime event into a structured diagnostic record.
   *
   * @param event The raw runtime event.
   * @returns The structured diagnostic record.
   */
  normalize(event: RuntimeEvent): DiagnosticRecord {
    return {
      name: event.name.replace(/:/g, '.'),
      serviceId: event.serviceId,
      timestamp: event.timestamp,
      level: inferLevel(event.name),
      fields: event.payload ?? {},
    };
  }
}
