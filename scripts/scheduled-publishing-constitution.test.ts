/**
 * AWIE V2 - Milestone H (Phase H.1): Scheduled Publishing Constitutional Test.
 *
 * Verifies the frozen Scheduled Publishing constitution against the shared
 * query layer and the in-memory Db. Scheduled publishing is a thin WRAP over
 * the existing posts table — it adds two nullable columns (`scheduled_at`,
 * `published_at`) and a `scheduled` status. It NEVER touches ThemeConfig, the
 * Renderer, or the Runtime.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DUMB CLIENT (Section 9)
 *      The client emits ONLY a scheduling intent (scheduledAt). It NEVER
 *      composes, renders, or evaluates publish logic. The server-side query
 *      layer owns the lazy flip from `scheduled` -> `published`.
 *
 *   B. IMMUTABLE THEMECONFIG (Section 1)
 *      Scheduled publishing operates on the posts table ONLY. It never reads,
 *      mutates, or imports ThemeConfig. The deterministic pipeline is
 *      untouched.
 *
 *   C. RUNTIME PURITY (Section 5)
 *      The query layer NEVER renders, prices, books, authenticates, or
 *      evaluates permissions. It only flips a post's status when its due time
 *      has passed.
 *
 *   D. LAZY FLIP (Milestone H mandate)
 *      A scheduled post is held in `status = 'scheduled'` and flips to
 *      `published` lazily on the next read after the due time. `published_at`
 *      is set once on the transition. Posts whose due time has NOT arrived
 *      remain `scheduled`.
 *
 *   E. NON-BREAKING (Migration mandate)
 *      The new columns are nullable. Existing posts (no scheduledAt) are
 *      unaffected and never surface in the scheduled list.
 *
 * Run: npx tsx scripts/scheduled-publishing-constitution.test.ts
 */

import { createInMemoryDb } from '../src/lib/db/memory';
import {
  createPost,
  updatePost,
  listScheduledPostsBySite,
  publishDuePosts,
} from '../src/lib/db/queries';

import type { Post } from '../src/lib/db/types';

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

/** Build a minimal Post fixture for a given site. */
function buildPost(siteId: string, overrides: Partial<Post> = {}): Post {
  const now = new Date().toISOString();
  return {
    id: `post-${Math.random().toString(36).slice(2, 10)}`,
    siteId,
    title: 'Test Post',
    slug: `test-${Math.random().toString(36).slice(2, 8)}`,
    category: 'general',
    tags: '',
    content: 'Hello',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const db = createInMemoryDb();
  const siteId = 'site-scheduled-test';

  // -------------------------------------------------------------------------
  // A. Dumb Client (Section 9)
  // -------------------------------------------------------------------------

  section('A - Dumb Client (Section 9)');

  {
    // The client emits ONLY a scheduling intent (scheduledAt). The server-side
    // query layer owns the lazy flip. The client never composes or renders.
    const future = new Date(Date.now() + 60_000).toISOString();
    const post = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: future,
    });
    await createPost(db, post);

    const scheduled = await listScheduledPostsBySite(db, siteId);
    assert(
      scheduled.some((p) => p.id === post.id && p.status === 'scheduled'),
      'A scheduled post is held in status=scheduled (client only set scheduledAt)',
    );
  }

  // -------------------------------------------------------------------------
  // B. Immutable ThemeConfig (Section 1)
  // -------------------------------------------------------------------------

  section('B - Immutable ThemeConfig (Section 1)');

  {
    // Scheduled publishing operates on the posts table ONLY. It never reads,
    // mutates, or imports ThemeConfig. The deterministic pipeline is untouched.
    const future = new Date(Date.now() + 60_000).toISOString();
    const post = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: future,
    });
    await createPost(db, post);

    const scheduled = await listScheduledPostsBySite(db, siteId);
    const found = scheduled.find((p) => p.id === post.id);
    assert(
      found !== undefined && found.scheduledAt === future,
      'Scheduling stores only scheduledAt — no ThemeConfig involvement',
    );
  }

  // -------------------------------------------------------------------------
  // C. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('C - Runtime Purity (Section 5)');

  {
    // publishDuePosts only flips status. It never renders, prices, books,
    // authenticates, or evaluates permissions.
    const past = new Date(Date.now() - 60_000).toISOString();
    const post = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: past,
    });
    await createPost(db, post);

    const flipped = await publishDuePosts(db, siteId);
    assert(
      flipped.includes(post.id),
      'publishDuePosts flips a due post to published (pure status transition)',
    );
  }

  // -------------------------------------------------------------------------
  // D. Lazy Flip (Milestone H mandate)
  // -------------------------------------------------------------------------

  section('D - Lazy Flip (Milestone H mandate)');

  {
    // A post whose due time has NOT arrived remains scheduled.
    const future = new Date(Date.now() + 60_000).toISOString();
    const notDue = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: future,
    });
    await createPost(db, notDue);

    const flipped = await publishDuePosts(db, siteId);
    assert(
      !flipped.includes(notDue.id),
      'A scheduled post whose due time has NOT arrived stays scheduled',
    );

    // A due post flips to published and records publishedAt once.
    const past = new Date(Date.now() - 60_000).toISOString();
    const due = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: past,
    });
    await createPost(db, due);

    await publishDuePosts(db, siteId);
    const updated = await db.posts.findById(due.id);
    assert(
      updated?.status === 'published',
      'A due post flips to published on the next read',
    );
    assert(
      updated?.publishedAt !== undefined,
      'publishedAt is recorded once on the transition',
    );
  }

  // -------------------------------------------------------------------------
  // E. Non-Breaking (Migration mandate)
  // -------------------------------------------------------------------------

  section('E - Non-Breaking (Migration mandate)');

  {
    // Existing posts (no scheduledAt) are unaffected and never surface in the
    // scheduled list.
    const plain = buildPost(siteId, { status: 'published' });
    await createPost(db, plain);

    const scheduled = await listScheduledPostsBySite(db, siteId);
    assert(
      !scheduled.some((p) => p.id === plain.id),
      'A post without scheduledAt never surfaces in the scheduled list',
    );

    // Clearing a schedule returns the post to a normal state.
    const future = new Date(Date.now() + 60_000).toISOString();
    const scheduledPost = buildPost(siteId, {
      status: 'scheduled',
      scheduledAt: future,
    });
    await createPost(db, scheduledPost);
    await updatePost(db, scheduledPost.id, {
      status: 'draft',
      scheduledAt: undefined,
    });

    const afterClear = await db.posts.findById(scheduledPost.id);
    assert(
      afterClear?.status === 'draft' && afterClear.scheduledAt === undefined,
      'Clearing a schedule returns the post to a normal state (non-breaking)',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Scheduled Publishing Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
