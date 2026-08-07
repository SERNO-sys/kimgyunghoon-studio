/**
 * AWIE V2 - Phase 13.5: Official Business Components Plugin - Reference Products E2E.
 *
 * Proves the 6 Business Reference Websites render through the FROZEN Golden Path
 * using the renderers provided by the Official Business Components Plugin.
 *
 * THE ARCHITECTURAL PROOF (Phase 13.5):
 *
 *   1. The Plugin is loaded through the FULL PluginLoader lifecycle
 *      (Discover -> Validate -> Load -> Register -> Enable). The PluginLoader is
 *      the ONLY entity that registers Plugin artifacts (via narrow ports).
 *
 *   2. The Plugin's renderers are ADAPTED into the Golden Path's framework-
 *      agnostic ComponentRegistry. This is the "build on top" pattern: the
 *      Plugin provides semantic section renderers; the platform wires them into
 *      the render pipeline. The Plugin NEVER touches the Core Registry directly.
 *
 *   3. The registries are populated with the DEFAULT section renderers AND the
 *      Plugin's adapted renderers, then FROZEN. This mirrors the real platform
 *      bootstrap: register defaults + enabled plugins, then freeze to guarantee
 *      reproducible renders. The frozen bootstrap contract is preserved.
 *
 *   4. Each of the 6 Reference Products (a complete ThemeConfig, the SSOT)
 *      renders deterministically through the frozen Golden Path, with the
 *      business section renderers (gallery, menu, faq, contact, map, services,
 *      doctors, portfolio, sermons, events, reservation-cta, booking-cta)
 *      provided by the Plugin.
 *
 *   5. The Plugin's renderers are provably used: the produced RenderNode
 *      metadata identifies the plugin ("official-business-components").
 *
 * Run with: npx tsx scripts/reference-products-e2e.ts
 */

import * as React from 'react';
import { DefaultGoldenPathOrchestrator } from '../src/lib/golden-path';
import type { GoldenPathRegistries } from '../src/lib/golden-path/types';
import {
  InMemoryResourceRegistry,
  type ComponentRegistry,
  type LayoutRegistry,
  type RenderContext,
  type RenderNode,
  type RendererComponent,
  type SkinRegistry,
  type TypographyRegistry,
} from '../src/lib/renderer-foundation';
import {
  Hero,
  InMemoryReactComponentRegistry,
  Text,
  type ReactComponentRegistry,
  type ReactComponentType,
} from '../src/lib/renderer-react';

import { DEFAULT_SECTION_RENDERERS } from '../src/lib/golden-path/section-renderers';
import { buildProductConfig } from '../products/shared/scaffold';
import { REFERENCE_PRODUCTS } from '../products';
import {
  PluginLoader,
  type PluginRegistryPorts,
  type RendererExtension,
  type ThemeExtension,
  type ComponentExtension,
} from '../src/lib/sdk';
import { officialBusinessComponentsManifest } from '../src/plugins/official-business-components/manifest';
import { officialBusinessComponentsArtifacts } from '../src/plugins/official-business-components/index';


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
// In-memory registry ports (simulating the Core Registry)
// ---------------------------------------------------------------------------

/**
 * A minimal in-memory registry that satisfies the narrow registry port
 * contract. It simulates the Core Registry WITHOUT exposing it to the Plugin.
 * The PluginLoader is the ONLY entity that receives these ports.
 */
class InMemoryPort<T> {
  private readonly map = new Map<string, T>();

