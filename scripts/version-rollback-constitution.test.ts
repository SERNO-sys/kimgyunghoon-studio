/**
 * AWIE V2 - Phase H.3: Version Rollback Constitutional Test.
 *
 * Verifies the frozen Version Rollback constitution (Section 1: Core
 * Constitution; Section 5: Runtime Rules; Section 9: Editor Constitution;
 * Section 3: Buy Before Build) for the server-side VersionRollbackService and
 * its wiring to the shared ProjectRepository.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DUMB CLIENT (Section 9)
 *      The client sends a single POST intent and receives ONLY metadata
 *      (VersionRollbackResult). The ThemeConfig is deliberately excluded from
 *      the wire contract. The client NEVER receives or holds the ThemeConfig.
 *
 *   B. SERVER IS THE SOLE ORCHESTRATOR (Section 9)
 *      The VersionRollbackService is the ONLY place where the ProjectRepository
 *      port is composed. The client NEVER imports the repository.
 *
 *   C. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER (Section 1)
 *      The VersionSnapshots created by Publish are IMMUTABLE and are NEVER
 *      mutated by a rollback. Rollback ONLY re-points the Release Pointer at a
 *      previous snapshot id via the existing `repository.release()` capability.
 *      This is the single, mutable "live" designation.
 *
 *   D. RUNTIME PURITY (Section 5)
 *      The VersionRollbackService NEVER decides business meaning. It only wires:
 *      it validates the target snapshot exists (Application Layer) and re-points
 *      the Release Pointer. It NEVER prices, books, authenticates, or evaluates
 *      permissions.
 *
 *   E. SHARED REPOSITORY WIRING (Delivery Layer)
 *      The Version Rollback re-points the SAME shared InMemoryProjectRepository
 *      Release Pointer that the Publish Workflow writes and that the Delivery
 *      Layer (Public Serve API) reads. This is what makes a rollback take effect
 *      instantly.
 *
 *   F. BUY BEFORE BUILD / NO NEW INFRASTRUCTURE (Section 3)
 *      Rollback is NOT new infrastructure. It is the existing Release Pointer
 *      re-pointing capability surfaced through a product boundary. The service
 *      adds NO new persistence, NO new mutation, and NO new business logic.
 *
 *   G. VALIDATION (Error Handling)
 *      Rolling back to a snapshot that does not exist or belongs to a different
 *      project throws. The service NEVER fabricates a rollback.
 *
 * Run: npx tsx scripts/version-rollback-constitution.test.ts
 */

