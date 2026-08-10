/**
 * AWIE V2 Brain — Step 04 Decision Planner tests.
 *
 * Verifies the deterministic Decision Planner:
 *   - State resolution via SCOPED evidence (ACTIVE / GENERIC / DORMANT / DROP)
 *   - Evidence is a GATE, not a capability (evidence never creates a capability)
 *   - Missing evidence is NOT automatic DROP (semantic fallback policy)
 *   - Deterministic Decision Budget (excess ACTIVE → GENERIC, excess → DROP)
 *   - Semantic purity (DecisionPlan never contains UI/component/layout concepts)
 *   - Provenance preservation (never silently upgraded to system_verified)
 *   - Determinism (same input → same output)
 *
 * Run with: npx tsx scripts/brain-decision-planner-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  Provenance,
  buildDecisionPlan,
  applyBudget,
  DataRequirementKey,
  type BusinessMeaning,
  type CapabilityCandidate,
  type EvidenceSet,
} from '../src/lib/brain';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function makeMeaning(overrides: Partial<BusinessMeaning> = {}): BusinessMeaning {
  return {
    id: 'bm-planner',
    primaryIntent: 'inform',
    traits: [],
    impliedCapabilities: [],
    evidence: [],
    ...overrides,
  };
}

function makeCandidate(
  capability: (typeof Capability)[keyof typeof Capability],
  priority: (typeof CapabilityPriority)[keyof typeof CapabilityPriority] = CapabilityPriority.BUSINESS_CRITICAL,
  role: (typeof CapabilityRole)[keyof typeof CapabilityRole] = CapabilityRole.PRIMARY,
  state: (typeof CapabilityState)[keyof typeof CapabilityState] = CapabilityState.ACTIVE
): CapabilityCandidate {
  return { capability, priority, role, state };
}

function makeEvidence(subject: string, count = 1): EvidenceSet {
  return {
    subject,
    items: Array.from({ length: count }, (_, i) => ({
      id: `${subject}-${i}`,
      provenance: Provenance.cms,
      claim: `${subject} evidence`,
    })),
  };
}

function stateOf(
  plan: { capabilities: { capability: string; state: string }[] },
  capability: string
): string | undefined {
  return plan.capabilities.find((c) => c.capability === capability)?.state;
}

console.log('\n=== 1. State resolution via scoped evidence ===');

// discovery with offering evidence → ACTIVE
const discoveryActive = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.offering)],
  candidates: [makeCandidate(Capability.discovery)],
});
assert(
  stateOf(discoveryActive, Capability.discovery) === CapabilityState.ACTIVE,
  'discovery + offering evidence → ACTIVE'
);

// discovery WITHOUT offering evidence → GENERIC (semantic fallback, not DROP)
const discoveryGeneric = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [],
  candidates: [makeCandidate(Capability.discovery)],
});
assert(
  stateOf(discoveryGeneric, Capability.discovery) === CapabilityState.GENERIC,
  'discovery without offering evidence → GENERIC (missing evidence is NOT auto-DROP)'
);

// booking without schedule evidence → DORMANT (semantic fallback policy)
const bookingDormant = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [],
  candidates: [makeCandidate(Capability.booking)],
});
assert(
  stateOf(bookingDormant, Capability.booking) === CapabilityState.DORMANT,
  'booking without schedule evidence → DORMANT (semantic fallback policy)'
);

console.log('\n=== 2. Evidence is a GATE, not a capability ===');

// Evidence for one subject must NOT satisfy another subject (scoped evidence).
// offering evidence must NOT activate booking (which needs schedule evidence).
const scopedEvidence = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.offering)],
  candidates: [makeCandidate(Capability.booking)],
});
assert(
  stateOf(scopedEvidence, Capability.booking) === CapabilityState.DORMANT,
  'offering evidence does NOT activate booking (evidence is scoped by subject)'
);

// Evidence never CREATES a capability. A candidate list without booking must
// not gain booking just because schedule evidence exists.
const noCreate = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.schedule)],
  candidates: [makeCandidate(Capability.discovery)],
});
assert(
  stateOf(noCreate, Capability.booking) === undefined,
  'schedule evidence does NOT create a booking capability (evidence is a gate, not a capability)'
);

console.log('\n=== 3. Deterministic Decision Budget ===');

// Excess ACTIVE capabilities are demoted to GENERIC.
const budgeted = applyBudget(
  [
    makeCandidate(Capability.discovery, CapabilityPriority.MANDATORY),
    makeCandidate(Capability.purchase, CapabilityPriority.CONVERSION_CRITICAL),
    makeCandidate(Capability.booking, CapabilityPriority.BUSINESS_CRITICAL),
    makeCandidate(Capability.inquiry, CapabilityPriority.SUPPORTING),
    makeCandidate(Capability.leadCapture, CapabilityPriority.SUPPORTING),
    makeCandidate(Capability.location, CapabilityPriority.SUPPORTING),
    makeCandidate(Capability.trust, CapabilityPriority.DECORATIVE),
  ],
  { maxActive: 3, maxRepresented: 5 }
);
const activeCount = budgeted.filter((c) => c.state === CapabilityState.ACTIVE).length;
const representedCount = budgeted.filter(
  (c) => c.state === CapabilityState.ACTIVE || c.state === CapabilityState.GENERIC
).length;
assert(activeCount <= 3, 'ACTIVE count respects maxActive budget');
assert(representedCount <= 5, 'represented count respects maxRepresented budget');
assert(
  budgeted.some((c) => c.state === CapabilityState.DROP),
  'excess represented capabilities are deterministically demoted to DROP'
);

console.log('\n=== 4. Semantic purity (no UI/component/layout concepts) ===');

const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'section', 'layout', 'css', 'px', 'column'];
let uiLeak = false;
const plan = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.offering)],
  candidates: [
    makeCandidate(Capability.discovery),
    makeCandidate(Capability.purchase),
  ],
});
const planJson = JSON.stringify(plan);
for (const concept of uiConcepts) {
  if (planJson.toLowerCase().includes(concept.toLowerCase())) {
    uiLeak = true;
  }
}
assert(!uiLeak, 'DecisionPlan contains no UI/component/layout/CSS concepts');

// Every planned capability must be a canonical CapabilityId.
const canonicalIds = new Set(Object.values(Capability));
let invalidCapability = false;
for (const c of plan.capabilities) {
  if (!canonicalIds.has(c.capability as (typeof Capability)[keyof typeof Capability])) {
    invalidCapability = true;
  }
}
assert(!invalidCapability, 'every planned capability is a canonical CapabilityId');

console.log('\n=== 5. Provenance preservation ===');

// The planner must never upgrade provenance. Evidence with user_asserted/cms
// provenance must remain as-is in the plan's evidence.
const provenancePlan = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [
    {
      subject: DataRequirementKey.offering,
      items: [
        { id: 'e1', provenance: Provenance.user_asserted, claim: 'user claim' },
        { id: 'e2', provenance: Provenance.cms, claim: 'cms claim' },
      ],
    },
  ],
  candidates: [makeCandidate(Capability.discovery)],
});
const preserved = provenancePlan.evidence.every((set) =>
  set.items.every(
    (item) =>
      item.provenance === Provenance.user_asserted ||
      item.provenance === Provenance.cms
  )
);
assert(preserved, 'provenance is preserved (never upgraded to system_verified)');

console.log('\n=== 6. Determinism ===');

const input = {
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.offering)],
  candidates: [
    makeCandidate(Capability.discovery),
    makeCandidate(Capability.purchase),
  ],
};
const planA = buildDecisionPlan(input);
const planB = buildDecisionPlan(input);
assert(
  JSON.stringify(planA) === JSON.stringify(planB),
  'same input produces identical DecisionPlan (deterministic)'
);

console.log('\n=== 7. Content requirements are semantic ===');

// ACTIVE capabilities produce a required content requirement; GENERIC/DORMANT
// produce a non-required fallback requirement; DROP produces none.
const contentPlan = buildDecisionPlan({
  meaning: makeMeaning(),
  evidence: [makeEvidence(DataRequirementKey.offering)],
  candidates: [
    makeCandidate(Capability.discovery), // ACTIVE (offering evidence present)
    makeCandidate(Capability.booking), // DORMANT (no schedule evidence)
  ],
});
const discoveryReq = contentPlan.contentRequirements.find((r) =>
  r.key.includes(Capability.discovery)
);
const bookingReq = contentPlan.contentRequirements.find((r) =>
  r.key.includes(Capability.booking)
);
assert(discoveryReq?.required === true, 'ACTIVE capability → required content requirement');
assert(bookingReq?.required === false, 'DORMANT capability → non-required fallback requirement');

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
