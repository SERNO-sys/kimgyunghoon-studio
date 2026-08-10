/**
 * AWIE V2 Brain — Decision Planner v1.
 *
 * Step 04. The Decision Planner converts semantic Capability candidates
 * (produced by the Decision Rule Engine) into a validated DecisionPlan.
 *
 * The pipeline is:
 *
 *   BusinessMeaning
 *         ↓
 *   Decision Rules
 *         ↓
 *   Capability Candidates
 *         ↓
 *   Decision State Resolver   (ACTIVE / GENERIC / DORMANT / DROP)
 *         ↓
 *   Decision Budget           (deterministic scope/budget/conflict)
 *         ↓
 *   DecisionPlan
 *
 * ARCHITECTURAL BOUNDARY (Architecture Brain Freeze v1.0):
 *   - The DecisionPlan is the semantic WHAT layer. It describes WHAT the
 *     website needs, never HOW it is rendered.
 *   - The planner NEVER emits Hero.tsx, ProductGrid, CSS classes, grid columns,
 *     pixel spacing, React components, Recipe IDs, or concrete visual variants.
 *   - Evidence is a GATE, not a capability. Evidence never creates a
 *     capability; it only determines how specifically an already-selected
 *     capability can be expressed.
 *   - Missing evidence is NOT automatic DROP. It is resolved by the capability's
 *     semantic fallback policy (GENERIC or DORMANT).
 *   - DROP is reserved for explicit deterministic scope/budget/conflict rules.
 *   - Provenance is preserved. `user_asserted` / `cms` / `imported` are never
 *     silently upgraded to `system_verified`.
 *
 * STRICT CONSTRAINT: This module is PURE and DETERMINISTIC. The same
 * BusinessMeaning + EvidenceSet + RuleSet + Decision configuration always
 * produce the same DecisionPlan. No LLM, no randomness, no current-time
 * dependency, no database, no UI inspection.
 */

import type { BusinessMeaning } from './business-meaning';
import type { EvidenceSet } from './evidence';
import type { CapabilityCandidate } from './decision-rules';
import {
  CANONICAL_ORDER,
  PRIORITY_RANK,
} from './decision-rule-engine';
import {
  CapabilityState,
  type CapabilityStateValue,
  type CapabilityId,
} from './capability';
import {
  type ContentRequirement,
  type DecisionPlan,
  type PlannedCapability,
  type SemanticConstraint,
} from './decision-plan';

import {
  CAPABILITY_DATA_POLICIES,
  resolveCapabilityState,
  type CapabilityDataPolicy,
} from './decision-state-resolver';

/**
 * The deterministic Decision Budget.
 *
 * The budget prevents a pathological combination of capabilities from producing
 * an unbounded DecisionPlan. It is deliberately simple — NOT an elaborate
 * optimization system.
 *
 *   maxActive       — the maximum number of ACTIVE capabilities.
 *   maxRepresented  — the maximum number of represented capabilities
 *                     (ACTIVE + GENERIC). DORMANT and DROP are not counted.
 *
 * When a budget is exceeded, the lowest-priority capabilities are demoted
 * deterministically. This is an explicit scope/budget rule, so the demotion
 * target is DROP.
 */
export interface DecisionBudget {
  /** The maximum number of ACTIVE capabilities. */
  maxActive: number;
  /** The maximum number of represented (ACTIVE + GENERIC) capabilities. */
  maxRepresented: number;
}

/** The default Decision Budget. */
export const DEFAULT_BUDGET: DecisionBudget = {
  maxActive: 5,
  maxRepresented: 6,
};

/**
 * The input to the Decision Planner.
 *
 * This is the semantic input assembled from the Decision Rule Engine output and
 * the available evidence. It carries NO UI information.
 */
export interface PlannerInput {
  /** The normalized business meaning. */
  meaning: BusinessMeaning;
  /** The evidence available to the decision, scoped by subject. */
  evidence: EvidenceSet[];
  /** The semantic capability candidates produced by the Rule Engine. */
  candidates: CapabilityCandidate[];
  /** The deterministic decision budget. Defaults to DEFAULT_BUDGET. */
  budget?: DecisionBudget;
  /** The capability data policies. Defaults to CAPABILITY_DATA_POLICIES. */
  policies?: readonly CapabilityDataPolicy[];
}

/**
 * Apply the deterministic Decision Budget to a list of resolved candidates.
 *
 * Candidates are processed in priority order (highest first, then canonical
 * order for determinism). Excess ACTIVE capabilities are demoted to GENERIC;
 * excess represented capabilities are demoted to DROP. DORMANT and DROP
 * capabilities are never counted toward the represented budget.
 *
 * The result is re-sorted by canonical Capability order for stable output.
 */
