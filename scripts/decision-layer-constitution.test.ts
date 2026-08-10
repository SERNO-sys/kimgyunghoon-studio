/**
 * AWIE V2 - Phase K.2: Decision Layer - Decision Layer Constitution Test.
 *
 * Verifies that the Decision Layer (`src/lib/decision`) enforces the
 * constitutional mandates of the AI decision surface:
 *
 *   1. NO LAST-WRITER-WINS
 *      A stale AI draft can never silently overwrite a newer one. Every commit
 *      is guarded by an optimistic concurrency token (`revision`) and fails
 *      loudly on conflict.
 *
 *   2. SIDE-EFFECT-ONLY BOUNDARY
 *      The DecisionEngine only *decides* and *persists*. It never renders,
 *      prices, or evaluates permissions. Business logic lives elsewhere.
 *
 *   3. PURE ENGINE
 *      The engine holds no state and imports no Core, no renderer, and no
 *      runtime services. All persistence is delegated to the injected
 *      `DecisionWriter` port.
 *
 *   4. THIN WRAPPER
 *      The DraftWriter is a thin adapter that reuses the existing
 *      revision-guarded query layer. No business logic lives in the adapter.
 *
 * This test is a constitutional baseline. It MUST pass before Phase K.2 is
 * considered complete.
 */

import { strict as assert } from 'node:assert';

import { DecisionEngine, createDraftWriter } from '../src/lib/decision';
import type { DecisionWriter } from '../src/lib/decision';

// ---------------------------------------------------------------------------
// 1. OPTIMISTIC CONCURRENCY (NO LAST-WRITER-WINS)
// ---------------------------------------------------------------------------

/** A fake writer that simulates a revision-guarded store. */
function makeFakeWriter(): DecisionWriter & { currentRevision: number } {
  let revision = 0;
  return {
    currentRevision: 0,
    async commit(siteId, _surface, baseRevision, _payload) {
      if (baseRevision !== revision) {
        return null; // stale write rejected
      }
      revision += 1;
      this.currentRevision = revision;
      return revision;
    },
  };
}

async function testOptimisticConcurrency(): Promise<void> {

  const writer = makeFakeWriter();
  const engine = new DecisionEngine({ writer });

  // First commit succeeds (base revision 0 matches current 0).
  const first = await engine.commit({
    siteId: 'p1',
    surface: 'themeConfig',
    baseRevision: 0,
    payload: { hero: { title: 'v1' } },
  });
  assert.equal(first.outcome, 'committed', 'first commit should commit');
  assert.equal(first.newRevision, 1, 'revision should advance to 1');

  // A stale draft (still based on revision 0) MUST be rejected as a conflict.
  const stale = await engine.commit({
    siteId: 'p1',
    surface: 'themeConfig',
    baseRevision: 0,
    payload: { hero: { title: 'stale' } },
  });
  assert.equal(stale.outcome, 'conflict', 'stale draft must conflict');
  assert.ok(stale.reason, 'conflict must carry a reason');

  // A fresh draft (based on revision 1) succeeds.
  const fresh = await engine.commit({
    siteId: 'p1',
    surface: 'themeConfig',
    baseRevision: 1,
    payload: { hero: { title: 'v2' } },
  });
  assert.equal(fresh.outcome, 'committed', 'fresh draft should commit');
  assert.equal(fresh.newRevision, 2, 'revision should advance to 2');

  console.log('  [PASS] Optimistic Concurrency (No Last-Writer-Wins)');
}

// ---------------------------------------------------------------------------
// 2. VALIDATION REJECTION (REJECT BEFORE SIDE EFFECT)
// ---------------------------------------------------------------------------