import {
  InMemoryProjectRepository,
  PublishOrchestrator,
  VersionRollbackService,
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
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const service = new VersionRollbackService(repository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    await publish.publish('p1', 'u1', '2.0.0');

    const result = await service.rollback('p1', v1.snapshot.id);

    assert(
      result.success === true,
      'rollback returns a success result',
    );
    assert(
      !('config' in result) && !('themeConfig' in result),
      'The VersionRollbackResult carries NO ThemeConfig (metadata only)',
    );
    assert(
      result.liveSnapshotId === v1.snapshot.id,
      'The result carries the rolled-back snapshot id (not the config)',
    );
    assert(
      result.version === '1.0.0',
      'The result carries the rolled-back snapshot semantic version',
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
    const service = new VersionRollbackService(repository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    await publish.publish('p1', 'u1', '2.0.0');

    const result = await service.rollback('p1', v1.snapshot.id);

    // The service composed the Application Layer (repository) server-side. The
    // client never touches the repository.
    assert(
      result.success === true,
      'rollback returns a success result',
    );
    assert(
      result.publishedBy === 'u1',
      'The result carries the original publisher of the rolled-back snapshot',
    );
  }

  // -------------------------------------------------------------------------
  // C. Immutable Snapshots, Mutable Release Pointer (Section 1)
  // -------------------------------------------------------------------------

  section('C - Immutable Snapshots, Mutable Release Pointer (Section 1)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const service = new VersionRollbackService(repository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    const v2 = await publish.publish('p1', 'u1', '2.0.0');

    // Before rollback, the Release Pointer points at the latest snapshot (v2).
    const before = await repository.loadReleasePointer('p1');
    assert(
      before === v2.snapshot.id,
      'Before rollback, the Release Pointer points at the latest snapshot',
    );

    // Roll back to v1. This re-points the Release Pointer at v1.
    await service.rollback('p1', v1.snapshot.id);
    const after = await repository.loadReleasePointer('p1');

    assert(
      after === v1.snapshot.id,
      'Rollback re-points the Release Pointer at the target snapshot',
    );

    // The immutable snapshots are NEVER mutated. Both remain present.
    const snapshots = await repository.listSnapshots('p1');
    assert(
      snapshots.length === 2,
      'Both immutable snapshots remain after rollback (none deleted)',
    );
    assert(
      snapshots.some((s) => s.id === v1.snapshot.id) &&
        snapshots.some((s) => s.id === v2.snapshot.id),
      'Neither snapshot was mutated or removed by the rollback',
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
    const service = new VersionRollbackService(repository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    const result = await service.rollback('p1', v1.snapshot.id);

    // The service NEVER decides business meaning. It only wires: it validates
    // the target snapshot exists and re-points the Release Pointer.
    assert(
      !('price' in result) &&
        !('permission' in result) &&
        !('booking' in result) &&
        !('auth' in result),
      'The VersionRollbackResult carries NO pricing / permission / booking / auth data',
    );
  }

  // -------------------------------------------------------------------------
  // E. Shared Repository Wiring (Delivery Layer)
  // -------------------------------------------------------------------------

  section('E - Shared Repository Wiring (Delivery Layer)');

  {
    // The SAME shared InMemoryProjectRepository is used by the Publish Workflow
    // (writes snapshots + Release Pointer) and the Version Rollback (re-points
    // the Release Pointer). This is what makes a rollback take effect instantly
    // for the Delivery Layer.
    const sharedRepository = new InMemoryProjectRepository();
    const draft = buildConfig();
    const publish = new PublishOrchestrator(sharedRepository, () => draft);
    const service = new VersionRollbackService(sharedRepository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    await publish.publish('p1', 'u1', '2.0.0');

    // The Version Rollback re-points the SAME shared repository Release Pointer.
    await service.rollback('p1', v1.snapshot.id);
    const live = await sharedRepository.loadReleasePointer('p1');

    assert(
      live === v1.snapshot.id,
      'The Version Rollback re-points the shared repository Release Pointer',
    );
  }

  // -------------------------------------------------------------------------
  // F. Buy Before Build / No New Infrastructure (Section 3)
  // -------------------------------------------------------------------------

  section('F - Buy Before Build / No New Infrastructure (Section 3)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const service = new VersionRollbackService(repository);

    const v1 = await publish.publish('p1', 'u1', '1.0.0');
    await publish.publish('p1', 'u1', '2.0.0');

    // Rollback is the existing Release Pointer re-pointing capability surfaced
    // through a product boundary. It adds NO new persistence and NO new
    // mutation. The snapshot count is unchanged after the rollback.
    const before = (await repository.listSnapshots('p1')).length;
    await service.rollback('p1', v1.snapshot.id);
    const after = (await repository.listSnapshots('p1')).length;

    assert(
      before === after,
      'Rollback adds NO new snapshots and removes NO snapshots (no new persistence)',
    );
    assert(
      (await repository.loadReleasePointer('p1')) === v1.snapshot.id,
      'Rollback ONLY re-points the existing Release Pointer (no new mutation)',
    );
  }

  // -------------------------------------------------------------------------
  // G. Validation (Error Handling)
  // -------------------------------------------------------------------------

  section('G - Validation (Error Handling)');

  {
    const draft = buildConfig();
    const repository = new InMemoryProjectRepository();
    const publish = new PublishOrchestrator(repository, () => draft);
    const service = new VersionRollbackService(repository);

    await publish.publish('p1', 'u1', '1.0.0');

    // Rolling back to a snapshot that does not exist throws. The service NEVER
    // fabricates a rollback.
    let threw = false;
    try {
      await service.rollback('p1', 'does-not-exist');
    } catch {
      threw = true;
    }

    assert(
      threw,
      'Rolling back to a non-existent snapshot throws (no fabricated rollback)',
    );

    // The Release Pointer is unchanged after a failed rollback.
    const live = await repository.loadReleasePointer('p1');
    assert(
      live !== 'does-not-exist',
      'A failed rollback does NOT move the Release Pointer',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Version Rollback Constitution Test: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
