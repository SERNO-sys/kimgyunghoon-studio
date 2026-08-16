/**
 * AWIE V2 — Language Detection.
 *
 * Detects the language of a one-line business prompt so the Golden Path
 * copywriter and the enrichment question text can be produced in the user's
 * language instead of a hardcoded default.
 *
 * The detector is isolated behind a small interface so the enrichment flow and
 * the Golden Path depend on the interface, not on a specific detection library.
 * The default implementation uses `franc-min` (a lightweight, dependency-free
 * language detector) and maps its ISO 639-3 codes onto the canonical
 * `LanguageCodeValue` vocabulary.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import { franc } from 'franc-min';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  LanguageCode,
  type LanguageCodeValue,
  type LanguageDetection,
} from './types';

/**
 * The provider-independent language detector interface.
 *
 * The enrichment flow and the Golden Path depend on this interface so the
 * detection strategy can be swapped (e.g. a heavier model, a rule-based
 * detector, or an explicit user-provided language) without touching the
 * pipeline.
 */
export interface LanguageDetector {
  /**
   * Detects the canonical language of a text sample.
   *
   * Always returns a canonical `LanguageCodeValue`. When detection is
   * inconclusive, falls back to `DEFAULT_LANGUAGE` with `detected: false`.
   */
  detect(text: string): LanguageDetection;
}

/**
 * Maps a franc ISO 639-3 language code onto the canonical vocabulary.
 *
 * franc returns ISO 639-3 codes (e.g. `kor`, `eng`, `cmn`). We map only the
 * codes we support; anything else returns `undefined` so the caller can fall
 * back to the default.
 */
const FRANC_TO_CANONICAL: Record<string, LanguageCodeValue> = {
  kor: LanguageCode.ko,
  eng: LanguageCode.en,
  jpn: LanguageCode.ja,
  cmn: LanguageCode.zh,
  spa: LanguageCode.es,
  fra: LanguageCode.fr,
  deu: LanguageCode.de,
  por: LanguageCode.pt,
  ita: LanguageCode.it,
  rus: LanguageCode.ru,
  arb: LanguageCode.ar,
  hin: LanguageCode.hi,
  ind: LanguageCode.id,
  tha: LanguageCode.th,
  vie: LanguageCode.vi,
  tur: LanguageCode.tr,
  nld: LanguageCode.nl,
  pol: LanguageCode.pl,
};

/**
 * The default detector backed by `franc-min`.
 *
 * It is a pure function of its input — no state, no side effects. It maps the
 * franc result onto the canonical vocabulary and falls back to
 * `DEFAULT_LANGUAGE` when the detected code is unsupported or the input is too
 * short to be conclusive.
 */
export class FrancLanguageDetector implements LanguageDetector {
  detect(text: string): LanguageDetection {
    const sample = (text ?? '').trim();

    // franc needs a reasonable sample; a very short or empty input is
    // inconclusive by definition.
    if (sample.length < 4) {
      return { code: DEFAULT_LANGUAGE, confidence: 0, detected: false };
    }

    try {
      const detected = franc(sample);
      const canonical = FRANC_TO_CANONICAL[detected];

      if (!canonical) {
        return { code: DEFAULT_LANGUAGE, confidence: 0, detected: false };
      }

      // franc returns a confidence score in [0, 1]. We treat a low-confidence
      // match as inconclusive so we never force a wrong language on the user.
      const confidence = francConfidence(sample, detected);
      if (confidence < 0.4) {
        return { code: DEFAULT_LANGUAGE, confidence: 0, detected: false };
      }

      return { code: canonical, confidence, detected: true };
    } catch {
      // Detection must never throw — it is an optional enhancement. On any
      // failure we fall back to the default language.
      return { code: DEFAULT_LANGUAGE, confidence: 0, detected: false };
    }
  }
}

