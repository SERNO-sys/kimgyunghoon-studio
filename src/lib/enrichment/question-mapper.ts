/**
 * AWIE V2 — Question Mapping Adapter.
 *
 * Connects semantic enrichment gaps to the EXISTING Question Engine. It does
 * NOT invent a new question taxonomy. It reuses the canonical Question Engine
 * slot vocabulary (SlotKey) and maps each gap to the closest existing slot.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This adapter is PURE and provider-independent.
 *   - It NEVER creates a new Question Engine architecture.
 *   - It NEVER branches on industry names.
 *   - It produces questions that target canonical slots/intents only.
 *   - The question SLOT and INTENT are ALWAYS canonical Question Engine
 *     identifiers. Only the human-readable display TEXT is localized via the
 *     canonical language module (18 supported languages).
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import type { SlotKey } from '../question-engine/brief';
import type { CapabilityId } from '../brain/capability';
import { localizeQuestionText } from '../language';
import { DEFAULT_LANGUAGE, type LanguageCodeValue } from '../language/types';
import type { EnrichmentGap, EnrichmentQuestion } from './types';

/**
 * The semantic intent for each Question Engine slot.
 *
 * This is the canonical intent vocabulary the Question Engine already uses. It
 * is reused verbatim — never re-invented.
 */
const SLOT_INTENTS: Record<SlotKey, string> = {
  businessType: 'business_type',
  goals: 'goals',
  audience: 'audience',
  personality: 'personality',
  services: 'services',
  contactPreference: 'contact_preference',
  optionalPreferences: 'optional_preferences',
};

/**
 * The Question Mapper.
 *
 * Maps a prioritized list of enrichment gaps to a list of enrichment questions
 * that target existing Question Engine slots. It is deterministic and pure.
 *
 * The question text is localized into the resolved language (defaulting to the
 * canonical default). The slot and intent remain canonical Question Engine
 * identifiers so the answer-ingestion bridge can re-enter the Brain pipeline.
 */
export class QuestionMapper {
  /**
   * Maps enrichment gaps to enrichment questions.
   *
   * @param gaps The prioritized enrichment gaps (already capped at 3–5).
   * @param language The canonical language for the question display text.
   *   Defaults to the canonical default language.
   * @returns A list of enrichment questions, one per gap, each targeting an
   *   existing Question Engine slot with localized display text.
   */
  map(
    gaps: EnrichmentGap[],
    language: LanguageCodeValue = DEFAULT_LANGUAGE
  ): EnrichmentQuestion[] {
    return gaps.map((gap, index) => ({
      id: `enrich-${index + 1}`,
      slot: gap.recommendedSlot,
      text: localizeQuestionText(gap.recommendedSlot, language),
      intent: SLOT_INTENTS[gap.recommendedSlot],
      gapCapability: gap.capability,
    }));
  }
}

/**
 * Convenience function: map gaps to questions in one call.
 */
export function mapGapsToQuestions(
  gaps: EnrichmentGap[],
  language: LanguageCodeValue = DEFAULT_LANGUAGE
): EnrichmentQuestion[] {
  return new QuestionMapper().map(gaps, language);
}