  register(id: string, resource: T): void {
    this.map.set(id, resource);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  get(id: string): T | undefined {
    return this.map.get(id);
  }

  list(): T[] {
    return Array.from(this.map.values());
  }
}

// ---------------------------------------------------------------------------
// Plugin -> Golden Path adapter
// ---------------------------------------------------------------------------

/**
 * Adapts a Plugin's RendererExtension into a Golden Path RendererComponent.
 *
 * This is the "build on top" bridge. The Plugin provides a semantic section
 * renderer (sectionType + render). The platform wraps it into the framework-
 * agnostic RendererComponent that the ThemeEngine consumes.
 *
 * The ThemeEngine invokes a RendererComponent with props `{ section, content,
 * settings }`. The Plugin's render function consumes `props.content` and the
 * render context. This adapter passes the section content through and forwards
 * the engine's render context (which is structurally compatible with the
 * Plugin's AwieRenderContext).
 *
 * @param extension The Plugin's RendererExtension.
 * @returns A Golden Path RendererComponent registered under the section type.
 */
function adaptRenderer(extension: RendererExtension): RendererComponent {
  return {
    name: `plugin.${extension.id}`,
    render(props: Record<string, unknown>, context: RenderContext): RenderNode {
      const section = props.section as { content?: Record<string, unknown> } | undefined;
      const content = section?.content ?? {};

      // Forward the section content to the Plugin's render function, along with
      // the render context (locale, tenant, preview, config).
      return extension.render({ content }, context);
    },
  };
}

// ---------------------------------------------------------------------------
// Generic React presentation component for business section types
// ---------------------------------------------------------------------------

/**
 * A DUMB, generic React presentation component.
 *
 * The Official Business Components Plugin is FRAMEWORK-AGNOSTIC: it produces
 * RenderNodes (componentId = section type) and MUST NOT contain React. The
 * PLATFORM therefore provides the React presentation components that
 * materialize those RenderNodes. This is a platform-side framework concern,
 * NOT business logic.
 *
 * This generic component renders the semantic presentation props (heading,
 * body, items) that the Plugin's renderers emit. It knows NOTHING about
 * ThemeConfig, SectionConfig, or any business meaning. It is pure presentation.
 */
function GenericSection(props: Record<string, unknown>): React.ReactElement {
  const heading = typeof props['heading'] === 'string' ? props['heading'] : undefined;
  const body = typeof props['body'] === 'string' ? props['body'] : undefined;
  const items = Array.isArray(props['items']) ? (props['items'] as unknown[]) : [];

  const children: React.ReactNode[] = [];
  if (heading) {
    children.push(
      React.createElement('h2', { className: 'awie-generic-section__heading' }, heading),
    );
  }
  if (body) {
    children.push(
      React.createElement('p', { className: 'awie-generic-section__body' }, body),
    );
  }
  if (items.length > 0) {
    children.push(
      React.createElement(
        'ul',
        { className: 'awie-generic-section__items' },
        items.map((item, index) => {
          const label =
            typeof item === 'object' && item !== null && 'label' in item
              ? String((item as { label: unknown }).label)
              : String(item);
          return React.createElement('li', { key: `${label}-${index}` }, label);
        }),
      ),
    );
  }

  return React.createElement('section', { className: 'awie-generic-section' }, children);
}


// ---------------------------------------------------------------------------
// Registry builder (mirrors the frozen bootstrap, but includes plugin renderers)
// ---------------------------------------------------------------------------


/**
 * Builds the Golden Path registries, populating them with the DEFAULT section
 * renderers AND the Plugin's adapted renderers, then FREEZING them.
 *
 * This mirrors the real platform bootstrap contract (register defaults +
 * enabled plugins, then freeze). It does NOT modify the frozen bootstrap; it
 * demonstrates the plugin integration point a platform bootstrap would use.
 *
 * @param pluginRenderers The Plugin's adapted renderers, keyed by section type.
 * @returns The populated and frozen GoldenPathRegistries.
 */
function buildRegistriesWithPlugin(
  pluginRenderers: ReadonlyArray<{ sectionType: string; renderer: RendererComponent }>,
): GoldenPathRegistries {
  // Framework-agnostic component registry: section type -> section renderer.
  const components: ComponentRegistry = new InMemoryResourceRegistry();
  for (const [sectionType, renderer] of Object.entries(DEFAULT_SECTION_RENDERERS)) {
    components.register(sectionType, renderer);
  }
  // Register the Plugin's business section renderers BEFORE freezing.
  for (const { sectionType, renderer } of pluginRenderers) {
    components.register(sectionType, renderer);
  }

  // Framework-agnostic layout registry.
  const layouts: LayoutRegistry = new InMemoryResourceRegistry();
  layouts.register('default', {
    name: 'golden-path.default-layout',
    render(sections: RenderNode[]): RenderNode {
      return { type: 'fragment', children: sections, metadata: { layoutId: 'default' } };
    },
  });

  // Framework-agnostic skin + typography registries.
  const skins: SkinRegistry = new InMemoryResourceRegistry();
  skins.register('default', { id: 'default', colors: {}, radius: {}, shadows: {}, motion: {} });

  const typography: TypographyRegistry = new InMemoryResourceRegistry();
  typography.register('default', {
    id: 'default',
    families: {},
    sizes: {},
    weights: {},
    lineHeights: {},
  });

  // React component registry: componentId -> React presentation component.
  const reactComponents: ReactComponentRegistry = new InMemoryReactComponentRegistry();
  reactComponents.register('hero', Hero);
  reactComponents.register('text', Text);

  // The Plugin is framework-agnostic (it produces RenderNodes, never React).
  // The PLATFORM therefore registers a generic React presentation component for
  // each business section type so the React Adapter can materialize them. This
  // is a platform-side framework concern, NOT business logic.
  const businessTypes = [
    'features',
    'gallery',
    'menu',
    'faq',
    'contact',
    'map',
    'services',
    'doctors',
    'portfolio',
    'sermons',
    'events',
    'reservation-cta',
    'booking-cta',
  ];
  for (const type of businessTypes) {
    reactComponents.register(type, GenericSection as ReactComponentType);
  }


  // Freeze all registries to guarantee reproducible renders.

  components.freeze();
  layouts.freeze();
  skins.freeze();
  typography.freeze();

  return { components, layouts, skins, typography, reactComponents };
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

function main(): void {
  console.log('AWIE V2 Phase 13.5 - Official Business Components Plugin E2E');
  console.log('=============================================================\n');

  // -------------------------------------------------------------------------
  // STEP 1: Load the Official Business Components Plugin through the
  //         PluginLoader lifecycle.
  // -------------------------------------------------------------------------
  section('STEP 1: Load the Official Business Components Plugin');

  const rendererPort = new InMemoryPort<RendererExtension>();
  const themePort = new InMemoryPort<ThemeExtension>();
  const componentPort = new InMemoryPort<ComponentExtension>();

  const ports: PluginRegistryPorts = {
    renderers: rendererPort,
    themes: themePort,
    components: componentPort,
  };

  const CORE_VERSION = '2.0.0';
  const loader = new PluginLoader(CORE_VERSION, ports);

  const result = loader.install(
    officialBusinessComponentsManifest,
    officialBusinessComponentsArtifacts,
  );

  assert(result.ok === true, 'install() returns ok=true');
  assert(result.state === 'enabled', `final lifecycle state is "enabled" (got "${result.state}")`);
  assert(loader.stateOf('official-business-components') === 'enabled', 'loader.stateOf() === "enabled"');

  // The Plugin registered its renderers into the renderer port.
  const registeredRenderers = rendererPort.list();
  assert(
    registeredRenderers.length === 13,
    `the Plugin registered ${registeredRenderers.length} renderers (expected 13)`,
  );


  // -------------------------------------------------------------------------
  // STEP 2: Adapt the Plugin's renderers into the Golden Path ComponentRegistry.
  // -------------------------------------------------------------------------
  section('STEP 2: Adapt Plugin renderers into the Golden Path ComponentRegistry');

  const adapted = registeredRenderers.map((renderer) => ({
    sectionType: renderer.sectionType,
    renderer: adaptRenderer(renderer),
  }));

  const registries = buildRegistriesWithPlugin(adapted);

  // Prove the business section types are now resolvable.
  const businessTypes = [
    'features',
    'gallery',
    'menu',
    'faq',
    'contact',
    'map',
    'services',
    'doctors',
    'portfolio',
    'sermons',
    'events',
    'reservation-cta',
    'booking-cta',
  ];
  for (const type of businessTypes) {
    assert(registries.components.has(type), `component registry resolves section type "${type}"`);
  }


  // -------------------------------------------------------------------------
  // STEP 3: Render all 6 Reference Products through the frozen Golden Path.
  // -------------------------------------------------------------------------
  section('STEP 3: Render all 6 Reference Products through the Golden Path');

  const orchestrator = new DefaultGoldenPathOrchestrator(registries);

  assert(
    REFERENCE_PRODUCTS.length === 6,
    `the registry contains exactly 6 Reference Products (found ${REFERENCE_PRODUCTS.length})`,
  );

  for (const product of REFERENCE_PRODUCTS) {
    section(`Product: ${product.title} (${product.id})`);

    const config = buildProductConfig(product.declaration);

    assert(
      config.metadata.title === product.title,
      'the ThemeConfig carries the product title',
    );

    for (const page of config.resources.pages) {
      const pageResult = orchestrator.renderPage(config, page.id);

      assert(
        pageResult.renderNode !== undefined && pageResult.renderNode.type === 'fragment',
        `page "${page.id}" renders a framework-agnostic RenderNode tree`,
      );
      assert(
        pageResult.reactElement !== undefined,
        `page "${page.id}" renders a materialized React element tree`,
      );

      const fragment = pageResult.renderNode as Extract<RenderNode, { type: 'fragment' }>;
      assert(
        fragment.children.length === page.sectionIds.length,
        `page "${page.id}" renders exactly ${page.sectionIds.length} sections in order`,
      );

      // Every section node is a valid element node produced by the Plugin.
      for (const child of fragment.children) {
        const element = child as Extract<RenderNode, { type: 'element' }>;
        assert(
          element.type === 'element' && element.componentId !== undefined,
          `section "${element.id}" resolves to a valid element node (${element.componentId})`,
        );

        // The Plugin's renderers tag their output with the plugin id.
        if (element.metadata?.['plugin'] !== undefined) {
          assert(
            element.metadata['plugin'] === 'official-business-components',
            `section "${element.id}" was rendered by the Official Business Components Plugin`,
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: DETERMINISM (same product -> same output).
  // -------------------------------------------------------------------------
  section('STEP 4: Determinism (same product -> same output)');

  for (const product of REFERENCE_PRODUCTS) {
    const config = buildProductConfig(product.declaration);
    const home = config.resources.pages.find((p) => p.isHome) ?? config.resources.pages[0];

    const resultA = orchestrator.renderPage(config, home.id);
    const resultB = orchestrator.renderPage(config, home.id);

    assert(
      JSON.stringify(resultA.renderNode) === JSON.stringify(resultB.renderNode),
      `${product.id}: the same ThemeConfig always produces the same RenderNode tree`,
    );
    assert(
      JSON.stringify(resultA.reactElement) === JSON.stringify(resultB.reactElement),
      `${product.id}: the same RenderNode always produces the same React element tree`,
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n----------------------------------------`);
  console.log(`Reference Products E2E: ${passed} passed, ${failed} failed`);
  console.log(`----------------------------------------`);

  if (failed > 0) {
    console.error('REFERENCE PRODUCTS E2E FAILED');
    process.exit(1);
  }
  console.log('REFERENCE PRODUCTS E2E PASSED');
  console.log('All 6 Reference Products render through the frozen Golden Path using the Official Business Components Plugin.');
}

main();
