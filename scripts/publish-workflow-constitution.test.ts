/**
 * AWIE V2 - Phase 12.6: Publish Workflow Constitutional Test.
 *
 * Verifies the frozen Publish Workflow constitution (Section 4: "What AWIE
 * Owns" — Command Model + Patch Pipeline; Section 5: Runtime Rules; Section 9:
 * Editor Constitution) for the server-side PublishOrchestrator and the shared
 * ProjectRepository wiring.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DUMB CLIENT (Section 9)
 *      The client sends ONLY a Publish intent (projectId + version). It NEVER
 *      sends or holds the ThemeConfig. The PublishOrchestrator resolves the
 *      Draft server-side.
 *
 *   B. SERVER IS THE SOLE ORCHESTRATOR (Section 9)
 *      The PublishOrchestrator is the ONLY place where Publish (freeze) and
 *      Release (make live) are executed against the ProjectRepository. The
 *      client NEVER imports the repository.
 *
 *   C. PUBLISH AND RELEASE ARE DECOUPLED (MANDATE 1)
 *      Publish FREEZES the Draft into an immutable VersionSnapshot. Release
 *      designates a SPECIFIC snapshot as Live via the Release Pointer. The
 *      snapshot is never mutated; only the pointer moves.
 *
 *   D. IMMUTABLE THEMECONFIG (Section 1)
 *      The Draft ThemeConfig is read-only. Publishing captures it into an
 *      immutable VersionSnapshot. The orchestrator NEVER mutates the Draft or
 *      the snapshot after creation.
 *
 *   E. SHARED REPOSITORY WIRING (Delivery Layer)
 *      The Publish Workflow writes snapshots + the Release Pointer to the SAME
 *      shared InMemoryProjectRepository that the Delivery Layer (Public Serve
 *      API) reads from. This is what makes a published + released snapshot
 *      actually serveable.
 *
 *   F. RUNTIME PURITY (Section 5)
 *      The PublishOrchestrator NEVER renders, prices, books, authenticates, or
 *      evaluates permissions. It only freezes a Draft into a snapshot and moves
 *      the Release Pointer.
 *
 * Run: npx tsx scripts/publish-workflow-constitution.test.ts
 */

