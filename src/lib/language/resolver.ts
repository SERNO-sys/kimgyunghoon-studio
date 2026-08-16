/**
 * AWIE V2 — Canonical Language Resolver.
 *
 * Resolves the canonical language for a build/enrichment request. The
 * resolution order is:
 *
 *   1. An explicit user-provided language hint (highest priority).
 *   2. Language detection from the prompt text.
 *   3. The canonical default (`DEFAULT_LANGUAGE`).
 *
 * The result is ALWAYS a canonical `LanguageCodeValue` — never a free-form
 * string — so the copywriter and the enrichment question text are guaranteed
 * to be produced in a supported language.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import {
  normalizeLanguageHint,
  type LanguageDetector,
} from './detect';
import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  type LanguageCodeValue,
  type LanguageContext,
} from './types';

/** The human-readable label for each canonical language code. */
const LANGUAGE_LABELS: Record<LanguageCodeValue, string> = {
  [LanguageCode.ko]: 'Korean',
  [LanguageCode.en]: 'English',
  [LanguageCode.ja]: 'Japanese',
  [LanguageCode.zh]: 'Chinese',
  [LanguageCode.es]: 'Spanish',
  [LanguageCode.fr]: 'French',
  [LanguageCode.de]: 'German',
  [LanguageCode.pt]: 'Portuguese',
  [LanguageCode.it]: 'Italian',
  [LanguageCode.ru]: 'Russian',
  [LanguageCode.ar]: 'Arabic',
  [LanguageCode.hi]: 'Hindi',
  [LanguageCode.id]: 'Indonesian',
  [LanguageCode.th]: 'Thai',
  [LanguageCode.vi]: 'Vietnamese',
  [LanguageCode.tr]: 'Turkish',
  [LanguageCode.nl]: 'Dutch',
  [LanguageCode.pl]: 'Polish',
};

/**
 * Returns the human-readable label for a canonical language code.
 */
export function languageLabel(code: LanguageCodeValue): string {
  return LANGUAGE_LABELS[code] ?? LANGUAGE_LABELS[DEFAULT_LANGUAGE];
}

/**
 * Builds a canonical `LanguageContext` from a canonical code.
 */
export function toLanguageContext(code: LanguageCodeValue): LanguageContext {
  return { code, label: languageLabel(code) };
}

/**
 * The input to the language resolver.
 */
export interface LanguageResolutionInput {
  /** The raw prompt text (used for detection when no hint is provided). */
  prompt?: string | null;
  /** An optional explicit language hint (code, region-tagged code, or name). */
  languageHint?: string | null;
  /** An optional injected detector (defaults to the shared detector). */
  detector?: LanguageDetector;
}

/**
 * The canonical language resolver.
 *
 * It is a pure function of its input — no state, no side effects. It always
 * returns a canonical `LanguageContext`.
 */
export class LanguageResolver {
  private readonly detector: LanguageDetector;

  constructor(detector?: LanguageDetector) {
    this.detector = detector ?? defaultDetector();
  }

  /**
   * Resolves the canonical language for a build/enrichment request.
   *
   * Resolution order: explicit hint → detection → default.
   */
  resolve(input: LanguageResolutionInput): LanguageContext {
    // 1. Explicit hint wins.
    const hinted = normalizeLanguageHint(input.languageHint);
    if (hinted) {
      return toLanguageContext(hinted);
    }

    // 2. Detection from the prompt text.
    if (input.prompt && input.prompt.trim().length > 0) {
      const detection = this.detector.detect(input.prompt);
      if (detection.detected) {
        return toLanguageContext(detection.code);
      }
    }

    // 3. Canonical default.
    return toLanguageContext(DEFAULT_LANGUAGE);
  }
}

// Lazy import of the default detector to avoid a circular dependency at module
// load time. The detector module imports only from `./types`, so this is safe.
let _defaultDetector: LanguageDetector | undefined;
function defaultDetector(): LanguageDetector {
  if (!_defaultDetector) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { defaultLanguageDetector } = require('./detect') as {
      defaultLanguageDetector: LanguageDetector;
    };
    _defaultDetector = defaultLanguageDetector;
  }
  return _defaultDetector;
}

/**
 * The shared resolver instance.
 */
export const defaultLanguageResolver = new LanguageResolver();

/**
 * Convenience: resolves the canonical language context for a prompt.
 */
export function resolveLanguage(
  prompt?: string | null,
  languageHint?: string | null,
): LanguageContext {
  return defaultLanguageResolver.resolve({ prompt, languageHint });
}
