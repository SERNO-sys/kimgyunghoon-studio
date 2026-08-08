/**
 * AWIE V2 - Phase H.2: Version History Constitutional Test.
 *
 * Verifies the frozen Version History constitution (Section 1: Core
 * Constitution; Section 5: Runtime Rules; Section 9: Editor Constitution) for
 * the server-side VersionHistoryService and its wiring to the shared
 * ProjectRepository + GoldenPathOrchestrator.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DUMB CLIENT (Section 9)
 *      The client NEVER receives or holds the ThemeConfig. The Version History
 *      Service returns ONLY snapshot METADATA (VersionHistoryEntry) and, for the
 *      detail view, a framework-agnostic RenderNode preview. The ThemeConfig is
 *      deliberately excluded from every wire contract.
 *
 *   B. SERVER IS THE SOLE ORCHESTRATOR (Section 9)
 *      The VersionHistoryService is the ONLY place where the ProjectRepository
 *      port and the GoldenPathOrchestrator (Runtime Layer) are composed. The
 *      client NEVER imports the repository or the runtime.
 *
 *   C. IMMUTABLE SNAPSHOTS (Section 1)
 *      The Version History is a READ-ONLY view over the immutable
 *      VersionSnapshots created by Publish. The service NEVER mutates a snapshot
 *      and NEVER moves the Release Pointer. It only reads.
 *
 *   D. RUNTIME PURITY (Section 5)
 *      The VersionHistoryService NEVER decides business meaning. It only wires:
 *      it reads snapshots (Application Layer) and renders them via the
 *      GoldenPathOrchestrator (Runtime Layer). It NEVER prices, books,
 *      authenticates, or evaluates permissions.
 *
 *   E. SHARED REPOSITORY WIRING (Delivery Layer)
 *      The Version History reads from the SAME shared InMemoryProjectRepository
 *      that the Publish Workflow writes to. This is what makes a published
 *      snapshot appear in the Version History.
 *
 *   F. LIVE DESIGNATION VIA RELEASE POINTER
 *      The "Live" flag on a VersionHistoryEntry is derived from the Release
 *      Pointer — the single, mutable "live" designation. The snapshot itself is
 *      never mutated; only the pointer moves.
 *
 * Run: npx tsx scripts/version-history-constitution.test.ts
 */

import {
  InMemoryProjectRepository,
  PublishOrchestrator,
  VersionHistoryService,
} from '../src/lib/editor-integration/server';

import type { GoldenPathOrchestrator } from '../src/lib/golden-path';
import type { RenderNode } from '../src/lib/renderer-foundation';
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

/** A stub RenderNode (framework-agnostic) returned by the mock Golden Path. */
const stubRenderNode: RenderNode = {
  type: 'fragment',
  children: [],
};

/**
 * A mock GoldenPathOrchestrator.
 *
 * It records the config it was asked to render and returns a stub RenderNode.
 * This lets the test assert that the VersionHistoryService renders the SNAPSHOT
 * config (not the Draft) and that the client receives ONLY the RenderNode.
 */
