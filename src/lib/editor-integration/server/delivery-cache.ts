/**
 * AWIE V2 - Phase H.4: Delivery Layer - Delivery Cache Service.
 *
 * Encapsulates the frozen Delivery Layer caching contract (ADR-006) as a pure,
 * deterministic, server-side service. It is the SINGLE source of truth for how
 * the Delivery Layer (Public Serve API) computes cache headers and decides
 * Conditional GET (304 vs 200).
 *
 * ARCHITECTURAL MANDATES (ADR-006):
 *
 *   1. VALIDATION-BASED CACHING
 *      The stable URL (/serve) is NOT immutable. It is served with
 *      `Cache-Control: public, max-age=0, must-revalidate` and an ETag derived
 *      from the snapshot version. The client revalidates on every request; the
 *      body is only transferred when the snapshot changes.
 *
 *   2. CONDITIONAL GET (304)
 *      If the client's `If-None-Match` matches the current ETag, the route
 *      returns 304 Not Modified (no body). This saves bandwidth while
 *      guaranteeing zero stale content after a Release.
 *
 *   3. ETAG IS STABLE (DERIVED FROM VERSION, NOT TIMESTAMP)
 *      The ETag MUST be derived from the snapshot version, never from a
 *      timestamp, to avoid spurious cache misses. A re-publish of the SAME
 *      version produces the SAME ETag.
 *
 *   4. `immutable` IS RESERVED FOR VERSIONED URLS ONLY
 *      `immutable` is reserved strictly for versioned snapshot URLs
 *      (e.g. /serve?v={snapshotId}), which are truly immutable. It is NEVER
 *      applied to the stable URL.
 *
 *   5. RUNTIME PURITY (Section 5)
 *      This service NEVER decides business meaning. It only computes cache
 *      headers and a Conditional GET decision from the snapshot version. It
 *      NEVER renders, prices, books, authenticates, or evaluates permissions.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side Delivery Layer orchestration.
 */

/**
 * The cache-control directive for the STABLE URL (/serve).
 *
 * Validation-based caching: the client revalidates on every request, but the
 * body is only transferred when the snapshot changes. `immutable` is NEVER
 * applied here — it is reserved for versioned snapshot URLs only.
 */
export const STABLE_URL_CACHE_CONTROL =
  'public, max-age=0, must-revalidate';

/**
 * The cache-control directive for a VERSIONED snapshot URL
 * (e.g. /serve?v={snapshotId}).
 *
 * A versioned URL is truly immutable: the snapshot id never changes, so the
 * content never changes. `immutable` is therefore safe and correct here.
 */
export const VERSIONED_URL_CACHE_CONTROL =
  'public, max-age=31536000, immutable';

/**
 * The result of a Conditional GET decision.
 *
 * The Delivery Cache service decides whether the client's cached copy is
 * current (304) or stale (200). It NEVER decides business meaning — it only
 * compares the client's `If-None-Match` against the ETag derived from the
 * snapshot version.
 */
export interface ConditionalGetDecision {
  /** Whether the client's cached copy is current (return 304, no body). */
  readonly notModified: boolean;
  /** The ETag for the current snapshot version. */
  readonly etag: string;
  /** The cache-control directive for the requested URL kind. */
  readonly cacheControl: string;
}

/**
 * The Delivery Cache service.
 *
 * A stateless, deterministic service that computes the ETag and cache-control
 * headers for a Released VersionSnapshot and decides Conditional GET. It is
 * constructed once and shared by the Delivery Layer (Public Serve API).
 */
export class DeliveryCache {
  /**
   * Computes the ETag for a snapshot version.
   *
   * ADR-006 MANDATE 3: The ETag MUST be derived from the snapshot version, NOT
   * from a timestamp. A re-publish of the SAME version produces the SAME ETag,
   * avoiding spurious cache misses.
   *
   * @param version The semantic version of the Released VersionSnapshot.
   * @returns The ETag header value (e.g. `"1.0.0"`).
   */
  etagFor(version: string): string {
    return `"${version}"`;
  }

  /**
   * Decides whether a Conditional GET should return 304 Not Modified.
   *
   * ADR-006 MANDATE 2: If the client's `If-None-Match` matches the current
   * ETag, the route returns 304 (no body). Otherwise it returns 200 with the
   * body. This is the ONLY decision this service makes — it NEVER interprets
   * business meaning.
   *
   * @param version The semantic version of the Released VersionSnapshot.
   * @param ifNoneMatch The client's `If-None-Match` header value (may be null).
   * @param versioned Whether the request targets a VERSIONED snapshot URL
   *   (immutable) or the STABLE URL (must-revalidate).
   * @returns The Conditional GET decision.
   */
  decide(
    version: string,
    ifNoneMatch: string | null,
    versioned = false,
  ): ConditionalGetDecision {
    const etag = this.etagFor(version);
    const cacheControl = versioned
      ? VERSIONED_URL_CACHE_CONTROL
      : STABLE_URL_CACHE_CONTROL;

    // ADR-006 MANDATE 2: A matching If-None-Match means the client's cached
    // copy is current. Return 304 (no body). This is a pure comparison — no
    // business meaning is evaluated.
    const notModified = ifNoneMatch === etag;

    return { notModified, etag, cacheControl };
  }
}
