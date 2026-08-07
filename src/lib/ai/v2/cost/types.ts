/**
 * AWIE V2 - Cost estimation types.
 *
 * The PricingProvider isolates cost calculation from the rest of the pipeline.
 * It converts token usage into a USD cost estimate based on per-model pricing.
 *
 * IMPORTANT: The PricingProvider MUST NOT hardcode prices. Prices change over
 * time, so the provider only QUERIES an injected PricingCatalog. The catalog
 * is the single source of truth for pricing data and can be swapped for a
 * remote/live catalog without touching the provider.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { CostEstimate, ProviderId, TokenUsage } from '../types';

/** Per-model pricing in USD per 1M tokens. */
export interface ModelPricing {
  /** Input price in USD per 1M tokens. */
  inputPerMillion: number;
  /** Output price in USD per 1M tokens. */
  outputPerMillion: number;
}

/** A pricing table keyed by provider and model. */
export type PricingTable = Record<ProviderId, Record<string, ModelPricing>>;

/**
 * The PricingCatalog is the single source of truth for pricing data.
 *
 * It is injected into a PricingProvider. The provider never hardcodes prices;
 * it only queries the catalog. A catalog may be static (bundled), remote
 * (fetched from an API), or cached — the provider is agnostic to the source.
 */
export interface PricingCatalog {
  /**
   * Returns the pricing for a provider/model, or undefined when unknown.
   */
  getPricing(provider: ProviderId, model: string): ModelPricing | undefined;

  /**
   * A version string identifying the pricing data revision.
   */
  readonly version: string;
}

/** Options for constructing a PricingProvider. */
export interface PricingProviderOptions {
  /**
   * The injected pricing catalog. When omitted, a default static catalog is
   * used. The provider itself never defines prices.
   */
  catalog?: PricingCatalog;
}

/**
 * The PricingProvider estimates the cost of a generation.
 */
export interface PricingProvider {
  /**
   * Estimates the cost of a generation for a provider/model and token usage.
   * Returns undefined when no pricing is known for the provider/model.
   */
  estimate(
    provider: ProviderId,
    model: string,
    usage: TokenUsage
  ): CostEstimate | undefined;
}
