/**
 * AWIE V2 - Phase 03 Final Polish Validation Smoke Test.
 *
 * Test Case A: A valid page renders its registered sections.
 * Test Case B: An unknown section type falls back to GenericSection (dev JSON).
 * Test Case C: An empty page (sectionIds: []) renders the base layout wrapper
 *              successfully without crashing.
 *
 * Run with: npx tsx scripts/renderer-test.tsx
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DefaultSectionRegistry,
  RenderEngine,
  resolveThemeTokens,
  type SectionProps,
} from '../src/lib/renderer';
import type { ThemeConfig } from '../src/lib/theme-config/v2';


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

/** A simple registered section component for testing. */
function HeroSection({ section, theme }: SectionProps): React.ReactElement {
  const title = (section.content?.title as string | undefined) ?? 'Untitled';
  return (
    <section data-awie-section={section.id} data-awie-type={section.type}>
      <h1 style={{ color: theme.colors.primary }}>{title}</h1>
    </section>
  );
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
        { id: 'empty', route: '/empty', title: 'Empty', sectionIds: [] },
      ],
      sections: [
        { id: 'hero', type: 'hero', content: { title: 'Welcome' }, assetIds: ['hero-bg'] },
        { id: 'about', type: 'text', content: { body: 'About us' } },
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
            { label: 'Empty', target: 'page:empty' },
          ],
        },
      ],
      forms: [],
    },
    policies: {},
  };
}

function run(): void {
  const config = buildValidConfig();
  const theme = resolveThemeTokens(config);

  // ---------------------------------------------------------------------------
  section('Test Case A: Valid page renders registered sections');
  {
    const registry = new DefaultSectionRegistry();
    registry.register('hero', HeroSection, { version: '1.0.0', capabilities: ['a11y'] });

    const html = renderToStaticMarkup(
      <RenderEngine config={config} registry={registry} theme={theme} route="/" />,
    );

    check('A1: page wrapper rendered', html.includes('data-awie-page="home"'));
    check('A2: route attribute set', html.includes('data-awie-route="/"'));
    check('A3: registered hero section rendered', html.includes('data-awie-type="hero"'));
    check('A4: hero content rendered', html.includes('Welcome'));
    check('A5: unknown "text" section fell back to GenericSection', html.includes('data-awie-fallback="true"'));
  }

  // ---------------------------------------------------------------------------
  section('Test Case B: Unknown section type falls back to GenericSection');
  {
    const registry = new DefaultSectionRegistry();
    // Register nothing — every section type is unknown.

    const html = renderToStaticMarkup(
      <RenderEngine config={config} registry={registry} theme={theme} route="/" />,
    );

    check('B1: page wrapper still rendered', html.includes('data-awie-page="home"'));
    check('B2: hero fell back to GenericSection', html.includes('data-awie-fallback="true"'));
    check('B3: fallback preserves section id', html.includes('data-awie-section="hero"'));
    check('B4: fallback preserves section type', html.includes('data-awie-type="hero"'));
  }

  // ---------------------------------------------------------------------------
  section('Test Case C: Empty page (sectionIds: []) renders base layout without crashing');
  {
    const registry = new DefaultSectionRegistry();
    registry.register('hero', HeroSection, { version: '1.0.0', capabilities: ['a11y'] });

    let html = '';
    let threw = false;
    try {
      html = renderToStaticMarkup(
        <RenderEngine config={config} registry={registry} theme={theme} route="/empty" />,
      );
    } catch (err) {
      threw = true;
      console.log(`    ERROR: ${(err as Error).message}`);
    }

    check('C1: empty page did not throw', threw === false);
    check('C2: empty page wrapper rendered', html.includes('data-awie-page="empty"'));
    check('C3: empty page route attribute set', html.includes('data-awie-route="/empty"'));
    check('C4: no sections rendered for empty page', !html.includes('data-awie-section='));
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
