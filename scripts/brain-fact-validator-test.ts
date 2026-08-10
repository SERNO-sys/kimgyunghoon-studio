/**
 * AWIE V2 Brain — Fact Validator contract tests (Step 10).
 *
 * Verifies the deterministic fact boundary between AI #2 and ThemeConfig:
 *   A. PASS when content uses only permitted, available evidence references.
 *   B. FAIL when content references evidence outside the permitted set.
 *   C. FAIL when content attaches a concrete fact to an unavailable requirement.
 *   D. FAIL when content targets a DORMANT capability.
 *   E. FAIL when content targets a DROP capability.
 *   F. FAIL when content targets an unknown requirement id.
 *   G. FAIL when content invents a fact (mustNotInvent pattern).
 *   H. Provenance is preserved exactly (never upgraded).
 *   I. The Validator is pure — it never mutates the ContentPlan or items.
 *
 * This is a pure, deterministic, side-effect-free test. It does NOT build an
 * E2E website and does NOT call an LLM.
 */

import {
  FactValidationStatus,
  FactViolationReason,
  validateFacts,
  resolveAllowedFactReferences,
  detectInventedFacts,
  type ContentPlan,
  type ContentPlanRequirement,
  type GeneratedContentItem,
} from '../src/lib/brain';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n== ${title} ==`);
}

/** Builds a ContentPlan fixture with a controlled fact boundary. */
function makeContentPlan(overrides?: Partial<ContentPlan>): ContentPlan {
  const requirements: ContentPlanRequirement[] = [
    {
      id: 'content-discovery',
      capability: 'discovery',
      type: 'factual',
      description: 'Describe the offerings.',
      required: true,
      factAvailability: 'available',
      genericAllowed: false,
      provenance: 'cms',
      evidenceRefs: ['ev-offering-1'],
      mustNotInvent: ['specific product names', 'specific prices'],
    },
    {
      id: 'content-inquiry',
      capability: 'inquiry',
      type: 'generic',
      description: 'Describe how to contact.',
      required: true,
      factAvailability: 'generic_safe',
      genericAllowed: true,
      evidenceRefs: [],
      mustNotInvent: ['specific phone numbers', 'specific email addresses'],
    },
  ];

  return {
    id: 'cp-1',
    planId: 'plan-1',
    requirements,
    dormant: [
      {
        capability: 'booking',
        requirementId: 'content-booking',
        note: 'Dormant; may be activated later.',
      },
    ],
    dropped: [{ capability: 'purchase', requirementId: 'content-purchase' }],

    ...overrides,
  };
}

/** Builds a generated content item fixture. */
function makeItem(overrides?: Partial<GeneratedContentItem>): GeneratedContentItem {
  return {
    id: 'item-1',
    requirementId: 'content-discovery',
    body: 'We offer professional services.',
    factReferences: ['ev-offering-1'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. PASS — permitted, available evidence reference.
// ---------------------------------------------------------------------------
section('A. PASS when content uses only permitted, available evidence');
{
  const plan = makeContentPlan();
  const result = validateFacts({ contentPlan: plan, items: [makeItem()] });
  assert(
    result.status === FactValidationStatus.PASS,
    'valid content with permitted reference PASSES'
  );
  assert(result.violations.length === 0, 'no violations on PASS');
}

// ---------------------------------------------------------------------------
// B. FAIL — reference outside the permitted set.
// ---------------------------------------------------------------------------
section('B. FAIL when content references evidence outside the permitted set');
{
  const plan = makeContentPlan();
  const result = validateFacts({
    contentPlan: plan,
    items: [makeItem({ factReferences: ['ev-other-99'] })],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'unpermitted reference FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.UnpermittedReference
    ),
    'violation reason is UnpermittedReference'
  );
  assert(
    result.violations.some((v) => v.evidenceId === 'ev-other-99'),
    'violation records the offending evidence id'
  );
}

// ---------------------------------------------------------------------------
// C. FAIL — concrete fact attached to an unavailable requirement.
// ---------------------------------------------------------------------------
section('C. FAIL when content attaches a concrete fact to an unavailable requirement');
{
  const plan = makeContentPlan();
  // inquiry is generic_safe with no permitted refs; attaching a ref must FAIL.
  const result = validateFacts({
    contentPlan: plan,
    items: [
      makeItem({
        requirementId: 'content-inquiry',
        factReferences: ['ev-offering-1'],
      }),
    ],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'concrete fact on generic_safe requirement FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.UnpermittedReference
    ),
    'unpermitted reference detected (no refs permitted for inquiry)'
  );
}

// ---------------------------------------------------------------------------
// D. FAIL — content targets a DORMANT capability.
// ---------------------------------------------------------------------------
section('D. FAIL when content targets a DORMANT capability');
{
  const plan = makeContentPlan();
  const result = validateFacts({
    contentPlan: plan,
    items: [
      makeItem({
        requirementId: 'content-booking',
        body: 'Book an appointment.',
        factReferences: [],
      }),
    ],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'content targeting DORMANT capability FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.DormantContent
    ),
    'violation reason is DormantContent'
  );
}

// ---------------------------------------------------------------------------
// E. FAIL — content targets a DROP capability.
// ---------------------------------------------------------------------------
section('E. FAIL when content targets a DROP capability');
{
  const plan = makeContentPlan();
  const result = validateFacts({
    contentPlan: plan,
    items: [
      makeItem({
        requirementId: 'content-purchase',
        body: 'Buy now.',
        factReferences: [],
      }),
    ],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'content targeting DROP capability FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.DroppedContent
    ),
    'violation reason is DroppedContent'
  );
}

// ---------------------------------------------------------------------------
// F. FAIL — unknown requirement id.
// ---------------------------------------------------------------------------
section('F. FAIL when content targets an unknown requirement id');
{
  const plan = makeContentPlan();
  const result = validateFacts({
    contentPlan: plan,
    items: [
      makeItem({
        requirementId: 'content-unknown',
        body: 'Some content.',
        factReferences: [],
      }),
    ],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'content targeting unknown requirement FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.UnknownRequirement
    ),
    'violation reason is UnknownRequirement'
  );
}

// ---------------------------------------------------------------------------
// G. FAIL — invented fact (mustNotInvent pattern).
// ---------------------------------------------------------------------------
section('G. FAIL when content invents a fact (mustNotInvent pattern)');
{
  const plan = makeContentPlan();
  const result = validateFacts({
    contentPlan: plan,
    items: [
      makeItem({
        body: 'Our service costs only $99 per month.',
        factReferences: [],
      }),
    ],
  });
  assert(
    result.status === FactValidationStatus.FAIL,
    'content with invented price FAILS'
  );
  assert(
    result.violations.some(
      (v) => v.reason === FactViolationReason.InventedFact
    ),
    'violation reason is InventedFact'
  );

  // detectInventedFacts unit check.
  const detected = detectInventedFacts('Call us at 010-1234-5678 today.');
  assert(detected.includes('phone'), 'detectInventedFacts detects a phone number');
  const clean = detectInventedFacts('We offer professional services.');
  assert(clean.length === 0, 'detectInventedFacts returns empty for clean text');
}

// ---------------------------------------------------------------------------
// H. Provenance preserved exactly (never upgraded).
// ---------------------------------------------------------------------------
section('H. Provenance is preserved exactly (never upgraded)');
{
  const plan = makeContentPlan();
  const requirement = plan.requirements[0]; // provenance: 'cms'
  const allowed = resolveAllowedFactReferences(requirement);
  assert(allowed.length === 1, 'one allowed reference resolved');
  assert(
    allowed[0].provenance === 'cms',
    'provenance preserved as cms (never upgraded to system_verified)'
  );
  assert(
    allowed[0].evidenceId === 'ev-offering-1',
    'allowed reference carries the permitted evidence id'
  );
}

// ---------------------------------------------------------------------------
// I. Purity — the Validator never mutates inputs.
// ---------------------------------------------------------------------------
section('I. The Validator is pure (never mutates inputs)');
{
  const plan = makeContentPlan();
  const items = [makeItem()];
  const planSnapshot = JSON.stringify(plan);
  const itemsSnapshot = JSON.stringify(items);

  validateFacts({ contentPlan: plan, items });

  assert(
    JSON.stringify(plan) === planSnapshot,
    'ContentPlan is not mutated'
  );
  assert(
    JSON.stringify(items) === itemsSnapshot,
    'generated items are not mutated'
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(50)}`);
console.log(`Fact Validator tests: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
}
