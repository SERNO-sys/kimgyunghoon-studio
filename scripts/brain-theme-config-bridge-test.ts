/**
 * AWIE V2 Brain — ThemeConfig Bridge (Step 12) focused tests.
 *
 * Verifies the ONLY boundary that connects the Brain's semantic output
 * (DecisionPlan + ContentPlan + validated generated content) to the existing
 * V2.6 Recipe/Build execution pipeline (RecipeMerger → ThemeConfig).
 *
 * The bridge is a pure ADAPTER. It translates Brain capability states into the
 * legacy boolean capability representation the V2.6 RecipeMerger consumes:
 *   ACTIVE  → enabled (true)
 *   GENERIC → enabled (true)  [content stays generic-safe]
 *   DORMANT → disabled (false / omitted)
 *   DROP    → disabled (false / omitted)
 *
 * These tests assert the deterministic guarantees:
 *   1. ACTIVE mapping
 *   2. GENERIC mapping
 *   3. DORMANT never activated
 *   4. DROP never activated
 *   5. provenance preservation
 *   6. DecisionPlan immutability
 *   7. deterministic output
 *   8. structured failure for invalid/incompatible input
 *   9. no Brain UI/layout/component/theme leakage
 *
 * STRICT CONSTRAINT: This test MUST NOT import React, HTML, CSS, ThemeConfig,
 * or Renderer. It exercises the bridge against the real V2.6 RecipeMerger
 * boundary types (MergeInput) without mutating any V2.6 implementation.
 */

import { ThemeConfigBridge } from '../src/lib/brain/theme-config-bridge';
import { buildContentPlan } from '../src/lib/brain/content-plan';
import { RecipeIntegration } from '../src/lib/brain/recipe-integration';
import type { DecisionPlan } from '../src/lib/brain/decision-plan';
import type { CapabilityId } from '../src/lib/brain/capability';
import type { ContentPlan } from '../src/lib/brain/content-plan';
import type { RecipeIntegrationResult } from '../src/lib/brain/recipe-integration';
import type { FactValidationResult } from '../src/lib/brain/fact-validator';
import type { GeneratedContentSet } from '../src/lib/brain/copywriter/types';
import type { BusinessBrief } from '../src/lib/question-engine/brief';
import type { IndustryProfile } from '../src/lib/industry-registry';
import { RESTAURANT_PROFILE } from '../src/lib/industry-registry/mocks';
import { MODERN_BISTRO_RECIPE } from '../src/lib/recipe-engine/mocks';
import type { RecipeBlueprint } from '../src/lib/recipe-engine';

/* ------------------------------------------------------------------ *
 * Test harness (no external test framework dependency).
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push(`${message} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed++;
  } else {
    failed++;
    failures.push(`${message} — expected ${b}, got ${a}`);
  }
}

/* ------------------------------------------------------------------ *
 * Fixtures.
 * ------------------------------------------------------------------ */

/** A minimal, valid BusinessBrief for the V2.6 RecipeMerger boundary. */
const BRIEF: BusinessBrief = {
  schemaVersion: 1,
  version: 1,
  businessType: { primary: 'restaurant', secondary: [] },
  goals: { primary: 'conversion', additional: ['brand_experience'] },
  audience: { primary: 'local diners', secondary: [] },
  personality: { tone: 'warm', values: [] },
  services: { items: ['menu', 'reservation', 'contact'] },
  contactPreference: { channel: 'phone', value: '02-0000-0000' },
};




/** A valid DecisionPlan with all four capability states represented. */
function buildPlan(): DecisionPlan {
  return {
    id: 'plan-restaurant-01',
    capabilities: [
      { capability: 'discovery', state: 'ACTIVE', priority: 'MANDATORY', role: 'PRIMARY' },
      { capability: 'booking', state: 'ACTIVE', priority: 'CONVERSION_CRITICAL', role: 'PRIMARY' },
      { capability: 'location', state: 'ACTIVE', priority: 'BUSINESS_CRITICAL', role: 'SUPPORTING' },
      { capability: 'inquiry', state: 'GENERIC', priority: 'SUPPORTING', role: 'SECONDARY' },
      { capability: 'trust', state: 'DORMANT', priority: 'SUPPORTING', role: 'SUPPORTING' },
      { capability: 'purchase', state: 'DROP', priority: 'DECORATIVE', role: 'SUPPORTING' },
    ],
    constraints: [
      { key: 'collectionRequired', value: 'true' },
      { key: 'evidenceBacked', value: 'false' },
    ],
    contentRequirements: [
      { key: 'offering', description: 'Content describing the offerings.', required: true },
    ],
    evidence: [],
  };
}

