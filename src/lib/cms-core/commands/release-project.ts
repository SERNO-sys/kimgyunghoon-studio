/**
 * AWIE V2 - Phase 12.6: CMS Core - ReleaseProjectCommand.
 *
 * MANDATE 1: Separate Publish and Release.
 *
 *   - Publish  (PublishProjectCommand) freezes the current Draft into an
 *               immutable VersionSnapshot. It does NOT make it live.
 *   - Release  (ReleaseProjectCommand) designates a SPECIFIC VersionSnapshot as
 *               the active "Live" version.
 *
 * This decoupling enables future features like Scheduled Releases, Stage
 * environments, and Blue/Green deployments. A Project may have many Published
 * snapshots, but only ONE Released (Live) snapshot at a time.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The ReleaseProjectCommand is PURE INTENT. It declares that a specific
 * VersionSnapshot should become the Live version. It NEVER mutates the
 * ThemeConfig. The ReleaseProjectHandler translates it into an immutable
 * ThemePatch (a no-op patch that records the release metadata), and the
 * EditorService emits a ProjectReleased DomainEvent upon success.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for releasing a Project snapshot. */
export const RELEASE_PROJECT_COMMAND = 'project.release';

/**
 * The ReleaseProjectCommand.
 *
 * Targets a Project and designates a specific VersionSnapshot as the active
 * "Live" version. The handler produces a no-op ThemePatch that records the
 * release metadata. The EditorService emits a ProjectReleased DomainEvent upon
 * success.
 */
export interface ReleaseProjectCommand extends Command {
  /** The stable command type. */
  readonly type: typeof RELEASE_PROJECT_COMMAND;
  /** The id of the VersionSnapshot to designate as the Live version. */
  readonly snapshotId: CmsId;
}

/**
 * Creates a ReleaseProjectCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed ReleaseProjectCommand.
 */
export function createReleaseProjectCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  snapshotId: CmsId;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): ReleaseProjectCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: RELEASE_PROJECT_COMMAND,
    commandId:
      params.commandId ?? `cmd-${params.projectId}-${createdAt}-release`,
    projectId: params.projectId,
    actorId: params.actorId,
    snapshotId: params.snapshotId,
    createdAt,
    requiredCapability: 'project:publish',
  };
}

/**
 * The ReleaseProjectHandler.
 *
 * Translates a ReleaseProjectCommand into an immutable ThemePatch. Releasing
 * does not change the ThemeConfig content; it designates a snapshot as Live.
 * The handler produces a no-op 'replace' patch that records the release
 * metadata. It NEVER mutates the ThemeConfig.
 */
export class ReleaseProjectHandler
  implements CommandHandler<ReleaseProjectCommand>
{
  /** The command type this handler supports. */
  readonly type = RELEASE_PROJECT_COMMAND;

  /**
   * Translates a ReleaseProjectCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the release.
   */
  toPatch(command: ReleaseProjectCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // Releasing designates a snapshot as Live. The patch is a no-op 'replace'
    // that records the released snapshot id on the config metadata. The actual
    // Live designation is persisted by the Application Service via the
    // ProjectRepository.release() port.
    return {
      id: `patch-${command.projectId}-${command.createdAt}-release`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'replace',
          path: 'metadata.releasedSnapshotId',
          value: command.snapshotId,
        },
      ],
    };
  }
}
