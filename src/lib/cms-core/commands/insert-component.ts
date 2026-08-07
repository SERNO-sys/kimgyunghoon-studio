/**
 * AWIE V2 - Phase 17.4: CMS Core - InsertComponentCommand.
 *
 * A concrete Command that inserts a NEW component into a Project's ThemeConfig,
 * positioned relative to a drop target identified by its Semantic Component
 * Identity (ADR-012 / Amendment G).
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The InsertComponentCommand is PURE INTENT. It declares WHICH component type
 * to insert and WHERE (relative to a Semantic Component Identity). It NEVER
 * mutates the ThemeConfig. The InsertComponentHandler translates it into an
 * immutable ThemePatch, which the ThemePatchPipeline applies to produce a NEW
 * ThemeConfig.
 *
 * AMENDMENT G / ADR-012: The Command binds to `targetSemanticId` — the Semantic
 * Component Identity of the drop target (e.g. "hero"). This is the ONLY
 * identity. It NEVER uses nodeId, DOM id, React key, RenderNode id, tree index,
 * or runtime UUID.
 *
 * AMENDMENT J (Drag Is Intent Only): This Command is intent only. The server
 * performs the actual Composition. The client NEVER applies it.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { ThemeConfig, SectionConfig } from '../../theme-config/v2/types';
import type { CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';
import type { Command, CommandHandler } from './types';

/** The stable command type for inserting a new component. */
export const INSERT_COMPONENT_COMMAND = 'composition.insert-component';

/**
 * The InsertComponentCommand.
 *
 * Inserts a NEW section of `componentType` into the Project, positioned AFTER
 * the section identified by `targetSemanticId` (the Semantic Component Identity
 * of the drop target). The new section is appended to the home page's section
 * order.
 */
export interface InsertComponentCommand extends Command {
  /** The stable command type. */
  readonly type: typeof INSERT_COMPONENT_COMMAND;
  /** The component type to insert (e.g. "gallery", "cta"). */
  readonly componentType: string;
  /** The Semantic Component Identity of the drop target (ADR-012). */
  readonly targetSemanticId: string;
  /** The id of the section that owns the drop target (if known). */
  readonly sectionId: CmsId;
}

/**
 * Creates an InsertComponentCommand.
 *
 * @param params The command parameters.
 * @returns A fully-formed InsertComponentCommand.
 */
export function createInsertComponentCommand(params: {
  projectId: CmsId;
  actorId: CmsId;
  componentType: string;
  targetSemanticId: string;
  sectionId: CmsId;
  commandId?: CmsId;
  createdAt?: Timestamp;
}): InsertComponentCommand {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    type: INSERT_COMPONENT_COMMAND,
    commandId:
      params.commandId ??
      `cmd-${params.projectId}-${createdAt}-${params.componentType}`,
    projectId: params.projectId,
    actorId: params.actorId,
    componentType: params.componentType,
    targetSemanticId: params.targetSemanticId,
    sectionId: params.sectionId,
    createdAt,
    requiredCapability: 'project:edit',
  };
}

/**
 * The InsertComponentHandler.
 *
 * Translates an InsertComponentCommand into an immutable ThemePatch. It creates
 * a NEW SectionConfig of the requested type, appends it to the resources, and
 * inserts it into the home page's section order AFTER the drop target. It NEVER
 * mutates the ThemeConfig.
 *
 * AMENDMENT G: The drop target is resolved by its Semantic Component Identity
 * (the first segment is the section id). This is a pure string operation.
 */
export class InsertComponentHandler
  implements CommandHandler<InsertComponentCommand>
{
  /** The command type this handler supports. */
  readonly type = INSERT_COMPONENT_COMMAND;

  /**
   * Translates an InsertComponentCommand into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the component insertion.
   */
  toPatch(command: InsertComponentCommand, currentConfig: unknown): ThemePatch {
    const config = currentConfig as ThemeConfig;

    // AMENDMENT G: The drop target's Semantic Component Identity. The first
    // segment is the section id after which the new component is inserted.
    const targetSectionId = command.targetSemanticId.split('.')[0];

    // Locate the drop target section. If it does not exist, throw. This is a
    // deterministic guard owned by the Application Layer.
    const targetIndex = config.resources.sections.findIndex(
      (section) => section.id === targetSectionId,
    );
    if (targetIndex === -1) {
      throw new Error(
        `InsertComponentCommand: drop target section "${targetSectionId}" not found in project "${command.projectId}".`,
      );
    }

    // Generate a stable, unique id for the new section. The id is derived from
    // the component type and the command id — a deterministic, semantic id.
    const newSectionId = `${command.componentType}-${command.commandId.slice(-8)}`;

    // Build the NEW SectionConfig. The content is a minimal, type-appropriate
    // scaffold. This is pure data modeling — no business logic.
    const newSection: SectionConfig = {
      id: newSectionId,
      type: this.toSectionType(command.componentType),
      content: this.defaultContent(command.componentType),
    };

    // Locate the home page (the page that owns the section order). If no home
    // page exists, fall back to the first page.
    const homePageIndex = config.resources.pages.findIndex(
      (page) => page.isHome === true,
    );
    const pageIndex = homePageIndex === -1 ? 0 : homePageIndex;
    const page = config.resources.pages[pageIndex];
    if (!page) {
      throw new Error(
        `InsertComponentCommand: no page found in project "${command.projectId}".`,
      );
    }

    // The insertion index in the page's section order: immediately AFTER the
    // drop target section.
    const insertAt = page.sectionIds.indexOf(targetSectionId) + 1;

    // Produce an immutable patch: add the new section to resources, then insert
    // its id into the page's section order after the drop target.
    return {
      id: `patch-${command.projectId}-${command.createdAt}`,
      baseConfigId: config.metadata.updatedAt,
      createdAt: command.createdAt,
      operations: [
        {
          op: 'add',
          path: `resources.sections[${config.resources.sections.length}]`,
          value: newSection,
        },
        {
          op: 'add',
          path: `resources.pages[${pageIndex}].sectionIds[${insertAt}]`,
          value: newSectionId,
        },
      ],
    };
  }

  /**
   * Maps a component type to a valid SectionType.
   *
   * This is a pure type mapping. Unknown component types fall back to 'custom'.
   */
  private toSectionType(componentType: string): SectionConfig['type'] {
    const known: ReadonlySet<string> = new Set([
      'hero',
      'text',
      'image',
      'gallery',
      'features',
      'testimonials',
      'cta',
      'contact',
      'footer',
    ]);
    return (known.has(componentType) ? componentType : 'custom') as SectionConfig['type'];
  }

  /**
   * Produces a minimal, type-appropriate content scaffold for a new section.
   *
   * This is pure data modeling — a deterministic default shape. It contains NO
   * business logic.
   */
  private defaultContent(componentType: string): Record<string, unknown> {
    switch (componentType) {
      case 'hero':
        return { heading: '새 히어로', subheading: '부제목을 입력하세요' };
      case 'text':
        return { body: '텍스트를 입력하세요' };
      case 'gallery':
        return { images: [] };
      case 'cta':
        return { heading: '새 CTA', buttonLabel: '버튼' };
      case 'contact':
        return { heading: '연락처', email: '' };
      default:
        return {};
    }
  }
}
