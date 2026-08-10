/**
 * AWIE V2 Brain — Step 09 ContentPlan tests.
 *
 * Verifies the ContentPlan contract that translates an ALREADY-DECIDED
 * DecisionPlan into explicit content requirements for AI #2:
 *   - ACTIVE capability with matching evidence → concrete facts available.
 *   - ACTIVE capability WITHOUT matching evidence → facts unavailable, generic
 *     content still permitted, nothing invented.
 *   - GENERIC capability → generic-safe content; concrete facts are NEVER
 *     treated as available (anti-hallucination).
 *   - DORMANT capability → no active generation requirement (metadata only).
 *   - DROP capability → no content requirement.
 *   - Provenance is preserved exactly (never upgraded).
 *   - The ContentPlan NEVER mutates the DecisionPlan.
 *   - The ContentPlan NEVER adds/removes/changes capabilities or states.
 *   - Determinism (same input → same output).
 *   - Schema validation accepts valid plans and rejects malformed ones.
 *   - No UI/component/layout/CSS concepts leak into the plan.
 *
 * Run with: npx tsx scripts/brain-content-plan-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  Provenance,
  FactAvailability,
  buildContentPlan,
  contentPlanSchema,
  type DecisionPlan,
  type PlannedCapability,
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
  id: string,
  capabilities: PlannedCapability[],
  evidence: EvidenceSet[] = [],
): DecisionPlan {
  return {
    id,
    capabilities,
    constraints: [],
    contentRequirements: [],
    evidence,
  };
}

console.log('\n=== 1. ACTIVE capability with matching evidence → facts available ===');
// A bakery with discovery ACTIVE and offering evidence present.
const bakeryPlan = makePlan(
  'bakery',
  [makePlanned(Capability.discovery, CapabilityState.ACTIVE)],
  [
    {
      subject: 'offering',
      items: [
        {
          id: 'ev-offering-1',
          provenance: Provenance.user_asserted,
          claim: 'Sells artisan bread and pastries',
        },
      ],
    },
  ],
);
const bakeryContent = buildContentPlan(bakeryPlan);
const discoveryReq = bakeryContent.requirements.find(
  (r) => r.capability === Capability.discovery,
);
assert(
  discoveryReq !== undefined,
  'ACTIVE discovery produces a content requirement',
);
assert(
  discoveryReq?.factAvailability === FactAvailability.Available,
  'ACTIVE discovery with offering evidence → factAvailability = available',
);
assert(
  discoveryReq?.provenance === Provenance.user_asserted,
  'provenance is preserved exactly (user_asserted, never upgraded)',
);
assert(
  discoveryReq?.evidenceRefs?.includes('ev-offering-1') === true,
  'the backing evidence id is referenced',
);


console.log('\n=== 2. ACTIVE capability WITHOUT evidence → facts unavailable, nothing invented ===');
const noEvidencePlan = makePlan('no-evidence', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
]);
const noEvidenceContent = buildContentPlan(noEvidencePlan);
const noEvReq = noEvidenceContent.requirements.find(
  (r) => r.capability === Capability.discovery,
);
assert(
  noEvReq?.factAvailability === FactAvailability.Unavailable,
  'ACTIVE discovery without evidence → factAvailability = unavailable',
);
assert(
  noEvReq?.evidenceRefs.length === 0,
  'no evidence refs when no matching evidence exists',
);
assert(
  noEvReq?.provenance === undefined,
  'no provenance is claimed when no evidence exists',
);
assert(
  noEvReq !== undefined && noEvReq.genericAllowed === true,
  'generic content is still permitted (genericAllowed = true)',
);
assert(
  noEvReq !== undefined && noEvReq.mustNotInvent.length > 0,
  'mustNotInvent explicitly lists what must never be invented',
);

console.log('\n=== 3. GENERIC capability → generic-safe, concrete facts never available ===');
// Even if evidence exists, a GENERIC capability must NOT treat concrete facts
// as available. This is the anti-hallucination guard.
const genericPlan = makePlan(
  'generic-with-evidence',
  [makePlanned(Capability.purchase, CapabilityState.GENERIC)],
  [
    {
      subject: 'offering',
      items: [
        {
          id: 'ev-offering-2',
          provenance: Provenance.cms,
          claim: 'Sells custom cakes',
        },
      ],
    },
  ],
);
const genericContent = buildContentPlan(genericPlan);
const genericReq = genericContent.requirements.find(
  (r) => r.capability === Capability.purchase,
);
assert(
  genericReq?.factAvailability === FactAvailability.GenericSafe,
  'GENERIC purchase → factAvailability = generic_safe (even with evidence present)',
);
assert(
  genericReq?.evidenceRefs.length === 0,
  'GENERIC never references concrete evidence (prevents fact invention)',
);

console.log('\n=== 4. DORMANT / DROP produce no active generation requirement ===');
const dormantDropPlan = makePlan('dormant-drop', [
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.trust, CapabilityState.DROP),
]);
const dormantDropContent = buildContentPlan(dormantDropPlan);
assert(
  dormantDropContent.requirements.length === 0,
  'DORMANT + DROP plan produces zero active content requirements',
);
assert(
  dormantDropContent.dormant.some(
    (d) => d.capability === Capability.booking,
  ),
  'DORMANT booking is preserved as dormant metadata',
);
assert(
  dormantDropContent.dropped.some((d) => d.capability === Capability.trust),
  'DROP trust is recorded in the dropped list',
);


console.log('\n=== 5. Provenance is preserved exactly (never upgraded) ===');
const provenancePlan = makePlan(
  'provenance',
  [makePlanned(Capability.location, CapabilityState.ACTIVE)],
  [
    {
      subject: 'address',
      items: [
        {
          id: 'ev-addr-1',
          provenance: Provenance.user_asserted,
          claim: 'Located downtown',
        },
      ],
    },
  ],
);
const provenanceContent = buildContentPlan(provenancePlan);
const locReq = provenanceContent.requirements.find(
  (r) => r.capability === Capability.location,
);
assert(
  locReq?.provenance === Provenance.user_asserted,
  'user_asserted provenance is preserved as user_asserted (NOT upgraded to system_verified)',
);

console.log('\n=== 6. The ContentPlan NEVER mutates the DecisionPlan ===');
const before = JSON.stringify(bakeryPlan);
buildContentPlan(bakeryPlan);
const after = JSON.stringify(bakeryPlan);
assert(before === after, 'DecisionPlan is unchanged after buildContentPlan');

console.log('\n=== 7. The ContentPlan NEVER adds/removes/changes capabilities or states ===');
const mixedPlan = makePlan('mixed', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.trust, CapabilityState.DROP),
]);
const mixedContent = buildContentPlan(mixedPlan);
const covered = new Set([
  ...mixedContent.requirements.map((r) => r.capability),
  ...mixedContent.dormant.map((d) => d.capability),
  ...mixedContent.dropped.map((d) => d.capability),
]);

assert(
  covered.size === mixedPlan.capabilities.length,
  'every planned capability appears exactly once across requirements/dormant/dropped',
);
assert(
  mixedContent.requirements.every((r) => r.capability !== Capability.booking),
  'DORMANT booking is not promoted to an active requirement',
);
assert(
  mixedContent.requirements.every((r) => r.capability !== Capability.trust),
  'DROP trust is not promoted to an active requirement',
);

console.log('\n=== 8. Determinism ===');
const resultA = buildContentPlan(bakeryPlan);
const resultB = buildContentPlan(bakeryPlan);
assert(
  JSON.stringify(resultA) === JSON.stringify(resultB),
  'same input produces identical ContentPlan (deterministic)',
);

console.log('\n=== 9. Schema validation accepts a valid ContentPlan ===');
const validParse = contentPlanSchema.safeParse(bakeryContent);
assert(validParse.success, 'a valid ContentPlan passes contentPlanSchema');

console.log('\n=== 10. Schema validation rejects malformed ContentPlans ===');
const badState = contentPlanSchema.safeParse({
  ...bakeryContent,
  requirements: [
    {
      ...bakeryContent.requirements[0],
      factAvailability: 'not-a-real-availability',
    },
  ],
});
assert(!badState.success, 'invalid factAvailability value is rejected');

const badCapability = contentPlanSchema.safeParse({
  ...bakeryContent,
  requirements: [
    {
      ...bakeryContent.requirements[0],
      capability: 'not-a-capability',
    },
  ],
});
assert(!badCapability.success, 'invalid capability value is rejected');

const badProvenance = contentPlanSchema.safeParse({
  ...bakeryContent,
  requirements: [
    {
      ...bakeryContent.requirements[0],
      provenance: 'not-a-provenance',
    },
  ],
});
assert(!badProvenance.success, 'invalid provenance value is rejected');

const missingField = contentPlanSchema.safeParse({
  ...bakeryContent,
  requirements: [
    {
      ...bakeryContent.requirements[0],
      description: '',
    },
  ],
});
assert(!missingField.success, 'empty description is rejected');

console.log('\n=== 11. Semantic purity of the ContentPlan ===');
const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'px', 'column', 'css', 'flex'];
let uiLeak = false;
const planJson = JSON.stringify(mixedContent);
for (const concept of uiConcepts) {
  if (planJson.toLowerCase().includes(concept.toLowerCase())) {
    uiLeak = true;
  }
}
assert(!uiLeak, 'ContentPlan contains no UI/component/layout/CSS concepts');

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
