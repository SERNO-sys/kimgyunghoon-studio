/**
 * AWIE V2 - Phase 17.6/17.4: Command Handlers Constitutional Test.
 *
 * Verifies the frozen Command Model + Patch Pipeline constitution (Section 4:
 * "What AWIE Owns") and the Semantic Component Identity rule (Section 10 /
 * Amendment G) for the two editor-emitted Command Handlers:
 *
 *   1. UpdateComponentHandler (inline editing)
 *   2. InsertComponentHandler (drag & drop)
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. IMMUTABLE THEMECONFIG (Section 1)
 *      The handler produces a ThemePatch. It NEVER mutates the ThemeConfig.
 *      Applying the patch via the ThemePatchPipeline produces a NEW config.
 *
 *   B. SEMANTIC COMPONENT IDENTITY (Section 10 / Amendment G)
 *      The Command binds to `semanticId` / `targetSemanticId`. It NEVER uses
 *      nodeId, DOM id, React key, RenderNode id, tree index, or runtime UUID.
 *
 *   C. PURE INTENT (Section 4)
 *      The Command is pure intent. The handler translates it into a patch. It
 *      NEVER executes business logic.
 *
 *   D. DETERMINISTIC RENDERING (Section 2)
 *      The same Command + ThemeConfig always produces the same patch.
 *
 *   E. RUNTIME PURITY (Section 5)
 *      The handler NEVER renders, prices, books, authenticates, or evaluates
 *      permissions. It only produces a patch.
 *
 * Run: npx tsx scripts/command-handlers-constitution.test.ts
 */

import {
  createUpdateComponentCommand,
  UpdateComponentHandler,
  createInsertComponentCommand,
  InsertComponentHandler,
  createDeleteComponentCommand,
  DeleteComponentHandler,
  ThemePatchPipeline,
} from '../src/lib/cms-core';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';

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

/** A minimal ThemeConfig with a hero section and a home page. */
function buildConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Test Site',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      generator: 'test',
      generatorVersion: '1.0.0',
    },
    intent: 'brand_experience',
    resources: {
      pages: [
        {
          id: 'home',
          route: '/',
          title: 'Home',
          sectionIds: ['hero', 'footer'],
          isHome: true,
        },
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: { heading: 'Hello', subheading: 'World' },
          settings: {},
        },
        {
          id: 'footer',
          type: 'footer',
          content: { text: 'Footer' },
          settings: {},
        },
      ],
      assets: [],
      settings: {},
      menus: [],
      forms: [],
    },
    seo: {},
    policies: {},
  };
}

// ---------------------------------------------------------------------------
// A. Immutable ThemeConfig
// ---------------------------------------------------------------------------

section('A - Immutable ThemeConfig (Section 1)');

{
  const config = buildConfig();
  const original = JSON.stringify(config);

  const command = createUpdateComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    semanticId: 'hero.heading',
    sectionId: 'hero',
    value: 'New Heading',
  });
  const handler = new UpdateComponentHandler();
  const patch = handler.toPatch(command, config);

  // The handler MUST NOT mutate the config.
  assert(
    JSON.stringify(config) === original,
    'UpdateComponentHandler does NOT mutate the ThemeConfig',
  );

  // Applying the patch produces a NEW config with the change.
  const pipeline = new ThemePatchPipeline();
  const next = pipeline.apply(config, patch);
  assert(
    next !== config,
    'Applying the patch produces a NEW ThemeConfig (never mutates in place)',
  );
  assert(
    (next.resources.sections[0].content.heading as string) === 'New Heading',
    'The new config reflects the updated heading',
  );
  assert(
    (config.resources.sections[0].content.heading as string) === 'Hello',
    'The original config is unchanged',
  );
}

// ---------------------------------------------------------------------------
// B. Semantic Component Identity (Section 10 / Amendment G)
// ---------------------------------------------------------------------------

section('B - Semantic Component Identity (Section 10 / Amendment G)');

{
  const config = buildConfig();

  // The Command binds to the Semantic Component Identity "hero.heading".
  const command = createUpdateComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    semanticId: 'hero.heading',
    sectionId: 'hero',
    value: 'Updated',
  });
  const handler = new UpdateComponentHandler();
  const patch = handler.toPatch(command, config);

  assert(
    patch.operations[0].path === 'resources.sections[0].content.heading',
    'Patch path is derived from the Semantic Component Identity (hero.heading)',
  );
  assert(
    !patch.operations[0].path.includes('nodeId') &&
      !patch.operations[0].path.includes('renderNodeId') &&
      !patch.operations[0].path.includes('key'),
    'Patch path NEVER uses nodeId / RenderNode id / React key',
  );
}

// ---------------------------------------------------------------------------
// C. Pure Intent (Section 4)
// ---------------------------------------------------------------------------

section('C - Pure Intent (Section 4)');

