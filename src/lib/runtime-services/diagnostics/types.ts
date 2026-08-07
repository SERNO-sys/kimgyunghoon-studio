/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - Contract Types.
 *
 * Diagnostics is about EXPLAINING the runtime, not just logging. It is a
 * layered pipeline:
 *
 *   Runtime Event -> Normalizer -> Structured Record -> SinkRegistry -> Sink
 *
 * Each layer is independent and replaceable. Future sinks (DatadogSink,
 * OTelSink) plug into the SinkRegistry seamlessly.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. LAYERED - The pipeline is decomposed into Normalizer, SinkRegistry, and
 *      Sink. No layer is merged into another.
 *   2. PLUGGABLE - Sinks are registered via the SinkRegistry. Adding a new sink
 *      (Datadog, OTel) requires NO changes to the pipeline.
 *   3. ZERO BUSINESS LOGIC - Diagnostics is pure infrastructure. It NEVER
 *      imports BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   4. ZERO RENDERING - Diagnostics NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

import type { RuntimeEvent } from '../core';

// ---------------------------------------------------------------------------
// Structured Record
// ---------------------------------------------------------------------------

/**
 * A structured, normalized diagnostic record.
 *
 * This is the canonical shape that sinks consume. It is derived from a raw
 * RuntimeEvent by a Normalizer.
 */
export interface DiagnosticRecord {
  /** The normalized event name (e.g. "cache.miss"). */
  readonly name: string;
  /** The id of the service that emitted the event. */
  readonly serviceId: string;
  /** The event timestamp (ISO-8601). */
  readonly timestamp: string;
  /** The normalized severity level. */
  readonly level: DiagnosticLevel;
  /** The normalized, flattened payload. */
  readonly fields: Readonly<Record<string, unknown>>;
}

/**
 * The normalized severity level of a diagnostic record.
 */
export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * The Normalizer contract.
 *
 * A Normalizer transforms a raw RuntimeEvent into a structured DiagnosticRecord.
 * It is the FIRST stage of the diagnostics pipeline.
 */
export interface Normalizer {
  /**
   * Normalizes a runtime event into a structured diagnostic record.
   *
   * @param event The raw runtime event.
   * @returns The structured diagnostic record.
   */
  normalize(event: RuntimeEvent): DiagnosticRecord;
}

// ---------------------------------------------------------------------------
// Sink
// ---------------------------------------------------------------------------

/**
 * The Sink contract.
 *
 * A Sink is the FINAL destination of a diagnostic record. It writes the record
 * to a concrete backend (stdout, Datadog, OTel, etc.). Sinks are registered in
 * the SinkRegistry and are pluggable.
 */
export interface Sink {
  /** The stable sink id (e.g. "stdout", "datadog", "otel"). */
  readonly id: string;

  /**
   * Writes a diagnostic record to the sink's backend.
   *
   * @param record The structured diagnostic record.
   */
  write(record: DiagnosticRecord): void;
}

// ---------------------------------------------------------------------------
// Sink Registry
// ---------------------------------------------------------------------------

/**
 * The SinkRegistry contract.
 *
 * Backed by an O(1) Map (universal registry pattern). It stores sinks keyed by
 * their id, enabling the pipeline to route records to all registered sinks.
 */
export interface SinkRegistry {
  /**
   * Registers a sink.
   *
   * @param sink The sink to register.
   */
  register(sink: Sink): void;

  /**
   * Retrieves a sink by id.
   *
   * @param id The sink id.
   * @returns The sink, or undefined if not registered.
   */
  get(id: string): Sink | undefined;

  /**
   * Returns all registered sinks.
   */
  list(): Sink[];
}

// ---------------------------------------------------------------------------
// Diagnostics Pipeline
// ---------------------------------------------------------------------------

/**
 * The DiagnosticsPipeline contract.
 *
 * The pipeline wires the layers together: it subscribes to a RuntimeEventBus,
 * normalizes each event into a structured record, and routes the record to all
 * registered sinks. It is the orchestrator of the diagnostics layers.
 */
export interface DiagnosticsPipeline {
  /**
   * Starts the pipeline by subscribing to the event bus.
   */
  start(): void;

  /**
   * Stops the pipeline by unsubscribing from the event bus.
   */
  stop(): void;

  /**
   * Returns whether the pipeline is currently running.
   */
  isRunning(): boolean;
}
