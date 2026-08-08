/**
 * AWIE V2 - Phase J.3: Security Hardening - Security Boundary.
 *
 * THE SECURITY PERIMETER OF THE DELIVERY LAYER AND PUBLISHING PIPELINE.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SECURITY IS A BOUNDARY, NOT SCATTERED LOGIC
 *      All authentication, authorization, tenant isolation, input validation,
 *      rate limiting, and secret masking live HERE — as reusable guards,
 *      validators, and adapters. Core services (PublishOrchestrator,
 *      DeploymentService, ProjectRepository, ThemeConfig) MUST NEVER contain
 *      inline security checks. This module is the single choke point.
 *
 *   2. NO NEW AUTHENTICATION SYSTEM (Buy Before Build)
 *      This module REUSES the existing Google OAuth session mechanism
 *      (`getSessionFromRequest` from `@/lib/admin/session`). It does NOT invent
 *      a new auth system. It only wraps the existing one into a strict boundary.
 *
 *   3. THIN WRAPPER (Section 3)
 *      Each guard is a thin, replaceable adapter. It can be swapped in one week
 *      (CTO Rule) without touching Core.
 *
 *   4. RUNTIME PURITY (Section 5)
 *      This module NEVER composes, renders, prices, books, or evaluates
 *      business meaning. It only decides WHO may act and WHETHER an input is
 *      well-formed. It NEVER touches ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side security infrastructure for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSessionFromRequest } from '@/lib/admin/session';
import type { AdminSession } from '@/types/admin';
import { getSiteById } from '@/lib/db/queries';
import type { Db } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * The outcome of a security guard. A guard either ALLOWS the request through
 * (carrying the authenticated session) or DENIES it with a structured error.
 */
export type GuardResult =
  | { ok: true; session: AdminSession }
  | { ok: false; status: 400 | 401 | 403 | 404 | 429; code: string; message: string };

/** A helper that builds a JSON error response from a denied guard result. */
export function guardError(result: Extract<GuardResult, { ok: false }>): NextResponse {
  return NextResponse.json(
    { success: false, code: result.code, message: result.message },
    { status: result.status },
  );
}

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION BOUNDARY
// ---------------------------------------------------------------------------

/**
 * Requires a valid authenticated session. Anonymous access is EXPLICITLY
 * rejected with 401. This wraps the existing Google OAuth session mechanism —
 * it does NOT invent a new auth system.
 *
 * @param request The incoming NextRequest.
 * @returns A GuardResult carrying the session on success, or a 401 denial.
 */
export async function requireSession(
  request: NextRequest,
): Promise<GuardResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    // Audit the anonymous denial. Best-effort; never throws.
    void recordSecurityEvent(
      undefined,
      undefined,
      'session',
      'auth.denied',
      { path: request.nextUrl.pathname },
    );
    return {
      ok: false,
      status: 401,
      code: 'auth.denied',
      message: 'Authentication required',
    };
  }
  return { ok: true, session };
}

// ---------------------------------------------------------------------------
// 2. AUTHORIZATION & TENANT ISOLATION BOUNDARY
// ---------------------------------------------------------------------------

/**
 * Requires that the authenticated session owns the given site (project).
 *
 * This is the SINGLE tenant-isolation guard. It resolves the site and verifies
 * `site.ownerId === session.userId`. Cross-tenant access is EXPLICITLY rejected
 * with 403. It replaces the scattered inline `ownerId !== session.userId`
 * checks that previously lived inside individual route handlers.
 *
 * @param request The incoming NextRequest.
 * @param db The D1 database handle (persistence port).
 * @param siteId The id of the Site (Project) the caller is attempting to access.
 * @returns A GuardResult carrying the session on success, or a 401/403 denial.
 */
