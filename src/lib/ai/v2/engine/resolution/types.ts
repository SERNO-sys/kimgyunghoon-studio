/**
 * AWIE V2 - Provider Resolution types.
 *
 * The ProviderRegistry and ProviderResolver decouple the AIEngine from concrete
 * provider adapters. The engine NEVER instantiates a provider directly (e.g.
 * `new GeminiProvider()`); instead, adapters are registered by id and resolved
 * dynamically at request time.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic or
 * provider-specific behavior. It is pure infrastructure.
 */

import type { ProviderAdapter } from '../../providers';
import type { GenerationMode, ProviderId } from '../../types';

/** A registered provider entry. */
export interface RegisteredProvider {
  /** The provider id. */
  id: ProviderId;
  /** The adapter instance. */
  adapter: ProviderAdapter;
  /** Optional priority (lower = preferred first). Defaults to 100. */
  priority?: number;
}

/** Options for constructing a ProviderRegistry. */
export interface ProviderRegistryOptions {
  /** Initial providers to register. */
  providers?: RegisteredProvider[];
}

/** Options for resolving a provider. */
export interface ResolveOptions {
  /** The preferred provider id, if the caller has a preference. */
  preferred?: ProviderId;
  /** The generation mode the provider must support. */
  mode?: GenerationMode;
  /** Whether the provider must be currently available. Defaults to true. */
  requireAvailable?: boolean;
}

/** The result of resolving a provider. */
export interface ResolvedProvider {
  /** The resolved provider id. */
  provider: ProviderId;
  /** The resolved adapter instance. */
  adapter: ProviderAdapter;
  /** The model to use (from the request or the adapter's default). */
  model: string;
}
