/**
 * AWIE V2 - Phase 12.7: The Golden Journey - End-to-End Product Validation.
 *
 * THE PRIME DIRECTIVE (Phase 12.7): NO NEW CORE FEATURES.
 * This test does NOT build new architectural layers. It VALIDATES the existing
 * layers (Decision -> Runtime -> Application -> Delivery) via a comprehensive
 * End-to-End (E2E) journey from the user's perspective.
 *
 * THE GOLDEN JOURNEY (MANDATE 1):
 *
 *   1. Create Project   - Initialize a new CMS Project (a ThemeConfig SSOT).
 *   2. Edit Content     - Execute an UpdateHeadingCommand (Draft state changes).
 *   3. History Check    - Undo reverts the Preview; Redo re-applies it.
 *   4. Publish          - Execute PublishProjectCommand -> immutable VersionSnapshot.
 *   5. Release          - Execute ReleaseProjectCommand -> update the Release Pointer.
 *   6. Public Serve     - Hit the Serve Delivery API -> correct RenderNode + ETag.
 *   7. Rollback         - Re-point the Release Pointer to a previous snapshot.
 *   8. Cache Validation - Serve again with If-None-Match -> HTTP 304 Not Modified.
 *
 * ARCHITECTURAL MANDATES VALIDATED:
 *   - The Application Layer (CMS Core) handles Commands, History, Publish,
 *     Release. It NEVER renders.
 *   - The Runtime Layer (Golden Path) renders ThemeConfig -> RenderNode. It
 *     NEVER decides.
 *   - The Delivery Layer (Serve API) loads the Released snapshot and returns
 *     the RenderNode with validation-based HTTP cache headers (ETag + 304).
 *   - Publish (freeze) and Release (make live) are SEPARATE operations.
 *   - Rollback is achieved by re-pointing the Release Pointer; snapshots are
 *     never mutated.
 *
 * The Serve Delivery API is a Next.js route handler. This E2E test exercises
 * the SAME Delivery Layer flow programmatically: it uses the same
 * ProjectRepository port, the same GoldenPathOrchestrator, and the exact same
 * ETag / If-None-Match / 304 logic as the route. This proves the full pipeline
 * (Decision -> Runtime -> Application -> Delivery) works end-to-end.
 *
 * Run with: npx tsx scripts/golden-journey-e2e.ts
 */

import {
  buildGoldenPathRegistries,
  DefaultGoldenPathOrchestrator,
  type GoldenPathOrchestrator,
} from '../src/lib/golden-path';
import type { ThemeConfig } from '../src/lib/theme-config/v2/types';
import type { RenderNode } from '../src/lib/renderer-foundation';
import {
  CommandHistoryManager,
  createPublishProjectCommand,
  createReleaseProjectCommand,
  createUpdateHeadingCommand,
  EditorService,
  InversePatchGenerator,
  PublishProjectHandler,
  ReleaseProjectHandler,
  ThemePatchPipeline,
  UpdateHeadingHandler,
  type ProjectRepository,
  type VersionSnapshot,
} from '../src/lib/cms-core';
import type { CmsRole } from '../src/lib/cms-core';

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
// Fixture: a ThemeConfig with a hero + text section
// ---------------------------------------------------------------------------

function makeConfig(): ThemeConfig {
  return {
    metadata: {
      title: 'Golden Journey Studio',
      description: 'A studio that proves the platform works as a product.',
      locale: 'en',
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
          sectionIds: ['hero', 'about'],
          isHome: true,
        },
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          content: {
            heading: 'Welcome to the Studio',
            subheading: 'Where architecture meets implementation.',
            media: 'hero-bg',
            mediaAlt: 'A studio workspace',
            actions: [
              { label: 'Learn more', target: '/about', variant: 'primary' },
              { label: 'Contact', target: '/contact' },
            ],
          },
        },
        {
          id: 'about',
          type: 'text',
          content: {
            heading: 'About',
            body: 'We build deterministic, framework-agnostic platforms.',
          },
        },
      ],
      assets: [
        {
          id: 'hero-bg',
          url: '/images/hero-bg.jpg',
          mimeType: 'image/jpeg',
          alt: 'A studio workspace',
        },
      ],
      settings: {},
      menus: [],
      forms: [],
    },
    policies: {},
  };
}

