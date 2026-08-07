/**
 * AWIE V2 - Phase 11: Analytics Hooks Service.
 *
 * The Analytics Hooks service is a PLATFORM SERVICE that emits analytics
 * events. It observes runtime activity.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Analytics Hooks service is the EXECUTION layer. It:
 *   1. OBSERVES - emits analytics events.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on opaque analytics events.
 *   2. ZERO RENDERING - It NEVER renders UI. It only emits events.
 *   3. ISOLATION - It is isolated behind an interface so the underlying
 *      analytics provider (GA, Plausible, custom) can be swapped.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { AnalyticsEvent, AnalyticsService } from './types';

/**
 * The default Analytics Hooks service.
 *
 * Emits analytics events to a sink. The default sink is a no-op (events are
 * collected in memory for observability/testing). A real provider can be
 * injected by subclassing or wrapping.
 *
 * The service is isolated behind the AnalyticsService interface so the
 * underlying provider can be swapped without affecting consumers.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "analytics:tracked" events on the RuntimeEventBus for observability.
 */
export class DefaultAnalytics extends BaseService implements AnalyticsService {
  /** The stable service id. */
  readonly id = 'analytics' as const;

  /** The collected events (for observability/testing). */
  private readonly events: AnalyticsEvent[] = [];

  /**
   * Constructs a DefaultAnalytics.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Emits an analytics event.
   *
   * @param event The event to emit.
   */
  track(event: AnalyticsEvent): void {
    this.events.push(event);
    this.emit('analytics:tracked', { name: event.name });
  }


  /**
   * Returns the collected events.
   *
   * This is an observability helper for testing and debugging. It is NOT part
   * of the AnalyticsService interface.
   */
  getEvents(): AnalyticsEvent[] {
    return this.events;
  }
}
