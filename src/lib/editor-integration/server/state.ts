/**
 * AWIE V2 - Phase I.5: Editor Integration - Shared Server-Side State.
 *
 * THE SINGLE SOURCE OF TRUTH FOR THE PUBLISH PIPELINE.
 *
 * This module owns the SINGLE shared instances of the ProjectRepository
 * (immutable VersionSnapshots + Release Pointer) and the PreviewSessionStore
 * (Draft ThemeConfig). It exists to enforce the Phase I.3 architectural
 * constraint:
 *
 *   "There must be exactly ONE publishing pipeline. All publish entry points
 *    must delegate to the same PublishOrchestrator."
 *
 * Every route that participates in the Publish / Version History / Delivery
 * flow MUST import its repository and preview store from THIS module — never
 * construct its own. This is what makes a publish from ANY entry point
 * (admin Publish button, CMS publish route) visible to the Version History
 * panel and the Delivery Layer (Public Serve API).
 *
 * ARCHITECTURAL MANDATES:
 *
 *   1. SHARED SINGLETON (MANDATE 1)
 *      The ProjectRepository is a server-side singleton shared by the Publish
 *      Workflow (writes snapshots + the Release Pointer), the Version History
 *      (reads snapshots), and the Delivery Layer (reads the Released snapshot).
 *      This is the ONLY way the Release path can actually serve a published
 *      snapshot.
 *
 *   2. DURABLE PERSISTENCE (PHASE I.5)
 *      The ProjectRepository is backed by the D1ProjectRepository, which
 *      persists immutable VersionSnapshots and the Release Pointer to Cloudflare
 *      D1. It resolves the D1 binding lazily per call and transparently falls
 *      back to the in-memory repository when no D1 binding is available (e.g.
 *      plain `next dev`). The wire contract is unchanged.
 *
 *   3. THE STORE IS PURE INFRASTRUCTURE
 *      The store holds immutable VersionSnapshots, the Release Pointer, and the
 *      Draft ThemeConfig. It NEVER renders, NEVER decides, and NEVER mutates a
 *      snapshot after creation. It is a plain persistence container.
 *
 *   4. SERVER-SIDE ONLY
 *      This module MUST NEVER be imported by the client. It is pure server-side
 *      infrastructure for the integration layer.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure server-side infrastructure for the integration layer.
 */

import type { ProjectRepository } from '../../cms-core';
import { D1ProjectRepository } from './d1-project-repository';
import { PreviewSessionStore } from './preview-session-store';


/**
 * HMR-SAFE SINGLETON KEY.
 *
 * Next.js Hot Module Replacement (HMR) re-evaluates module bodies during
 * development. If the singletons below were plain module-level `const`s, every
 * HMR cycle would construct a NEW InMemoryProjectRepository and a NEW
 * PreviewSessionStore — silently discarding all published VersionSnapshots,
 * the Release Pointer, and the Draft ThemeConfig. That would break the
 * "exactly ONE publishing pipeline" invariant mid-session.
 *
 * To survive HMR, the singletons are cached on `globalThis` (the process-wide
 * object that persists across module re-evaluations). The first evaluation
 * constructs the instances; every subsequent HMR re-evaluation reuses them.
 *
 * NOTE: This is a development-time hardening. In a production deployment the
 * repository would be backed by durable storage (D1); the wire contract is
 * unchanged. The `globalThis` cache is keyed with a unique symbol to avoid any
 * collision with other modules.
 */
const PROJECT_REPOSITORY_KEY = Symbol.for('awie.v2.projectRepository');
const PREVIEW_STORE_KEY = Symbol.for('awie.v2.previewStore');

// The globalThis cache object. Cast to a record so we can index it by symbol.
const globalCache = globalThis as unknown as Record<symbol, unknown>;

/**
 * The SINGLE shared ProjectRepository adapter.
 *
 * Holds the immutable VersionSnapshots and the Release Pointer for ALL
 * projects. Every publish entry point writes here; every Version History and
 * Delivery route reads from here. There is exactly ONE instance in the process
 * — cached on `globalThis` so it survives Next.js HMR during development.
 *
 * PHASE I.5 (Durable Persistence): The concrete adapter is the
 * D1ProjectRepository, which persists snapshots + the Release Pointer to
 * Cloudflare D1 and transparently falls back to the in-memory repository when
 * no D1 binding is available. The export is typed as the frozen
 * `ProjectRepository` INTERFACE, so no consumer can depend on a concrete class
 * — the adapter is replaceable in one week (CTO Rule).
 */
export const projectRepository: ProjectRepository =
  (globalCache[PROJECT_REPOSITORY_KEY] as ProjectRepository | undefined) ??
  (globalCache[PROJECT_REPOSITORY_KEY] = new D1ProjectRepository());


/**
 * The SINGLE shared PreviewSessionStore.
 *
 * Holds the Draft ThemeConfig (the working copy) and PreviewSession metadata
 * for ALL projects. The Publish Workflow reads the Draft from here; the
 * Version History reports Draft visibility from here. Cached on `globalThis`
 * so it survives Next.js HMR during development.
 */
export const previewStore: PreviewSessionStore =
  (globalCache[PREVIEW_STORE_KEY] as PreviewSessionStore | undefined) ??
  (globalCache[PREVIEW_STORE_KEY] = new PreviewSessionStore());


