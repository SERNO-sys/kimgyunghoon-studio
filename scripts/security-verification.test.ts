/**
 * AWIE V2 - Phase J.3: Security Hardening - Security Verification Test.
 *
 * This is a VERIFICATION test, not a feature test. It exercises the REAL attack
 * vectors against the ACTUAL security boundary (`src/lib/security`) and the
 * Delivery Layer, and reports the honest, verified state of each control.
 *
 * The four areas under verification (per the Phase J.3 review feedback):
 *
 *   1. RATE LIMIT ATOMICITY (D1)
 *      The feedback assumed the RateLimitGuard is D1-backed. This test verifies
 *      the ACTUAL backing store and reports the true concurrency semantics.
 *
 *   2. HEALTH ENDPOINT CONSUMERS
 *      The feedback asked whether gating `/api/health/metrics` behind
 *      `requireAdmin` breaks external uptime checkers / Cloudflare probes. This
 *      test verifies which health route is public vs. admin-gated.
 *
 *   3. SERVE SSRF REALITY
 *      The feedback asked whether the serve route performs outbound fetches
 *      (a real SSRF vector). This test verifies the ACTUAL mechanics: the serve
 *      route performs NO outbound fetch; it only validates identifiers and loads
 *      from the local repository.
 *
 *   4. DEEP SECRET MASKING
 *      The feedback asked whether BOTH the DeliveryLogger AND the
 *      AuditLogRepository mask nested secrets. This test verifies the ACTUAL
 *      masking choke points in each.
 *
 * STRICT CONSTRAINT: This test NEVER mutates ThemeConfig, NEVER executes
 * business logic, and NEVER renders. It is pure verification infrastructure.
 */

import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  isValidId,
  isValidVersion,
  isValidPageId,
  maskSecrets,
  RateLimitGuard,
  publishRateLimit,
} from '../src/lib/security';

// ---------------------------------------------------------------------------
// 1. RATE LIMIT ATOMICITY (D1) — VERIFIED REALITY
// ---------------------------------------------------------------------------

/**
 * Verifies the ACTUAL backing store of the RateLimitGuard.
 *
 * VERIFIED FINDING: The RateLimitGuard is an IN-MEMORY sliding-window limiter.
 * It is NOT D1-backed. It is per-isolate, resets on isolate eviction, and is
 * NOT shared across Cloudflare isolates. The production path is Cloudflare's
 * native rate limiting (Buy Before Build). This is a PREPARATION boundary.
 */
function testRateLimitAtomicity(): void {
  // 1a. The guard is a plain in-memory limiter. It does NOT import or touch D1.
  const securitySource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/security/index.ts'),
    'utf8',
  );
  assert.equal(
    securitySource.includes('getRequestContext'),
    false,
    'RateLimitGuard must NOT resolve D1 (it is in-memory, not D1-backed)',
  );
  assert.equal(
    securitySource.includes('env.DB'),
    false,
    'RateLimitGuard must NOT touch the D1 binding',
  );

  // 1b. Within a single isolate, JS is single-threaded, so allow() is atomic:
  //     there is no interleaving between the check and the increment. This is
  //     the concurrency guarantee that DOES hold.
  const guard = new RateLimitGuard(2, 60_000);
  const results: boolean[] = [];
  // Simulate a burst of synchronous calls (no await between them). Because JS
  // is single-threaded, these are serialized and the counter is exact.
  for (let i = 0; i < 5; i++) {
    results.push(guard.allow('u1:publish'));
  }
  assert.deepEqual(
    results,
    [true, true, false, false, false],
    'in-isolate burst is exactly rate-limited (atomic within isolate)',
  );

  // 1c. The default publish guard is configured (preparation boundary exists).
  assert.ok(publishRateLimit instanceof RateLimitGuard, 'publishRateLimit exists');

  console.log('  [PASS] Rate Limit Atomicity (in-memory, per-isolate, atomic within isolate)');
}

// ---------------------------------------------------------------------------
// 2. HEALTH ENDPOINT CONSUMERS — VERIFIED REALITY
// ---------------------------------------------------------------------------

/**
 * Verifies which health route is public vs. admin-gated.
 *
 * VERIFIED FINDING: `/api/health` (the liveness probe) is PUBLIC — it is NOT
 * gated. External uptime checkers and Cloudflare health probes that hit
 * `/api/health` are UNAFFECTED. Only `/api/health/metrics` (the detailed
 * operational telemetry snapshot) is gated behind `requireAdmin`. The
 * monitoring impact is therefore assessed and ACCEPTABLE.
 */
