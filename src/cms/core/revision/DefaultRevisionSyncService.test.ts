/**
 * AWIE V2 - Phase 14.6: CMS Infrastructure - The Revision Sync System Tests.
 *
 * Unit tests for the DefaultRevisionSyncService state machine.
 *
 * Verifies:
 *   - Valid state transitions succeed.
 *   - Invalid transitions are rejected (throw InvalidStateTransitionError).
 *   - The publication boundary is respected (draft -> published is invalid).
 *   - The state machine does NOT evaluate business rules (no workflow logic).
 *
 * Run with: npx tsx src/cms/core/revision/DefaultRevisionSyncService.test.ts
 */

import {
  DefaultRevisionSyncService,
  InvalidStateTransitionError,
  type IRevisionRepository,
  type RevisionRecord,
} from './DefaultRevisionSyncService';
import type { RevisionState } from './types';

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
// In-memory repository (test double)
// ---------------------------------------------------------------------------

class InMemoryRevisionRepository implements IRevisionRepository {
  private readonly store = new Map<string, RevisionRecord>();

  seed(record: RevisionRecord): void {
    this.store.set(record.id, record);
  }

  async load(revisionId: string): Promise<RevisionRecord | null> {
    return this.store.get(revisionId) ?? null;
  }

  async save(record: RevisionRecord): Promise<void> {
    this.store.set(record.id, record);
  }

