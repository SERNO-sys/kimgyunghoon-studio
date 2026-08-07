/**
 * AWIE V2 - Phase 17.7: CMS Core - DeleteComponentCommand.
 *
 * A concrete Command that deletes a component (section) from a Project's
 * ThemeConfig, identified by its Semantic Component Identity (ADR-012 /
 * Amendment G).
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The DeleteComponentCommand is PURE INTENT. It declares WHICH component to
 * delete (by Semantic Component Identity). It NEVER mutates the ThemeConfig.
 * The DeleteComponentHandler translates it into an immutable ThemePatch, which
 * the ThemePatchPipeline applies to produce a NEW ThemeConfig.
 *
 * AMENDMENT G / ADR-012: The Command binds to `semanticId` — the Semantic
 * Component Identity of the component to delete (e.g. "hero"). This is the ONLY
 * identity. It NEVER uses nodeId, DOM id, React key, RenderNode id, tree index,
 * or runtime UUID.
 *
 * HISTORY COMPATIBILITY: The handler produces `remove` operations. The existing
 * InversePatchGenerator inverts `remove` -> `add` (re-inserting the original
 * value read from the base config). Therefore a Delete is fully undoable with
 * NO new history infrastructure (ADR-011B).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for deleting a component. */
export const DELETE_COMPONENT_COMMAND = 'composition.delete-component';

/**
 * The DeleteComponentCommand.
 *
 * Deletes the section identified by `semanticId` (the Semantic Component
 * Identity of the component to delete) from the Project. The section is removed
 * from the resources AND from the home page's section order.
 */
export interface DeleteComponentCommand extends Command {
  /** The stable command type. */
  readonly type: typeof DELETE_COMPONENT_COMMAND;
  /** The Semantic Component Identity of the component to delete (ADR-012). */
  readonly semanticId: string;
  /** The id of the section that owns the component (if known). */
  readonly sectionId: CmsId;
}

/**
 * Creates a DeleteComponentCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed DeleteComponentCommand.
 */
export function createDeleteComponentCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  semanticId: string;
  sectionId: CmsId;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): DeleteComponentCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: DELETE_COMPONENT_COMMAND,
    commandId:
      params.commandId ??
      `cmd-${params.projectId}-${createdAt}-${params.semanticId}`,
    projectId: params.projectId,
    actorId: params.actorId,
    semanticId: params.semanticId,
    sectionId: params.sectionId,
    createdAt,
    requiredCapability: 'project:edit',
  };
}

/**
 * The DeleteComponentHandler.
 *
 * Translates a DeleteComponentCommand into an immutable ThemePatch. It removes
 * the target section from the resources and removes its id from the home page's
 * section order. It NEVER mutates the ThemeConfig.
 *
 * AMENDMENT G: The target is resolved by its Semantic Component Identity (the
 * first segment is the section id). This is a pure string operation.
 *
 * HISTORY COMPATIBILITY: The produced `remove` operations are inverted by the
 * existing InversePatchGenerator into `add` operations (re-inserting the
 * original section), so Delete is undoable with no new infrastructure.
 */
export class DeleteComponentHandler
  implements CommandHandler<DeleteComponentCommand>
{
  /** The command type this handler supports. */
  readonly type = DELETE_COMPONENT_COMMAND;

  /**
   * Translates a DeleteComponentCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the component deletion.
   */
  toPatch(command: DeleteComponentCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // AMENDMENT G: The target's Semantic Component Identity. The first segment
    // is the section id to delete.
    const targetSectionId = command.semanticId.split('.')[0];

    // Locate the target section. If it does not exist, throw. This is a
    // deterministic guard owned by the Application Layer.
    const targetIndex = config.resources.sections.findIndex(
      (section) => section.id === targetSectionId,
    );
    if (targetIndex === -1) {
      throw new Error(
        `DeleteComponentCommand: section "${targetSectionId}" not found in project "${command.projectId}".`,
      );
    }

    // Locate the home page (the page that owns the section order). If no home
    // page exists, fall back to the first page.
    const homePageIndex = config.resources.pages.findIndex(
      (page) => page.isHome === true,
    );
    const pageIndex = homePageIndex === -1 ? 0 : homePageIndex;
    const page = config.resources.pages[pageIndex];
    if (!page) {
      throw new Error(
        `DeleteComponentCommand: no page found in project "${command.projectId}".`,
      );
    }

    // The index of the section id in the page's section order.
    const orderIndex = page.sectionIds.indexOf(targetSectionId);

    // Produce an immutable patch: remove the section from resources, then remove
    // its id from the page's section order. Both are `remove` operations so the
    // existing InversePatchGenerator can invert them (re-add) for Undo.
    const operations: ThemePatch['operations'] = [
      {
        op: 'remove',
        path: `resources.sections[${targetIndex}]`,
      },
      ...(orderIndex !== -1
        ? [
            {
              op: 'remove' as const,
              path: `resources.pages[${pageIndex}].sectionIds[${orderIndex}]`,
            },
          ]
        : []),
    ];

    return {
      id: `patch-${command.projectId}-${command.createdAt}`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations,
    };
  }
}