function createMockGoldenPath(): {
  orchestrator: GoldenPathOrchestrator;
  renderedConfigs: ThemeConfig[];
} {
  const renderedConfigs: ThemeConfig[] = [];
  const orchestrator: GoldenPathOrchestrator = {
    renderPage: (config: ThemeConfig) => {
      renderedConfigs.push(config);
      return {
        renderNode: stubRenderNode,
        reactElement: null,
        configId: config.metadata.title,
      };
    },
  };
  return { orchestrator, renderedConfigs };
}

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // A. Dumb Client (Section 9)
  // -------------------------------------------------------------------------

  section('A - Dumb Client (Section 9)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const { orchestrator } = createMockGoldenPath();
    const service = new VersionHistoryService(repository, orchestrator, () => false);

    await publish.publish('p1', 'u1', '1.0.0');
    const result = await service.listVersions('p1');

    assert(
      result.success === true,
      'listVersions returns a success result',
    );
    assert(
      result.versions.length === 1,
      'The Version History lists the published snapshot',
    );
    assert(
      !('config' in result.versions[0]) &&
        !('themeConfig' in result.versions[0]),
      'The VersionHistoryEntry carries NO ThemeConfig (metadata only)',
    );
    assert(
      result.versions[0].snapshotId === (await repository.loadReleasePointer('p1')),
      'The VersionHistoryEntry carries the snapshot id (not the config)',
    );
  }

  // -------------------------------------------------------------------------
  // B. Server Is the Sole Orchestrator (Section 9)
  // -------------------------------------------------------------------------

  section('B - Server Is the Sole Orchestrator (Section 9)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const { orchestrator } = createMockGoldenPath();
    const service = new VersionHistoryService(repository, orchestrator, () => false);

    const published = await publish.publish('p1', 'u1', '1.0.0');
    const detail = await service.viewVersion('p1', published.snapshot.id, 'home');

    // The service composed the Application Layer (repository) and the Runtime
    // Layer (goldenPath) server-side. The client never touches either.
    assert(
      detail.success === true,
      'viewVersion returns a success result',
    );
    assert(
      detail.version.snapshotId === published.snapshot.id,
      'The detail view resolves the requested snapshot',
    );
    assert(
      detail.preview === stubRenderNode,
      'The detail view returns the framework-agnostic RenderNode preview',
    );
  }

  // -------------------------------------------------------------------------
  // C. Immutable Snapshots (Section 1)
  // -------------------------------------------------------------------------

  section('C - Immutable Snapshots (Section 1)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const { orchestrator } = createMockGoldenPath();
    const service = new VersionHistoryService(repository, orchestrator, () => false);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    const v2 = await publish.publish('p1', 'u1', '2.0.0');

    // The Version History is a READ-ONLY view. Listing it must NOT mutate the
    // snapshots or move the Release Pointer.
    const before = await repository.loadReleasePointer('p1');
    await service.listVersions('p1');
    await service.viewVersion('p1', v1.snapshot.id, 'home');
    const after = await repository.loadReleasePointer('p1');

    assert(
      before === v2.snapshot.id && after === v2.snapshot.id,
      'Reading the Version History does NOT move the Release Pointer',
    );

    // Both snapshots remain present and immutable.
    const list = await service.listVersions('p1');
    assert(
      list.versions.length === 2,
      'Both published snapshots remain in the Version History',
    );
    assert(
      list.versions.some((v) => v.snapshotId === v1.snapshot.id) &&
        list.versions.some((v) => v.snapshotId === v2.snapshot.id),
      'The Version History exposes both immutable snapshots',
    );
  }

  // -------------------------------------------------------------------------
  // D. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('D - Runtime Purity (Section 5)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const { orchestrator, renderedConfigs } = createMockGoldenPath();
    const service = new VersionHistoryService(repository, orchestrator, () => false);

    const published = await publish.publish('p1', 'u1', '1.0.0');
    const detail = await service.viewVersion('p1', published.snapshot.id, 'home');

    // The service NEVER decides business meaning. It only wires: it reads the
    // snapshot (Application Layer) and renders it (Runtime Layer).
    assert(
      renderedConfigs.length === 1,
      'The service rendered the snapshot exactly once via the Golden Path',
    );
    assert(
      renderedConfigs[0] === published.snapshot.config,
      'The service rendered the SNAPSHOT config (not the Draft)',
    );
    assert(
      !('price' in detail) &&
        !('permission' in detail) &&
        !('booking' in detail) &&
        !('auth' in detail),
      'The VersionDetailResult carries NO pricing / permission / booking / auth data',
    );
  }

  // -------------------------------------------------------------------------
  // E. Shared Repository Wiring (Delivery Layer)
  // -------------------------------------------------------------------------

  section('E - Shared Repository Wiring (Delivery Layer)');

  {
    // The SAME shared InMemoryProjectRepository is used by BOTH the Publish
    // Workflow (writes) and the Version History (reads). This is what makes a
    // published snapshot appear in the Version History.
    const sharedRepository = new InMemoryProjectRepository();
    const draft = buildConfig();
    const publish = new PublishOrchestrator(sharedRepository, () => draft);
    const { orchestrator } = createMockGoldenPath();
    const service = new VersionHistoryService(sharedRepository, orchestrator, () => false);

    const published = await publish.publish('p1', 'u1', '1.0.0');

    // The Version History reads from the SAME shared repository.
    const list = await service.listVersions('p1');
    assert(
      list.versions.length === 1 &&
        list.versions[0].snapshotId === published.snapshot.id,
      'The Version History reads the published snapshot from the shared repository',
    );
  }

  // -------------------------------------------------------------------------
  // F. Live Designation Via Release Pointer
  // -------------------------------------------------------------------------

  section('F - Live Designation Via Release Pointer');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const { orchestrator } = createMockGoldenPath();
    const service = new VersionHistoryService(repository, orchestrator, () => false);

    // Publish v1.0.0 (becomes Live), then v2.0.0 (becomes Live).
    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    const v2 = await publish.publish('p1', 'u1', '2.0.0');

    const list = await service.listVersions('p1');
    const v1Entry = list.versions.find((v) => v.snapshotId === v1.snapshot.id);
    const v2Entry = list.versions.find((v) => v.snapshotId === v2.snapshot.id);

    assert(
      v2Entry?.isLive === true,
      'The latest snapshot is flagged Live (Release Pointer points at it)',
    );
    assert(
      v1Entry?.isLive === false,
      'The older snapshot is NOT flagged Live',
    );

    // Re-pointing the Release Pointer at v1 makes v1 Live WITHOUT mutating any
    // snapshot. The Version History reflects the pointer, not a mutation.
    await repository.release('p1', v1.snapshot.id);
    const after = await service.listVersions('p1');
    const v1After = after.versions.find((v) => v.snapshotId === v1.snapshot.id);
    const v2After = after.versions.find((v) => v.snapshotId === v2.snapshot.id);

    assert(
      v1After?.isLive === true && v2After?.isLive === false,
      'Re-pointing the Release Pointer changes the Live flag without mutating snapshots',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Version History Constitution Test: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
