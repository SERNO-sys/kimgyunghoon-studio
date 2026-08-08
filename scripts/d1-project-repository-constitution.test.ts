/**
 * AWIE V2 - Phase I.5: D1ProjectRepository Constitutional Test.
 *
 * Verifies the Durable Persistence migration (Phase I.5): the frozen
 * ProjectRepository port is implemented on top of Cloudflare D1, and the
 * single source of truth in `state.ts` transitions seamlessly to the D1
 * repository.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. THE PORT IS FROZEN (MANDATE 3)
 *      D1ProjectRepository implements the `ProjectRepository` interface EXACTLY.
 *      It adds NO new methods and changes NO signatures. Every consumer
 *      (PublishOrchestrator, VersionHistoryService, VersionRollbackService, the
 *      Delivery Layer) depends on the interface, so swapping the concrete
 *      adapter requires ZERO changes above this boundary.
 *
 *   B. DURABLE PERSISTENCE (PHASE I.5)
 *      The D1 SQL path durably persists immutable VersionSnapshots and the
 *      mutable Release Pointer. This is verified against a MOCK D1 binding that
 *      records the exact SQL statements issued, proving the adapter writes to
 *      the `version_snapshots` and `release_pointer` tables and reads them back.
 *
 *   C. IMMUTABLE SNAPSHOTS, MUTABLE RELEASE POINTER (MANDATE 2)
 *      Publish INSERTs a snapshot (never updates it). Release UPSERTs the
 *      Release Pointer. Rollback re-points the pointer at a previous snapshot
 *      id — the snapshots themselves are never mutated.
 *
 *   D. IN-MEMORY FALLBACK (DEVELOPMENT PARITY)
 *      When no D1 binding is available (e.g. plain `next dev`), the adapter
 *      transparently delegates to the in-memory repository. The wire contract
 *      is unchanged in every environment.
 *
 *   E. SEAMLESS SWAP (state.ts SSOT)
 *      The single source of truth in `state.ts` is the D1ProjectRepository.
 *      The shared `projectRepository` singleton is typed as the frozen
 *      `ProjectRepository` INTERFACE, so no consumer can depend on a concrete
 *      class — the adapter is replaceable in one week (CTO Rule).
 *
 * Run:
 *   node --import ./scripts/__mocks__/preload-cloudflare-stub.cjs --import tsx \
 *     scripts/d1-project-repository-constitution.test.ts
 *
 * The preload hook redirects the `@cloudflare/next-on-pages` import to a
 * hermetic test stub (see scripts/__mocks__/). This lets the test exercise the
 * REAL `resolveD1()` path — `getRequestContext().env.DB` — without the real
 * package, which only exposes an `import` condition and cannot be resolved by
 * plain `tsx` (CommonJS).
 */

import { D1ProjectRepository } from '../src/lib/editor-integration/server';
import { projectRepository } from '../src/lib/editor-integration/server';
import type { ProjectRepository } from '../src/lib/cms-core';
import type { VersionSnapshot } from '../src/lib/cms-core';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';

// The hermetic request-context stub (redirected by the preload hook). It lets
// the test control what `getRequestContext().env.DB` returns, so the adapter's
// REAL `resolveD1()` path is exercised deterministically.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cloudflareStub = require('@cloudflare/next-on-pages') as {
  __setRequestContext: (ctx: { env: { DB?: unknown } }) => void;
};


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
// Mock D1 binding
// ---------------------------------------------------------------------------

/**
 * A minimal in-memory D1 binding that records the SQL statements issued. It
 * implements just enough of the D1 surface (prepare/bind/run/first/all) for the
 * D1ProjectRepository to execute against it. It is NOT declared as `implements
 * D1Database` because the adapter only depends on `prepare()`; the mock is cast
 * to the D1Database type at the injection point.
 */
