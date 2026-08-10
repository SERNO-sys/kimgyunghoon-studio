/**
 * AWIE V2 Brain — Step 05 Recipe Bridge tests.
 *
 * Verifies the deterministic Recipe Bridge that connects the Brain's semantic
 * DecisionPlan (WHAT) to the V2.6 Recipe layer (HOW):
 *   - ACTIVE capability requires a recipe that can express it
 *   - GENERIC capability requires a recipe that can express it WITHOUT
 *     requiring concrete records (no fabricated data)
 *   - DORMANT / DROP capabilities are always compatible and preserved
 *   - The bridge NEVER mutates the DecisionPlan
 *   - The bridge NEVER adds a capability or changes a state
 *   - Real V2.6 integration via RecipeRegistry + MODERN_BISTRO_RECIPE
 *   - Determinism (same input → same output)
 *
 * Run with: npx tsx scripts/brain-recipe-bridge-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  RecipeBridge,
  type DecisionPlan,
  type PlannedCapability,
  type RecipeCompatibilityProfile,
} from '../src/lib/brain';
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
): DecisionPlan {
  return {
    id,
    capabilities,
    constraints: [],
    contentRequirements: [],
    evidence: [],
  };
}

/**
 * The modern-bistro recipe maps these features:
 *   menu, reservation, address, hours, contact
 * It does NOT map: testimonials, gallery, blog, team, faq.
 *
 * So it can express: discovery (menu), purchase (menu), booking (reservation),
 * inquiry (contact), lead_capture (contact), location (address).
 * It CANNOT express: trust (testimonials).
 */
const MODERN_BISTRO_PROFILE: RecipeCompatibilityProfile = {
  recipeId: MODERN_BISTRO_RECIPE.recipeId,
  // A menu implies concrete product records; a GENERIC purchase cannot be
  // satisfied without fabricating a menu.
  requiresConcreteRecords: [Capability.purchase],
};

const bridge = new RecipeBridge(
  new Map([[MODERN_BISTRO_PROFILE.recipeId, MODERN_BISTRO_PROFILE]]),
);

console.log('\n=== 1. Scenario A — Bakery (collection-dependent) ===');
// A bakery needs discovery + purchase + location + trust.
// modern-bistro cannot express trust (no testimonials) → INCOMPATIBLE.
const bakeryPlan = makePlan('bakery', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
  makePlanned(Capability.purchase, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
  makePlanned(Capability.trust, CapabilityState.GENERIC),
]);
const bakeryResult = bridge.checkCompatibility(bakeryPlan, MODERN_BISTRO_RECIPE);
assert(
  bakeryResult.verdict === 'INCOMPATIBLE',
  'bakery (trust required) → modern-bistro INCOMPATIBLE (cannot express trust)'
);
assert(
  bakeryResult.capabilities.some(
    (c) => c.capability === Capability.trust && c.verdict === 'INCOMPATIBLE',
  ),
  'trust is the specific INCOMPATIBLE capability (no testimonials feature)'
);

console.log('\n=== 2. Scenario B — Jazz Pianist (booking, no collection) ===');
// A jazz pianist needs booking + inquiry + location. No collection required.
// modern-bistro can express all three → COMPATIBLE.
const pianistPlan = makePlan('jazz-pianist', [
  makePlanned(Capability.booking, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);
const pianistResult = bridge.checkCompatibility(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  pianistResult.verdict === 'COMPATIBLE',
  'jazz pianist (booking + inquiry + location) → modern-bistro COMPATIBLE'
);

console.log('\n=== 3. Scenario C — B2B Security (lead capture, no collection) ===');
// A B2B security firm needs discovery + lead_capture + inquiry + trust.
// modern-bistro cannot express trust → INCOMPATIBLE.
const b2bPlan = makePlan('b2b-security', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
  makePlanned(Capability.leadCapture, CapabilityState.ACTIVE),

  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.trust, CapabilityState.GENERIC),
]);
const b2bResult = bridge.checkCompatibility(b2bPlan, MODERN_BISTRO_RECIPE);
assert(
  b2bResult.verdict === 'INCOMPATIBLE',
  'B2B security (trust required) → modern-bistro INCOMPATIBLE'
);

