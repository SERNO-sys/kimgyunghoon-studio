/**
 * AWIE V2 - Phase 12.5: Editor Integration - Preview Session Store.
 *
 * The Preview Session Store manages the Draft/Preview state of a Project,
 * DECOUPLED from the Published state. It is SERVER-SIDE ONLY and MUST NEVER be
 * imported by the client.
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. PREVIEW SESSIONS DECOUPLE EDITOR STATE FROM PUBLISHED STATE
 *      When the UI sends a Command, it is modifying the Draft/Preview Session,
 *      NOT the Published state. Publishing is a separate, explicit Command.
 *      This store is the server-side container for that Draft state.
 *
 *   2. AUTOSAVE READINESS
 *      The store tracks the highest clientSequence applied. This enables the
 *      server to detect out-of-order or duplicate Commands (idempotent replay)
 *      and to reconstruct the Draft state from a sequence of Commands (event
 *      sourcing). For now, the client strictly relies on the server's returned
 *      RenderNode.
 *
 *   3. THE STORE IS PURE INFRASTRUCTURE
 *      The store holds the Draft ThemeConfig (the working copy) and the
 *      PreviewSession metadata. It NEVER renders and NEVER decides. It is a
 *      plain in-memory container for the integration layer.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import type { ThemeConfig } from '../../theme-config/v2/types';
import type { PreviewSession } from '../types';

/**
 * The Preview Session Store.
 *
 * Holds the Draft ThemeConfig (the working copy) and the PreviewSession
 * metadata for each Project. It is a plain in-memory container. It NEVER
 * renders and NEVER decides.
 */
export class PreviewSessionStore {
  /** The Draft ThemeConfig per project (the working copy). */
  private readonly drafts = new Map<string, ThemeConfig>();
  /** The PreviewSession metadata per project. */
  private readonly sessions = new Map<string, PreviewSession>();

  /**
   * Creates or returns the Preview Session for a project.
   *
   * If a session already exists, it is returned unchanged. If not, a new
   * session is created seeded with the project's initial Draft ThemeConfig.
   *
   * @param projectId The id of the Project.
   * @param initialDraft The initial Draft ThemeConfig (the working copy).
   * @returns The PreviewSession for the project.
   */
  getOrCreate(projectId: string, initialDraft: ThemeConfig): PreviewSession {
    const existing = this.sessions.get(projectId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const session: PreviewSession = {
      id: `session-${projectId}`,
      projectId,
      latestSnapshotId: `snap-${projectId}-initial`,
      lastAppliedSequence: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(projectId, session);
    this.drafts.set(projectId, initialDraft);
    return session;
  }

  /**
   * Returns the current Draft ThemeConfig for a project.
   *
   * @param projectId The id of the Project.
   * @returns The Draft ThemeConfig, or undefined if no session exists.
   */
  getDraft(projectId: string): ThemeConfig | undefined {
    return this.drafts.get(projectId);
  }

  /**
   * Persists a NEW Draft ThemeConfig and advances the Preview Session.
   *
   * This is the Preview Session's write path. It updates the Draft working copy
   * and advances the session's latestSnapshotId and lastAppliedSequence. The
   * Published state is NEVER touched here.
   *
   * @param projectId The id of the Project.
   * @param nextDraft The NEW Draft ThemeConfig.
   * @param snapshotId The id of the snapshot produced by the Command.
   * @param clientSequence The clientSequence of the Command (Autosave readiness).
   */
  saveDraft(
    projectId: string,
    nextDraft: ThemeConfig,
    snapshotId: string,
    clientSequence: number,
  ): void {
    this.drafts.set(projectId, nextDraft);

    const session = this.sessions.get(projectId);
    if (session) {
      this.sessions.set(projectId, {
        ...session,
        latestSnapshotId: snapshotId,
        lastAppliedSequence: Math.max(session.lastAppliedSequence, clientSequence),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Returns the Preview Session for a project.
   *
   * @param projectId The id of the Project.
   * @returns The PreviewSession, or undefined if no session exists.
   */
  getSession(projectId: string): PreviewSession | undefined {
    return this.sessions.get(projectId);
  }
}