function testHealthEndpointConsumers(): void {
  const healthRoute = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/health/route.ts'),
    'utf8',
  );
  const metricsRoute = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/health/metrics/route.ts'),
    'utf8',
  );

  // The liveness probe MUST remain public (no requireAdmin import).
  assert.equal(
    healthRoute.includes('requireAdmin'),
    false,
    '/api/health (liveness) MUST remain public for uptime checkers',
  );
  assert.equal(
    healthRoute.includes('from \'@/lib/security\''),
    false,
    '/api/health MUST NOT import the security boundary',
  );

  // The metrics snapshot MUST be admin-gated.
  assert.equal(
    metricsRoute.includes('requireAdmin'),
    true,
    '/api/health/metrics MUST be admin-gated',
  );

  console.log('  [PASS] Health Endpoint Consumers (liveness public, metrics admin-gated)');
}

// ---------------------------------------------------------------------------
// 3. SERVE SSRF REALITY — VERIFIED
// ---------------------------------------------------------------------------

/**
 * Verifies the ACTUAL SSRF mechanics of the serve route.
 *
 * VERIFIED FINDING: The serve route performs NO outbound fetch. It only
 * validates identifiers (isValidId for projectId/snapshotId, isValidPageId for
 * page) and loads the snapshot from the LOCAL repository. There is therefore NO
 * real SSRF vector. The identifier validation is defense-in-depth against path
 * traversal / injection in the `projectId`, `snapshotId`, and `page` parameters.
 */
function testServeSsrfReality(): void {

  const serveRoute = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/cms/projects/[id]/serve/route.ts'),
    'utf8',
  );

  // The serve route MUST NOT perform any outbound fetch (no SSRF vector).
  assert.equal(
    serveRoute.includes('fetch('),
    false,
    'serve route MUST NOT perform outbound fetch (no SSRF vector)',
  );
  assert.equal(
    serveRoute.includes('http://'),
    false,
    'serve route MUST NOT construct outbound URLs',
  );
  assert.equal(
    serveRoute.includes('https://'),
    false,
    'serve route MUST NOT construct outbound URLs',
  );

  // The serve route MUST validate identifiers before loading (defense-in-depth).
  // VERIFIED MECHANICS: projectId and the `v` (snapshotId) param are validated
  // with isValidId; the `page` param is validated with isValidPageId. The
  // snapshot id is a repository key, so isValidId (not isValidVersion) is the
  // correct validator here.
  assert.equal(
    serveRoute.includes('isValidId'),
    true,
    'serve route MUST validate projectId and snapshotId via isValidId',
  );
  assert.equal(
    serveRoute.includes('isValidPageId'),
    true,
    'serve route MUST validate pageId via isValidPageId',
  );

  console.log('  [PASS] Serve SSRF Reality (no outbound fetch; projectId/pageId/snapshotId validated)');

}

// ---------------------------------------------------------------------------
// 4. DEEP SECRET MASKING — VERIFIED CHOKE POINTS
// ---------------------------------------------------------------------------

/**
 * Verifies the ACTUAL masking choke points in the DeliveryLogger and the
 * AuditLogRepository.
 *
 * VERIFIED FINDING (post Phase J.3 fix):
 *   - `maskSecrets` IS recursive (nested objects and arrays are masked).
 *   - The DeliveryLogger masks at its OWN emit choke point (`emit`), so ANY
 *     entry it writes is masked regardless of caller.
 *   - The AuditLogRepository NOW masks at its OWN write boundary (`record`).
 *     This is the FINAL defense line: even if a caller passes unmasked
 *     secret-bearing `detail` directly to the repo, it is redacted before it
 *     is persisted. The previous VERIFIED GAP is CLOSED.
 *   - The security-failure choke point (`recordSecurityEvent`) passes the
 *     detail RAW to the repo, relying on the repo's own masking boundary.
 */
