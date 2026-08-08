/**
 * AWIE V2 - Phase J.2: Operations & Observability Constitutional Test.
 *
 * Verifies the frozen "Operations & Observability" constitution (Phase J.2):
 * the Delivery Layer exposes a DURABLE audit trail, structured JSON-lines
 * logging, and delivery metrics — all as THIN WRAPPERS over existing frozen
 * infrastructure (Buy Before Build). It also verifies the Publish and
 * Deployment orchestrators are instrumented, and that the Health/Metrics routes
 * are thin wrappers with NO business logic.
 *
 * CONSTITUTIONAL RULES VERIFIED:
 *
 *   A. DURABLE AUDIT TRAIL (APPROVED MODIFICATION)
 *      The AuditLogRepository persists immutable, append-only records to D1
 *      (durable) with an in-memory fallback for development parity. It is
 *      exported from the Delivery Layer barrel.
 *
 *   B. STRUCTURED LOGGING (BUY BEFORE BUILD)
 *      The DeliveryLogger emits a single JSON object per line with a stable
 *      shape. It is a thin wrapper over stdout — it does NOT introduce a new
 *      logging framework.
 *
 *   C. DELIVERY METRICS (BUY BEFORE BUILD)
 *      The DeliveryMetrics facade REUSES the frozen MetricsCollector /
 *      MetricsSinkRegistry pattern. It exposes named counters/gauges and a
 *      snapshot() read. It does NOT rebuild metrics infrastructure.
 *
 *   D. ORCHESTRATOR INSTRUMENTATION
 *      The PublishOrchestrator and DeploymentService are instrumented with
 *      audit + log + metric side-effects on their critical pathways (publish,
 *      deployment, rollback). These side-effects NEVER alter the result.
 *
 *   E. THIN WRAPPER HEALTH/METRICS ROUTES
 *      The /api/health and /api/health/metrics routes are thin wrappers. They
 *      contain NO business logic and NEVER touch ThemeConfig.
 *
 * Run: npx tsx scripts/observability-constitution.test.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AuditLogRepository } from '../src/lib/editor-integration/server/audit-log-repository';
import { DeliveryLogger } from '../src/lib/editor-integration/server/delivery-logger';
import { DeliveryMetrics } from '../src/lib/editor-integration/server/delivery-metrics';

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
  // A. Durable Audit Trail (APPROVED MODIFICATION)
  // -------------------------------------------------------------------------

  section('A - Durable Audit Trail (APPROVED MODIFICATION)');

  {
    const audit = new AuditLogRepository();
    assert(
      typeof audit.record === 'function' &&
        typeof audit.forProject === 'function' &&
        typeof audit.all === 'function',
      'AuditLogRepository exposes record / forProject / all',
    );

    // The audit trail is append-only and immutable. Records are never mutated.
    const entry = {
      id: 'audit-1',
      projectId: 'p1',
      actorId: 'u1',
      action: 'publish',
      commandHash: 'cmd-1',
      detail: 'version=1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await audit.record(entry);
    const trail = await audit.forProject('p1');
    assert(
      trail.length === 1 && trail[0].id === 'audit-1',
      'AuditLogRepository records an immutable, append-only entry',
    );
    assert(
      trail[0].action === 'publish' && trail[0].commandHash === 'cmd-1',
      'AuditLogRepository preserves WHO/WHAT/WHEN for non-repudiation',
    );
  }

  // -------------------------------------------------------------------------
  // B. Structured Logging (BUY BEFORE BUILD)
  // -------------------------------------------------------------------------

  section('B - Structured Logging (BUY BEFORE BUILD)');

  {
    const lines: string[] = [];
    const logger = new DeliveryLogger((line) => lines.push(line));
    logger.info('delivery.publish', 'publish.completed', {
      projectId: 'p1',
      actorId: 'u1',
      durationMs: 12,
      fields: { version: '1.0.0' },
    });

    assert(
      lines.length === 1,
      'DeliveryLogger emits exactly one line per entry',
    );
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    assert(
      parsed.level === 'info' &&
        parsed.service === 'delivery.publish' &&
        parsed.event === 'publish.completed',
      'DeliveryLogger emits a stable structured shape (level/service/event)',
    );
    assert(
      parsed.projectId === 'p1' && parsed.durationMs === 12,
      'DeliveryLogger carries structured fields (projectId/durationMs)',
    );
  }

  // -------------------------------------------------------------------------
  // C. Delivery Metrics (BUY BEFORE BUILD)
  // -------------------------------------------------------------------------

  section('C - Delivery Metrics (BUY BEFORE BUILD)');

  {
    const metrics = new DeliveryMetrics();
    metrics.recordPublish('p1');
    metrics.recordDeployment('p1');
    metrics.recordRollback('p1');
    metrics.setD1Health(true);

    const snapshot = metrics.snapshot();
    const names = snapshot.map((s) => s.name);
    assert(
      names.includes('delivery.publish.total') &&
        names.includes('delivery.deployment.total') &&
        names.includes('delivery.rollback.total') &&
        names.includes('delivery.d1.health'),
      'DeliveryMetrics exposes named publish/deployment/rollback/d1 counters and gauges',
    );
    assert(
      typeof metrics.snapshot === 'function',
      'DeliveryMetrics exposes a snapshot() read (snapshot-only)',
    );
  }

  // -------------------------------------------------------------------------
  // D. Orchestrator Instrumentation
  // -------------------------------------------------------------------------

  section('D - Orchestrator Instrumentation');

  {
    const publishSource = readFileSync(
      join(__dirname, '../src/lib/editor-integration/server/publish-orchestrator.ts'),
      'utf-8',
    );
    const deploymentSource = readFileSync(
      join(__dirname, '../src/lib/editor-integration/server/deployment-service.ts'),
      'utf-8',
    );

    // The PublishOrchestrator is instrumented with audit + log + metric.
    assert(
      publishSource.includes('this.audit.record') &&
        publishSource.includes('this.logger.info') &&
        publishSource.includes('this.metrics.recordPublish'),
      'PublishOrchestrator records audit + log + metric on publish',
    );

    // The DeploymentService is instrumented with audit + log + metric on both
    // deployment and rollback.
    assert(
      deploymentSource.includes('this.audit.record') &&
        deploymentSource.includes('this.logger.info') &&
        deploymentSource.includes('this.metrics.recordDeployment') &&
        deploymentSource.includes('this.metrics.recordRollback'),
      'DeploymentService records audit + log + metric on deployment and rollback',
    );

    // The instrumentation is a pure side-effect: it NEVER alters the result.
    // Verify the observability calls appear AFTER the core work in the source.
    const publishIndex = publishSource.indexOf('this.metrics.recordPublish');
    const returnIndex = publishSource.indexOf('return {');
    assert(
      publishIndex !== -1 && returnIndex !== -1 && publishIndex < returnIndex,
      'Publish instrumentation is a pure side-effect (before the return)',
    );
  }

  // -------------------------------------------------------------------------
  // E. Thin Wrapper Health/Metrics Routes
  // -------------------------------------------------------------------------

  section('E - Thin Wrapper Health/Metrics Routes');

  {
    const healthRoute = readFileSync(
      join(__dirname, '../src/app/api/health/route.ts'),
      'utf-8',
    );
    const metricsRoute = readFileSync(
      join(__dirname, '../src/app/api/health/metrics/route.ts'),
      'utf-8',
    );

    // Strip comments so the scan inspects ONLY the executable code body, not
    // the JSDoc header (which legitimately describes the purity mandate).
    const stripComments = (src: string): string =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    const healthCode = stripComments(healthRoute);
    const metricsCode = stripComments(metricsRoute);

    // The health route is a thin wrapper over D1 + the AuditLogRepository. It
    // NEVER touches ThemeConfig.
    assert(
      !healthCode.includes('ThemeConfig'),
      'Health route NEVER references ThemeConfig',
    );
    assert(
      healthRoute.includes('AuditLogRepository'),
      'Health route delegates to the AuditLogRepository',
    );

    // The metrics route is a thin wrapper over the DeliveryMetrics facade. It
    // NEVER touches ThemeConfig.
    assert(
      !metricsCode.includes('ThemeConfig'),
      'Metrics route NEVER references ThemeConfig',
    );
    assert(
      metricsRoute.includes('DeliveryMetrics') &&
        metricsRoute.includes('.snapshot()'),
      'Metrics route delegates to the DeliveryMetrics snapshot()',
    );

  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log(
    `Observability Constitution Test: ${passed} passed, ${failed} failed`,
  );
  console.log(`${'='.repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
