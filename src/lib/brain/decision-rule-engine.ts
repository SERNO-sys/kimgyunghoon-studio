/**
 * AWIE V2 Brain — Decision Rule Engine v1.
 *
 * The Decision Rule Engine is the deterministic authority that converts
 * normalized BusinessMeaning into semantic Capability decisions. It is the
 * WHAT layer of the Brain. It is completely blind to HOW the website is
 * rendered.
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - The engine is DETERMINISTIC: the same BusinessMeaning and the same rule
 *     set always produce the same output. No LLM, no randomness, no external
 *     API, no hidden inference, no UI inspection.
 *   - The engine produces semantic Capability decisions only. It never produces
 *     Recipe IDs, component names, layouts, CSS, or URLs.
 *   - The engine does NOT implement the full Decision Budget / Evidence Gate /
 *     Fallback system. Those are separate responsibilities.
 *
 * AI LEAK PREVENTION:
 *   - `BusinessMeaning.impliedCapabilities` is treated as a NON-AUTHORITATIVE
 *     AI hint. The engine NEVER reads it to add capabilities. Capabilities are
 *     derived ONLY from deterministic semantic rules over `primaryIntent`,
 *     `secondaryIntent`, and semantic `traits`. This ensures AI-provided
 *     capability suggestions cannot bypass the Decision Engine.
 */

import type { BusinessMeaning } from './business-meaning';
import {
  DECISION_RULES,
  type CapabilityCandidate,
  type DecisionRule,
} from './decision-rules';
import {
  CapabilityPriority,
  type CapabilityPriorityValue,
} from './decision-plan';
import type { CapabilityDecision, CapabilityId } from './capability';


/**
 * The output of the Decision Rule Engine.
 *
 * This is the semantic input to the DecisionPlan. Each entry is a resolved
 * Capability decision (capability + state). It carries NO UI information.
 *
 * The `CapabilityDecision` type is REUSED from the canonical Capability
 * contract (Step 02) — it is not redefined here.
 */
export interface RuleEngineResult {
  /** The resolved semantic capability decisions. */
  decisions: CapabilityDecision[];
  /** The rule IDs that fired for this input. */
  firedRuleIds: string[];
}


/**
 * Deterministic priority ordering used to resolve conflicts.
 *
 * When multiple rules produce the same capability with different priorities,
 * the highest priority wins. This is an explicit, deterministic mechanism — it
 * is NOT a large conflict-resolution framework.
 *
 * Exported so the Decision Planner (Step 04) can reuse the same deterministic
 * ordering for budget/conflict resolution. This avoids a second, parallel
 * priority system.
 */
export const PRIORITY_RANK: Record<CapabilityPriorityValue, number> = {
  [CapabilityPriority.MANDATORY]: 5,
  [CapabilityPriority.CONVERSION_CRITICAL]: 4,
  [CapabilityPriority.BUSINESS_CRITICAL]: 3,
  [CapabilityPriority.SUPPORTING]: 2,
  [CapabilityPriority.DECORATIVE]: 1,
};

/**
 * The canonical Capability ordering used for deterministic output.
 *
 * Exported so the Decision Planner (Step 04) can reuse the same canonical
 * ordering for stable, deterministic output.
 */
export const CANONICAL_ORDER: CapabilityId[] = [
  'discovery',
  'purchase',
  'booking',
  'inquiry',
  'lead_capture',
  'location',
  'trust',
];


/**
 * Merge a list of CapabilityCandidates into a deterministic set of resolved
 * Capability decisions.
 *
 * Duplicate capabilities are merged into a single decision (no duplicate
 * entries). When conflicting priorities are present, the highest priority wins.
 * The result is ordered deterministically by the canonical Capability order.
 */
export function mergeCandidates(
  candidates: readonly CapabilityCandidate[]
): CapabilityDecision[] {
  // Track the winning candidate (with priority) per capability so that
  // conflicts can be resolved deterministically before emitting the final
  // CapabilityDecision shape (which carries no priority).
  const merged = new Map<CapabilityId, CapabilityCandidate>();

  for (const candidate of candidates) {
    const existing = merged.get(candidate.capability);
    if (!existing) {
      merged.set(candidate.capability, candidate);
      continue;
    }
    // Conflict resolution: keep the higher-priority candidate.
    if (PRIORITY_RANK[candidate.priority] > PRIORITY_RANK[existing.priority]) {
      merged.set(candidate.capability, candidate);
    }
  }

  // Deterministic ordering by canonical Capability order.
  const canonicalOrder: CapabilityId[] = [
    'discovery',
    'purchase',
    'booking',
    'inquiry',
    'lead_capture',
    'location',
    'trust',
  ];
  return canonicalOrder
    .filter((id) => merged.has(id))
    .map((id) => {
      const winner = merged.get(id) as CapabilityCandidate;
      return { capability: winner.capability, state: winner.state };
    });
}


/**
 * Evaluate the Decision Rules against a BusinessMeaning.
 *
 * This is the deterministic entry point. It:
 *   1. Evaluates every rule's semantic condition.
 *   2. Collects the fired candidates.
 *   3. Merges duplicates and resolves conflicts deterministically.
 *   4. Returns the resolved Capability decisions.
 *
 * It NEVER reads `BusinessMeaning.impliedCapabilities` — AI-provided capability
 * suggestions cannot bypass the Decision Engine.
 */
export function evaluateRules(
  meaning: BusinessMeaning,
  rules: readonly DecisionRule[] = DECISION_RULES
): RuleEngineResult {
  const fired: CapabilityCandidate[] = [];
  const firedRuleIds: string[] = [];

  for (const rule of rules) {
    if (rule.condition(meaning)) {
      fired.push(rule.result);
      firedRuleIds.push(rule.id);
    }
  }

  return {
    decisions: mergeCandidates(fired),
    firedRuleIds,
  };
}
