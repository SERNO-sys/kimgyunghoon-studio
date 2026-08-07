/**
 * AWIE V2 - Phase 17.2: Selection Model Constitutional Test.
 *
 * Verifies the frozen Selection Constitution (Sections 10, 11, 12) and
 * Amendment G:
 *
 *   1. SEMANTIC COMPONENT IDENTITY (Section 10)
 *      Selection MUST use Semantic Component Identity. NEVER DOM id, React key,
 *      RenderNode id, tree index, or runtime UUID.
 *
 *   2. SELECTION SNAPSHOT (Section 11)
 *      Selection is exposed ONLY through SelectionSnapshot. UI never shares
 *      component objects.
 *
 *   3. DOM RULE (Section 12)
 *      Only `data-awie-id` is allowed. `data-node-id` / `data-component-id`
 *      are FORBIDDEN.
 *
 *   4. FAIL-FAST (Amendment G)
 *      The SelectionInstrumentedAdapter MUST fail fast when a RenderNode is
 *      missing `metadata.semanticId`. It MUST NEVER generate a fallback.
 *
 *   5. PURE RESOLVER (Amendment G)
 *      The SelectionModel resolves ONLY by Semantic Component Identity. It
 *      never resolves by nodeId, RenderNode id, DOM id, tree index, or runtime
 *      UUID.
 *
 * Run: npx tsx scripts/selection-model-constitution.test.ts
 */

import * as React from 'react';
import { SelectionModel, EMPTY_SELECTION_SNAPSHOT } from '../src/components/admin/editor/selection-model';
import {
  InMemoryReactComponentRegistry,
  SelectionInstrumentedAdapter,
  DATA_AWIE_ID,
  SEMANTIC_ID_METADATA_KEY,
} from '../src/lib/renderer-react';
import { Hero, Text } from '../src/lib/renderer-react/components';
import { HeroSectionRenderer, TextSectionRenderer } from '../src/lib/golden-path/section-renderers';
import type { RenderNode } from '../src/lib/renderer-foundation';
import type { SectionConfig } from '../src/lib/theme-config/v2/types';
import type { RenderContext } from '../src/lib/renderer-foundation';

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

