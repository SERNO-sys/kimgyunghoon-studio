/**
 * AWIE V2 - Phase 12.6: Editor Integration - PublishOrchestrator.
 *
 * The Publish Workflow. This is the SERVER-SIDE orchestrator that ties the
 * Draft (Preview Session) to the Published state (VersionSnapshot + Release
 * Pointer). It is the ONLY place where the Publish/Release Commands are
 * executed against the shared ProjectRepository.
 *
 * THE FLOW (Draft -> Published):
 *
 *   PublishOrchestrator.publish(projectId, actorId, version)
 *     -> 1. Reads the current Draft ThemeConfig (Preview Session)
 *     -> 2. Executes PublishProjectCommand (Application Layer) to freeze the
 *            Draft into an immutable VersionSnapshot
 *     -> 3. Persists the VersionSnapshot via ProjectRepository.publish()
 *     -> 4. Executes ReleaseProjectCommand (Application Layer) to designate the
 *            snapshot as Live (updates the Release Pointer)
 *     -> 5. Persists the Release Pointer via ProjectRepository.release()
 *     -> 6. Returns the PublishResult (snapshot + release metadata)
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER executes Publish/Release. It sends a single Publish
 *      intent via HTTP POST; the server orchestrates the entire workflow. The
 *      client NEVER receives or holds the ThemeConfig.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      This orchestrator is the ONLY place where the Application Layer
 *      (PublishProjectCommand / ReleaseProjectCommand) and the Persistence Port
 *      (ProjectRepository) interact. The client NEVER imports the
 *      ProjectRepository or any Runtime service.
 *
 *   3. PUBLISH AND RELEASE ARE DECOUPLED (MANDATE 1)
 *      Publish FREEZES the Draft into an immutable VersionSnapshot. Release
 *      designates a SPECIFIC snapshot as Live via the Release Pointer. This
 *      orchestrator performs both in sequence for the "Publish & Make Live"
 *      workflow, but the underlying commands remain decoupled — enabling future
 *      Scheduled Releases, Stage environments, and Blue/Green deployments.
 *
 *   4. THEME CONFIG IS NEVER MUTATED
 *      The Draft ThemeConfig is read-only. Publishing captures it into an
 *      immutable VersionSnapshot. The orchestrator NEVER mutates the Draft or
 *      the snapshot after creation.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { VersionSnapshot } from '../../cms-core';
import type { ProjectRepository } from '../../cms-core';
import {
  createPublishProjectCommand,
  createReleaseProjectCommand,
} from '../../cms-core';
import { AuditLogRepository } from './audit-log-repository';
import { DeliveryLogger } from './delivery-logger';
import { DeliveryMetrics } from './delivery-metrics';


/** The schema version of the ThemeConfig snapshots produced by this workflow. */
const SNAPSHOT_SCHEMA_VERSION = 'v2.0';

/**
 * The result of a Publish Workflow execution.
 *
 * Carries the immutable VersionSnapshot that was created and the release
 * metadata. The client receives ONLY this result — never the ThemeConfig.
 */
export interface PublishResult {
  /** Whether the workflow succeeded. */
  readonly success: true;
  /** The id of the Project that was published. */
  readonly projectId: string;
  /** The immutable VersionSnapshot created by the Publish command. */
  readonly snapshot: VersionSnapshot;
  /** The id of the snapshot designated as Live by the Release command. */
  readonly releasedSnapshotId: string;
  /** The semantic version assigned to the published snapshot. */
  readonly version: string;
  /** When the workflow completed. */
  readonly publishedAt: string;
}

/**
 * The PublishOrchestrator.
 *
 * Executes the Publish Workflow: reads the Draft, freezes it into an immutable
 * VersionSnapshot, persists it, and designates it as Live via the Release
 * Pointer. It is a plain server-side orchestrator. It NEVER renders and NEVER
 * decides business meaning.
 */
export class PublishOrchestrator {
  /** The durable audit trail (D1-backed, with in-memory fallback). */
  private readonly audit: AuditLogRepository;
  /** The structured JSON-lines logger. */
  private readonly logger: DeliveryLogger;
  /** The delivery metrics facade. */
  private readonly metrics: DeliveryMetrics;

