/**
 * AWIE V2 - Phase J.2: Operations & Observability - DeliveryMetrics.
 *
 * A thin, delivery-specific facade over the existing MetricsCollector pattern
 * (Phase 11 M3). It exposes counters and gauges for the critical Delivery
 * pathways (Publish / Rollback / Deployment / D1 health) WITHOUT introducing a
 * new metrics framework.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. BUY BEFORE BUILD
 *      This facade REUSES the frozen MetricsCollector / MetricsSinkRegistry /
 *      MetricsSink pattern. It does NOT rebuild metrics infrastructure.
 *
 *   2. THIN WRAPPER
 *      The facade is a thin, replaceable wrapper. It adds NO new abstraction
 *      beyond named counters/gauges for the Delivery Layer.
 *
 *   3. PURE INFRASTRUCTURE
 *      The facade is pure infrastructure. It NEVER contains business logic,
 *      NEVER mutates ThemeConfig, and NEVER renders UI.
 *
 *   4. SNAPSHOT-ONLY READ
 *      The facade exposes a snapshot() for health/metrics endpoints. It NEVER
 *      executes business logic.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import {
  DefaultMetricsCollector,
  DefaultMetricsSinkRegistry,
  StdoutMetricsSink,
  type MetricsCollector,
  type MetricSample,
} from '../../runtime-services/metrics';

/**
 * The DeliveryMetrics facade.
 *
 * Wraps a MetricsCollector and exposes named counters/gauges for the Delivery
 * Layer. It is a thin, replaceable wrapper over the frozen metrics pattern.
 */
export class DeliveryMetrics {
  /** The underlying MetricsCollector. */
  private readonly collector: MetricsCollector;

  /**
   * Constructs a DeliveryMetrics facade.
   *
   * @param collector An optional MetricsCollector (defaults to a fresh
   *   collector wired to a stdout sink).
   */
  constructor(collector?: MetricsCollector) {
    if (collector) {
      this.collector = collector;
      return;
    }
    const registry = new DefaultMetricsSinkRegistry();
    registry.register('stdout', new StdoutMetricsSink());
    this.collector = new DefaultMetricsCollector(registry);
  }

  /**
   * Records a Publish action.
   *
   * @param projectId The Project (Site) id.
   */
  recordPublish(projectId: string): void {
    this.collector.increment('delivery.publish.total', 1, { projectId });
  }

  /**
   * Records a Rollback action.
   *
   * @param projectId The Project (Site) id.
   */
  recordRollback(projectId: string): void {
    this.collector.increment('delivery.rollback.total', 1, { projectId });
  }

  /**
   * Records a Deployment action.
   *
   * @param projectId The Project (Site) id.
   */
  recordDeployment(projectId: string): void {
    this.collector.increment('delivery.deployment.total', 1, { projectId });
  }

  /**
   * Sets the D1 health gauge (1 = healthy, 0 = unhealthy).
   *
   * @param healthy Whether the D1 binding is healthy.
   */
  setD1Health(healthy: boolean): void {
    this.collector.setGauge('delivery.d1.health', healthy ? 1 : 0);
  }

  /**
   * Returns the current aggregated metric samples without flushing.
   *
   * This is a snapshot-only read for health/metrics endpoints. It NEVER
   * executes business logic.
   */
  snapshot(): readonly MetricSample[] {
    return this.collector.snapshot();
  }
}
