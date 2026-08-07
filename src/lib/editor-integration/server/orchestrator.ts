/**
 * AWIE V2 - Phase 12.5: Editor Integration - Server-Side Orchestrator.
 *
 * The Server-Side Orchestrator is the ONLY place where the Application Layer
 * and the Runtime Layer interact. It is SERVER-SIDE ONLY and MUST NEVER be
 * imported by the client.
 *
 * THE FLOW (MANDATE 1):
 *
 *   API receives a Command (wire payload)
 *     -> EditorService executes it (Application Layer)
 *     -> ThemePatchPipeline updates the ThemeConfig (SSOT)
 *     -> GoldenPathOrchestrator generates a NEW RenderNode tree (Runtime Layer)
 *     -> API returns a CommandResult { success, commandId, snapshotId, preview }
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The client NEVER receives or holds the ThemeConfig. It receives ONLY
 *      the RenderNode preview. This orchestrator is the boundary that enforces
 *      that rule.
 *
 *   2. LAYER BOUNDARIES PRESERVED
 *      - The EditorService (Application) executes Commands and produces a NEW
 *        ThemeConfig. It NEVER renders.
 *      - The GoldenPathOrchestrator (Runtime) renders the ThemeConfig into a
 *        RenderNode. It NEVER decides.
 *      This orchestrator merely composes them. It NEVER moves a responsibility
 *      across a boundary.
 *
 *   3. PREVIEW SESSIONS
 *      The Editor state is DECOUPLED from the Published state via a Preview
 *      Session. Each Command produces a NEW snapshot. The Published state is
 *      NEVER mutated by a Preview Session Command.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side orchestration for the integration layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type {
  Command,
  CommandResult,
  DeleteComponentCommand,
  EditorService,
  InsertComponentCommand,
  UpdateComponentCommand,
  UpdateHeadingCommand,
} from '../../cms-core';
import {
  CommandHistoryManager,
  InversePatchGenerator,
  ThemePatchPipeline,
  DELETE_COMPONENT_COMMAND,
  INSERT_COMPONENT_COMMAND,
  UPDATE_COMPONENT_COMMAND,
  UPDATE_HEADING_COMMAND,
} from '../../cms-core';

import type { GoldenPathOrchestrator } from '../../golden-path';
import type {
  EditorCommandPayload,
  EditorCommandResult,
  EditorHistoryResult,
} from '../types';



/**
 * The Server-Side Orchestrator.
 *
 * Composes the Application Layer (EditorService) and the Runtime Layer
 * (GoldenPathOrchestrator). It is constructed with the pre-built EditorService
 * and GoldenPathOrchestrator. It NEVER decides; it only wires.
 */
export class ServerSideOrchestrator {
  /**
   * The Command History Manager (Application Layer infrastructure).
   *
   * PHASE 17.9 - HISTORY: The orchestrator owns the per-project command history.
   * Every forward Command is recorded (with its forward ThemePatch AND its
   * Inverse Patch) so Undo/Redo can be served by the CommandHistoryManager.
   * History is AWIE IP (Section 4); it is NOT re-implemented here — it is
   * composed from the existing cms-core infrastructure.
   */
  private readonly history = new CommandHistoryManager();
  /** Derives the Inverse Patch of a forward ThemePatch (cms-core infrastructure). */
  private readonly inverseGenerator = new InversePatchGenerator();

  /**
   * Constructs the Server-Side Orchestrator.
   *
   * @param editorService The Application Layer executor (Commands -> ThemeConfig).
   * @param goldenPath The Runtime Layer orchestrator (ThemeConfig -> RenderNode).
   * @param getDraftConfig A function that resolves the current Draft ThemeConfig
   *   for a project. This is the Preview Session's working copy, decoupled from
   *   the Published state.
   * @param saveDraftConfig A function that persists the NEW Draft ThemeConfig
   *   produced by a Command. This is the Preview Session's write path.
   */
  constructor(
    private readonly editorService: EditorService<Command>,
    private readonly goldenPath: GoldenPathOrchestrator,
    private readonly getDraftConfig: (projectId: string) => ThemeConfig,
    private readonly saveDraftConfig: (projectId: string, config: ThemeConfig) => void,
  ) {}


