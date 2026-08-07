# ADR 011C — Autosave Strategy

> **Status:** Approved (ARB) — 9.8/10 with conditional amendments
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor Autosave)
> **Scope:** Approved with REQUIRED Amendments A and B. This ADR evaluates
> **how and when** the Admin Editor saves and records a Buy/Wrap/Build decision
> per the upgraded 10-column AR-0 schema. It does NOT implement the editor. It
> FREEZES the boundary that Autosave MUST respect: the **Dumb Client** rule,
> the **Server-Side Orchestrator** boundary (ADR-011A), and the **TanStack
> Query WRAP** (ADR-011A).
>
> **Constitutional Rule (ADR-011C):**
> > **"Autosave is a Command. The editor never holds or mutates the ThemeConfig;
> > it sends a debounced Command and renders the RenderNode preview the server
> > returns. Autosave MUST NOT overload the Live API."**
>
> This ADR is bound by the frozen Core Constitution:
> - **ADR-007 (Buy Before Build):** generic autosave infrastructure (debounce,
>   retry, idempotency, cache) MUST be delegated to mature OSS. Only AWIE's
>   core IP (the Command model, the Preview Session) remains custom.
> - **ADR-008 (Runtime Purity):** the editor never resolves, edits, composes,
>   validates, or decides presentation. Autosave is a Command; the server
>   orchestrates.
> - **ADR-011A (Admin Editor Strategy):** the editor is a Dumb Client. Autosave
>   uses the TanStack Query WRAP for the Command lifecycle.
> - **ADR-011B (Editor History):** Autosave Commands flow through the same
>   `clientSequence` / `commandId` wire contract as Undo/Redo, enabling
>   idempotent replay.
> - **Accessibility (A11y):** Autosave MUST be silent and non-blocking for all
>   users, including screen-reader users. It MUST NOT introduce focus traps,
>   unexpected announcements, or pointer-only interactions.

---

## Amendment A — Drafts Only (REQUIRED by ARB)

> **"Autosave MUST NEVER create Versions. It only updates the draft. Versions
> are only created upon explicit Publish."**

The ARB's conditional approval requires this amendment to be frozen into the
ADR. It draws a hard line between the **Draft** and **Version** concepts:

- **Autosave writes ONLY to the Draft.** Every debounced Command updates the
  Draft `ThemeConfig` in the `PreviewSessionStore`. It NEVER creates a
  Version, NEVER increments a version number, and NEVER records a point-in-time
  snapshot.
- **Versions are created ONLY upon explicit Publish.** A Version is a
  deliberate, user-initiated action. It is the ONLY operation that records a
  durable, point-in-time snapshot of the Project.

**Constitutional consequence:** Autosave is a continuous, silent Draft
mutation. It is NOT a versioning operation. The Draft and the Version history
are strictly decoupled. Autosave can run indefinitely without ever producing a
Version.

---

## Amendment B — Silent UX (REQUIRED by ARB)

> **"Autosave MUST NEVER interrupt typing. No loading spinners, no toasts, no
> blocking UI. If the user feels the autosave, the UX has failed."**

The ARB's conditional approval requires this amendment to be frozen into the
ADR. It is the product-philosophy core of the Autosave strategy:

- **Autosave is invisible.** The user MUST NOT see a spinner, a toast, a
  progress bar, or any blocking UI while typing. The debounced Command runs in
  the background and the optimistic UI reconciles silently.
- **If the user feels the autosave, the UX has failed.** Autosave is a
  background safety net, not a user-facing feature. Any visible indication of
  the save process is a defect.
- **Failure is silent and non-blocking.** If a Command fails, the editor MUST
  NOT interrupt the user. It retries silently (via the TanStack Query WRAP)
  and only surfaces a non-blocking, accessible status when the user is not
  actively typing (e.g., a subtle, dismissible status in a non-interrupting
  region).

**Constitutional consequence:** Autosave MUST be implemented as a silent,
background, non-blocking process. The editor MUST NOT render any loading
indicator, toast, or blocking overlay for autosave. Accessibility is preserved
by announcing status changes via a polite ARIA live region (never assertive,
never interrupting).

