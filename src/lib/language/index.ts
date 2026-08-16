/**
 * AWIE V2 — Language module barrel export.
 *
 * Provides canonical language resolution (detection + explicit hint), the
 * canonical language vocabulary, and localization of enrichment question text.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

export {
  FrancLanguageDetector,
  defaultLanguageDetector,
  detectLanguage,
  normalizeLanguageHint,
  resolveLanguageCode,
  type LanguageDetector,
} from './detect';

export {
  LanguageResolver,
  defaultLanguageResolver,
  languageLabel,
  resolveLanguage,
  toLanguageContext,
  type LanguageResolutionInput,
} from './resolver';

export {
  QUESTION_SLOT_TEXT,
  localizeQuestionText,
  type LocalizedQuestionText,
} from './localization';

export {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  LanguageCode,
  type LanguageCodeValue,
  type LanguageContext,
  type LanguageDetection,
} from './types';