class MockD1 {
  /** The recorded SQL statements, in order. */
  readonly statements: string[] = [];
  /** The version_snapshots table: id -> row. */
  readonly snapshots = new Map<string, Record<string, unknown>>();
  /** The release_pointer table: project_id -> snapshot_id. */
  readonly releasePointer = new Map<string, string>();
  /** The project_lifecycle table: project_id -> lifecycle. */
  readonly lifecycles = new Map<string, string>();

  prepare(query: string): MockPreparedStatement {
    this.statements.push(query);
    return new MockPreparedStatement(this, query);
  }
}

class MockPreparedStatement {
  private params: unknown[] = [];

  constructor(
    private readonly db: MockD1,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): this {
    this.params = values;
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const rows = this.runQuery();
    if (rows.length === 0) return null;
    const row = rows[0];
    if (colName) return (row as Record<string, unknown>)[colName] as T;
    return row as T;
  }

  async run<T = unknown>(): Promise<{ success: boolean; meta: unknown }> {
    this.applyMutation();
    return { success: true, meta: {} };
  }

  async all<T = unknown>(): Promise<{ success: boolean; results: T[] }> {
    const rows = this.runQuery();
    return { success: true, results: rows as T[] };
  }

  /** Executes a SELECT and returns the matching rows. */
  private runQuery(): Record<string, unknown>[] {
    const q = this.query;
    if (q.includes('FROM version_snapshots')) {
      const rows = Array.from(this.db.snapshots.values());
      if (q.includes('WHERE id = ? AND project_id = ?')) {
        const [snapshotId, projectId] = this.params;
        return rows.filter(
          (r) => r.id === snapshotId && r.project_id === projectId,
        );
      }
      if (q.includes('WHERE project_id = ?')) {
        const [projectId] = this.params;
        return rows
          .filter((r) => r.project_id === projectId)
          .sort((a, b) =>
            String(b.published_at).localeCompare(String(a.published_at)),
          );
      }
      return rows;
    }
    if (q.includes('FROM release_pointer')) {
      const [projectId] = this.params;
      const snapshotId = this.db.releasePointer.get(projectId as string);
      return snapshotId === undefined
        ? []
        : [{ project_id: projectId, snapshot_id: snapshotId }];
    }
    if (q.includes('FROM project_lifecycle')) {
      const [projectId] = this.params;
      const lifecycle = this.db.lifecycles.get(projectId as string);
      return lifecycle === undefined
        ? []
        : [{ project_id: projectId, lifecycle }];
    }
    return [];
  }