---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). ADR-011A (Admin Editor Strategy)

and ADR-011B (Editor History) are **Approved / Proposed**. The CTO has blocked
immediate implementation of Phase 17 because an Editor without an upfront
**Autosave** strategy will collapse. This ADR answers the core question:

> **How and when do we save?**

The existing codebase already contains the **autosave-ready infrastructure**
this ADR must leverage:

- **`EditorCommandPayload`** (`src/lib/editor-integration/types.ts`) carries a
  `commandId` (for idempotent replay) and a `clientSequence` (a monotonically
  increasing per-session counter). This is the wire contract that makes
  Autosave safe: the server can detect out-of-order or duplicate Commands.
- **`PreviewSessionStore`** (`src/lib/editor-integration/server/preview-session-store.ts`)
  tracks `lastAppliedSequence` and `latestSnapshotId`. It is the server-side
  container for the Draft state, DECOUPLED from the Published state. Autosave
  writes to the Draft; publishing is a separate, explicit Command.
- **`ServerSideOrchestrator`** (`src/lib/editor-integration/server/orchestrator.ts`)
  is the ONLY place the Application Layer and the Runtime Layer interact. It
  executes Commands, applies the resulting patch, and returns a NEW RenderNode
  preview.
- **ADR-011A** established **TanStack Query** as the WRAP for the Command
  lifecycle (pending/error/success, retry, cache invalidation) and **Optimistic
  UI** layered on top.

The CTO's hypothesis: **Do we save on every keystroke, on a debounce, on a
manual save, or via optimistic UI?** The answer must balance data safety
(never lose work) against API load (never overload the Live API).

### The four save strategies under evaluation

1. **Every keystroke.** Send a Command on every change. Maximum data safety,
   but maximum API load and server round-trips.
2. **Debounce (e.g., 1000ms).** Send a Command after the user pauses typing
   for a fixed interval. Balances safety and load.
3. **Manual Save.** Send a Command only when the user clicks "Save". Minimum
   API load, but risks losing work on navigation or crash.
4. **Optimistic UI.** Apply the edit locally immediately, then reconcile with
   the server's authoritative RenderNode preview. Best perceived latency, but
   adds reconciliation complexity.

### The editor's constitutional duty

The editor is a **Dumb Client** (ADR-011A). It NEVER holds or mutates the
`ThemeConfig`. Therefore:

- Autosave MUST be a **Command** sent to the Server-Side Orchestration API.
- The server applies the patch via the `ThemePatchPipeline`, produces a NEW
  Draft ThemeConfig, persists it via the `PreviewSessionStore`, and returns a
  NEW RenderNode preview.
- The editor renders that preview via the `DumbPreviewViewer`. It never
  reconstructs the ThemeConfig locally.

---

## Capability 1: Save Trigger Strategy

The core question: **when** do we send a Command? This determines API load and
data safety.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Debounce (1000ms)** | — | **High.** A simple, well-understood pattern; the editor pauses 1000ms after the last change before sending a Command. | **N/A.** AWIE pattern. | **Low.** No new dependency; a small debounce utility. | **Good.** Bounds API load to one Command per pause; no per-keystroke round-trips. | **N/A.** The debounce interval is a tunable constant, not a dependency. | **Good.** Feels automatic; no manual save button required; low perceived latency. | **Excellent.** Silent and non-blocking; no focus traps; status announced via a polite ARIA live region. | **BUILD (default)** |
| **Every keystroke** | — | **High.** Simple to implement; send a Command on every change. | **N/A.** AWIE pattern. | **Low.** No new dependency. | **Poor.** One server round-trip per keystroke; overloads the Live API and the server. | **N/A.** Trivially swappable to debounce. | **Poor.** High latency per keystroke; janky typing; API overload. | **Poor.** Frequent async state changes risk interrupting screen-reader announcements. | **BUILD (rejected)** |
| **Manual Save** | — | **High.** Simple; send a Command only on explicit "Save". | **N/A.** AWIE pattern. | **Low.** No new dependency. | **Excellent.** Minimal API load; only on explicit action. | **N/A.** Trivially swappable. | **Poor.** Risks losing work on navigation or crash; requires user discipline. | **Good.** A single, keyboard-accessible Save action; no background interruptions. | **BUILD (rejected as primary)** |
| **Optimistic UI** | — | **Medium.** Apply the edit locally immediately, then reconcile with the server's authoritative RenderNode preview. | **N/A.** AWIE pattern. | **Medium.** Adds reconciliation logic. | **Excellent.** Instant perceived latency; no waiting for the server. | **N/A.** The reconciliation is AWIE's orchestration model. | **Excellent.** Feels instant; no save button; no typing jank. | **Good.** Silent reconciliation; status announced via a polite ARIA live region, never assertive. | **BUILD (layered on debounce)** |