console.log('\n=== 4. GENERIC collection-dependent capability is rejected ===');
// A GENERIC purchase against a recipe that requires concrete records (menu)
// must be INCOMPATIBLE — the recipe would fabricate a menu.
const genericPurchasePlan = makePlan('generic-purchase', [
  makePlanned(Capability.purchase, CapabilityState.GENERIC),
]);
const genericPurchaseResult = bridge.checkCompatibility(
  genericPurchasePlan,
  MODERN_BISTRO_RECIPE,
);
assert(
  genericPurchaseResult.verdict === 'INCOMPATIBLE',
  'GENERIC purchase → modern-bistro INCOMPATIBLE (menu requires concrete records)'
);
assert(
  genericPurchaseResult.capabilities.some(
    (c) =>
      c.capability === Capability.purchase &&
      c.state === CapabilityState.GENERIC &&
      c.verdict === 'INCOMPATIBLE',
  ),
  'the GENERIC purchase is rejected for requiring concrete records (no fabrication)'
);

console.log('\n=== 5. DORMANT / DROP are always compatible and preserved ===');
const dormantDropPlan = makePlan('dormant-drop', [
  makePlanned(Capability.booking, CapabilityState.DORMANT),
  makePlanned(Capability.trust, CapabilityState.DROP),
]);
const dormantDropResult = bridge.checkCompatibility(
  dormantDropPlan,
  MODERN_BISTRO_RECIPE,
);
assert(
  dormantDropResult.verdict === 'COMPATIBLE',
  'DORMANT + DROP plan → modern-bistro COMPATIBLE (never forced active)'
);
const preserved = bridge.selectRecipe(dormantDropPlan, [MODERN_BISTRO_RECIPE]);
assert(
  preserved !== undefined &&
    preserved.preserved.some((p) => p.state === CapabilityState.DORMANT),
  'DORMANT state is preserved across the bridge',
);
assert(
  preserved !== undefined &&
    preserved.preserved.some((p) => p.state === CapabilityState.DROP),
  'DROP state is preserved across the bridge',
);

console.log('\n=== 6. The bridge NEVER mutates the DecisionPlan ===');
const before = JSON.stringify(pianistPlan);
bridge.checkCompatibility(pianistPlan, MODERN_BISTRO_RECIPE);
bridge.selectRecipe(pianistPlan, [MODERN_BISTRO_RECIPE]);
const after = JSON.stringify(pianistPlan);
assert(
  before === after,
  'DecisionPlan is unchanged after checkCompatibility + selectRecipe (no mutation)'
);

console.log('\n=== 7. The bridge NEVER adds a capability or changes a state ===');
const output = bridge.selectRecipe(pianistPlan, [MODERN_BISTRO_RECIPE]);
assert(
  output !== undefined &&
    output.plan.capabilities.length === pianistPlan.capabilities.length,
  'bridge output plan has the same capability count (no capability added)'
);
assert(
  output !== undefined &&
    output.plan.capabilities.every(
      (c, i) => c.state === pianistPlan.capabilities[i].state,
    ),
  'bridge output plan preserves every capability state (no state changed)'
);

console.log('\n=== 8. Real V2.6 integration via RecipeRegistry ===');
const registry = new RecipeRegistry();
registry.register(MODERN_BISTRO_RECIPE);
const selected = bridge.selectRecipe(pianistPlan, registry.list());
assert(
  selected !== undefined && selected.recipe.recipeId === 'modern-bistro',
  'selectRecipe returns the registered modern-bistro recipe from the V2.6 registry'
);
assert(
  selected !== undefined && selected.recipe === MODERN_BISTRO_RECIPE,
  'the returned recipe is the actual V2.6 RecipeBlueprint (HOW), not a copy'
);

console.log('\n=== 9. Determinism ===');
const resultA = bridge.checkCompatibility(pianistPlan, MODERN_BISTRO_RECIPE);
const resultB = bridge.checkCompatibility(pianistPlan, MODERN_BISTRO_RECIPE);
assert(
  JSON.stringify(resultA) === JSON.stringify(resultB),
  'same input produces identical compatibility result (deterministic)'
);

console.log('\n=== 10. Semantic purity of the bridge output ===');
// The bridge output must not inject UI/component/layout concepts into the plan.
const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'px', 'column', 'css'];
let uiLeak = false;
if (output) {
  const planJson = JSON.stringify(output.plan);
  for (const concept of uiConcepts) {
    if (planJson.toLowerCase().includes(concept.toLowerCase())) {
      uiLeak = true;
    }
  }
}
assert(!uiLeak, 'bridge output plan contains no UI/component/layout/CSS concepts');

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
