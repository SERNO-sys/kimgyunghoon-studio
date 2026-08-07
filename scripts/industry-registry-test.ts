/**
 * AWIE V2 - Phase 06 Milestone 1 Industry Registry Smoke Test.
 *
 * Tests the normalizer (messy strings), alias resolution, fallback to Generic,
 * and validates that profiles strictly have no presentation fields.
 *
 * Run with: npx tsx scripts/industry-registry-test.ts
 */

import {
  DuplicateIndustryError,
  GENERIC_PROFILE,
  IndustryRegistry,
  IndustryResolver,
  LAW_FIRM_PROFILE,
  MOCK_INDUSTRY_PROFILES,
  Normalizer,
  RESTAURANT_PROFILE,
  type IndustryProfile,
} from '../src/lib/industry-registry';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

/** Presentation fields that must NEVER appear in a profile. */
const PRESENTATION_FIELDS = ['layout', 'skin', 'skeleton', 'typography', 'heroStyle'];

/** Recursively checks that no presentation field key exists in an object. */
function hasNoPresentationFields(obj: unknown, path = ''): boolean {
  if (obj === null || typeof obj !== 'object') {
    return true;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (PRESENTATION_FIELDS.includes(key)) {
      console.log(`    [presentation field found] ${path}${path ? '.' : ''}${key}`);
      return false;
    }
    if (!hasNoPresentationFields(value, `${path}${path ? '.' : ''}${key}`)) {
      return false;
    }
  }
  return true;
}

function run(): void {
  // ---------------------------------------------------------------------------
  section('Normalizer: messy strings');
  {
    const normalizer = new Normalizer();

    check('N1: "  Coffee-Shop!  " -> "coffee shop"', normalizer.normalize('  Coffee-Shop!  ') === 'coffee shop');
    check('N2: "RESTAURANT" -> "restaurant"', normalizer.normalize('RESTAURANT') === 'restaurant');
    check('N3: "Law Firm!!" -> "law firm"', normalizer.normalize('Law Firm!!') === 'law firm');
    check('N4: "  a   b  c " -> "a b c"', normalizer.normalize('  a   b  c ') === 'a b c');
    check('N5: "  " -> ""', normalizer.normalize('  ') === '');
    check('N6: "Café" keeps unicode letters', normalizer.normalize('Café') === 'café');
  }

  // ---------------------------------------------------------------------------
  section('Registry: register / get / has / list / unregister');
  {
    const registry = new IndustryRegistry();
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      registry.register(profile);
    }

    check('R1: registry has 3 profiles', registry.size === 3);
    check('R2: has("restaurant")', registry.has('restaurant') === true);
    check('R3: get("law_firm") returns profile', registry.get('law_firm')?.industryId === 'law_firm');
    check('R4: list() returns 3 profiles', registry.list().length === 3);
    check('R5: get("unknown") returns undefined', registry.get('unknown') === undefined);

    // Duplicate registration throws.
    let threw = false;
    try {
      registry.register(RESTAURANT_PROFILE);
    } catch (e) {
      threw = e instanceof DuplicateIndustryError;
    }
    check('R6: duplicate registration throws DuplicateIndustryError', threw);

    // Unregister.
    check('R7: unregister("restaurant") returns true', registry.unregister('restaurant') === true);
    check('R8: has("restaurant") now false', registry.has('restaurant') === false);
    check('R9: unregister("restaurant") again returns false', registry.unregister('restaurant') === false);
  }

  // ---------------------------------------------------------------------------
  section('Resolver: alias resolution');
  {
    const registry = new IndustryRegistry();
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      registry.register(profile);
    }
    const resolver = new IndustryResolver(registry, GENERIC_PROFILE);

    const r1 = resolver.resolve('  Coffee-Shop!  ');
    check('S1: "  Coffee-Shop!  " resolves to restaurant', r1.profile.industryId === 'restaurant');
    check('S2: matched = true', r1.matched === true);
    check('S3: normalized = "coffee shop"', r1.normalized === 'coffee shop');

    const r2 = resolver.resolve('LAWYER');
    check('S4: "LAWYER" resolves to law_firm', r2.profile.industryId === 'law_firm');
    check('S5: matched = true', r2.matched === true);

    const r3 = resolver.resolve('  Diner  ');
    check('S6: "Diner" resolves to restaurant via alias', r3.profile.industryId === 'restaurant');
  }

  // ---------------------------------------------------------------------------
  section('Resolver: fallback to Generic');
  {
    const registry = new IndustryRegistry();
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      registry.register(profile);
    }
    const resolver = new IndustryResolver(registry, GENERIC_PROFILE);

    const r1 = resolver.resolve('  Space Mining Co.  ');
    check('F1: unknown input falls back to generic', r1.profile.industryId === 'generic');
    check('F2: matched = false', r1.matched === false);

    const r2 = resolver.resolve('   ');
    check('F3: empty input falls back to generic', r2.profile.industryId === 'generic');
    check('F4: empty input matched = false', r2.matched === false);
  }

  // ---------------------------------------------------------------------------
  section('Profiles: no presentation fields');
  {
    for (const profile of MOCK_INDUSTRY_PROFILES) {
      check(
        `P1: ${profile.industryId} has no presentation fields`,
        hasNoPresentationFields(profile),
      );
    }

    // Explicitly verify the required capability/requirement fields exist.
    check('P2: restaurant supportsMenu = true', RESTAURANT_PROFILE.capabilities.supportsMenu === true);
    check('P3: restaurant supportsReservation = true', RESTAURANT_PROFILE.capabilities.supportsReservation === true);
    check('P4: law_firm supportsConsultationForm = true', LAW_FIRM_PROFILE.capabilities.supportsConsultationForm === true);
    check('P5: law_firm requiresDisclaimer = true', LAW_FIRM_PROFILE.requirements.requiresDisclaimer === true);
    check('P6: generic is the fallback id', GENERIC_PROFILE.industryId === 'generic');
  }

  // ---------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
