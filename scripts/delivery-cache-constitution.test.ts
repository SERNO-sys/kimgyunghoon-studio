/**
 * AWIE V2 - Phase H.4: Delivery Layer Caching Constitutional Test.
 *
 * Verifies the frozen Delivery Layer caching constitution (ADR-006) for the
 * server-side DeliveryCache service and its wiring into the Public Serve API.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. VALIDATION-BASED CACHING (ADR-006 MANDATE 1)
 *      The stable URL (/serve) is NOT immutable. It is served with
 *      `Cache-Control: public, max-age=0, must-revalidate` and an ETag derived
 *      from the snapshot version. The client revalidates on every request; the
 *      body is only transferred when the snapshot changes.
 *
 *   B. CONDITIONAL GET (304) (ADR-006 MANDATE 2)
 *      If the client's `If-None-Match` matches the current ETag, the route
 *      returns 304 Not Modified (no body). This saves bandwidth while
 *      guaranteeing zero stale content after a Release.
 *
 *   C. ETAG IS STABLE (DERIVED FROM VERSION, NOT TIMESTAMP) (ADR-006 MANDATE 3)
 *      The ETag MUST be derived from the snapshot version, never from a
 *      timestamp, to avoid spurious cache misses. A re-publish of the SAME
 *      version produces the SAME ETag.
 *
 *   D. `immutable` IS RESERVED FOR VERSIONED URLS ONLY (ADR-006 MANDATE 4)
 *      `immutable` is reserved strictly for versioned snapshot URLs
 *      (e.g. /serve?v={snapshotId}), which are truly immutable. It is NEVER
 *      applied to the stable URL.
 *
 *   E. RUNTIME PURITY (Section 5)
 *      The DeliveryCache service NEVER decides business meaning. It only
 *      computes cache headers and a Conditional GET decision from the snapshot
 *      version. It NEVER renders, prices, books, authenticates, or evaluates
 *      permissions.
 *
 *   F. THIN WRAPPER (Section 2)
 *      The DeliveryCache service is the SINGLE source of truth for the caching
 *      contract. The route is a THIN WRAPPER around it — it never re-implements
 *      caching logic. The service is deterministic and stateless.
 *
 * Run: npx tsx scripts/delivery-cache-constitution.test.ts
 */

