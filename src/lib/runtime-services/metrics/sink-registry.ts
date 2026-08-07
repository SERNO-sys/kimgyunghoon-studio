/**
 * AWIE V2 - Phase 11 M3: Metrics Architecture - MetricsSinkRegistry.
 *
 * Resolves metrics sinks by id via an O(1) Map. This is the universal registry
 * pattern. Sinks are pluggable (stdout, Prometheus, Datadog, OTel) and are
 * never coupled to the Collector.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. O(1) LOOKUP - Uses a Map for O(1) get/has. No Array.find().
 *   4. REGISTRY PATTERN - Sinks are resolved via the registry.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { MetricsSink, MetricsSinkRegistry } from './types';

/**
 * The default MetricsSinkRegistry.
 *
 * Backed by a standard Map for O(1) lookups.
 */
export class DefaultMetricsSinkRegistry implements MetricsSinkRegistry {
  /** The O(1) sink store. */
  private readonly store = new Map<string, MetricsSink>();

  /**
   * Registers a sink under a stable id.
   */
  register(id: string, sink: MetricsSink): void {
    this.store.set(id, sink);
  }

  /**
   * Retrieves a sink by id.
   */
  get(id: string): MetricsSink | undefined {
    return this.store.get(id);
  }

  /**
   * Returns whether a sink with the given id is registered.
   */
  has(id: string): boolean {
    return this.store.has(id);
  }

  /**
   * Returns all registered sinks.
   */
  list(): MetricsSink[] {
    return Array.from(this.store.values());
  }
}
