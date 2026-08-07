/**
 * AWIE V2 - Phase 12.5: Editor Integration - Wire Contracts.
 *
 * The Editor Integration layer defines the WIRE CONTRACT between the
 * Server-Side Orchestration API (the ONLY place the Application Layer and the
 * Runtime Layer interact) and the Dumb React Viewer (the client UI).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      The React UI NEVER instantiates or orchestrates the Runtime. It does
 *      NOT hold or mutate the ThemeConfig. It strictly sends Commands via HTTP
 *      POST and renders the RenderNode snapshot returned by the server.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      The Next.js API Route is the ONLY place where the Application Layer
 *      (EditorService -> PatchPipeline) and the Runtime Layer
 *      (GoldenPathOrchestrator -> RenderNode) interact. The client NEVER
 *      imports the GoldenPathOrchestrator or any Runtime service.
 *
 *   3. PREVIEW SESSIONS
 *      The Editor state is DECOUPLED from the Published state via a Preview
 *      Session. When the UI sends a Command, it is modifying the Draft/Preview
 *      Session, NOT the Published state. The server returns a NEW RenderNode
 *      snapshot for each Command.
 *
 *   4. AUTOSAVE READINESS
 *      The Command payload is designed to support future Autosave and
 *      Optimistic UI updates. Each Command carries a stable commandId and a
 *      client-generated sequence, enabling idempotent replay and optimistic
 *      reconciliation. For now, the client strictly relies on the server's
 *      returned RenderNode.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure wire-contract modeling for the integration layer.
 */

import type { RenderNode } from '../renderer-foundation';
import type { CommandType } from '../cms-core';

// ---------------------------------------------------------------------------
// Command Wire Payload (Client -> Server)
// ---------------------------------------------------------------------------

/**
 * The wire payload a Dumb Client sends to the Server-Side Orchestration API.
 *
 * This is the PURE INTENT of a user action. It is deliberately decoupled from
 * the internal Command model so the client never needs to know the Application
 * Layer's internal Command shape. The server translates this wire payload into
 * a full Command (adding actorId, createdAt, requiredCapability) before
 * executing it.
 *
 * AUTOSAVE READINESS: The `clientSequence` is a monotonically increasing
 * per-session counter. It enables the server to detect out-of-order or
 * duplicate Commands (idempotent replay) and the client to reconcile optimistic
 * updates. For now it is informational; the client strictly relies on the
 * server's returned RenderNode.
 */
export interface EditorCommandPayload {
  /** The stable, semantic command type (e.g. "content.update-heading"). */
  readonly type: CommandType;
  /**
   * A client-generated unique command id. Enables idempotent replay and
   * optimistic reconciliation (Autosave readiness).
   */
  readonly commandId: string;
  /** The id of the section being edited (command-specific). */
  readonly sectionId?: string;
  /** The new value (command-specific). */
  readonly value?: string;
  /** A monotonically increasing per-session sequence (Autosave readiness). */
  readonly clientSequence: number;
}

// ---------------------------------------------------------------------------
// Command Result Wire Contract (Server -> Client)
// ---------------------------------------------------------------------------

/**
 * The result of executing a Command, returned by the Server-Side Orchestration
 * API.
 *
 * The server executes the Command (Application Layer), applies the resulting
 * ThemePatch to produce a NEW ThemeConfig, and invokes the
 * GoldenPathOrchestrator (Runtime Layer) to generate a NEW RenderNode tree.
 * The client receives ONLY the RenderNode preview — it NEVER receives or holds
 * the ThemeConfig.
 *
 * The `snapshotId` identifies the Preview Session snapshot produced by this
 * Command. It is the stable identity of the Draft/Preview state after this
 * Command, decoupled from the Published state.
 */
export interface EditorCommandResult {
  /** Whether the Command executed successfully. */
  readonly success: true;
  /** The id of the Command that was executed. */
  readonly commandId: string;
  /** The id of the Preview Session snapshot produced by this Command. */
  readonly snapshotId: string;
  /** The framework-agnostic RenderNode tree (the preview to render). */
  readonly preview: RenderNode;
  /** The id of the page that was rendered. */
  readonly pageId: string;
}

/**
 * The error result returned by the Server-Side Orchestration API when a
 * Command fails.
 */
export interface EditorCommandError {
  /** Always false for an error result. */
  readonly success: false;
  /** The id of the Command that failed (if known). */
  readonly commandId?: string;
  /** A human-readable error message. */
  readonly error: string;
}

/**
 * The union of possible API responses.
 */
export type EditorCommandResponse = EditorCommandResult | EditorCommandError;

// ---------------------------------------------------------------------------
// History Wire Contract (Server -> Client)
// ---------------------------------------------------------------------------

/**
 * The result of an Undo/Redo operation, returned by the History API.
 *
 * Undo/Redo are SYSTEM CONTROL commands, NOT Domain Intents. They are served by
 * dedicated endpoints (/history/undo, /history/redo) and NEVER travel through
 * the Command API. The server retrieves the appropriate Patch/InversePatch from
 * the CommandHistoryManager and pushes it through the PatchPipeline to restore
 * the ThemeConfig. History generates no patches; it only supplies them.
 *
 * The client receives ONLY the RenderNode preview — it NEVER receives or holds
 * the ThemeConfig.
 */
export interface EditorHistoryResult {
  /** Whether the operation succeeded. */
  readonly success: true;
  /** The id of the project the operation targeted. */
  readonly projectId: string;
  /** The id of the Preview Session snapshot produced by this operation. */
  readonly snapshotId: string;
  /** The framework-agnostic RenderNode tree (the preview to render). */
  readonly preview: RenderNode;
  /** The id of the page that was rendered. */
  readonly pageId: string;
  /** Whether there is more history to undo after this operation. */
  readonly canUndo: boolean;
  /** Whether there is more history to redo after this operation. */
  readonly canRedo: boolean;
}

/**
 * The error result returned by the History API when an Undo/Redo fails.
 */
export interface EditorHistoryError {
  /** Always false for an error result. */
  readonly success: false;
  /** A human-readable error message. */
  readonly error: string;
}

/**
 * The union of possible History API responses.
 */
export type EditorHistoryResponse = EditorHistoryResult | EditorHistoryError;


// ---------------------------------------------------------------------------
// Preview Session
// ---------------------------------------------------------------------------

/**
 * A Preview Session decouples the Editor (Draft) state from the Published
 * state.
 *
 * A Preview Session is a named, versioned container of Draft/Preview snapshots.
 * Each Command produces a NEW snapshot (identified by snapshotId). The
 * Published state is NEVER mutated by a Preview Session Command; publishing is
 * a separate, explicit Command.
 *
 * AUTOSAVE READINESS: The session tracks the latest snapshot and the sequence
 * of Commands applied. This enables the server to reconstruct the Draft state
 * from a sequence of Commands (event sourcing) and to support future Autosave
 * and Optimistic UI.
 */
export interface PreviewSession {
  /** The stable id of the Preview Session. */
  readonly id: string;
  /** The id of the Project this session edits. */
  readonly projectId: string;
  /** The id of the latest snapshot in this session. */
  readonly latestSnapshotId: string;
  /** The highest clientSequence applied so far (Autosave readiness). */
  readonly lastAppliedSequence: number;
  /** When the session was created. */
  readonly createdAt: string;
  /** When the session was last updated. */
  readonly updatedAt: string;
}
