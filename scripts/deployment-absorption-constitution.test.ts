/**
 * AWIE V2 - Milestone J: Total Legacy Absorption Constitutional Test.
 *
 * Verifies the frozen "Delivery Layer owns deployment" constitution (Milestone J
 * priority #1): ALL legacy deployment bookkeeping (`isPublished`, `deployVersion`,
 * tenant subdomain, deployment snapshots) is absorbed ENTIRELY into the Delivery
 * Layer's DeploymentService. Route handlers are THIN WRAPPERS that delegate here
 * and NEVER re-implement deployment logic.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DELIVERY LAYER OWNS DEPLOYMENT (MANDATE 1)
 *      The DeploymentService is exported from the Delivery Layer barrel and is
 *      the SINGLE owner of deployment bookkeeping. It owns snapshot creation,
 *      history listing, rollback, the `isPublished` flag flip, the
 *      `deployVersion` pointer, and tenant subdomain derivation.
 *
 *   B. THIN WRAPPER ROUTES (Section 3)
 *      The admin publish and admin deployment routes MUST NOT import from the
 *      legacy `@/lib/deployment` module. They delegate to the DeploymentService.
 *      This is verified structurally by scanning the route source.
 *
 *   C. RUNTIME PURITY (Section 5)
 *      The DeploymentService NEVER composes, renders, prices, books,
 *      authenticates, or evaluates permissions. It only persists deployment
 *      metadata. It NEVER touches ThemeConfig.
 *
 *   D. BEHAVIORAL CORRECTNESS
 *      recordDeployment creates a deployment snapshot, flips `isPublished` to
 *      true, records `deployVersion`, and derives the tenant subdomain.
 *      getDeploymentHistoryForSite lists snapshots. rollbackToDeployment
 *      restores a snapshot.
 *
 * Run: npx tsx scripts/deployment-absorption-constitution.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DeploymentService } from '../src/lib/editor-integration/server';
import { createInMemoryDb } from '../src/lib/db/memory';
import type { Db, Post, Site, SiteSettings } from '../src/lib/db/types';

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

const SITE_ID = 'f0e36aaa-1111-2222-3333-444444444444';

function seedSite(db: Db): void {
  const site: Site = {
    id: SITE_ID,
    ownerId: 'u1',
    name: 'Test Site',
    description: '',
    language: 'ko',
    timezone: 'Asia/Seoul',
    theme: 'default',
    maintenance: false,
    isPublished: false,
    deployVersion: '',
    revision: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  void db.sites.insert(site);

}

function seedSettings(db: Db): void {
  const settings: SiteSettings = {
    id: SITE_ID,
    siteId: SITE_ID,
    general: '{}',
    contact: '{}',
    analytics: '{}',
    social: '{}',
    pages: '{}',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  void db.settings.insert(settings);
}

function seedPost(db: Db): void {
  const post: Post = {
    id: 'post-1',
    siteId: SITE_ID,
    title: 'Hello',
    slug: 'hello',
    category: '',
    tags: '',
    content: 'Body',
    status: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  void db.posts.insert(post);
}

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // A. Delivery Layer Owns Deployment (MANDATE 1)
  // -------------------------------------------------------------------------

  section('A - Delivery Layer Owns Deployment (MANDATE 1)');

  {
    // The DeploymentService is exported from the Delivery Layer barrel and is
    // the SINGLE owner of deployment bookkeeping.
    assert(
      typeof DeploymentService === 'function',
      'DeploymentService is exported from the Delivery Layer barrel',
    );

    const db = createInMemoryDb();
    const service = new DeploymentService(db);
    assert(
      typeof service.recordDeployment === 'function' &&
        typeof service.getDeploymentHistoryForSite === 'function' &&
        typeof service.rollbackToDeployment === 'function' &&
        typeof service.subdomainFor === 'function',
      'DeploymentService owns snapshot creation, history, rollback, and subdomain derivation',
    );
  }

  // -------------------------------------------------------------------------
  // B. Thin Wrapper Routes (Section 3)
  // -------------------------------------------------------------------------

  section('B - Thin Wrapper Routes (Section 3)');

  {
    const publishRoute = readFileSync(
      join(__dirname, '../src/app/api/admin/publish/route.ts'),
      'utf-8',
    );
    const deploymentRoute = readFileSync(
      join(__dirname, '../src/app/api/admin/deployment/route.ts'),
      'utf-8',
    );

    // The routes MUST NOT import from the legacy deployment module.
    assert(
      !publishRoute.includes("from '@/lib/deployment'") &&
        !publishRoute.includes("from '../lib/deployment'"),
      'admin/publish route does NOT import from the legacy @/lib/deployment module',
    );
    assert(
      !deploymentRoute.includes("from '@/lib/deployment'") &&
        !deploymentRoute.includes("from '../lib/deployment'"),
      'admin/deployment route does NOT import from the legacy @/lib/deployment module',
    );

    // The routes MUST delegate to the DeploymentService.
    assert(
      publishRoute.includes('DeploymentService'),
      'admin/publish route delegates to the DeploymentService',
    );
    assert(
      deploymentRoute.includes('DeploymentService'),
      'admin/deployment route delegates to the DeploymentService',
    );
  }

  // -------------------------------------------------------------------------
  // C. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('C - Runtime Purity (Section 5)');

  {
    const source = readFileSync(
      join(__dirname, '../src/lib/editor-integration/server/deployment-service.ts'),
      'utf-8',
    );

    // Strip comments so the scan inspects ONLY the executable code body, not
    // the JSDoc header (which legitimately describes the purity mandate).
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

    // The DeploymentService NEVER touches ThemeConfig.
    assert(
      !code.includes('ThemeConfig'),
      'DeploymentService NEVER references ThemeConfig (Runtime Purity)',
    );
    // It NEVER composes, renders, prices, books, authenticates, or evaluates
    // permissions. It only persists deployment metadata.
    assert(
      !code.includes('render') &&
        !code.includes('compose') &&
        !code.includes('authenticate') &&
        !code.includes('permission'),
      'DeploymentService contains NO business logic (compose/render/authenticate/permission)',
    );
  }


  // -------------------------------------------------------------------------
  // D. Behavioral Correctness
  // -------------------------------------------------------------------------

  section('D - Behavioral Correctness');

  {
    const db = createInMemoryDb();
    seedSite(db);
    seedSettings(db);
    seedPost(db);

    const service = new DeploymentService(db);

    // 1. recordDeployment creates a snapshot, flips isPublished, records
    //    deployVersion, and derives the tenant subdomain.
    const result = await service.recordDeployment(SITE_ID, 'manual');

    assert(
      result.deployment.version.startsWith('v-'),
      'recordDeployment creates a deployment snapshot with a version',
    );
    assert(
      result.subdomain === 'f0e36aaa',
      'recordDeployment derives the tenant subdomain from the site id',
    );
    assert(
      result.publicUrl === 'https://f0e36aaa.lucidworker.com',
      'recordDeployment derives the public URL for the tenant subdomain',
    );

    const site = await db.sites.findById(SITE_ID);
    assert(
      site?.isPublished === true,
      'recordDeployment flips the isPublished flag to true',
    );
    assert(
      site?.deployVersion === result.deployment.version,
      'recordDeployment records the deployVersion pointer',
    );

    // 2. getDeploymentHistoryForSite lists the snapshots.
    const history = await service.getDeploymentHistoryForSite(SITE_ID);
    assert(
      history.length === 1 && history[0].id === result.deployment.id,
      'getDeploymentHistoryForSite lists the recorded deployment',
    );

    // 3. rollbackToDeployment restores a snapshot.
    const restored = await service.rollbackToDeployment(
      SITE_ID,
      result.deployment.id,
    );
    assert(
      restored?.id === result.deployment.id,
      'rollbackToDeployment restores the target deployment snapshot',
    );

    // 4. rollbackToDeployment returns null for an unknown snapshot.
    const missing = await service.rollbackToDeployment(SITE_ID, 'nope');
    assert(
      missing === null,
      'rollbackToDeployment returns null for an unknown snapshot',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Deployment Absorption Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
