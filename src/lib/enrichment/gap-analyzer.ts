/**
 * AWIE V2 — Dynamic Gap Analyzer.
 *
 * A provider-independent, pure Gap Analyzer. It identifies high-value
 * information deficiencies in an already-generated site by inspecting the
 * existing semantic contracts (BusinessMeaning, DecisionPlan, ContentPlan) and
 * any available evidence.
 *
 * PRIMARY SIGNAL:
 *   Capabilities in GENERIC state are potential information gaps. GENERIC means
 *   "business meaning is clear but concrete data is insufficient" — exactly the
 *   condition where a targeted question can materially improve the site copy.
 *
 * PRIORITIZATION (industry-agnostic and semantic):
 *   Gaps are NOT blindly emitted one-per-GENERIC-capability. Each candidate is
 *   scored by:
 *     1. business criticality  (from the DecisionPlan CapabilityPriority)
 *     2. conversion importance (CONVERSION_CRITICAL / BUSINESS_CRITICAL first)
 *     3. information deficiency (GENERIC state + no backing evidence)
 *     4. material improvement  (whether the missing info can improve copy)
 *   The result is a normalized, prioritized list capped at MAX_GAPS (3–5).
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - This module is PURE. No LLM, no randomness, no external API, no UI.
 *   - It NEVER invents facts. It only reports deficiencies.
 *   - It NEVER branches on industry names. It operates on the canonical
 *     Capability / SemanticTrait vocabulary.
 *   - It does NOT modify DecisionPlan, ContentPlan, or BusinessMeaning.
 *
 * STRICT CONSTRAINT: This module MUST NOT import React, HTML, CSS, Renderer,
 * ThemeConfig, or any UI concept.
 */

import { CapabilityState, type CapabilityId } from '../brain/capability';
import type { DecisionPlan, PlannedCapability } from '../brain/decision-plan';
import { CapabilityPriority } from '../brain/decision-plan';
import type { ContentPlan } from '../brain/content-plan';
import type { EvidenceSet } from '../brain/evidence';
import type { BusinessMeaning } from '../brain/business-meaning';
import {
  GapPriority,
  MissingInfoCategory,
  type EnrichmentGap,
  type GapAnalysisInput,
  type GapPriorityValue,
  type MissingInfoCategoryValue,
} from './types';

/** The maximum number of gaps/questions the analyzer may return. */
export const MAX_GAPS = 5;

/** The minimum number of gaps/questions the analyzer may return. */
export const MIN_GAPS = 3;

/**
 * The semantic profile of a capability for gap analysis.
 *
 * This is the industry-agnostic mapping from a canonical Capability to its
 * missing-information category, its default gap priority, and the semantic
 * reason template. It is NOT a UI concept and NOT an industry branch.
 */
interface CapabilityGapProfile {
  /** The missing semantic information category. */
  missingCategory: MissingInfoCategoryValue;
  /** The default gap priority when the DecisionPlan does not override it. */
  defaultPriority: GapPriorityValue;
  /** A semantic reason template (filled with the capability id). */
  reason: string;
}

/**
 * The canonical capability → gap profile map.
 *
 * Every canonical Capability has a semantic gap profile. This is the ONLY place
 * that maps capabilities to missing-information categories. It is fully
 * industry-agnostic.
 */
