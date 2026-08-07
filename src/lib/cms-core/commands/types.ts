/**
 * AWIE V2 - Phase 12: CMS Core - Command Types.
 *
 * The Command-Based Application Layer. Every user action is represented as an
 * explicit, immutable Command. The EditorService is merely an executor that
 * takes a Command and runs it. This explicitly enables Undo/Redo, History, and
 * Intent-level Audit Trails.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * A Command is PURE INTENT. It declares WHAT the user wants to do. It NEVER
 * mutates state directly. The EditorService (executor) translates the Command
 * into an immutable ThemePatch via the ThemePatchPipeline, and the patch is
 * applied to produce a NEW ThemeConfig.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling for the Application Layer.
 */

import type { CmsCapability, CmsId, Timestamp } from '../domain/types';
import type { ThemePatch } from '../patch/types';

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

/**
 * The discriminator of a Command.
 *
 * Each Command type has a stable, semantic type id. This is used for
 * intent-level audit trails and for the EditorService to route the Command to
 * its handler.
 */
export type CommandType = string;

/**
 * The UNIVERSAL Command contract.
 *
 * Every user action in the CMS is a Command. A Command is:
 *   - IDENTIFIED by a stable `type`.
 *   - TARGETED at a specific `projectId`.
 *   - AUTHORED by a specific `actorId` (the user issuing the command).
 *   - TIMESTAMPED at creation.
 *   - CAPABILITY-BOUND to the CmsCapability required to execute it.
 *
 * The Command carries PURE INTENT. It does NOT mutate anything. The executor
 * (EditorService) is responsible for translating and applying it.
 */
export interface Command {
  /** The stable, semantic command type (e.g. "content.update-heading"). */
  readonly type: CommandType;
  /**
   * The UNIQUE command id.
   *
   * Every Command MUST carry a unique commandId. This is crucial for Replay,
   * Retry, and Audit. The commandId is the stable identity of a single command
   * execution and is used to correlate the Command, its ThemePatch, its Inverse
   * Patch, and its AuditRecord.
   */
  readonly commandId: CmsId;
  /** The id of the Project this command targets. */
  readonly projectId: CmsId;
  /** The id of the user issuing the command. */
  readonly actorId: CmsId;
  /** When the command was created. */
  readonly createdAt: Timestamp;
  /** The capability required to execute this command. */
  readonly requiredCapability: CmsCapability;
}


// ---------------------------------------------------------------------------
// Command Result
// ---------------------------------------------------------------------------

/**
 * The result of executing a Command.
 *
 * The result carries the immutable ThemePatch that was produced (enabling
 * Undo/Redo and History) and the id of the NEW ThemeConfig that resulted from
 * applying the patch. The original ThemeConfig is never mutated.
 */
export interface CommandResult {
  /** The command that was executed. */
  readonly command: Command;
  /** The immutable ThemePatch produced by the command. */
  readonly patch: ThemePatch;
  /** The id of the NEW ThemeConfig produced by applying the patch. */
  readonly newConfigId: CmsId;
  /** When the command was executed. */
  readonly executedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Command Handler
// ---------------------------------------------------------------------------

/**
 * A Command Handler translates a Command into an immutable ThemePatch.
 *
 * A handler is a pure function: given a Command and the current ThemeConfig,
 * it produces a ThemePatch. It NEVER mutates the ThemeConfig. The ThemePatch
 * is then applied by the ThemePatchPipeline to produce a new config.
 */
export interface CommandHandler<C extends Command> {
  /** The command type this handler supports. */
  readonly type: CommandType;
  /**
   * Translates a Command into an immutable ThemePatch.
   *
   * @param command The command to translate.
   * @param currentConfig The current ThemeConfig (read-only; never mutated).
   * @returns The immutable ThemePatch describing the change.
   */
  toPatch(command: C, currentConfig: unknown): ThemePatch;
}