{
  const config = buildConfig();

  const command = createInsertComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    componentType: 'gallery',
    targetSemanticId: 'hero',
    sectionId: 'hero',
  });
  const handler = new InsertComponentHandler();
  const patch = handler.toPatch(command, config);

  assert(
    patch.operations.length === 2,
    'InsertComponentHandler produces a 2-operation patch (add section + insert into page order)',
  );
  assert(
    patch.operations[0].op === 'add' &&
      patch.operations[0].path === 'resources.sections[2]',
    'First operation adds the new section to resources',
  );
  assert(
    patch.operations[1].op === 'add' &&
      patch.operations[1].path === 'resources.pages[0].sectionIds[1]',
    'Second operation inserts the new section id after the drop target (hero)',
  );

  // The new section id is deterministic and semantic (componentType-derived).
  const newSection = patch.operations[0].value as { id: string; type: string };
  assert(
    newSection.type === 'gallery',
    'New section has the requested component type',
  );
  assert(
    newSection.id.startsWith('gallery-'),
    'New section id is deterministic and semantic (gallery-*)',
  );
}

// ---------------------------------------------------------------------------
// D. Deterministic Rendering (Section 2)
// ---------------------------------------------------------------------------

section('D - Deterministic Rendering (Section 2)');

{
  const config = buildConfig();
  const handler = new UpdateComponentHandler();

  const cmdA = createUpdateComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    semanticId: 'hero.heading',
    sectionId: 'hero',
    value: 'Same',
    commandId: 'cmd-a',
  });
  const cmdB = createUpdateComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    semanticId: 'hero.heading',
    sectionId: 'hero',
    value: 'Same',
    commandId: 'cmd-b',
  });

  const patchA = handler.toPatch(cmdA, config);
  const patchB = handler.toPatch(cmdB, config);

  assert(
    JSON.stringify(patchA.operations) === JSON.stringify(patchB.operations),
    'The same Command + ThemeConfig always produces the same patch operations',
  );
}

// ---------------------------------------------------------------------------
// E. Runtime Purity (Section 5)
// ---------------------------------------------------------------------------

section('E - Runtime Purity (Section 5)');

{
  const config = buildConfig();
  const handler = new InsertComponentHandler();

  const command = createInsertComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    componentType: 'cta',
    targetSemanticId: 'footer',
    sectionId: 'footer',
  });
  const patch = handler.toPatch(command, config);

  // The handler produces ONLY a patch. It never renders, prices, books,
  // authenticates, or evaluates permissions.
  assert(
    patch.operations.every((op) => op.op === 'add'),
    'InsertComponentHandler produces ONLY patch operations (no side effects)',
  );
  assert(
    !('renderNode' in patch) && !('price' in patch) && !('permission' in patch),
    'The patch carries NO rendering / pricing / permission data',
  );
}

// ---------------------------------------------------------------------------
// F. Component Deletion (Phase 17.7 / Amendment G)
// ---------------------------------------------------------------------------

section('F - Component Deletion (Phase 17.7 / Amendment G)');

{
  const config = buildConfig();
  const original = JSON.stringify(config);

  // The Command binds to the Semantic Component Identity "hero" (the section to
  // delete). It NEVER uses nodeId, DOM id, React key, RenderNode id, tree index,
  // or runtime UUID.
  const command = createDeleteComponentCommand({
    projectId: 'p1',
    actorId: 'u1',
    semanticId: 'hero',
    sectionId: 'hero',
  });
  const handler = new DeleteComponentHandler();
  const patch = handler.toPatch(command, config);

  // The handler MUST NOT mutate the config.
  assert(
    JSON.stringify(config) === original,
    'DeleteComponentHandler does NOT mutate the ThemeConfig',
  );

  // The patch removes the section from resources AND its id from the page order.
  assert(
    patch.operations.length === 2,
    'DeleteComponentHandler produces a 2-operation patch (remove section + remove from page order)',
  );
  assert(
    patch.operations[0].op === 'remove' &&
      patch.operations[0].path === 'resources.sections[0]',
    'First operation removes the hero section from resources',
  );
  assert(
    patch.operations[1].op === 'remove' &&
      patch.operations[1].path === 'resources.pages[0].sectionIds[0]',
    'Second operation removes the hero id from the home page section order',
  );

  // The patch path is derived from the Semantic Component Identity. It NEVER
  // uses nodeId / RenderNode id / React key.
  assert(
    !patch.operations[0].path.includes('nodeId') &&
      !patch.operations[0].path.includes('renderNodeId') &&
      !patch.operations[0].path.includes('key'),
    'Delete patch path NEVER uses nodeId / RenderNode id / React key',
  );

  // Applying the patch produces a NEW config with the hero section removed.
  const pipeline = new ThemePatchPipeline();
  const next = pipeline.apply(config, patch);
  assert(
    next !== config,
    'Applying the delete patch produces a NEW ThemeConfig (never mutates in place)',
  );
  assert(
    next.resources.sections.length === 1 &&
      next.resources.sections[0].id === 'footer',
    'The new config no longer contains the deleted hero section',
  );
  assert(
    next.resources.pages[0].sectionIds.length === 1 &&
      next.resources.pages[0].sectionIds[0] === 'footer',
    'The new config removes the hero id from the page section order',
  );
  assert(
    config.resources.sections.length === 2,
    'The original config is unchanged (hero still present)',
  );

  // HISTORY COMPATIBILITY (ADR-011B): The produced `remove` operations are
  // invertible by the existing InversePatchGenerator (remove -> add), so a
  // Delete is fully undoable with NO new history infrastructure.
  assert(
    patch.operations.every((op) => op.op === 'remove'),
    'Delete produces ONLY remove operations (invertible by InversePatchGenerator)',
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`);
console.log(`Command Handlers Constitution Test: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) {
  process.exit(1);
}