  /**
   * Executes a Command wire payload and returns the RenderNode preview.
   *
   * The flow:
   *   1. Resolve the current Draft ThemeConfig (Preview Session working copy).
   *   2. Translate the wire payload into a full Command (adding actorId,
   *      createdAt, requiredCapability).
   *   3. Execute the Command via the EditorService (Application Layer). This
   *      produces a NEW ThemeConfig via the ThemePatchPipeline.
   *   4. Persist the NEW Draft ThemeConfig (Preview Session write path).
   *   5. Invoke the GoldenPathOrchestrator (Runtime Layer) to generate a NEW
   *      RenderNode tree.
   *   6. Return the CommandResult carrying the RenderNode preview.
   *
   * The client receives ONLY the RenderNode preview. It NEVER receives or holds
   * the ThemeConfig.
   *
   * @param projectId The id of the Project being edited.
   * @param actorId The id of the user issuing the Command.
   * @param payload The Command wire payload from the client.
   * @param pageId The id of the page to render in the preview.
   * @returns The EditorCommandResult carrying the RenderNode preview.
   */
  execute(
    projectId: string,
    actorId: string,
    payload: EditorCommandPayload,
    pageId: string,
  ): EditorCommandResult {
    // 1. Resolve the current Draft ThemeConfig (Preview Session working copy).
    const draftConfig = this.getDraftConfig(projectId);

    // 2. Translate the wire payload into a full Command. The client never knows
    //    the internal Command shape; the server adds the actor identity and
    //    timestamps. This is pure translation, NOT business logic.
    const command = this.translateCommand(projectId, actorId, payload);

    // 3. Execute the Command via the EditorService (Application Layer). This
    //    produces a NEW ThemeConfig via the ThemePatchPipeline. The original
    //    Draft ThemeConfig is NEVER mutated.
    const result = this.editorService.execute(command, draftConfig);

    // 4. Persist the NEW Draft ThemeConfig (Preview Session write path). The
    //    Published state is NEVER touched by a Preview Session Command.
    const nextConfig = this.applyResultToDraft(draftConfig, result);
    this.saveDraftConfig(projectId, nextConfig);

    // 4b. PHASE 17.9 - HISTORY: Record the Command in the CommandHistoryManager.
    //     The forward ThemePatch AND its Inverse Patch are stored together, so
    //     Undo/Redo can be served by the existing cms-core infrastructure. The
    //     Inverse Patch is derived from the forward patch and the base config
    //     (the config the patch was applied to). History generates no patches;
    //     it only records them.
    this.history.record({
      commandId: command.commandId,
      projectId,
      patch: result.patch,
      inverse: this.inverseGenerator.generate(
        result.patch,
        command.commandId,
        draftConfig,
      ),
      executedAt: new Date().toISOString(),
    });

    // 5. Invoke the GoldenPathOrchestrator (Runtime Layer) to generate a NEW
    //    RenderNode tree. The Runtime NEVER decides; it only renders.
    const render = this.goldenPath.renderPage(nextConfig, pageId, {
      preview: true,
    });


    // 6. Return the CommandResult carrying the RenderNode preview. The client
    //    receives ONLY the preview — never the ThemeConfig.
    return {
      success: true,
      commandId: command.commandId,
      snapshotId: `snap-${projectId}-${command.commandId}`,
      preview: render.renderNode,
      pageId,
    };
  }

