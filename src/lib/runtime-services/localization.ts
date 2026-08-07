/**
 * AWIE V2 - Phase 11: Localization Service.
 *
 * The Localization service is a PLATFORM SERVICE that provides locale-aware
 * string lookup. The Renderer consumes this through its RenderContext.locale.
 *
 * THE ULTIMATE LAW: "AI decides. Runtime executes."
 *
 * The Localization service is the EXECUTION layer. It:
 *   1. TRANSFORMS - translates keys to localized strings.
 *
 * ARCHITECTURAL MANDATES:
 *   1. ZERO BUSINESS LOGIC - It NEVER imports BusinessBrief, IndustryProfile,
 *      or RecipeBlueprint. It operates ONLY on locale dictionaries.
 *   2. ZERO RENDERING - It NEVER renders UI. It only translates keys.
 *   3. DETERMINISM - Same locale + key -> same string. No randomness.
 *   4. O(1) LOOKUP - Uses a Map for O(1) translation. No Array.find().
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

import { BaseService } from './core';
import type { RuntimeEventBus } from './core';
import type { LocalizationService, LocaleDictionary } from './types';

/**
 * The default Localization service.
 *
 * Provides locale-aware string lookup with parameter interpolation. It is
 * deterministic: given the same locale and key, it always returns the same
 * string.
 *
 * Interpolation: a key like "greeting" with value "Hello, {name}!" and params
 * { name: "World" } produces "Hello, World!".
 *
 * It implements the UNIVERSAL RuntimeService contract (lifecycle + health) and
 * emits "localization:translate" events on the RuntimeEventBus for
 * observability.
 */
export class DefaultLocalization
  extends BaseService
  implements LocalizationService
{
  /** The stable service id. */
  readonly id = 'localization' as const;

  /** The active locale. */
  private readonly locale: string;

  /** The O(1) translation lookup map. */
  private readonly dictionary: ReadonlyMap<string, string>;

  /**
   * Constructs a DefaultLocalization.
   *
   * @param locale The active locale (e.g. "ko", "en").
   * @param dictionary The locale dictionary.
   * @param bus The optional RuntimeEventBus for observability.
   */
  constructor(
    locale: string,
    dictionary: LocaleDictionary,
    bus?: RuntimeEventBus,
  ) {
    super(bus);
    this.locale = locale;
    this.dictionary = new Map(Object.entries(dictionary));
  }


  /**
   * Returns the active locale.
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Translates a key in the active locale.
   *
   * @param key The translation key.
   * @param params Optional interpolation parameters.
   * @returns The localized string, or the key itself if not found.
   */
  translate(key: string, params?: Record<string, string | number>): string {
    const template = this.dictionary.get(key);
    if (template === undefined) {
      return key;
    }
    if (!params) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      return value === undefined ? match : String(value);
    });
  }

  /**
   * Returns whether a key exists in the active locale.
   *
   * @param key The translation key.
   */
  has(key: string): boolean {
    return this.dictionary.has(key);
  }
}
