/**
 * AWIE V2 - Phase J.2: Operations & Observability - Metrics API.
 *
 * The Metrics endpoint. This is a SERVER-SIDE route that exposes a SNAPSHOT of
 * the Delivery Layer metrics (Publish / Rollback / Deployment counters and the
 * D1 health gauge) via the DeliveryMetrics facade.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SNAPSHOT-ONLY READ
 *      This route returns the aggregated metric samples WITHOUT flushing. It
 *      NEVER executes business logic, NEVER mutates ThemeConfig, and NEVER
 *      renders.
 *
 *   2. BUY BEFORE BUILD (Section 3)
 *      This route REUSES the frozen MetricsCollector / MetricsSinkRegistry
 *      pattern via the DeliveryMetrics facade. It does NOT rebuild metrics
 *      infrastructure.
 *
 *   3. THIN WRAPPER (Section 3)
 *      The route is a thin, replaceable adapter. It can be swapped in one week
 *      (CTO Rule) without touching Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { requireAdmin, guardError } from '@/lib/security';
import { DeliveryMetrics } from '@/lib/editor-integration/server/delivery-metrics';

/**
 * The Metrics API.
 *
 * Returns a snapshot of the Delivery Layer metrics. It NEVER executes business
 * logic.
 *
 * SECURITY BOUNDARY: This endpoint exposes operational telemetry (publish /
 * rollback / deployment counters and D1 health). It is gated behind the
 * `requireAdmin` guard so that only authenticated admins may read it. Anonymous
 * and non-admin access is EXPLICITLY rejected.
 */
export async function GET(request: NextRequest) {
  // 1. SECURITY BOUNDARY: Require an authenticated admin session. Operational
  //    metrics are privileged; anonymous and editor access is rejected.
  const guard = await requireAdmin(request);
  if (!guard.ok) {
    return guardError(guard);
  }

  // 2. Construct the DeliveryMetrics facade. It wraps the frozen
  //    MetricsCollector pattern and exposes a snapshot() read.
  const metrics = new DeliveryMetrics();

  // 3. Return the aggregated metric samples as a snapshot. This is a
  //    snapshot-only read; it NEVER flushes or mutates the collector.
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics: metrics.snapshot(),
  });
}
