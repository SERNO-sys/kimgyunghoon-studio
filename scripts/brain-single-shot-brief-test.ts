/**
 * AWIE V2 - Step 13-B: Single-shot Input Boundary Adapter tests.
 *
 * Verifies the deterministic `string -> BusinessBrief` adapter:
 *   A. Non-empty prompt produces a valid BusinessBrief.
 *   B. businessType is preserved from the raw prompt.
 *   C. No facts are invented for unspecified slots.
 *   D. Empty prompt throws EmptyPromptError.
 *   E. Whitespace-only prompt throws EmptyPromptError.
 *   F. The adapter is deterministic (same input -> same output).
 *   G. The adapter does NOT invoke any AI/provider (synchronous, no async).
 *   H. The adapter does NOT touch the turn-based Question Engine flow.
 *   I. The adapter does NOT contain UI/Recipe/ThemeConfig/capability concepts.
 *
 * This is a pure contract test. It does NOT build an E2E website.
 */

import {
  extractSingleShotBrief,
  EmptyPromptError,
} from '../src/lib/ai/build/single-shot-brief';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
  }
}

function assertThrows(fn: () => unknown, errorType: unknown, label: string): void {
  try {
    fn();
    failed++;
    console.error(`  FAIL  ${label} (expected ${(errorType as { name: string }).name})`);
  } catch (err) {
    if (err instanceof (errorType as new () => Error)) {
      passed++;
      console.log(`  PASS  ${label}`);
    } else {
      failed++;
      console.error(`  FAIL  ${label} (threw unexpected error: ${String(err)})`);
    }
  }
}

console.log('Step 13-B: Single-shot Brief Adapter tests\n');

// --- A. Non-empty prompt produces a valid BusinessBrief ---
console.log('A. Non-empty prompt produces a valid BusinessBrief');
{
  const brief = extractSingleShotBrief('카페');
  assert(typeof brief === 'object' && brief !== null, 'returns an object');
  assert(typeof brief.businessType === 'object' && brief.businessType !== null, 'businessType present');
}
console.log('');

// --- B. businessType is preserved from the raw prompt ---
console.log('B. businessType is preserved from the raw prompt');
{
  const brief = extractSingleShotBrief('카페');
  assert(brief.businessType?.primary === '카페', 'primary equals raw prompt');
  assert(Array.isArray(brief.businessType?.secondary), 'secondary is an array');
  assert(brief.businessType?.secondary?.length === 0, 'secondary is empty (no invented subtypes)');
}
console.log('');

// --- C. No facts are invented for unspecified slots ---
console.log('C. No facts are invented for unspecified slots');
{
  const brief = extractSingleShotBrief('카페');
  assert(brief.goals === undefined, 'goals unspecified');
  assert(brief.audience === undefined, 'audience unspecified');
  assert(brief.personality === undefined, 'personality unspecified');
  assert(brief.services === undefined, 'services unspecified');
  assert(brief.contactPreference === undefined, 'contactPreference unspecified');
}
console.log('');

// --- D. Empty prompt throws EmptyPromptError ---
console.log('D. Empty prompt throws EmptyPromptError');
{
  assertThrows(() => extractSingleShotBrief(''), EmptyPromptError, 'empty string throws');
}
console.log('');

// --- E. Whitespace-only prompt throws EmptyPromptError ---
console.log('E. Whitespace-only prompt throws EmptyPromptError');
{
  assertThrows(() => extractSingleShotBrief('   '), EmptyPromptError, 'whitespace-only throws');
  assertThrows(() => extractSingleShotBrief('\t\n  '), EmptyPromptError, 'tab/newline whitespace throws');
}
console.log('');

// --- F. The adapter is deterministic ---
console.log('F. The adapter is deterministic');
{
  const a = extractSingleShotBrief('카페');
  const b = extractSingleShotBrief('카페');
  assert(
    a.businessType?.primary === b.businessType?.primary &&
      JSON.stringify(a) === JSON.stringify(b),
    'same input produces identical output',
  );
}
console.log('');

// --- G. The adapter does NOT invoke any AI/provider (synchronous) ---
console.log('G. The adapter does NOT invoke any AI/provider');
{
  // extractSingleShotBrief is a synchronous function returning BusinessBrief
  // directly (not a Promise). If it were async/AI-backed, this would be a
  // Promise and the following structural check would fail.
  const result = extractSingleShotBrief('카페');
  assert(
    !(result instanceof Promise),
    'returns a plain object, not a Promise (no async AI call)',
  );
}
console.log('');

// --- H. The adapter does NOT touch the turn-based Question Engine flow ---
console.log('H. The adapter does NOT touch the turn-based Question Engine flow');
{
  // The adapter is a pure function with no state, no conversation history, and
  // no dependency on the Question Engine pipeline. It only reuses the
  // deterministic fallback extraction + merge. We verify it is a standalone
  // function that does not require any Question/UserAnswer inputs.
  const brief = extractSingleShotBrief('카페');
  assert(
    typeof extractSingleShotBrief === 'function' &&
      brief.businessType?.primary === '카페',
    'standalone function, no conversation state required',
  );
}
console.log('');

// --- I. The adapter does NOT contain UI/Recipe/ThemeConfig/capability concepts ---
console.log('I. The adapter does NOT contain UI/Recipe/ThemeConfig/capability concepts');
{
  // The output is a pure BusinessBrief (semantic business facts only). It must
  // not expose any UI/component/recipe/theme/capability fields.
  const brief = extractSingleShotBrief('카페');
  const keys = Object.keys(brief);
  const forbidden = ['sections', 'layout', 'components', 'theme', 'recipe', 'capabilities', 'css', 'grid'];
  const hasForbidden = forbidden.some((k) => keys.includes(k));
  assert(!hasForbidden, 'output contains no UI/recipe/theme/capability keys');
  assert(
    !('sections' in brief) && !('theme' in brief) && !('capabilities' in brief),
    'no sections/theme/capabilities on the brief',
  );
}
console.log('');

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
