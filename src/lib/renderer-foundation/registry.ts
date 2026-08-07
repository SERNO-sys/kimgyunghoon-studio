/**
 * AWIE V2 - Renderer Foundation Registry (Phase 08, Milestone 2A).
 *
 * The concrete infrastructure implementation of the universal
 * ResourceRegistry<T>. This is the ONLY place where the O(1) map-based
 * registries are materialized.
 *
 * THE RENDERER IS DUMB. This registry ONLY does:
 *   1. LOOKUP      - O(1) map lookups.
 *   2. STORAGE     - register/get/has/list.
 *   3. IMMUTABILITY - freeze() to guarantee reproducible renders.
 *
 * It contains NO business logic and NO UI code. Pure TypeScript.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { ResourceRegistry } from './types';

/**
 * Thrown when a register() attempt is made on a frozen registry.
 *
 * Once a registry is frozen, it is immutable. Any further registration MUST
 * fail fast with this error to guarantee reproducible renders.
 */
export class RegistryFrozenError extends Error {
  /** The id that was attempted to be registered. */
  readonly resourceId: string;

  constructor(resourceId: string) {
    super(
      `Cannot register resource "${resourceId}": the registry is frozen. ` +
        'Freezing is irreversible and guarantees reproducible renders.',
    );
    this.name = 'RegistryFrozenError';
    this.resourceId = resourceId;
  }
}

/**
 * The concrete, in-memory implementation of ResourceRegistry<T>.
 *
 * Backed by a standard Map for O(1) lookups. Supports freezing: once freeze()
 * is called, any register() attempt throws a RegistryFrozenError.
 *
 * NOTE: This class does NOT auto-freeze. Freezing is the responsibility of an
 * external Bootstrap layer.
 *
 * @typeParam T The type of the registered resource.
 */
export class InMemoryResourceRegistry<T> implements ResourceRegistry<T> {
  /** The backing store. O(1) lookups. */
  private readonly store = new Map<string, T>();

  /** Whether this registry has been frozen. */
  private frozen = false;

  /**
   * Registers a resource under a stable id. Registering an existing id
   * overwrites the previous entry (last-write-wins).
   *
   * @param id The stable resource id.
   * @param resource The resource to register.
   * @throws {RegistryFrozenError} If the registry has been frozen.
   */
  register(id: string, resource: T): void {
    if (this.frozen) {
      throw new RegistryFrozenError(id);
    }
    this.store.set(id, resource);
  }

  /**
   * Retrieves a resource by id. O(1) map lookup.
   *
   * @param id The stable resource id.
   * @returns The resource, or undefined if not registered.
   */
  get(id: string): T | undefined {
    return this.store.get(id);
  }

  /**
   * Returns whether a resource with the given id is registered. O(1).
   *
   * @param id The stable resource id.
   */
  has(id: string): boolean {
    return this.store.has(id);
  }

  /**
   * Returns all registered resources. Order is not guaranteed.
   */
  list(): T[] {
    return Array.from(this.store.values());
  }

  /**
   * Freezes the registry. After this call, any register() attempt MUST throw a
   * RegistryFrozenError. This is irreversible.
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