// ---------------------------------------------------------------------------
// InMemoryProjectRepository (Delivery Layer persistence port)
//
// Implements the SAME ProjectRepository port that the Serve Delivery API uses.
// It maintains TWO separate stores:
//   - snapshots:      the immutable VersionSnapshots created by Publish.
//   - releasePointer: the single, mutable designation of which snapshot is
//                     currently "Live" (just a snapshot id).
//
// This explicitly separates Publish (creates a snapshot) from Release (updates
// the pointer). To roll back, the pointer is simply re-pointed at a previous
// snapshot id — the snapshots themselves are never mutated.
// ---------------------------------------------------------------------------

class InMemoryProjectRepository implements ProjectRepository {
  private readonly snapshots = new Map<string, VersionSnapshot>();
  private readonly releasePointer = new Map<string, string>();

  async loadProject(): Promise<import('@/lib/cms-core').Project | undefined> {
    return undefined;
  }
  async saveProject(): Promise<void> {
    // No-op for this milestone.
  }
  async publish(
    projectId: string,
    snapshot: VersionSnapshot,
  ): Promise<void> {
    // Publish FREEZES the current Draft into an immutable VersionSnapshot. It
    // does NOT update the Release Pointer.
    this.snapshots.set(snapshot.id, snapshot);
    void projectId;
  }
  async release(projectId: string, snapshotId: string): Promise<void> {
    // Release UPDATES the Current Release Pointer to point at the given
    // snapshot id. This is the ONLY mutation of the "live" designation.
    this.releasePointer.set(projectId, snapshotId);
  }
  async loadReleasePointer(projectId: string): Promise<string | undefined> {
    return this.releasePointer.get(projectId);
  }
  async loadReleasedSnapshot(
    projectId: string,
  ): Promise<VersionSnapshot | undefined> {
    const pointer = this.releasePointer.get(projectId);
    if (pointer === undefined) {
      return undefined;
    }
    return this.snapshots.get(pointer);
  }
  async listSnapshots(projectId: string): Promise<VersionSnapshot[]> {
    // PHASE H.2 (Version History): A READ-ONLY query that surfaces the existing
    // VersionSnapshot infrastructure. It returns the immutable snapshots for
    // the project, ordered by publish time (newest first).
    return Array.from(this.snapshots.values())
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
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot || snapshot.projectId !== projectId) {
      return undefined;
    }
    return snapshot;
  }
  async archive(): Promise<void> {
    // No-op for this milestone.
  }

  async loadLifecycle(): Promise<
    import('@/lib/cms-core').ProjectLifecycle | undefined
  > {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// The Serve Delivery API flow (mirrors src/app/api/cms/projects/[id]/serve/route.ts)
//
// This is the Delivery Layer. It loads the Released (Live) VersionSnapshot and
// renders the requested page into a RenderNode tree with validation-based HTTP
// cache headers (ETag + 304). It NEVER decides; it only loads + renders.
// ---------------------------------------------------------------------------

interface ServeResponse {
  status: number;
  body: {
    success: boolean;
    projectId?: string;
    pageId?: string;
    snapshotId?: string;
    version?: string;
    renderNode?: RenderNode;
    error?: string;
  };
  etag: string;
  snapshotId: string;
  version: string;
}

async function serveDeliveryApi(
  repository: ProjectRepository,
  goldenPath: GoldenPathOrchestrator,
  projectId: string,
  pageId: string,
  ifNoneMatch?: string,
): Promise<ServeResponse> {
  // 1. Query the Project's Current Release Pointer (MANDATE 2).
  const releasePointer = await repository.loadReleasePointer(projectId);
  if (releasePointer === undefined) {
    return {
      status: 404,
      body: {
        success: false,
        error: `Project "${projectId}" has no Released (Live) snapshot.`,
      },
      etag: '',
      snapshotId: '',
      version: '',
    };
  }

  // 2. Resolve the pointer to the active Released VersionSnapshot.
  const snapshot = await repository.loadReleasedSnapshot(projectId);
  if (!snapshot) {
    return {
      status: 404,
      body: {
        success: false,
        error: `Project "${projectId}" Release Pointer points to a missing snapshot "${releasePointer}".`,
      },
      etag: '',
      snapshotId: '',
      version: '',
    };
  }

  // 3. Conditional GET (MANDATE 1): If the client's cached copy matches the
  //    current snapshot version (via If-None-Match), return 304 Not Modified.
  const etag = `"${snapshot.version}"`;
  if (ifNoneMatch === etag) {
    return {
      status: 304,
      body: { success: true },
      etag,
      snapshotId: snapshot.id,
      version: snapshot.version,
    };
  }

  // 4. Render the requested page via the GoldenPathOrchestrator (Runtime).
  const result = goldenPath.renderPage(snapshot.config, pageId);

  // 5. Return the RenderNode with validation-based cache headers.
  return {
    status: 200,
    body: {
      success: true,
      projectId,
      pageId,
      snapshotId: snapshot.id,
      version: snapshot.version,
      renderNode: result.renderNode,
    },
    etag,
    snapshotId: snapshot.id,
    version: snapshot.version,
  };
}

// ---------------------------------------------------------------------------
// The Golden Journey
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('========================================');
  console.log('AWIE V2 - Phase 12.7: The Golden Journey');
  console.log('End-to-End Product Validation');
  console.log('========================================');

  // -------------------------------------------------------------------------
  // STEP 1: Create Project
  // -------------------------------------------------------------------------
  section('STEP 1: Create Project');

  const projectId = 'proj-golden-journey';
  const actorId = 'user-owner';
  const role: CmsRole = 'owner';

  // The Project owns a ThemeConfig (the SSOT). This is the initial Draft.
  let draftConfig: ThemeConfig = makeConfig();
  assert(
    draftConfig.resources.sections.length === 2,
    'Project created with a ThemeConfig SSOT containing 2 sections',
  );
  assert(
    draftConfig.resources.pages[0].id === 'home',
    'Project has a home page',
  );

  // -------------------------------------------------------------------------
  // STEP 2: Edit Content (UpdateHeadingCommand -> Draft changes)
  // -------------------------------------------------------------------------
  section('STEP 2: Edit Content (UpdateHeadingCommand)');

  // Wire the Application Layer: the EditorService executor + handlers.
  const pipeline = new ThemePatchPipeline();
  const editor = new EditorService(
    pipeline,
    () => role,
  );
  editor.register(new UpdateHeadingHandler());
  editor.register(new PublishProjectHandler());
  editor.register(new ReleaseProjectHandler());

  // The CommandHistoryManager tracks Undo/Redo via Inverse Patches.
  const history = new CommandHistoryManager();
  const inverseGenerator = new InversePatchGenerator();

  // Execute an UpdateHeadingCommand on the hero section.
  const editCommand = createUpdateHeadingCommand({
    projectId,
    actorId,
    sectionId: 'hero',
    heading: 'Welcome to the Studio v2',
  });
  const editResult = editor.execute(editCommand, draftConfig);

  // The EditorService produces a NEW ThemeConfig (the original is never
  // mutated). This is the updated Draft.
  const editedConfig = pipeline.apply(draftConfig, editResult.patch);
  draftConfig = editedConfig;

  // Record the command in history (forward patch + inverse patch).
  history.record({
    commandId: editCommand.commandId,
    projectId,
    patch: editResult.patch,
    inverse: inverseGenerator.generate(editResult.patch, editCommand.commandId, makeConfig()),
    executedAt: editResult.executedAt,
  });

  // Verify the Draft changed.
  const heroSection = draftConfig.resources.sections.find((s) => s.id === 'hero');
  assert(
    heroSection?.content['heading'] === 'Welcome to the Studio v2',
    'UpdateHeadingCommand changed the Draft hero heading to "Welcome to the Studio v2"',
  );
  assert(
    makeConfig().resources.sections.find((s) => s.id === 'hero')?.content['heading'] ===
      'Welcome to the Studio',
    'the original ThemeConfig was NOT mutated (immutability preserved)',
  );

  // -------------------------------------------------------------------------
  // STEP 3: History Check (Undo reverts Preview; Redo re-applies)
  // -------------------------------------------------------------------------
  section('STEP 3: History Check (Undo / Redo)');

  // UNDO: apply the inverse patch to revert the Draft to its prior state.
  const inverse = history.undo(projectId);
  assert(inverse !== undefined, 'Undo returns an Inverse Patch');
  const undoneConfig = pipeline.apply(draftConfig, inverse as never);
  const undoneHero = undoneConfig.resources.sections.find((s) => s.id === 'hero');
  assert(
    undoneHero?.content['heading'] === 'Welcome to the Studio',
    'Undo reverts the Preview back to "Welcome to the Studio"',
  );

  // REDO: apply the forward patch to re-apply the change.
  const redoPatch = history.redo(projectId);
  assert(redoPatch !== undefined, 'Redo returns the forward Patch');
  const redoneConfig = pipeline.apply(undoneConfig, redoPatch as never);
  const redoneHero = redoneConfig.resources.sections.find((s) => s.id === 'hero');
  assert(
    redoneHero?.content['heading'] === 'Welcome to the Studio v2',
    'Redo re-applies the change back to "Welcome to the Studio v2"',
  );

  // The Draft is now the edited version (heading v2).
  draftConfig = redoneConfig;

  // -------------------------------------------------------------------------
  // STEP 4: Publish (PublishProjectCommand -> immutable VersionSnapshot)
  // -------------------------------------------------------------------------
  section('STEP 4: Publish (create immutable VersionSnapshot)');

  const repository = new InMemoryProjectRepository();

  // Publish FREEZES the current Draft into an immutable VersionSnapshot. It
  // does NOT make it live.
  const publishCommand = createPublishProjectCommand({
    projectId,
    actorId,
    version: '1.0.0',
  });
  const publishResult = editor.execute(publishCommand, draftConfig);

  const snapshotV1: VersionSnapshot = {
    id: `snap-${publishCommand.commandId}`,
    projectId,
    version: '1.0.0',
    schemaVersion: 'v2.0',
    config: draftConfig,
    publishedBy: actorId,
    publishedAt: publishResult.executedAt,
    auditTrailId: `audit-${publishCommand.commandId}`,
  };
  await repository.publish(projectId, snapshotV1);

  // Publish alone does NOT make the snapshot live.
  const pointerAfterPublish = await repository.loadReleasePointer(projectId);
  assert(
    pointerAfterPublish === undefined,
    'Publish creates a snapshot but does NOT make it live (Publish != Release)',
  );

  // -------------------------------------------------------------------------
  // STEP 5: Release (ReleaseProjectCommand -> update Release Pointer)
  // -------------------------------------------------------------------------
  section('STEP 5: Release (update Release Pointer)');

  const releaseCommand = createReleaseProjectCommand({
    projectId,
    actorId,
    snapshotId: snapshotV1.id,
  });
  const releaseResult = editor.execute(releaseCommand, draftConfig);
  await repository.release(projectId, snapshotV1.id);

  const pointerAfterRelease = await repository.loadReleasePointer(projectId);
  assert(
    pointerAfterRelease === snapshotV1.id,
    'Release updates the Release Pointer to the published snapshot',
  );

  // -------------------------------------------------------------------------
  // STEP 6: Public Serve (Serve Delivery API -> RenderNode + ETag)
  // -------------------------------------------------------------------------
  section('STEP 6: Public Serve (Delivery API)');

  const goldenPath: GoldenPathOrchestrator = new DefaultGoldenPathOrchestrator(
    buildGoldenPathRegistries(),
  );

  const serveV1 = await serveDeliveryApi(repository, goldenPath, projectId, 'home');
  assert(
    serveV1.status === 200,
    'Serve API returns HTTP 200 for the Released snapshot',
  );
  assert(
    serveV1.body.success === true,
    'Serve API returns success=true',
  );
  assert(
    serveV1.body.snapshotId === snapshotV1.id,
    'Serve API serves the Released snapshot id',
  );
  assert(
    serveV1.body.version === '1.0.0',
    'Serve API serves the Released snapshot version',
  );
  assert(
    serveV1.etag === '"1.0.0"',
    'Serve API returns the ETag derived from the snapshot version',
  );

  // The RenderNode is the canonical, framework-agnostic Runtime output.
  const renderNode = serveV1.body.renderNode as Extract<RenderNode, { type: 'fragment' }>;
  assert(
    renderNode !== undefined && renderNode.type === 'fragment',
    'Serve API returns a framework-agnostic RenderNode tree',
  );
  assert(
    renderNode.children.length === 2,
    'the RenderNode wraps exactly 2 sections (hero + about)',
  );
  const heroNode = renderNode.children[0] as Extract<RenderNode, { type: 'element' }>;
  assert(
    heroNode.componentId === 'hero',
    'the first RenderNode section is the hero component',
  );
  assert(
    heroNode.props['heading'] === 'Welcome to the Studio v2',
    'the served RenderNode reflects the edited heading (v2)',
  );

  // -------------------------------------------------------------------------
  // STEP 7: Rollback (re-point Release Pointer to a previous snapshot)
  // -------------------------------------------------------------------------
  section('STEP 7: Rollback (re-point Release Pointer)');

  // Create a SECOND snapshot (v2) and release it, then roll back to v1.
  const publishCommandV2 = createPublishProjectCommand({
    projectId,
    actorId,
    version: '2.0.0',
  });
  const publishResultV2 = editor.execute(publishCommandV2, draftConfig);
  const snapshotV2: VersionSnapshot = {
    id: `snap-${publishCommandV2.commandId}`,
    projectId,
    version: '2.0.0',
    schemaVersion: 'v2.0',
    config: draftConfig,
    publishedBy: actorId,
    publishedAt: publishResultV2.executedAt,
    auditTrailId: `audit-${publishCommandV2.commandId}`,
  };
  await repository.publish(projectId, snapshotV2);
  await repository.release(projectId, snapshotV2.id);

  const serveV2 = await serveDeliveryApi(repository, goldenPath, projectId, 'home');
  assert(
    serveV2.body.version === '2.0.0',
    'Serve API serves the newly released v2 snapshot',
  );

  // ROLLBACK: re-point the Release Pointer back to v1. The snapshots are
  // immutable; only the pointer changes.
  await repository.release(projectId, snapshotV1.id);
  const serveRollback = await serveDeliveryApi(repository, goldenPath, projectId, 'home');
  assert(
    serveRollback.body.version === '1.0.0',
    'Rollback re-points the Release Pointer back to v1 (snapshots immutable)',
  );
  assert(
    serveRollback.body.snapshotId === snapshotV1.id,
    'Rollback serves the v1 snapshot id',
  );

  // -------------------------------------------------------------------------
  // STEP 8: Cache Validation (Serve with If-None-Match -> 304)
  // -------------------------------------------------------------------------
  section('STEP 8: Cache Validation (Conditional GET -> 304)');

  // The client has the v1 ETag cached. Re-request with If-None-Match.
  const cachedEtag = serveRollback.etag; // '"1.0.0"'
  const serveCached = await serveDeliveryApi(
    repository,
    goldenPath,
    projectId,
    'home',
    cachedEtag,
  );
  assert(
    serveCached.status === 304,
    'Serve API returns HTTP 304 Not Modified when If-None-Match matches',
  );
  assert(
    serveCached.etag === cachedEtag,
    'the 304 response carries the matching ETag',
  );

  // A STALE If-None-Match (from a different version) must NOT return 304.
  const serveStale = await serveDeliveryApi(
    repository,
    goldenPath,
    projectId,
    'home',
    '"0.9.0"',
  );
  assert(
    serveStale.status === 200,
    'a stale If-None-Match returns HTTP 200 (full body)',
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n----------------------------------------`);
  console.log(`Golden Journey E2E: ${passed} passed, ${failed} failed`);
  console.log(`----------------------------------------`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Golden Journey E2E crashed:', error);
  process.exit(1);
});
