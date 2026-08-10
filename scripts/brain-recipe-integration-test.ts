/**
 * AWIE V2 Brain — Step 08 Recipe Integration tests.
 *
 * Verifies the Recipe Integration that composes the Step 07 Universal HOW
 * Contract with the Step 05 V2.6 Recipe Bridge:
 *   - A recipe is COMPATIBLE only when BOTH the HOW layer and the V2.6 Recipe
 *     layer can represent the DecisionPlan under its semantic constraints.
 *   - A recipe that passes HOW but fails the V2.6 Recipe layer (or vice versa)
 *     is INCOMPATIBLE.
 *   - A legacy recipe WITHOUT a HOW profile still works via the V2.6 Recipe
 *     Bridge (no regression).
 *   - DORMANT / DROP capabilities are preserved, never assembled.
 *   - The integration NEVER mutates the DecisionPlan.
 *   - The integration NEVER adds a capability or changes a state.
 *   - Determinism (same input → same output).
 *   - No UI/component/layout/CSS concepts leak into the plan.
 *
 * Run with: npx tsx scripts/brain-recipe-integration-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  RecipeIntegration,
  type DecisionPlan,
  type PlannedCapability,
} from '../src/lib/brain';
import {
  HowPrimitive,
  HowConstraintKey,
  type HowPrimitiveProfile,
} from '../src/lib/brain/how-contract';
import {
  Feature,
  RecipeRegistry,
  MODERN_BISTRO_RECIPE,
  type RecipeBlueprint,
} from '../src/lib/recipe-engine';

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
  constraints: { key: string; value: string }[] = [],
): DecisionPlan {
  return {
    id,
    capabilities,
    constraints,
    contentRequirements: [],
    evidence: [],
  };
}

/**
 * The modern-bistro recipe maps these V2.6 features:
 *   menu, reservation, address, hours, contact
 * It does NOT map: testimonials, gallery, blog, team, faq.
 *
 * So at the V2.6 Recipe layer it can express: discovery (menu), purchase
 * (menu), booking (reservation), inquiry (contact), lead_capture (contact),
 * location (address). It CANNOT express: trust (testimonials).
 *
 * At the HOW layer, we declare a profile that mirrors the recipe's actual
 * expressible primitives: collection (menu), conversion (contact/reservation),
 * schedule (hours+reservation), location (address). It does NOT express trust.
 */
const MODERN_BISTRO_HOW_PROFILE: HowPrimitiveProfile = {
  recipeId: MODERN_BISTRO_RECIPE.recipeId,
  primitives: {
    [HowPrimitive.Collection]: { requiresConcreteRecords: true },
    [HowPrimitive.Conversion]: {},
    [HowPrimitive.Schedule]: {},
    [HowPrimitive.Location]: {},
  },
};

const integration = new RecipeIntegration(
  new Map([[MODERN_BISTRO_HOW_PROFILE.recipeId, MODERN_BISTRO_HOW_PROFILE]]),
);

console.log('\n=== 1. Scenario A — Bakery (trust required, no evidence) ===');
// A bakery needs discovery + purchase + location + trust.
// modern-bistro cannot express trust at EITHER layer → INCOMPATIBLE.
const bakeryPlan = makePlan(
  'bakery',
  [
    makePlanned(Capability.discovery, CapabilityState.ACTIVE),
    makePlanned(Capability.purchase, CapabilityState.ACTIVE),
    makePlanned(Capability.location, CapabilityState.ACTIVE),
    makePlanned(Capability.trust, CapabilityState.ACTIVE),
  ],
  [{ key: HowConstraintKey.EvidenceBacked, value: 'false' }],
);
const bakeryResult = integration.evaluate(bakeryPlan, MODERN_BISTRO_RECIPE);
assert(
  bakeryResult.verdict === 'INCOMPATIBLE',
  'bakery (trust required) → modern-bistro INCOMPATIBLE (cannot express trust)',
);
assert(
  bakeryResult.capabilities.some(
    (c) =>
      c.capability === Capability.trust && c.verdict === 'INCOMPATIBLE',
  ),
  'trust is the specific INCOMPATIBLE capability across both layers',
);

