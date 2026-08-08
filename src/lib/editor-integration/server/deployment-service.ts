/**
 * AWIE V2 - Milestone J: Total Legacy Absorption - DeploymentService.
 *
 * THE SINGLE OWNER OF ALL LEGACY DEPLOYMENT BOOKKEEPING.
 *
 * Milestone J priority #1 ("Total Legacy Absorption") mandates that ALL
 * remaining legacy deployment logic (`isPublished`, `deployVersion`, tenant
 * subdomain, deployment snapshots) be absorbed ENTIRELY into the Delivery
 * Layer. This service is that absorption point.
 *
 * It owns:
 *
 *   1. DEPLOYMENT SNAPSHOTS (legacy `deploy_versions` D1 table)
 *      - createDeploymentSnapshot  (was src/lib/deployment.ts)
 *      - getDeploymentHistoryForSite (was src/lib/deployment.ts)
 *      - rollbackToDeployment      (was src/lib/deployment.ts)
 *
 *   2. PUBLISH BOOKKEEPING (was inline in src/app/api/admin/publish/route.ts)
 *      - `isPublished` flag flip
 *      - `deployVersion` pointer
 *      - tenant subdomain derivation
 *      - settings/posts timestamp touch
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. DELIVERY LAYER OWNS DEPLOYMENT
 *      The Delivery Layer (this module) is the ONLY place that writes the
 *      legacy deployment bookkeeping. Route handlers (admin publish, admin
 *      deployment) are THIN WRAPPERS that delegate here. No route re-implements
 *      deployment logic.
 *
 *   2. RUNTIME PURITY (Section 5)
 *      This service NEVER composes, renders, prices, books, authenticates, or
 *      evaluates permissions. It only persists deployment metadata. It NEVER
 *      touches ThemeConfig and NEVER mutates the immutable VersionSnapshot.
 *
 *   3. THEME CONFIG IS NEVER MUTATED (ADR-003)
 *      This service operates on the legacy Site row's deployment columns
 *      (`isPublished`, `deployVersion`) and the `deploy_versions` table. It
 *      NEVER reads or writes ThemeConfig.
 *
 *   4. THIN WRAPPER (Section 3)
 *      The service is a thin, replaceable adapter over the D1 persistence
 *      layer. It can be swapped in one week (CTO Rule) without touching Core.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side Delivery Layer orchestration.
 */

import type { Db, Post, SiteSettings } from '../../db/types';
import type { DeploymentRecord } from '../../cloudflare/types';
import {
  createDeployVersion,
  getSettingsBySiteId,
  listDeployVersionsBySite,
  listPostsBySite,
  restoreSiteSnapshot,
  updateSite,
} from '../../db/queries';
import { AuditLogRepository } from './audit-log-repository';
import { DeliveryLogger } from './delivery-logger';
import { DeliveryMetrics } from './delivery-metrics';


/** The legacy deployment snapshot payload (settings + posts). */
interface Snapshot {
  settings: SiteSettings | null;
  posts: Post[];
}

/**
 * The result of recording a deployment after a Publish.
 *
 * Carries the legacy deployment record plus the derived tenant subdomain and
 * public URL so the admin publish route can return them to the client. The
 * route NEVER derives these itself — it consumes this snapshot.
 */
export interface DeploymentResult {
  /** The legacy deployment record persisted to `deploy_versions`. */
  readonly deployment: DeploymentRecord;
  /** The tenant subdomain (first segment of the site id). */
  readonly subdomain: string;
  /** The public URL for the tenant subdomain. */
  readonly publicUrl: string;
}

/**
 * The DeploymentService.
 *
 * The SINGLE owner of all legacy deployment bookkeeping in the Delivery Layer.
 * It is a plain server-side service. It NEVER renders and NEVER decides
 * business meaning.
 */
export class DeploymentService {
  /** The durable audit trail (D1-backed, with in-memory fallback). */
  private readonly audit: AuditLogRepository;
  /** The structured JSON-lines logger. */
  private readonly logger: DeliveryLogger;
  /** The delivery metrics facade. */
  private readonly metrics: DeliveryMetrics;

  /**
   * Constructs a DeploymentService.
   *
   * @param db The D1 database handle (persistence port).
   * @param audit An optional AuditLogRepository (defaults to a fresh instance).
   * @param logger An optional DeliveryLogger (defaults to a fresh instance).
   * @param metrics An optional DeliveryMetrics (defaults to a fresh instance).
   */
  constructor(
    private readonly db: Db,
    audit?: AuditLogRepository,
    logger?: DeliveryLogger,
    metrics?: DeliveryMetrics,
  ) {
    this.audit = audit ?? new AuditLogRepository();
    this.logger = logger ?? new DeliveryLogger();
    this.metrics = metrics ?? new DeliveryMetrics();
  }


  /**
   * Derives the tenant subdomain from a site id.
   *
   * The tenant subdomain is the first segment of the site UUID (e.g.
   * `f0e36aaa` for `f0e36aaa-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). The middleware
   * resolves `f0e36aaa.lucidworker.com` via a prefix match on the site id, so
   * this is the value that must be bound for the subdomain to resolve.
   *
   * @param siteId The id of the Site (Project).
   * @returns The tenant subdomain.
   */
  subdomainFor(siteId: string): string {
    return siteId.split('-')[0] || siteId;
  }