const CAPABILITY_GAP_PROFILES: Record<CapabilityId, CapabilityGapProfile> = {
  discovery: {
    missingCategory: MissingInfoCategory.offering,
    defaultPriority: GapPriority.BUSINESS_CRITICAL,
    reason:
      'The offering is only generic; concrete services/products would materially improve discovery copy.',
  },
  purchase: {
    missingCategory: MissingInfoCategory.transaction,
    defaultPriority: GapPriority.CONVERSION_CRITICAL,
    reason:
      'A transactional capability is generic; concrete purchase details would materially improve conversion copy.',
  },
  booking: {
    missingCategory: MissingInfoCategory.schedule,
    defaultPriority: GapPriority.CONVERSION_CRITICAL,
    reason:
      'The booking capability is generic; concrete hours/schedule would materially improve conversion copy.',
  },
  inquiry: {
    missingCategory: MissingInfoCategory.contact,
    defaultPriority: GapPriority.CONVERSION_CRITICAL,
    reason:
      'The inquiry capability is generic; a concrete contact method would materially improve conversion copy.',
  },
  lead_capture: {
    missingCategory: MissingInfoCategory.lead,
    defaultPriority: GapPriority.BUSINESS_CRITICAL,
    reason:
      'Lead capture is generic; a concrete offer/incentive would materially improve lead copy.',
  },
  location: {
    missingCategory: MissingInfoCategory.location,
    defaultPriority: GapPriority.SUPPORTING,
    reason:
      'The physical location is generic; a concrete address would materially improve location copy.',
  },
  trust: {
    missingCategory: MissingInfoCategory.trust,
    defaultPriority: GapPriority.BUSINESS_CRITICAL,
    reason:
      'Trust formation is generic; concrete team/history/credential signals would materially improve trust copy.',
  },
};

/**
 * Maps a DecisionPlan CapabilityPriority to the GapPriority vocabulary.
 *
 * This aligns the gap priority with the frozen Budget Grammar so the analyzer
 * inherits the Decision Engine's business-criticality ordering.
 */
function toGapPriority(priority: string): GapPriorityValue {
  switch (priority) {
    case CapabilityPriority.MANDATORY:
      return GapPriority.MANDATORY;
    case CapabilityPriority.CONVERSION_CRITICAL:
      return GapPriority.CONVERSION_CRITICAL;
    case CapabilityPriority.BUSINESS_CRITICAL:
      return GapPriority.BUSINESS_CRITICAL;
    case CapabilityPriority.SUPPORTING:
      return GapPriority.SUPPORTING;
    case CapabilityPriority.DECORATIVE:
      return GapPriority.DECORATIVE;
    default:
      return GapPriority.SUPPORTING;
  }
}

/**
 * The numeric ordering used to sort gaps by priority (highest first).
 */
const PRIORITY_ORDER: Record<GapPriorityValue, number> = {
  MANDATORY: 0,
  CONVERSION_CRITICAL: 1,
  BUSINESS_CRITICAL: 2,
  SUPPORTING: 3,
  DECORATIVE: 4,
};

/**
 * Returns whether a capability already has sufficient backing evidence.
 *
 * A capability is considered "information-sufficient" when the available
 * evidence set contains at least one evidence item whose subject references the
 * capability. This prevents asking for information the user has already
 * provided. It NEVER treats missing evidence as a fact.
 */
function hasBackingEvidence(
  capability: CapabilityId,
  evidence: EvidenceSet[] | undefined,
): boolean {
  if (!evidence || evidence.length === 0) return false;
  return evidence.some((set) => set.subject === capability);
}

/**
 * The pure Gap Analyzer.
 *
 * Consumes the existing semantic contracts and returns a normalized, prioritized
 * list of enrichment gaps. It is deterministic: the same input always produces
 * the same output. It never mutates its inputs.
 */
export class GapAnalyzer {
  /**
   * Analyzes the given semantic inputs for enrichment gaps.
   *
   * @param input The semantic inputs (BusinessMeaning, DecisionPlan,
   *   ContentPlan, evidence). All are optional so the analyzer degrades
   *   gracefully and never blocks the canonical one-line generation path.
   * @returns A normalized, prioritized list of enrichment gaps (max MAX_GAPS).
   */
  analyze(input: GapAnalysisInput): EnrichmentGap[] {
    const candidates = this.collectCandidates(input);
    const prioritized = this.prioritize(candidates);
    return prioritized.slice(0, MAX_GAPS);
  }

