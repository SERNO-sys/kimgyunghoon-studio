/**
 * AWIE V2 - Phase 11: Runtime Performance Service.
 *
 * The Runtime Performance service is a PLATFORM SERVICE that measures runtime
 * performance. It observes execution timing.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Runtime Performance service is the EXECUTION layer. It:
 *   1. OBSERVES - measures execution timing.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on opaque measurement names.
 *   2. ZERO RENDERING - It NEVER renders UI. It only measures timing.
 *   3. ISOLATION - It is isolated behind an interface so the underlying
 *      performance sink (console, metrics provider) can be swapped.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { PerformanceMeasurement, PerformanceService } from './types';

/**
 * The default Runtime Performance service.
 *
 * Measures execution timing. The default sink collects measurements in memory
 * for observability/testing. A real provider can be injected by subclassing or
 * wrapping.
 *
 * The service is isolated behind the PerformanceService interface so the
 * underlying sink can be swapped without affecting consumers.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "performance:recorded" events on the RuntimeEventBus for observability.
 */
export class DefaultPerformance
  extends BaseService
  implements PerformanceService
{
  /** The stable service id. */
  readonly id = 'performance' as const;

  /** The collected measurements (for observability/testing). */
  private readonly measurements: PerformanceMeasurement[] = [];

  /**
   * Constructs a DefaultPerformance.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Starts a named measurement and returns a stop function.
   *
   * @param name The measurement name.
   * @returns A function that stops the measurement and records the duration.
   */
  start(name: string): () => PerformanceMeasurement {
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();

    return () => {
      const durationMs = Date.now() - startedAt;
      const measurement: PerformanceMeasurement = {
        name,
        durationMs,
        startedAt: startedAtIso,
      };
      this.record(measurement);
      return measurement;
    };
  }

  /**
   * Records a completed measurement.
   *
   * @param measurement The measurement to record.
   */
  record(measurement: PerformanceMeasurement): void {
    this.measurements.push(measurement);
    this.emit('performance:recorded', {
      name: measurement.name,
      durationMs: measurement.durationMs,
    });
  }


  /**
   * Returns the collected measurements.
   *
   * This is an observability helper for testing and debugging. It is NOT part
   * of the PerformanceService interface.
   */
  getMeasurements(): PerformanceMeasurement[] {
    return this.measurements;
  }
}
