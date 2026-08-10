/**
 * AWIE V2 Brain — Step 01 contract schema/type tests.
 *
 * Verifies the foundational semantic/decision-side contracts:
 *   - Capability vocabulary validation
 *   - CapabilityState validation (all four states)
 *   - Provenance validation
 *   - DecisionContext semantic purity (no UI/component decisions)
 *   - DecisionPlan state representation (ACTIVE/GENERIC/DORMANT/DROP)
 *   - DecisionPlan malformed rejection
 *
 * Run with: npx tsx scripts/brain-contracts-test.ts
 */

import {
  Capability,
  CapabilityState,
  Provenance,
  capabilityIdSchema,
  capabilityStateSchema,
  provenanceSchema,
  decisionContextSchema,
  decisionPlanSchema,
  CapabilityPriority,
  CapabilityRole,
  type DecisionContext,
  type DecisionPlan,
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

function assertThrows(fn: () => unknown, label: string): void {
  try {
    fn();
    failed++;
    console.error(`  ✗ ${label} (expected to throw)`);
  } catch {
    passed++;
    console.log(`  ✓ ${label}`);
  }
}

console.log('\n=== 1. Capability vocabulary ===');

// 1. valid semantic capability is accepted
const validCapability = capabilityIdSchema.safeParse(Capability.discovery);
assert(validCapability.success, 'valid capability "discovery" accepted');

// 2. invalid capability value is rejected
assertThrows(
  () => capabilityIdSchema.parse('bakery'),
  'invalid capability "bakery" rejected (industry name)'
);
assertThrows(
  () => capabilityIdSchema.parse('Hero'),
  'invalid capability "Hero" rejected (UI component)'
);
assertThrows(
  () => capabilityIdSchema.parse('ProductGrid'),
  'invalid capability "ProductGrid" rejected (UI component)'
);

console.log('\n=== 2. CapabilityState (all four states) ===');

// 3. all four capability states are accepted
for (const state of Object.values(CapabilityState)) {
  const result = capabilityStateSchema.safeParse(state);
  assert(result.success, `state "${state}" accepted`);
}

// 4. invalid capability state is rejected
assertThrows(
  () => capabilityStateSchema.parse('PENDING'),
  'invalid state "PENDING" rejected'
);
assertThrows(
  () => capabilityStateSchema.parse('active'),
  'invalid state "active" (lowercase) rejected'
);

console.log('\n=== 3. Provenance ===');

// 5. provenance values are validated
for (const p of Object.values(Provenance)) {
  const result = provenanceSchema.safeParse(p);
  assert(result.success, `provenance "${p}" accepted`);
}
assertThrows(
  () => provenanceSchema.parse('verified'),
  'invalid provenance "verified" rejected (not in contract set)'
);
assertThrows(
  () => provenanceSchema.parse('user_asserted_extra'),
  'invalid provenance "user_asserted_extra" rejected'
);

console.log('\n=== 4. DecisionContext semantic purity ===');

const validContext: DecisionContext = {
  id: 'ctx-1',
  businessMeaning: {
    id: 'bm-1',
    primaryIntent: 'convert',
    traits: [{ key: 'offers_booking', value: 'true' }],
    impliedCapabilities: [Capability.booking],
    evidence: [],
  },
  capabilities: [Capability.booking, Capability.location],
  evidence: [],
  preferences: [{ key: 'tone', value: 'trustworthy' }],
  constraints: [{ key: 'budget', value: 'standard' }],
};

const contextResult = decisionContextSchema.safeParse(validContext);
assert(contextResult.success, 'valid DecisionContext accepted');

// 6. DecisionContext cannot contain UI/component decisions.
// zod rejects unknown keys by default, so a UI/component field is rejected at
// runtime even though the object spread bypasses excess-property type checking.
const uiContaminated = {
  ...validContext,
  components: ['Hero', 'ProductGrid'],
};
assertThrows(
  () => decisionContextSchema.parse(uiContaminated),
  'DecisionContext with "components" field rejected'
);

const cssContaminated = {
  ...validContext,
  layout: { gridColumns: 3, spacing: '24px' },
};
assertThrows(
  () => decisionContextSchema.parse(cssContaminated),
  'DecisionContext with "layout" field rejected'
);

console.log('\n=== 5. DecisionPlan states ===');

// 7. DecisionPlan can represent ACTIVE / GENERIC / DORMANT / DROP
const planWithAllStates: DecisionPlan = {
  id: 'plan-1',
  capabilities: [
    {
      capability: Capability.booking,
      state: CapabilityState.ACTIVE,
      priority: CapabilityPriority.CONVERSION_CRITICAL,
      role: CapabilityRole.PRIMARY,
    },
    {
      capability: Capability.discovery,
      state: CapabilityState.GENERIC,
      priority: CapabilityPriority.SUPPORTING,
      role: CapabilityRole.SUPPORTING,
    },
    {
      capability: Capability.trust,
      state: CapabilityState.DORMANT,
      priority: CapabilityPriority.SUPPORTING,
      role: CapabilityRole.SUPPORTING,
    },
    {
      capability: Capability.purchase,
      state: CapabilityState.DROP,
      priority: CapabilityPriority.DECORATIVE,
      role: CapabilityRole.SECONDARY,
    },
  ],
  constraints: [{ key: 'no_inventory', value: 'true' }],
  contentRequirements: [
    { key: 'service_list', description: 'List of bookable services', required: true },
  ],
  evidence: [],
};

const planResult = decisionPlanSchema.safeParse(planWithAllStates);
assert(planResult.success, 'DecisionPlan with all four states accepted');

// 8. malformed DecisionPlan is rejected
assertThrows(
  () =>
    decisionPlanSchema.parse({
      id: 'plan-bad',
      capabilities: [
        {
          capability: 'not_a_capability',
          state: CapabilityState.ACTIVE,
          priority: CapabilityPriority.MANDATORY,
          role: CapabilityRole.PRIMARY,
        },
      ],
      constraints: [],
      contentRequirements: [],
      evidence: [],
    }),
  'DecisionPlan with invalid capability rejected'
);

assertThrows(
  () =>
    decisionPlanSchema.parse({
      id: 'plan-bad-2',
      capabilities: [
        {
          capability: Capability.booking,
          state: 'UNKNOWN_STATE',
          priority: CapabilityPriority.MANDATORY,
          role: CapabilityRole.PRIMARY,
        },
      ],
      constraints: [],
      contentRequirements: [],
      evidence: [],
    }),
  'DecisionPlan with invalid state rejected'
);

assertThrows(
  () =>
    decisionPlanSchema.parse({
      id: 'plan-bad-3',
      capabilities: [
        {
          capability: Capability.booking,
          state: CapabilityState.ACTIVE,
          priority: 'URGENT',
          role: CapabilityRole.PRIMARY,
        },
      ],
      constraints: [],
      contentRequirements: [],
      evidence: [],
    }),
  'DecisionPlan with invalid priority rejected'
);

assertThrows(
  () =>
    decisionPlanSchema.parse({
      id: 'plan-bad-4',
      capabilities: [
        {
          capability: Capability.booking,
          state: CapabilityState.ACTIVE,
          priority: CapabilityPriority.MANDATORY,
          role: 'LEAD',
        },
      ],
      constraints: [],
      contentRequirements: [],
      evidence: [],
    }),
  'DecisionPlan with invalid role rejected'
);

assertThrows(
  () => decisionPlanSchema.parse({ id: 'plan-bad-5' }),
  'DecisionPlan missing required fields rejected'
);

console.log('\n=== 6. BusinessMeaning / Evidence integrity ===');

const evidenceResult = provenanceSchema.safeParse(Provenance.user_asserted);
assert(evidenceResult.success, 'user_asserted provenance is a valid value');

// user_asserted must NOT be treated as system_verified (distinct values)
assert(
  (Provenance.user_asserted as string) !== (Provenance.system_verified as string),
  'user_asserted is distinct from system_verified'
);

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
