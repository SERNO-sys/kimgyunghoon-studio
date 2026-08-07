/**
 * AWIE V2 - Phase 11 M2: Diagnostics Pipeline - DefaultSinkRegistry.
 *
 * The O(1) registry of diagnostic sinks, keyed by their id. The pipeline routes
 * records to all registered sinks. Adding a new sink (Datadog, OTel) requires
 * NO changes to the pipeline — just register it here.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. PLUGGABLE - Sinks are registered via the registry. New sinks plug in
 *      seamlessly.
 *   2. O(1) LOOKUP - Uses a Map for O(1) get. No Array.find().
 *   3. ZERO BUSINESS LOGIC - The registry is pure infrastructure.
 *   4. ZERO RENDERING - The registry NEVER renders UI.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { Sink, SinkRegistry } from './types';

/**
 * The default SinkRegistry.
 *
 * Backed by a standard Map keyed by sink id for O(1) lookups.
 */
export class DefaultSinkRegistry implements SinkRegistry {
  /** The O(1) sink store, keyed by sink id. */
  private readonly store = new Map<string, Sink>();

  /**
   * Registers a sink.
   *
   * @param sink The sink to register.
   */
  register(sink: Sink): void {
    this.store.set(sink.id, sink);
  }

  /**
   * Retrieves a sink by id.
   *
   * @param id The sink id.
   * @returns The sink, or undefined if not registered.
   */
  get(id: string): Sink | undefined {
    return this.store.get(id);
  }

  /**
   * Returns all registered sinks.
   */
  list(): Sink[] {
    return Array.from(this.store.values());
  }
}
