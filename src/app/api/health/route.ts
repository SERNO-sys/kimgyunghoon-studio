/**
 * AWIE V2 - Phase J.2: Operations & Observability - Health API.
 *
 * The Health endpoint. This is a SERVER-SIDE route that reports the liveness of
 * the Delivery Layer: whether the D1 binding is reachable and whether the
 * durable audit trail is writable.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SNAPSHOT-ONLY READ
 *      This route performs a lightweight D1 health probe and returns a
 *      snapshot. It NEVER executes business logic, NEVER mutates ThemeConfig,
 *      and NEVER renders.
 *
 *   2. PURE INFRASTRUCTURE
 *      This route is pure server-side infrastructure. It is a thin wrapper over
 *      the D1 binding and the AuditLogRepository. It contains NO business logic.
 *
 *   3. THIN WRAPPER (Section 3)
 *      The route is a thin, replaceable adapter. It can be swapped in one week
 *      (CTO Rule) without touching Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { AuditLogRepository } from '@/lib/editor-integration/server/audit-log-repository';

// This route is Cloudflare Edge-compatible: it uses only Web-standard APIs
// (NextResponse), Cloudflare-native D1 via getRequestContext(), and Edge-safe
// in-memory services. Declaring the Edge runtime enables Cloudflare Pages
// Production deployment.
export const runtime = 'edge';

/**
 * The Health API.

 *
 * Reports the liveness of the Delivery Layer. Returns a snapshot of D1 health
 * and audit-trail writability. It NEVER executes business logic.
 */
export async function GET() {
  // 1. Probe the D1 binding. The binding is request-scoped; it is resolved
  //    lazily here. When unavailable (plain `next dev`), the service is still
  //    healthy but reports the D1 binding as absent.
  let d1Healthy = false;
  let d1Available = false;
  try {
    const env = getRequestContext().env as { DB?: D1Database };
    d1Available = Boolean(env.DB);
    if (env.DB) {
      await env.DB.prepare('SELECT 1').run();
      d1Healthy = true;
    }
  } catch {
    d1Healthy = false;
  }

  // 2. Probe the durable audit trail. The AuditLogRepository transparently
  //    falls back to in-memory when D1 is unavailable, so the audit trail is
  //    always writable; we report whether it is durable (D1-backed).
  const audit = new AuditLogRepository();
  let auditWritable = false;
  try {
    await audit.record({
      id: `health-${Date.now()}`,
      projectId: 'system',
      actorId: 'health',
      action: 'healthcheck',
      commandHash: 'health',
      detail: 'liveness probe',
      createdAt: new Date().toISOString(),
    });
    auditWritable = true;
  } catch {
    auditWritable = false;
  }

  const healthy = d1Healthy || !d1Available; // healthy when D1 is up OR absent (dev parity)

  return NextResponse.json(
    {
      success: true,
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        d1: {
          available: d1Available,
          healthy: d1Healthy,
        },
        audit: {
          writable: auditWritable,
          durable: d1Available,
        },
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
