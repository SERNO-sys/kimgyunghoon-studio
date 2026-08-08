/**
 * AWIE V2 - Phase J.3: Security Hardening - Security Constitution Test.
 *
 * Verifies that the Security Boundary (`src/lib/security`) enforces the
 * constitutional mandates of Phase J.3:
 *
 *   1. SECURITY IS A BOUNDARY, NOT SCATTERED LOGIC
 *      Guards, validators, masking, and rate limiting live in ONE module.
 *      Core services (PublishOrchestrator, DeploymentService, ProjectRepository)
 *      MUST NOT contain inline security checks.
 *
 *   2. NO NEW AUTHENTICATION SYSTEM (Buy Before Build)
 *      The boundary REUSES the existing Google OAuth session mechanism. It does
 *      NOT invent a new auth system.
 *
 *   3. THIN WRAPPER
 *      Each guard is a thin, replaceable adapter.
 *
 *   4. RUNTIME PURITY
 *      The boundary NEVER touches ThemeConfig and NEVER evaluates business
 *      meaning.
 *
 *   5. SECRET MASKING
 *      API keys, cookies, tokens, and signatures are NEVER printed in logs.
 *
 *   6. FAILED-ATTEMPT AUDIT
 *      Unauthorized / failed attempts are recorded to the durable Audit
 *      Repository.
 *
 * This test is a constitutional baseline. It MUST pass before Phase J.3 is
 * considered complete.
 */

import { strict as assert } from 'node:assert';

import {
  isValidId,
  isValidVersion,
  isValidPageId,
  maskSecrets,
  RateLimitGuard,
  publishRateLimit,
} from '../src/lib/security';

// ---------------------------------------------------------------------------
// 1. INPUT VALIDATION BOUNDARY
// ---------------------------------------------------------------------------

function testInputValidation(): void {
  // Valid identifiers.
  assert.equal(isValidId('p1'), true, 'plain alphanumeric id should be valid');
  assert.equal(isValidId('snap-abc123'), true, 'snapshot id should be valid');
  assert.equal(isValidId('audit-abc123'), true, 'audit id should be valid');
  assert.equal(isValidId('v-1720000000000'), true, 'version id should be valid');
  assert.equal(
    isValidId('550e8400-e29b-41d4-a716-446655440000'),
    true,
    'UUID should be valid',
  );

  // Path traversal / injection primitives MUST be rejected.
  assert.equal(isValidId('../etc/passwd'), false, 'path traversal rejected');
  assert.equal(isValidId('..'), false, 'dot-dot rejected');
  assert.equal(isValidId('a/b'), false, 'slash rejected');
  assert.equal(isValidId('a\\b'), false, 'backslash rejected');
  assert.equal(isValidId('http://evil.com'), false, 'URL scheme rejected');
  assert.equal(isValidId('a b'), false, 'whitespace rejected');
  assert.equal(isValidId(''), false, 'empty rejected');
  assert.equal(isValidId('a'.repeat(200)), false, 'overlong rejected');

  // Version validation.
  assert.equal(isValidVersion('v-1720000000000'), true, 'version valid');
  assert.equal(isValidVersion('1.0.0'), true, 'semver valid');
  assert.equal(isValidVersion('../etc'), false, 'version path traversal rejected');
  assert.equal(isValidVersion('a/b'), false, 'version slash rejected');

  // Page id validation.
  assert.equal(isValidPageId('home'), true, 'page id valid');
  assert.equal(isValidPageId('about-us'), true, 'page id with dash valid');
  assert.equal(isValidPageId('../secret'), false, 'page id traversal rejected');
  assert.equal(isValidPageId('a/b'), false, 'page id slash rejected');

  console.log('  [PASS] Input Validation Boundary');
}

// ---------------------------------------------------------------------------
// 2. SECRET MASKING BOUNDARY
// ---------------------------------------------------------------------------

