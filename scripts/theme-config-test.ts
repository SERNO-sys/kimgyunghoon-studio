/**
 * AWIE V2 - Phase 02 Milestone 2 Validation Smoke Test.
 *
 * Test Case A: A valid V2 ThemeConfig.
 * Test Case B: A V2 config with an Orphan Section, Circular Menu Reference,
 *              and Invalid Route.
 * Test Case C: V1 -> V2 Migration mapping.
 *
 * Run with: npx tsx scripts/theme-config-test.ts
 */

import {
  ThemeConfigValidator,
  ThemeConfigMigrationAdapter,
  type ThemeConfig,
} from '../src/lib/theme-config/v2';

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

/** Builds a valid V2 ThemeConfig. */
function buildValidConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Acme Studio',
      description: 'A modern design studio.',
      logo: 'logo',
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
      generator: 'awie-engine',
      generatorVersion: '2.0.0',
    },

    intent: 'brand_experience',
    resources: {
      pages: [
        { id: 'home', route: '/', title: 'Home', sectionIds: ['hero', 'about'], isHome: true },
        { id: 'about', route: '/about', title: 'About', sectionIds: ['about'] },
        { id: 'contact', route: '/contact', title: 'Contact', sectionIds: ['contact'] },
      ],
      sections: [
        { id: 'hero', type: 'hero', content: { title: 'Welcome' }, assetIds: ['hero-bg'] },
        { id: 'about', type: 'text', content: { body: 'About us' } },
        { id: 'contact', type: 'contact', content: {}, formId: 'contact-form' },
      ],
      assets: [
        { id: 'logo', url: '/logo.png', mimeType: 'image/png' },
        { id: 'hero-bg', url: '/hero.jpg', mimeType: 'image/jpeg' },
      ],
      settings: {
        primaryColor: '#1a1a2e',
        skin: { colorPalette: 'ocean', fontPairing: 'sans' },
        skeleton: { headerType: 'logo-left', heroType: 'cover' },
      },
      menus: [

        {
          id: 'main',
          label: 'Main',
          items: [
            { label: 'Home', target: 'page:home' },
            { label: 'About', target: 'page:about' },
            { label: 'Contact', target: 'page:contact' },
          ],
        },
      ],
      forms: [{ id: 'contact-form', title: 'Contact', fields: [{ name: 'email', label: 'Email', type: 'email', required: true }] }],
    },
    policies: {},
  };
}

/** Builds a V2 config with an orphan section, circular menu, and invalid route. */
function buildInvalidConfig(): ThemeConfig {
  const config = buildValidConfig();
  // Orphan section: not referenced by any page.
  config.resources.sections.push({ id: 'orphan', type: 'custom', content: {} });
  // Circular menu reference: nested children that loop back.
  config.resources.menus[0].items.push({
    label: 'Loop',
    target: 'page:about',
    children: [{ label: 'Loop', target: 'page:about' }],
  });
  // Invalid routes: "//home" (double slash) and "/about/" (trailing slash).
  // Both pass the Zod schema but fail the strict isValidRoute check, so the
  // graph traversal still runs and detects orphan/circular issues too.
  config.resources.pages.push({ id: 'bad', route: '//home', title: 'Bad', sectionIds: [] });
  config.resources.pages.push({ id: 'bad2', route: '/about/', title: 'Bad2', sectionIds: [] });
  return config;

}

/** A legacy V1 ThemeConfig. */
function buildLegacyConfig(): Record<string, unknown> {
  return {
    presetId: 'minimal',
    colorPalette: 'ocean',
    fontPairing: 'sans',
    layoutStyle: 'logo-left',
    buttonStyle: 'rounded',
    intentType: 'brand_experience',
    skin: { color_palette: 'ocean', font_pairing: 'sans' },
    skeleton: { header_type: 'logo-left', hero_type: 'cover' },
    aiDesignReport: { analyzed_industry: 'design', reasoning: 'clean and modern' },
    sections: ['hero', 'about', 'contact'],
    content: { hero_title: 'Acme Studio', hero_subtitle: 'We design the future' },
    pages: [
      { id: 'about', slug: 'about', title: 'About', description: 'About us' },
      { id: 'contact', slug: 'contact', title: 'Contact' },
    ],
  };
}