export function applyBudget(
  resolved: readonly CapabilityCandidate[],
  budget: DecisionBudget
): CapabilityCandidate[] {
  const sorted = [...resolved].sort((a, b) => {
    const rankDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (rankDiff !== 0) return rankDiff;
    return (
      CANONICAL_ORDER.indexOf(a.capability) -
      CANONICAL_ORDER.indexOf(b.capability)
    );
  });

  const result: CapabilityCandidate[] = [];
  let activeCount = 0;
  let representedCount = 0;

  for (const candidate of sorted) {
    let state: CapabilityStateValue = candidate.state;

    if (state === CapabilityState.ACTIVE) {
      if (activeCount >= budget.maxActive) {
        // Excess ACTIVE is demoted to GENERIC (still meaningful, no specific data).
        state = CapabilityState.GENERIC;
      } else {
        activeCount += 1;
      }
    }

    if (state === CapabilityState.ACTIVE || state === CapabilityState.GENERIC) {
      if (representedCount >= budget.maxRepresented) {
        // Explicit deterministic budget exclusion → DROP.
        state = CapabilityState.DROP;
      } else {
        representedCount += 1;
      }
    }

    result.push({ ...candidate, state });
  }

  // Re-sort by canonical order for stable, deterministic output.
  return result.sort(
    (a, b) =>
      CANONICAL_ORDER.indexOf(a.capability) -
      CANONICAL_ORDER.indexOf(b.capability)
  );
}

/**
 * Build the semantic content requirements for the planned capabilities.
 *
 * Content requirements describe WHAT content the site needs (semantically),
 * never how it is presented. ACTIVE capabilities require specific data;
 * GENERIC and DORMANT capabilities express a fallback requirement. DROP
 * capabilities produce no content requirement.
 */
export function buildContentRequirements(
  planned: readonly CapabilityCandidate[],
  policyMap: ReadonlyMap<CapabilityId, CapabilityDataPolicy>
): ContentRequirement[] {
  const requirements: ContentRequirement[] = [];

  for (const candidate of planned) {
    const policy = policyMap.get(candidate.capability);
    if (!policy) continue;

    if (candidate.state === CapabilityState.ACTIVE) {
      requirements.push({
        key: `content.${candidate.capability}`,
        description: policy.activeContentRequirement,
        required: true,
      });
    } else if (
      candidate.state === CapabilityState.GENERIC ||
      candidate.state === CapabilityState.DORMANT
    ) {
      requirements.push({
        key: `content.${candidate.capability}`,
        description: policy.fallbackContentRequirement,
        required: false,
      });
    }
    // DROP produces no content requirement.
  }

  return requirements;
}

/**
 * Build the semantic constraints for the planned capabilities.
 *
 * Constraints are semantic boundaries, not UI decisions. The key semantic
 * constraint is whether a collection/list presentation is required for a
 * capability. When a capability is GENERIC (specific collection data absent),
 * `collectionRequired` is false — this tells the Recipe layer that collection
 * presentation is not required, using semantic constraints only.
 */
export function buildConstraints(
  planned: readonly CapabilityCandidate[]
): SemanticConstraint[] {
  const constraints: SemanticConstraint[] = [];

  for (const candidate of planned) {
    const collectionRequired = candidate.state === CapabilityState.ACTIVE;
    constraints.push({
      key: `capability.${candidate.capability}.collectionRequired`,
      value: collectionRequired ? 'true' : 'false',
    });
  }

  return constraints;
}

/**
 * Build a validated DecisionPlan from the semantic input.
 *
 * This is the deterministic entry point for Step 04. It:
 *   1. Resolves each candidate's state using SCOPED evidence.
 *   2. Applies the deterministic Decision Budget.
 *   3. Builds semantic content requirements.
 *   4. Builds semantic constraints.
 *   5. Assembles the DecisionPlan.
 *
 * The output is a semantic WHAT plan. It contains no UI, layout, component,
 * Recipe, or renderer concepts.
 */
export function buildDecisionPlan(input: PlannerInput): DecisionPlan {
  const budget = input.budget ?? DEFAULT_BUDGET;
  const policies = input.policies ?? CAPABILITY_DATA_POLICIES;
  const policyMap = new Map<CapabilityId, CapabilityDataPolicy>(
    policies.map((policy) => [policy.capability, policy])
  );

  // 1. Resolve states using scoped evidence.
  const resolved = input.candidates.map((candidate) => {
    const policy = policyMap.get(candidate.capability);
    const state = policy
      ? resolveCapabilityState(candidate.capability, input.evidence, policy)
      : candidate.state;
    return { ...candidate, state };
  });

  // 2. Apply the deterministic budget.
  const budgeted = applyBudget(resolved, budget);

  // 3. Build semantic content requirements.
  const contentRequirements = buildContentRequirements(budgeted, policyMap);

  // 4. Build semantic constraints.
  const constraints = buildConstraints(budgeted);

  // 5. Assemble the DecisionPlan.
  const capabilities: PlannedCapability[] = budgeted.map((candidate) => ({
    capability: candidate.capability,
    state: candidate.state,
    priority: candidate.priority,
    role: candidate.role,
  }));

  return {
    id: `plan-${input.meaning.id}`,
    capabilities,
    constraints,
    contentRequirements,
    evidence: input.evidence,
  };
}