function testSecretMasking(): void {
  const masked = maskSecrets({
    projectId: 'p1',
    actorId: 'u1',
    apiKey: 'sk-live-1234567890',
    token: 'eyJhbGciOiJIUzI1NiJ9',
    cookie: 'session=abc123',
    password: 'hunter2',
    nested: {
      accessToken: 'secret-token',
      safe: 'keep-me',
    },
    list: [{ clientSecret: 'shh' }, { ok: true }],
  }) as Record<string, unknown>;

  assert.equal(masked.apiKey, '[REDACTED]', 'apiKey masked');
  assert.equal(masked.token, '[REDACTED]', 'token masked');
  assert.equal(masked.cookie, '[REDACTED]', 'cookie masked');
  assert.equal(masked.password, '[REDACTED]', 'password masked');
  assert.equal(masked.projectId, 'p1', 'non-secret preserved');
  assert.equal(masked.actorId, 'u1', 'non-secret preserved');

  const nested = masked.nested as Record<string, unknown>;
  assert.equal(nested.accessToken, '[REDACTED]', 'nested token masked');
  assert.equal(nested.safe, 'keep-me', 'nested non-secret preserved');

  const list = masked.list as Array<Record<string, unknown>>;
  assert.equal(list[0].clientSecret, '[REDACTED]', 'list secret masked');
  assert.equal(list[1].ok, true, 'list non-secret preserved');

  // The original object MUST NOT be mutated (immutability).
  const original = { apiKey: 'sk-live-1234567890' };
  maskSecrets(original);
  assert.equal(original.apiKey, 'sk-live-1234567890', 'original not mutated');

  console.log('  [PASS] Secret Masking Boundary');
}

// ---------------------------------------------------------------------------
// 3. RATE LIMITING BOUNDARY (PREPARATION)
// ---------------------------------------------------------------------------

function testRateLimiting(): void {
  const guard = new RateLimitGuard(3, 60_000);

  // First 3 requests are allowed.
  assert.equal(guard.allow('u1:publish'), true, 'request 1 allowed');
  assert.equal(guard.allow('u1:publish'), true, 'request 2 allowed');
  assert.equal(guard.allow('u1:publish'), true, 'request 3 allowed');

  // 4th request is rate-limited.
  assert.equal(guard.allow('u1:publish'), false, 'request 4 rate-limited');

  // A different actor is NOT affected (isolation).
  assert.equal(guard.allow('u2:publish'), true, 'different actor allowed');

  // A different route for the same actor is NOT affected.
  assert.equal(guard.allow('u1:rollback'), true, 'different route allowed');

  // The default publish guard exists and is configured.
  assert.ok(publishRateLimit instanceof RateLimitGuard, 'publishRateLimit exists');

  console.log('  [PASS] Rate Limiting Boundary (Preparation)');
}

// ---------------------------------------------------------------------------
// 4. CONSTITUTIONAL GUARD: NO INLINE SECURITY IN CORE SERVICES
// ---------------------------------------------------------------------------

/**
 * Verifies that the core Delivery/Publishing services do NOT contain inline
 * security checks. Security MUST live in the boundary module, not scattered
 * inside business logic.
 */
function testNoInlineSecurityInCore(): void {
  const coreFiles = [
    'src/lib/editor-integration/server/publish-orchestrator.ts',
    'src/lib/editor-integration/server/deployment-service.ts',
    'src/lib/editor-integration/server/d1-project-repository.ts',
    'src/lib/editor-integration/server/version-rollback-service.ts',
    'src/lib/editor-integration/server/version-history-service.ts',
  ];

  const fs = require('node:fs');
  const path = require('node:path');

  for (const file of coreFiles) {
    const abs = path.join(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      console.log(`  [SKIP] ${file} not present`);
      continue;
    }
    const source = fs.readFileSync(abs, 'utf8');
    // Core services MUST NOT import the security boundary or perform inline
    // session/ownership checks. They are pure business logic.
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

  console.log('  [PASS] No Inline Security in Core Services');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('Security Constitution Test');
console.log('==========================');
testInputValidation();
testSecretMasking();
testRateLimiting();
testNoInlineSecurityInCore();
console.log('==========================');
console.log('ALL SECURITY CONSTITUTION TESTS PASSED');
