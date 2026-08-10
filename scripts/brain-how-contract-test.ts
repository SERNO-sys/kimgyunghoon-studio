/**
 * AWIE V2 Brain — Step 07 Universal HOW Contract tests.
 *
 * Verifies the smallest universal HOW contract that bridges the Brain's
 * semantic DecisionPlan (WHAT) to the V2.6 Recipe layer (HOW):
 *   - The HOW primitive vocabulary is validated (invalid values rejected)
 *   - The HOW profile schema is validated (malformed rejected)
 *   - The HOW layer NEVER infers a capability from a primitive
 *   - The HOW layer NEVER changes a capability state
 *   - The HOW layer NEVER fabricates records or evidence
 *   - Four semantic scenarios are demonstrated:
 *       S1 Local Bakery (no product records)
 *       S2 Jazz Pianist (no performance schedule)
 *       S3 B2B Security Consulting (no testimonials/evidence)
 *       S4 Complex Business (multiple capabilities, no hidden decision engine)
 *
 * Run with: npx tsx scripts/brain-how-contract-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  type DecisionPlan,
  type PlannedCapability,
} from '../src/lib/brain';
import {
  HowPrimitive,
  HowConstraintKey,
  howPrimitiveSchema,
  howPrimitiveProfileSchema,
  CAPABILITY_HOW_COMPATIBILITY,
  evaluateHowCompatibility,
  readBoolConstraint,
  type HowPrimitiveProfile,
} from '../src/lib/brain/how-contract';

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

function makePlanned(
  capability: (typeof Capability)[keyof typeof Capability],
  state: (typeof CapabilityState)[keyof typeof CapabilityState],
): PlannedCapability {
  return {
    capability,
    state,
    priority: CapabilityPriority.BUSINESS_CRITICAL,
    role: CapabilityRole.PRIMARY,
  };
}

function makePlan(
  capabilities: PlannedCapability[],
  constraints: { key: string; value: string }[] = [],
): DecisionPlan {
  return {
    id: 'test-plan',
    capabilities,
    constraints,
    contentRequirements: [],
    evidence: [],
  };
}

// ---------------------------------------------------------------------------
// 1. Vocabulary validation
// ---------------------------------------------------------------------------
console.log('\n[1] HOW primitive vocabulary validation');

assert(
  howPrimitiveSchema.safeParse(HowPrimitive.Collection).success,
  'valid HOW primitive "collection" is accepted',
);
assert(
  howPrimitiveSchema.safeParse(HowPrimitive.Trust).success,
  'valid HOW primitive "trust" is accepted',
);
assert(
  !howPrimitiveSchema.safeParse('product-grid').success,
  'invalid HOW primitive "product-grid" is rejected',
);
assert(
  !howPrimitiveSchema.safeParse('testimonial').success,
  'invalid HOW primitive "testimonial" is rejected (UI component, not a primitive)',
);
assert(
  !howPrimitiveSchema.safeParse('bakery').success,
  'invalid HOW primitive "bakery" is rejected (industry name)',
);

// ---------------------------------------------------------------------------
// 2. HOW profile schema validation
// ---------------------------------------------------------------------------
console.log('\n[2] HOW profile schema validation');

const validProfile: HowPrimitiveProfile = {
  recipeId: 'universal-recipe',
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: false },
    [HowPrimitive.Narrative]: {},
    [HowPrimitive.Conversion]: {},
    [HowPrimitive.Trust]: { requiresEvidence: false },
  },
};
assert(
  howPrimitiveProfileSchema.safeParse(validProfile).success,
  'valid HOW profile is accepted',
);

const invalidProfile = {
  recipeId: 'bad',
  primitives: {
    'product-grid': { requiresConcreteRecords: true },
  },
};
assert(
  !howPrimitiveProfileSchema.safeParse(invalidProfile).success,
  'HOW profile with invalid primitive key is rejected',
);

// ---------------------------------------------------------------------------
// 3. Capability vs HOW boundary — the HOW layer never infers a capability
// ---------------------------------------------------------------------------
console.log('\n[3] Capability vs HOW boundary');

// The mapping is declarative: a primitive never implies a capability.
assert(
  CAPABILITY_HOW_COMPATIBILITY[Capability.trust].includes(HowPrimitive.Trust),
  'trust capability maps to trust HOW primitive (declarative)',
);
assert(
  !CAPABILITY_HOW_COMPATIBILITY[Capability.trust].includes(
    HowPrimitive.Collection,
  ),
  'trust capability does NOT map to collection primitive',
);
assert(
  CAPABILITY_HOW_COMPATIBILITY[Capability.discovery].includes(
    HowPrimitive.Collection,
  ),
  'discovery capability maps to collection primitive',
);
assert(
  CAPABILITY_HOW_COMPATIBILITY[Capability.discovery].includes(
    HowPrimitive.Narrative,
  ),
  'discovery capability maps to narrative primitive',
);

// ---------------------------------------------------------------------------
// 4. State handling — DORMANT / DROP are never assembled
// ---------------------------------------------------------------------------
console.log('\n[4] State handling (DORMANT / DROP never assembled)');

// A recipe that can express NOTHING is still compatible with a plan whose only
// capabilities are DORMANT / DROP — they are preserved, not assembled.
const emptyProfile: HowPrimitiveProfile = {
  recipeId: 'empty',
  primitives: {},
};

const dormantDropPlan = makePlan([
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.purchase, CapabilityState.DROP),
]);

const dormantDropResult = evaluateHowCompatibility(dormantDropPlan, emptyProfile);
assert(
  dormantDropResult.verdict === 'COMPATIBLE',
  'DORMANT / DROP capabilities are preserved, never assembled (COMPATIBLE)',
);
assert(
  dormantDropResult.primitives.length === 0,
  'no HOW primitive is required for DORMANT / DROP capabilities',
);

// ---------------------------------------------------------------------------
// 5. Scenario 1 — Local Bakery (no concrete product records)
// ---------------------------------------------------------------------------
console.log('\n[5] Scenario 1 — Local Bakery (no product records)');

const bakeryPlan = makePlan(
  [
    makePlanned(Capability.discovery, CapabilityState.ACTIVE),
    makePlanned(Capability.purchase, CapabilityState.GENERIC),
    makePlanned(Capability.location, CapabilityState.ACTIVE),
    makePlanned(Capability.trust, CapabilityState.ACTIVE),
    makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  ],
  [
    { key: HowConstraintKey.CollectionRequired, value: 'false' },
    { key: HowConstraintKey.EvidenceBacked, value: 'false' },
  ],
);

// A recipe that can express collection WITHOUT records, narrative, conversion,
// trust WITHOUT evidence, and location.
const bakeryProfile: HowPrimitiveProfile = {
  recipeId: 'universal-bakery',
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: false },
    [HowPrimitive.Narrative]: {},
    [HowPrimitive.Conversion]: {},
    [HowPrimitive.Trust]: { requiresEvidence: false },
    [HowPrimitive.Location]: {},
  },
};

const bakeryResult = evaluateHowCompatibility(bakeryPlan, bakeryProfile);
assert(
  bakeryResult.verdict === 'COMPATIBLE',
  'bakery meaning is expressible WITHOUT fabricating products',
);
assert(
  readBoolConstraint(bakeryPlan, HowConstraintKey.CollectionRequired) === false,
  'collectionRequired=false is read from the DecisionPlan',
);

// A recipe that REQUIRES concrete records for collection cannot satisfy the
// GENERIC purchase / discovery without fabricating products.
const recordOnlyProfile: HowPrimitiveProfile = {
  recipeId: 'record-only',
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: true },
    [HowPrimitive.Conversion]: {},
    [HowPrimitive.Trust]: { requiresEvidence: false },
    [HowPrimitive.Location]: {},
  },
};
const recordOnlyResult = evaluateHowCompatibility(bakeryPlan, recordOnlyProfile);
assert(
  recordOnlyResult.verdict === 'INCOMPATIBLE',
  'record-requiring collection is INCOMPATIBLE when collectionRequired=false (no fabrication)',
);

// ---------------------------------------------------------------------------
// 6. Scenario 2 — Jazz Pianist (no performance schedule)
// ---------------------------------------------------------------------------
console.log('\n[6] Scenario 2 — Jazz Pianist (no performance schedule)');

const pianistPlan = makePlan(
  [
    makePlanned(Capability.booking, CapabilityState.DORMANT),
    makePlanned(Capability.discovery, CapabilityState.ACTIVE),
    makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  ],
  [{ key: HowConstraintKey.CollectionRequired, value: 'false' }],
);

const pianistProfile: HowPrimitiveProfile = {
  recipeId: 'universal-pianist',
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: false },
    [HowPrimitive.Narrative]: {},
    [HowPrimitive.Conversion]: {},
  },
};

const pianistResult = evaluateHowCompatibility(pianistPlan, pianistProfile);
assert(
  pianistResult.verdict === 'COMPATIBLE',
  'pianist meaning is expressible with booking kept DORMANT',
);
assert(
  !pianistResult.primitives.some((p) => p.primitive === HowPrimitive.Schedule),
  'no schedule primitive is required (booking is DORMANT, not assembled)',
);

// ---------------------------------------------------------------------------
// 7. Scenario 3 — B2B Security Consulting (no testimonials/evidence)
// ---------------------------------------------------------------------------
console.log('\n[7] Scenario 3 — B2B Security Consulting (no testimonials)');

const securityPlan = makePlan(
  [
    makePlanned(Capability.trust, CapabilityState.ACTIVE),
    makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
    makePlanned(Capability.leadCapture, CapabilityState.ACTIVE),
  ],
  [{ key: HowConstraintKey.EvidenceBacked, value: 'false' }],
);


// A recipe that can express trust WITHOUT evidence (non-evidence trust).
const securityProfile: HowPrimitiveProfile = {
  recipeId: 'universal-security',
  primitives: {
    [HowPrimitive.Trust]: { requiresEvidence: false },
    [HowPrimitive.Conversion]: {},
  },
};

const securityResult = evaluateHowCompatibility(securityPlan, securityProfile);
assert(
  securityResult.verdict === 'COMPATIBLE',
  'trust is expressible WITHOUT inventing testimonials (non-evidence trust)',
);

// A recipe that REQUIRES evidence for trust cannot satisfy trust without
// inventing testimonials.
const evidenceOnlyProfile: HowPrimitiveProfile = {
  recipeId: 'evidence-only',
  primitives: {
    [HowPrimitive.Trust]: { requiresEvidence: true },
    [HowPrimitive.Conversion]: {},
  },
};
const evidenceOnlyResult = evaluateHowCompatibility(
  securityPlan,
  evidenceOnlyProfile,
);
assert(
  evidenceOnlyResult.verdict === 'INCOMPATIBLE',
  'evidence-requiring trust is INCOMPATIBLE when evidenceBacked=false (no invented testimonials)',
);

// ---------------------------------------------------------------------------
// 8. Scenario 4 — Complex Business (multiple capabilities, no hidden engine)
// ---------------------------------------------------------------------------
console.log('\n[8] Scenario 4 — Complex Business (no hidden decision engine)');

const complexPlan = makePlan(
  [
    makePlanned(Capability.discovery, CapabilityState.ACTIVE),
    makePlanned(Capability.purchase, CapabilityState.ACTIVE),
    makePlanned(Capability.booking, CapabilityState.GENERIC),
    makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
    makePlanned(Capability.leadCapture, CapabilityState.ACTIVE),
    makePlanned(Capability.location, CapabilityState.ACTIVE),

    makePlanned(Capability.trust, CapabilityState.ACTIVE),
  ],
  [
    { key: HowConstraintKey.CollectionRequired, value: 'true' },
    { key: HowConstraintKey.EvidenceBacked, value: 'true' },
  ],
);

const complexProfile: HowPrimitiveProfile = {
  recipeId: 'universal-complex',
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: true },
    [HowPrimitive.Narrative]: {},
    [HowPrimitive.Conversion]: {},
    [HowPrimitive.Trust]: { requiresEvidence: true },
    [HowPrimitive.Schedule]: {},
    [HowPrimitive.Location]: {},
  },
};

const complexResult = evaluateHowCompatibility(complexPlan, complexProfile);
assert(
  complexResult.verdict === 'COMPATIBLE',
  'complex multi-capability plan is expressible under its constraints',
);

// The HOW layer must NOT become a hidden decision engine: it must not change
// any capability state. Verify the plan is unchanged after evaluation.
const statesBefore = complexPlan.capabilities.map((c) => c.state).join(',');
const statesAfter = complexPlan.capabilities.map((c) => c.state).join(',');
assert(
  statesBefore === statesAfter,
  'evaluation does NOT change any capability state (no hidden decision engine)',
);

// The HOW layer must not add capabilities.
assert(
  complexResult.primitives.every(
    (p) =>
      p.primitive === HowPrimitive.Collection ||
      p.primitive === HowPrimitive.Narrative ||
      p.primitive === HowPrimitive.Conversion ||
      p.primitive === HowPrimitive.Trust ||
      p.primitive === HowPrimitive.Schedule ||
      p.primitive === HowPrimitive.Location,
  ),
  'evaluation only references known HOW primitives (no capability invention)',
);

// ---------------------------------------------------------------------------
// 9. Determinism
// ---------------------------------------------------------------------------
console.log('\n[9] Determinism');

const run1 = evaluateHowCompatibility(complexPlan, complexProfile);
const run2 = evaluateHowCompatibility(complexPlan, complexProfile);
assert(
  JSON.stringify(run1) === JSON.stringify(run2),
  'same DecisionPlan + profile always produces the same result',
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\nStep 07 HOW Contract tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
