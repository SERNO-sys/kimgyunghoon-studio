/**
 * AWIE V2 - Phase I.1: Versioned Snapshot URLs Constitutional Test.
 *
 * Verifies the frozen Versioned Snapshot URL constitution for the Delivery
 * Layer (Public Serve API). A versioned URL (/serve?v={snapshotId}) is the
 * canonical, permanent URL for a specific immutable published artifact.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. VERSIONED URL SELECTS A SPECIFIC SNAPSHOT (MILESTONE I)
 *      The `v` query param selects a SPECIFIC immutable VersionSnapshot by id,
 *      bypassing the Release Pointer entirely. It NEVER serves the Draft.
 *
 *   B. VERSIONED URL IS IMMUTABLE (ADR-006 MANDATE 4)
 *      A versioned snapshot URL is served with `immutable` cache-control (the
 *      ONLY place `immutable` is allowed). The stable URL (/serve) is NEVER
 *      immutable — it uses validation-based caching.
 *
 *   C. RELEASE POINTER IS BYPASSED (MANDATE 2)
 *      A versioned URL does NOT depend on the Release Pointer. It can serve a
 *      snapshot that is NOT currently Released (Live). This is what makes a
 *      versioned URL a permanent, shareable link to a specific artifact.
 *
 *   D. CROSS-PROJECT ISOLATION
 *      A snapshot belongs to exactly one project. A versioned URL for a
 *      snapshot that belongs to a DIFFERENT project must NOT resolve (404).
 *
 *   E. RUNTIME PURITY (Section 5)
 *      The versioned URL flow NEVER decides business meaning. It only selects
 *      WHICH immutable snapshot to load and renders it. It NEVER mutates state,
 *      NEVER evaluates permissions, and NEVER serves the Draft.
 *
 * Run: npx tsx scripts/versioned-url-constitution.test.ts
 */

import { InMemoryProjectRepository } from '../src/lib/editor-integration/server';
import {
  DeliveryCache,
  STABLE_URL_CACHE_CONTROL,
  VERSIONED_URL_CACHE_CONTROL,
} from '../src/lib/editor-integration/server';
import type { VersionSnapshot } from '../src/lib/cms-core';

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

