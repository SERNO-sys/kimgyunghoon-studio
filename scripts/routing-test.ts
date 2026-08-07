/**
 * AWIE V2 - Phase 04 Milestone 1 Routing Smoke Test.
 *
 * Test Case A: Valid custom domain (Published) -> Returns config ID.
 * Test Case B: Valid subdomain (Draft, with valid Preview token) -> Returns
 *              config ID + noindex flag.
 * Test Case C: Expired preview token -> Throws InvalidPreviewTokenError.
 *
 * Run with: npx tsx scripts/routing-test.ts
 */

import {
  InvalidPreviewTokenError,
  PublicationState,
  RoutingPipeline,
  robotsHeaderFor,
  type DomainRepository,
  type PreviewContext,
  type RoutingRequest,
  type TenantRecord,
} from '../src/lib/routing';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(name: string): void {
  console.log(`\n=== ${name} ===`);
}

/** A fixed "now" timestamp for deterministic preview expiry tests. */
const NOW = '2026-08-05T12:00:00.000Z';

/** Builds a mocked in-memory DomainRepository. */
function buildRepository(): DomainRepository {
  const domains = new Map<string, string>([
    ['example.com', 'tenant-acme'],
    ['preview.acme.app', 'tenant-acme'],
  ]);

  const tenants = new Map<string, TenantRecord>([
    [
      'tenant-acme',
      {
        id: 'tenant-acme',
        themeConfigId: 'config-acme-v2',
        publicationState: PublicationState.Published,
        locale: 'ko',
        canonicalHost: 'example.com',
      },
    ],
  ]);

  const previews = new Map<string, PreviewContext>([
    [
      'tenant-acme',
      {
        token: 'preview-token-123',
        issuedAt: '2026-08-05T00:00:00.000Z',
        expiresAt: '2026-08-05T23:59:59.000Z',
        editorId: 'editor-1',
        tenantId: 'tenant-acme',
      },
    ],
  ]);

  return {
    resolve(host) {
      const tenantId = domains.get(host);
      return tenantId ? { host, tenantId } : undefined;
    },
    exists(host) {
      return domains.has(host);
    },
    loadTenant(tenantId) {
      return tenants.get(tenantId);
    },
    loadPreview(tenantId) {
      return previews.get(tenantId);
    },
  };
}

function run(): void {
  const repository = buildRepository();
  const pipeline = new RoutingPipeline({ repository });

  // ---------------------------------------------------------------------------
  section('Test Case A: Valid custom domain (Published)');
  {
    const request: RoutingRequest = {
      host: 'WWW.EXAMPLE.COM:443',
      path: '/',
      now: NOW,
    };
    const result = pipeline.resolve(request);

    check('A1: returns themeConfigId', result.themeConfigId === 'config-acme-v2', result.themeConfigId);
    check('A2: returns tenantId', result.tenantId === 'tenant-acme');
    check('A3: host normalized (www + port stripped)', result.host === 'example.com', result.host);
    check('A4: not a preview', result.isPreview === false);
    check('A5: publication state is published', result.publicationState === 'published');
    check('A6: locale resolved', result.locale === 'ko');
    check('A7: canonical URL built', result.canonicalUrl === 'https://example.com/', result.canonicalUrl);
    check('A8: no robots header for published', robotsHeaderFor(result.isPreview) === undefined);
  }

  // ---------------------------------------------------------------------------
  section('Test Case B: Valid subdomain (Draft, valid preview token)');
  {
    // Flip the tenant to Draft for this scenario.
    const draftRepo = buildRepository();
    const draftTenant = draftRepo.loadTenant('tenant-acme');
    if (draftTenant) {
      draftTenant.publicationState = PublicationState.Draft;
    }
    const draftPipeline = new RoutingPipeline({ repository: draftRepo });

    const request: RoutingRequest = {
      host: 'preview.acme.app',
      path: '/about',
      previewToken: 'preview-token-123',
      now: NOW,
    };
    const result = draftPipeline.resolve(request);

    check('B1: returns themeConfigId', result.themeConfigId === 'config-acme-v2', result.themeConfigId);
    check('B2: returns tenantId', result.tenantId === 'tenant-acme');
    check('B3: is a preview', result.isPreview === true);
    check('B4: publication state is draft', result.publicationState === 'draft');
    check('B5: canonical URL built', result.canonicalUrl === 'https://example.com/about', result.canonicalUrl);
    check('B6: robots header forced to noindex, nofollow', robotsHeaderFor(result.isPreview) === 'noindex, nofollow');
  }

  // ---------------------------------------------------------------------------
  section('Test Case C: Expired preview token');
  {
    const draftRepo = buildRepository();
    const draftTenant = draftRepo.loadTenant('tenant-acme');
    if (draftTenant) {
      draftTenant.publicationState = PublicationState.Draft;
    }
    const draftPipeline = new RoutingPipeline({ repository: draftRepo });

    // "now" is AFTER the token's expiresAt.
    const request: RoutingRequest = {
      host: 'preview.acme.app',
      path: '/',
      previewToken: 'preview-token-123',
      now: '2026-08-06T00:00:00.000Z',
    };

    let threw = false;
    let errorCode = '';
    try {
      draftPipeline.resolve(request);
    } catch (err) {
      threw = true;
      if (err instanceof InvalidPreviewTokenError) {
        errorCode = err.code;
      }
    }

    check('C1: throws InvalidPreviewTokenError', threw === true);
    check('C2: error code is invalid_preview_token', errorCode === 'invalid_preview_token', errorCode);
    check('C3: error maps to HTTP 401', (() => {
      try {
        draftPipeline.resolve(request);
      } catch (err) {
        return err instanceof InvalidPreviewTokenError && err.statusCode === 401;
      }
      return false;
    })());
  }

  // ---------------------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
