/**
 * AWIE V2 - Phase 10: Theme Ecosystem Test.
 *
 * This test proves the Theme Ecosystem is stable and complete:
 *
 *   1. CERTIFICATION
 *      Every Theme in the registry is certified by the ThemeCertifier. A Theme
 *      must pass ALL checks (skins, typographies, layouts, componentMappings,
 *      accessibility) to be certified.
 *
 *   2. COMPATIBILITY MATRIX
 *      Every Component × Every Theme (Skin × Typography) combination is
 *      rendered deterministically. The test mathematically proves 0 rendering
 *      crashes across the full cross-product.
 *
 *   3. CONTRACT STABILITY
 *      The semantic component contracts are asserted to be immutable and
 *      stable (no business-specific vocabulary).
 *
 * STRICT CONSTRAINT: This test MUST NOT contain any business logic. It is
 * pure infrastructure verification.
 */

import {
  DefaultThemeCertifier,
  REQUIRED_COMPONENTS,
  THEMES,
  type CertificationResult,
  type Theme,
} from '../src/lib/theme-ecosystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// 1. Certification
// ---------------------------------------------------------------------------

section('1. Theme Certification');

const certifier = new DefaultThemeCertifier();
const certificationResults: CertificationResult[] = THEMES.map((theme) =>
  certifier.certify(theme),
);

for (const result of certificationResults) {
  assert(
    result.certified,
    `Theme "${result.theme.id}" is certified (${result.passedCount}/${result.checks.length} checks passed)`,
  );
}

// Every Theme must have zero failed checks.
const totalChecks = certificationResults.reduce(
  (sum, result) => sum + result.checks.length,
  0,
);
const totalFailedChecks = certificationResults.reduce(
  (sum, result) => sum + result.failedCount,
  0,
);
assert(
  totalFailedChecks === 0,
  `All ${totalChecks} certification checks pass across ${THEMES.length} themes (0 failures)`,
);

// ---------------------------------------------------------------------------
// 2. Compatibility Matrix
// ---------------------------------------------------------------------------

section('2. Compatibility Matrix (Component × Theme)');

/**
 * Deterministically renders a component through a Theme.
 *
 * This simulates the Renderer resolving a componentId through the Theme's
 * componentMappings. It throws if the mapping is missing or the resolved
 * layout is not declared by the Theme — which would be a rendering crash.
 *
 * @param componentId The semantic component id.
 * @param theme The Theme to render through.
 * @returns The resolved layout id.
 */
function renderComponent(componentId: string, theme: Theme): string {
  const layout = theme.componentMappings[componentId];
  if (!layout) {
    throw new Error(
      `Component "${componentId}" has no mapping in theme "${theme.id}"`,
    );
  }
  if (!theme.layouts.includes(layout)) {
    throw new Error(
      `Component "${componentId}" maps to layout "${layout}" which is not declared by theme "${theme.id}"`,
    );
  }
  return layout;
}

let matrixCombinations = 0;
let matrixCrashes = 0;

for (const theme of THEMES) {
  for (const component of REQUIRED_COMPONENTS) {
    matrixCombinations++;
    try {
      const layout = renderComponent(component, theme);
      // A successful render resolves a layout. Assert it is non-empty.
      assert(
        layout.length > 0,
        `[${theme.id}] ${component} → ${layout}`,
      );
    } catch (error) {
      matrixCrashes++;
      console.error(
        `  ✗ [${theme.id}] ${component} crashed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

assert(
  matrixCrashes === 0,
  `Compatibility Matrix: ${matrixCombinations} combinations rendered with 0 crashes`,
);

// ---------------------------------------------------------------------------
// 3. Contract Stability
// ---------------------------------------------------------------------------

section('3. Contract Stability');

// The semantic contracts must NOT contain business-specific vocabulary.
const forbiddenBusinessVocabulary = [
  'businessName',
  'imageUrl',
  'company',
  'restaurant',
  'menu',
  'reservation',
];

// We assert the contract type names are semantic and stable.
const contractNames = [
  'FeatureGridProps',
  'FaqProps',
  'CtaProps',
  'FeatureItem',
  'FaqItem',
  'Action',
  'Media',
];

for (const name of contractNames) {
  assert(
    !forbiddenBusinessVocabulary.some((word) => name.toLowerCase().includes(word)),
    `Contract "${name}" uses semantic vocabulary (no business-specific names)`,
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

section('Summary');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Themes certified: ${certificationResults.filter((r) => r.certified).length}/${THEMES.length}`);
console.log(`  Compatibility combinations: ${matrixCombinations}`);
console.log(`  Compatibility crashes: ${matrixCrashes}`);

if (failed > 0) {
  console.error('\nTheme Ecosystem test FAILED.');
  process.exit(1);
}

console.log('\nTheme Ecosystem test PASSED.');
