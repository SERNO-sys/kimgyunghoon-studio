/**
 * AWIE V2 - EventEmitterTelemetry.
 *
 * An event-driven Telemetry implementation. Consumers subscribe to specific
 * event types (e.g. 'generation_started', 'validation_failed') and receive
 * TelemetryEvents. This decouples the pipeline from any concrete observability
 * backend (console, Cloudflare, OpenTelemetry).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { Telemetry, TelemetryEvent, TelemetryEventType } from './types';

/** A listener subscribed to telemetry events. */
export type TelemetryListener = (event: TelemetryEvent) => void;

/**
 * An event-driven Telemetry sink. Subscribers register per event type (or for
 * all events) and are invoked synchronously on record(). record() never throws.
 */
export class EventEmitterTelemetry implements Telemetry {
  private readonly listeners = new Map<TelemetryEventType | '*', Set<TelemetryListener>>();
  private readonly history: TelemetryEvent[] = [];

  /**
   * Subscribes a listener to a specific event type, or '*' for all events.
   * Returns an unsubscribe function.
   */
  on(type: TelemetryEventType | '*', listener: TelemetryListener): () => void {
    const set = this.listeners.get(type) ?? new Set<TelemetryListener>();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
    };
  }

  /**
   * Records a telemetry event. Invokes all matching listeners. Never throws.
   */
  record(event: TelemetryEvent): void {
    this.history.push(event);

    const all = this.listeners.get('*');
    if (all) {
      for (const listener of all) {
        try {
          listener(event);
        } catch {
          // Telemetry must never break generation.
        }
      }
    }

    const specific = this.listeners.get(event.type);
    if (specific) {
      for (const listener of specific) {
        try {
          listener(event);
        } catch {
          // Telemetry must never break generation.
        }
      }
    }
  }

  /**
   * Returns all events recorded so far (for debugging/tests).
   */
  events(): TelemetryEvent[] {
    return [...this.history];
  }

  /**
   * Returns events of a specific type recorded so far.
   */
  eventsOfType(type: TelemetryEventType): TelemetryEvent[] {
    return this.history.filter((e) => e.type === type);
  }

  /**
   * Clears the recorded history.
   */
  clear(): void {
    this.history.length = 0;
  }

  /**
   * No-op flush. Subclasses that buffer events may override.
   */
  async flush(): Promise<void> {
    // No buffering in this implementation.
  }
}
