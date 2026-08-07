/**
 * AWIE V2 - Phase 11 M3: Metrics Architecture - Contract Types.
 *
 * This module defines the COLLECTOR PATTERN for metrics. The API is separated
 * from the Collector:
 *
 *   Counters/Gauges -> MetricsCollector -> MetricsSinkRegistry -> Sink
 *
 * The Runtime Service provides the API (increment counter, set gauge), but the
 * Collector handles aggregation before flushing to a Sink. This keeps the
 * runtime service decoupled from any concrete metrics backend (Prometheus,
 * Datadog, OTel, etc.).
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - Pure infrastructure.
 *   2. ZERO RENDERING - NEVER renders UI.
 *   3. SEPARATION - The API (MetricsCollector) is separate from the Sink.
 *   4. AGGREGATION - The Collector aggregates before flushing.
 *   5. REGISTRY PATTERN - Sinks are resolved via an O(1) MetricsSinkRegistry.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure type modeling.
 */

/**
 * A metric type.
 *
 *   - 'counter' - a monotonically increasing value (e.g. request count).
 *   - 'gauge'   - a value that can go up and down (e.g. active connections).
 */
export type MetricType = 'counter' | 'gauge';

/**
 * A single aggregated metric sample.
 *
 * This is the unit that a Sink consumes. It is produced by the Collector after
 * aggregation.
 */
export interface MetricSample {
  /** The metric name (e.g. "http.requests.total"). */
  readonly name: string;
  /** The metric type. */
  readonly type: MetricType;
  /** The aggregated value. */
  readonly value: number;
  /** Optional labels (e.g. { method: "GET", status: "200" }). */
  readonly labels?: Readonly<Record<string, string>>;
  /** The ISO-8601 timestamp of the sample. */
  readonly timestamp: string;
}

/**
 * A metrics sink.
 *
 * Consumes aggregated MetricSamples. A sink is the terminal destination of the
 * metrics pipeline (e.g. stdout, Prometheus, Datadog). Sinks are pluggable and
 * never coupled to the Collector.
 */
export interface MetricsSink {
  /**
   * Writes a batch of aggregated metric samples.
   *
   * @param samples The aggregated samples to write.
   */
  write(samples: readonly MetricSample[]): void;
}

/**
 * The MetricsSinkRegistry contract.
 *
 * Resolves sinks by id via an O(1) Map. This is the universal registry pattern.
 */
export interface MetricsSinkRegistry {
  /**
   * Registers a sink under a stable id.
   *
   * @param id The stable sink id.
   * @param sink The sink to register.
   */
  register(id: string, sink: MetricsSink): void;

  /**
   * Retrieves a sink by id.
   *
   * @param id The stable sink id.
   * @returns The sink, or undefined if not registered.
   */
  get(id: string): MetricsSink | undefined;

  /**
   * Returns whether a sink with the given id is registered.
   *
   * @param id The stable sink id.
   */
  has(id: string): boolean;

  /**
   * Returns all registered sinks.
   */
  list(): MetricsSink[];
}

/**
 * The MetricsCollector contract.
 *
 * This is the API surface that runtime services use. It provides counters and
 * gauges, aggregates them, and flushes aggregated samples to registered sinks.
 * The Collector NEVER knows about any concrete sink implementation.
 */
export interface MetricsCollector {
  /**
   * Increments a counter by a delta (default 1).
   *
   * @param name The counter name.
   * @param delta The amount to increment (default 1).
   * @param labels Optional labels.
   */
  increment(name: string, delta?: number, labels?: Record<string, string>): void;

  /**
   * Sets a gauge to a value.
   *
   * @param name The gauge name.
   * @param value The value to set.
   * @param labels Optional labels.
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void;

  /**
   * Flushes all aggregated samples to the registered sinks.
   *
   * After flushing, the aggregation state is reset.
   */
  flush(): void;

  /**
   * Returns the current aggregated samples without flushing.
   */
  snapshot(): readonly MetricSample[];
}