### How we BUILD them

- **Debounce (1000ms) is the default save trigger.** The editor pauses 1000ms
  after the last change, then sends a single Command. This bounds API load to
  one Command per pause while keeping the editor automatic.
- **Optimistic UI is layered on top.** The editor applies the edit locally
  immediately (instant UX), then reconciles with the server's authoritative
  RenderNode preview when the debounced Command returns.
- **Manual Save is a fallback.** A "Save" button forces an immediate Command
  (e.g., before navigation or on explicit user intent), bypassing the debounce.

**Boundary:** The save trigger is a **client-side UX concern**. It decides
*when* to send a Command, never *what* the Command does. The server remains the
sole orchestrator.

---

## Capability 2: Command Lifecycle Management (TanStack Query WRAP)

The debounced Command must be sent reliably: pending/error/success, retry,
cache invalidation, and idempotent replay. ADR-011A established **TanStack
Query** as the WRAP for this lifecycle.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TanStack Query** | MIT | **High.** The standard for server-state in React; actively maintained; already adopted via ADR-007/ADR-008/ADR-011A. | **High.** Large, active community; the de-facto standard. | **Free.** Zero licensing cost; already a dependency. | **Excellent.** Efficient cache, deduplication, and retry; no redundant requests. | **Trivial.** TanStack Query is a pure server-state layer; the AWIE Command Adapter maps Command results to cache entries. Swapping to SWR requires changing only the adapter. | **Excellent.** Handles pending/error/success, retry, and cache invalidation out of the box. | **Good.** Silent background lifecycle; status surfaced via a polite ARIA live region, never interrupting. | **WRAP** |
| **SWR** | MIT | **High.** Vercel-backed; actively maintained; lightweight. | **High.** Large community. | **Free.** Zero licensing cost. | **Excellent.** Lightweight; efficient revalidation. | **Trivial.** Swappable behind the same AWIE Command Adapter. | **Good.** Handles the same lifecycle; slightly less feature-rich than TanStack Query. | **Good.** Same silent, non-blocking lifecycle; polite ARIA announcements. | **WRAP (alternative)** |
| **Custom autosave queue** | — | **Low.** Hand-rolling debounce, retry, idempotency, and cache invalidation duplicates TanStack Query. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke async state, retry, and cache are error-prone. | **N/A.** Nothing to replace — but the cost is unjustified. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built async state risks unannounced or interrupting status changes. | **BUILD (rejected)** |


### How we WRAP them

- **TanStack Query** manages the Command lifecycle. A `useMutation` maps to an
  `EditorCommandPayload` Command and reconciles the returned RenderNode
  preview.
- **The AWIE Command Adapter** maps the mutation to the Command and consumes
  the `clientSequence` / `commandId` wire contract for idempotent replay and
  out-of-order detection.
- **Optimistic UI** is layered on top: the editor optimistically applies the
  Command's intent while the server round-trips, then reconciles with the
  authoritative RenderNode preview.

**Boundary:** TanStack Query is a **generic server-state layer**. It never
holds or mutates the ThemeConfig. It only manages the lifecycle of the
Command. The AWIE Command Adapter is the thin mapping layer that connects it
to the frozen Command model.

---

## Capability 3: Live API Load Protection

