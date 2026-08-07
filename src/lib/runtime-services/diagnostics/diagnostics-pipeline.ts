/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - DefaultDiagnosticsPipeline.
 *
 * The orchestrator of the layered diagnostics pipeline:
 *
 *   Runtime Event -> Normalizer -> Structured Record -> SinkRegistry -> Sink
 *
 * It subscribes to a RuntimeEventBus, normalizes each event into a structured
 * record, and routes the record to all registered sinks. Sinks are pluggable:
 * adding a DatadogSink or OTelSink requires NO changes to this pipeline.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. LAYERED - The pipeline wires Normalizer + SinkRegistry + Sink. It does
 *      NOT merge layers.
 *   2. PLUGGABLE - Sinks are registered in the SinkRegistry. New sinks plug in
 *      seamlessly.
 *   3. FAIL-OPEN - A throwing sink does not prevent other sinks from receiving
 *      the record.
 *   4. ZERO BUSINESS LOGIC - The pipeline is pure infrastructure.
 *   5. ZERO RENDERING - The pipeline NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { RuntimeEvent, RuntimeEventBus } from '../core';
import type {
  DiagnosticsPipeline,
  Normalizer,
  SinkRegistry,
} from './types';

/**
 * The default DiagnosticsPipeline.
 *
 * Wires the layers together. On start(), it subscribes to the event bus. Each
 * event is normalized and routed to every registered sink. On stop(), it
 * unsubscribes.
 */
export class DefaultDiagnosticsPipeline implements DiagnosticsPipeline {
  /** The RuntimeEventBus to subscribe to. */
  private readonly bus: RuntimeEventBus;
  /** The Normalizer that transforms events into records. */
  private readonly normalizer: Normalizer;
  /** The SinkRegistry that holds the destination sinks. */
  private readonly sinkRegistry: SinkRegistry;

  /** The unsubscribe function returned by the bus. */
  private unsubscribe?: () => void;

  /**
   * Constructs a DefaultDiagnosticsPipeline.
   *
   * @param bus The RuntimeEventBus to subscribe to.
   * @param normalizer The Normalizer for event -> record transformation.
   * @param sinkRegistry The SinkRegistry holding the destination sinks.
   */
  constructor(
    bus: RuntimeEventBus,
    normalizer: Normalizer,
    sinkRegistry: SinkRegistry,
  ) {
    this.bus = bus;
    this.normalizer = normalizer;
    this.sinkRegistry = sinkRegistry;
  }

  /**
   * Starts the pipeline by subscribing to the event bus.
   */
  start(): void {
    if (this.unsubscribe) {
      return;
    }
    this.unsubscribe = this.bus.subscribe((event: RuntimeEvent) => {
      this.handle(event);
    });
  }

  /**
   * Stops the pipeline by unsubscribing from the event bus.
   */
  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /**
   * Returns whether the pipeline is currently running.
   */
  isRunning(): boolean {
    return this.unsubscribe !== undefined;
  }

  /**
   * Handles a single runtime event: normalizes it and routes it to all sinks.
   *
   * @param event The raw runtime event.
   */
  private handle(event: RuntimeEvent): void {
    const record = this.normalizer.normalize(event);
    for (const sink of this.sinkRegistry.list()) {
      try {
        sink.write(record);
      } catch {
        // Fail-open: a throwing sink must not prevent other sinks from
        // receiving the record.
      }
    }
  }
}
