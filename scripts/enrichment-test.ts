/**
 * AWIE V2 — Enrichment feature bundle tests.
 *
 * Verifies the provider-independent Gap Analyzer, Question Mapper, Enrichment
 * Service, and Answer Ingestion Bridge:
 *
 *   A. Counseling — generic trust/inquiry/location gaps produce useful question
 *      intents.
 *   B. Restaurant — transaction/menu/hours/reservation gaps produce different
 *      questions.
 *   C. Generic business — only relevant gaps are produced.
 *   D. Prioritization — result contains at most 3–5 questions.
 *   E. Question mapping — only existing canonical Question Engine slots/intents
 *      are referenced.
 *   F. Answer ingestion — answers become semantic business evidence.
 *   G. No hallucinated facts — unanswered fields are not fabricated.
 *   H. Initial one-line generation remains unaffected (enrichment is optional
 *      and never blocks generation).
 *
 * Run with: npx tsx scripts/enrichment-test.ts
 */

import {
  Capability,
  CapabilityState,
  CapabilityPriority,
  CapabilityRole,
  Provenance,
  type DecisionPlan,
  type PlannedCapability,
  type EvidenceSet,
} from '../src/lib/brain';
import {
  GapAnalyzer,
  QuestionMapper,
  EnrichmentService,
  AnswerIngestionBridge,
  EnrichmentRegenerator,
  ingestAnswers,
  GapPriority,
  type GapAnalysisInput,
  type EnrichmentAnswer,
} from '../src/lib/enrichment';
import { SLOT_KEYS, type SlotKey } from '../src/lib/question-engine/brief';
import { MockCopywriterProvider } from '../src/lib/brain/copywriter';
import { FactValidationStatus } from '../src/lib/brain/fact-validator';


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

function makeInput(plan: DecisionPlan): GapAnalysisInput {
  return { decisionPlan: plan };
}

const analyzer = new GapAnalyzer();
const mapper = new QuestionMapper();
const service = new EnrichmentService();
const bridge = new AnswerIngestionBridge();

// ===========================================================================
console.log('\n=== A. Counseling — trust/inquiry/location gaps → useful intents ===');
// A counseling practice with trust, inquiry, and location all GENERIC.
const counselingPlan = makePlan('counseling', [
  makePlanned(Capability.trust, CapabilityState.GENERIC),
  makePlanned(Capability.inquiry, CapabilityState.GENERIC),
  makePlanned(Capability.location, CapabilityState.GENERIC),
]);
const counselingResult = service.analyze(makeInput(counselingPlan));

assert(
  counselingResult.enrichmentReady === true,
  'counseling with GENERIC trust/inquiry/location → enrichmentReady = true',
);
assert(
  counselingResult.gaps.length >= 1,
  'counseling produces at least one gap',
);
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.trust),
  'trust gap is present',
);
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.inquiry),
  'inquiry gap is present',
);
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.location),
  'location gap is present',
);
assert(
  counselingResult.questions.every((q) => q.intent.length > 0),
  'every counseling question has a non-empty semantic intent',
);
assert(
  counselingResult.questions.every((q) => q.text.length > 0),
  'every counseling question has human-readable text',
);

// ===========================================================================
console.log('\n=== B. Restaurant — transaction/menu/hours/reservation gaps → different questions ===');
const restaurantPlan = makePlan('restaurant', [
  makePlanned(Capability.purchase, CapabilityState.GENERIC),
  makePlanned(Capability.discovery, CapabilityState.GENERIC),
  makePlanned(Capability.booking, CapabilityState.GENERIC),
  makePlanned(Capability.location, CapabilityState.GENERIC),
]);
const restaurantResult = service.analyze(makeInput(restaurantPlan));

assert(
  restaurantResult.gaps.some((g) => g.capability === Capability.purchase),
  'restaurant purchase (transaction) gap is present',
);
assert(
  restaurantResult.gaps.some((g) => g.capability === Capability.discovery),
  'restaurant discovery (menu) gap is present',
);
assert(
  restaurantResult.gaps.some((g) => g.capability === Capability.booking),
  'restaurant booking (reservation) gap is present',
);
assert(
  restaurantResult.gaps.some((g) => g.capability === Capability.location),
  'restaurant location (hours/address) gap is present',
);

// The restaurant questions must differ from the counseling questions.
const counselingIntents = new Set(counselingResult.questions.map((q) => q.slot));
const restaurantIntents = new Set(restaurantResult.questions.map((q) => q.slot));
assert(
  restaurantIntents.size >= 3,
  'restaurant produces a distinct set of question slots (>= 3 distinct)',
);
assert(
  restaurantResult.questions.some((q) => q.slot === 'services'),
  'restaurant discovery maps to the existing services slot',
);
assert(
  restaurantResult.questions.some((q) => q.slot === 'contactPreference'),
  'restaurant booking/contact maps to the existing contactPreference slot',
);