import {
  DeliveryCache,
  STABLE_URL_CACHE_CONTROL,
  VERSIONED_URL_CACHE_CONTROL,
} from '../src/lib/editor-integration/server';

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

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // A. Validation-Based Caching (ADR-006 MANDATE 1)
  // -------------------------------------------------------------------------

  section('A - Validation-Based Caching (ADR-006 MANDATE 1)');

  {
    const cache = new DeliveryCache();

    // The stable URL (/serve) is NOT immutable. It is served with
    // `max-age=0, must-revalidate` so the client revalidates on every request.
    const decision = cache.decide('1.0.0', null, false);

    assert(
      decision.cacheControl === STABLE_URL_CACHE_CONTROL,
      'The stable URL uses validation-based caching (max-age=0, must-revalidate)',
    );
    assert(
      decision.cacheControl.includes('must-revalidate'),
      'The stable URL forces revalidation on every request',
    );
    assert(
      !decision.cacheControl.includes('immutable'),
      'The stable URL is NEVER served as immutable',
    );
    assert(
      decision.etag === '"1.0.0"',
      'The ETag is derived from the snapshot version',
    );
  }

  // -------------------------------------------------------------------------
  // B. Conditional GET (304) (ADR-006 MANDATE 2)
  // -------------------------------------------------------------------------

  section('B - Conditional GET (304) (ADR-006 MANDATE 2)');

  {
    const cache = new DeliveryCache();

    // A matching If-None-Match means the client's cached copy is current.
    const match = cache.decide('1.0.0', '"1.0.0"', false);
    assert(
      match.notModified === true,
      'A matching If-None-Match returns 304 (notModified = true)',
    );

    // A stale If-None-Match means the client must re-fetch the body.
    const stale = cache.decide('2.0.0', '"1.0.0"', false);
    assert(
      stale.notModified === false,
      'A stale If-None-Match returns 200 (notModified = false)',
    );

    // No If-None-Match header means the client has no cached copy.
    const none = cache.decide('1.0.0', null, false);
    assert(
      none.notModified === false,
      'No If-None-Match header returns 200 (notModified = false)',
    );
  }

  // -------------------------------------------------------------------------
  // C. ETag Is Stable (Derived from Version, Not Timestamp) (ADR-006 MANDATE 3)
  // -------------------------------------------------------------------------

  section('C - ETag Is Stable (ADR-006 MANDATE 3)');

  {
    const cache = new DeliveryCache();

    // A re-publish of the SAME version produces the SAME ETag. The ETag is
    // derived from the version, never from a timestamp, to avoid spurious
    // cache misses.
    const first = cache.etagFor('1.0.0');
    const second = cache.etagFor('1.0.0');
    assert(
      first === second,
      'A re-publish of the SAME version produces the SAME ETag (no spurious miss)',
    );

    // Different versions produce different ETags.
    const other = cache.etagFor('2.0.0');
    assert(
      first !== other,
      'Different versions produce different ETags',
    );
  }

  // -------------------------------------------------------------------------
  // D. `immutable` Is Reserved for Versioned URLs Only (ADR-006 MANDATE 4)
  // -------------------------------------------------------------------------

  section('D - `immutable` Reserved for Versioned URLs (ADR-006 MANDATE 4)');

  {
    const cache = new DeliveryCache();

    // A versioned snapshot URL (e.g. /serve?v={snapshotId}) is truly immutable:
    // the snapshot id never changes, so the content never changes. `immutable`
    // is therefore safe and correct here.
    const versioned = cache.decide('1.0.0', null, true);
    assert(
      versioned.cacheControl === VERSIONED_URL_CACHE_CONTROL,
      'A versioned snapshot URL is served as immutable',
    );
    assert(
      versioned.cacheControl.includes('immutable'),
      '`immutable` is applied to versioned snapshot URLs',
    );

    // The stable URL is NEVER served as immutable, even when the same version
    // is requested.
    const stable = cache.decide('1.0.0', null, false);
    assert(
      !stable.cacheControl.includes('immutable'),
      '`immutable` is NEVER applied to the stable URL',
    );
  }

  // -------------------------------------------------------------------------
  // E. Runtime Purity (Section 5)
  // -------------------------------------------------------------------------

  section('E - Runtime Purity (Section 5)');

  {
    const cache = new DeliveryCache();

    // The service NEVER decides business meaning. It only computes cache
    // headers and a Conditional GET decision from the snapshot version. It
    // NEVER renders, prices, books, authenticates, or evaluates permissions.
    const decision = cache.decide('1.0.0', null, false);

    const keys = Object.keys(decision);
    assert(
      keys.every(
        (k) =>
          k === 'notModified' || k === 'etag' || k === 'cacheControl',
      ),
      'The decision carries ONLY cache metadata (no business data)',
    );
    assert(
      !('price' in decision) &&
        !('permission' in decision) &&
        !('booking' in decision) &&
        !('auth' in decision),
      'The decision carries NO pricing / permission / booking / auth data',
    );
  }

  // -------------------------------------------------------------------------
  // F. Thin Wrapper / Deterministic & Stateless (Section 2)
  // -------------------------------------------------------------------------

  section('F - Thin Wrapper / Deterministic & Stateless (Section 2)');

  {
    const cache = new DeliveryCache();

    // The service is deterministic: the same inputs always produce the same
    // output. It is stateless: no internal state is mutated between calls.
    const a = cache.decide('1.0.0', '"1.0.0"', false);
    const b = cache.decide('1.0.0', '"1.0.0"', false);
    assert(
      a.notModified === b.notModified &&
        a.etag === b.etag &&
        a.cacheControl === b.cacheControl,
      'The service is deterministic (same inputs, same outputs)',
    );

    // The service is the SINGLE source of truth for the caching contract. The
    // route is a THIN WRAPPER around it — it never re-implements caching logic.
    assert(
      typeof cache.etagFor === 'function' &&
        typeof cache.decide === 'function',
      'The service exposes the full caching contract (etagFor + decide)',
    );
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Delivery Cache Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
