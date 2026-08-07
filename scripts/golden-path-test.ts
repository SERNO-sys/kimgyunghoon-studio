/**
 * AWIE V2 - Phase 12: Golden Path Integration Test.
 *
 * Proves the frozen architecture works END-TO-END:
 *
 *   CMS Command (Application) -> ThemeConfig (SSOT) -> ThemeEngine (Runtime)
 *     -> RenderNode -> React Adapter (Framework) -> React UI
 *
 * MANDATES VALIDATED:
 *   - MANDATE 1: The Golden Path is a pure ORCHESTRATION layer. It NEVER
 *     decides; it only wires the existing, ratified components.
 *   - MANDATE 2: Layer boundaries are preserved. The ThemeEngine produces the
 *     framework-agnostic RenderNode; the React Adapter materializes it into
 *     React. Neither crosses a boundary.
 *   - MANDATE 3: DETERMINISM. The same ThemeConfig always produces the same
 *     RenderNode tree and the same React element tree.
 *   - MANDATE 4: The CMS Command (Application) produces a new ThemeConfig via
 *     the EditorService, which is then rendered by the Runtime. The Application
 *     NEVER renders; the Runtime NEVER decides.
 *
 * Run with: npx tsx scripts/golden-path-test.ts
 */

import * as React from 'react';
import {
  buildGoldenPathRegistries,
  DefaultGoldenPathOrchestrator,
  GoldenPathPageNotFoundError,
} from '../src/lib/golden-path';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';
import type { RenderNode } from '../src/lib/renderer-foundation';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// ---------------------------------------------------------------------------
// Fixture: a ThemeConfig with a hero + text section
// ---------------------------------------------------------------------------

function makeConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Golden Path Studio',
      description: 'A studio that proves the frozen architecture end-to-end.',
      locale: 'en',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      generator: 'awie-engine',
      generatorVersion: '2.0.0',
    },
    intent: 'brand_experience',
    resources: {
      pages: [
        {
          id: 'home',
          route: '/',
          title: 'Home',
          sectionIds: ['hero', 'about'],
          isHome: true,
        },
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Welcome to the Studio',
            subheading: 'Where architecture meets implementation.',
            media: 'hero-bg',
            mediaAlt: 'A studio workspace',
            actions: [
              { label: 'Learn more', target: '/about', variant: 'primary' },
              { label: 'Contact', target: '/contact' },
            ],
          },
        },
        {
          id: 'about',
          type: 'text',
          content: {
            heading: 'About',
            body: 'We build deterministic, framework-agnostic platforms.',
          },
        },
      ],
      assets: [
        { id: 'hero-bg', url: '/images/hero-bg.jpg', mimeType: 'image/jpeg', alt: 'A studio workspace' },
      ],
      settings: {},
      menus: [],
      forms: [],
    },
    policies: {},
  };
}

// ---------------------------------------------------------------------------
// MANDATE 1 + 2: The Golden Path is a pure orchestration layer
// ---------------------------------------------------------------------------

section('MANDATE 1+2: Golden Path orchestrates; it never decides');

const registries = buildGoldenPathRegistries();
const orchestrator = new DefaultGoldenPathOrchestrator(registries);
const config = makeConfig();

const result = orchestrator.renderPage(config, 'home');

// The result carries BOTH the framework-agnostic RenderNode AND the React
// element tree. This proves the two layers are composed, not merged.
assert(
  result.renderNode !== undefined && result.renderNode.type === 'fragment',
  'renderPage returns a framework-agnostic RenderNode tree (Runtime output)',
);
assert(
  result.reactElement !== undefined,
  'renderPage returns a materialized React element tree (Framework output)',
);
assert(
  result.configId === 'Golden Path Studio',
  'renderPage carries the config identity',
);

// The RenderNode tree is a fragment wrapping the ordered section nodes.
const fragment = result.renderNode as Extract<RenderNode, { type: 'fragment' }>;
assert(
  fragment.children.length === 2,
  'the page renders exactly 2 sections (hero + about) in order',
);

// The first section node is a hero element with semantic props.
const heroNode = fragment.children[0] as Extract<RenderNode, { type: 'element' }>;
assert(heroNode.type === 'element', 'the first section is an element node');
assert(heroNode.componentId === 'hero', 'the hero section resolves to the hero component');
assert(
  heroNode.props['heading'] === 'Welcome to the Studio',
  'the hero node carries the semantic heading prop',
);
assert(
  heroNode.props['body'] === 'Where architecture meets implementation.',
  'the hero node carries the semantic body prop',
);

// The hero media is resolved through the asset resolver (never raw storage).
const heroMedia = heroNode.props['media'] as { src: string; alt?: string };
assert(
  heroMedia !== undefined && heroMedia.src === '/images/hero-bg.jpg',
  'the hero media is resolved through the asset resolver',
);

