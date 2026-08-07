/**
 * AWIE V2 - Phase 11: Cache Service.
 *
 * The Cache service is a PLATFORM SERVICE that provides a generic, key-value
 * cache abstraction. It improves runtime performance by storing frequently
 * accessed values.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Cache service is the EXECUTION layer. It:
 *   1. STORES - caches values for performance.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on opaque key-value pairs.
 *   2. ZERO RENDERING - It NEVER renders UI. It only stores and retrieves.
 *   3. ISOLATION - It is isolated behind an interface so the underlying store
 *      (in-memory, KV, CDN) can be swapped without affecting consumers.
 *   4. O(1) LOOKUP - Uses a Map for O(1) get/set/delete/has.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { CacheEntry, CacheService } from './types';

/**
 * The default in-memory Cache service.
 *
 * A generic, key-value cache backed by a Map. Supports optional TTL (time to
 * live) per entry. Expired entries are treated as absent.
 *
 * The cache is deterministic in its contract: get/set/delete/has/clear.
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "cache:hit"/"cache:miss" events on the RuntimeEventBus for
 * observability.
 */
export class DefaultCache extends BaseService implements CacheService {
  /** The stable service id. */
  readonly id = 'cache' as const;

  /** The O(1) cache store. */
  private readonly store = new Map<string, CacheEntry<unknown>>();

  /**
   * Constructs a DefaultCache.
   *
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(bus?: RuntimeEventBus) {
    super(bus);
  }

  /**
   * Retrieves a cached value by key.
   *
   * @param key The cache key.
   * @returns The cached value, or undefined if absent or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.emit('cache:miss', { key });
      return undefined;
    }
    // Expired entries are treated as absent.
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.emit('cache:miss', { key, reason: 'expired' });
      return undefined;
    }
    this.emit('cache:hit', { key });
    return entry.value as T;
  }

  /**
   * Stores a value under a key with an optional TTL.
   *
   * @param key The cache key.
   * @param value The value to store.
   * @param ttlMs Optional time-to-live in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt =
      ttlMs !== undefined ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiresAt });
    this.emit('cache:set', { key, ttlMs });
  }

  /**
   * Deletes a cached value by key.
   *
   * @param key The cache key.
   */
  delete(key: string): void {
    this.store.delete(key);
    this.emit('cache:delete', { key });
  }

  /**
   * Returns whether a key exists and is not expired.
   *
   * @param key The cache key.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clears all cached values.
   */
  clear(): void {
    this.store.clear();
    this.emit('cache:clear');
  }
}


