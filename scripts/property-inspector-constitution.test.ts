/**
 * AWIE V2 - Phase 17.3: Property Inspector Constitutional Test.
 *
 * Verifies the frozen Property Inspector Constitution (ADR-013, Amendments H
 * and I) and the Selection Constitution (Amendment G):
 *
 *   1. AMENDMENT H (Adapter Boundary) - FROZEN
 *      "The Property Inspector MUST NEVER consume PropertySchema directly. All
 *       PropertySchema access MUST occur through the AWIE PropertyAdapter. The
 *       Inspector consumes only the adapter output."
 *
 *   2. AMENDMENT I (UI-Agnostic Schema) - FROZEN
 *      "PropertySchema MUST remain strictly UI-agnostic. It describes domain
 *       properties only (e.g., field, type, label). It MUST NEVER contain
 *       framework components, DOM structure, CSS class names, or UI
 *       implementation details."
 *
 *   3. EMIT-DON'T-MUTATE (Dumb Client)
 *      The Inspector emits EditorCommandPayloads on change. It NEVER mutates
 *      the ThemeConfig and NEVER executes a Command itself.
 *
 *   4. AMENDMENT G (Semantic Component Identity)
 *      The adapter binds to the selected component's Semantic Component
 *      Identity — the ONLY selection identity. It NEVER uses nodeId, RenderNode
 *      id, DOM id, tree index, or runtime UUID.
 *
 * Run: npx tsx scripts/property-inspector-constitution.test.ts
 */

import { SelectionModel } from '../src/components/admin/editor/selection-model';
import { PropertyAdapter } from '../src/components/admin/editor/property-adapter';
import {
  PROPERTY_SCHEMAS,
  resolvePropertySchema,
  type PropertyFieldDescriptor,
} from '../src/components/admin/editor/property-schema';
import type { RenderNode } from '../src/lib/renderer-foundation';
import { SEMANTIC_ID_METADATA_KEY } from '../src/lib/renderer-react';

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

