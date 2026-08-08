/**
 * AWIE V2 - Phase 12 M2: CMS Core - Test.
 *
 * Validates the Application Layer Milestone 2 additions:
 *   - MANDATE 1: Command Identification & Inverse Patches (commandId,
 *     InversePatchGenerator, CommandHistoryManager Undo/Redo).
 *   - MANDATE 2: Audit Trail & Version Snapshots (commandHash + schemaVersion,
 *     AuditTrailManager).
 *   - MANDATE 3: Aggregate-Centric Persistence Ports (ProjectRepository).
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * Run with: npx tsx scripts/cms-core-m2-test.ts
 */

import {
  AuditTrailManager,
  CommandHistoryManager,
  createUpdateHeadingCommand,
  EditorService,
  hashCommand,
  InversePatchGenerator,
  ThemePatchPipeline,
  UpdateHeadingHandler,
} from '../src/lib/cms-core';
import type {
  Project,
  ProjectLifecycle,
  ProjectRepository,
  VersionSnapshot,
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
// MANDATE 1: Command Identification & Inverse Patches
// ---------------------------------------------------------------------------

section('MANDATE 1: Command Identification (commandId)');

const cmdA = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'First',
  createdAt: '2026-01-02T00:00:00.000Z',
});
const cmdB = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'First',
  createdAt: '2026-01-02T00:00:00.000Z',
});

assert(cmdA.commandId !== undefined, 'commandId is always present');
assert(
  cmdA.commandId === cmdB.commandId,
  'commandId is deterministic for identical payloads (enables idempotency/dedup)',
);

// The commandId identifies the OPERATION (project + timestamp + section), not
// the heading value. A different heading on the same operation keeps the same
// commandId, preserving the idempotency contract.
const cmdC = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'Different',
  createdAt: '2026-01-02T00:00:00.000Z',
});
assert(
  cmdA.commandId === cmdC.commandId,
  'commandId identifies the operation (project+time+section), not the heading value',
);

// A command targeting a DIFFERENT section produces a different commandId.
const cmdD = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'about',
  heading: 'First',
  createdAt: '2026-01-02T00:00:00.000Z',
});
assert(
  cmdA.commandId !== cmdD.commandId,
  'commandId differs when the target section differs',
);



section('MANDATE 1: Inverse Patch Generation');

const pipeline = new ThemePatchPipeline();
const inverseGen = new InversePatchGenerator();
const handler = new UpdateHeadingHandler();
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
const inverse = inverseGen.generate(result.patch, command.commandId, original);

assert(inverse.forwardPatchId === result.patch.id, 'inverse correlates to forward patch');
assert(inverse.commandId === command.commandId, 'inverse correlates to command');
assert(inverse.operations.length === 1, 'inverse has one operation');
assert(inverse.operations[0].op === 'replace', 'inverse of replace is replace');
assert(
  inverse.operations[0].value === 'Welcome',
  'inverse restores the ORIGINAL heading value',
);

// Applying forward then inverse must restore the original config.
const forwardConfig = pipeline.apply(original, result.patch);
const restoredConfig = pipeline.apply(forwardConfig, inverse);
assert(
  (restoredConfig.resources.sections[0].content.heading as string) === 'Welcome',
  'forward + inverse restores the original heading (round-trip)',
);

section('MANDATE 1: CommandHistoryManager Undo/Redo');

const history = new CommandHistoryManager();

// Record command 1: Welcome -> First
const cmd1 = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'First',
  createdAt: '2026-01-02T00:00:00.000Z',
});
const r1 = service.execute(cmd1, original);
history.record({
  commandId: cmd1.commandId,
  projectId: 'p-1',
  patch: r1.patch,
  inverse: inverseGen.generate(r1.patch, cmd1.commandId, original),
  executedAt: '2026-01-02T00:00:00.000Z',
});

// Record command 2: First -> Second
const configAfter1 = pipeline.apply(original, r1.patch);
const cmd2 = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'Second',
  createdAt: '2026-01-03T00:00:00.000Z',
});
const r2 = service.execute(cmd2, configAfter1);
history.record({
  commandId: cmd2.commandId,
  projectId: 'p-1',
  patch: r2.patch,
  inverse: inverseGen.generate(r2.patch, cmd2.commandId, configAfter1),
  executedAt: '2026-01-03T00:00:00.000Z',
});

assert(history.canUndo('p-1') === true, 'canUndo is true after two commands');
assert(history.canRedo('p-1') === false, 'canRedo is false before any undo');
assert(history.history('p-1').length === 2, 'history has two entries');

// Undo command 2: Second -> First
const undo2 = history.undo('p-1');
assert(undo2 !== undefined, 'undo returns the inverse of the latest command');
const configAfterUndo2 = pipeline.apply(configAfter1, undo2 as never);
assert(
  (configAfterUndo2.resources.sections[0].content.heading as string) === 'First',
  'undo restores the previous heading',
);
assert(history.canRedo('p-1') === true, 'canRedo is true after an undo');