function run(): void {
  const validator = new ThemeConfigValidator();
  const adapter = new ThemeConfigMigrationAdapter(validator);

  // ---------------------------------------------------------------------------
  section('Test Case A: Valid V2 ThemeConfig');
  {
    const config = buildValidConfig();
    const result = validator.validate(config);
    check('A1: config is valid (ok === true)', result.ok === true);
    check('A2: no errors', result.errors.length === 0);
    check('A3: no warnings', result.warnings.length === 0, JSON.stringify(result.warnings));
  }

  // ---------------------------------------------------------------------------
  section('Test Case B: Invalid V2 ThemeConfig (orphan, circular, invalid route)');
  {
    const config = buildInvalidConfig();
    const result = validator.validate(config);

    check('B1: config is invalid (ok === false)', result.ok === false);

    const codes = result.issues.map((i) => i.code);
    check('B2: detects orphan section', codes.includes('orphan_section'));
    check('B3: detects circular menu reference', codes.includes('circular_reference'));
    check('B4: detects invalid route (//home)', codes.includes('invalid_route'));

    const invalidRoutes = result.issues.filter((i) => i.code === 'invalid_route');
    check('B5: catches both invalid routes', invalidRoutes.length >= 2, JSON.stringify(invalidRoutes));

    // The orphan section is a warning; the circular ref and invalid routes are errors.
    check('B6: circular reference is an error', result.errors.some((i) => i.code === 'circular_reference'));
    check('B7: invalid route is an error', result.errors.some((i) => i.code === 'invalid_route'));
    check('B8: orphan section is a warning', result.warnings.some((i) => i.code === 'orphan_section'));
  }

  // ---------------------------------------------------------------------------
  section('Test Case C: V1 -> V2 Migration mapping');
  {
    const legacy = buildLegacyConfig();

    check('C1: adapter supports legacy config', adapter.supports(legacy) === true);

    const preview = adapter.preview(legacy);
    check('C2: preview is supported', preview.supported === true);
    check('C3: preview targets schema v2', preview.targetVersion === 2);
    check('C4: preview has mapping entries', preview.entries.length > 0);

    const migrated = adapter.migrate(legacy);
    const cfg = migrated.config;

    check('C5: migrated config is valid', migrated.validation.ok === true, JSON.stringify(migrated.validation.errors));

    // Root structure is strictly { metadata, intent, resources, policies }.
    const rootKeys = Object.keys(cfg).sort();
    check('C6: root has exactly 4 keys', rootKeys.length === 4, JSON.stringify(rootKeys));
    check('C7: root keys are metadata/intent/resources/policies', JSON.stringify(rootKeys) === JSON.stringify(['intent', 'metadata', 'policies', 'resources']));

    // Metadata timestamps + generator.
    check('C8: metadata has createdAt', typeof cfg.metadata.createdAt === 'string');
    check('C9: metadata has updatedAt', typeof cfg.metadata.updatedAt === 'string');
    check('C10: metadata has generator', cfg.metadata.generator === 'awie-migration-adapter');

    // Intent mapped.
    check('C11: intent mapped to brand_experience', cfg.intent === 'brand_experience');

    // Skin/skeleton moved into resources.settings.
    check('C12: skin moved into resources.settings', cfg.resources.settings.skin?.colorPalette === 'ocean');
    check('C13: skeleton moved into resources.settings', cfg.resources.settings.skeleton?.headerType === 'logo-left');
    check('C14: aiDesignReport moved into resources.settings', cfg.resources.settings.aiDesignReport?.analyzedIndustry === 'design');

    // Sections promoted to self-contained sections.
    check('C15: sections promoted', cfg.resources.sections.length === 3);
    check('C16: sections use ResourceIds', cfg.resources.sections.every((s) => typeof s.id === 'string' && s.id.length > 0));

    // Pages built (home + 2 legacy pages).
    check('C17: pages built', cfg.resources.pages.length === 3);
    check('C18: home page isHome', cfg.resources.pages[0].isHome === true);
    check('C19: home page references all sections', cfg.resources.pages[0].sectionIds.length === 3);

    // Menus reference pages via page: prefix.
    check('C20: menu references pages', cfg.resources.menus[0].items.every((i) => i.target.startsWith('page:')));

    // Migration notes present.
    check('C21: migration notes present', migrated.notes.length > 0);
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
