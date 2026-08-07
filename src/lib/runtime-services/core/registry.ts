/**
 * AWIE V2 - Phase 11 M2: Runtime Coordination - RuntimeServiceRegistry.
 *
 * The lifecycle-aware Runtime Service Registry. Backed by an O(1) Map
 * (universal registry pattern). It orchestrates bulk initialization, graceful
 * teardown, and aggregated health across all registered services.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - The registry is pure infrastructure. It NEVER
 *      imports BusinessBrief, IndustryProfile, or RecipeBlueprint.
 *   2. ZERO RENDERING - The registry NEVER renders UI.
 *   3. O(1) LOOKUP - Uses a Map for O(1) get/has. No Array.find().
 *   4. LIFECYCLE ORCHESTRATION - The registry orchestrates initialize/dispose.
 *      Services themselves NEVER orchestrate other services.
 *   5. FAIL-OPEN - A failing service does not prevent other services from
 *      initializing. Health aggregation reports the worst status.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  RuntimeHealthReport,
  RuntimeService,
  RuntimeServiceRegistry,
  ServiceHealthStatus,
} from './types';

/**
 * Thrown when a register() attempt is made on a frozen registry.
 *
 * Once the registry is frozen, it is immutable. Any further registration MUST
 * fail fast with this error to guarantee a stable service set.
 */
export class RuntimeServiceRegistryFrozenError extends Error {
  /** The service id that was attempted to be registered. */
  readonly serviceId: string;

  constructor(serviceId: string) {
    super(
      `Cannot register runtime service "${serviceId}": the registry is frozen. ` +
        'Freezing is irreversible and guarantees a stable service set.',
    );
    this.name = 'RuntimeServiceRegistryFrozenError';
    this.serviceId = serviceId;
  }
}

/**
 * The default lifecycle-aware Runtime Service Registry.
 *
 * Backed by a standard Map for O(1) lookups. Orchestrates:
 *   - initializeAll(): initializes all services in registration order. A
 *     failing service is marked 'failed' but does not block the rest.
 *   - disposeAll(): disposes all services in reverse registration order
 *     (graceful teardown). Idempotent.
 *   - healthReport(): aggregates the worst health status across all services.
 *
 * NOTE: This class does NOT auto-freeze. Freezing is the responsibility of an
 * external Bootstrap layer.
 */
export class DefaultRuntimeServiceRegistry implements RuntimeServiceRegistry {
  /** The O(1) service store. */
  private readonly store = new Map<string, RuntimeService>();

  /** Whether this registry has been frozen. */
  private frozen = false;

  /**
   * Registers a service under its stable id.
   *
   * @param service The service to register.
   * @throws {RuntimeServiceRegistryFrozenError} If the registry is frozen.
   */
  register(service: RuntimeService): void {
    if (this.frozen) {
      throw new RuntimeServiceRegistryFrozenError(service.id);
    }
    this.store.set(service.id, service);
  }

  /**
   * Retrieves a service by id.
   *
   * @param id The stable service id.
   * @returns The service, or undefined if not registered.
   */
  get(id: string): RuntimeService | undefined {
    return this.store.get(id);
  }

  /**
   * Returns whether a service with the given id is registered.
   *
   * @param id The stable service id.
   */
  has(id: string): boolean {
    return this.store.has(id);
  }

  /**
   * Returns all registered services.
   */
  list(): RuntimeService[] {
    return Array.from(this.store.values());
  }

  /**
   * Initializes all registered services in registration order.
   *
   * Fail-open: if a service fails to initialize, its health is marked 'failed'
   * and the remaining services still initialize. This guarantees that a single
   * failing service cannot take down the entire runtime.
   */
  async initializeAll(): Promise<void> {
    for (const service of this.store.values()) {
      try {
        await service.initialize();
      } catch {
        // Fail-open: a failing service must not block the rest. Its health()
        // probe is expected to report 'failed' after a failed initialize.
      }
    }
  }

  /**
   * Disposes all registered services in reverse registration order (graceful
   * teardown). Idempotent.
   */
  async disposeAll(): Promise<void> {
    const services = Array.from(this.store.values());
    for (let i = services.length - 1; i >= 0; i--) {
      try {
        await services[i].dispose();
      } catch {
        // Fail-open: a failing dispose must not block the rest of the teardown.
      }
    }
  }

  /**
   * Returns the aggregated health report across all registered services.
   *
   * The overall status is the WORST of all services:
   *   - any 'failed'  -> 'failed'
   *   - else any 'degraded' -> 'degraded'
   *   - else -> 'healthy'
   */
  healthReport(): RuntimeHealthReport {
    const services: Record<string, ServiceHealthStatus> = {};
    let healthy = 0;
    let degraded = 0;
    let failed = 0;

    for (const service of this.store.values()) {
      const status = service.health();
      services[service.id] = status;
      if (status === 'healthy') {
        healthy++;
      } else if (status === 'degraded') {
        degraded++;
      } else {
        failed++;
      }
    }

    const status: ServiceHealthStatus =
      failed > 0 ? 'failed' : degraded > 0 ? 'degraded' : 'healthy';

    return {
      status,
      services,
      total: this.store.size,
      healthy,
      degraded,
      failed,
    };
  }

  /**
   * Freezes the registry. After this call, any register() attempt throws.
   */
  freeze(): void {
    this.frozen = true;
  }

  /**
   * Returns whether the registry has been frozen.
   */
  isFrozen(): boolean {
    return this.frozen;
  }
}