  /**
   * Translates a wire payload into a full Command.
   *
   * The wire payload is deliberately decoupled from the internal Command model.
   * This method adds the actor identity and timestamps. It is pure translation,
   * NOT business logic.
   *
   * @param projectId The id of the Project being edited.
   * @param actorId The id of the user issuing the Command.
   * @param payload The Command wire payload from the client.
   * @returns A fully-formed Command.
   */
  private translateCommand(
    projectId: string,
    actorId: string,
    payload: EditorCommandPayload,
  ):
    | UpdateHeadingCommand
    | UpdateComponentCommand
    | InsertComponentCommand
    | DeleteComponentCommand {
    const createdAt = new Date().toISOString();

    switch (payload.type) {
      case UPDATE_HEADING_COMMAND:
        return {
          type: UPDATE_HEADING_COMMAND,
          commandId: payload.commandId,
          projectId,
          actorId,
          sectionId: payload.sectionId ?? '',
          heading: payload.value ?? '',
          createdAt,
          requiredCapability: 'project:edit',
        };

      // PHASE 17.6 - INLINE EDITING: The client emits an UpdateComponentCommand
      // (Semantic Component Identity based, ADR-012 / Amendment G) when an
      // inline edit is committed. The server translates the wire payload into a
      // full Command and executes it via the EditorService.
      case UPDATE_COMPONENT_COMMAND: {
        // The wire payload's `value` is a JSON string carrying the Semantic
        // Component Identity and the new text value (see inline-editing.ts).
        let semanticId = '';
        let value = '';
        try {
          const parsed = JSON.parse(payload.value ?? '{}') as {
            semanticId?: string;
            value?: string;
          };
          semanticId = parsed.semanticId ?? '';
          value = parsed.value ?? '';
        } catch {
          // Fall back to the raw payload value if it is not JSON.
          semanticId = payload.sectionId ?? '';
          value = payload.value ?? '';
        }
        return {
          type: UPDATE_COMPONENT_COMMAND,
          commandId: payload.commandId,
          projectId,
          actorId,
          semanticId,
          sectionId: payload.sectionId ?? '',
          value,
          createdAt,
          requiredCapability: 'project:edit',
        };
      }

      // PHASE 17.4 - DRAG & DROP: The client emits an InsertComponentCommand
      // when a palette item is dropped onto a section (ADR-014 / Amendment J).
      // The server translates the wire payload into a full Command and executes
      // it via the EditorService.
      case INSERT_COMPONENT_COMMAND: {
        // The wire payload's `value` is a JSON string carrying the source
        // component id and the drop target's Semantic Component Identity (see
        // drop-intent.ts).
        let componentType = '';
        let targetSemanticId = '';
        try {
          const parsed = JSON.parse(payload.value ?? '{}') as {
            sourceComponentId?: string;
            targetSemanticId?: string;
          };
          componentType = parsed.sourceComponentId ?? '';
          targetSemanticId = parsed.targetSemanticId ?? '';
        } catch {
          // Fall back to the raw payload value if it is not JSON.
          componentType = payload.value ?? '';
          targetSemanticId = payload.sectionId ?? '';
        }
        return {
          type: INSERT_COMPONENT_COMMAND,
          commandId: payload.commandId,
          projectId,
          actorId,
          componentType,
          targetSemanticId,
          sectionId: payload.sectionId ?? '',
          createdAt,
          requiredCapability: 'project:edit',
        };
      }

      // PHASE 17.7 - COMPONENT DELETION: The client emits a
      // DeleteComponentCommand (Semantic Component Identity based, ADR-012 /
      // Amendment G) when a component is deleted. The server translates the wire
      // payload into a full Command and executes it via the EditorService. The
      // produced `remove` operations are inverted by the existing
      // InversePatchGenerator, so Delete is fully undoable with no new history
      // infrastructure.
      case DELETE_COMPONENT_COMMAND: {
        // The wire payload's `value` is a JSON string carrying the Semantic
        // Component Identity of the component to delete (see selection-model.ts).
        let semanticId = '';
        try {
          const parsed = JSON.parse(payload.value ?? '{}') as {
            semanticId?: string;
          };
          semanticId = parsed.semanticId ?? '';
        } catch {
          // Fall back to the raw payload value if it is not JSON.
          semanticId = payload.sectionId ?? '';
        }
        return {
          type: DELETE_COMPONENT_COMMAND,
          commandId: payload.commandId,
          projectId,
          actorId,
          semanticId,
          sectionId: payload.sectionId ?? '',
          createdAt,
          requiredCapability: 'project:edit',
        };
      }

      default:
        throw new Error(
          `ServerSideOrchestrator: unsupported command type "${payload.type}".`,
        );
    }
  }


  /**
   * Applies the EditorService result to the Draft ThemeConfig.
   *
   * The EditorService returns a CommandResult carrying the ThemePatch and the
   * new config id. The orchestrator applies the patch to the Draft ThemeConfig
   * via the ThemePatchPipeline to produce the NEW Draft ThemeConfig. This is
   * the Preview Session's write path.
   *
   * NOTE: The EditorService already applies the patch internally to produce the
   * new config id. Here we re-apply the patch to the Draft working copy so the
   * orchestrator holds the concrete NEW ThemeConfig for rendering. The original
   * Draft is NEVER mutated.
   *
   * @param draftConfig The current Draft ThemeConfig (read-only).
   * @param result The EditorService CommandResult.
   * @returns The NEW Draft ThemeConfig.
   */
  private applyResultToDraft(
    draftConfig: ThemeConfig,
    result: CommandResult,
  ): ThemeConfig {
    // The EditorService's ThemePatchPipeline already produced the new config.
    // We reconstruct it here by applying the patch to the Draft working copy.
    // This keeps the orchestrator in full control of the Preview Session state.
    const pipeline = new ThemePatchPipeline();
    return pipeline.apply(draftConfig, result.patch);
  }

