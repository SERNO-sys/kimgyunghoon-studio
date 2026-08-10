/**
 * AWIE V2 Brain — Recipe Integration INDUSTRY SAFETY BOUNDARY regression tests.
 *
 * ROOT CAUSE FIX VALIDATION:
 * A counseling business (e.g. a Korean 심리상담센터) was silently falling back
 * to the generic industry profile, and RecipeIntegration.select() ignored the
 * industry entirely. Because the only registered recipe (modern-bistro) is
 * scoped to `supportedIndustries: ['restaurant']`, a counseling prompt could
 * still select the restaurant recipe — producing a restaurant-themed site for
 * a counseling business.
 *
 * This test locks in the fix:
 *   1. RecipeIntegration.select() now accepts an optional `industryId` and
 *      refuses any recipe whose `supportedIndustries` does not include it.
 *   2. The IndustryResolver now resolves Korean counseling aliases
 *      (상담, 심리상담, 상담센터, 심리상담센터, 카운슬링) to a dedicated
 *      `counseling` profile instead of the generic fallback.
 *   3. The Golden Path passes the resolved industry into select().
 *
 * Run with: npx tsx scripts/brain-recipe-integration-industry-test.ts
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
import { MOCK_RECIPES } from '../src/lib/recipe-engine';
import {
  IndustryRegistry,
  IndustryResolver,
  GENERIC_PROFILE,
  MOCK_INDUSTRY_PROFILES,
} from '../src/lib/industry-registry';

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

function makePlan(id: string, capabilities: PlannedCapability[]): DecisionPlan {
  return {
    id,
    capabilities,
    constraints: [],
    contentRequirements: [],
    evidence: [],
  };
}

// A plan that the modern-bistro recipe CAN express at the V2.6 Recipe layer
// (booking + inquiry + location). Without the industry safety boundary this
// plan would select modern-bistro.
const compatiblePlan = makePlan('counseling-plan', [
  makePlanned(Capability.booking, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);

const integration = new RecipeIntegration();

// Build the industry resolver exactly as the Golden Path does.
const registry = new IndustryRegistry();
for (const profile of MOCK_INDUSTRY_PROFILES) {
  registry.register(profile);
}
const resolver = new IndustryResolver(registry, GENERIC_PROFILE);

console.log('\n=== 1. Test A — counseling industry must NOT select the restaurant recipe ===');
const counselingResolved = resolver.resolve('심리상담');
assert(
  counselingResolved.matched && counselingResolved.profile.industryId === 'counseling',
  'Korean "심리상담" resolves to the counseling profile (not generic)',
);
const counselingSelection = integration.select(
  compatiblePlan,
  MOCK_RECIPES,
  counselingResolved.profile.industryId,
);
assert(
  counselingSelection === undefined,
  'select(counseling) returns undefined — the restaurant-scoped recipe is refused',
);

console.log('\n=== 2. Test B — restaurant industry still selects the restaurant recipe ===');
const restaurantResolved = resolver.resolve('restaurant');
assert(
  restaurantResolved.matched && restaurantResolved.profile.industryId === 'restaurant',
  '"restaurant" resolves to the restaurant profile',
);
const restaurantSelection = integration.select(
  compatiblePlan,
  MOCK_RECIPES,
  restaurantResolved.profile.industryId,
);
assert(
  restaurantSelection !== undefined &&
    restaurantSelection.recipeId === 'modern-bistro',
  'select(restaurant) returns the modern-bistro recipe',
);

console.log('\n=== 3. Test C — backward compatibility: no industryId still selects ===');
const noIndustrySelection = integration.select(compatiblePlan, MOCK_RECIPES);
assert(
  noIndustrySelection !== undefined &&
    noIndustrySelection.recipeId === 'modern-bistro',
  'select() without industryId keeps legacy behavior (modern-bistro selected)',
);

console.log('\n=== 4. Test D — Korean counseling aliases all resolve to counseling ===');
const koreanAliases = ['상담', '심리상담', '상담센터', '심리상담센터', '카운슬링', '심리치료'];
let allResolved = true;
for (const alias of koreanAliases) {
  const r = resolver.resolve(alias);
  if (!r.matched || r.profile.industryId !== 'counseling') {
    allResolved = false;
    console.error(`    ✗ "${alias}" did not resolve to counseling`);
  }
}
assert(allResolved, 'all Korean counseling aliases resolve to the counseling profile');

console.log('\n=== 5. Test E — generic/unresolved industry never selects a scoped recipe ===');
const genericResolved = resolver.resolve('some unknown business');
assert(
  !genericResolved.matched && genericResolved.profile.industryId === 'generic',
  'unknown input falls back to the generic profile',
);
const genericSelection = integration.select(
  compatiblePlan,
  MOCK_RECIPES,
  genericResolved.profile.industryId,
);
assert(
  genericSelection === undefined,
  'select(generic) returns undefined — a scoped recipe is never selected for an unresolved industry',
);

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