/** A RenderNode tree with a hero section carrying editable props. */
function buildHeroTree(): RenderNode {
  return {
    type: 'element',
    componentId: 'page',
    props: {},
    children: [
      {
        type: 'element',
        componentId: 'hero',
        props: {
          heading: 'Welcome',
          subheading: 'To AWIE',
          body: 'A deterministic website generation framework.',
          backgroundColor: '#f8f5ed',
          textColor: '#111827',
          align: 'center',
        },
        children: [],
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

// ---------------------------------------------------------------------------
// Amendment H: Adapter Boundary
// ---------------------------------------------------------------------------

section('Amendment H - Adapter Boundary (Inspector consumes ONLY adapter output)');

{
  const tree = buildHeroTree();
  const selection = SelectionModel.resolve(tree, 'hero');
  const output = PropertyAdapter.resolve(selection);

  assert(
    output.selectedComponentId === 'hero',
    'Adapter binds to the Semantic Component Identity (hero)',
  );
  assert(
    output.isEmpty === false,
    'A resolved selection produces a non-empty adapter output',
  );
  assert(
    output.descriptors.length > 0,
    'Adapter produces a non-empty descriptor list for the hero component',
  );

  // The adapter output is the ONLY thing the Inspector consumes. It carries
  // the resolved current values from the RenderNode props.
  const heading = output.descriptors.find((d) => d.field === 'heading');
  assert(
    heading?.value === 'Welcome',
    'Adapter resolves the current value from the RenderNode props (heading)',
  );
  const align = output.descriptors.find((d) => d.field === 'align');
  assert(
    align?.type === 'select' && align.options?.length === 3,
    'Adapter carries select options for the align field',
  );
  const bg = output.descriptors.find((d) => d.field === 'backgroundColor');
  assert(
    bg?.type === 'color' && bg.value === '#f8f5ed',
    'Adapter carries the color field and its resolved value',
  );
}

// ---------------------------------------------------------------------------
// Amendment I: UI-Agnostic Schema
// ---------------------------------------------------------------------------

section('Amendment I - UI-Agnostic Schema (no framework, no DOM, no CSS)');

{
  // Every schema field is a PURE DOMAIN descriptor. It describes the field's
  // domain identity, type, label, and constraints — never a UI control.
  for (const schema of PROPERTY_SCHEMAS) {
    for (const field of schema.fields) {
      assert(
        typeof field.field === 'string' && field.field.length > 0,
        `Schema "${schema.componentId}" field has a domain key`,
      );
      assert(
        typeof field.label === 'string' && field.label.length > 0,
        `Schema "${schema.componentId}" field has a human-readable label`,
      );
      assert(
        ['text', 'textarea', 'number', 'color', 'select', 'boolean'].includes(
          field.type,
        ),
        `Schema "${schema.componentId}" field type is a pure domain type`,
      );
      // AMENDMENT I: The schema MUST NOT contain any UI implementation detail.
      assert(
        !('component' in field) && !('className' in field) && !('dom' in field),
        `Schema "${schema.componentId}" field contains NO UI implementation detail`,
      );
    }
  }

  // The adapter output is ALSO UI-agnostic: it carries domain identity, value,
  // type, and constraints — never a concrete control.
  const tree = buildHeroTree();
  const selection = SelectionModel.resolve(tree, 'hero');
  const output = PropertyAdapter.resolve(selection);
  for (const descriptor of output.descriptors) {
    assert(
      !('component' in descriptor) &&
        !('className' in descriptor) &&
        !('dom' in descriptor),
      `Adapter descriptor "${descriptor.field}" is UI-agnostic (no control, no CSS)`,
    );
  }
}

// ---------------------------------------------------------------------------
// Amendment H: The Adapter is the ONLY consumer of PropertySchema
// ---------------------------------------------------------------------------

section('Amendment H - Adapter is the ONLY schema consumer');

{
  // The schema registry is reachable ONLY through resolvePropertySchema, which
  // the PropertyAdapter calls. The Inspector never imports the schema. This
  // test asserts the schema resolves correctly through the adapter path.
  const tree = buildHeroTree();
  const selection = SelectionModel.resolve(tree, 'hero');
  const output = PropertyAdapter.resolve(selection);

  // The adapter resolved the schema for the hero component and translated it.
  const schema = resolvePropertySchema('hero');
  assert(
    schema !== undefined,
    'resolvePropertySchema resolves the hero schema (adapter-only entry point)',
  );
  assert(
    output.descriptors.length === schema?.fields.length,
    'Adapter output mirrors the schema field count (1:1 translation)',
  );

  // The adapter output field keys match the schema field keys.
  const schemaKeys = (schema?.fields ?? []).map((f: PropertyFieldDescriptor) => f.field);
  const outputKeys = output.descriptors.map((d) => d.field);
  assert(
    schemaKeys.every((key) => outputKeys.includes(key)),
    'Adapter output field keys are a superset of the schema field keys',
  );
}

// ---------------------------------------------------------------------------
// Amendment G: Semantic Component Identity (never nodeId / RenderNode id)
// ---------------------------------------------------------------------------

section('Amendment G - Adapter binds ONLY to Semantic Component Identity');

{
  const tree = buildHeroTree();

  // The adapter MUST NOT bind by RenderNode id (e.g. "hero-node").
  const byRenderNodeId = SelectionModel.resolve(tree, 'hero-node');
  assert(
    byRenderNodeId.isEmpty === true,
    'SelectionModel NEVER resolves by RenderNode id',
  );

  // The adapter MUST bind by the Semantic Component Identity.
  const bySemanticId = SelectionModel.resolve(tree, 'hero');
  const output = PropertyAdapter.resolve(bySemanticId);
  assert(
    output.selectedComponentId === 'hero',
    'Adapter binds to the Semantic Component Identity (hero)',
  );

  // An empty selection produces an empty adapter output (never a fallback).
  const empty = PropertyAdapter.resolve(SelectionModel.resolve(tree, null));
  assert(
    empty.isEmpty === true && empty.descriptors.length === 0,
    'Empty selection produces an empty adapter output (never a fallback)',
  );
}

// ---------------------------------------------------------------------------
// Emit-Don't-Mutate (Dumb Client)
// ---------------------------------------------------------------------------

section('Emit-Don\'t-Mutate - Inspector emits Commands, never mutates');

{
  // The adapter is a PURE translator: it never mutates the RenderNode props it
  // reads. Resolving the adapter output must leave the source tree untouched.
  const tree = buildHeroTree();
  const selection = SelectionModel.resolve(tree, 'hero');
  const node = selection.node;
  const propsBefore = JSON.stringify(
    node && node.type === 'element' ? node.props : {},
  );

  PropertyAdapter.resolve(selection);

  const propsAfter = JSON.stringify(
    node && node.type === 'element' ? node.props : {},
  );

  assert(
    propsBefore === propsAfter,
    'Adapter is a pure translator — it never mutates the RenderNode props',
  );

  // The adapter never emits Commands. It only prepares the descriptor output.
  // The Inspector (EditorRightSidebar) is the emitter. This test asserts the
  // adapter output carries no command/emission side-channel.
  const output = PropertyAdapter.resolve(selection);
  assert(
    !('emit' in output) && !('command' in output),
    'Adapter output carries no command/emission side-channel (adapter never emits)',
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Property Inspector Constitution Test: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
