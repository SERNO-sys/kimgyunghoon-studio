/**
 * AWIE V2 - Phase 09B: StyleAdapter Snapshot Test (Mandate 4).
 *
 * Feeds a deterministic SkinResource and TypographyResource into the
 * DefaultStyleAdapter and asserts that the generated CSS Custom Properties
 * dictionary matches the expected snapshot EXACTLY.
 *
 * This guarantees deterministic styling: the same presentation resources
 * ALWAYS produce the exact same CSS variable dictionary.
 *
 * Run: npx tsx scripts/style-adapter.test.ts
 */

import {
  DefaultStyleAdapter,
  type CssVariableDictionary,
  type SkinResource,
  type TypographyResource,
} from '../src/lib/renderer-foundation';

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// ---------------------------------------------------------------------------
// Deterministic fixtures
// ---------------------------------------------------------------------------

/** A deterministic SkinResource. */
const skin: SkinResource = {
  id: 'dark',
  colors: {
    primary: '#123456',
    secondary: '#abcdef',
    background: '#0f0f0f',
    text: '#ffffff',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
  },
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.2)',
    elevated: '0 8px 24px rgba(0,0,0,0.4)',
  },
  motion: {
    fast: '150ms',
    slow: '400ms',
  },
};

/** A deterministic TypographyResource. */
const typography: TypographyResource = {
  id: 'sans',
  families: {
    body: 'Inter, sans-serif',
    heading: 'Poppins, sans-serif',
  },
  sizes: {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2.5rem',
  },
  weights: {
    regular: '400',
    bold: '700',
  },
  lineHeights: {
    body: '1.6',
    heading: '1.2',
  },
};

/**
 * The EXPECTED snapshot. This is the exact dictionary the DefaultStyleAdapter
 * MUST produce for the fixtures above. Any change to the naming scheme or the
 * token iteration order will break this snapshot — which is the point.
 */
const EXPECTED_SNAPSHOT: CssVariableDictionary = {
  // Skin colors.
  'color-primary': '#123456',
  'color-secondary': '#abcdef',
  'color-background': '#0f0f0f',
  'color-text': '#ffffff',
  // Skin radius.
  'radius-sm': '4px',
  'radius-md': '8px',
  'radius-lg': '16px',
  // Skin shadows.
  'shadow-card': '0 2px 8px rgba(0,0,0,0.2)',
  'shadow-elevated': '0 8px 24px rgba(0,0,0,0.4)',
  // Skin motion.
  'motion-fast': '150ms',
  'motion-slow': '400ms',
  // Typography families.
  'font-family-body': 'Inter, sans-serif',
  'font-family-heading': 'Poppins, sans-serif',
  // Typography sizes.
  'font-size-sm': '0.875rem',
  'font-size-md': '1rem',
  'font-size-lg': '1.5rem',
  'font-size-xl': '2.5rem',
  // Typography weights.
  'font-weight-regular': '400',
  'font-weight-bold': '700',
  // Typography line-heights.
  'line-height-body': '1.6',
  'line-height-heading': '1.2',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function snapshotTest(): void {
  section('MANDATE 4: StyleAdapter Snapshot Test');

  const adapter = new DefaultStyleAdapter();
  const variables = adapter.toCssVariables(skin, typography);

  // 1. The generated dictionary matches the expected snapshot EXACTLY.
  check(
    'generated CSS variables match the expected snapshot exactly',
    JSON.stringify(variables) === JSON.stringify(EXPECTED_SNAPSHOT),
  );

  // 2. Every expected key is present.
  const expectedKeys = Object.keys(EXPECTED_SNAPSHOT);
  const missingKeys = expectedKeys.filter((key) => !(key in variables));
  check(
    'all expected CSS variable keys are present',
    missingKeys.length === 0,
    missingKeys.length > 0 ? `missing: ${missingKeys.join(', ')}` : undefined,
  );

  // 3. No unexpected keys are present.
  const actualKeys = Object.keys(variables);
  const extraKeys = actualKeys.filter((key) => !(key in EXPECTED_SNAPSHOT));
  check(
    'no unexpected CSS variable keys are present',
    extraKeys.length === 0,
    extraKeys.length > 0 ? `extra: ${extraKeys.join(', ')}` : undefined,
  );

  // 4. Every value matches the expected value.
  const mismatched = expectedKeys.filter((key) => variables[key] !== EXPECTED_SNAPSHOT[key]);
  check(
    'all CSS variable values match the expected values',
    mismatched.length === 0,
    mismatched.length > 0 ? `mismatched: ${mismatched.join(', ')}` : undefined,
  );

  // 5. Determinism: calling the adapter twice yields identical dictionaries.
  const second = adapter.toCssVariables(skin, typography);
  check(
    'StyleAdapter is deterministic (two calls produce identical output)',
    JSON.stringify(variables) === JSON.stringify(second),
  );

  // 6. The dictionary is a flat Record<string, string> (all values are strings).
  const allStrings = Object.values(variables).every((value) => typeof value === 'string');
  check('all CSS variable values are strings', allStrings);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('AWIE V2 Phase 09B - StyleAdapter Snapshot Test');
  console.log('==============================================');

  snapshotTest();

  console.log('\n========================================');
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main();
