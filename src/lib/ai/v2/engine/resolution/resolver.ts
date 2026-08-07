/**
 * AWIE V2 - ProviderResolver.
 *
 * The ProviderResolver selects a provider adapter for a request. It honors an
 * explicit preference, then falls back to the highest-priority available
 * provider that supports the requested generation mode. It never instantiates
 * providers; it only resolves from the registry.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic or
 * provider-specific behavior. It is pure infrastructure.
 */

import type { AIError } from '../../types';
import type { ProviderRegistry } from './registry';
import type { ResolveOptions, ResolvedProvider } from './types';

/**
 * Thrown when no suitable provider can be resolved.
 */
export class ProviderResolutionError extends Error {
  readonly code: 'PROVIDER_NOT_CONFIGURED' | 'PROVIDER_UNAVAILABLE';
  readonly retryable: boolean;

  constructor(
    code: 'PROVIDER_NOT_CONFIGURED' | 'PROVIDER_UNAVAILABLE',
    message: string,
    retryable = false
  ) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
    this.retryable = retryable;
  }

  /** Converts this error into the normalized AIError shape. */
  toAIError(): AIError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

/**
 * Resolves a provider adapter from a registry for a given request.
 */
export class ProviderResolver {
  private readonly registry: ProviderRegistry;
  private readonly defaultProvider?: string;

  constructor(registry: ProviderRegistry, defaultProvider?: string) {
    this.registry = registry;
    this.defaultProvider = defaultProvider;
  }

  /**
   * Resolves a provider for a request. Returns the resolved adapter and model,
   * or throws a ProviderResolutionError when none is available.
   */
  resolve(options: ResolveOptions = {}): ResolvedProvider {
    const requireAvailable = options.requireAvailable ?? true;
    const mode = options.mode;

    // 1. Honor an explicit preference.
    if (options.preferred) {
      const preferred = this.registry.get(options.preferred);
      if (preferred) {
        if (!requireAvailable || preferred.isAvailable()) {
          if (!mode || this.supportsMode(preferred, mode)) {
            return {
              provider: options.preferred,
              adapter: preferred,
              model: preferred.config.defaultModel,
            };
          }
        }
      }
    }

    // 2. Honor the configured default provider.
    if (this.defaultProvider && this.defaultProvider !== options.preferred) {
      const def = this.registry.get(this.defaultProvider as never);
      if (def) {
        if (!requireAvailable || def.isAvailable()) {
          if (!mode || this.supportsMode(def, mode)) {
            return {
              provider: this.defaultProvider as never,
              adapter: def,
              model: def.config.defaultModel,
            };
          }
        }
      }
    }

    // 3. Fall back to the highest-priority available provider that supports the
    //    requested mode.
    for (const entry of this.registry.all()) {
      if (requireAvailable && !entry.adapter.isAvailable()) {
        continue;
      }
      if (mode && !this.supportsMode(entry.adapter, mode)) {
        continue;
      }
      return {
        provider: entry.id,
        adapter: entry.adapter,
        model: entry.adapter.config.defaultModel,
      };
    }

    // 4. Nothing suitable.
    if (this.registry.size === 0) {
      throw new ProviderResolutionError(
        'PROVIDER_NOT_CONFIGURED',
        'No AI providers are registered. Register at least one provider adapter.'
      );
    }

    throw new ProviderResolutionError(
      'PROVIDER_UNAVAILABLE',
      `No available provider supports the requested mode${mode ? ` (${mode})` : ''}.`,
      true
    );
  }

  /**
   * Returns whether an adapter supports a given generation mode.
   */
  private supportsMode(adapter: { capabilities(): { structuredOutput: boolean; streaming: boolean } }, mode: string): boolean {
    const caps = adapter.capabilities();
    if (mode === 'structured') {
      return caps.structuredOutput;
    }
    if (mode === 'stream') {
      return caps.streaming;
    }
    return true;
  }
}
