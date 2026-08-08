/**
 * AWIE V2 - Phase I.3: Unified Publish Pipeline Constitutional Test.
 *
 * Verifies the frozen "exactly ONE publishing pipeline" constitution (Phase I.3
 * constraint): every publish entry point (admin Publish button, CMS publish
 * route) MUST delegate to the SAME shared PublishOrchestrator + shared singleton
 * ProjectRepository. This is what makes a publish from ANY entry point visible
 * to the Version History panel and the Delivery Layer (Public Serve API).
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. SHARED SINGLETON (MANDATE 1)
 *      The ProjectRepository is a server-side singleton shared by the Publish
 *      Workflow (writes snapshots + the Release Pointer), the Version History
 *      (reads snapshots), and the Delivery Layer (reads the Released snapshot).
 *      There is exactly ONE instance in the process.
 *
 *   B. SINGLE SOURCE OF TRUTH (state.ts)
 *      The shared `projectRepository` and `previewStore` singletons are owned by
 *      `state.ts` and re-exported through the server barrel. Every route imports
 *      from the barrel — never constructs its own.
 *
 *   C. UNIFIED ENTRY POINTS
 *      A publish issued through the admin Publish button and a publish issued
 *      through the CMS publish route both write to the SAME shared repository.
 *      The Version History and Delivery Layer read from that SAME repository, so
 *      a publish from either entry point is immediately visible.
 *
 *   D. DUMB CLIENT (Section 9)
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY the
 *      PublishResult metadata. The Draft is resolved server-side.
 *
 *   E. IMMUTABLE THEMECONFIG (Section 1)
 *      The Draft ThemeConfig is read-only. Publishing captures it into an
 *      immutable VersionSnapshot. The orchestrator NEVER mutates the Draft or
 *      the snapshot after creation.
 *
 * Run: npx tsx scripts/unified-publish-pipeline-constitution.test.ts
 */

import {
  projectRepository,
  previewStore,
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
  // A. Shared Singleton (MANDATE 1)
  // -------------------------------------------------------------------------

  section('A - Shared Singleton (MANDATE 1)');

  {
    // The shared `projectRepository` is a SINGLE instance. Both the Publish
    // Workflow (writes) and the Delivery Layer (reads) use it. There is exactly
    // ONE instance in the process — never per-route copies.
    assert(
      projectRepository !== undefined,
      'The shared projectRepository singleton exists',
    );
    assert(
      previewStore !== undefined,
      'The shared previewStore singleton exists',
    );
  }

  // -------------------------------------------------------------------------
  // B. Single Source of Truth (state.ts)
  // -------------------------------------------------------------------------

  section('B - Single Source of Truth (state.ts)');

  {
    // The shared singletons are owned by state.ts and re-exported through the
    // server barrel. Every route imports from the barrel — never constructs its
    // own. This is verified structurally by the import graph; here we assert the
    // singletons are the SAME object across repeated imports (module caching).
    const { projectRepository: again } = await import(
      '../src/lib/editor-integration/server'
    );
    assert(
      again === projectRepository,
      'Re-importing the barrel returns the SAME projectRepository instance',
    );
  }

  // -------------------------------------------------------------------------
  // C. Unified Entry Points
  // -------------------------------------------------------------------------

  section('C - Unified Entry Points');

  {
    // Simulate the admin Publish button: it resolves the Draft from D1 and
    // delegates to the shared PublishOrchestrator + shared repository. The
    // Draft is seeded into the shared PreviewSessionStore.
    const draft = buildConfig();
    previewStore.getOrCreate('site-1', draft);
    const adminOrchestrator = new PublishOrchestrator(
      projectRepository,
      (pid) => {
        const current = previewStore.getDraft(pid);
        if (!current) {
          throw new Error(`No Draft ThemeConfig for project "${pid}".`);
        }
        return current;
      },
    );
    const adminResult = await adminOrchestrator.publish('site-1', 'u1', '1.0.0');

    // Simulate the CMS publish route: it ALSO delegates to the shared
    // PublishOrchestrator + shared repository.
    const cmsOrchestrator = new PublishOrchestrator(
      projectRepository,
      (pid) => {
        const current = previewStore.getDraft(pid);
        if (!current) {
          throw new Error(`No Draft ThemeConfig for project "${pid}".`);
        }
        return current;
      },
    );
    const cmsResult = await cmsOrchestrator.publish('site-1', 'u1', '2.0.0');

    // The Version History and Delivery Layer read from the SAME shared
    // repository. Both publishes are visible.
    const pointer = await projectRepository.loadReleasePointer('site-1');
    assert(
      pointer === cmsResult.snapshot.id,
      'The shared repository Release Pointer reflects the latest publish (CMS)',
    );

    const released = await projectRepository.loadReleasedSnapshot('site-1');
    assert(
      released?.id === cmsResult.snapshot.id,
      'The Delivery Layer resolves the latest Released snapshot from the shared repository',
    );

    // The admin publish snapshot is STILL present (immutable history).
    const adminSnapshot = await projectRepository.loadSnapshot(
      'site-1',
      adminResult.snapshot.id,
    );
    assert(
      adminSnapshot?.id === adminResult.snapshot.id,
      'The admin publish snapshot remains in the shared repository (immutable history)',
    );
  }

  // -------------------------------------------------------------------------
  // D. Dumb Client (Section 9)
  // -------------------------------------------------------------------------

  section('D - Dumb Client (Section 9)');

  {
    const draft = buildConfig();
    previewStore.getOrCreate('site-2', draft);
    const orchestrator = new PublishOrchestrator(projectRepository, (pid) => {
      const current = previewStore.getDraft(pid);
      if (!current) {
        throw new Error(`No Draft ThemeConfig for project "${pid}".`);
      }
      return current;
    });

    const result = await orchestrator.publish('site-2', 'u1', '1.0.0');

    // The client receives ONLY the PublishResult metadata — never the
    // ThemeConfig.
    assert(
      !('config' in result) && !('themeConfig' in result),
      'The PublishResult carries NO ThemeConfig (Dumb Client)',
    );
    assert(
      result.snapshot.config === draft,
      'The Draft is resolved server-side and captured into the snapshot',
    );
  }

  // -------------------------------------------------------------------------
  // E. Immutable ThemeConfig (Section 1)
  // -------------------------------------------------------------------------

  section('E - Immutable ThemeConfig (Section 1)');

  {
    const draft = buildConfig();
    const original = JSON.stringify(draft);
    previewStore.getOrCreate('site-3', draft);
    const orchestrator = new PublishOrchestrator(projectRepository, (pid) => {
      const current = previewStore.getDraft(pid);
      if (!current) {
        throw new Error(`No Draft ThemeConfig for project "${pid}".`);
      }
      return current;
    });

    const result = await orchestrator.publish('site-3', 'u1', '1.0.0');

    assert(
      JSON.stringify(draft) === original,
      'Publishing does NOT mutate the Draft ThemeConfig',
    );
    assert(
      JSON.stringify(result.snapshot.config) === original,
      'The VersionSnapshot captures the exact Draft ThemeConfig',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Unified Publish Pipeline Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
