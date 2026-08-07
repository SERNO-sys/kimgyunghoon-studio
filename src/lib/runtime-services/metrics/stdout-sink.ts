/**
 * AWIE V2 - Phase 11 M3: Metrics Architecture - StdoutSink.
 *
 * A reference metrics sink that writes aggregated samples to stdout. This is
 * the default sink for local development. Production sinks (Prometheus,
 * Datadog, OTel) plug in via the MetricsSinkRegistry with zero changes to the
 * Collector.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. PLUGGABLE - A sink is a terminal destination; it never couples to the
 *      Collector.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { MetricSample, MetricsSink } from './types';

/**
 * The stdout metrics sink.
 *
 * Writes each sample as a single-line JSON record to stdout.
 */
export class StdoutMetricsSink implements MetricsSink {
  /** The output writer (injectable for tests). */
  private readonly out: (line: string) => void;

  /**
   * Constructs a StdoutMetricsSink.
   *
   * @param out An optional output writer (defaults to console.log).
   */
  constructor(out: (line: string) => void = (line) => console.log(line)) {
    this.out = out;
  }

  /**
   * Writes a batch of aggregated metric samples.
   */
  write(samples: readonly MetricSample[]): void {
    for (const sample of samples) {
      this.out(JSON.stringify(sample));
    }
  }
}
