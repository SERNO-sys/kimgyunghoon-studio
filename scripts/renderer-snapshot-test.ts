/**
 * AWIE V2 - Renderer Foundation Snapshot Test (Phase 08, Engine Fix).
 *
 * Locks down the behavior of the DUMB ThemeEngine by feeding a valid
 * ThemeConfig through the full pipeline:
 *
 *   DefaultThemeValidator -> DefaultThemeResourceBuilder -> DefaultThemeEngine
 *
 * and asserting that engine.renderPage() returns a valid, deterministic,
 * serializable RenderNode JSON tree with 0 React/Vue dependencies.
 *
 * This test runs BEFORE any React Adapter is built. It is pure TypeScript.
 */

import type { ThemeConfig } from '../src/lib/theme-config/v2';
import {
  DefaultThemeEngine,
  DefaultThemeResourceBuilder,
  DefaultThemeValidator,
  InMemoryResourceRegistry,
  type LayoutRenderer,
  type RenderNode,
  type RendererComponent,
  type SkinResource,
  type TypographyResource,
} from '../src/lib/renderer-foundation';

// ---------------------------------------------------------------------------
// A valid ThemeConfig (the SSOT)
// ---------------------------------------------------------------------------

const config: ThemeConfig = {
  metadata: {
    title: 'Snapshot Test Site',
    tagline: 'Deterministic rendering',
    locale: 'en',
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:00.000Z',
    generator: 'awie-engine',
    generatorVersion: '0.0.1',
  },
  intent: 'brand_experience',
  resources: {
    pages: [
      {
        id: 'home',
        route: '/',
        title: 'Home',
        sectionIds: ['hero', 'features'],
        isHome: true,
      },
    ],
    sections: [
      {
        id: 'hero',
        type: 'hero',
        content: { headline: 'Hello World' },
        settings: { componentId: 'hero-component' },
      },
      {
        id: 'features',
        type: 'features',
        content: { items: ['A', 'B'] },
        settings: { componentId: 'features-component' },
      },
    ],
    assets: [],
    settings: {},
    menus: [],
    forms: [],
  },
  policies: {},
};

// ---------------------------------------------------------------------------
// Mock framework-agnostic components (RendererComponent)
// ---------------------------------------------------------------------------

const heroComponent: RendererComponent = {
  name: 'HeroComponent',
  render(props, _context): RenderNode {
    const headline = (props.content as { headline?: string } | undefined)
      ?.headline;
    return {
      type: 'element',
      componentId: 'hero-component',
      props,
      children: [{ type: 'text', text: headline ?? '' }],
    };
  },
};

const featuresComponent: RendererComponent = {
  name: 'FeaturesComponent',
  render(props, _context): RenderNode {
    const items = (props.content as { items?: string[] } | undefined)?.items ?? [];
    return {
      type: 'element',
      componentId: 'features-component',
      props,
      children: items.map((item) => ({ type: 'text', text: item })),
    };
  },
};

// ---------------------------------------------------------------------------
// Mock layout (composition wrapper ONLY)
// ---------------------------------------------------------------------------

const defaultLayout: LayoutRenderer = {
  name: 'DefaultLayout',
  render(sections, _context): RenderNode {
    return {
      type: 'fragment',
      children: sections,
    };
  },
};

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function assertNoReactVue(node: RenderNode): void {
  const json = JSON.stringify(node);
  assert(
    !/react|vue|createElement|jsx/i.test(json),
    'RenderNode JSON contains 0 React/Vue dependencies',
  );
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

function main(): void {
  console.log('AWIE V2 Renderer Foundation Snapshot Test');
  console.log('==========================================\n');

  // 1. Validate the config.
  console.log('[1] DefaultThemeValidator');
  const validator = new DefaultThemeValidator();
  validator.validate(config);
  assert(true, 'valid ThemeConfig passes validation');
  console.log('');

  // 2. Build the ResourceMap.
  console.log('[2] DefaultThemeResourceBuilder');
  const builder = new DefaultThemeResourceBuilder();
  const resourceMap = builder.build(config);
  assert(resourceMap.pages.size === 1, 'ResourceMap has 1 page');
  assert(resourceMap.sections.size === 2, 'ResourceMap has 2 sections');
  console.log('');

  // 3. Build the registries and the engine.
  console.log('[3] DefaultThemeEngine');
  const components = new InMemoryResourceRegistry<RendererComponent>();
  components.register('hero-component', heroComponent);
  components.register('features-component', featuresComponent);

  const layouts = new InMemoryResourceRegistry<LayoutRenderer>();
  layouts.register('default', defaultLayout);

  const skins = new InMemoryResourceRegistry<SkinResource>();
  const typography = new InMemoryResourceRegistry<TypographyResource>();

  const engine = new DefaultThemeEngine({
    components,
    layouts,
    skins,
    typography,
  });

  const page = resourceMap.pages.get('home')!;
  const tree = engine.renderPage(config, page, { resourceMap });

  // 4. Assert the tree is a valid, serializable RenderNode.
  console.log('[4] RenderNode JSON tree');
  assert(tree.type === 'fragment', 'root node is a fragment (layout wrapper)');
  if (tree.type === 'fragment') {
    assert(Array.isArray(tree.children), 'root has children');
    assert(tree.children.length === 2, 'root has 2 section children');

    const heroNode = tree.children[0];
    assert(heroNode.type === 'element', 'hero node is an element');
    if (heroNode.type === 'element') {
      assert(
        heroNode.componentId === 'hero-component',
        'hero resolved by componentId (not semantic type)',
      );
      assert(heroNode.children[0].type === 'text', 'hero has a text child');
    }

    const featuresNode = tree.children[1];
    assert(featuresNode.type === 'element', 'features node is an element');
    if (featuresNode.type === 'element') {
      assert(
        featuresNode.componentId === 'features-component',
        'features resolved by componentId',
      );
      assert(
        featuresNode.children.length === 2,
        'features has 2 text children',
      );
    }
  }

  // 5. Determinism: render twice, must be deep-equal.
  console.log('[5] Determinism');
  const tree2 = engine.renderPage(config, page, { resourceMap });
  assert(
    JSON.stringify(tree) === JSON.stringify(tree2),
    'rendering the same config twice produces identical JSON',
  );

  // 6. Serializability + 0 React/Vue deps.
  console.log('[6] Serializability & framework-agnostic');
  const json = JSON.stringify(tree);
  assert(typeof json === 'string' && json.length > 0, 'tree is JSON-serializable');
  assertNoReactVue(tree);

  console.log('');
  if (failures === 0) {
    console.log('ALL SNAPSHOT TESTS PASSED');
  } else {
    console.error(`${failures} SNAPSHOT TEST(S) FAILED`);
    process.exitCode = 1;
  }
}

main();