  /**
   * Records a deployment for a Site after a Publish.
   *
   * This is the SINGLE method the admin publish route delegates to. It:
   *
   *   1. Creates a legacy deployment snapshot (settings + posts) in
   *      `deploy_versions`.
   *   2. Flips the Site's `isPublished` flag to true and records the
   *      `deployVersion`.
   *   3. Touches the settings/posts `updatedAt` timestamps.
   *
   * It returns the deployment record plus the derived subdomain/publicUrl so
   * the route can respond without re-deriving deployment logic.
   *
   * @param siteId The id of the Site (Project) to record the deployment for.
   * @param commitHash The deployment commit hash (e.g. 'manual').
   * @returns The DeploymentResult (deployment record + subdomain + publicUrl).
   */
  async recordDeployment(
    siteId: string,
    commitHash: string,
  ): Promise<DeploymentResult> {
    const startedAt = Date.now();
    const now = new Date().toISOString();

    // 1. Create a legacy deployment snapshot first so we can persist its
    //    version as the Site's deployVersion.
    const deployment = await this.createDeploymentSnapshot(
      this.db,
      siteId,
      commitHash,
    );

    // 2. Mark the site as published and record the latest deploy version.
    await updateSite(this.db, siteId, {
      updatedAt: now,
      isPublished: true,
      deployVersion: deployment.version,
    });

    // 3. Touch the settings/posts timestamps so the deployment snapshot's
    //    captured state is consistent with the current updatedAt values.
    const settings = await getSettingsBySiteId(this.db, siteId);
    if (settings) {
      await this.db.settings.update(siteId, {
        ...settings,
        updatedAt: now,
      });

      const posts = await listPostsBySite(this.db, siteId);
      for (const post of posts) {
        await this.db.posts.update(post.id, {
          ...post,
          updatedAt: now,
        });
      }
    }

    const subdomain = this.subdomainFor(siteId);
    const durationMs = Date.now() - startedAt;

    // OBSERVABILITY: record the deployment in the durable audit trail, emit a
    // structured log line, and increment the deployment metric. These are pure
    // infrastructure side-effects; they NEVER alter the deployment result.
    await this.audit.record({
      id: crypto.randomUUID(),
      projectId: siteId,
      actorId: 'system',
      action: 'deployment',
      commandHash: commitHash,
      detail: `version=${deployment.version}`,
      createdAt: now,
    });
    this.logger.info('delivery.deployment', 'deployment.recorded', {
      projectId: siteId,
      durationMs,
      fields: { version: deployment.version, commitHash },
    });
    this.metrics.recordDeployment(siteId);

    return {
      deployment,
      subdomain,
      publicUrl: `https://${subdomain}.lucidworker.com`,
    };
  }


  /**
   * Creates a legacy deployment snapshot (settings + posts) in `deploy_versions`.
   *
   * @param db The D1 database handle.
   * @param siteId The id of the Site (Project).
   * @param commitHash The deployment commit hash.
   * @returns The persisted DeploymentRecord.
   */
  private async createDeploymentSnapshot(
    db: Db,
    siteId: string,
    commitHash: string,
  ): Promise<DeploymentRecord> {
    const settings = await getSettingsBySiteId(db, siteId);
    const posts = await listPostsBySite(db, siteId);

    const snapshot: Snapshot = { settings, posts };
    const now = new Date().toISOString();
    const version = `v-${Date.now()}`;

    const record = await createDeployVersion(db, {
      id: crypto.randomUUID(),
      siteId,
      version,
      snapshot: JSON.stringify(snapshot),
      createdAt: now,
    });

    return {
      id: record.id,
      siteId: record.siteId,
      commitHash,
      version: record.version,
      status: 'success',
      startedAt: record.createdAt,
      completedAt: now,
      durationMs: 0,
    };
  }

  /**
   * Lists the deployment history for a Site.
   *
   * @param siteId The id of the Site (Project).
   * @returns The deployment history as DeploymentRecords.
   */
  async getDeploymentHistoryForSite(siteId: string): Promise<DeploymentRecord[]> {
    return (await listDeployVersionsBySite(this.db, siteId)).map((version) => ({
      id: version.id,
      siteId: version.siteId,
      commitHash: version.version,
      version: version.version,
      status: 'success',
      startedAt: version.createdAt,
      completedAt: version.createdAt,
      durationMs: 0,
    }));
  }

  /**
   * Rolls a Site back to a previous deployment snapshot.
   *
   * Restores the settings/posts captured in the target deployment snapshot.
   *
   * @param siteId The id of the Site (Project).
   * @param id The id of the deployment snapshot to roll back to.
   * @returns The restored DeploymentRecord, or null if not found.
   */
  async rollbackToDeployment(
    siteId: string,
    id: string,
  ): Promise<DeploymentRecord | null> {
    const startedAt = Date.now();
    const versions = await listDeployVersionsBySite(this.db, siteId);
    const version = versions.find((v) => v.id === id);
    if (!version) return null;

    const snapshot: Snapshot = JSON.parse(version.snapshot);
    if (!snapshot.settings) return null;

    await restoreSiteSnapshot(
      this.db,
      siteId,
      snapshot.settings,
      snapshot.posts ?? [],
    );

    const now = new Date().toISOString();
    const durationMs = Date.now() - startedAt;

    // OBSERVABILITY: record the rollback in the durable audit trail, emit a
    // structured log line, and increment the rollback metric. These are pure
    // infrastructure side-effects; they NEVER alter the rollback result.
    await this.audit.record({
      id: crypto.randomUUID(),
      projectId: siteId,
      actorId: 'system',
      action: 'rollback',
      commandHash: version.version,
      detail: `deploymentId=${id}`,
      createdAt: now,
    });
    this.logger.info('delivery.deployment', 'deployment.rollback', {
      projectId: siteId,
      durationMs,
      fields: { deploymentId: id, version: version.version },
    });
    this.metrics.recordRollback(siteId);

    return {
      id: version.id,
      siteId: version.siteId,
      commitHash: version.version,
      version: version.version,
      status: 'success',
      startedAt: version.createdAt,
      completedAt: now,
      durationMs,
    };
  }
}