  /** Applies an INSERT / UPDATE / UPSERT mutation. */
  private applyMutation(): void {
    const q = this.query;
    if (q.includes('INSERT INTO version_snapshots')) {
      const [
        id,
        project_id,
        version,
        schema_version,
        config,
        published_by,
        published_at,
        audit_trail_id,
      ] = this.params;
      this.db.snapshots.set(id as string, {
        id,
        project_id,
        version,
        schema_version,
        config,
        published_by,
        published_at,
        audit_trail_id,
      });
      return;
    }
    if (q.includes('INSERT INTO release_pointer')) {
      const [projectId, snapshotId] = this.params;
      this.db.releasePointer.set(projectId as string, snapshotId as string);
      return;
    }
  }
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

/** Builds an immutable VersionSnapshot for a project. */
function buildSnapshot(
  projectId: string,
  version: string,
  config: ThemeConfig,
): VersionSnapshot {
  return {
    id: `snap-${projectId}-${version}`,
    projectId,
    version,
    schemaVersion: 'v2.0',
    config,
    publishedBy: 'u1',
    publishedAt: `2026-01-01T00:00:0${version.replace('.', '')}.000Z`,
    auditTrailId: `audit-${projectId}-${version}`,
  };
}

// ---------------------------------------------------------------------------
// A. The Port is Frozen (MANDATE 3)
// ---------------------------------------------------------------------------

function verifyFrozenPort(): void {
  section('A - The Port is Frozen (MANDATE 3)');

  const repo = new D1ProjectRepository();

  // The adapter implements the frozen ProjectRepository interface. It must
  // expose EXACTLY the port's methods — no more, no less.
  const portMethods = [
    'loadProject',
    'saveProject',
    'publish',
    'release',
    'loadReleasePointer',
    'loadReleasedSnapshot',
    'listSnapshots',
    'loadSnapshot',
    'archive',
    'loadLifecycle',
  ];

  for (const method of portMethods) {
    assert(
      typeof (repo as unknown as Record<string, unknown>)[method] === 'function',
      `D1ProjectRepository implements "${method}"`,
    );
  }

  // No extra PUBLIC methods beyond the port. The adapter may declare private
  // infrastructure helpers (resolveD1, toRow, fromRow) — these are TypeScript
  // `private` implementation details that are NOT part of the public surface
  // and cannot be reached through the frozen `ProjectRepository` interface.
  // The constitutional rule is that the PUBLIC surface matches the port
  // EXACTLY, so we exclude the known private helpers.
  const privateHelpers = ['resolveD1', 'toRow', 'fromRow'];
  const ownMethods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(repo),
  ).filter((m) => m !== 'constructor');
  const extra = ownMethods.filter(
    (m) => !portMethods.includes(m) && !privateHelpers.includes(m),
  );
  assert(
    extra.length === 0,
    `D1ProjectRepository adds NO extra public methods (found: ${extra.join(', ') || 'none'})`,
  );


  // The shared singleton is typed as the INTERFACE, not the concrete class.
  const shared = projectRepository as ProjectRepository;
  assert(
    shared !== undefined,
    'The shared projectRepository singleton exists',
  );
  assert(
    typeof shared.publish === 'function' &&
      typeof shared.release === 'function' &&
      typeof shared.listSnapshots === 'function',
    'The shared singleton exposes the frozen port surface',
  );
}

// ---------------------------------------------------------------------------
// B + C. Durable Persistence via the D1 SQL path
// ---------------------------------------------------------------------------

async function verifyD1Persistence(): Promise<void> {
  section('B/C - Durable Persistence via the D1 SQL path');

  const d1 = new MockD1();
  const repo = new D1ProjectRepository();

  // Inject the mock D1 binding through the REAL `resolveD1()` path: set the
  // request context so `getRequestContext().env.DB` returns the mock. This
  // exercises the adapter's actual D1 resolution, not a shadowed method.
  cloudflareStub.__setRequestContext({ env: { DB: d1 } });


  // Publish v1: INSERTs an immutable snapshot. Does NOT touch the pointer.
  const configV1 = buildConfig();
  const snapV1 = buildSnapshot('site-d1', '1.0.0', configV1);
  await repo.publish('site-d1', snapV1);

  assert(
    d1.statements.some((s) => s.includes('INSERT INTO version_snapshots')),
    'Publish issues an INSERT INTO version_snapshots',
  );
  assert(
    d1.snapshots.has(snapV1.id),
    'Publish durably stores the immutable snapshot',
  );
  assert(
    d1.releasePointer.size === 0,
    'Publish does NOT update the Release Pointer (Publish != Release)',
  );

  // Release v1: UPSERTs the Release Pointer.
  await repo.release('site-d1', snapV1.id);
  assert(
    d1.statements.some((s) => s.includes('INSERT INTO release_pointer')),
    'Release issues an UPSERT into release_pointer',
  );
  assert(
    d1.releasePointer.get('site-d1') === snapV1.id,
    'Release durably stores the Release Pointer',
  );

  // Load the released snapshot: resolves the pointer to the snapshot.
  const released = await repo.loadReleasedSnapshot('site-d1');
  assert(
    released?.id === snapV1.id,
    'loadReleasedSnapshot resolves the pointer to the released snapshot',
  );
  assert(
    JSON.stringify(released?.config) === JSON.stringify(configV1),
    'The released snapshot round-trips the ThemeConfig through D1',
  );

  // Publish v2 + release v2 (rollback scenario).
  const configV2 = buildConfig();
  configV2.resources.sections[0].content.heading = 'Hello v2';
  const snapV2 = buildSnapshot('site-d1', '2.0.0', configV2);
  await repo.publish('site-d1', snapV2);
  await repo.release('site-d1', snapV2.id);

  assert(
    d1.releasePointer.get('site-d1') === snapV2.id,
    'Releasing v2 re-points the Release Pointer at v2',
  );

  // Rollback: re-point the pointer at v1. Snapshots are immutable.
  await repo.release('site-d1', snapV1.id);
  const rolledBack = await repo.loadReleasedSnapshot('site-d1');
  assert(
    rolledBack?.id === snapV1.id,
    'Rollback re-points the pointer at v1 (snapshots immutable)',
  );

  // Both snapshots remain (immutable history).
  const list = await repo.listSnapshots('site-d1');
  assert(
    list.length === 2,
    'listSnapshots returns BOTH immutable snapshots (newest first)',
  );
  assert(
    list[0].id === snapV2.id,
    'listSnapshots orders newest-first',
  );

  // loadSnapshot is project-scoped.
  const foreign = await repo.loadSnapshot('site-other', snapV1.id);
  assert(
    foreign === undefined,
    'loadSnapshot is project-scoped (returns undefined for another project)',
  );
}

