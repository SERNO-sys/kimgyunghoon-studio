# ADR 011B — Editor History Strategy (Undo/Redo)

> **Status:** Approved (ARB) — 9.8/10 with conditional amendments
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor History)
> **Scope:** Approved with REQUIRED Amendment A. This ADR evaluates how the
> Admin Editor handles **Undo/Redo** and records a Buy/Wrap/Build decision per
> the upgraded 10-column AR-0 schema. It does NOT implement the editor. It
> FREEZES the boundary that history MUST respect: the **Dumb Client** rule and
> the **Server-Side Orchestrator** boundary (ADR-011A).
>
> **Constitutional Rule (ADR-011B):**
> > **"Undo/Redo is a server-side, Command-scoped operation. The editor never
> > holds or mutates the ThemeConfig; it sends an Undo/Redo Command and renders
> > the RenderNode preview the server returns."**
>
> This ADR is bound by the frozen Core Constitution:
> - **ADR-007 (Buy Before Build):** generic history infrastructure MUST be
>   delegated to mature OSS. Only AWIE's core IP (the Command model, the
>   Inverse Patch, the Preview Session) remains custom.
> - **ADR-008 (Runtime Purity):** the editor never resolves, edits, composes,
>   validates, or decides presentation. Undo/Redo is a Command; the server
>   orchestrates.
> - **ADR-011A (Admin Editor Strategy):** the editor is a Dumb Client. It sends
>   Commands and renders the RenderNode preview the server returns.
> - **Accessibility (A11y):** Undo/Redo MUST be fully keyboard-accessible
>   (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) and announced to screen readers. The
>   editor MUST NOT rely on pointer-only interaction for history.

---

## Amendment A — History Boundary (REQUIRED by ARB)

> **"Local Editor History MUST NEVER be replayed across sessions. It is
> ephemeral. Only global Commands are persisted to the database."**

The ARB's conditional approval requires this amendment to be frozen into the
ADR. It draws a hard line between the two history models:

- **Local Editor History (Lexical `HistoryPlugin`) is EPHEMERAL.** It lives
  only in the browser's memory for the current editing session. It is NEVER
  serialized, NEVER persisted, and NEVER replayed when a user returns to the
  editor or opens a new session. Closing the browser destroys it. This is
  intentional: local history is a transient UX convenience for in-flight
  typing, not a source of truth.
- **Global Command History (`CommandHistoryManager`) is PERSISTED.** Only
  Commands that cross the wire (via the `EditorCommandPayload` contract) are
  recorded in the database. Undo/Redo across sessions operates exclusively on
  this persisted Command history.

**Constitutional consequence:** The editor MUST NOT attempt to restore local
history from a previous session, and MUST NOT treat local history as durable.
When a session ends, local history is discarded. The only durable history is
the server-side Command history, which is replayed from the database.

---

## Context


The AWIE V2 Core Engine is frozen (v2.0.0). ADR-011A (Admin Editor Strategy)
is **Approved**. The CTO has blocked immediate implementation of Phase 17
because an Editor without an upfront **History (Undo/Redo)** strategy will
collapse. This ADR answers the core question:

> **How do we handle Undo/Redo?**

The existing codebase already contains the **global, server-side history
infrastructure** this ADR must leverage:

- **`CommandHistoryManager`** (`src/lib/cms-core/history/command-history-manager.ts`)
  maintains an ordered stack of `HistoryEntry` per Project. Each entry
  correlates a Command, its forward `ThemePatch`, and its **Inverse Patch**.
  It exposes `undo()` (returns the Inverse Patch) and `redo()` (returns the
  forward Patch). It is **global state** — it spans the whole Project, not a
  single editor instance.
- **`ThemePatchPipeline`** (`src/lib/cms-core/patch/pipeline.ts`) applies an
  immutable `ThemePatch` to a `ThemeConfig`, producing a NEW `ThemeConfig`
  (deep-cloned). The original is NEVER mutated. This is the mechanism that
  makes Undo/Redo safe: each undo/redo produces a NEW config, never a mutation.
- **`PreviewSessionStore`** (`src/lib/editor-integration/server/preview-session-store.ts`)
  holds the Draft `ThemeConfig` (the working copy) and tracks
  `lastAppliedSequence` for Autosave readiness.
- **`ServerSideOrchestrator`** (`src/lib/editor-integration/server/orchestrator.ts`)
  is the ONLY place the Application Layer and the Runtime Layer interact. It
  executes Commands, applies the resulting patch, and returns a NEW RenderNode
  preview.

