/**
 * AWIE V2 - Telemetry Interface.
 *
 * The Telemetry sink records observability data for the AI pipeline: latency,
 * token usage, cost, retries, and errors. It is provider-independent and
 * business-logic-free. Concrete sinks (console, Cloudflare, OpenTelemetry)
 * are implemented in a later step.
 *
 * STRICT CONSTRAINT: This interface MUST NOT contain any business logic.
 */

import type { AIError, ProviderId, TokenUsage } from '../types';

/**
 * The canonical lifecycle event types of a generation run.
 *
 * Consumers subscribe to specific event types rather than reading a log
 * stream. Using a strict enum (rather than raw strings) guarantees type-safe
 * event names across the pipeline and prevents typos.
 */
export enum TelemetryEventType {
  /** A generation run has started. */
  GENERATION_STARTED = 'generation_started',
  /** A generation run completed successfully. */
  GENERATION_SUCCEEDED = 'generation_succeeded',
  /** A generation run failed. */
  GENERATION_FAILED = 'generation_failed',
  /** A provider was selected for a run. */
  PROVIDER_SELECTED = 'provider_selected',
  /** Output failed validation. */
  VALIDATION_FAILED = 'validation_failed',
  /** The sanitizer repaired malformed output. */
  SANITIZER_REPAIRED = 'sanitizer_repaired',
  /** A retry was scheduled. */
  RETRY = 'retry',
  /** The retry budget was exhausted. */
  RETRY_EXHAUSTED = 'retry_exhausted',
  /** A sanitization step completed. */
  SANITIZATION = 'sanitization',
  /** A validation step completed. */
  VALIDATION = 'validation',
  /** A streaming run started. */
  STREAM_STARTED = 'stream_started',
  /** A stream chunk was produced. */
  STREAM_CHUNK = 'stream_chunk',
  /** A streaming run completed. */
  STREAM_COMPLETED = 'stream_completed',
  /** A streaming run failed. */
  STREAM_FAILED = 'stream_failed',
}

/**
 * A single telemetry event recorded by the pipeline.
 */
export interface TelemetryEvent {
  /** The event type. */
  type: TelemetryEventType;
  /** The provider involved, when applicable. */
  provider?: ProviderId;
  /** The model involved, when applicable. */
  model?: string;
  /** Latency in milliseconds, when applicable. */
  latencyMs?: number;
  /** Token usage, when applicable. */
  usage?: TokenUsage;
  /** Cost in USD, when applicable. */
  costUsd?: number;
  /** Number of retries performed, when applicable. */
  retryCount?: number;
  /** The error, when the event is an error. */
  error?: AIError;
  /** A timestamp in ISO format. */
  timestamp: string;
  /** Optional extra context. */
  metadata?: Record<string, unknown>;
}

/**
 * The Telemetry sink records observability data for the AI pipeline.
 */
export interface Telemetry {
  /**
   * Records a telemetry event. Implementations should be non-blocking and
   * must never throw (telemetry failures must not break generation).
   */
  record(event: TelemetryEvent): void;

  /**
   * Flushes any buffered telemetry. Called at the end of a pipeline run.
   */
  flush(): Promise<void>;
}
