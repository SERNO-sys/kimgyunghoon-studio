/**
 * AWIE V2 - PricingCatalog and StaticPricingProvider.
 *
 * The PricingCatalog is the single source of truth for pricing data. The
 * StaticPricingCatalog is a bundled, immutable catalog. The StaticPricingProvider
 * converts token usage into a USD cost estimate by QUERYING an injected catalog.
 *
 * IMPORTANT: The provider never hardcodes prices. Prices live only in the
 * catalog, which can be swapped for a remote/live catalog without touching the
 * provider.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import type { CostEstimate, ProviderId, TokenUsage } from '../types';
import type {
  ModelPricing,
  PricingCatalog,
  PricingProvider,
  PricingProviderOptions,
  PricingTable,
} from './types';

/**
 * A bundled, immutable PricingCatalog backed by a static table.
 *
 * These are illustrative defaults (USD per 1M tokens) and should be updated
 * from the provider's published pricing. The mock provider is free.
 */
export class StaticPricingCatalog implements PricingCatalog {
  readonly version: string;
  private readonly table: PricingTable;

  constructor(table: PricingTable, version = 'default-1.0') {
    this.table = table;
    this.version = version;
  }

  getPricing(provider: ProviderId, model: string): ModelPricing | undefined {
    const providerTable = this.table[provider];
    if (!providerTable) {
      return undefined;
    }
    if (providerTable[model]) {
      return providerTable[model];
    }
    // Fall back to the first entry for the provider.
    return Object.values(providerTable)[0];
  }
}

/**
 * The default bundled pricing table (USD per 1M tokens).
 */
export const DEFAULT_PRICING_TABLE: PricingTable = {
  gemini: {
    'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
    'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.0 },
  },
  claude: {
    'claude-3-5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
    'claude-3-haiku': { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  },
  openai: {
    'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
    'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  deepseek: {
    'deepseek-chat': { inputPerMillion: 0.27, outputPerMillion: 1.1 },
  },
  mock: {
    'mock-model': { inputPerMillion: 0, outputPerMillion: 0 },
  },
};

/**
 * A PricingProvider that queries an injected PricingCatalog. It holds no
 * pricing data itself.
 */
export class StaticPricingProvider implements PricingProvider {
  private readonly catalog: PricingCatalog;

  constructor(options: PricingProviderOptions = {}) {
    this.catalog =
      options.catalog ?? new StaticPricingCatalog(DEFAULT_PRICING_TABLE);
  }

  estimate(provider: ProviderId, model: string, usage: TokenUsage): CostEstimate | undefined {
    const pricing = this.catalog.getPricing(provider, model);
    if (!pricing) {
      return undefined;
    }

    const inputUsd = (usage.inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputUsd = (usage.outputTokens / 1_000_000) * pricing.outputPerMillion;

    return {
      totalUsd: round(inputUsd + outputUsd),
      inputUsd: round(inputUsd),
      outputUsd: round(outputUsd),
      currency: 'USD',
      pricingVersion: this.catalog.version,
    };
  }
}

/** Rounds a cost to 6 decimal places (micro-dollar precision). */
function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
