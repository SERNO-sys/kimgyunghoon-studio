/**
 * AWIE V2 - InMemoryUsageTracker.
 *
 * An in-memory UsageTracker implementation. It records token usage and
 * aggregates it by provider/model. Suitable for development, tests, and
 * single-instance deployments. A durable implementation can be added later.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import type { ProviderId } from '../types';
import type { UsageAggregate, UsageRecord, UsageTracker, UsageTrackerOptions } from './types';

/**
 * An in-memory UsageTracker.
 */
export class InMemoryUsageTracker implements UsageTracker {
  private readonly _records: UsageRecord[] = [];
  private readonly maxRecords: number;

  constructor(options: UsageTrackerOptions = {}) {
    this.maxRecords = options.maxRecords ?? 1000;
  }

  record(record: UsageRecord): void {
    this._records.push(record);
    if (this._records.length > this.maxRecords) {
      this._records.splice(0, this._records.length - this.maxRecords);
    }
  }

  aggregate(provider: ProviderId, model: string): UsageAggregate | undefined {
    const matching = this._records.filter((r) => r.provider === provider && r.model === model);

    if (matching.length === 0) {
      return undefined;
    }
    return {
      provider,
      model,
      inputTokens: matching.reduce((sum, r) => sum + r.usage.inputTokens, 0),
      outputTokens: matching.reduce((sum, r) => sum + r.usage.outputTokens, 0),
      totalTokens: matching.reduce((sum, r) => sum + r.usage.totalTokens, 0),
      runs: matching.length,
    };
  }

  aggregates(): UsageAggregate[] {
    const keys = new Map<string, { provider: ProviderId; model: string }>();
    for (const r of this._records) {
      keys.set(`${r.provider}:${r.model}`, { provider: r.provider, model: r.model });
    }
    const result: UsageAggregate[] = [];
    for (const { provider, model } of keys.values()) {
      const agg = this.aggregate(provider, model);
      if (agg) {
        result.push(agg);
      }
    }
    return result;
  }

  records(): UsageRecord[] {
    return [...this._records];
  }

  clear(): void {
    this._records.length = 0;
  }

}