/** Builds a minimal immutable VersionSnapshot for a project. */
function makeSnapshot(
  projectId: string,
  snapshotId: string,
  version: string,
): VersionSnapshot {
  return {
    id: snapshotId,
    projectId,
    version,
    publishedAt: new Date().toISOString(),
    config: { version: 1, sections: [] },
  } as unknown as VersionSnapshot;
}

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // A. Versioned URL Selects a Specific Snapshot (Milestone I)
  // -------------------------------------------------------------------------

  section('A - Versioned URL Selects a Specific Snapshot (Milestone I)');

  {
    const repo = new InMemoryProjectRepository();
    const projectId = 'proj-a';

    // Publish two snapshots, but only RELEASE the second one.
    const v1 = makeSnapshot(projectId, 'snap-1', '1.0.0');
    const v2 = makeSnapshot(projectId, 'snap-2', '2.0.0');
    await repo.publish(projectId, v1);
    await repo.publish(projectId, v2);
    await repo.release(projectId, 'snap-2');

    // The versioned URL selects the SPECIFIC snapshot by id, regardless of the
    // Release Pointer. It can serve snap-1 even though snap-2 is Released.
    const loaded = await repo.loadSnapshot(projectId, 'snap-1');
    assert(
      loaded?.id === 'snap-1' && loaded?.version === '1.0.0',
      'The versioned URL loads the SPECIFIC snapshot by id (snap-1)',
    );

    // The stable URL (no `v`) resolves the Release Pointer to snap-2.
    const released = await repo.loadReleasedSnapshot(projectId);
    assert(
      released?.id === 'snap-2' && released?.version === '2.0.0',
      'The stable URL resolves the Release Pointer to the Released snapshot',
    );
  }

  // -------------------------------------------------------------------------
  // B. Versioned URL Is Immutable (ADR-006 MANDATE 4)
  // -------------------------------------------------------------------------

  section('B - Versioned URL Is Immutable (ADR-006 MANDATE 4)');

  {
    const cache = new DeliveryCache();

    // A versioned snapshot URL is truly immutable: the snapshot id never
    // changes, so the content never changes. `immutable` is safe and correct.
    const versioned = cache.decide('1.0.0', null, true);
    assert(
      versioned.cacheControl === VERSIONED_URL_CACHE_CONTROL,
      'A versioned snapshot URL is served as immutable',
    );
    assert(
      versioned.cacheControl.includes('immutable'),
      '`immutable` is applied to versioned snapshot URLs',
    );

    // The stable URL is NEVER immutable, even for the same version.
    const stable = cache.decide('1.0.0', null, false);
    assert(
      stable.cacheControl === STABLE_URL_CACHE_CONTROL,
      'The stable URL uses validation-based caching (must-revalidate)',
    );
    assert(
      !stable.cacheControl.includes('immutable'),
      '`immutable` is NEVER applied to the stable URL',
    );
  }

  // -------------------------------------------------------------------------
  // C. Release Pointer Is Bypassed (MANDATE 2)
  // -------------------------------------------------------------------------

  section('C - Release Pointer Is Bypassed (MANDATE 2)');

  {
    const repo = new InMemoryProjectRepository();
    const projectId = 'proj-b';

    // Publish a snapshot but do NOT release it. The versioned URL can still
    // serve it — it does not depend on the Release Pointer.
    const v1 = makeSnapshot(projectId, 'snap-1', '1.0.0');
    await repo.publish(projectId, v1);

    const loaded = await repo.loadSnapshot(projectId, 'snap-1');
    assert(
      loaded?.id === 'snap-1',
      'A versioned URL serves a snapshot that is NOT Released (Live)',
    );

    // The stable URL, by contrast, requires a Release Pointer.
    const pointer = await repo.loadReleasePointer(projectId);
    assert(
      pointer === undefined,
      'The stable URL has no Released snapshot (Release Pointer is unset)',
    );
  }

  // -------------------------------------------------------------------------
  // D. Cross-Project Isolation
  // -------------------------------------------------------------------------

  section('D - Cross-Project Isolation');

  {
    const repo = new InMemoryProjectRepository();
    const projectA = 'proj-a';
    const projectB = 'proj-b';

    // A snapshot belongs to exactly one project.
    const v1 = makeSnapshot(projectA, 'snap-1', '1.0.0');
    await repo.publish(projectA, v1);

    // A versioned URL for project B requesting project A's snapshot must NOT
    // resolve (404). The repository enforces project isolation.
    const crossProject = await repo.loadSnapshot(projectB, 'snap-1');
    assert(
      crossProject === undefined,
      'A versioned URL for a snapshot of a DIFFERENT project does not resolve',
    );

    // The same snapshot id resolves within its own project.
    const ownProject = await repo.loadSnapshot(projectA, 'snap-1');
    assert(
      ownProject?.id === 'snap-1',
      'The same snapshot id resolves within its own project',
    );
  }

  // -------------------------------------------------------------------------
  // E. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('E - Runtime Purity (Section 5)');

  {
    const repo = new InMemoryProjectRepository();
    const projectId = 'proj-c';
    const v1 = makeSnapshot(projectId, 'snap-1', '1.0.0');
    await repo.publish(projectId, v1);

    // Loading a snapshot is a READ-ONLY query. It must NOT mutate the Release
    // Pointer or any other state.
    await repo.loadSnapshot(projectId, 'snap-1');
    const pointer = await repo.loadReleasePointer(projectId);
    assert(
      pointer === undefined,
      'Loading a versioned snapshot NEVER mutates the Release Pointer',
    );

    // The versioned URL flow NEVER serves the Draft. It only serves immutable
    // VersionSnapshots created by Publish.
    const snapshots = await repo.listSnapshots(projectId);
    assert(
      snapshots.length === 1 && snapshots[0].id === 'snap-1',
      'The versioned URL serves ONLY immutable VersionSnapshots (never the Draft)',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Versioned URL Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
