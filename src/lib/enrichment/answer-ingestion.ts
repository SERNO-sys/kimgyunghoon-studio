/**
 * AWIE V2 — Answer Ingestion Bridge.
 *
 * The minimal bridge needed for question answers to re-enter the existing
 * Brain/BusinessBrief/content pipeline. Answers become SEMANTIC business
 * evidence (user_asserted provenance), never UI instructions.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - Answers are evidence/input, NOT facts. They carry `user_asserted`
 *     provenance and are subject to the existing Fact Validator rules.
 *   - Unanswered fields are NOT treated as facts. This bridge only converts
 *     answers that were actually provided.
 *   - This bridge does NOT add ThemeConfig fields, Renderer IDs, CSS, layout
 *     concepts, or component IDs.
 *   - It does NOT modify the canonical one-line generation path.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import { Provenance, type EvidenceSet } from '../brain/evidence';
import type { CapabilityId } from '../brain/capability';
import type { EnrichmentAnswer } from './types';

/**
 * Maps a Question Engine slot to the semantic evidence subject it fills.
 *
 * This is the semantic bridge from a question slot to the evidence subject the
 * Brain pipeline understands. It is industry-agnostic.
 */
const SLOT_TO_EVIDENCE_SUBJECT: Record<string, string> = {
  services: 'offering',
  contactPreference: 'contact',
  optionalPreferences: 'schedule',
  personality: 'trust',
  businessType: 'business_type',
  goals: 'goals',
  audience: 'audience',
};

/**
 * The Answer Ingestion Bridge.
 *
 * Converts a list of enrichment answers into semantic business evidence that
 * can re-enter the Brain/BusinessBrief pipeline. It is deterministic and pure.
 */
export class AnswerIngestionBridge {
  /**
   * Converts enrichment answers into semantic business evidence.
   *
   * @param answers The answers provided by the user.
   * @returns A list of EvidenceSet, one per answered question, keyed by the
   *   semantic subject the answer fills. Empty answers are ignored (never
   *   treated as facts).
   */
  ingest(answers: EnrichmentAnswer[]): EvidenceSet[] {
    const evidence: EvidenceSet[] = [];

    for (const answer of answers) {
      const text = answer.text?.trim();
      // SAFETY: unanswered / blank fields are NOT treated as facts.
      if (!text) continue;

      const subject = SLOT_TO_EVIDENCE_SUBJECT[answer.slot] ?? answer.slot;
      evidence.push({
        subject,
        items: [
          {
            id: `enrich-${answer.questionId}`,
            provenance: Provenance.user_asserted,
            claim: text,
          },
        ],
      });
    }

    return evidence;
  }
}

/**
 * Convenience function: ingest answers in one call.
 */
export function ingestAnswers(answers: EnrichmentAnswer[]): EvidenceSet[] {
  return new AnswerIngestionBridge().ingest(answers);
}

/**
 * The semantic subject a capability maps to for evidence ingestion.
 *
 * This is used to attach ingested evidence back to the originating capability
 * so the Decision Engine can re-evaluate the capability state from GENERIC to
 * ACTIVE when sufficient evidence exists.
 */
export function evidenceSubjectForCapability(
  capability: CapabilityId,
): string {
  switch (capability) {
    case 'discovery':
    case 'purchase':
      return 'offering';
    case 'booking':
      return 'schedule';
    case 'inquiry':
    case 'lead_capture':
      return 'contact';
    case 'location':
      return 'address';
    case 'trust':
      return 'trust';
    default:
      return capability;
  }
}
