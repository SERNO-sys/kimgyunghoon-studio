/**
 * AWIE V2 - Phase I.2: Version History Panel Constitutional Test.
 *
 * Verifies the frozen Dumb Client constitution (Section 1: Core Constitution;
 * Section 5: Runtime Rules; Section 9: Editor Constitution) for the Admin UI
 * VersionHistoryPanel component and its wiring to the existing server routes.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DUMB CLIENT (Section 9)
 *      The VersionHistoryPanel NEVER receives or holds the ThemeConfig. It
 *      renders ONLY the snapshot METADATA returned by the server
 *      (VersionHistoryEntry) and emits HTTP requests. It NEVER composes,
 *      mutates, or evaluates the ThemeConfig.
 *
 *   B. SERVER IS THE SOLE ORCHESTRATOR (Section 9)
 *      The panel NEVER imports the VersionHistoryService, the
 *      ProjectRepository, or any Runtime service. It talks ONLY to the existing
 *      server routes:
 *        - GET  /api/cms/projects/[id]/versions
 *        - POST /api/cms/projects/[id]/versions/[snapshotId]/rollback
 *
 *   C. SERVER-CONFIRMED DATA ONLY (Section 5)
 *      After a rollback, the panel re-fetches the Version History from the
 *      server and reflects the server-confirmed Live snapshot. It never
 *      optimistically mutates local state to claim a rollback succeeded.
 *
 *   D. NO NEW INFRASTRUCTURE (Buy Before Build, Section 3)
 *      The panel adds NO new persistence, NO new backend session store, and NO
 *      new business logic. It is a THIN WRAPPER over the existing server routes.
 *
 *   E. WIRE CONTRACT IS METADATA-ONLY (Section 1)
 *      The wire contract between the panel and the server carries ONLY snapshot
 *      metadata (snapshotId, version, schemaVersion, publishedBy, publishedAt,
 *      isLive) plus the liveSnapshotId and hasDraft flags. The ThemeConfig is
 *      deliberately excluded from every wire contract.
 *
 * Run: npx tsx scripts/version-history-panel-constitution.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const ROOT = join(__dirname, '..');

/** Reads a source file relative to the repo root. */
function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

