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
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import type { SlotKey } from '../question-engine/brief';
import type { CapabilityId } from '../brain/capability';
import type { EnrichmentGap, EnrichmentQuestion } from './types';

/**
 * The canonical question text templates, keyed by Question Engine slot.
 *
 * Each template is a function that produces a human-readable question targeting
 * the given slot. The text is semantic (what information is missing), not a UI
 * instruction. It is industry-agnostic.
 */
const SLOT_QUESTION_TEMPLATES: Record<SlotKey, (capability: CapabilityId) => string> = {
  businessType: () =>
    'What type of business is this? (e.g. the primary offering or service)',
  goals: () => 'What is the primary goal for this website?',
  audience: () => 'Who is the primary audience you want to reach?',
  personality: () =>
    'What tone or personality should the site convey to build trust?',
  services: () =>
    'What specific products or services should be highlighted?',
  contactPreference: () =>
    'What is the preferred way for customers to contact you?',
  optionalPreferences: () =>
    'Are there any additional details (hours, location, booking) you would like to include?',
};

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
 */
export class QuestionMapper {
  /**
   * Maps enrichment gaps to enrichment questions.
   *
   * @param gaps The prioritized enrichment gaps (already capped at 3–5).
   * @returns A list of enrichment questions, one per gap, each targeting an
   *   existing Question Engine slot.
   */
  map(gaps: EnrichmentGap[]): EnrichmentQuestion[] {
    return gaps.map((gap, index) => ({
      id: `enrich-${index + 1}`,
      slot: gap.recommendedSlot,
      text: SLOT_QUESTION_TEMPLATES[gap.recommendedSlot](gap.capability),
      intent: SLOT_INTENTS[gap.recommendedSlot],
      gapCapability: gap.capability,
    }));
  }
}

/**
 * Convenience function: map gaps to questions in one call.
 */
export function mapGapsToQuestions(gaps: EnrichmentGap[]): EnrichmentQuestion[] {
  return new QuestionMapper().map(gaps);
}