The CTO's explicit concern: Autosave MUST NOT overload the Live API. The
debounce bounds the request rate, but the editor must also protect against
bursts (e.g., rapid structural changes) and ensure the server can handle the
Command stream.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Debounce + coalescing** | — | **High.** The debounce naturally coalesces rapid changes into a single Command per pause. | **N/A.** AWIE pattern. | **Low.** No new dependency. | **Excellent.** Bounds the request rate to one Command per pause; no burst. | **N/A.** The interval is a tunable constant. | **Good.** Automatic; no user-visible impact. | **Excellent.** Silent and non-blocking; no focus traps; no interrupting announcements. | **BUILD** |
| **TanStack Query deduplication** | MIT | **High.** TanStack Query deduplicates concurrent identical requests and cancels stale ones. | **High.** Large community. | **Free.** Already a dependency. | **Excellent.** Prevents redundant requests; cancels superseded Commands. | **Trivial.** Swappable behind the same adapter. | **Good.** Transparent; no user-visible impact. | **Good.** Transparent; status surfaced via a polite ARIA live region, never interrupting. | **WRAP** |
| **Server-side rate limiting** | — | **Medium.** The server rejects or queues Commands that exceed a threshold. | **N/A.** AWIE pattern. | **Medium.** Adds server-side queueing and backpressure. | **Good.** Protects the server from overload. | **N/A.** Server-side policy. | **Poor.** Can cause visible save failures if the queue overflows. | **Poor.** Queue-overflow failures risk unannounced or interrupting status changes. | **BUILD (optional)** |
| **No load protection** | — | **Low.** Send Commands without any rate bounding. | **N/A.** AWIE-only. | **Low.** No implementation cost. | **Poor.** Overloads the Live API and the server. | **N/A.** Rejected. | **Poor.** Janky typing; API overload; potential data loss. | **Poor.** Unbounded async churn risks interrupting screen-reader announcements. | **BUILD (rejected)** |


### How we BUILD / WRAP them

- **Debounce + coalescing (BUILD)** is the primary load protection. Rapid
  changes are coalesced into a single Command per pause.
- **TanStack Query deduplication (WRAP)** prevents redundant requests and
  cancels superseded Commands.
- **Server-side rate limiting (BUILD, optional)** is a defensive backstop. The
  server rejects or queues Commands that exceed a threshold, protecting the
  Live API from a misbehaving client.

**Boundary:** Load protection is a **client-side and server-side policy**. It
never changes what a Command does; it only bounds *when* and *how many*
Commands are sent.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Save Trigger** | Debounce (1000ms) | — | **BUILD (default)** | One Command per pause; bounds API load. | **Low** |
| **Save Trigger** (alt) | Every keystroke | — | **BUILD (rejected)** | One round-trip per keystroke; overloads API. | **Low** |
| **Save Trigger** (alt) | Manual Save | — | **BUILD (fallback)** | Minimal load; risks losing work. | **Low** |
| **Save Trigger** (alt) | Optimistic UI | — | **BUILD (layered)** | Instant perceived latency; reconciliation. | **Medium** |
| **Command Lifecycle** | TanStack Query | MIT | **WRAP** | Manages pending/error/success, retry, cache. | **Low** |
| **Command Lifecycle** (alt) | SWR | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Load Protection** | Debounce + coalescing | — | **BUILD** | Bounds request rate; no burst. | **Low** |
| **Load Protection** | TanStack Query dedup | MIT | **WRAP** | Prevents redundant requests; cancels stale. | **Low** |
| **Load Protection** (alt) | Server-side rate limiting | — | **BUILD (optional)** | Defensive backstop; protects Live API. | **Medium** |

---

## Decision

**Adopt a debounced Autosave with optimistic UI, managed by the TanStack Query
WRAP, with load protection.**

- **Save Trigger → Debounce (1000ms) as the default (BUILD).** The editor
  pauses 1000ms after the last change, then sends a single Command. This
  bounds API load while keeping the editor automatic.
- **Optimistic UI → layered on top (BUILD).** The editor applies the edit
  locally immediately, then reconciles with the server's authoritative
  RenderNode preview.