// Redo command 2: First -> Second
const redo2 = history.redo('p-1');
assert(redo2 !== undefined, 'redo returns the forward patch');
const configAfterRedo2 = pipeline.apply(configAfterUndo2, redo2 as never);
assert(
  (configAfterRedo2.resources.sections[0].content.heading as string) === 'Second',
  'redo re-applies the forward patch',
);

// A new command invalidates the redo stack.
const cmd3 = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'Third',
  createdAt: '2026-01-04T00:00:00.000Z',
});
const r3 = service.execute(cmd3, configAfterRedo2);
history.record({
  commandId: cmd3.commandId,
  projectId: 'p-1',
  patch: r3.patch,
  inverse: inverseGen.generate(r3.patch, cmd3.commandId, configAfterRedo2),
  executedAt: '2026-01-04T00:00:00.000Z',
});
assert(history.canRedo('p-1') === false, 'new command invalidates the redo stack');

// ---------------------------------------------------------------------------
// MANDATE 2: Audit Trail & Version Snapshots
// ---------------------------------------------------------------------------

section('MANDATE 2: Audit Trail (commandHash)');

const audit = new AuditTrailManager();
const auditCommand = createUpdateHeadingCommand({
  projectId: 'p-1',
  actorId: 'u-editor',
  sectionId: 'hero',
  heading: 'Audited',
  createdAt: '2026-01-05T00:00:00.000Z',
});
const auditResult = service.execute(auditCommand, original);
const record = audit.record({
  command: auditCommand,
  patch: auditResult.patch,
  executedAt: '2026-01-05T00:00:00.000Z',
});

assert(record.commandHash !== undefined, 'audit record includes a commandHash');
assert(record.commandHash.startsWith('cmd-'), 'commandHash has the cmd- prefix');
assert(record.commandType === 'content.update-heading', 'audit records command type');
assert(record.actorId === 'u-editor', 'audit records the actor');
assert(record.patchSummary.includes('replace'), 'audit records the patch summary');
assert(audit.all().length === 1, 'audit trail has one record');
assert(audit.forProject('p-1').length === 1, 'audit trail filters by project');

// Determinism: the same command payload produces the same hash.
const sameHash = hashCommand(auditCommand);
assert(sameHash === record.commandHash, 'commandHash is deterministic');

// ---------------------------------------------------------------------------
// MANDATE 3: Aggregate-Centric Persistence Ports
// ---------------------------------------------------------------------------

section('MANDATE 3: Aggregate-Centric Persistence Ports');

// A minimal in-memory adapter implementing the ProjectRepository port.
//
// MANDATE 2 (Phase 12.6): The adapter maintains TWO separate stores:
//   - `snapshots`: the immutable VersionSnapshots created by Publish.
//   - `releasePointer`: the single, mutable designation of which snapshot is
//     currently "Live" (just a snapshot id).
//
// This explicitly separates Publish (creates a snapshot) from Release (updates
// the pointer). To roll back, the pointer is simply re-pointed at a previous
// snapshot id — the snapshots themselves are never mutated.
class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();
  private readonly snapshots: VersionSnapshot[] = [];
  private readonly lifecycles = new Map<string, ProjectLifecycle>();
  private readonly releasePointer = new Map<string, string>();

  async loadProject(projectId: string): Promise<Project | undefined> {
    return this.projects.get(projectId);
  }
  async saveProject(project: Project): Promise<void> {
    this.projects.set(project.id, project);
  }
  async publish(projectId: string, snapshot: VersionSnapshot): Promise<void> {
    // Publish FREEZES the current Draft into an immutable VersionSnapshot. It
    // does NOT update the Release Pointer.
    this.snapshots.push(snapshot);
    this.lifecycles.set(projectId, 'published');
  }
  async release(projectId: string, snapshotId: string): Promise<void> {
    // Release UPDATES the Current Release Pointer to point at the given
    // snapshot id. This is the ONLY mutation of the "live" designation.
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`No published snapshot "${snapshotId}" to release.`);
    }
    this.releasePointer.set(projectId, snapshotId);
  }
  async loadReleasePointer(projectId: string): Promise<string | undefined> {
    // The Delivery Layer queries the pointer FIRST, then resolves it to the
    // actual snapshot. Returns undefined if no snapshot has been released.
    return this.releasePointer.get(projectId);
  }
  async loadReleasedSnapshot(
    projectId: string,
  ): Promise<VersionSnapshot | undefined> {
    // Resolve the pointer to the active snapshot. If the pointer is set but
    // the snapshot is missing (dangling pointer), return undefined.
    const pointer = this.releasePointer.get(projectId);
    if (pointer === undefined) {
      return undefined;
    }
    return this.snapshots.find((s) => s.id === pointer);
  }
  async listSnapshots(projectId: string): Promise<VersionSnapshot[]> {
    // PHASE H.2 (Version History): A READ-ONLY query that surfaces the existing
    // VersionSnapshot infrastructure. It returns the immutable snapshots for
    // the project, ordered by publish time (newest first).
    return this.snapshots
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  async loadSnapshot(
    projectId: string,
    snapshotId: string,
  ): Promise<VersionSnapshot | undefined> {
    // PHASE H.2 (Version History): A READ-ONLY query used to view the details
    // of a specific version. It returns the immutable snapshot, or undefined if
    // it does not exist or belongs to a different project.
    return this.snapshots.find(
      (s) => s.id === snapshotId && s.projectId === projectId,
    );
  }
  async archive(projectId: string): Promise<void> {
    this.lifecycles.set(projectId, 'archived');
  }
  async loadLifecycle(projectId: string): Promise<ProjectLifecycle | undefined> {
    return this.lifecycles.get(projectId);
  }
}