console.log('\n=== 2. Scenario B — Jazz Pianist (booking, no collection) ===');
// A jazz pianist needs booking + inquiry + location. No collection required.
// modern-bistro can express all three at BOTH layers → COMPATIBLE.
const pianistPlan = makePlan('jazz-pianist', [
  makePlanned(Capability.booking, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);
const pianistResult = integration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  pianistResult.verdict === 'COMPATIBLE',
  'jazz pianist (booking + inquiry + location) → modern-bistro COMPATIBLE',
);
assert(
  pianistResult.how.verdict === 'COMPATIBLE' &&
    pianistResult.recipe.verdict === 'COMPATIBLE',
  'both the HOW layer and the V2.6 Recipe layer are COMPATIBLE',
);

console.log('\n=== 3. HOW layer rejects what the Recipe layer would allow ===');
// A GENERIC purchase requires concrete records at the HOW layer (collection
// requiresConcreteRecords=true) but the plan does NOT confirm records exist.
// The V2.6 Recipe layer alone would allow it (menu feature), but the HOW layer
// correctly rejects it to prevent fabrication.
const genericPurchasePlan = makePlan(
  'generic-purchase',
  [makePlanned(Capability.purchase, CapabilityState.GENERIC)],
  [{ key: HowConstraintKey.CollectionRequired, value: 'false' }],
);
const genericPurchaseResult = integration.evaluate(
  genericPurchasePlan,
  MODERN_BISTRO_RECIPE,
);
assert(
  genericPurchaseResult.verdict === 'INCOMPATIBLE',
  'GENERIC purchase → INCOMPATIBLE (HOW layer prevents fabricated records)',
);
assert(
  genericPurchaseResult.how.verdict === 'INCOMPATIBLE',
  'the HOW layer is the layer that rejects the GENERIC purchase',
);
assert(
  genericPurchaseResult.recipe.verdict === 'COMPATIBLE',
  'the V2.6 Recipe layer alone would have allowed it (menu feature) — the HOW layer is the guard',
);

console.log('\n=== 4. DORMANT / DROP are always compatible and preserved ===');
const dormantDropPlan = makePlan('dormant-drop', [
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.trust, CapabilityState.DROP),
]);
const dormantDropResult = integration.evaluate(
  dormantDropPlan,
  MODERN_BISTRO_RECIPE,
);
assert(
  dormantDropResult.verdict === 'COMPATIBLE',
  'DORMANT + DROP plan → COMPATIBLE (never forced active)',
);
assert(
  dormantDropResult.capabilities.every(
    (c) => c.state === CapabilityState.DORMANT || c.state === CapabilityState.DROP,
  ),
  'DORMANT / DROP states are preserved in the integration trace',
);

console.log('\n=== 5. Legacy recipe WITHOUT a HOW profile still works ===');
// A recipe with no HOW profile registered falls back to the V2.6 Recipe Bridge
// only. This must not regress the Step 05 behavior.
const legacyIntegration = new RecipeIntegration(new Map());
const legacyResult = legacyIntegration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  legacyResult.verdict === 'COMPATIBLE',
  'legacy recipe (no HOW profile) still evaluates via the V2.6 Recipe Bridge',
);
assert(
  legacyResult.how.verdict === 'COMPATIBLE' &&
    legacyResult.how.primitives.length === 0,
  'legacy recipe has an empty HOW result (no profile → no HOW constraints)',
);

console.log('\n=== 6. select() returns the first compatible recipe ===');
const registry = new RecipeRegistry();
registry.register(MODERN_BISTRO_RECIPE);
const selected = integration.select(pianistPlan, registry.list());
assert(
  selected !== undefined && selected.recipeId === 'modern-bistro',
  'select() returns the compatible modern-bistro recipe',
);
assert(
  selected !== undefined && selected.verdict === 'COMPATIBLE',
  'the selected recipe is COMPATIBLE',
);

console.log('\n=== 7. The integration NEVER mutates the DecisionPlan ===');
const before = JSON.stringify(pianistPlan);
integration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
integration.select(pianistPlan, registry.list());
const after = JSON.stringify(pianistPlan);
assert(
  before === after,
  'DecisionPlan is unchanged after evaluate + select (no mutation)',
);

console.log('\n=== 8. The integration NEVER adds a capability or changes a state ===');
const output = integration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  output.plan.capabilities.length === pianistPlan.capabilities.length,
  'integration output plan has the same capability count (no capability added)',
);
assert(
  output.plan.capabilities.every(
    (c, i) => c.state === pianistPlan.capabilities[i].state,
  ),
  'integration output plan preserves every capability state (no state changed)',
);

console.log('\n=== 9. Determinism ===');
const resultA = integration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
const resultB = integration.evaluate(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  JSON.stringify(resultA) === JSON.stringify(resultB),
  'same input produces identical integration result (deterministic)',
);

console.log('\n=== 10. Semantic purity of the integration output ===');
// The integration output must not inject UI/component/layout concepts into the
// plan.
const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'px', 'column', 'css'];
let uiLeak = false;
const planJson = JSON.stringify(output.plan);
for (const concept of uiConcepts) {
  if (planJson.toLowerCase().includes(concept.toLowerCase())) {
    uiLeak = true;
  }
}
assert(!uiLeak, 'integration output plan contains no UI/component/layout/CSS concepts');

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
