/**
 * AWIE V2 - Phase 11 M3: Metrics Architecture - MetricsCollector.
 *
 * The Collector is the aggregation engine of the metrics pipeline. Runtime
 * services call increment()/setGauge() (the API), and the Collector aggregates
 * the values before flushing them to registered sinks.
 *
 *   Counters/Gauges -> MetricsCollector -> MetricsSinkRegistry -> Sink
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. SEPARATION - The Collector NEVER knows about concrete sinks; it only
 *      knows the MetricsSinkRegistry contract.
 *   4. AGGREGATION - Counters sum; gauges take the latest value.
 *   5. FAIL-OPEN - A throwing sink does not block other sinks.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { MetricSample, MetricsCollector, MetricsSinkRegistry } from './types';

/**
 * The default MetricsCollector.
 *
 * Aggregates counters (sum) and gauges (latest value) keyed by name + labels,
 * then flushes aggregated samples to all registered sinks. After a flush, the
 * aggregation state is reset.
 */
export class DefaultMetricsCollector implements MetricsCollector {
  /** The sink registry. */
  private readonly sinks: MetricsSinkRegistry;
  /** The aggregation store keyed by metric key. */
  private readonly store = new Map<string, MetricSample>();
  /** The clock used to timestamp samples. */
  private readonly now: () => string;

  /**
   * Constructs a DefaultMetricsCollector.
   *
   * @param sinks The sink registry to flush to.
   * @param now An optional clock (defaults to new Date().toISOString()).
   */
  constructor(sinks: MetricsSinkRegistry, now: () => string = () => new Date().toISOString()) {
    this.sinks = sinks;
    this.now = now;
  }

  /**
   * Builds a stable aggregation key from a metric name and labels.
   */
  private key(name: string, labels?: Record<string, string>): string {
    if (!labels) {
      return name;
    }
    const parts = Object.keys(labels)
      .sort()
      .map((k) => `${k}=${labels[k]}`);
    return `${name}{${parts.join(',')}}`;
  }

  /**
   * Increments a counter by a delta (default 1).
   */
  increment(name: string, delta = 1, labels?: Record<string, string>): void {
    const k = this.key(name, labels);
    const existing = this.store.get(k);
    if (existing) {
      this.store.set(k, { ...existing, value: existing.value + delta });
    } else {
      this.store.set(k, {
        name,
        type: 'counter',
        value: delta,
        labels,
        timestamp: this.now(),
      });
    }
  }

  /**
   * Sets a gauge to a value.
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const k = this.key(name, labels);
    this.store.set(k, {
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: this.now(),
    });
  }

  /**
   * Flushes all aggregated samples to the registered sinks.
   *
   * After flushing, the aggregation state is reset. A throwing sink does not
   * block other sinks (fail-open).
   */
  flush(): void {
    const samples = Array.from(this.store.values());
    this.store.clear();
    for (const sink of this.sinks.list()) {
      try {
        sink.write(samples);
      } catch {
        // Fail-open: a throwing sink must not block other sinks.
      }
    }
  }

  /**
   * Returns the current aggregated samples without flushing.
   */
  snapshot(): readonly MetricSample[] {
    return Array.from(this.store.values());
  }
}