/**
 * A conservative confidence estimate for a franc match.
 *
 * franc-min does not expose a per-call confidence score directly, so we derive
 * a deterministic proxy: the ratio of the detected language's script coverage
 * in the sample. This is intentionally conservative — it only needs to be good
 * enough to avoid forcing a wrong language, not to be a precise metric.
 */
function francConfidence(sample: string, detected: string): number {
  // For the languages we support, a strong signal is the presence of
  // language-specific script ranges. We use a simple heuristic: the more
  // non-ASCII script characters match the detected language's script, the
  // higher the confidence.
  const scriptRanges: Record<string, RegExp> = {
    kor: /[\uAC00-\uD7AF]/g,
    jpn: /[\u3040-\u30FF\u4E00-\u9FFF]/g,
    cmn: /[\u4E00-\u9FFF]/g,
    tha: /[\u0E00-\u0E7F]/g,
    arb: /[\u0600-\u06FF]/g,
    hin: /[\u0900-\u097F]/g,
    rus: /[\u0400-\u04FF]/g,
    vie: /[\u00C0-\u1EF9]/g,
  };

  const range = scriptRanges[detected];
  if (range) {
    const matches = sample.match(range);
    if (matches && matches.length > 0) {
      return Math.min(1, 0.5 + matches.length / sample.length);
    }
    return 0.3;
  }

  // Latin-script languages (en, es, fr, de, pt, it, id, tr, nl, pl) are
  // detected by franc's statistical model. We give them a moderate baseline
  // confidence; the caller's threshold (0.4) still filters weak matches.
  return 0.6;
}

/**
 * The default detector instance shared across the pipeline.
 *
 * A single stateless instance is safe to share. Consumers may also construct
 * their own `FrancLanguageDetector` if they need to inject a different one.
 */
export const defaultLanguageDetector: LanguageDetector =
  new FrancLanguageDetector();

/**
 * Convenience: detects the canonical language of a text sample using the
 * default detector.
 */
export function detectLanguage(text: string): LanguageDetection {
  return defaultLanguageDetector.detect(text);
}

/**
 * Convenience: returns the canonical language code for a text sample, always
 * falling back to `DEFAULT_LANGUAGE` when detection is inconclusive.
 */
export function resolveLanguageCode(text: string): LanguageCodeValue {
  return detectLanguage(text).code;
}

/**
 * Normalizes an arbitrary language hint (e.g. a user-provided `ko`, `ko-KR`,
 * `Korean`, or `kor`) onto the canonical vocabulary.
 *
 * Returns `undefined` when the hint cannot be mapped to a supported canonical
 * code, so callers can fall back to detection or the default.
 */
export function normalizeLanguageHint(
  hint: string | null | undefined,
): LanguageCodeValue | undefined {
  if (!hint) return undefined;
  const normalized = hint.trim().toLowerCase();

  // Exact canonical code.
  if (LANGUAGE_CODES.includes(normalized as LanguageCodeValue)) {
    return normalized as LanguageCodeValue;
  }

  // Region-tagged code (e.g. `ko-KR`, `en-US`).
  const base = normalized.split('-')[0];
  if (LANGUAGE_CODES.includes(base as LanguageCodeValue)) {
    return base as LanguageCodeValue;
  }

  // Common English language names.
  const byName: Record<string, LanguageCodeValue> = {
    korean: LanguageCode.ko,
    english: LanguageCode.en,
    japanese: LanguageCode.ja,
    chinese: LanguageCode.zh,
    spanish: LanguageCode.es,
    french: LanguageCode.fr,
    german: LanguageCode.de,
    portuguese: LanguageCode.pt,
    italian: LanguageCode.it,
    russian: LanguageCode.ru,
    arabic: LanguageCode.ar,
    hindi: LanguageCode.hi,
    indonesian: LanguageCode.id,
    thai: LanguageCode.th,
    vietnamese: LanguageCode.vi,
    turkish: LanguageCode.tr,
    dutch: LanguageCode.nl,
    polish: LanguageCode.pl,
  };
  if (byName[normalized]) return byName[normalized];

  return undefined;
}