export async function requireSiteOwnership(
  request: NextRequest,
  db: Db,
  siteId: string,
): Promise<GuardResult> {
  const auth = await requireSession(request);
  if (!auth.ok) return auth;

  // Strictly validate the site id BEFORE querying to block injection /
  // path-traversal / malformed identifiers.
  if (!isValidId(siteId)) {
    void recordSecurityEvent(
      siteId,
      auth.session.userId,
      'site',
      'validation.rejected',
      { path: request.nextUrl.pathname },
    );
    return {
      ok: false,
      status: 400,
      code: 'validation.rejected',
      message: 'Invalid site id',
    };
  }

  const site = await getSiteById(db, siteId);
  if (!site) {
    void recordSecurityEvent(
      siteId,
      auth.session.userId,
      'site',
      'not_found',
      { path: request.nextUrl.pathname },
    );
    return {
      ok: false,
      status: 404,
      code: 'not_found',
      message: 'Site not found',
    };
  }

  if (site.ownerId !== auth.session.userId) {
    void recordSecurityEvent(
      siteId,
      auth.session.userId,
      'site',
      'auth.forbidden',
      { path: request.nextUrl.pathname },
    );
    return {
      ok: false,
      status: 403,
      code: 'auth.forbidden',
      message: 'You do not have access to this site',
    };
  }

  return { ok: true, session: auth.session };
}

/**
 * Requires that the authenticated session has the `admin` role.
 *
 * Used to gate privileged surfaces (e.g. listing all users). Editors are
 * EXPLICITLY rejected with 403.
 *
 * @param request The incoming NextRequest.
 * @returns A GuardResult carrying the session on success, or a 401/403 denial.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<GuardResult> {
  const auth = await requireSession(request);
  if (!auth.ok) return auth;

  // Resolve the user's role from the database (the session carries identity,
  // not the authoritative role).
  const db = await import('@/lib/db/client').then((m) => m.getDb());
  const user = await db.users.findById(auth.session.userId);
  if (!user || user.role !== 'admin') {
    void recordSecurityEvent(
      undefined,
      auth.session.userId,
      'admin',
      'auth.forbidden',
      { path: request.nextUrl.pathname },
    );
    return {
      ok: false,
      status: 403,
      code: 'auth.forbidden',
      message: 'Admin role required',
    };
  }

  return { ok: true, session: auth.session };
}

// ---------------------------------------------------------------------------
// 3. INPUT VALIDATION BOUNDARY
// ---------------------------------------------------------------------------

/**
 * Strictly validates an identifier to block injection, path traversal, and
 * SSRF. Accepts:
 *   - UUIDs (site/project/user ids)
 *   - `snap-*` snapshot ids
 *   - `audit-*` audit record ids
 *   - `v-*` deployment version ids
 *   - plain alphanumeric ids (e.g. `p1`, `u1`)
 *
 * Rejects any string containing path separators, `..`, control characters,
 * whitespace, or URL schemes.
 *
 * @param id The identifier to validate.
 * @returns true if the identifier is well-formed.
 */
export function isValidId(id: string): boolean {
  if (typeof id !== 'string' || id.length === 0 || id.length > 128) return false;
  // Reject path traversal / injection primitives outright.
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  if (id.includes('://') || id.includes('@')) return false;
  if (/[\s\u0000-\u001f]/.test(id)) return false;
  // Allow UUIDs, prefixed ids (snap-*, audit-*, v-*), and plain alphanumerics.
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id);
}

/**
 * Strictly validates a version string. Versions are typically `v-<timestamp>`
 * or a semantic version. Rejects anything that could carry a path or injection.
 *
 * @param version The version string to validate.
 * @returns true if the version is well-formed.
 */
export function isValidVersion(version: string): boolean {
  if (typeof version !== 'string' || version.length === 0 || version.length > 64) {
    return false;
  }
  if (version.includes('..') || version.includes('/') || version.includes('\\')) {
    return false;
  }
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version);
}

/**
 * Strictly validates a page id (e.g. `home`, `about`, `contact`). Page ids are
 * semantic identifiers used in the Delivery Layer's `?page=` query param. This
 * blocks path traversal / injection via the page selector.
 *
 * @param pageId The page id to validate.
 * @returns true if the page id is well-formed.
 */
export function isValidPageId(pageId: string): boolean {
  if (typeof pageId !== 'string' || pageId.length === 0 || pageId.length > 64) {
    return false;
  }
  if (pageId.includes('..') || pageId.includes('/') || pageId.includes('\\')) {
    return false;
  }
  if (pageId.includes('://') || pageId.includes('@')) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pageId);
}

// ---------------------------------------------------------------------------
// 4. SECRET MASKING BOUNDARY
// ---------------------------------------------------------------------------

