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
      // Remove whitespace between Hangul characters so Korean spacing variants
      // ("심리 상담 센터") normalize to the same compact form as the alias
      // ("심리상담센터"). Latin and other scripts are unaffected.
      .replace(/(\p{Script=Hangul})\s+(\p{Script=Hangul})/gu, '$1$2')
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
        const normalizedAlias = this.normalizer.normalize(alias);

        // 1. Exact match. Preserves the existing behavior for short inputs
        //    (e.g. "상담", "cafe", "Coffee-Shop!").
        if (normalizedAlias === normalized) {
          return { profile, matched: true, normalized };
        }

        // 2. Restricted containment for Korean (Hangul) aliases only.
        //    Handles Korean spacing variants inside a longer sentence
        //    (e.g. "심리 상담 센터" → "심리상담센터") WITHOUT introducing
        //    broad substring matching for Latin aliases. Aliases shorter than
        //    3 Hangul syllables are excluded to avoid false positives (e.g. the
        //    generic "상담" matching "법률상담" legal consultation).
        if (
          normalizedAlias.length >= 3 &&
          /^\p{Script=Hangul}+$/u.test(normalizedAlias) &&
          normalized.includes(normalizedAlias)
        ) {
          return { profile, matched: true, normalized };
        }
      }
    }

    return { profile: this.fallback, matched: false, normalized };
  }
}