  /**
   * Collects the raw gap candidates from GENERIC capabilities.
   *
   * A candidate is produced ONLY when:
   *   - the capability is in GENERIC state (primary signal), AND
   *   - the capability has no backing evidence (information deficiency), AND
   *   - the capability is not already concretely covered by the ContentPlan.
   */
  private collectCandidates(input: GapAnalysisInput): EnrichmentGap[] {
    const plan = input.decisionPlan;
    if (!plan || plan.capabilities.length === 0) {
      return [];
    }

    const candidates: EnrichmentGap[] = [];
    for (const planned of plan.capabilities) {
      // PRIMARY SIGNAL: only GENERIC capabilities are potential gaps.
      if (planned.state !== CapabilityState.GENERIC) {
        continue;
      }

      const profile = CAPABILITY_GAP_PROFILES[planned.capability];
      if (!profile) {
        continue;
      }

      // Information deficiency: skip if the user already provided evidence.
      if (hasBackingEvidence(planned.capability, input.evidence)) {
        continue;
      }

      // Material improvement: skip if the ContentPlan already concretely covers
      // this capability (factAvailability is not generic_safe).
      if (this.isConcretelyCovered(planned.capability, input.contentPlan)) {
        continue;
      }

      candidates.push({
        capability: planned.capability,
        priority: toGapPriority(planned.priority),
        reason: profile.reason,
        missingCategory: profile.missingCategory,
        recommendedSlot: this.recommendSlot(planned.capability),
        recommendedIntent: this.recommendIntent(planned.capability),
      });
    }

    return candidates;
  }

  /**
   * Returns whether the ContentPlan already concretely covers a capability.
   *
   * A requirement whose factAvailability is NOT `generic_safe` and NOT
   * `unavailable` means the pipeline already has concrete facts for it, so
   * asking for more would not materially improve the copy.
   */
  private isConcretelyCovered(
    capability: CapabilityId,
    contentPlan: ContentPlan | undefined,
  ): boolean {
    if (!contentPlan) return false;
    return contentPlan.requirements.some(
      (req) =>
        req.capability === capability &&
        req.factAvailability !== 'generic_safe' &&
        req.factAvailability !== 'unavailable',
    );
  }

  /**
   * Prioritizes gap candidates.
   *
   * The priority policy is industry-agnostic and semantic:
   *   1. Higher business criticality (from the DecisionPlan priority) first.
   *   2. Conversion-critical capabilities before supporting ones.
   *   3. Deterministic tie-break by capability id for stability.
   */
  private prioritize(candidates: EnrichmentGap[]): EnrichmentGap[] {
    return [...candidates].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority];
      const pb = PRIORITY_ORDER[b.priority];
      if (pa !== pb) return pa - pb;
      return a.capability.localeCompare(b.capability);
    });
  }

  /**
   * Recommends the closest existing Question Engine slot for a capability.
   *
   * This reuses the canonical Question Engine slot vocabulary. It does NOT
   * invent a new taxonomy. Each capability maps to the closest existing slot.
   */
  private recommendSlot(capability: CapabilityId): EnrichmentGap['recommendedSlot'] {
    switch (capability) {
      case 'discovery':
      case 'purchase':
        return 'services';
      case 'inquiry':
      case 'lead_capture':
      case 'booking':
        return 'contactPreference';
      case 'location':
        return 'optionalPreferences';
      case 'trust':
        return 'personality';

      default:
        return 'optionalPreferences';
    }
  }

  /**
   * Recommends a semantic question intent for a capability.
   *
   * The intent is semantic (what information is missing), not a UI instruction.
   */
  private recommendIntent(capability: CapabilityId): string {
    switch (capability) {
      case 'discovery':
        return 'discover_offering';
      case 'purchase':
        return 'purchase_details';
      case 'booking':
        return 'booking_schedule';
      case 'inquiry':
        return 'contact_method';
      case 'lead_capture':
        return 'lead_offer';
      case 'location':
        return 'location_address';
      case 'trust':
        return 'trust_signals';
      default:
        return 'clarify';
    }
  }
}

/**
 * Convenience function: run the Gap Analyzer in one call.
 */
export function analyzeGaps(input: GapAnalysisInput): EnrichmentGap[] {
  return new GapAnalyzer().analyze(input);
}