const SECRET_KEYS = new Set([
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'secret',
  'clientSecret',
  'apiKey',
  'apikey',
  'key',
  'password',
  'passwd',
  'cookie',
  'authorization',
  'session',
  'signature',
]);

/**
 * Recursively masks secret-bearing fields in a structured object so that API
 * keys, cookies, tokens, and signatures are NEVER printed in logs.
 *
 * @param value The value to sanitize.
 * @returns A deep copy with secret fields replaced by `[REDACTED]`.
 */
export function maskSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSecrets(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SECRET_KEYS.has(lower) || lower.includes('secret') || lower.includes('token')) {
        out[key] = '[REDACTED]';
      } else {
        out[key] = maskSecrets(val);
      }
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// 5. RATE LIMITING BOUNDARY (PREPARATION)
// ---------------------------------------------------------------------------

/**
 * A thin, in-memory sliding-window rate limiter keyed by `actorId + route`.
 *
 * LIMITATION (documented): This is an in-memory, per-isolate limiter. On the
 * Cloudflare Edge/D1 stack it is NOT a distributed or durable limiter — it
 * resets on isolate eviction and does not span multiple isolates. The
 * PRODUCTION path is Cloudflare-native rate limiting (Buy Before Build). This
 * guard is a preparation boundary that enforces a sane default and can be
 * swapped for the Cloudflare-native limiter without touching route logic.
 */
export class RateLimitGuard {
  private readonly buckets = new Map<string, number[]>();

  /**
   * Constructs a RateLimitGuard.
   *
   * @param limit The maximum number of requests allowed in the window.
   * @param windowMs The sliding window duration in milliseconds.
   */
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /**
   * Checks whether a request is within the rate limit.
   *
   * @param key The rate-limit key (e.g. `${actorId}:${route}`).
   * @returns true if the request is allowed, false if it is rate-limited.
   */
  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.buckets.get(key) ?? []).filter((t) => t > cutoff);
    if (timestamps.length >= this.limit) {
      this.buckets.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.buckets.set(key, timestamps);
    return true;
  }

  /** Clears all rate-limit state (used in tests). */
  reset(): void {
    this.buckets.clear();
  }
}

/**
 * The default rate-limit guard for publish/rollback endpoints. 10 requests per
 * 60 seconds per actor+route. This is a preparation boundary; the production
 * path is Cloudflare-native rate limiting.
 */
export const publishRateLimit = new RateLimitGuard(10, 60_000);

// ---------------------------------------------------------------------------
// 6. FAILED-ATTEMPT AUDIT BOUNDARY
// ---------------------------------------------------------------------------

/**
 * Records a failed or unauthorized security attempt to the durable Audit
 * Repository.
 *
 * This is the SINGLE choke point for security-failure audit logging. It is
 * called from the guards (or the route boundary) when a request is denied. It
 * NEVER contains business logic — it only persists an immutable, append-only
 * audit record describing WHO was denied, WHAT they attempted, and WHY.
 *
 * The `actorId` is best-effort: an anonymous caller has no session, so the
 * record is attributed to the sentinel `"anonymous"`. The `detail` field is
 * passed to the repository RAW — the `AuditLogRepository` is the FINAL masking
 * choke point and redacts any secret-bearing content before it is persisted.
 * This guarantees defense-in-depth: even if a future caller forgets to mask,
 * the durable audit trail never stores secrets.
 *
 * @param projectId The id of the Project (Site) the attempt targeted, if known.
 * @param actorId The id of the user who made the attempt, or undefined for
 *   anonymous callers.
 * @param action The attempted action (e.g. "publish", "rollback", "command").
 * @param reason The denial reason (e.g. "auth.denied", "auth.forbidden").
 * @param detail Optional structured detail about the attempt.
 */
export async function recordSecurityEvent(
  projectId: string | undefined,
  actorId: string | undefined,
  action: string,
  reason: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const { AuditLogRepository } = await import(
      '@/lib/editor-integration/server/audit-log-repository'
    );
    const repo = new AuditLogRepository();
    await repo.record({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: projectId ?? 'unknown',
      actorId: actorId ?? 'anonymous',
      action: `security.${action}.denied`,
      commandHash: reason,
      detail: JSON.stringify(detail ?? {}),
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Audit logging is best-effort. A failure to record a denial MUST NOT
    // crash the request or leak the underlying error.
  }
}


