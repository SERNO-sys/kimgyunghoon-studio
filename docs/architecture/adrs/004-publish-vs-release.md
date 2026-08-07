# ADR 004 — Publish vs Release (Release Pointer & Rollback)

> **Status:** Accepted
> **Date:** 2026-08-06
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 12.6 — Core Freeze & ADR Lock (Pre-Phase 13)

---

## Context

The CMS needs to make a Project's content publicly available. Two operations
were conflated in early thinking:

1. **Publish** — freezing the current Draft into a versioned artifact.
2. **Release** — making a specific version the "Live" public version.

If these are a single operation, then every publish immediately goes live. This
makes it impossible to:
- Preview a version before it goes live.
- Schedule a release.
- Roll back to a previous version without re-publishing.
- Support Blue/Green or Stage environments.

We needed a mechanism that separates the act of **creating a version** from the
act of **designating it as live**, and that enables **instant rollback**.

## Decision

**Publish and Release are SEPARATE operations.**

- **Publish** FREEZES the current Draft into an immutable `VersionSnapshot`. It
  does **NOT** make the snapshot live.
- **Release** designates a SPECIFIC `VersionSnapshot` as the active "Live"
  version by updating the Project's **Current Release Pointer**.

### The Release Pointer Architecture

The Release Pointer is a **thin, mutable designation** (just a snapshot id) that
resolves to the active `VersionSnapshot`. It is separate from the immutable
snapshot itself.

- A Project may have **many** Published snapshots, but only **ONE** Released
  (Live) snapshot at a time.
- **Rollback** is achieved by simply **re-pointing** the Release Pointer at a
  previous snapshot id. The snapshots themselves are **never mutated**.

### Persistence Port

The `ProjectRepository` port exposes use-case-driven methods:

```ts
interface ProjectRepository {
  publish(projectId: CmsId, snapshot: VersionSnapshot): Promise<void>;
  release(projectId: CmsId, snapshotId: CmsId): Promise<void>;
  loadReleasePointer(projectId: CmsId): Promise<CmsId | undefined>;
  loadReleasedSnapshot(projectId: CmsId): Promise<VersionSnapshot | undefined>;
}
```

### Consequences

**Positive:**
- **Instant rollback.** Re-point the pointer; no re-publish, no snapshot
  mutation.
- **Scheduled releases.** Publish now, release later.
- **Stage/Blue-Green.** Multiple snapshots, one live pointer.
- **Immutable history.** Snapshots are never mutated, preserving audit integrity.

**Negative:**
- **Two-step workflow.** Publishing alone does not make content live; a separate
  Release is required.
- **Dangling pointer risk.** A pointer may reference a missing snapshot; the
  Delivery Layer must handle this (returns 404).

**Trade-off:** We accept a two-step workflow in exchange for immutable history,
instant rollback, and release flexibility.

## Alternatives Considered

1. **Single Publish-and-Release operation.** Rejected: no preview, no rollback,
   no scheduling.
2. **Mutating snapshots on rollback.** Rejected: violates immutability and
   destroys audit integrity.
3. **Copy-on-write snapshots.** Rejected: wasteful; the pointer approach is
   O(1) and simpler.

## Compliance

Enforced by the `ProjectRepository` port (`src/lib/cms-core/ports/`), the
`PublishProjectCommand` / `ReleaseProjectCommand` handlers, and the **Golden
Journey** E2E test (Steps 4, 5, 7). The Golden Journey proves Publish ≠ Release
and that rollback re-points the pointer without mutating snapshots.
