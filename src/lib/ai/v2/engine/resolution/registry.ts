/**
 * AWIE V2 - ProviderRegistry.
 *
 * The ProviderRegistry is the single place where provider adapters are
 * registered and looked up by id. The AIEngine never instantiates a provider
 * directly; it asks the registry for an already-registered adapter.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic or
 * provider-specific behavior. It is pure infrastructure.
 */

import type { ProviderAdapter } from '../../providers';
import type { ProviderId } from '../../types';
import type { ProviderRegistryOptions, RegisteredProvider } from './types';

/**
 * A registry of provider adapters keyed by provider id.
 */
export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, RegisteredProvider>();

  constructor(options: ProviderRegistryOptions = {}) {
    for (const provider of options.providers ?? []) {
      this.register(provider);
    }
  }

  /**
   * Registers a provider adapter. Registering the same id twice replaces the
   * previous entry.
   */
  register(provider: RegisteredProvider): this {
    this.providers.set(provider.id, {
      id: provider.id,
      adapter: provider.adapter,
      priority: provider.priority ?? 100,
    });
    return this;
  }

  /**
   * Registers a provider adapter by id (convenience overload).
   */
  registerAdapter(id: ProviderId, adapter: ProviderAdapter, priority = 100): this {
    return this.register({ id, adapter, priority });
  }

  /**
   * Removes a provider adapter by id.
   */
  unregister(id: ProviderId): boolean {
    return this.providers.delete(id);
  }

  /**
   * Returns the registered adapter for a provider id, or undefined.
   */
  get(id: ProviderId): ProviderAdapter | undefined {
    return this.providers.get(id)?.adapter;
  }

  /**
   * Returns whether a provider id is registered.
   */
  has(id: ProviderId): boolean {
    return this.providers.has(id);
  }

  /**
   * Returns all registered provider ids.
   */
  ids(): ProviderId[] {
    return [...this.providers.keys()];
  }

  /**
   * Returns all registered providers, sorted by priority (ascending).
   */
  all(): RegisteredProvider[] {
    return [...this.providers.values()].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /**
   * Returns the number of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }
}