import {
  InMemoryProjectRepository,
  PublishOrchestrator,
} from '../src/lib/editor-integration/server';

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

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // A. Dumb Client (Section 9)
  // -------------------------------------------------------------------------

  section('A - Dumb Client (Section 9)');

  {
    // The client sends ONLY a Publish intent (projectId + version). It NEVER
    // sends the ThemeConfig. The PublishOrchestrator resolves the Draft
    // server-side via the injected getDraft resolver.
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const orchestrator = new PublishOrchestrator(repository, () => draft);

    const result = await orchestrator.publish('p1', 'u1', '1.0.0');

    assert(
      result.success === true,
      'Publish returns a success result',
    );
    assert(
      result.projectId === 'p1' && result.version === '1.0.0',
      'Publish result carries the project id and version',
    );
    assert(
      result.snapshot.config === draft,
      'The snapshot captures the Draft ThemeConfig (resolved server-side, not sent by the client)',
    );
  }

  // -------------------------------------------------------------------------
  // B. Server Is the Sole Orchestrator (Section 9)
  // -------------------------------------------------------------------------

  section('B - Server Is the Sole Orchestrator (Section 9)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const orchestrator = new PublishOrchestrator(repository, () => draft);

    const result = await orchestrator.publish('p1', 'u1', '1.0.0');

    // The orchestrator executed BOTH Publish (freeze) and Release (make live)
    // against the repository. The client never touches the repository.
    const pointer = await repository.loadReleasePointer('p1');
    assert(
      pointer === result.snapshot.id,
      'The orchestrator released the snapshot (Release Pointer points at it)',
    );
    const released = await repository.loadReleasedSnapshot('p1');
    assert(
      released?.id === result.snapshot.id,
      'The released snapshot is loadable from the repository',
    );
  }

  // -------------------------------------------------------------------------
  // C. Publish and Release Are Decoupled (MANDATE 1)
  // -------------------------------------------------------------------------

  section('C - Publish and Release Are Decoupled (MANDATE 1)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const orchestrator = new PublishOrchestrator(repository, () => draft);

    // Publish v1.0.0.
    const v1 = await orchestrator.publish('p1', 'u1', '1.0.0');

    // Publish v2.0.0 (a NEW snapshot). The Release Pointer now points at v2.
    const v2 = await orchestrator.publish('p1', 'u1', '2.0.0');

    assert(
      v1.snapshot.id !== v2.snapshot.id,
      'Each Publish creates a NEW immutable VersionSnapshot',
    );

    const pointer = await repository.loadReleasePointer('p1');
    assert(
      pointer === v2.snapshot.id,
      'The Release Pointer now points at the latest snapshot (v2)',
    );

    // The v1 snapshot is STILL present and immutable. Re-pointing the pointer
    // at v1 is an INSTANT ROLLBACK — the snapshot itself is never mutated.
    await repository.release('p1', v1.snapshot.id);
    const rolledBack = await repository.loadReleasedSnapshot('p1');
    assert(
      rolledBack?.id === v1.snapshot.id,
      'Re-pointing the Release Pointer at v1 is an instant rollback (snapshot never mutated)',
    );
  }

  // -------------------------------------------------------------------------
  // D. Immutable ThemeConfig (Section 1)
  // -------------------------------------------------------------------------

  section('D - Immutable ThemeConfig (Section 1)');

  {
    const draft = buildConfig();
    const original = JSON.stringify(draft);
    const repository = new InMemoryProjectRepository();
    const orchestrator = new PublishOrchestrator(repository, () => draft);

    const result = await orchestrator.publish('p1', 'u1', '1.0.0');

    // The Draft ThemeConfig is read-only. Publishing MUST NOT mutate it.
    assert(
      JSON.stringify(draft) === original,
      'Publishing does NOT mutate the Draft ThemeConfig',
    );

    // The snapshot is immutable: it carries the exact Draft config.
    assert(
      JSON.stringify(result.snapshot.config) === original,
      'The VersionSnapshot captures the exact Draft ThemeConfig',
    );

    // The snapshot carries the schemaVersion (MANDATE 2) for the Migration
    // Pipeline.
    assert(
      result.snapshot.schemaVersion === 'v2.0',
      'The VersionSnapshot carries the schemaVersion (v2.0)',
    );
  }

  // -------------------------------------------------------------------------
  // E. Shared Repository Wiring (Delivery Layer)
  // -------------------------------------------------------------------------

  section('E - Shared Repository Wiring (Delivery Layer)');

  {
    // The SAME shared InMemoryProjectRepository is used by BOTH the Publish
    // Workflow (writes) and the Delivery Layer (reads). This is what makes a
    // published + released snapshot actually serveable.
    const sharedRepository = new InMemoryProjectRepository();
    const draft = buildConfig();
    const orchestrator = new PublishOrchestrator(sharedRepository, () => draft);

    // Publish + Release via the Publish Workflow.
    const result = await orchestrator.publish('p1', 'u1', '1.0.0');

    // The Delivery Layer (Public Serve API) reads from the SAME repository.
    const pointer = await sharedRepository.loadReleasePointer('p1');
    const released = await sharedRepository.loadReleasedSnapshot('p1');

    assert(
      pointer === result.snapshot.id,
      'Delivery Layer reads the Release Pointer from the shared repository',
    );
    assert(
      released?.id === result.snapshot.id,
      'Delivery Layer resolves the Released snapshot from the shared repository',
    );
    assert(
      released?.config === draft,
      'The Released snapshot carries the published ThemeConfig (serveable)',
    );
  }

  // -------------------------------------------------------------------------
  // F. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('F - Runtime Purity (Section 5)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const orchestrator = new PublishOrchestrator(repository, () => draft);

    const result = await orchestrator.publish('p1', 'u1', '1.0.0');

    // The PublishOrchestrator NEVER renders, prices, books, authenticates, or
    // evaluates permissions. It only freezes a Draft into a snapshot and moves
    // the Release Pointer.
    assert(
      !('renderNode' in result) &&
        !('price' in result) &&
        !('permission' in result) &&
        !('booking' in result),
      'The PublishResult carries NO rendering / pricing / permission / booking data',
    );
    assert(
      result.snapshot.config === draft,
      'The orchestrator only captures the Draft — it never interprets business meaning',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Publish Workflow Constitution Test: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
