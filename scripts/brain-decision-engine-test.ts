/**
 * AWIE V2 Brain — Step 03 Decision Rule Engine tests.
 *
 * Verifies the deterministic Decision Rule Engine:
 *   - Semantic rules map BusinessMeaning → Capability decisions
 *   - AI capability-leak prevention (impliedCapabilities is non-authoritative)
 *   - Determinism (same input → same output)
 *   - Conflict resolution (highest priority wins)
 *   - Semantic purity (rules never produce UI/component concepts)
 *
 * Run with: npx tsx scripts/brain-decision-engine-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  evaluateRules,
  mergeCandidates,
  DECISION_RULES,
  SemanticTraitKey,
  type BusinessMeaning,
  type CapabilityCandidate,
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

function makeMeaning(overrides: Partial<BusinessMeaning>): BusinessMeaning {
  return {
    id: 'bm-test',
    primaryIntent: 'inform',
    traits: [],
    impliedCapabilities: [],
    evidence: [],
    ...overrides,
  };
}

function hasDecision(
  decisions: { capability: string; state: string }[],
  capability: string,
  state?: string
): boolean {
  return decisions.some(
    (d) =>
      d.capability === capability && (state === undefined || d.state === state)
  );
}

console.log('\n=== 1. Semantic rule mapping ===');

// Scenario A: inform intent → discovery required
const informMeaning = makeMeaning({ primaryIntent: 'inform' });
const informResult = evaluateRules(informMeaning);
assert(
  hasDecision(informResult.decisions, Capability.discovery, CapabilityState.ACTIVE),
  'inform intent → discovery ACTIVE'
);

// Scenario B: book intent → booking required
const bookMeaning = makeMeaning({ primaryIntent: 'book' });
const bookResult = evaluateRules(bookMeaning);
assert(
  hasDecision(bookResult.decisions, Capability.booking, CapabilityState.ACTIVE),
  'book intent → booking ACTIVE'
);

// Scenario C: transact intent + trust trait → purchase + trust
const transactMeaning = makeMeaning({
  primaryIntent: 'transact',
  traits: [{ key: SemanticTraitKey.trust_requirement, value: 'true' }],
});
const transactResult = evaluateRules(transactMeaning);
assert(
  hasDecision(transactResult.decisions, Capability.purchase, CapabilityState.ACTIVE),
  'transact intent → purchase ACTIVE'
);
assert(
  hasDecision(transactResult.decisions, Capability.trust, CapabilityState.ACTIVE),
  'trust_requirement trait → trust ACTIVE'
);

// Scenario D: physical presence trait → location
const locationMeaning = makeMeaning({
  primaryIntent: 'inform',
  traits: [{ key: SemanticTraitKey.physical_presence, value: 'true' }],
});
const locationResult = evaluateRules(locationMeaning);
assert(
  hasDecision(locationResult.decisions, Capability.location, CapabilityState.ACTIVE),
  'physical_presence trait → location ACTIVE'
);

console.log('\n=== 2. AI capability-leak prevention ===');

// impliedCapabilities is a NON-AUTHORITATIVE AI hint. The engine must NOT read
// it to add capabilities. A meaning with no semantic signal for booking must
// NOT produce a booking decision even if the AI hint claims booking.
const leakAttempt = makeMeaning({
  primaryIntent: 'inform',
  impliedCapabilities: [Capability.booking, Capability.purchase],
});
const leakResult = evaluateRules(leakAttempt);
assert(
  !hasDecision(leakResult.decisions, Capability.booking),
  'impliedCapabilities hint "booking" does NOT add booking (no semantic signal)'
);
assert(
  !hasDecision(leakResult.decisions, Capability.purchase),
  'impliedCapabilities hint "purchase" does NOT add purchase (no semantic signal)'
);
assert(
  hasDecision(leakResult.decisions, Capability.discovery),
  'inform intent still yields discovery (derived from semantic signal, not hint)'
);

console.log('\n=== 3. Determinism ===');

const a = evaluateRules(transactMeaning);
const b = evaluateRules(transactMeaning);
assert(
  JSON.stringify(a.decisions) === JSON.stringify(b.decisions),
  'same input produces identical output (deterministic)'
);
assert(
  JSON.stringify(a.firedRuleIds) === JSON.stringify(b.firedRuleIds),
  'same input produces identical fired rule set'
);

console.log('\n=== 4. Conflict resolution (highest priority wins) ===');

const candidates: CapabilityCandidate[] = [
  {
    capability: Capability.discovery,
    priority: CapabilityPriority.SUPPORTING,
    role: CapabilityRole.SUPPORTING,
    state: CapabilityState.GENERIC,
  },
  {
    capability: Capability.discovery,
    priority: CapabilityPriority.BUSINESS_CRITICAL,
    role: CapabilityRole.PRIMARY,
    state: CapabilityState.ACTIVE,
  },
];
const merged = mergeCandidates(candidates);
assert(merged.length === 1, 'duplicate capability merged into a single decision');
assert(
  merged[0].state === CapabilityState.ACTIVE,
  'higher-priority candidate (BUSINESS_CRITICAL) wins over SUPPORTING'
);

console.log('\n=== 5. Semantic purity (no UI/component concepts) ===');

// The engine output must never contain UI/component/layout concepts.
const allResults = [
  informResult,
  bookResult,
  transactResult,
  locationResult,
  leakResult,
];
const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'section', 'layout', 'css'];
let uiLeak = false;
for (const result of allResults) {
  for (const decision of result.decisions) {
    if (uiConcepts.includes(decision.capability)) {
      uiLeak = true;
    }
  }
}
assert(!uiLeak, 'engine output contains no UI/component/layout concepts');

// Every produced capability must be a valid canonical CapabilityId.
const canonicalIds = new Set(Object.values(Capability));
let invalidCapability = false;
for (const result of allResults) {
  for (const decision of result.decisions) {
    if (!canonicalIds.has(decision.capability as (typeof Capability)[keyof typeof Capability])) {
      invalidCapability = true;
    }
  }
}
assert(!invalidCapability, 'every produced capability is a canonical CapabilityId');

console.log('\n=== 6. Rule set integrity ===');

assert(DECISION_RULES.length > 0, 'DECISION_RULES is non-empty');
assert(
  new Set(DECISION_RULES.map((r) => r.id)).size === DECISION_RULES.length,
  'all rule ids are unique'
);
let ruleHasUi = false;
for (const rule of DECISION_RULES) {
  if (uiConcepts.includes(rule.result.capability)) {
    ruleHasUi = true;
  }
}
assert(!ruleHasUi, 'no rule produces a UI/component capability');

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