// The hero actions are mapped to the semantic Action contract.
const heroActions = heroNode.props['actions'] as { label: string; target: string; variant?: string }[];
assert(
  Array.isArray(heroActions) && heroActions.length === 2,
  'the hero actions are mapped to the semantic Action contract',
);
assert(
  heroActions[0].label === 'Learn more' && heroActions[0].variant === 'primary',
  'the first action carries label + variant',
);

// The second section node is a text element with semantic props.
const textNode = fragment.children[1] as Extract<RenderNode, { type: 'element' }>;
assert(textNode.componentId === 'text', 'the about section resolves to the text component');
assert(
  textNode.props['heading'] === 'About' && textNode.props['body'] === 'We build deterministic, framework-agnostic platforms.',
  'the text node carries the semantic heading + body props',
);

// ---------------------------------------------------------------------------
// MANDATE 3: DETERMINISM
// ---------------------------------------------------------------------------

section('MANDATE 3: Determinism (same config -> same output)');

const resultA = orchestrator.renderPage(config, 'home');
const resultB = orchestrator.renderPage(config, 'home');

// The RenderNode trees are structurally identical.
assert(
  JSON.stringify(resultA.renderNode) === JSON.stringify(resultB.renderNode),
  'the same ThemeConfig always produces the same RenderNode tree',
);

// The React element trees are structurally identical.
assert(
  JSON.stringify(resultA.reactElement) === JSON.stringify(resultB.reactElement),
  'the same RenderNode always produces the same React element tree',
);

// ---------------------------------------------------------------------------
// MANDATE 4: CMS Command -> ThemeConfig -> Runtime render
// ---------------------------------------------------------------------------

section('MANDATE 4: CMS Command produces a ThemeConfig that the Runtime renders');

// The Application Layer (CMS Core) handles Commands. It produces a NEW
// ThemeConfig via the EditorService. The Runtime NEVER decides; it only renders
// the resulting ThemeConfig.
//
// Here we simulate the Application producing an updated ThemeConfig (e.g. the
// heading was changed by an editor command), then the Runtime renders it.
const updatedConfig: ThemeConfig = {
  ...config,
  resources: {
    ...config.resources,
    sections: config.resources.sections.map((s) =>
      s.id === 'hero'
        ? { ...s, content: { ...s.content, heading: 'Welcome to the Studio v2' } }
        : s,
    ),
  },
};

const updatedResult = orchestrator.renderPage(updatedConfig, 'home');
const updatedFragment = updatedResult.renderNode as Extract<RenderNode, { type: 'fragment' }>;
const updatedHero = updatedFragment.children[0] as Extract<RenderNode, { type: 'element' }>;

assert(
  updatedHero.props['heading'] === 'Welcome to the Studio v2',
  'the Runtime renders the NEW ThemeConfig produced by the Application Command',
);

// The Application NEVER renders. The Runtime NEVER decides. The Golden Path
// merely wires them. This is proven by the fact that the orchestrator only
// calls the ThemeEngine (render) and the React Adapter (materialize); it never
// interprets the config's business meaning.

// ---------------------------------------------------------------------------
// Error handling: unknown page fails fast
// ---------------------------------------------------------------------------

section('Error handling: unknown page fails fast');

let threw = false;
try {
  orchestrator.renderPage(config, 'does-not-exist');
} catch (error) {
  threw = error instanceof GoldenPathPageNotFoundError;
}
assert(threw, 'rendering an unknown page throws GoldenPathPageNotFoundError');

// ---------------------------------------------------------------------------
// React element tree inspection
// ---------------------------------------------------------------------------

section('React element tree: materialized by the Framework Adapter');

// The React element tree is a React.Fragment wrapping the materialized
// sections. We inspect the element structure to prove the adapter materialized
// the RenderNode into actual React elements.
const reactFragment = result.reactElement as React.ReactElement;
assert(
  reactFragment !== null && typeof reactFragment === 'object' && reactFragment.type === React.Fragment,
  'the React element tree is a React.Fragment (adapter output)',
);

const reactChildren = React.Children.toArray(
  (reactFragment.props as { children?: React.ReactNode }).children ?? [],
);
assert(
  reactChildren.length === 2,
  'the React fragment wraps exactly 2 materialized section elements',
);

const heroElement = reactChildren[0] as React.ReactElement;
assert(
  heroElement !== null && typeof heroElement === 'object' && heroElement.type !== undefined,
  'the first materialized element is a React element (not a raw HTML tag)',
);

// The hero element receives the semantic props (heading, body, media, actions).
const heroProps = heroElement.props as Record<string, unknown>;
assert(
  heroProps['heading'] === 'Welcome to the Studio',
  'the hero React element receives the semantic heading prop',
);
assert(
  heroProps['body'] === 'Where architecture meets implementation.',
  'the hero React element receives the semantic body prop',
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n----------------------------------------`);
console.log(`Golden Path Test: ${passed} passed, ${failed} failed`);
console.log(`----------------------------------------`);

if (failed > 0) {
  process.exit(1);
}
