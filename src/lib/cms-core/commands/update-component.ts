/**
 * AWIE V2 - Phase 17.6: CMS Core - UpdateComponentCommand.
 *
 * A concrete Command that updates the text value of a component within a
 * Project's ThemeConfig, identified by its Semantic Component Identity
 * (ADR-012 / Amendment G).
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The UpdateComponentCommand is PURE INTENT. It declares WHICH component
 * (by Semantic Component Identity) should change and to WHAT value. It NEVER
 * mutates the ThemeConfig. The UpdateComponentHandler translates it into an
 * immutable ThemePatch, which the ThemePatchPipeline applies to produce a NEW
 * ThemeConfig.
 *
 * AMENDMENT G / ADR-012: The Command binds to `semanticId` — the Semantic
 * Component Identity (e.g. "hero.title"). This is the ONLY identity. It NEVER
 * uses nodeId, DOM id, React key, RenderNode id, tree index, or runtime UUID.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for updating a component's text value. */
export const UPDATE_COMPONENT_COMMAND = 'content.update-component';

/**
 * The UpdateComponentCommand.
 *
 * Targets a component (by Semantic Component Identity) within a Project and
 * sets its text value. The value is stored in the owning section's content
 * under the resolved content key.
 */
export interface UpdateComponentCommand extends Command {
  /** The stable command type. */
  readonly type: typeof UPDATE_COMPONENT_COMMAND;
  /** The Semantic Component Identity of the component being updated (ADR-012). */
  readonly semanticId: string;
  /** The id of the section that owns the component (if known). */
  readonly sectionId: CmsId;
  /** The new text value. */
  readonly value: string;
}

/**
 * Creates an UpdateComponentCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed UpdateComponentCommand.
 */
export function createUpdateComponentCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  semanticId: string;
  sectionId: CmsId;
  value: string;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): UpdateComponentCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: UPDATE_COMPONENT_COMMAND,
    commandId:
      params.commandId ??
      `cmd-${params.projectId}-${createdAt}-${params.semanticId}`,
    projectId: params.projectId,
    actorId: params.actorId,
    semanticId: params.semanticId,
    sectionId: params.sectionId,
    value: params.value,
    createdAt,
    requiredCapability: 'project:edit',
  };
}

/**
 * The UpdateComponentHandler.
 *
 * Translates an UpdateComponentCommand into an immutable ThemePatch. It locates
 * the owning section within the current ThemeConfig and produces a single
 * 'replace' operation targeting the section's content at the resolved key. It
 * NEVER mutates the ThemeConfig.
 *
 * AMENDMENT G: The content key is derived from the Semantic Component Identity
 * (e.g. "hero.title" -> section "hero", content key "title"). This is a pure
 * string operation — no business logic.
 */
export class UpdateComponentHandler
  implements CommandHandler<UpdateComponentCommand>
{
  /** The command type this handler supports. */
  readonly type = UPDATE_COMPONENT_COMMAND;

  /**
   * Translates an UpdateComponentCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the component value change.
   */
  toPatch(command: UpdateComponentCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // AMENDMENT G: The Semantic Component Identity is "section.contentKey"
    // (e.g. "hero.title"). The first segment is the section id; the remainder
    // is the content key path. This is a pure string operation.
    const segments = command.semanticId.split('.');
    const sectionId = segments[0];
    const contentKey = segments.slice(1).join('.');

    if (!contentKey) {
      throw new Error(
        `UpdateComponentCommand: semanticId "${command.semanticId}" must include a content key (e.g. "hero.title").`,
      );
    }

    // Locate the owning section by id. If it does not exist, throw. This is a
    // deterministic guard owned by the Application Layer.
    const sectionIndex = config.resources.sections.findIndex(
      (section) => section.id === sectionId,
    );
    if (sectionIndex === -1) {
      throw new Error(
        `UpdateComponentCommand: section "${sectionId}" not found in project "${command.projectId}".`,
      );
    }

    // Produce a single immutable 'replace' operation. The path is rooted at
    // the ThemeConfig and targets the section's content at the resolved key.
    return {
      id: `patch-${command.projectId}-${command.createdAt}`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'replace',
          path: `resources.sections[${sectionIndex}].content.${contentKey}`,
          value: command.value,
        },
      ],
    };
  }
}
