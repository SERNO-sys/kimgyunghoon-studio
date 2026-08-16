/**
 * AWIE V2 — Enrichment types.
 *
 * The provider-independent enrichment contracts. These types are consumed by
 * the Gap Analyzer, Question Mapper, Enrichment Service, and Answer Ingestion
 * Bridge. They are PURE data contracts — no UI, no Renderer, no ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import type { SlotKey } from '../question-engine/brief';
import type { CapabilityId } from '../brain/capability';
import type { DecisionPlan } from '../brain/decision-plan';
import type { ContentPlan } from '../brain/content-plan';
import type { EvidenceSet } from '../brain/evidence';
import type { BusinessMeaning } from '../brain/business-meaning';

/**
 * The gap priority vocabulary.
 *
 * This is the semantic priority of an enrichment gap. It aligns with the frozen
 * Budget Grammar (MANDATORY → CONVERSION_CRITICAL → BUSINESS_CRITICAL →
 * SUPPORTING → DECORATIVE).
 */
export const GapPriority = {
  MANDATORY: 'MANDATORY',
  CONVERSION_CRITICAL: 'CONVERSION_CRITICAL',
  BUSINESS_CRITICAL: 'BUSINESS_CRITICAL',
  SUPPORTING: 'SUPPORTING',
  DECORATIVE: 'DECORATIVE',
} as const;

/** The union of all valid GapPriority values. */
export type GapPriorityValue =
  (typeof GapPriority)[keyof typeof GapPriority];

/**
 * The missing semantic information category.
 *
 * This is the semantic category of information that is deficient for a
 * capability. It is industry-agnostic.
 */
export const MissingInfoCategory = {
  offering: 'offering',
  transaction: 'transaction',
  schedule: 'schedule',
  contact: 'contact',
  lead: 'lead',
  location: 'location',
  trust: 'trust',
} as const;

/** The union of all valid MissingInfoCategory values. */
export type MissingInfoCategoryValue =
  (typeof MissingInfoCategory)[keyof typeof MissingInfoCategory];

/**
 * A single enrichment gap.
 *
 * A gap describes a high-value information deficiency for a capability. It
 * carries the capability, its priority, the reason, the missing semantic
 * information category, and the recommended Question Engine slot/intent.
 */
export interface EnrichmentGap {
  /** The semantic capability with the information gap. */
  capability: CapabilityId;
  /** The semantic priority of this gap. */
  priority: GapPriorityValue;
  /** Why this gap is worth asking about. */
  reason: string;
  /** The missing semantic information category. */
  missingCategory: MissingInfoCategoryValue;
  /** The closest existing Question Engine slot. */
  recommendedSlot: SlotKey;
  /** The semantic question intent. */
  recommendedIntent: string;
}

/**
 * An enrichment question.
 *
 * A question targets an existing Question Engine slot. It is semantic (what
 * information is missing), not a UI instruction.
 */
export interface EnrichmentQuestion {
  /** A stable identifier for this question. */
  id: string;
  /** The existing Question Engine slot this question targets. */
  slot: SlotKey;
  /** The human-readable question text. */
  text: string;
  /** The semantic question intent. */
  intent: string;
  /** The capability this question is meant to enrich. */
  gapCapability: CapabilityId;
}

/**
 * An enrichment answer.
 *
 * An answer is user-provided input for a specific question. It becomes semantic
 * business evidence (user_asserted provenance), never a UI instruction.
 */
export interface EnrichmentAnswer {
  /** The question this answer responds to. */
  questionId: string;
  /** The Question Engine slot this answer fills. */
  slot: SlotKey;
  /** The user-provided answer text. */
  text: string;
}

/**
 * The enrichment result.
 *
 * This is the provider-independent interface the UI can consume later.
 */
export interface EnrichmentResult {
  /** The prioritized enrichment gaps (max 3–5). */
  gaps: EnrichmentGap[];
  /** The enrichment questions (one per gap). */
  questions: EnrichmentQuestion[];
  /** The overall enrichment priority. */
  priority: GapPriorityValue;
  /** Whether enrichment is ready (i.e. there is at least one gap). */
  enrichmentReady: boolean;
}

/**
 * The input to the Gap Analyzer / Enrichment Service.
 *
 * All fields are optional so the analyzer degrades gracefully and never blocks
 * the canonical one-line generation path.
 */
export interface GapAnalysisInput {
  /** The normalized business meaning, if available. */
  businessMeaning?: BusinessMeaning;
  /** The decision plan, if available. */
  decisionPlan?: DecisionPlan;
  /** The content plan, if available. */
  contentPlan?: ContentPlan;
  /** The available evidence/data, if any. */
  evidence?: EvidenceSet[];
  /** The raw prompt text, used to resolve the enrichment question language. */
  prompt?: string | null;
  /** An optional explicit language hint (code, region-tagged code, or name). */
  languageHint?: string | null;
}
