/**
 * AWIE V2 - Phase 12: CMS Core - Test.
 *
 * Validates the Application Layer:
 *   - MANDATE 1: Domain hierarchy (Organization -> Workspace -> Project),
 *     lifecycle state machine, and RBAC permissions.
 *   - MANDATE 2: Command-Based Application Layer (Command, Handler,
 *     EditorService executor).
 *   - MANDATE 3: Immutable ThemePatch pipeline + VersionSnapshot contract.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * Run with: npx tsx scripts/cms-core-test.ts
 */

import {
  can,
  canTransition,
  createUpdateHeadingCommand,
  EditorService,
  ThemePatchPipeline,
  UpdateHeadingHandler,
} from '../src/lib/cms-core';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';

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
// Fixture: a minimal ThemeConfig
// ---------------------------------------------------------------------------

function makeConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Test Studio',
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
          sectionIds: ['hero'],
          isHome: true,
        },
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: { heading: 'Welcome', subheading: 'Hello world' },
        },
      ],
      assets: [],
      settings: {},
      menus: [],
      forms: [],
    },
    policies: {},
  };
}

// ---------------------------------------------------------------------------
// MANDATE 1: Domain
// ---------------------------------------------------------------------------

section('MANDATE 1: Domain - Lifecycle State Machine');
assert(canTransition('draft', 'review') === true, 'draft -> review is valid');
assert(canTransition('review', 'published') === true, 'review -> published is valid');
assert(canTransition('published', 'archived') === true, 'published -> archived is valid');
assert(canTransition('draft', 'published') === false, 'draft -> published is invalid (skip)');
assert(canTransition('published', 'draft') === false, 'published -> draft is invalid (backward)');

section('MANDATE 1: Domain - RBAC Permissions');
assert(can('viewer', 'project:read') === true, 'viewer can read');
assert(can('viewer', 'project:edit') === false, 'viewer cannot edit');
assert(can('editor', 'project:edit') === true, 'editor can edit');
assert(can('editor', 'project:publish') === false, 'editor cannot publish');
assert(can('publisher', 'project:publish') === true, 'publisher can publish');
assert(can('publisher', 'project:delete') === false, 'publisher cannot delete');
assert(can('owner', 'project:delete') === true, 'owner can delete');
assert(can('owner', 'project:manage-members') === true, 'owner can manage members');

// ---------------------------------------------------------------------------
// MANDATE 2 + 3: Command -> Patch -> Apply
// ---------------------------------------------------------------------------

section('MANDATE 2 + 3: Command -> Patch -> Apply (immutability)');

const pipeline = new ThemePatchPipeline();
const handler = new UpdateHeadingHandler();

// EditorService with a role resolver: user "u-editor" is an editor.
const service = new EditorService(
  pipeline,
  (actorId) => (actorId === 'u-editor' ? 'editor' : 'viewer'),
);
service.register(handler);

const original = makeConfig();
const command = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'New Heading',
  createdAt: '2026-01-02T00:00:00.000Z',
});

const result = service.execute(command, original);

assert(result.patch.operations.length === 1, 'patch has exactly one operation');
assert(result.patch.operations[0].op === 'replace', 'patch op is replace');
assert(
  result.patch.operations[0].path === 'resources.sections[0].content.heading',
  'patch path targets section content.heading',
);
assert(
  result.patch.operations[0].value === 'New Heading',
  'patch value is the new heading',
);

// The ORIGINAL config must be unchanged (immutability).
assert(
  (original.resources.sections[0].content.heading as string) === 'Welcome',
  'original config is NOT mutated (heading still "Welcome")',
);

// The NEW config must reflect the change.
const nextConfig = pipeline.apply(original, result.patch);
assert(
  (nextConfig.resources.sections[0].content.heading as string) === 'New Heading',
  'new config reflects the heading change',
);
assert(
  nextConfig.metadata.updatedAt === '2026-01-02T00:00:00.000Z',
  'new config updatedAt is stamped with patch createdAt',
);

// The new config is a distinct object (deep copy).
assert(nextConfig !== original, 'new config is a distinct object');

// ---------------------------------------------------------------------------
// MANDATE 2: RBAC enforcement in EditorService
// ---------------------------------------------------------------------------

section('MANDATE 2: EditorService RBAC enforcement');

const viewerCommand = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-viewer', // viewer role
  sectionId: 'hero',
  heading: 'Blocked',
});

let denied = false;
try {
  service.execute(viewerCommand, original);
} catch {
  denied = true;
}
assert(denied === true, 'viewer is denied from executing an edit command');

// ---------------------------------------------------------------------------
// MANDATE 2: Unknown section guard
// ---------------------------------------------------------------------------

section('MANDATE 2: Unknown section guard');

const badCommand = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'missing-section',
  heading: 'Nope',
});

let notFound = false;
try {
  service.execute(badCommand, original);
} catch {
  notFound = true;
}
assert(notFound === true, 'unknown section throws a deterministic error');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n----------------------------------------`);
console.log(`CMS Core Test: ${passed} passed, ${failed} failed`);
console.log(`----------------------------------------`);

if (failed > 0) {
  process.exit(1);
}
