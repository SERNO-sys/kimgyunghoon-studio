/**
 * AWIE V2 - Phase 12: CMS Core - EditorService.
 *
 * The EditorService is the EXECUTOR of the Command-Based Application Layer. It
 * takes a Command and runs it. It does NOT contain business logic; it
 * orchestrates the translation and application of Commands.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * The EditorService:
 *   1. AUTHORIZES the Command against the actor's role (RBAC).
 *   2. ROUTES the Command to its registered CommandHandler.
 *   3. TRANSLATES the Command into an immutable ThemePatch (via the handler).
 *   4. APPLIES the patch via the ThemePatchPipeline to produce a NEW ThemeConfig.
 *   5. RETURNS a CommandResult carrying the patch and the new config id.
 *
 * The EditorService NEVER mutates a ThemeConfig in place. It NEVER renders.
 * It is pure Application Layer orchestration.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure orchestration for the Application Layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { CmsRole } from '../domain/types';
import { can } from '../domain/types';
import type { ApplicationEventBus } from '../events/types';
import {
  createHeadingUpdatedEvent,
  createProjectPublishedEvent,
  createProjectReleasedEvent,
} from '../events/domain-events';

import type { ThemePatchPipeline } from '../patch/pipeline';
import type { Command, CommandHandler, CommandResult } from './types';
import { PUBLISH_PROJECT_COMMAND } from './publish-project';
import { RELEASE_PROJECT_COMMAND } from './release-project';
import { UPDATE_HEADING_COMMAND } from './update-heading';



/**
 * The EditorService executor.
 *
 * @typeParam C - The concrete Command type this executor handles.
 */
export class EditorService<C extends Command> {
  private readonly handlers = new Map<string, CommandHandler<C>>();

  /**
   * Constructs an EditorService.
   *
   * @param pipeline The ThemePatchPipeline used to apply patches.
   * @param getRole A function that resolves the actor's role for a project.
   * @param eventBus The ApplicationEventBus used to emit DomainEvents after a
   *   successful Command execution. Optional; if omitted, no events are emitted.
   */
  constructor(
    private readonly pipeline: ThemePatchPipeline,
    private readonly getRole: (actorId: string, projectId: string) => CmsRole,
    private readonly eventBus?: ApplicationEventBus,
  ) {}


  /**
   * Registers a CommandHandler for a command type.
   *
   * @param handler The handler to register.
   */
  register(handler: CommandHandler<C>): void {
    this.handlers.set(handler.type, handler);
  }

  /**
   * Executes a Command.
   *
   * @param command The command to execute.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The CommandResult carrying the patch and new config id.
   */
  execute(command: C, currentConfig: ThemeConfig): CommandResult {
    // 1. Authorize the Command against the actor's role.
    const role = this.getRole(command.actorId, command.projectId);
    if (!can(role, command.requiredCapability)) {
      throw new Error(
        `EditorService: actor "${command.actorId}" with role "${role}" is not permitted to execute "${command.type}".`,
      );
    }

    // 2. Route the Command to its registered handler.
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(
        `EditorService: no handler registered for command type "${command.type}".`,
      );
    }

    // 3. Translate the Command into an immutable ThemePatch.
    const patch = handler.toPatch(command, currentConfig);

    // 4. Apply the patch to produce a NEW ThemeConfig (original never mutated).
    const nextConfig = this.pipeline.apply(currentConfig, patch);

    // 5. Emit a DomainEvent after successful execution. The EditorService does
    //    NOT invoke side-effects directly; it merely emits the event. Isolated
    //    Subscribers (webhooks, search indexing, notifications) react to it.
    this.emitDomainEvent(command, nextConfig);

    // 6. Return the CommandResult.
    return {
      command,
      patch,
      newConfigId: nextConfig.metadata.updatedAt,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Emits the appropriate DomainEvent after a successful Command execution.
   *
   * The Application Layer is the SOLE publisher of Application Events. The
   * EditorService emits a ProjectPublished event when a PublishProjectCommand
   * succeeds, and a HeadingUpdated event when an UpdateHeadingCommand succeeds.
   * It NEVER invokes side-effects directly.
   *
   * @param command The command that was executed.
   * @param nextConfig The NEW ThemeConfig produced by applying the patch.
   */
  private emitDomainEvent(command: C, nextConfig: ThemeConfig): void {
    if (!this.eventBus) {
      return;
    }

    const occurredAt = new Date().toISOString();

    if (command.type === PUBLISH_PROJECT_COMMAND) {
      const publish = command as unknown as {
        projectId: string;
        actorId: string;
        version: string;
      };
      this.eventBus.publish(
        createProjectPublishedEvent({
          eventId: `evt-${command.commandId}-published`,
          projectId: publish.projectId,
          snapshotId: `snap-${command.commandId}`,
          themeConfigId: nextConfig.metadata.updatedAt,
          publishedBy: publish.actorId,
          occurredAt,
          metadata: { commandId: command.commandId, version: publish.version },
        }),
      );
      return;
    }

    if (command.type === RELEASE_PROJECT_COMMAND) {
      const release = command as unknown as {
        projectId: string;
        actorId: string;
        snapshotId: string;
      };
      this.eventBus.publish(
        createProjectReleasedEvent({
          eventId: `evt-${command.commandId}-released`,
          projectId: release.projectId,
          snapshotId: release.snapshotId,
          themeConfigId: nextConfig.metadata.updatedAt,
          releasedBy: release.actorId,
          occurredAt,
          metadata: { commandId: command.commandId },
        }),
      );
      return;
    }

    if (command.type === UPDATE_HEADING_COMMAND) {
      const update = command as unknown as {
        projectId: string;
        actorId: string;
        sectionId: string;
        heading: string;
      };
      this.eventBus.publish(
        createHeadingUpdatedEvent({
          eventId: `evt-${command.commandId}-heading`,
          projectId: update.projectId,
          sectionId: update.sectionId,
          heading: update.heading,
          editedBy: update.actorId,
          occurredAt,
          metadata: { commandId: command.commandId },
        }),
      );
      return;
    }
  }
}



