/**
 * AWIE V2 - Phase 17.8: CMS Core - MoveComponentCommand.
 *
 * A concrete Command that moves (reorders) an existing section within a
 * Project's ThemeConfig, identified by its Semantic Component Identity
 * (ADR-012 / Amendment G).
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The MoveComponentCommand is PURE INTENT. It declares WHICH section to move
 * (by Semantic Component Identity) and WHERE (relative to a target Semantic
 * Component Identity). It NEVER mutates the ThemeConfig. The
 * MoveComponentHandler translates it into an immutable ThemePatch, which the
 * ThemePatchPipeline applies to produce a NEW ThemeConfig.
 *
 * AMENDMENT G / ADR-012: The Command binds to `sourceSemanticId` and
 * `targetSemanticId` — the Semantic Component Identities of the section being
 * moved and the drop target. These are the ONLY identities. It NEVER uses
 * nodeId, DOM id, React key, RenderNode id, tree index, or runtime UUID.
 *
 * HISTORY COMPATIBILITY: The handler produces a SINGLE `replace` operation on
 * the page's `sectionIds` array (the whole reordered array). The existing
 * InversePatchGenerator inverts `replace` -> `replace` (restoring the ORIGINAL
 * array read from the base config). Therefore a Move is fully undoable with NO
 * new history infrastructure (ADR-011B).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for moving a component. */
export const MOVE_COMPONENT_COMMAND = 'composition.move-component';

/**
 * The MoveComponentCommand.
 *
 * Moves the section identified by `sourceSemanticId` (the Semantic Component
 * Identity of the section being moved) to a new position in the home page's
 * section order, immediately AFTER the section identified by
 * `targetSemanticId` (the Semantic Component Identity of the drop target).
 */
export interface MoveComponentCommand extends Command {
  /** The stable command type. */
  readonly type: typeof MOVE_COMPONENT_COMMAND;
  /** The Semantic Component Identity of the section being moved (ADR-012). */
  readonly sourceSemanticId: string;
  /** The Semantic Component Identity of the drop target (ADR-012). */
  readonly targetSemanticId: string;
  /** The id of the section that owns the source (if known). */
  readonly sectionId: CmsId;
}

/**
 * Creates a MoveComponentCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed MoveComponentCommand.
 */
export function createMoveComponentCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  sourceSemanticId: string;
  targetSemanticId: string;
  sectionId: CmsId;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): MoveComponentCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: MOVE_COMPONENT_COMMAND,
    commandId:
      params.commandId ??
      `cmd-${params.projectId}-${createdAt}-${params.sourceSemanticId}`,
    projectId: params.projectId,
    actorId: params.actorId,
    sourceSemanticId: params.sourceSemanticId,
    targetSemanticId: params.targetSemanticId,
    sectionId: params.sectionId,
    createdAt,
    requiredCapability: 'project:edit',
  };
}

/**
 * The MoveComponentHandler.
 *
 * Translates a MoveComponentCommand into an immutable ThemePatch. It reorders
 * the home page's `sectionIds` array so the source section sits immediately
 * AFTER the target section. It NEVER mutates the ThemeConfig.
 *
 * AMENDMENT G: The source and target are resolved by their Semantic Component
 * Identities (the first segment is the section id). This is a pure string
 * operation.
 *
 * HISTORY COMPATIBILITY: The produced SINGLE `replace` operation on the whole
 * `sectionIds` array is inverted by the existing InversePatchGenerator into a
 * `replace` restoring the ORIGINAL array, so Move is undoable with no new
 * infrastructure.
 */
export class MoveComponentHandler
  implements CommandHandler<MoveComponentCommand>
{
  /** The command type this handler supports. */
  readonly type = MOVE_COMPONENT_COMMAND;

  /**
   * Translates a MoveComponentCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the component move.
   */
  toPatch(command: MoveComponentCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // AMENDMENT G: The source and target Semantic Component Identities. The
    // first segment of each is the section id.
    const sourceSectionId = command.sourceSemanticId.split('.')[0];
    const targetSectionId = command.targetSemanticId.split('.')[0];

    // Locate the home page (the page that owns the section order). If no home
    // page exists, fall back to the first page.
    const homePageIndex = config.resources.pages.findIndex(
      (page) => page.isHome === true,
    );
    const pageIndex = homePageIndex === -1 ? 0 : homePageIndex;
    const page = config.resources.pages[pageIndex];
    if (!page) {
      throw new Error(
        `MoveComponentCommand: no page found in project "${command.projectId}".`,
      );
    }

    // The current section order (read-only; never mutated).
    const order = page.sectionIds;

    // Locate the source section in the order. If it does not exist, throw. This
    // is a deterministic guard owned by the Application Layer.
    const sourceIndex = order.indexOf(sourceSectionId);
    if (sourceIndex === -1) {
      throw new Error(
        `MoveComponentCommand: source section "${sourceSectionId}" not found in project "${command.projectId}".`,
      );
    }

    // Locate the target section in the order. If it does not exist, throw.
    const targetIndex = order.indexOf(targetSectionId);
    if (targetIndex === -1) {
      throw new Error(
        `MoveComponentCommand: target section "${targetSectionId}" not found in project "${command.projectId}".`,
      );
    }

    // A no-op move (source already immediately after target) produces an empty
    // reorder. We still emit a deterministic patch (the unchanged array) so the
    // pipeline and history remain uniform. The array is unchanged, so Undo is a
    // no-op too.
    const nextOrder = this.reorder(order, sourceIndex, targetIndex);

    // Produce an immutable patch: a SINGLE `replace` operation on the whole
    // `sectionIds` array. The InversePatchGenerator inverts this into a
    // `replace` restoring the ORIGINAL array (read from the base config), so
    // Move is fully undoable with no new history infrastructure.
    return {
      id: `patch-${command.projectId}-${command.createdAt}`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'replace',
          path: `resources.pages[${pageIndex}].sectionIds`,
          value: nextOrder,
        },
      ],
    };
  }

  /**
   * Reorders the section order so the source sits immediately AFTER the target.
   *
   * This is a pure array operation. It NEVER mutates the input array; it
   * returns a NEW array.
   *
   * @param order The current section order (read-only).
   * @param sourceIndex The current index of the source section.
   * @param targetIndex The current index of the target section.
   * @returns A NEW section order with the source moved after the target.
   */
  private reorder(
    order: string[],
    sourceIndex: number,
    targetIndex: number,
  ): string[] {
    const next = [...order];
    const [moved] = next.splice(sourceIndex, 1);

    // After removing the source, the target's index may shift if the source was
    // before it. Recompute the target's position in the reduced array.
    const adjustedTargetIndex =
      sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;

    // Insert the moved section immediately AFTER the target.
    next.splice(adjustedTargetIndex + 1, 0, moved);
    return next;
  }
}