// ---------------------------------------------------------------------------
// D. In-Memory Fallback (Development Parity)
// ---------------------------------------------------------------------------

async function verifyInMemoryFallback(): Promise<void> {
  section('D - In-Memory Fallback (Development Parity)');

  // Simulate a request context WITHOUT a D1 binding (e.g. plain `next dev`).
  // resolveD1() returns undefined and the adapter delegates to the in-memory
  // repository. This preserves the exact behavior the integration layer relies
  // on in `next dev`.
  cloudflareStub.__setRequestContext({ env: {} });
  const repo = new D1ProjectRepository();
  const config = buildConfig();
  const snap = buildSnapshot('site-mem', '1.0.0', config);


  await repo.publish('site-mem', snap);
  await repo.release('site-mem', snap.id);

  const released = await repo.loadReleasedSnapshot('site-mem');
  assert(
    released?.id === snap.id,
    'Without a D1 binding, the adapter falls back to the in-memory repository',
  );
  assert(
    JSON.stringify(released?.config) === JSON.stringify(config),
    'The in-memory fallback round-trips the ThemeConfig',
  );

  const list = await repo.listSnapshots('site-mem');
  assert(
    list.length === 1,
    'The in-memory fallback lists snapshots',
  );
}

// ---------------------------------------------------------------------------
// E. Seamless Swap (state.ts SSOT)
// ---------------------------------------------------------------------------

function verifySeamlessSwap(): void {
  section('E - Seamless Swap (state.ts SSOT)');

  // The single source of truth in state.ts is the D1ProjectRepository. The
  // shared singleton is typed as the frozen ProjectRepository INTERFACE, so no
  // consumer can depend on a concrete class — the adapter is replaceable in one
  // week (CTO Rule).
  const shared = projectRepository as ProjectRepository;
  assert(
    shared !== undefined,
    'state.ts exposes the shared projectRepository singleton',
  );

  // The concrete adapter is the D1ProjectRepository (durable persistence).
  assert(
    shared instanceof D1ProjectRepository,
    'The SSOT singleton is backed by the D1ProjectRepository',
  );

  // The server barrel re-exports the D1 adapter for explicit construction.
  assert(
    typeof D1ProjectRepository === 'function',
    'The server barrel exports D1ProjectRepository',
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  verifyFrozenPort();
  await verifyD1Persistence();
  await verifyInMemoryFallback();
  verifySeamlessSwap();

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `D1ProjectRepository Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
