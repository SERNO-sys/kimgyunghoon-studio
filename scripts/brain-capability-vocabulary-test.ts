/**
 * AWIE V2 Brain — Step 02 Capability Vocabulary v1 tests.
 *
 * Verifies the canonical Capability Vocabulary:
 *   1. Every canonical Capability is accepted.
 *   2. Invalid UI concepts are rejected.
 *   3. Industry-specific concepts are rejected.
 *   4. Evidence concepts cannot be used as Capability IDs.
 *   5. Aliases normalize to their canonical Capability.
 *   6. Duplicate semantic concepts do not create duplicate IDs.
 *   7. Unknown Capability IDs are rejected.
 *   8. Capability definitions remain independent of Recipe/Renderer types.
 *   9. No any / unknown leakage exists in the new implementation.
 *  10. Existing Step 01 tests continue to pass (run separately).
 *
 * Run with: npx tsx scripts/brain-capability-vocabulary-test.ts
 */

import {
  Capability,
  CAPABILITY_DEFINITIONS,
  CAPABILITY_ALIASES,
  capabilityIdSchema,
  normalizeCapability,
  type CapabilityId,
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

function assertThrows(fn: () => unknown, label: string): void {
  try {
    fn();
    failed++;
    console.error(`  ✗ ${label} (expected to throw)`);
  } catch {
    passed++;
    console.log(`  ✓ ${label}`);
  }
}

console.log('\n=== 1. Every canonical Capability is accepted ===');

const canonicalIds = Object.values(Capability) as CapabilityId[];
for (const id of canonicalIds) {
  const result = capabilityIdSchema.safeParse(id);
  assert(result.success, `canonical capability "${id}" accepted`);
}

console.log('\n=== 2. Invalid UI concepts are rejected ===');

const uiConcepts = [
  'hero',
  'header',
  'footer',
  'about',
  'team',
  'gallery',
  'product_grid',
  'booking_form',
  'testimonial_section',
  'three_column_layout',
  'Hero',
  'ProductGrid',
];
for (const ui of uiConcepts) {
  assertThrows(
    () => capabilityIdSchema.parse(ui),
    `UI concept "${ui}" rejected as capability`
  );
}

console.log('\n=== 3. Industry-specific concepts are rejected ===');

const industryConcepts = [
  'bakery_menu',
  'restaurant_menu',
  'musician_profile',
  'lawyer_consultation',
  'saas_demo',
  'photographer_gallery',
  'bakery',
  'restaurant',
  'law_firm',
  'hospital',
];
for (const ind of industryConcepts) {
  assertThrows(
    () => capabilityIdSchema.parse(ind),
    `industry concept "${ind}" rejected as capability`
  );
}

console.log('\n=== 4. Evidence concepts cannot be used as Capability IDs ===');

const evidenceConcepts = [
  'testimonial',
  'case_study',
  'credentials',
  'reviews',
  'certifications',
  'client_logos',
];
for (const ev of evidenceConcepts) {
  assertThrows(
    () => capabilityIdSchema.parse(ev),
    `evidence concept "${ev}" rejected as capability`
  );
}

console.log('\n=== 5. Aliases normalize to their canonical Capability ===');

const aliasExpectations: Array<[string, CapabilityId]> = [
  ['product_discovery', Capability.discovery],
  ['service_discovery', Capability.discovery],
  ['content_discovery', Capability.discovery],
  ['reservation', Capability.booking],
  ['appointment', Capability.booking],
  ['contact', Capability.inquiry],
  ['contact_us', Capability.inquiry],
  ['buy', Capability.purchase],
  ['checkout', Capability.purchase],
  ['lead', Capability.leadCapture],
  ['address', Capability.location],
  ['credibility', Capability.trust],
];
for (const [alias, expected] of aliasExpectations) {
  const normalized = normalizeCapability(alias);
  assert(
    normalized === expected,
    `alias "${alias}" normalizes to "${expected}"`
  );
}

// canonical IDs normalize to themselves
for (const id of canonicalIds) {
  assert(
    normalizeCapability(id) === id,
    `canonical id "${id}" normalizes to itself`
  );
}

console.log('\n=== 6. Duplicate semantic concepts do not create duplicate IDs ===');

// Every alias maps to a canonical ID that is itself a canonical capability.
for (const [alias, canonical] of Object.entries(CAPABILITY_ALIASES)) {
  assert(
    canonicalIds.includes(canonical),
    `alias "${alias}" maps to canonical id "${canonical}"`
  );
}

// No alias is itself a distinct canonical capability (aliases are not in the
// canonical enum).
const aliasKeys = Object.keys(CAPABILITY_ALIASES);
for (const alias of ['reservation', 'contact', 'product_discovery']) {
  assert(
    !canonicalIds.includes(alias as CapabilityId),
    `alias "${alias}" is not a separate canonical capability`
  );
}

// The canonical vocabulary is the source of truth: every definition id is a
// canonical capability and every canonical capability has a definition.
for (const id of canonicalIds) {
  assert(
    CAPABILITY_DEFINITIONS[id] !== undefined,
    `canonical capability "${id}" has a definition`
  );
}
for (const def of Object.values(CAPABILITY_DEFINITIONS)) {
  assert(
    canonicalIds.includes(def.id),
    `definition id "${def.id}" is a canonical capability`
  );
}

console.log('\n=== 7. Unknown Capability IDs are rejected ===');

assertThrows(
  () => capabilityIdSchema.parse('unknown_capability'),
  'unknown capability "unknown_capability" rejected'
);
assertThrows(
  () => capabilityIdSchema.parse('portfolio'),
  'content concept "portfolio" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('methodology'),
  'content concept "methodology" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('schedule'),
  'content concept "schedule" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('operating_hours'),
  'constraint concept "operating_hours" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('availability'),
  'constraint concept "availability" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('event'),
  'content concept "event" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('performance'),
  'evidence/content concept "performance" rejected as capability'
);
assertThrows(
  () => capabilityIdSchema.parse('product_presentation'),
  'presentation concept "product_presentation" rejected as capability'
);

// normalizeCapability returns null for unknown terms (never creates a new ID)
assert(
  normalizeCapability('unknown_capability') === null,
  'normalizeCapability returns null for unknown term'
);
assert(
  normalizeCapability('portfolio') === null,
  'normalizeCapability returns null for content concept'
);

console.log('\n=== 8. Capability definitions independent of Recipe/Renderer types ===');

// The vocabulary module must not IMPORT or TYPE-REFERENCE any Recipe/Renderer/
// UI concept. (Comments may mention these terms only to state the architectural
// boundary, so we check for actual code references, not comment prose.)
const capabilitySource = require('fs').readFileSync(
  require('path').join(__dirname, '../src/lib/brain/capability.ts'),
  'utf8'
);

// No import statements at all (the module is self-contained pure data modeling).
const importLines = capabilitySource
  .split('\n')
  .filter((line: string) => line.trim().startsWith('import '));
assert(
  importLines.length === 1 && importLines[0].includes("from 'zod'"),
  'capability.ts only imports zod (no Recipe/Renderer/UI imports)'
);

// No type annotations referencing Recipe/Renderer/UI concepts.
const forbiddenTypeRefs = [
  'Recipe',
  'Renderer',
  'ThemeConfig',
  'Component',
  'Section',
  'Layout',
  'Hero',
  'Grid',
  'React',
];
for (const term of forbiddenTypeRefs) {
  // Match the term as a type/identifier reference (word boundary), excluding
  // comment lines.
  const codeLines = capabilitySource
    .split('\n')
    .filter((line: string) => !line.trim().startsWith('*') && !line.trim().startsWith('//'));
  const referenced = codeLines.some((line: string) =>
    new RegExp(`\\b${term}\\b`).test(line)
  );
  assert(
    !referenced,
    `capability.ts does not type-reference "${term}"`
  );
}


console.log('\n=== 9. No any / unknown leakage in the new implementation ===');

// The vocabulary module must not use any/unknown/Record<string, any>.
const weakPatterns = [
  ': any',
  '<any>',
  'as any',
  ': unknown',
  'Record<string, any>',
  'Record<string, unknown>',
];
for (const pattern of weakPatterns) {
  assert(
    !capabilitySource.includes(pattern),
    `capability.ts does not contain "${pattern}"`
  );
}

// Every canonical capability definition is a genuine business capability.
for (const def of Object.values(CAPABILITY_DEFINITIONS)) {
  assert(
    def.isBusinessCapability === true,
    `definition "${def.id}" is a genuine business capability`
  );
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