The CTO's hypothesis: **Do we use Lexical's native history plugin (local
state), or do we track AWIE Command Snapshots/Deltas (global state)?** The
answer must reconcile the editor's local editing experience with the
server-side, Command-scoped history that already exists.

### The two history models under evaluation

1. **Local History (Lexical native history plugin).** Lexical ships a
   `HistoryPlugin` that maintains an in-editor undo/redo stack of editor-state
   deltas. It is instant, offline, and requires no server round-trip. But it
   is **local to a single editor instance** and does NOT span the whole
   Project (sections, layout, settings).
2. **Global History (AWIE Command Snapshots/Deltas).** The existing
   `CommandHistoryManager` tracks Command → forward Patch → Inverse Patch per
   Project. Undo/Redo is a **Command** sent to the server; the server applies
   the inverse/forward patch, produces a NEW ThemeConfig, and returns a NEW
   RenderNode preview. It spans the whole Project and is the source of truth.

### The editor's constitutional duty

The editor is a **Dumb Client** (ADR-011A). It NEVER holds or mutates the
`ThemeConfig`. Therefore:

- Undo/Redo MUST be a **Command** (`history.undo`, `history.redo`) sent to the
  Server-Side Orchestration API.
- The server applies the inverse/forward patch via the `ThemePatchPipeline`,
  produces a NEW Draft ThemeConfig, and returns a NEW RenderNode preview.
- The editor renders that preview via the `DumbPreviewViewer`. It never
  reconstructs history itself.

---

## Capability 1: Local Rich-Text History (within a single block)

The user types in a rich-text block. Lexical's native `HistoryPlugin` provides
instant, local undo/redo for the text being typed. This is a **local UX
concern** — it does not need a server round-trip for every keystroke.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Lexical HistoryPlugin** | MIT | **High.** Meta-backed; ships with Lexical; actively maintained. | **High.** Large, active community; part of the Lexical ecosystem. | **Free.** Zero licensing cost; bundled with Lexical (already adopted via ADR-011A). | **Excellent.** In-memory editor-state deltas; instant, zero network. | **Trivial.** The plugin is a thin local-history layer; swapping to ProseMirror's native history requires changing only the Editor Adapter. | **Excellent.** Native Ctrl+Z/Ctrl+Y; no custom wiring; familiar to every user. | **Excellent.** Native keyboard shortcuts (Ctrl+Z/Ctrl+Y); screen-reader friendly; no pointer-only interaction. | **WRAP** |
| **ProseMirror history** | MIT | **High.** Ships with ProseMirror; battle-tested. | **High.** Long-standing standard; large community. | **Free.** Zero licensing cost. | **Excellent.** In-memory transaction history; instant. | **Trivial.** Swappable behind the same Editor Adapter. | **Excellent.** Native undo/redo; mature. | **Excellent.** Native keyboard shortcuts; screen-reader friendly. | **WRAP (alternative)** |
| **Custom local history** | — | **Low.** Hand-rolling editor-state deltas, coalescing, and selection restoration duplicates the native plugin. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke delta tracking is error-prone and slower to build. | **N/A.** Nothing to replace — but the cost is unjustified. | **Poor.** Reinvents a solved problem. | **Poor.** Custom keyboard wiring and ARIA live-region announcements must be hand-built; high risk of A11y regressions. | **BUILD (rejected)** |


### How we WRAP them

- **Lexical's `HistoryPlugin`** powers instant, local undo/redo for text typed
  within a single rich-text block.
- **The AWIE Editor Adapter** maps a *committed* edit (e.g., blur, or a
  structural change) to an `EditorCommandPayload` Command. Local history
  handles the in-flight typing; the Command model handles the committed state.

**Boundary:** Local history is a **transient UX layer**. It is NOT the source
of truth. When the user commits an edit, the editor sends a Command; the
server becomes the source of truth. Local history is cleared or reconciled
when the server returns the authoritative RenderNode preview.

---

## Capability 2: Global Project History (Undo/Redo across the whole Project)