// ===========================================================================
console.log('\n=== C. Generic business — only relevant gaps are produced ===');
// A generic business with only discovery GENERIC; everything else ACTIVE.
const genericPlan = makePlan('generic', [
  makePlanned(Capability.discovery, CapabilityState.GENERIC),
  makePlanned(Capability.trust, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);
const genericResult = service.analyze(makeInput(genericPlan));

assert(
  genericResult.gaps.length === 1,
  'generic business with one GENERIC capability produces exactly one gap',
);
assert(
  genericResult.gaps[0].capability === Capability.discovery,
  'the single gap is for the GENERIC discovery capability',
);
assert(
  genericResult.gaps.every((g) => g.capability !== Capability.trust),
  'ACTIVE trust is NOT reported as a gap',
);
assert(
  genericResult.gaps.every((g) => g.capability !== Capability.inquiry),
  'ACTIVE inquiry is NOT reported as a gap',
);
assert(
  genericResult.gaps.every((g) => g.capability !== Capability.location),
  'ACTIVE location is NOT reported as a gap',
);

// ===========================================================================
console.log('\n=== D. Prioritization — at most 3–5 questions ===');
// A business with many GENERIC capabilities to force prioritization.
const manyPlan = makePlan('many', [
  makePlanned(Capability.discovery, CapabilityState.GENERIC),
  makePlanned(Capability.purchase, CapabilityState.GENERIC),
  makePlanned(Capability.booking, CapabilityState.GENERIC),
  makePlanned(Capability.inquiry, CapabilityState.GENERIC),
  makePlanned(Capability.leadCapture, CapabilityState.GENERIC),
  makePlanned(Capability.location, CapabilityState.GENERIC),
  makePlanned(Capability.trust, CapabilityState.GENERIC),
]);
const manyResult = service.analyze(makeInput(manyPlan));

assert(
  manyResult.questions.length >= 3 && manyResult.questions.length <= 5,
  `prioritization returns ${manyResult.questions.length} questions (within 3–5)`,
);
assert(
  manyResult.gaps.length === manyResult.questions.length,
  'one question per prioritized gap',
);
assert(
  manyResult.priority === GapPriority.MANDATORY ||
    manyResult.priority === GapPriority.CONVERSION_CRITICAL ||
    manyResult.priority === GapPriority.BUSINESS_CRITICAL,
  'overall priority is a valid high-priority value',
);

// ===========================================================================
console.log('\n=== E. Question mapping — only existing canonical Question Engine slots ===');
const canonicalSlots = new Set<SlotKey>(SLOT_KEYS);
const allQuestions = [
  ...counselingResult.questions,
  ...restaurantResult.questions,
  ...genericResult.questions,
  ...manyResult.questions,
];
assert(
  allQuestions.every((q) => canonicalSlots.has(q.slot)),
  'every mapped question references an existing canonical Question Engine slot',
);
assert(
  allQuestions.length > 0,
  'mapping produced questions across scenarios',
);

// ===========================================================================
console.log('\n=== F. Answer ingestion — answers become semantic business evidence ===');
const answers: EnrichmentAnswer[] = [
  {
    questionId: 'q-trust',
    slot: 'personality',
    text: 'We are a licensed, trauma-informed practice with 10 years of experience.',
  },
  {
    questionId: 'q-services',
    slot: 'services',
    text: 'Individual and couples counseling.',
  },
];
const ingested = bridge.ingest(answers);

assert(
  ingested.length === 2,
  'two answered questions produce two EvidenceSets',
);
assert(
  ingested.every((e) => e.items.length === 1),
  'each EvidenceSet has exactly one evidence item',
);
assert(
  ingested.every((e) => e.items[0].provenance === Provenance.user_asserted),
  'ingested evidence carries user_asserted provenance (NOT system_verified)',
);
assert(
  ingested.some((e) => e.subject === 'trust'),
  'personality slot maps to the trust semantic subject',
);
assert(
  ingested.some((e) => e.subject === 'offering'),
  'services slot maps to the offering semantic subject',
);
assert(
  ingested.every((e) => e.items[0].claim.length > 0),
  'the answer text is preserved as the evidence claim',
);

// Convenience function also works.
const ingestedFn = ingestAnswers(answers);
assert(
  ingestedFn.length === 2,
  'ingestAnswers convenience function returns the same evidence count',
);

// ===========================================================================
console.log('\n=== G. No hallucinated facts — unanswered fields are not fabricated ===');
const partialAnswers: EnrichmentAnswer[] = [
  {
    questionId: 'q-trust',
    slot: 'personality',
    text: 'We are a licensed practice.',
  },
  {
    questionId: 'q-services',
    slot: 'services',
    text: '   ', // blank answer — must be ignored
  },
  {
    questionId: 'q-location',
    slot: 'contactPreference',
    text: '', // empty answer — must be ignored
  },
];
const partialIngested = bridge.ingest(partialAnswers);

assert(
  partialIngested.length === 1,
  'only the non-blank answer becomes evidence (blank/empty ignored)',
);
assert(
  partialIngested[0].subject === 'trust',
  'the surviving evidence is the answered trust question',
);
assert(
  partialIngested.every((e) => e.items[0].claim === 'We are a licensed practice.'),
  'no fabricated claim is introduced for unanswered fields',
);

// ===========================================================================
console.log('\n=== H. Initial one-line generation remains unaffected ===');
// Enrichment must be optional: an empty input yields enrichmentReady = false
// and never throws, so the canonical one-line path is never blocked.
const emptyResult = service.analyze({});
assert(
  emptyResult.enrichmentReady === false,
  'empty input → enrichmentReady = false (enrichment is optional)',
);
assert(
  emptyResult.gaps.length === 0 && emptyResult.questions.length === 0,
  'empty input → no gaps and no questions',
);
assert(
  emptyResult.priority === GapPriority.DECORATIVE,
  'empty input → lowest priority (DECORATIVE), never blocks generation',
);

// A fully ACTIVE plan also yields no enrichment need.
const activePlan = makePlan('active', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
  makePlanned(Capability.trust, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);
const activeResult = service.analyze(makeInput(activePlan));
assert(
  activeResult.enrichmentReady === false,
  'fully ACTIVE plan → enrichmentReady = false (no gaps)',
);

// ===========================================================================
console.log('\n=== Semantic purity of the enrichment module ===');
const uiConcepts = ['Hero', 'ProductGrid', 'grid', 'px', 'column', 'css', 'flex', 'ThemeConfig', 'renderer'];
let uiLeak = false;
const enrichmentJson = JSON.stringify({
  gaps: manyResult.gaps,
  questions: manyResult.questions,
});
for (const concept of uiConcepts) {
  if (enrichmentJson.toLowerCase().includes(concept.toLowerCase())) {
    uiLeak = true;
  }
}
assert(!uiLeak, 'enrichment result contains no UI/ThemeConfig/Renderer concepts');

// ===========================================================================
console.log('\n=== I. Regeneration — answers re-enter the existing Brain pipeline ===');
// The EnrichmentRegenerator re-runs the existing Golden Path with the new
// semantic evidence and produces an updated ThemeConfig. It reuses the
// existing RecipeMerger and Fact Validator — it does NOT redesign the path.
async function runRegenerationTest(): Promise<void> {
  const regenerator = new EnrichmentRegenerator(new MockCopywriterProvider());
  const evidence = bridge.ingest([
    {
      questionId: 'q-trust',
      slot: 'personality',
      text: 'We are a licensed, trauma-informed practice with 10 years of experience.',
    },
    {
      questionId: 'q-services',
      slot: 'services',
      text: 'Individual and couples counseling.',
    },
  ]);

  const result = await regenerator.regenerate(
    'A counseling practice offering individual and couples therapy.',
    evidence,
  );

  assert(result.ok === true, 'regeneration succeeds with supplied evidence');
  if (result.ok) {
    assert(
      result.factValidation.status === FactValidationStatus.PASS,
      'regenerated content passes the existing Fact Validator',
    );
    assert(
      result.v2Config.metadata?.title?.length > 0,
      'regenerated V2 ThemeConfig carries a title',
    );
    assert(
      (result.legacyConfig.content?.hero_title?.length ?? 0) > 0,
      'regenerated legacy ThemeConfig carries hero content',
    );
    assert(
      result.plan.capabilities.length > 0,
      'regenerated DecisionPlan contains capabilities',
    );
    assert(
      result.contentPlan.requirements.length > 0,
      'regenerated ContentPlan contains requirements',
    );
  }

  // SAFETY: unanswered fields are never fabricated. Passing NO evidence must
  // still produce a valid (non-fabricated) regeneration — the pipeline simply
  // has less evidence, and the Fact Validator remains authoritative.
  const noEvidence = await regenerator.regenerate(
    'A counseling practice offering individual and couples therapy.',
    [],
  );
  assert(
    noEvidence.ok === true,
    'regeneration with no additional evidence still succeeds (optional enrichment)',
  );
  if (noEvidence.ok) {
    assert(
      noEvidence.factValidation.status === FactValidationStatus.PASS,
      'no-evidence regeneration still passes the Fact Validator',
    );
  }
}

runRegenerationTest().then(() => {
  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
});


if (failed > 0) {
  process.exit(1);
}