async function testValidationRejection(): Promise<void> {

  let commitCalls = 0;
  const writer: DecisionWriter = {
    async commit() {
      commitCalls += 1;
      return 1;
    },
  };

  const engine = new DecisionEngine({
    writer,
    validators: [
      {
        validate(draft) {
          if (draft.surface === 'themeConfig' && !draft.payload) {
            return 'themeConfig payload is required';
          }
          return null;
        },
      },
    ],
  });

  const result = await engine.commit({
    siteId: 'p1',
    surface: 'themeConfig',
    baseRevision: 0,
    payload: null,
  });

  assert.equal(result.outcome, 'rejected', 'invalid draft must be rejected');
  assert.ok(result.reason, 'rejection must carry a reason');
  assert.equal(commitCalls, 0, 'rejected draft must never reach the writer');

  console.log('  [PASS] Validation Rejection (Reject Before Side Effect)');
}

// ---------------------------------------------------------------------------
// 3. CONSTITUTIONAL GUARD: NO BUSINESS LOGIC IN THE DECISION LAYER
// ---------------------------------------------------------------------------

/**
 * Verifies that the Decision Layer does NOT import Core, renderer, or runtime
 * services, and does NOT evaluate permissions or pricing. It is a pure,
 * side-effect-only boundary.
 */
function testNoBusinessLogicInDecisionLayer(): void {
  const fs = require('node:fs');
  const path = require('node:path');

  const decisionFiles = [
    'src/lib/decision/schema.ts',
    'src/lib/decision/engine.ts',
    'src/lib/decision/draft-writer.ts',
    'src/lib/decision/index.ts',
  ];

  for (const file of decisionFiles) {
    const abs = path.join(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      console.log(`  [SKIP] ${file} not present`);
      continue;
    }
    const source = fs.readFileSync(abs, 'utf8');

    // The Decision Layer MUST NOT import Core, renderer, or runtime services.
    // We check for actual import statements (not prose in comments) so that
    // documentation describing the guarantee does not cause a false positive.
    const importLines = source
      .split('\n')
      .filter((line: string) => line.trim().startsWith('import '))
      .join('\n');


    assert.equal(
      importLines.includes('theme-config'),
      false,
      `${file} must not import theme-config`,
    );
    assert.equal(
      importLines.includes('renderer'),
      false,
      `${file} must not import renderer`,
    );
    assert.equal(
      importLines.includes('runtime-services'),
      false,
      `${file} must not import runtime-services`,
    );
    assert.equal(
      importLines.includes('cms-core'),
      false,
      `${file} must not import cms-core`,
    );

    // The Decision Layer MUST NOT evaluate permissions or pricing. We check
    // only non-comment code lines so that documentation describing the
    // guarantee ("never evaluates permissions") does not cause a false
    // positive.
    const codeLines = source
      .split('\n')
      .filter((line: string) => {
        const trimmed = line.trim();
        return (
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('/**')
        );
      })
      .join('\n');

    assert.equal(
      codeLines.includes('permission'),
      false,
      `${file} must not evaluate permissions`,
    );
    assert.equal(
      codeLines.includes('pricing'),
      false,
      `${file} must not evaluate pricing`,
    );

  }


  console.log('  [PASS] No Business Logic in Decision Layer');
}

// ---------------------------------------------------------------------------
// 4. THIN WRAPPER: DRAFTWRITER REUSES THE REVISION-GUARDED QUERY LAYER
// ---------------------------------------------------------------------------

function testDraftWriterIsThin(): void {
  const fs = require('node:fs');
  const path = require('node:path');

  const abs = path.join(process.cwd(), 'src/lib/decision/draft-writer.ts');
  if (!fs.existsSync(abs)) {
    console.log('  [SKIP] draft-writer.ts not present');
    return;
  }
  const source = fs.readFileSync(abs, 'utf8');

  // The DraftWriter MUST reuse the existing revision-guarded query layer.
  assert.equal(
    source.includes('updateSiteIfRevision'),
    true,
    'DraftWriter must reuse updateSiteIfRevision',
  );

  console.log('  [PASS] Thin Wrapper (DraftWriter Reuses Query Layer)');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Decision Layer Constitution Test');
  console.log('================================');
  await testOptimisticConcurrency();
  await testValidationRejection();
  testNoBusinessLogicInDecisionLayer();
  testDraftWriterIsThin();

  console.log('================================');
  console.log('ALL DECISION LAYER CONSTITUTION TESTS PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