The user undoes a structural change (moved a section, changed a heading,
edited a setting). This spans the whole Project and MUST be a server-side,
Command-scoped operation. The existing `CommandHistoryManager` already
provides this via Inverse Patches.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **AWIE CommandHistoryManager (existing)** | — | **High.** Already implemented and tested (Phase 12 M2); uses Inverse Patches for efficient undo/redo. | **N/A.** AWIE core IP. | **Low.** Already built; no new dependency. | **Excellent.** Inverse Patches are small, targeted operations — no full-config snapshots. | **N/A.** This is the source of truth; it is not replaced. | **Good.** Server-scoped undo/redo via Commands; consistent with the Dumb Client rule. | **Good.** Undo/Redo is a Command; the editor exposes keyboard shortcuts and announces results via ARIA live regions. | **BUILD (keep)** |
| **Full-config snapshot history** | — | **Medium.** Storing a full ThemeConfig per history entry is simple but memory-heavy. | **N/A.** AWIE-only. | **Medium.** Memory and storage grow with every edit. | **Poor.** Deep-cloning a full ThemeConfig per entry is expensive. | **N/A.** Rejected in favor of Inverse Patches. | **Poor.** Slower undo/redo; heavier payloads. | **Neutral.** No inherent A11y benefit; same keyboard/ARIA wiring required. | **BUILD (rejected)** |
| **OSS command-bus / event-sourcing history** (e.g., Redux DevTools, XState) | MIT | **Medium.** Powerful but heavyweight for a server-side Command history. | **High.** Large communities. | **Medium.** Adds a state-machine or event-sourcing runtime. | **Medium.** Overkill for a linear undo/redo stack. | **Moderate.** Migrating away requires re-expressing the history model. | **Poor.** Leaks framework concepts into the Application Layer. | **Neutral.** No inherent A11y benefit; adds framework complexity that complicates ARIA wiring. | **BUY (rejected)** |


### How we WRAP / BUILD them

- **The existing `CommandHistoryManager`** is the source of truth for global
  history. It already records Command → forward Patch → Inverse Patch per
  Project.
- **Undo/Redo is a Command.** The editor sends `history.undo` or
  `history.redo` to the Server-Side Orchestration API.
- **The server** calls `CommandHistoryManager.undo(projectId)` to obtain the
  Inverse Patch (or `redo()` for the forward Patch), applies it via the
  `ThemePatchPipeline` to produce a NEW Draft ThemeConfig, persists it via the
  `PreviewSessionStore`, and returns a NEW RenderNode preview.
- **The editor** renders that preview via the `DumbPreviewViewer`.

**Boundary:** Global history is **server-side and Command-scoped**. The editor
never reconstructs history, never holds the ThemeConfig, and never decides
which patch to apply. It merely sends an Undo/Redo Command and renders the
result.

---

## Capability 3: Syncing Local and Global History

The tension: local history is instant but transient; global history is
authoritative but requires a round-trip. The editor must reconcile the two
without violating the Dumb Client rule.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **AWIE History Sync Adapter** | — | **High.** A thin adapter that maps a committed local edit to a Command, and maps an Undo/Redo Command result back to the local editor state. | **N/A.** AWIE core IP. | **Low.** A thin mapping layer; no new dependency. | **Good.** Local history handles in-flight typing; the adapter only fires on commit. | **N/A.** This is the orchestration model; it is not replaced. | **Good.** Instant local typing + authoritative global undo/redo. | **Good.** The adapter exposes keyboard shortcuts and announces undo/redo results via ARIA live regions; no pointer-only interaction. | **BUILD** |
| **Full local-first history (editor owns all history)** | — | **Low.** The editor would hold the entire Project history locally, violating the Dumb Client rule. | **N/A.** AWIE-only. | **High.** Duplicates the server-side `CommandHistoryManager` on the client. | **Poor.** Client holds the ThemeConfig and history — a constitutional violation. | **N/A.** Rejected on constitutional grounds. | **Poor.** Breaks the Dumb Client boundary. | **Poor.** Duplicating history on the client doubles the A11y surface (keyboard + ARIA) with no benefit. | **BUILD (rejected)** |


### How we BUILD it

- **The AWIE History Sync Adapter** is the ONLY custom piece. It:
  1. Lets Lexical's local history handle in-flight typing (instant UX).
  2. On **commit** (blur, structural change, or explicit save), maps the edit
     to an `EditorCommandPayload` Command and sends it to the server.
  3. On an **Undo/Redo Command**, sends `history.undo`/`history.redo` to the
     server, receives the NEW RenderNode preview, and re-syncs the local
     editor state to match the authoritative preview.

**Boundary:** The adapter is a **thin mapping layer**. It never holds the
ThemeConfig, never decides which patch to apply, and never reconstructs
history. It merely translates between the local editor's transient state and
the server's authoritative Command history.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Local Rich-Text History** | Lexical HistoryPlugin | MIT | **WRAP** | Instant in-editor undo/redo; transient UX layer only. | **Low** |
| **Local Rich-Text History** (alt) | ProseMirror history | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Global Project History** | AWIE CommandHistoryManager (existing) | — | **BUILD (keep)** | Inverse Patches; server-side, Command-scoped undo/redo. | **Low** |
| **Global Project History** (alt) | Full-config snapshots | — | **BUILD (rejected)** | Memory-heavy; slow deep-clones. | **Medium** |
| **Global Project History** (alt) | OSS command-bus / event-sourcing | MIT | **BUY (rejected)** | Heavyweight; leaks framework concepts. | **Medium** |
| **Local ↔ Global Sync** | AWIE History Sync Adapter | — | **BUILD** | Thin mapping; local transient + global authoritative. | **Low** |