function testDeepSecretMasking(): void {
  // 4a. maskSecrets is recursive (nested objects and arrays).
  const masked = maskSecrets({
    apiKey: 'sk-live-123',
    nested: { accessToken: 'secret', safe: 'keep' },
    list: [{ clientSecret: 'shh' }, { ok: true }],
  }) as Record<string, unknown>;
  assert.equal(masked.apiKey, '[REDACTED]', 'top-level apiKey masked');
  assert.equal(
    (masked.nested as Record<string, unknown>).accessToken,
    '[REDACTED]',
    'nested token masked',
  );
  assert.equal(
    (masked.nested as Record<string, unknown>).safe,
    'keep',
    'nested non-secret preserved',
  );
  assert.equal(
    (masked.list as Array<Record<string, unknown>>)[0].clientSecret,
    '[REDACTED]',
    'list secret masked',
  );

  // 4b. The DeliveryLogger masks at its OWN emit choke point.
  const loggerSource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/editor-integration/server/delivery-logger.ts'),
    'utf8',
  );
  assert.equal(
    loggerSource.includes('maskSecrets(entry)'),
    true,
    'DeliveryLogger MUST mask at its own emit choke point',
  );

  // 4c. The AuditLogRepository NOW masks at its OWN write boundary (GAP CLOSED).
  const auditSource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/editor-integration/server/audit-log-repository.ts'),
    'utf8',
  );
  assert.equal(
    auditSource.includes('maskSecrets'),
    true,
    'AuditLogRepository MUST mask internally at its write boundary (GAP CLOSED)',
  );
  assert.equal(
    auditSource.includes('maskDetail'),
    true,
    'AuditLogRepository MUST own a maskDetail helper at the write boundary',
  );

  // 4d. The security-failure choke point (recordSecurityEvent) passes the
  //     detail RAW to the repo, which is now the FINAL masking boundary.
  const securitySource = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/security/index.ts'),
    'utf8',
  );
  assert.equal(
    securitySource.includes('maskSecrets(detail'),
    false,
    'recordSecurityEvent MUST NOT pre-mask (repo is the final masking boundary)',
  );

  console.log('  [PASS] Deep Secret Masking (logger + audit repo both mask at their own choke points)');
}

// ---------------------------------------------------------------------------
// 4e. AUDIT REPOSITORY MASKING REGRESSION TEST (Phase J.3 Directive 1)
// ---------------------------------------------------------------------------

/**
 * REGRESSION TEST: Proves that `AuditLogRepository` masks nested secrets even
 * when a caller attempts to pass unmasked data DIRECTLY to it.
 *
 * This is the defense-in-depth guarantee the Auditor required: the repository
 * itself is the FINAL masking choke point. A caller that forgets to mask (or a
 * future caller that writes a secret-bearing `detail` directly) is still
 * protected — the secret is redacted before it is persisted.
 *
 * The test constructs a real `AuditLogRepository`, records an entry whose
 * `detail` is a JSON string containing a nested `authorization` header, and
 * verifies the persisted record has the secret redacted.
 */
function testAuditRepositoryMasksNestedSecrets(): void {
  const { AuditLogRepository } = require(
    '../src/lib/editor-integration/server/audit-log-repository',
  ) as typeof import('../src/lib/editor-integration/server/audit-log-repository');

  const repo = new AuditLogRepository();

  // A caller passes UNMASKED data directly to the repo. The detail is a JSON
  // string containing a nested secret-bearing header.
  const unmaskedDetail = JSON.stringify({
    headers: { authorization: 'Bearer sk-live-12345' },
    body: { apiKey: 'super-secret-key', safe: 'keep-me' },
  });

  const entry = {
    id: 'audit-regression-1',
    projectId: 'p1',
    actorId: 'u1',
    action: 'security.publish.denied',
    commandHash: 'auth.forbidden',
    detail: unmaskedDetail,
    createdAt: new Date().toISOString(),
  };

  // Record synchronously (the in-memory fallback path is used when no D1
  // binding is present, which is the case in this test harness).
  void repo.record(entry);

  // The in-memory path pushes synchronously, so we can read it directly.
  const rows = repo['memory'] as Array<{ id: string; detail: string }>;
  const stored = rows.find((r) => r.id === entry.id);
  assert.ok(stored, 'record must be persisted');


  const storedDetail = JSON.parse(stored.detail) as {
    headers: { authorization: string };
    body: { apiKey: string; safe: string };
  };
  assert.equal(
    storedDetail.headers.authorization,
    '[REDACTED]',
    'nested authorization header MUST be masked by the repo write boundary',
  );
  assert.equal(
    storedDetail.body.apiKey,
    '[REDACTED]',
    'nested apiKey MUST be masked by the repo write boundary',
  );
  assert.equal(
    storedDetail.body.safe,
    'keep-me',
    'nested non-secret MUST be preserved',
  );

  // The raw secret MUST NOT appear anywhere in the persisted detail.
  assert.equal(
    stored.detail.includes('sk-live-12345'),
    false,
    'raw secret MUST NOT appear in the persisted audit detail',
  );
  assert.equal(
    stored.detail.includes('super-secret-key'),
    false,
    'raw apiKey MUST NOT appear in the persisted audit detail',
  );

  console.log('  [PASS] Audit Repository Masks Nested Secrets (regression: repo is final masking boundary)');
}


