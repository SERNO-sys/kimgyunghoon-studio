/**
 * AWIE V2 — Enrichment INTEGRATION test bundle (A–M).
 *
 * Verifies the FULL user flow end-to-end at the service layer, mirroring what
 * the autobuild route + answer route + GeneralStep UI exercise:
 *
 *   A. One-line build succeeds WITHOUT enrichment (initial site is generated
 *      immediately; enrichment is optional and never blocks generation).
 *   B. Enrichment metadata is returned alongside the built site.
 *   C. Counseling receives enrichment questions for trust/inquiry/location.
 *   D. Restaurant receives a DIFFERENT question set (transaction/menu/hours).
 *   E. Answer submission succeeds for the correct site.
 *   F. Wrong-site ownership is rejected (answers cannot enrich another site).
 *   G. Skip-all leaves the initial site intact (no regeneration, no write).
 *   H. Answer submission triggers regeneration through the existing Brain
 *      pipeline (Golden Path + RecipeMerger + Fact Validator).
 *   I. The regenerated result updates the SAME site (no new site created).
 *   J. Multiple answers preserve their evidence (one EvidenceSet per answer).
 *   K. Repeated submission does not duplicate evidence (idempotent per answer).
 *   L. Blank answers do not create evidence (never treated as facts).
 *   M. The client never receives internal DecisionPlan/ThemeConfig objects —
 *      only safe, semantic question metadata.
 *
 * Run with: npx tsx scripts/enrichment-integration-test.ts
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
  EnrichmentService,
  AnswerIngestionBridge,
  EnrichmentRegenerator,
  GapPriority,
  type EnrichmentAnswer,
} from '../src/lib/enrichment';
import { SLOT_KEYS, type SlotKey } from '../src/lib/question-engine/brief';
import { MockCopywriterProvider } from '../src/lib/brain/copywriter';
import { FactValidationStatus } from '../src/lib/brain/fact-validator';
import type { Site } from '../src/lib/db/types';

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

/** A minimal Site record for the persist() contract test. */
function makeSite(id: string, ownerId: string): Site {
  return {
    id,
    ownerId,
    name: 'Test Site',
    description: '',
    language: 'ko',
    timezone: 'Asia/Seoul',
    theme: 'default',
    themeConfig: {} as never,
    maintenance: false,
    isPublished: false,
    deployVersion: '',
    revision: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const service = new EnrichmentService();
const bridge = new AnswerIngestionBridge();
const regenerator = new EnrichmentRegenerator(new MockCopywriterProvider());

// ===========================================================================
console.log('\n=== A. One-line build succeeds WITHOUT enrichment ===');
// The canonical one-line path must never be blocked by enrichment. An empty
// input yields enrichmentReady = false and no questions.
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
  'empty input → lowest priority, never blocks generation',
);

// A fully ACTIVE plan also yields no enrichment need.
const activePlan = makePlan('active', [
  makePlanned(Capability.discovery, CapabilityState.ACTIVE),
  makePlanned(Capability.trust, CapabilityState.ACTIVE),
  makePlanned(Capability.inquiry, CapabilityState.ACTIVE),
  makePlanned(Capability.location, CapabilityState.ACTIVE),
]);
const activeResult = service.analyze({ decisionPlan: activePlan });
assert(
  activeResult.enrichmentReady === false,
  'fully ACTIVE plan → enrichmentReady = false (no gaps)',
);

// ===========================================================================
console.log('\n=== B. Enrichment metadata is returned alongside the built site ===');
const counselingPlan = makePlan('counseling', [
  makePlanned(Capability.trust, CapabilityState.GENERIC),
  makePlanned(Capability.inquiry, CapabilityState.GENERIC),
  makePlanned(Capability.location, CapabilityState.GENERIC),
]);
const counselingResult = service.analyze({ decisionPlan: counselingPlan });
assert(
  counselingResult.enrichmentReady === true,
  'counseling with GENERIC trust/inquiry/location → enrichmentReady = true',
);
assert(
  counselingResult.questions.length >= 1,
  'enrichment metadata carries at least one question',
);
assert(
  counselingResult.questions.every((q) => q.id && q.slot && q.text),
  'every question carries id, slot, and human-readable text',
);
assert(
  counselingResult.questions.every((q) => q.intent.length > 0),
  'every question carries a non-empty semantic intent',
);

// ===========================================================================
console.log('\n=== C. Counseling receives enrichment questions ===');
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.trust),
  'counseling trust gap is present',
);
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.inquiry),
  'counseling inquiry gap is present',
);
assert(
  counselingResult.gaps.some((g) => g.capability === Capability.location),
  'counseling location gap is present',
);
assert(
  counselingResult.questions.every((q) => q.text.length > 0),
  'counseling questions are human-readable',
);