function section(label: string): void {
  console.log(`\n${label}`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A RenderNode tree with Semantic Component Identities stamped by the Section
 *  Renderer (the Carrier). */
function buildHeroTree(): RenderNode {
  return {
    type: 'element',
    componentId: 'page',
    props: {},
    children: [
      {
        type: 'element',
        componentId: 'hero',
        props: {},
        children: [
          {
            type: 'element',
            componentId: 'text',
            props: {},
            children: [],
            id: 'hero-title-node',
            key: 'hero-title',
            metadata: { [SEMANTIC_ID_METADATA_KEY]: 'hero.title' },
          },
        ],
        id: 'hero-node',
        key: 'hero',
        metadata: { [SEMANTIC_ID_METADATA_KEY]: 'hero' },
      },
    ],
    id: 'page-node',
    key: 'page',
    metadata: { [SEMANTIC_ID_METADATA_KEY]: 'page' },
  };
}

/** A RenderNode tree that is MISSING the Semantic Component Identity (a
 *  constitutional violation the adapter MUST fail fast on). */
function buildMissingSemanticIdTree(): RenderNode {
  return {
    type: 'element',
    componentId: 'hero',
    props: {},
    children: [],
    id: 'hero-node',
    key: 'hero',
    metadata: {}, // NO semanticId — violation.
  };
}

// ---------------------------------------------------------------------------
// Section 10: Semantic Component Identity
// ---------------------------------------------------------------------------

section('Section 10 - Semantic Component Identity');

{
  const tree = buildHeroTree();
  const snapshot = SelectionModel.resolve(tree, 'hero.title');

  assert(
    snapshot.selectedComponentId === 'hero.title',
    'Selection resolves by Semantic Component Identity (hero.title)',
  );
  assert(
    snapshot.node?.type === 'element' && snapshot.node.componentId === 'text',
    'Resolved node is the text component under hero',
  );
  assert(
    snapshot.breadcrumb.map((c) => c.semanticId).join('.') === 'page.hero.hero.title',
    'Breadcrumb path is the Semantic Component Identity path',
  );
  assert(
    snapshot.sectionId === 'hero',
    'Section id resolves to the nearest top-level section (hero)',
  );
}

// ---------------------------------------------------------------------------
// Section 11: Selection Snapshot
// ---------------------------------------------------------------------------

section('Section 11 - Selection Snapshot');

{
  const tree = buildHeroTree();
  const snapshot = SelectionModel.resolve(tree, 'hero');

  assert(
    snapshot.isEmpty === false,
    'A resolved selection is not empty',
  );
  assert(
    snapshot.renderNodeId === 'hero-node',
    'renderNodeId is exposed for DEBUG ONLY',
  );

  const empty = SelectionModel.resolve(tree, null);
  assert(
    empty === EMPTY_SELECTION_SNAPSHOT,
    'Null selection returns the empty snapshot singleton',
  );
  assert(
    empty.isEmpty === true && empty.selectedComponentId === null,
    'Empty snapshot has no selected component',
  );

  const unknown = SelectionModel.resolve(tree, 'does.not.exist');
  assert(
    unknown.isEmpty === true,
    'Unknown Semantic Component Identity resolves to empty (never a fallback)',
  );
}

// ---------------------------------------------------------------------------
// Section 12: DOM Rule
// ---------------------------------------------------------------------------

section('Section 12 - DOM Rule');

{
  const tree = buildHeroTree();
  const registry = new InMemoryReactComponentRegistry();
  registry.register('page', Hero);
  registry.register('hero', Hero);
  registry.register('text', Text);
  const adapter = new SelectionInstrumentedAdapter();
  const element = adapter.render(tree, { registry }) as React.ReactElement;

  // Walk the element tree and assert ONLY data-awie-id is present.
  const walk = (node: React.ReactNode): void => {
    if (!React.isValidElement(node)) {
      return;
    }
    const props = node.props as Record<string, unknown>;
    assert(
      props[DATA_AWIE_ID] === undefined || typeof props[DATA_AWIE_ID] === 'string',
      'data-awie-id is the only selection identity attribute',
    );
    assert(
      props['data-node-id'] === undefined,
      'data-node-id is FORBIDDEN on the DOM',
    );
    assert(
      props['data-component-id'] === undefined,
      'data-component-id is FORBIDDEN on the DOM',
    );
    React.Children.forEach(props.children as React.ReactNode, walk);
  };
  walk(element);
}

// ---------------------------------------------------------------------------
// Amendment G: Fail-fast on missing Semantic Component Identity
// ---------------------------------------------------------------------------

section('Amendment G - Fail-fast on missing semanticId');

{
  const tree = buildMissingSemanticIdTree();
  // Register the component so the adapter reaches the semanticId check (the
  // fail-fast must trigger on the MISSING semanticId, not on an unregistered
  // component).
  const registry = new InMemoryReactComponentRegistry();
  registry.register('hero', Hero);
  const adapter = new SelectionInstrumentedAdapter();
  let threw = false;
  try {
    adapter.render(tree, { registry });
  } catch (error) {
    threw = true;
    assert(
      error instanceof Error && /semanticId/.test(error.message),
      'Adapter throws a constitutional error when semanticId is missing',
    );
  }
  assert(threw, 'Adapter FAILS FAST (never generates a fallback identity)');
}

// ---------------------------------------------------------------------------
// Amendment G: Pure Resolver (never resolves by nodeId / RenderNode id)
// ---------------------------------------------------------------------------

section('Amendment G - Pure Resolver');

{
  const tree = buildHeroTree();

  // The model MUST NOT resolve by RenderNode id (e.g. "hero-node").
  const byRenderNodeId = SelectionModel.resolve(tree, 'hero-node');
  assert(
    byRenderNodeId.isEmpty === true,
    'SelectionModel NEVER resolves by RenderNode id',
  );

  // The model MUST NOT resolve by DOM id / React key / tree index.
  const byReactKey = SelectionModel.resolve(tree, 'hero-title');
  assert(
    byReactKey.isEmpty === true,
    'SelectionModel NEVER resolves by React key',
  );

  // The model MUST resolve by the Semantic Component Identity.
  const bySemanticId = SelectionModel.resolve(tree, 'hero');
  assert(
    bySemanticId.isEmpty === false,
    'SelectionModel resolves ONLY by Semantic Component Identity',
  );
}

// ---------------------------------------------------------------------------
// Identity Copy Rule (CTO Amendment, Phase 17.2 Conditional Approval)
// ---------------------------------------------------------------------------

section('Identity Copy Rule - Renderer preserves ThemeConfig identity verbatim');

{
  // A ThemeConfig section whose identity is "hero.title" (a nested semantic
  // component identity). The renderer MUST copy it verbatim into
  // metadata.semanticId — never create, derive, rename, concatenate, or
  // normalize it.
  const section: SectionConfig = {
    id: 'hero.title',
    type: 'hero',
    content: { heading: 'Hello', subheading: 'World' },
    settings: {},
  };

  // The renderer only consumes context.assetResolver. Cast a minimal context
  // (the full RenderContext is assembled by the engine, not the test).
  const context = {
    assetResolver: { resolve: (id: string) => id },
  } as RenderContext;

  const node = HeroSectionRenderer.render({ section }, context);

  assert(
    node.metadata?.semanticId === 'hero.title',
    'Renderer emits metadata.semanticId = hero.title verbatim (no modification)',
  );
  assert(
    node.metadata?.semanticId === section.id,
    'metadata.semanticId is byte-for-byte identical to ThemeConfig identity',
  );
  assert(
    node.id === 'hero.title' && node.key === 'hero.title',
    'RenderNode id/key mirror the ThemeConfig identity (carrier, not producer)',
  );
}

{
  // The Text renderer must obey the same Identity Copy Rule.
  const section: SectionConfig = {
    id: 'pricing.card.buy',
    type: 'text',
    content: { heading: 'Buy', body: 'Now' },
    settings: {},
  };

  const context = {
    assetResolver: { resolve: (id: string) => id },
  } as RenderContext;

  const node = TextSectionRenderer.render({ section }, context);

  assert(
    node.metadata?.semanticId === 'pricing.card.buy',
    'Text renderer emits metadata.semanticId verbatim (no modification)',
  );
  assert(
    node.metadata?.semanticId === section.id,
    'Text renderer copies identity byte-for-byte from ThemeConfig',
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Selection Model Constitution Test: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