  /**
   * Undoes the most recent Command for a Project.
   *
   * PHASE 17.9 - HISTORY: Undo is a SYSTEM CONTROL operation, NOT a Domain
   * Intent. It NEVER travels through the Command API. The orchestrator asks the
   * CommandHistoryManager for the Inverse Patch of the most recent Command,
   * applies it to the current Draft ThemeConfig via the ThemePatchPipeline, and
   * re-renders the preview. History generates no patches; it only supplies them.
   *
   * The client receives ONLY the RenderNode preview plus the canUndo/canRedo
   * flags. It NEVER receives or holds the ThemeConfig.
   *
   * @param projectId The id of the Project being edited.
   * @param pageId The id of the page to render in the preview.
   * @returns The EditorHistoryResult carrying the RenderNode preview, or an
   *   error if there is nothing to undo.
   */
  undo(projectId: string, pageId: string): EditorHistoryResult {
    const inverse = this.history.undo(projectId);
    if (!inverse) {
      throw new Error(
        `ServerSideOrchestrator: nothing to undo for project "${projectId}".`,
      );
    }

    // Apply the Inverse Patch to the current Draft ThemeConfig. This restores
    // the config to its prior state. The original Draft is NEVER mutated.
    const draftConfig = this.getDraftConfig(projectId);
    const pipeline = new ThemePatchPipeline();
    const restoredConfig = pipeline.apply(draftConfig, inverse);
    this.saveDraftConfig(projectId, restoredConfig);

    // Re-render the preview from the restored config.
    const render = this.goldenPath.renderPage(restoredConfig, pageId, {
      preview: true,
    });

    return {
      success: true,
      projectId,
      snapshotId: `snap-${projectId}-undo-${inverse.id}`,
      preview: render.renderNode,
      pageId,
      canUndo: this.history.canUndo(projectId),
      canRedo: this.history.canRedo(projectId),
    };
  }

  /**
   * Redoes the most recently undone Command for a Project.
   *
   * PHASE 17.9 - HISTORY: Redo is a SYSTEM CONTROL operation, NOT a Domain
   * Intent. It NEVER travels through the Command API. The orchestrator asks the
   * CommandHistoryManager for the forward Patch of the most recently undone
   * Command, applies it to the current Draft ThemeConfig via the
   * ThemePatchPipeline, and re-renders the preview. History generates no
   * patches; it only supplies them.
   *
   * The client receives ONLY the RenderNode preview plus the canUndo/canRedo
   * flags. It NEVER receives or holds the ThemeConfig.
   *
   * @param projectId The id of the Project being edited.
   * @param pageId The id of the page to render in the preview.
   * @returns The EditorHistoryResult carrying the RenderNode preview, or an
   *   error if there is nothing to redo.
   */
  redo(projectId: string, pageId: string): EditorHistoryResult {
    const patch = this.history.redo(projectId);
    if (!patch) {
      throw new Error(
        `ServerSideOrchestrator: nothing to redo for project "${projectId}".`,
      );
    }

    // Apply the forward Patch to the current Draft ThemeConfig. This re-applies
    // the reverted Command. The original Draft is NEVER mutated.
    const draftConfig = this.getDraftConfig(projectId);
    const pipeline = new ThemePatchPipeline();
    const restoredConfig = pipeline.apply(draftConfig, patch);
    this.saveDraftConfig(projectId, restoredConfig);

    // Re-render the preview from the restored config.
    const render = this.goldenPath.renderPage(restoredConfig, pageId, {
      preview: true,
    });

    return {
      success: true,
      projectId,
      snapshotId: `snap-${projectId}-redo-${patch.id}`,
      preview: render.renderNode,
      pageId,
      canUndo: this.history.canUndo(projectId),
      canRedo: this.history.canRedo(projectId),
    };
  }
}