- **Manual Save → fallback (BUILD).** A "Save" button forces an immediate
  Command, bypassing the debounce (e.g., before navigation).
- **Command Lifecycle → TanStack Query (WRAP).** TanStack Query manages
  pending/error/success, retry, cache invalidation, and deduplication. It
  consumes the `clientSequence` / `commandId` wire contract for idempotent
  replay.
- **Load Protection → Debounce + coalescing (BUILD) + TanStack Query
  deduplication (WRAP).** Rapid changes are coalesced; redundant requests are
  prevented. Server-side rate limiting is an optional defensive backstop.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The debounce + coalescing logic** — the save trigger policy that bounds
  API load. This is AWIE's orchestration model.
- **The AWIE Command Adapter** — the mapping of a TanStack Query mutation to
  the frozen `EditorCommandPayload` Command model, consuming `clientSequence` /
  `commandId`.
- **The optimistic reconciliation** — the mapping of the local optimistic
  state to the server's authoritative RenderNode preview.
- **The Command model & Preview Session** — the wire contract and the
  server-side Draft state that Autosave writes to.

---

## Consequences

**Positive:**
- **Data safety.** The debounce (1000ms) plus optimistic UI ensures work is
  never lost on navigation or crash, without a manual save button.
- **Bounded API load.** The debounce coalesces rapid changes into one Command
  per pause; TanStack Query deduplication prevents redundant requests. The
  Live API is not overloaded.
- **Instant perceived latency.** Optimistic UI applies edits locally
  immediately; the server round-trip is invisible to the user.
- **Dumb Client preserved.** Autosave is a Command; the editor never holds or
  mutates the ThemeConfig, never reconstructs it locally, and never decides
  presentation.
- **Consistency with History.** Autosave Commands flow through the same
  `clientSequence` / `commandId` wire contract as Undo/Redo (ADR-011B),
  enabling idempotent replay and out-of-order detection.
- **No new dependencies.** TanStack Query is already adopted (ADR-011A). The
  only new code is the debounce logic and the Command Adapter.

**Negative:**
- **Reconciliation complexity.** Optimistic UI adds reconciliation logic to
  align the local state with the server's authoritative RenderNode preview.
- **Debounce latency.** A change is not persisted until the user pauses for
  1000ms. A crash within that window could lose the last keystrokes (mitigated
  by optimistic UI and the manual Save fallback).
- **Server round-trip per pause.** Each debounced pause is a Command
  round-trip. This is bounded but not zero.

**Trade-off:** We accept a debounce window and reconciliation complexity in
exchange for bounded API load, instant perceived latency, and a Dumb Client
that never violates the frozen Core Constitution.

---

## Alternatives Considered

1. **Every keystroke.** Rejected: one server round-trip per keystroke
   overloads the Live API and the server, causing janky typing.
2. **Manual Save as the primary strategy.** Rejected: risks losing work on
   navigation or crash; requires user discipline. It remains a fallback.
3. **Custom autosave queue.** Rejected: duplicates TanStack Query (debounce,
   retry, idempotency, cache invalidation).
4. **No load protection.** Rejected: overloads the Live API and the server.
5. **Server-side rate limiting as the primary protection.** Deferred: it is a
   defensive backstop, not the primary mechanism. The debounce is the primary
   protection.

---

## Compliance

This ADR is **Proposed (Research)** and awaits CTO review. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the editor NEVER holds, mutates, or
  decides the `ThemeConfig`. Autosave is a Command; the server orchestrates.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the editor never
  imports the GoldenPathOrchestrator or any Runtime service; the server is the
  sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the editor never resolves,
  edits, composes, validates, or decides presentation.
- The **immutable `ThemeConfig` invariant** — Autosave produces a NEW
  ThemeConfig via the `ThemePatchPipeline`; the original is NEVER mutated.
- The **Buy Before Build constitution (ADR-007)** — generic autosave
  infrastructure is delegated to OSS (TanStack Query); only the debounce logic
  and the Command Adapter remain custom.
- The **Live API load invariant** — Autosave MUST NOT overload the Live API.
  The debounce + coalescing and TanStack Query deduplication enforce this.