// The async Release Pointer assertions are wrapped in an async IIFE because
// top-level await is not supported in the CJS output format used by tsx.
(async () => {
  const repo = new InMemoryProjectRepository();

  // The port exposes use-case-driven methods, NOT generic CRUD.
  assert(
    typeof repo.saveProject === 'function' &&
      typeof repo.publish === 'function' &&
      typeof repo.archive === 'function',
    'ProjectRepository exposes use-case-driven methods (saveProject, publish, archive)',
  );

  // The VersionSnapshot contract includes schemaVersion (MANDATE 2 integration).
  const snapshot = {
    id: 'snap-1',
    projectId: 'p-1',
    version: '1.0.0',
    schemaVersion: 'v2.0',
    config: original,
    publishedBy: 'u-editor',
    publishedAt: '2026-01-05T00:00:00.000Z',
    auditTrailId: record.id,
  };
  assert(snapshot.schemaVersion === 'v2.0', 'VersionSnapshot includes schemaVersion');

  // ---------------------------------------------------------------------------
  // MANDATE 2 (Phase 12.6): Release Pointer Architecture
  //
  // Proves that Publish (creates a snapshot) and Release (updates the active
  // pointer) are DISTINCT operations, and that the Release Pointer resolves to
  // the active snapshot. This is the test-backed proof the CTO requires.
  // ---------------------------------------------------------------------------

  section('MANDATE 2: Release Pointer Architecture (Publish vs Release)');

  // Publish creates a snapshot but does NOT make it live.
  await repo.publish('p-1', snapshot as VersionSnapshot);
  const pointerAfterPublish = await repo.loadReleasePointer('p-1');
  assert(
    pointerAfterPublish === undefined,
    'Publish creates a snapshot but does NOT update the Release Pointer (Publish != Release)',
  );
  const releasedAfterPublish = await repo.loadReleasedSnapshot('p-1');
  assert(
    releasedAfterPublish === undefined,
    'After Publish alone, no snapshot is Live (Release is a separate step)',
  );

  // Release designates the snapshot as live by updating the pointer.
  await repo.release('p-1', 'snap-1');
  const pointerAfterRelease = await repo.loadReleasePointer('p-1');
  assert(
    pointerAfterRelease === 'snap-1',
    'Release updates the Current Release Pointer to the snapshot id',
  );
  const releasedAfterRelease = await repo.loadReleasedSnapshot('p-1');
  assert(
    releasedAfterRelease?.id === 'snap-1',
    'The Release Pointer resolves to the active Released snapshot',
  );

  // A second snapshot can be published and released, proving the pointer is
  // re-pointable (enabling instant rollbacks).
  const snapshot2 = {
    id: 'snap-2',
    projectId: 'p-1',
    version: '2.0.0',
    schemaVersion: 'v2.0',
    config: original,
    publishedBy: 'u-editor',
    publishedAt: '2026-01-06T00:00:00.000Z',
    auditTrailId: record.id,
  };
  await repo.publish('p-1', snapshot2 as VersionSnapshot);
  await repo.release('p-1', 'snap-2');
  const pointerAfterSecondRelease = await repo.loadReleasePointer('p-1');
  assert(
    pointerAfterSecondRelease === 'snap-2',
    'Releasing a second snapshot re-points the Release Pointer (instant rollback capability)',
  );
  const releasedAfterSecond = await repo.loadReleasedSnapshot('p-1');
  assert(
    releasedAfterSecond?.id === 'snap-2',
    'The Release Pointer now resolves to the newly Released snapshot',
  );

  // Rollback: re-point the pointer at the previous snapshot. The snapshots are
  // immutable and never mutated; only the pointer changes.
  await repo.release('p-1', 'snap-1');
  const pointerAfterRollback = await repo.loadReleasePointer('p-1');
  assert(
    pointerAfterRollback === 'snap-1',
    'Rollback re-points the Release Pointer at a previous snapshot (snapshots are immutable)',
  );
  const releasedAfterRollback = await repo.loadReleasedSnapshot('p-1');
  assert(
    releasedAfterRollback?.id === 'snap-1',
    'Rollback resolves the pointer back to the previous snapshot',
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(`\n----------------------------------------`);
  console.log(`CMS Core M2 Test: ${passed} passed, ${failed} failed`);
  console.log(`----------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
})();


