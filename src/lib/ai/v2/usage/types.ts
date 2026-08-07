/**
 * AWIE V2 - Usage tracking types.
 *
 * The UsageTracker records token usage across generation runs, keyed by
 * provider and model. It is provider-independent and business-logic-free.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { ProviderId, TokenUsage } from '../types';

/** A single usage record for one run. */
export interface UsageRecord {
  /** The provider that produced the usage. */
  provider: ProviderId;
  /** The model that produced the usage. */
  model: string;
  /** The token usage for the run. */
  usage: TokenUsage;
  /** The flow that triggered the run (e.g. 'hero', 'theme'). */
  flow?: string;
  /** A timestamp in ISO format. */
  timestamp: string;
}

/** Aggregated usage for a provider/model key. */
export interface UsageAggregate {
  /** The provider. */
  provider: ProviderId;
  /** The model. */
  model: string;
  /** Total input tokens. */
  inputTokens: number;
  /** Total output tokens. */
  outputTokens: number;
  /** Total tokens. */
  totalTokens: number;
  /** Number of runs recorded. */
  runs: number;
}

/** Options for constructing a UsageTracker. */
export interface UsageTrackerOptions {
  /** Maximum number of records to retain in memory. Defaults to 1000. */
  maxRecords?: number;
}

/**
 * The UsageTracker records and aggregates token usage.
 */
export interface UsageTracker {
  /**
   * Records a usage record. Never throws.
   */
  record(record: UsageRecord): void;

  /**
   * Returns the aggregate usage for a provider/model key.
   */
  aggregate(provider: ProviderId, model: string): UsageAggregate | undefined;

  /**
   * Returns all aggregates.
   */
  aggregates(): UsageAggregate[];

  /**
   * Returns all raw records.
   */
  records(): UsageRecord[];

  /**
   * Clears all recorded usage.
   */
  clear(): void;
}