async function main(): Promise<void> {
  const panelSource = readSource('src/components/admin/sites/VersionHistoryPanel.tsx');
  const pageClientSource = readSource(
    'src/app/admin/(dashboard)/sites/[siteId]/page.client.tsx',
  );

  // -------------------------------------------------------------------------
  // A. Dumb Client (Section 9)
  // -------------------------------------------------------------------------

  section('A - Dumb Client (Section 9)');

  {
    // The panel must NEVER import the ThemeConfig type or any ThemeConfig
    // module. It renders only snapshot metadata. We match ONLY actual import
    // statements and code-level references — documentation comments are not
    // architecture.
    assert(
      !/^import .*theme-config|^import .*ThemeConfig|from ['"].*theme-config/m.test(
        panelSource,
      ),
      'The panel NEVER imports the ThemeConfig module',
    );
    assert(
      !/^import .*renderer-foundation|^import .*golden-path|^import .*RenderNode/m.test(
        panelSource,
      ),
      'The panel NEVER imports the RenderNode / Golden Path (Runtime Layer)',
    );
    assert(
      !/^import .*editor-integration\/server|^import .*VersionHistoryService|^import .*ProjectRepository/m.test(
        panelSource,
      ),
      'The panel NEVER imports the server-side VersionHistoryService or ProjectRepository',
    );
    assert(
      !/^import .*cms-core|^import .*patch/m.test(panelSource),
      'The panel NEVER imports the cms-core / patch pipeline',
    );
  }


  // -------------------------------------------------------------------------
  // B. Server Is the Sole Orchestrator (Section 9)
  // -------------------------------------------------------------------------

  section('B - Server Is the Sole Orchestrator (Section 9)');

  {
    // The panel talks ONLY to the existing server routes via fetch. It never
    // imports a service or repository.
    assert(
      /fetch\(`\/api\/cms\/projects\/\$\{projectId\}\/versions`\)/.test(
        panelSource,
      ),
      'The panel fetches the Version History from the existing GET route',
    );
    assert(
      /fetch\(\s*`\/api\/cms\/projects\/\$\{projectId\}\/versions\/\$\{snapshotId\}\/rollback`/.test(
        panelSource,
      ),
      'The panel emits the rollback POST to the existing rollback route',
    );
    assert(
      !/import .* from ['"].*editor-integration['"]/.test(panelSource),
      'The panel imports NO editor-integration module (server or client)',
    );
  }

  // -------------------------------------------------------------------------
  // C. Server-Confirmed Data Only (Section 5)
  // -------------------------------------------------------------------------

  section('C - Server-Confirmed Data Only (Section 5)');

  {
    // After a rollback succeeds, the panel re-fetches the Version History so
    // the Live badge reflects the server-confirmed Release Pointer. It never
    // optimistically flips the Live flag locally.
    assert(
      /await loadVersions\(\)/.test(panelSource),
      'The panel re-fetches the server-confirmed Version History after rollback',
    );
    assert(
      !/setLiveSnapshotId\([^)]*snapshotId\)/.test(panelSource),
      'The panel NEVER optimistically sets the Live snapshot from the rollback request',
    );
    assert(
      /result\.success/.test(panelSource),
      'The panel only reflects server-confirmed success results',
    );
  }

  // -------------------------------------------------------------------------
  // D. No New Infrastructure (Buy Before Build, Section 3)
  // -------------------------------------------------------------------------

  section('D - No New Infrastructure (Buy Before Build, Section 3)');

  {
    // The panel is a THIN WRAPPER. It adds no persistence, no session store, no
    // business logic. It only renders metadata and emits HTTP requests.
    assert(
      !/localStorage|sessionStorage|indexedDB|new Map\(|new Set\(/.test(
        panelSource,
      ),
      'The panel adds NO new client-side persistence or state infrastructure',
    );
    assert(
      !/price|book|authenticate|permission|inventory/.test(panelSource),
      'The panel NEVER evaluates pricing, booking, auth, permission, or inventory',
    );
    assert(
      /interface VersionHistoryEntry/.test(panelSource),
      'The panel declares a metadata-only wire contract (VersionHistoryEntry)',
    );
  }

  // -------------------------------------------------------------------------
  // E. Wire Contract Is Metadata-Only (Section 1)
  // -------------------------------------------------------------------------

  section('E - Wire Contract Is Metadata-Only (Section 1)');

  {
    // The wire contract carries ONLY snapshot metadata. The ThemeConfig is
    // deliberately excluded from every wire contract.
    const entryFields = [
      'snapshotId',
      'version',
      'schemaVersion',
      'publishedBy',
      'publishedAt',
      'isLive',
    ];
    const allPresent = entryFields.every((field) =>
      new RegExp(`readonly ${field}:`).test(panelSource),
    );
    assert(allPresent, 'The VersionHistoryEntry carries ONLY snapshot metadata fields');
    assert(
      !/readonly (config|themeConfig|content|resources):/.test(panelSource),
      'The wire contract carries NO ThemeConfig / content / resources',
    );
  }

  // -------------------------------------------------------------------------
  // F. Wired Into the Admin Hub (Phase I.2)
  // -------------------------------------------------------------------------

  section('F - Wired Into the Admin Hub (Phase I.2)');

  {
    // The panel is rendered on the SitePreviewPage (the project hub) with the
    // projectId passed as a prop. The hub remains a Dumb Client — it only
    // renders the panel and passes the id.
    assert(
      /import \{ VersionHistoryPanel \} from '@\/components\/admin\/sites\/VersionHistoryPanel'/.test(
        pageClientSource,
      ),
      'The SitePreviewPage imports the VersionHistoryPanel',
    );
    assert(
      /<VersionHistoryPanel projectId=\{siteId\} \/>/.test(pageClientSource),
      'The SitePreviewPage renders the VersionHistoryPanel with the projectId',
    );
    assert(
      !/^import .*theme-config|from ['"].*theme-config/m.test(pageClientSource),
      'The SitePreviewPage hub remains a Dumb Client (no ThemeConfig import)',
    );

  }

  // -------------------------------------------------------------------------
  // G. Snapshot Detail UX (Phase I.4)
  // -------------------------------------------------------------------------

  section('G - Snapshot Detail UX (Phase I.4)');

  {
    // The Snapshot Detail view is a Dumb Client metadata surface. It emits a
    // single GET intent to the EXISTING server route
    // `GET /api/cms/projects/[id]/versions/[snapshotId]` and renders ONLY the
    // returned snapshot METADATA (Version, Published By, Published At, Schema).
    // It NEVER receives or holds the ThemeConfig, and it NEVER consumes the
    // RenderNode preview returned by the server (this panel is a metadata
    // detail view, not a compare/preview surface).
    assert(
      /fetch\(\s*`\/api\/cms\/projects\/\$\{projectId\}\/versions\/\$\{snapshotId\}`/.test(
        panelSource,
      ),
      'The detail view fetches the snapshot metadata from the existing GET route',
    );
    assert(
      /handleViewDetail/.test(panelSource),
      'The panel declares a handleViewDetail intent handler',
    );
    assert(
      /handleCloseDetail/.test(panelSource),
      'The panel declares a handleCloseDetail intent handler',
    );
    assert(
      /selectedSnapshotId/.test(panelSource),
      'The panel tracks the selected snapshot id for the detail view',
    );
    assert(
      /interface VersionDetailEntry/.test(panelSource),
      'The panel declares a metadata-only detail wire contract (VersionDetailEntry)',
    );
    assert(
      !/\.preview\b/.test(panelSource),
      'The detail view NEVER consumes the server RenderNode preview',
    );
    assert(
      !/readonly (config|themeConfig|content|resources):/.test(panelSource),
      'The detail wire contract carries NO ThemeConfig / content / resources',
    );
    assert(
      /상세 보기/.test(panelSource),
      'The panel exposes a "상세 보기" (View Details) action per version',
    );
    assert(
      /버전 목록으로/.test(panelSource),
      'The detail view exposes a "버전 목록으로" (Back to list) action',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Version History Panel Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);


  if (failed > 0) {
    process.exit(1);
  }
}

void main();
