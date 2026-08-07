/**
 * AWIE V2 - Phase 12 M3: CMS Core - PublishProjectCommand.
 *
 * A concrete Command that publishes a Project. Publishing transitions the
 * Project to the 'published' lifecycle state and creates an immutable
 * VersionSnapshot of the current ThemeConfig.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The PublishProjectCommand is PURE INTENT. It declares that a Project should
 * be published. It NEVER mutates the ThemeConfig. The PublishProjectHandler
 * translates it into an immutable ThemePatch (a no-op patch that captures the
 * snapshot), and the EditorService emits a ProjectPublished DomainEvent upon
 * success.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for publishing a Project. */
export const PUBLISH_PROJECT_COMMAND = 'project.publish';

/**
 * The PublishProjectCommand.
 *
 * Targets a Project and publishes it. The handler produces a no-op ThemePatch
 * that captures the current ThemeConfig as an immutable VersionSnapshot. The
 * EditorService emits a ProjectPublished DomainEvent upon success.
 */
export interface PublishProjectCommand extends Command {
  /** The stable command type. */
  readonly type: typeof PUBLISH_PROJECT_COMMAND;
  /** The semantic version to assign to the published snapshot (e.g. "1.0.0"). */
  readonly version: string;
}

/**
 * Creates a PublishProjectCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed PublishProjectCommand.
 */
export function createPublishProjectCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  version: string;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): PublishProjectCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: PUBLISH_PROJECT_COMMAND,
    commandId:
      params.commandId ?? `cmd-${params.projectId}-${createdAt}-publish`,
    projectId: params.projectId,
    actorId: params.actorId,
    version: params.version,
    createdAt,
    requiredCapability: 'project:publish',
  };
}

/**
 * The PublishProjectHandler.
 *
 * Translates a PublishProjectCommand into an immutable ThemePatch. Publishing
 * does not change the ThemeConfig content; it captures the current config as a
 * VersionSnapshot. The handler produces a no-op 'replace' patch that records
 * the snapshot metadata. It NEVER mutates the ThemeConfig.
 */
export class PublishProjectHandler
  implements CommandHandler<PublishProjectCommand>
{
  /** The command type this handler supports. */
  readonly type = PUBLISH_PROJECT_COMMAND;

  /**
   * Translates a PublishProjectCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the publish.
   */
  toPatch(command: PublishProjectCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // Publishing captures the current config as a snapshot. The patch is a
    // no-op 'replace' that records the snapshot version on the config metadata.
    // The actual VersionSnapshot is created by the Application Service.
    return {
      id: `patch-${command.projectId}-${command.createdAt}-publish`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'replace',
          path: 'metadata.publishedVersion',
          value: command.version,
        },
      ],
    };
  }
}