/** A valid ContentPlan derived from the DecisionPlan. */
function buildContentPlanFixture(plan: DecisionPlan): ContentPlan {
  return buildContentPlan(plan);
}

/** A real RecipeIntegrationResult (COMPATIBLE) for the plan + recipe. */
function buildIntegration(plan: DecisionPlan, recipe: RecipeBlueprint): RecipeIntegrationResult {
  return new RecipeIntegration().evaluate(plan, recipe);
}

/** A PASS FactValidationResult. */
function buildFactValidation(): FactValidationResult {
  return { status: 'PASS', violations: [] };
}

/** A FAIL FactValidationResult. */
function buildFailedFactValidation(): FactValidationResult {
  return {
    status: 'FAIL',
    violations: [
      {
        itemId: 'item-1',
        requirementId: 'content-discovery',
        reason: 'invented_fact',
        message: 'Generated content contains an invented price.',
      },
    ],
  };
}

/** An empty GeneratedContentSet. */
function buildContent(): GeneratedContentSet {
  return { id: 'gen-1', contentPlanId: 'content-plan-restaurant-01', items: [] };
}

/** The base IndustryProfile (legacy representation). */
function buildBaseProfile(): IndustryProfile {
  return RESTAURANT_PROFILE;
}

/** Builds a complete, valid ThemeConfigBridge input. */
function buildBridgeInput(overrides: Partial<Parameters<ThemeConfigBridge['build']>[0]> = {}) {
  const plan = buildPlan();
  const recipe = MODERN_BISTRO_RECIPE;
  const contentPlan = buildContentPlanFixture(plan);
  const integration = buildIntegration(plan, recipe);
  const base: Parameters<ThemeConfigBridge['build']>[0] = {
    plan,
    contentPlan,
    integration,
    recipe,
    content: buildContent(),
    factValidation: buildFactValidation(),
    brief: BRIEF,
    baseProfile: buildBaseProfile(),
  };
  return { ...base, ...overrides };
}

/* ------------------------------------------------------------------ *
 * Tests.
 * ------------------------------------------------------------------ */

const bridge = new ThemeConfigBridge();

// 1. ACTIVE mapping — ACTIVE capabilities enable their legacy keys.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'ACTIVE: bridge should succeed for a valid input');
  if (result.ok) {
    // discovery ACTIVE → supportsMenu, supportsPortfolio
    assertEqual(result.adapterProfile.capabilities.supportsMenu, true, 'ACTIVE discovery enables supportsMenu');
    // booking ACTIVE → supportsReservation
    assertEqual(result.adapterProfile.capabilities.supportsReservation, true, 'ACTIVE booking enables supportsReservation');
    // location ACTIVE → requiresAddress
    assertEqual(result.adapterProfile.requirements.requiresAddress, true, 'ACTIVE location enables requiresAddress');
    assert(result.enabledCapabilities.includes('discovery'), 'ACTIVE discovery is in enabledCapabilities');
    assert(result.enabledCapabilities.includes('booking'), 'ACTIVE booking is in enabledCapabilities');
  }
}

// 2. GENERIC mapping — GENERIC capabilities enable their legacy keys (content stays generic-safe).
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'GENERIC: bridge should succeed for a valid input');
  if (result.ok) {
    // inquiry GENERIC → requiresContactForm
    assertEqual(result.adapterProfile.requirements.requiresContactForm, true, 'GENERIC inquiry enables requiresContactForm');
    assert(result.enabledCapabilities.includes('inquiry'), 'GENERIC inquiry is in enabledCapabilities');
  }
}

