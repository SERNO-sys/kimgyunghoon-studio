/**
 * AWIE V2 - Renderer Telemetry Helpers.
 *
 * Provides a small, safe helper for emitting start/end telemetry pairs so the
 * engine can track render latency (e.g. PAGE_RENDER_STARTED / COMPLETED,
 * SECTION_RENDER_STARTED / COMPLETED).
 *
 * Telemetry must never throw and must never break rendering.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { RendererTelemetry, RendererTelemetryEvent } from './types';

/**
 * A helper that records a start event and returns a function that records the
 * matching end event with the elapsed latency in milliseconds.
 *
 * Usage:
 *
 *   const done = trackRender(telemetry, 'page_render_started', 'page_render_completed', { pageId });
 *   // ... render ...
 *   done();
 */
export function trackRender(
  telemetry: RendererTelemetry,
  startType: string,
  endType: string,
  metadata?: Record<string, unknown>,
): () => void {
  const startedAt = Date.now();

  safeRecord(telemetry, {
    type: startType,
    timestamp: new Date().toISOString(),
    metadata,
  });

  return () => {
    const latencyMs = Date.now() - startedAt;
    safeRecord(telemetry, {
      type: endType,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        latencyMs,
      },
    });
  };
}

/**
 * Records a telemetry event, swallowing any error so telemetry failures never
 * break rendering.
 */
export function safeRecord(telemetry: RendererTelemetry, event: RendererTelemetryEvent): void {
  try {
    telemetry.record(event);
  } catch {
    // Telemetry failures must not break rendering.
  }
}