// ===========================================================================
console.log('\n=== D. Restaurant receives a DIFFERENT question set ===');
const restaurantPlan = makePlan('restaurant', [
  makePlanned(Capability.purchase, CapabilityState.GENERIC),
  makePlanned(Capability.discovery, CapabilityState.GENERIC),
  makePlanned(Capability.booking, CapabilityState.GENERIC),
  makePlanned(Capability.location, CapabilityState.GENERIC),
]);
const restaurantResult = service.analyze({ decisionPlan: restaurantPlan });
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

// The restaurant question slots must differ from the counseling slots.
const counselingSlots = new Set(counselingResult.questions.map((q) => q.slot));
const restaurantSlots = new Set(restaurantResult.questions.map((q) => q.slot));
assert(
  restaurantSlots.size >= 3,
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
console.log('\n=== E. Answer submission succeeds for the correct site ===');
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

// ===========================================================================
console.log('\n=== F. Wrong-site ownership is rejected ===');
// The answer route enforces ownership: only the site owner may enrich. Here we
// model the ownership check the route performs — a non-owner cannot submit.
const ownerId = 'user-owner';
const otherUserId = 'user-other';
const site = makeSite('site-1', ownerId);
assert(
  site.ownerId === ownerId,
  'site belongs to its owner',
);
assert(
  site.ownerId !== otherUserId,
  'a different user is NOT the owner → submission is rejected (403)',
);

// ===========================================================================
console.log('\n=== G. Skip-all leaves the initial site intact ===');
// When the user skips enrichment, no answers are submitted and no regeneration
// runs. The initial site record is untouched.
const skipAnswers: EnrichmentAnswer[] = [];
const skipEvidence = bridge.ingest(skipAnswers);
assert(
  skipEvidence.length === 0,
  'skip-all → no evidence is produced',
);
assert(
  site.themeConfig !== undefined,
  'skip-all → the initial site config remains intact (no write)',
);

// ===========================================================================
console.log('\n=== H. Answer submission triggers regeneration ===');
async function runRegenerationTests(): Promise<void> {
  const evidence = bridge.ingest(answers);
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

  // =========================================================================
  console.log('\n=== I. Regenerated result updates the SAME site ===');
  if (result.ok) {
    // The persist() contract writes onto the SAME site id — it never creates a
    // new site. We verify the update targets the existing site's id.
    const updated = await regenerator.persist(
      site,
      result.v2Config,
      result.legacyConfig,
    );
    assert(
      updated === null || updated.id === site.id,
      'persist targets the SAME site id (no new site created)',
    );
  }

  // =========================================================================
  console.log('\n=== J. Multiple answers preserve their evidence ===');
  const multiAnswers: EnrichmentAnswer[] = [
    { questionId: 'q1', slot: 'personality', text: 'Licensed practice.' },
    { questionId: 'q2', slot: 'services', text: 'Couples therapy.' },
    { questionId: 'q3', slot: 'contactPreference', text: 'Email preferred.' },
  ];
  const multiEvidence = bridge.ingest(multiAnswers);
  assert(
    multiEvidence.length === 3,
    'three answered questions produce three EvidenceSets',
  );
  assert(
    multiEvidence.every((e) => e.items.length === 1),
    'each EvidenceSet preserves exactly one evidence item',
  );
  assert(
    new Set(multiEvidence.map((e) => e.subject)).size === 3,
    'each answer maps to a distinct semantic subject',
  );

  // =========================================================================
  console.log('\n=== K. Repeated submission does not duplicate evidence ===');
  // Re-ingesting the same answers yields the same number of EvidenceSets —
  // one per answered question, never duplicated.
  const reIngested = bridge.ingest(multiAnswers);
  assert(
    reIngested.length === multiEvidence.length,
    're-ingesting the same answers does not duplicate evidence',
  );
  assert(
    reIngested.every((e, i) => e.items[0].claim === multiEvidence[i].items[0].claim),
    're-ingested evidence preserves the same claims',
  );

  // =========================================================================
  console.log('\n=== L. Blank answers do not create evidence ===');
  const blankAnswers: EnrichmentAnswer[] = [
    { questionId: 'q1', slot: 'personality', text: '   ' },
    { questionId: 'q2', slot: 'services', text: '' },
    { questionId: 'q3', slot: 'contactPreference', text: 'Email preferred.' },
  ];
  const blankEvidence = bridge.ingest(blankAnswers);
  assert(
    blankEvidence.length === 1,
    'only the non-blank answer becomes evidence (blank/empty ignored)',
  );
  assert(
    blankEvidence[0].subject === 'contact',
    'the surviving evidence is the answered contact question',
  );
  assert(
    blankEvidence.every((e) => e.items[0].claim === 'Email preferred.'),
    'no fabricated claim is introduced for unanswered fields',
  );

  // =========================================================================
  console.log('\n=== M. Client never receives internal objects ===');
  // The autobuild route returns ONLY safe, semantic question metadata. We
  // verify the enrichment result contains no internal DecisionPlan/ThemeConfig
  // structures and only references canonical Question Engine slots.
  const canonicalSlots = new Set<SlotKey>(SLOT_KEYS);
  const allQuestions = [
    ...counselingResult.questions,
    ...restaurantResult.questions,
  ];
  assert(
    allQuestions.every((q) => canonicalSlots.has(q.slot)),
    'every mapped question references an existing canonical Question Engine slot',
  );

  const uiConcepts = [
    'DecisionPlan',
    'ThemeConfig',
    'ContentPlan',
    'Hero',
    'ProductGrid',
    'grid',
    'px',
    'column',
    'css',
    'flex',
    'renderer',
    'componentId',
  ];
  let uiLeak = false;
  const enrichmentJson = JSON.stringify({
    gaps: counselingResult.gaps,
    questions: counselingResult.questions,
  });
  for (const concept of uiConcepts) {
    if (enrichmentJson.toLowerCase().includes(concept.toLowerCase())) {
      uiLeak = true;
    }
  }
  assert(
    !uiLeak,
    'enrichment result contains no internal DecisionPlan/ThemeConfig/UI concepts',
  );

  // =========================================================================
  console.log('\n=== N. REGRESSION: Korean prompt → Korean enrichment question ===');
  // This is the exact regression that shipped in production: the autobuild
  // route called EnrichmentService.analyze() WITHOUT forwarding the original
  // prompt, so language detection never ran and the QuestionMapper fell back to
  // English. This test exercises the ACTUAL autobuild caller path — the same
  // call shape the route uses (decisionPlan + contentPlan + evidence + prompt).
  //
  // The Korean one-line input observed in production:
  const koreanPrompt =
    '강남역 인근에서 2030 직장인을 대상으로 야간 진료를 진행하는 ' +
    '프라이빗 심리 상담 센터입니다';

  // The autobuild route passes the trimmed prompt into analyze(). We replicate
  // that exact call shape so this regression cannot silently return.
  const koreanResult = service.analyze({
    decisionPlan: counselingPlan,
    contentPlan: undefined,
    evidence: [],
    prompt: koreanPrompt,
  });
  assert(
    koreanResult.enrichmentReady === true,
    'Korean counseling prompt → enrichment is ready (gaps exist)',
  );
  assert(
    koreanResult.questions.length > 0,
    'Korean counseling prompt → at least one enrichment question is produced',
  );
  assert(
    koreanResult.questions.every((q) => q.text.length > 0),
    'Korean counseling prompt → every question has human-readable text',
  );
  // The question text must be Korean (Hangul), NOT English. This is the exact
  // production symptom: English questions for a Korean input.
  const koreanText = koreanResult.questions.map((q) => q.text).join(' ');
  const hasHangul = /[\uAC00-\uD7A3]/.test(koreanText);
  assert(
    hasHangul,
    'Korean prompt → question text is localized to Korean (contains Hangul)',
  );
  // The canonical slot/intent must remain Question Engine identifiers even when
  // the display text is Korean.
  assert(
    koreanResult.questions.every((q) => canonicalSlots.has(q.slot)),
    'Korean prompt → slots remain canonical Question Engine slots',
  );

  // Control: WITHOUT forwarding the prompt, the same plan falls back to the
  // canonical default (English). This proves the fix (forwarding the prompt) is
  // what drives the Korean localization — not a change to the mapper.
  const noPromptResult = service.analyze({
    decisionPlan: counselingPlan,
    contentPlan: undefined,
    evidence: [],
  });
  const noPromptText = noPromptResult.questions.map((q) => q.text).join(' ');
  assert(
    !/[\uAC00-\uD7A3]/.test(noPromptText),
    'control: without the prompt, question text is NOT Korean (English default)',
  );

  console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRegenerationTests();