  get(revisionId: string): RevisionRecord | undefined {
    return this.store.get(revisionId);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRecord(
  id: string,
  state: RevisionState,
  sourceRevision = 1,
  resolvedRevision = 1,
): RevisionRecord {
  return { id, state, sourceRevision, resolvedRevision };
}

const CONTEXT = { actor: 'u-cto', at: '2026-01-01T00:00:00.000Z' };

// ---------------------------------------------------------------------------
// Valid transitions
// ---------------------------------------------------------------------------

section('Valid transitions succeed');

async function testValidLifecycle(): Promise<void> {
  const repo = new InMemoryRevisionRepository();
  const service = new DefaultRevisionSyncService(repo);
  const id = 'rev-1';
  repo.seed(makeRecord(id, 'draft'));

  await service.transition(id, 'validated', CONTEXT);
  assert(repo.get(id)?.state === 'validated', 'draft -> validated succeeds');

  await service.transition(id, 'approved', CONTEXT);
  assert(repo.get(id)?.state === 'approved', 'validated -> approved succeeds');

  await service.transition(id, 'published', CONTEXT);
  assert(repo.get(id)?.state === 'published', 'approved -> published succeeds');

  await service.transition(id, 'archived', CONTEXT);
  assert(repo.get(id)?.state === 'archived', 'published -> archived succeeds');
}

// ---------------------------------------------------------------------------
// Invalid transitions
// ---------------------------------------------------------------------------

section('Invalid transitions are rejected');

async function expectInvalid(
  service: DefaultRevisionSyncService,
  id: string,
  from: RevisionState,
  to: RevisionState,
): Promise<boolean> {
  try {
    await service.transition(id, to, CONTEXT);
    return false;
  } catch (error) {
    return error instanceof InvalidStateTransitionError;
  }
}

async function testInvalidTransitions(): Promise<void> {
  const repo = new InMemoryRevisionRepository();
  const service = new DefaultRevisionSyncService(repo);

  // draft -> published (publication boundary violation)
  repo.seed(makeRecord('rev-skip', 'draft'));
  assert(
    await expectInvalid(service, 'rev-skip', 'draft', 'published'),
    'draft -> published is rejected (publication boundary)',
  );

  // draft -> approved (skip validated)
  repo.seed(makeRecord('rev-skip2', 'draft'));
  assert(
    await expectInvalid(service, 'rev-skip2', 'draft', 'approved'),
    'draft -> approved is rejected (skip validated)',
  );

  // validated -> published (skip approved)
  repo.seed(makeRecord('rev-skip3', 'validated'));
  assert(
    await expectInvalid(service, 'rev-skip3', 'validated', 'published'),
    'validated -> published is rejected (skip approved)',
  );

  // published -> draft (backward transition)
  repo.seed(makeRecord('rev-back', 'published'));
  assert(
    await expectInvalid(service, 'rev-back', 'published', 'draft'),
    'published -> draft is rejected (backward)',
  );

  // archived is terminal (no outgoing transitions)
  repo.seed(makeRecord('rev-term', 'archived'));
  assert(
    await expectInvalid(service, 'rev-term', 'archived', 'draft'),
    'archived -> draft is rejected (terminal state)',
  );
  assert(
    await expectInvalid(service, 'rev-term', 'archived', 'published'),
    'archived -> published is rejected (terminal state)',
  );

  // unknown revision
  assert(
    await expectInvalid(service, 'rev-missing', 'draft', 'validated'),
    'transition on unknown revision is rejected',
  );
}

// ---------------------------------------------------------------------------
// Publication boundary
// ---------------------------------------------------------------------------

section('Publication boundary is respected');

async function testPublicationBoundary(): Promise<void> {
  const repo = new InMemoryRevisionRepository();
  const service = new DefaultRevisionSyncService(repo);
  const id = 'rev-pub';
  repo.seed(makeRecord(id, 'draft'));

  // Only the canonical path may reach published.
  await service.transition(id, 'validated', CONTEXT);
  await service.transition(id, 'approved', CONTEXT);
  await service.transition(id, 'published', CONTEXT);
  assert(repo.get(id)?.state === 'published', 'canonical path reaches published');

  // A fresh draft cannot jump straight to published.
  const id2 = 'rev-pub2';
  repo.seed(makeRecord(id2, 'draft'));
  assert(
    await expectInvalid(service, id2, 'draft', 'published'),
    'draft cannot jump straight to published',
  );
}

// ---------------------------------------------------------------------------
// No workflow logic (state machine purity)
// ---------------------------------------------------------------------------

section('No workflow logic (state machine purity)');

async function testNoWorkflowLogic(): Promise<void> {
  const repo = new InMemoryRevisionRepository();
  const service = new DefaultRevisionSyncService(repo);
  const id = 'rev-pure';
  repo.seed(makeRecord(id, 'draft'));

  // The service must NOT evaluate business rules. It only validates the graph.
  // A transition with a "rejected" reason is still a valid graph transition.
  await service.transition(id, 'validated', {
    actor: 'u-reviewer',
    reason: 'rejected', // business rule value — ignored by the state machine
    at: '2026-01-01T00:00:00.000Z',
  });
  assert(
    repo.get(id)?.state === 'validated',
    'business-rule reason does not affect the state machine',
  );
}

// ---------------------------------------------------------------------------
// calculateGap
// ---------------------------------------------------------------------------

section('calculateGap');

async function testCalculateGap(): Promise<void> {
  const repo = new InMemoryRevisionRepository();
  const service = new DefaultRevisionSyncService(repo);

  const gap = await service.calculateGap('rev-gap');
  assert(gap.sourceRevision === 0, 'missing revision gap sourceRevision is 0');
  assert(gap.resolvedRevision === 0, 'missing revision gap resolvedRevision is 0');
  assert(
    Array.isArray(gap.affectedSections) && gap.affectedSections.length === 0,
    'missing revision gap affectedSections is empty',
  );

  repo.seed(makeRecord('rev-gap2', 'draft', 3, 1));
  const gap2 = await service.calculateGap('rev-gap2');
  assert(gap2.sourceRevision === 3, 'gap sourceRevision reflects master revision');
  assert(gap2.resolvedRevision === 1, 'gap resolvedRevision reflects current revision');
  assert(
    Array.isArray(gap2.affectedSections),
    'gap affectedSections is an array (incremental generation support)',
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await testValidLifecycle();
  await testInvalidTransitions();
  await testPublicationBoundary();
  await testNoWorkflowLogic();
  await testCalculateGap();

  console.log(`\n----------------------------------------`);
  console.log(`Revision Sync Test: ${passed} passed, ${failed} failed`);
  console.log(`----------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
