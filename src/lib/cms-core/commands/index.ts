/**
 * AWIE V2 - Phase 12: CMS Core - Commands barrel export.
 *
 * Re-exports the Command-Based Application Layer: the UNIVERSAL Command
 * contract, the CommandHandler contract, the EditorService executor, and the
 * concrete UpdateHeadingCommand.
 *
 * THE GOLDEN RULE (MANDATE 4):
 *   The CMS (Application) handles Users, Commands, Audits, and Permissions.
 *   The Core Engine (Runtime) handles Rendering, Caching, and Executing.
 *   NEVER mix them.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure intent modeling + orchestration for the Application Layer.
 */

export type {
  Command,
  CommandHandler,
  CommandResult,
  CommandType,
} from './types';

export { EditorService } from './editor-service';

export {
  createUpdateHeadingCommand,
  UpdateHeadingHandler,
  UPDATE_HEADING_COMMAND,
} from './update-heading';
export type { UpdateHeadingCommand } from './update-heading';

export {
  createUpdateComponentCommand,
  UpdateComponentHandler,
  UPDATE_COMPONENT_COMMAND,
} from './update-component';
export type { UpdateComponentCommand } from './update-component';

export {
  createInsertComponentCommand,
  InsertComponentHandler,
  INSERT_COMPONENT_COMMAND,
} from './insert-component';
export type { InsertComponentCommand } from './insert-component';

export {
  createDeleteComponentCommand,
  DeleteComponentHandler,
  DELETE_COMPONENT_COMMAND,
} from './delete-component';
export type { DeleteComponentCommand } from './delete-component';

export {
  createMoveComponentCommand,
  MoveComponentHandler,
  MOVE_COMPONENT_COMMAND,
} from './move-component';
export type { MoveComponentCommand } from './move-component';

export {
  createPublishProjectCommand,
  PublishProjectHandler,
  PUBLISH_PROJECT_COMMAND,
} from './publish-project';

export type { PublishProjectCommand } from './publish-project';

export {
  createReleaseProjectCommand,
  ReleaseProjectHandler,
  RELEASE_PROJECT_COMMAND,
} from './release-project';
export type { ReleaseProjectCommand } from './release-project';