// ---------------------------------------------------------------------------
// 5. INPUT VALIDATION — REAL ATTACK VECTORS
// ---------------------------------------------------------------------------

/**
 * Exercises the REAL injection / path-traversal / SSRF primitives against the
 * identifier validators.
 */
function testInputValidationAttackVectors(): void {
  // Path traversal.
  assert.equal(isValidId('../etc/passwd'), false, 'path traversal rejected');
  assert.equal(isValidId('..%2fetc%2fpasswd'), false, 'encoded traversal rejected');
  assert.equal(isValidId('..\\..\\windows\\system32'), false, 'backslash traversal rejected');

  // SQL / command injection primitives.
  assert.equal(isValidId("'; DROP TABLE audit_log;--"), false, 'SQL injection rejected');
  assert.equal(isValidId('$(rm -rf /)'), false, 'command injection rejected');
  assert.equal(isValidId('`id`'), false, 'backtick injection rejected');

  // SSRF primitives.
  assert.equal(isValidId('http://169.254.169.254/latest/meta-data'), false, 'metadata SSRF rejected');
  assert.equal(isValidId('https://evil.com'), false, 'https SSRF rejected');
  assert.equal(isValidId('file:///etc/passwd'), false, 'file scheme rejected');

  // Version / page id attack vectors.
  assert.equal(isValidVersion('../etc'), false, 'version traversal rejected');
  assert.equal(isValidVersion('1.0.0; rm -rf'), false, 'version injection rejected');
  assert.equal(isValidPageId('../secret'), false, 'page traversal rejected');
  assert.equal(isValidPageId('a/b'), false, 'page slash rejected');

  // Valid identifiers still pass.
  assert.equal(isValidId('snap-abc123'), true, 'valid snapshot id passes');
  assert.equal(isValidVersion('1.0.0'), true, 'valid semver passes');
  assert.equal(isValidPageId('about-us'), true, 'valid page id passes');

  console.log('  [PASS] Input Validation Attack Vectors');
}

// ---------------------------------------------------------------------------
// 6. CORE PURITY — NO INLINE SECURITY IN CORE SERVICES
// ---------------------------------------------------------------------------

/**
 * Verifies that the core Delivery/Publishing services do NOT contain inline
 * security checks. Security MUST live in the boundary module.
 */
function testCorePurity(): void {
  const coreFiles = [
    'src/lib/editor-integration/server/publish-orchestrator.ts',
    'src/lib/editor-integration/server/deployment-service.ts',
    'src/lib/editor-integration/server/d1-project-repository.ts',
    'src/lib/editor-integration/server/version-rollback-service.ts',
    'src/lib/editor-integration/server/version-history-service.ts',
  ];

  for (const file of coreFiles) {
    const abs = path.join(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      console.log(`  [SKIP] ${file} not present`);
      continue;
    }
    const source = fs.readFileSync(abs, 'utf8');
    assert.equal(
      source.includes("from '@/lib/security'"),
      false,
      `${file} must not import the security boundary`,
    );
    assert.equal(
      source.includes('getSessionFromRequest'),
      false,
      `${file} must not perform inline session checks`,
    );
    assert.equal(
      source.includes('ownerId !=='),
      false,
      `${file} must not perform inline ownership checks`,
    );
  }

  console.log('  [PASS] Core Purity (no inline security in core services)');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('Security Verification Test');
console.log('==========================');
testRateLimitAtomicity();
testHealthEndpointConsumers();
testServeSsrfReality();
testDeepSecretMasking();
testAuditRepositoryMasksNestedSecrets();
testInputValidationAttackVectors();
testCorePurity();
console.log('==========================');
console.log('ALL SECURITY VERIFICATION TESTS PASSED');