---

## Decision

**Adopt a WRAP for local rich-text history, and a BUILD for the global
Command history and the sync adapter.**

- **Local Rich-Text History → Lexical HistoryPlugin (WRAP).** Instant,
  in-editor undo/redo for text typing. It is a transient UX layer, NOT the
  source of truth.
- **Global Project History → AWIE CommandHistoryManager (BUILD, keep).** The
  existing Inverse-Patch-based history is the source of truth. Undo/Redo is a
  Command sent to the server; the server applies the inverse/forward patch and
  returns a NEW RenderNode preview.
- **Local ↔ Global Sync → AWIE History Sync Adapter (BUILD).** A thin mapping
  layer that lets local history handle in-flight typing and delegates
  committed edits and Undo/Redo to the server.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The `CommandHistoryManager`** — the Inverse-Patch-based global history.
  This is AWIE's orchestration model and is already implemented.
- **The `ThemePatchPipeline`** — the immutable patch application that makes
  Undo/Redo safe (each undo/redo produces a NEW ThemeConfig, never a mutation).
- **The AWIE History Sync Adapter** — the mapping between the local editor's
  transient state and the server's authoritative Command history.
- **The Command model & Preview Session** — the wire contract and the
  server-side Draft state that Undo/Redo operates on.

---

## Consequences

**Positive:**
- **Instant local UX.** Lexical's native history gives the user instant
  Ctrl+Z/Ctrl+Y while typing, with zero network latency.
- **Authoritative global history.** The existing `CommandHistoryManager`
  provides Project-wide undo/redo via efficient Inverse Patches — no
  full-config snapshots.
- **Dumb Client preserved.** Undo/Redo is a Command; the editor never holds or
  mutates the ThemeConfig, never reconstructs history, and never decides which
  patch to apply.
- **No new dependencies.** Lexical is already adopted (ADR-011A); the global
  history already exists. The only new code is the thin History Sync Adapter.
- **Consistency with Autosave.** Undo/Redo Commands flow through the same
  `clientSequence` / `commandId` wire contract as Autosave, enabling idempotent
  replay.

**Negative:**
- **Server round-trip for global undo/redo.** A Project-wide undo/redo is a
  Command round-trip. Local history mitigates the common case (typing), but
  structural undo/redo incurs latency.
- **Reconciliation complexity.** The History Sync Adapter must reconcile the
  local editor state with the authoritative RenderNode preview after each
  global undo/redo. This must be documented and tested.
- **Two history models.** The editor has both a local (transient) and a global
  (authoritative) history. The boundary between them must be clear to avoid
  confusion.

**Trade-off:** We accept a thin sync adapter and a server round-trip for
global undo/redo in exchange for instant local typing UX, an authoritative
Project-wide history, and a Dumb Client that never violates the frozen Core
Constitution.

---

## Alternatives Considered

1. **Full local-first history (editor owns all history).** Rejected: violates
   the Dumb Client rule (ADR-011A). The editor would hold the ThemeConfig and
   history, breaking the CMS → Runtime boundary.
2. **Full-config snapshot history.** Rejected: memory-heavy and slow. Inverse
   Patches are far more efficient.
3. **OSS command-bus / event-sourcing history.** Rejected: heavyweight and
   leaks framework concepts into the Application Layer. The existing
   `CommandHistoryManager` already solves the problem.
4. **Custom local history.** Rejected: duplicates Lexical's native
   `HistoryPlugin` (delta tracking, coalescing, selection restoration).

---

## Compliance

This ADR is **Proposed (Research)** and awaits CTO review. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the editor NEVER holds, mutates, or
  decides the `ThemeConfig`. Undo/Redo is a Command; the server orchestrates.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the editor never
  imports the GoldenPathOrchestrator or any Runtime service; the server is the
  sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the editor never resolves,
  edits, composes, validates, or decides presentation.
- The **immutable `ThemeConfig` invariant** — Undo/Redo produces a NEW
  ThemeConfig via the `ThemePatchPipeline`; the original is NEVER mutated.
- The **Buy Before Build constitution (ADR-007)** — generic history
  infrastructure is delegated to OSS (Lexical's native history); only the
  Command history and the sync adapter remain custom.
