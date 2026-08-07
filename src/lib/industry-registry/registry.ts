/**
 * AWIE V2 - The Industry Registry Manager.
 *
 * A simple, deterministic registry of IndustryProfiles. It ONLY stores and
 * retrieves data. It does NOT execute business logic or make presentation
 * decisions.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure data storage.
 */

import type { IndustryId, IndustryProfile } from './types';

/** Thrown when an industryId is registered twice. */
export class DuplicateIndustryError extends Error {
  constructor(industryId: IndustryId) {
    super(`Industry "${industryId}" is already registered.`);
    this.name = 'DuplicateIndustryError';
  }
}

/** Thrown when an industryId is not found. */
export class UnknownIndustryError extends Error {
  constructor(industryId: IndustryId) {
    super(`Industry "${industryId}" is not registered.`);
    this.name = 'UnknownIndustryError';
  }
}

/**
 * The IndustryRegistry.
 *
 * Stores IndustryProfiles keyed by industryId. Provides register, unregister,
 * get, has, and list operations.
 */
export class IndustryRegistry {
  private readonly profiles = new Map<IndustryId, IndustryProfile>();

  /** Registers a profile. Throws DuplicateIndustryError if already present. */
  register(profile: IndustryProfile): void {
    if (this.profiles.has(profile.industryId)) {
      throw new DuplicateIndustryError(profile.industryId);
    }
    this.profiles.set(profile.industryId, profile);
  }

  /** Unregisters a profile. Returns true if it was removed. */
  unregister(industryId: IndustryId): boolean {
    return this.profiles.delete(industryId);
  }

  /** Returns the profile for an industryId, or undefined. */
  get(industryId: IndustryId): IndustryProfile | undefined {
    return this.profiles.get(industryId);
  }

  /** Returns whether an industryId is registered. */
  has(industryId: IndustryId): boolean {
    return this.profiles.has(industryId);
  }

  /** Returns all registered profiles. */
  list(): IndustryProfile[] {
    return Array.from(this.profiles.values());
  }

  /** Returns the number of registered profiles. */
  get size(): number {
    return this.profiles.size;
  }
}
