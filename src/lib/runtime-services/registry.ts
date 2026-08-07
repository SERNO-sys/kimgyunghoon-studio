/**
 * AWIE V2 - Phase 11: Runtime Service Registry.
 *
 * The Runtime Service Registry is a PLATFORM INFRASTRUCTURE object that holds
 * all platform runtime services, keyed by their stable id. It provides O(1)
 * lookups and supports freezing for immutability.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Runtime Service Registry is the EXECUTION layer. It:
 *   1. STORES - holds all platform runtime services.
 *   2. LOOKUP - O(1) map lookups by service id.
 *   3. IMMUTABILITY - freeze() to guarantee a stable service set.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on opaque services.
 *   2. ZERO RENDERING - It NEVER renders UI. It only stores and retrieves.
 *   3. O(1) LOOKUP - Uses a Map for O(1) get/has. No Array.find().
 *   4. REGISTRY PATTERN - Constitution Article IV. Freezing is the
 *      responsibility of an external Bootstrap layer, never the services.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type {
  RuntimeService,
  RuntimeServiceId,
  RuntimeServiceRegistry,
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
 * The default Runtime Service Registry.
 *
 * Backed by a standard Map for O(1) lookups. Supports freezing: once freeze()
 * is called, any register() attempt throws a
 * RuntimeServiceRegistryFrozenError.
 *
 * NOTE: This class does NOT auto-freeze. Freezing is the responsibility of an
 * external Bootstrap layer.
 */
export class DefaultRuntimeServiceRegistry implements RuntimeServiceRegistry {
  /** The O(1) service store. */
  private readonly store = new Map<RuntimeServiceId, RuntimeService>();

  /** Whether this registry has been frozen. */
  private frozen = false;

  /**
   * Registers a runtime service under its stable id.
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
   * Retrieves a runtime service by id.
   *
   * @param id The stable service id.
   * @returns The service, or undefined if not registered.
   */
  get(id: RuntimeServiceId): RuntimeService | undefined {
    return this.store.get(id);
  }

  /**
   * Returns whether a service with the given id is registered.
   *
   * @param id The stable service id.
   */
  has(id: RuntimeServiceId): boolean {
    return this.store.has(id);
  }

  /**
   * Returns all registered services.
   */
  list(): RuntimeService[] {
    return Array.from(this.store.values());
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
