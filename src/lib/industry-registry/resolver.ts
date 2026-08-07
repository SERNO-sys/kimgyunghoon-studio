/**
 * AWIE V2 - The Industry Resolver & Normalization Pipeline.
 *
 * Resolves a raw user input (e.g. "  Coffee-Shop!  ") to an IndustryProfile by
 * normalizing the input and matching it against registered aliases.
 *
 * Normalization pipeline steps:
 *   trim -> lowercase -> remove punctuation -> collapse whitespace
 *
 * If no alias matches, a safe fallback profile (e.g. generic/unknown) is
 * returned.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure normalization + lookup.
 */

import type { IndustryProfile } from './types';
import type { IndustryRegistry } from './registry';

/** The result of resolving a raw input. */
export interface ResolutionResult {
  /** The resolved profile (or the fallback). */
  profile: IndustryProfile;
  /** Whether the input matched a registered industry. */
  matched: boolean;
  /** The normalized form of the input. */
  normalized: string;
}

/**
 * The Normalizer.
 *
 * Applies the normalization pipeline to a raw string.
 */
export class Normalizer {
  /**
   * Normalizes a raw string:
   *   trim -> lowercase -> replace separators with spaces -> remove
   *   punctuation -> collapse whitespace.
   *
   * Example: "  Coffee-Shop!  " -> "coffee shop"
   */
  normalize(input: string): string {
    return input
      .trim()
      .toLowerCase()
      // Convert word separators (hyphen, underscore, slash) into spaces so
      // "Coffee-Shop" becomes "coffee shop" rather than "coffeeshop".
      .replace(/[-_/]/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

}

/**
 * The IndustryResolver.
 *
 * Normalizes raw user input and matches it against registered aliases.
 */
export class IndustryResolver {
  private readonly normalizer: Normalizer;
  private readonly fallback: IndustryProfile;

  constructor(
    private readonly registry: IndustryRegistry,
    fallback: IndustryProfile,
    normalizer?: Normalizer,
  ) {
    this.normalizer = normalizer ?? new Normalizer();
    this.fallback = fallback;
  }

  /**
   * Resolves a raw input to an IndustryProfile.
   *
   * Returns the fallback profile if no alias matches.
   */
  resolve(input: string): ResolutionResult {
    const normalized = this.normalizer.normalize(input);
    if (!normalized) {
      return { profile: this.fallback, matched: false, normalized };
    }

    for (const profile of this.registry.list()) {
      for (const alias of profile.aliases) {
        if (this.normalizer.normalize(alias) === normalized) {
          return { profile, matched: true, normalized };
        }
      }
    }

    return { profile: this.fallback, matched: false, normalized };
  }
}
