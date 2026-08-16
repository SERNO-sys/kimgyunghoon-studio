/**
 * AWIE V2 — Canonical Language Vocabulary.
 *
 * The single source of truth for the languages the enrichment flow and the
 * Golden Path copywriter can target. This is a PURE data contract — no UI, no
 * Renderer, no ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

/**
 * The canonical language codes supported by the enrichment flow.
 *
 * These are ISO 639-1 two-letter codes (plus the `zh` macro-language). They are
 * the canonical values passed to the copywriter's `CopywriterConfig.language`
 * and used to localize enrichment question text.
 */
export const LanguageCode = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  zh: 'zh',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  it: 'it',
  ru: 'ru',
  ar: 'ar',
  hi: 'hi',
  id: 'id',
  th: 'th',
  vi: 'vi',
  tr: 'tr',
  nl: 'nl',
  pl: 'pl',
} as const;

/** The union of all valid canonical language codes. */
export type LanguageCodeValue =
  (typeof LanguageCode)[keyof typeof LanguageCode];

/** The canonical list of supported language codes, in canonical order. */
export const LANGUAGE_CODES: readonly LanguageCodeValue[] = [
  LanguageCode.ko,
  LanguageCode.en,
  LanguageCode.ja,
  LanguageCode.zh,
  LanguageCode.es,
  LanguageCode.fr,
  LanguageCode.de,
  LanguageCode.pt,
  LanguageCode.it,
  LanguageCode.ru,
  LanguageCode.ar,
  LanguageCode.hi,
  LanguageCode.id,
  LanguageCode.th,
  LanguageCode.vi,
  LanguageCode.tr,
  LanguageCode.nl,
  LanguageCode.pl,
];

/** The default language used when detection is inconclusive. */
export const DEFAULT_LANGUAGE: LanguageCodeValue = LanguageCode.en;

/**
 * The canonical language context carried through the enrichment flow.
 *
 * This is the single value that drives both the copywriter's output language
 * and the localization of enrichment question text. It is always a canonical
 * `LanguageCodeValue` — never a free-form string.
 */
export interface LanguageContext {
  /** The canonical language code. */
  code: LanguageCodeValue;
  /** The human-readable language name (for display/debugging only). */
  label: string;
}

/**
 * A language detection result.
 *
 * `code` is always a canonical `LanguageCodeValue`. `confidence` is a 0..1
 * score from the underlying detector. When detection is inconclusive, `code`
 * falls back to `DEFAULT_LANGUAGE` and `confidence` is 0.
 */
export interface LanguageDetection {
  /** The canonical detected language code. */
  code: LanguageCodeValue;
  /** The detection confidence (0..1). 0 when inconclusive. */
  confidence: number;
  /** Whether the detection was conclusive (i.e. not a fallback). */
  detected: boolean;
}