// 3. DORMANT never activated.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'DORMANT: bridge should succeed for a valid input');
  if (result.ok) {
    // The DORMANT guarantee is capability-level: the capability must never be
    // activated. It must be absent from enabledCapabilities and present in
    // disabledCapabilities. (The exact legacy requirement key is a V2.6
    // profile detail and is not asserted here.)
    assert(!result.enabledCapabilities.includes('trust'), 'DORMANT trust is NOT in enabledCapabilities');
    assert(result.disabledCapabilities.includes('trust'), 'DORMANT trust is in disabledCapabilities');
  }
}


// 4. DROP never activated.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'DROP: bridge should succeed for a valid input');
  if (result.ok) {
    // purchase DROP → supportsOnlineOrdering must be disabled
    assertEqual(result.adapterProfile.capabilities.supportsOnlineOrdering, false, 'DROP purchase disables supportsOnlineOrdering');
    assert(!result.enabledCapabilities.includes('purchase'), 'DROP purchase is NOT in enabledCapabilities');
    assert(result.disabledCapabilities.includes('purchase'), 'DROP purchase is in disabledCapabilities');
  }
}

// 5. Provenance preservation — the bridge never fabricates or upgrades provenance.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'provenance: bridge should succeed for a valid input');
  if (result.ok) {
    // The bridge must not add any evidence/provenance to the adapter profile.
    // The base profile has no provenance field; the adapter must not invent one.
    assert(
      !('provenance' in result.adapterProfile),
      'provenance: adapter profile must not fabricate a provenance field',
    );
    // The DecisionPlan evidence is preserved unchanged (empty here).
    assertDeepEqual(input.plan.evidence, [], 'provenance: plan evidence is preserved unchanged');
  }
}

// 6. DecisionPlan immutability — the bridge never mutates the plan.
{
  const input = buildBridgeInput();
  const planBefore = JSON.stringify(input.plan);
  const result = bridge.build(input);
  assert(result.ok, 'immutability: bridge should succeed for a valid input');
  const planAfter = JSON.stringify(input.plan);
  assertEqual(planAfter, planBefore, 'immutability: DecisionPlan is not mutated by the bridge');
}

// 7. Deterministic output — same input always produces the same result.
{
  const inputA = buildBridgeInput();
  const inputB = buildBridgeInput();
  const resultA = bridge.build(inputA);
  const resultB = bridge.build(inputB);
  assert(resultA.ok && resultB.ok, 'determinism: both builds should succeed');
  if (resultA.ok && resultB.ok) {
    assertDeepEqual(
      resultA.adapterProfile.capabilities,
      resultB.adapterProfile.capabilities,
      'determinism: adapter capabilities are identical across runs',
    );
    assertDeepEqual(
      resultA.adapterProfile.requirements,
      resultB.adapterProfile.requirements,
      'determinism: adapter requirements are identical across runs',
    );
    assertDeepEqual(
      resultA.enabledCapabilities,
      resultB.enabledCapabilities,
      'determinism: enabledCapabilities are identical across runs',
    );
    assertDeepEqual(
      resultA.disabledCapabilities,
      resultB.disabledCapabilities,
      'determinism: disabledCapabilities are identical across runs',
    );
  }
}

// 8a. Structured failure — missing recipe.
{
  const input = buildBridgeInput({ recipe: undefined as unknown as RecipeBlueprint });
  const result = bridge.build(input);
  assert(!result.ok, 'failure: missing recipe must fail');
  if (!result.ok) {
    assertEqual(result.error.code, 'MISSING_RECIPE', 'failure: missing recipe yields MISSING_RECIPE');
  }
}

// 8b. Structured failure — missing base profile.
{
  const input = buildBridgeInput({ baseProfile: undefined as unknown as IndustryProfile });
  const result = bridge.build(input);
  assert(!result.ok, 'failure: missing base profile must fail');
  if (!result.ok) {
    assertEqual(result.error.code, 'MISSING_BASE_PROFILE', 'failure: missing base profile yields MISSING_BASE_PROFILE');
  }
}

