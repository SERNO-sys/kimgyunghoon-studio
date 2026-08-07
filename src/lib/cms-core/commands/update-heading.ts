/**
 * AWIE V2 - Phase 12: CMS Core - UpdateHeadingCommand.
 *
 * A concrete Command that updates the heading text of a section within a
 * Project's ThemeConfig. This is the reference implementation of the
 * Command-Based Application Layer.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The UpdateHeadingCommand is PURE INTENT. It declares WHICH section's heading
 * should change and to WHAT value. It NEVER mutates the ThemeConfig. The
 * UpdateHeadingHandler translates it into an immutable ThemePatch, which the
 * ThemePatchPipeline applies to produce a NEW ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for updating a section heading. */
export const UPDATE_HEADING_COMMAND = 'content.update-heading';

/**
 * The UpdateHeadingCommand.
 *
 * Targets a specific section (by sectionId) within a Project and sets its
 * heading text to `heading`. The heading is stored in the section's content
 * under the `heading` key.
 */
export interface UpdateHeadingCommand extends Command {
  /** The stable command type. */
  readonly type: typeof UPDATE_HEADING_COMMAND;
  /** The id of the section whose heading is being updated. */
  readonly sectionId: CmsId;
  /** The new heading text. */
  readonly heading: string;
}

/**
 * Creates an UpdateHeadingCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed UpdateHeadingCommand.
 */
export function createUpdateHeadingCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  sectionId: CmsId;
  heading: string;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): UpdateHeadingCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: UPDATE_HEADING_COMMAND,
    commandId:
      params.commandId ?? `cmd-${params.projectId}-${createdAt}-${params.sectionId}`,
    projectId: params.projectId,
    actorId: params.actorId,
    sectionId: params.sectionId,
    heading: params.heading,
    createdAt,
    requiredCapability: 'project:edit',
  };
}


/**
 * The UpdateHeadingHandler.
 *
 * Translates an UpdateHeadingCommand into an immutable ThemePatch. It locates
 * the target section within the current ThemeConfig and produces a single
 * 'replace' operation targeting the section's `content.heading` path. It NEVER
 * mutates the ThemeConfig.
 */
export class UpdateHeadingHandler
  implements CommandHandler<UpdateHeadingCommand>
{
  /** The command type this handler supports. */
  readonly type = UPDATE_HEADING_COMMAND;

  /**
   * Translates an UpdateHeadingCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the heading change.
   */
  toPatch(command: UpdateHeadingCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // Locate the target section by id. If it does not exist, throw. This is a
    // deterministic guard owned by the Application Layer.
    const sectionIndex = config.resources.sections.findIndex(
      (section) => section.id === command.sectionId,
    );
    if (sectionIndex === -1) {
      throw new Error(
        `UpdateHeadingCommand: section "${command.sectionId}" not found in project "${command.projectId}".`,
      );
    }

    // Produce a single immutable 'replace' operation. The path is rooted at
    // the ThemeConfig and targets the section's content.heading.
    return {
      id: `patch-${command.projectId}-${command.createdAt}`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'replace',
          path: `resources.sections[${sectionIndex}].content.heading`,
          value: command.heading,
        },
      ],
    };
  }
}