  /**
   * Constructs a PublishOrchestrator.
   *
   * @param repository The shared ProjectRepository (persistence port).
   * @param getDraft A function that resolves the current Draft ThemeConfig for
   *   a project (from the Preview Session).
   * @param audit An optional AuditLogRepository (defaults to a fresh instance).
   * @param logger An optional DeliveryLogger (defaults to a fresh instance).
   * @param metrics An optional DeliveryMetrics (defaults to a fresh instance).
   */
  constructor(
    private readonly repository: ProjectRepository,
    private readonly getDraft: (projectId: string) => ThemeConfig,
    audit?: AuditLogRepository,
    logger?: DeliveryLogger,
    metrics?: DeliveryMetrics,
  ) {
    this.audit = audit ?? new AuditLogRepository();
    this.logger = logger ?? new DeliveryLogger();
    this.metrics = metrics ?? new DeliveryMetrics();
  }


  /**
   * Executes the Publish Workflow for a project.
   *
   * @param projectId The id of the Project to publish.
   * @param actorId The id of the user issuing the publish.
   * @param version The semantic version to assign (e.g. "1.0.0").
   * @returns The PublishResult carrying the immutable snapshot + release info.
   */
  async publish(
    projectId: string,
    actorId: string,
    version: string,
  ): Promise<PublishResult> {
    const startedAt = Date.now();

    // 1. Read the current Draft ThemeConfig (Preview Session). The Draft is the
    //    working copy; it is read-only here and NEVER mutated.
    const draft = this.getDraft(projectId);


    // 2. Execute the PublishProjectCommand (Application Layer). This FREEZES
    //    the Draft into an immutable VersionSnapshot. The command is PURE
    //    INTENT; it does not mutate the Draft.
    const publishCommand = createPublishProjectCommand({
      projectId,
      actorId,
      version,
    });

    // 3. Construct the immutable VersionSnapshot. The snapshot captures the
    //    Draft ThemeConfig at publish time. It is NEVER mutated after creation.
    //
    //    The snapshot id is derived from the UNIQUE Publish command id. This
    //    guarantees that EVERY Publish produces a NEW, distinct snapshot — even
    //    two publishes issued within the same millisecond. A timestamp alone is
    //    NOT a reliable uniqueness source and would collide, silently
    //    overwriting a previous snapshot in the repository.
    const publishedAt = new Date().toISOString();
    const snapshot: VersionSnapshot = {
      id: `snap-${publishCommand.commandId}`,
      projectId,
      version,
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      config: draft,
      publishedBy: actorId,
      publishedAt,
      auditTrailId: `audit-${publishCommand.commandId}`,
    };

    // 4. Persist the immutable VersionSnapshot via the ProjectRepository
    //    (MANDATE 3). This does NOT make it live.
    await this.repository.publish(projectId, snapshot);

    // 5. Execute the ReleaseProjectCommand (Application Layer). This designates
    //    the snapshot as Live by updating the Release Pointer (MANDATE 2).
    const releaseCommand = createReleaseProjectCommand({
      projectId,
      actorId,
      snapshotId: snapshot.id,
    });

    // 6. Persist the Release Pointer via the ProjectRepository. The snapshot
    //    itself is immutable and never touched; only the pointer moves.
    await this.repository.release(projectId, snapshot.id);

    const durationMs = Date.now() - startedAt;

    // OBSERVABILITY: record the publish in the durable audit trail, emit a
    // structured log line, and increment the publish metric. These are pure
    // infrastructure side-effects; they NEVER alter the publish result.
    await this.audit.record({
      id: crypto.randomUUID(),
      projectId,
      actorId,
      action: 'publish',
      commandHash: publishCommand.commandId,
      detail: `version=${version} snapshot=${snapshot.id}`,
      createdAt: publishedAt,
    });
    this.logger.info('delivery.publish', 'publish.completed', {
      projectId,
      actorId,
      durationMs,
      fields: { version, snapshotId: snapshot.id },
    });
    this.metrics.recordPublish(projectId);

    // 7. Return the PublishResult. The client receives ONLY this — never the
    //    ThemeConfig.
    return {
      success: true,
      projectId,
      snapshot,
      releasedSnapshotId: snapshot.id,
      version,
      publishedAt,
    };
  }
}