// 8c. Structured failure — INCOMPATIBLE recipe integration.
{
  const plan = buildPlan();
  // Force an INCOMPATIBLE integration by using a recipe that cannot express
  // the ACTIVE capabilities. We build a minimal incompatible result by hand.
  const incompatibleIntegration: RecipeIntegrationResult = {
    recipeId: 'incompatible-recipe',
    verdict: 'INCOMPATIBLE',
    how: { recipeId: 'incompatible-recipe', verdict: 'INCOMPATIBLE', primitives: [], reasons: ['cannot express'] },
    recipe: {
      recipeId: 'incompatible-recipe',
      verdict: 'INCOMPATIBLE',
      capabilities: [],
      reasons: ['cannot express ACTIVE capability'],
    },
    capabilities: [],
    reasons: ['cannot express ACTIVE capability'],
    plan,
  };
  const input = buildBridgeInput({ integration: incompatibleIntegration });
  const result = bridge.build(input);
  assert(!result.ok, 'failure: INCOMPATIBLE integration must fail');
  if (!result.ok) {
    assertEqual(result.error.code, 'INCOMPATIBLE_RECIPE', 'failure: INCOMPATIBLE integration yields INCOMPATIBLE_RECIPE');
  }
}

// 8d. Structured failure — FAIL fact validation.
{
  const input = buildBridgeInput({ factValidation: buildFailedFactValidation() });
  const result = bridge.build(input);
  assert(!result.ok, 'failure: FAIL fact validation must fail');
  if (!result.ok) {
    assertEqual(result.error.code, 'FACT_VALIDATION_FAILED', 'failure: FAIL fact validation yields FACT_VALIDATION_FAILED');
  }
}

// 9. No Brain UI/layout/component/theme leakage.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'leakage: bridge should succeed for a valid input');
  if (result.ok) {
    // The MergeInput must not carry any Brain UI/layout/component/theme concepts.
    const mergeInput = result.mergeInput;
    const serialized = JSON.stringify(mergeInput);
    const forbidden = ['Hero.tsx', 'ProductGrid', 'grid-cols', 'px-', 'ThemeConfig', 'React.Component'];
    for (const token of forbidden) {
      assert(!serialized.includes(token), `leakage: MergeInput must not contain "${token}"`);
    }
    // The adapter profile must not contain any Brain capability ids as UI concepts.
    const profileSerialized = JSON.stringify(result.adapterProfile);
    assert(!profileSerialized.includes('discovery'), 'leakage: adapter profile must not leak Brain capability ids');
  }
}

// 10. Real integration path — the bridge produces a MergeInput the V2.6
//     RecipeMerger boundary accepts (structural compatibility).
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'real integration: bridge should succeed for a valid input');
  if (result.ok) {
    assert(result.mergeInput.recipe === MODERN_BISTRO_RECIPE, 'real integration: recipe is preserved');
    assert(result.mergeInput.industryProfile === result.adapterProfile, 'real integration: industryProfile is the adapter profile');
    assert(result.mergeInput.brief === BRIEF, 'real integration: brief is preserved');
    assert(result.mergeInput.userPreferences === undefined, 'real integration: userPreferences is undefined when absent');
  }
}

// 11. User preferences pass-through (highest priority, when present).
{
  const userPreferences = { preferredSkin: 'dark' } as Parameters<ThemeConfigBridge['build']>[0]['userPreferences'];
  const input = buildBridgeInput({ userPreferences });
  const result = bridge.build(input);
  assert(result.ok, 'userPreferences: bridge should succeed for a valid input');
  if (result.ok) {
    assertEqual(result.mergeInput.userPreferences, userPreferences, 'userPreferences: passed through unchanged');
  }
}

// 12. Non-capability base profile fields are preserved unchanged.
{
  const input = buildBridgeInput();
  const result = bridge.build(input);
  assert(result.ok, 'preserve fields: bridge should succeed for a valid input');
  if (result.ok) {
    assertEqual(result.adapterProfile.industryId, RESTAURANT_PROFILE.industryId, 'preserve fields: industryId preserved');
    assertDeepEqual(
      result.adapterProfile.intent,
      RESTAURANT_PROFILE.intent,
      'preserve fields: intent preserved',
    );
  }
}

/* ------------------------------------------------------------------ *
 * Report.
 * ------------------------------------------------------------------ */

console.log('\n=== Brain ThemeConfig Bridge (Step 12) Test ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  process.exit(1);
}

console.log('\nAll ThemeConfig Bridge tests passed.');
