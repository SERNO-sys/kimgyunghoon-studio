# ADR 011A — Admin Editor Strategy (Phase 17: Admin Platform)

> **Status:** Proposed (Research) — awaiting ARB review
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor)
> **Scope:** Research only. This ADR evaluates the OSS landscape for the AWIE
> Admin Editor and records a Buy/Wrap/Build decision per capability. It does
> NOT implement the editor. It FREEZES the architectural boundary that the
> editor MUST respect: the **Dumb Client** rule and the **Server-Side
> Orchestrator** boundary already established in Phase 12.5.
>
> **Constitutional Rule (ADR-011A):**
> > **"The Admin Editor is a Dumb Client. It NEVER holds, mutates, or decides
> > the ThemeConfig. It sends Commands and renders the RenderNode preview the
> > server returns."**
>
> This ADR is bound by the frozen Core Constitution:
> - **ADR-007 (Buy Before Build):** generic editor infrastructure MUST be
>   delegated to mature OSS. Only AWIE's core IP (the Command model, the
>   Preview Session, the CMS → Runtime boundary) remains custom.
> - **ADR-008 (Runtime Purity):** the editor never resolves, edits, composes,
>   validates, or decides presentation. It emits Commands; the server
>   orchestrates.
> - **ADR-009 (Permission Snapshot):** the editor renders a permission
>   snapshot; it never evaluates permissions itself.
> - **ADR-010 (DX & SDK):** the editor is a consumer of the frozen `@awie/sdk`
>   contracts, never a bypass.

---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). Phase 16 (Runtime Foundation) is
approved. Phase 17 (Admin Platform) is the current focus. The existing
codebase already contains a **Phase 12.5 Editor Integration** layer that
establishes the non-negotiable boundary this ADR must preserve:

- **`ServerSideOrchestrator`** (`src/lib/editor-integration/server/orchestrator.ts`)
  is the ONLY place the Application Layer and the Runtime Layer interact. It
  executes Commands (Application), applies the resulting ThemePatch to produce
  a NEW ThemeConfig, and invokes the GoldenPathOrchestrator (Runtime) to
  generate a NEW RenderNode tree.
- **`DumbPreviewViewer`** (`src/lib/editor-integration/client/DumbPreviewViewer.tsx`)
  is the ONLY thing the client renders. It receives a RenderNode preview and
  materializes it into React. It NEVER imports or holds the ThemeConfig, NEVER
  imports the GoldenPathOrchestrator or any Runtime service, and NEVER makes a
  business decision.
- **`EditorCommandPayload` / `EditorCommandResult`** define the wire contract:
  the client sends a Command (pure intent) via HTTP POST; the server returns a
  RenderNode preview plus a `snapshotId`. The wire contract is already
  **Autosave-ready** (`clientSequence`, `commandId` for idempotent replay).
- **`AdvancedEditorDrawer`** (`src/components/admin/sites/AdvancedEditorDrawer.tsx`)
  is the CURRENT admin editor surface. It is a **link-based drawer** — it
  navigates to settings/pages/media and hosts the PresetManager. It is NOT a
  true visual editor.

The CTO's hypothesis: **Do we need to build a visual editor from scratch, or
can we WRAP a mature OSS editor (e.g., a block-based editor) behind the
existing Dumb Client boundary?** The editor must let a user edit content and
structure WITHOUT ever holding the ThemeConfig.

This ADR evaluates each custom implementation against industry-standard
open-source equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig` via the Command model.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (Composition,
   ThemeConfig, AI Decision, Plugin Contracts, the Command model).

### The editor's constitutional duty

The editor is a **Dumb Client**. It is bound by the same constitution it
serves:

- The editor NEVER holds the `ThemeConfig`. It sends Commands and renders the
  RenderNode preview the server returns.
- The editor NEVER resolves, edits, composes, validates, or decides
  presentation. Those responsibilities live in the Application Layer
  (EditorService → PatchPipeline) and the Runtime Layer
  (GoldenPathOrchestrator → RenderNode), both server-side.
- The editor renders a **permission snapshot** (ADR-009); it never evaluates
  permissions itself.
- The editor is a consumer of the frozen `@awie/sdk` contracts (ADR-010); it
  never bypasses them.

---

## Capability 1: Block / Content Editing Surface

The core editing surface. The user edits content blocks (headings, text,
images, forms) that map to `SectionConfig` entries in the immutable
`ThemeConfig`. The editor MUST NOT edit the ThemeConfig directly — it emits
Commands (`content.update-heading`, etc.) that the server applies.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Lexical** (Meta) | MIT | **High.** Meta-backed; actively maintained; extensible block/rich-text model; framework-agnostic core with React bindings. | **High.** Meta-backed; growing, active community. | **Free.** Zero licensing cost; moderate bundle weight (tree-shakeable). | **Excellent.** Efficient editor state model; minimal re-renders; tree-shakeable. | **Trivial.** Lexical's core is a plain editor state model. The AWIE Adapter maps its output to Commands; swapping to ProseMirror or TipTap requires changing only the adapter, never the Command model. | **Excellent.** Familiar rich-text UX; keyboard-accessible by default. | **Good.** Rich-text editing is keyboard-accessible; the AWIE Adapter must preserve focus and announce status via a polite ARIA live region. | **WRAP** |
| **ProseMirror** | MIT | **High.** The long-standing standard for collaborative rich-text; battle-tested; powers TipTap. | **High.** Long-standing, battle-tested community. | **Free.** Zero licensing cost; steeper learning curve (schema + transactions). | **Excellent.** Mature transaction model; efficient for large documents. | **Trivial.** ProseMirror's transaction model maps cleanly to AWIE Commands; the adapter is the only coupling point. | **Good.** Powerful but steeper learning curve for editors. | **Good.** Keyboard-accessible; the AWIE Adapter must preserve focus and announce status politely. | **WRAP (alternative)** |
| **TipTap** | MIT | **High.** ProseMirror wrapper with a friendly API; actively maintained; rich extension ecosystem. | **High.** Large, active community. | **Free.** Zero licensing cost; adds ProseMirror as a transitive dependency. | **Excellent.** Thin layer over ProseMirror; efficient. | **Trivial.** TipTap is a thin layer over ProseMirror; the AWIE Adapter is unchanged if TipTap is swapped for raw ProseMirror. | **Excellent.** Friendly API; rich extension ecosystem. | **Good.** Keyboard-accessible; the AWIE Adapter must preserve focus and announce status politely. | **WRAP (alternative)** |
| **Slate** | MIT | **Medium.** Popular but historically slower to evolve; plugin model is powerful but can be complex. | **Medium.** Popular but slower to evolve. | **Free.** Zero licensing cost. | **Good.** Powerful plugin model; can be complex. | **Moderate.** Slate's model differs from ProseMirror/Lexical; migrating requires re-expressing the adapter. | **Good.** Powerful plugin model; complex API. | **Good.** Keyboard-accessible; the AWIE Adapter must preserve focus and announce status politely. | **WRAP (rejected)** |
| **Custom block editor** | — | **Low.** Hand-rolling contenteditable, selection, undo/redo, and rich-text serialization duplicates mature OSS. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure, not AWIE IP. | **Poor.** Bespoke contenteditable and selection logic are error-prone. | **N/A.** No exit strategy needed because there is nothing to exit — but the cost is unjustified. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built contenteditable risks focus traps and unannounced state changes. | **BUILD (rejected)** |


### How we WRAP them

Following ADR-007, the editor surface is isolated behind an AWIE-owned
**Editor Adapter** that maps editor output to `EditorCommandPayload` Commands.
The Core Constitution depends only on AWIE interfaces — never on Lexical or
ProseMirror types.

- **Lexical** powers the rich-text/block editing surface.
- **The AWIE Editor Adapter** converts editor state changes into
  `EditorCommandPayload` Commands (`content.update-heading`, etc.) and sends
  them via HTTP POST to the Server-Side Orchestration API.
- **The server** applies the Command (Application Layer), produces a NEW
  ThemeConfig, and returns a NEW RenderNode preview. The editor renders that
  preview via the existing `DumbPreviewViewer`.

This preserves **replaceability** (Amendment A) and **exit strategy**
(Amendment B): swapping Lexical for ProseMirror or TipTap requires changing
only the thin adapter — never the Command model nor its consumers.

---

## Capability 2: Visual / WYSIWYG Preview

The editor must show a live preview of the site as the user edits. The
existing `DumbPreviewViewer` already renders a RenderNode preview. The
question is whether to enhance it with a visual canvas (drag-and-drop,
resize, inline selection) or keep it a pure renderer.

### OSS Survey (WRAP / BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **dnd-kit** | MIT | **High.** The modern standard for React drag-and-drop; actively maintained; accessible; tree-shakeable. | **High.** Large, active community; the modern standard. | **Free.** Zero licensing cost; small footprint. | **Excellent.** Efficient pointer tracking; minimal re-renders; tree-shakeable. | **Trivial.** dnd-kit is a pure interaction layer. The AWIE Adapter maps drop events to `layout.moveSection` Commands; swapping to react-dnd requires changing only the adapter. | **Excellent.** Smooth drag-and-drop; keyboard-accessible by default. | **Excellent.** Keyboard- and screen-reader-accessible by default; the AWIE Adapter must preserve focus and announce moves via a polite ARIA live region. | **WRAP** |
| **react-dnd** | MIT | **High.** Mature and widely used; actively maintained. | **High.** Mature, widely used community. | **Free.** Zero licensing cost. | **Good.** Mature; slightly heavier than dnd-kit. | **Trivial.** Similar to dnd-kit — a pure interaction layer with a clean swap path. | **Good.** Mature and familiar. | **Good.** Keyboard-accessible; the AWIE Adapter must preserve focus and announce moves politely. | **WRAP (alternative)** |
| **react-moveable** | MIT | **High.** Powerful for resize/rotate/drag on arbitrary elements; actively maintained. | **Medium.** Niche but active. | **Free.** Zero licensing cost. | **Good.** Efficient geometry manipulation. | **Trivial.** A thin interaction layer; the AWIE Adapter maps geometry changes to Commands. | **Good.** Powerful resize/rotate/drag. | **Good.** Keyboard-accessible; the AWIE Adapter must preserve focus and announce geometry changes politely. | **WRAP (optional)** |
| **Custom drag-and-drop** | — | **Low.** Hand-rolling pointer tracking, hit-testing, and accessibility duplicates mature OSS. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke pointer tracking and hit-testing are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built drag-and-drop risks focus traps and unannounced moves. | **BUILD (rejected)** |
| **Enhance DumbPreviewViewer** (keep it a pure renderer) | — | **High.** The existing viewer is deliberately pure (renders RenderNode only). Adding selection/drag logic to it would violate the Dumb Client rule. | **N/A.** AWIE-only. | **Low.** The viewer stays a pure renderer; interaction is layered on top via the Adapter. | **Excellent.** The viewer stays a pure, efficient renderer. | **N/A.** The viewer is already the correct boundary. | **Good.** The viewer stays pure; interaction is layered on top. | **Good.** The pure viewer preserves focus and never introduces interaction traps. | **BUILD (keep as-is)** |


### How we WRAP them

The visual canvas is a **thin interaction layer over the DumbPreviewViewer**.
It does NOT modify the viewer's rendering logic. Instead:

- **dnd-kit** powers drag-and-drop of sections.
- **The AWIE Interaction Adapter** maps a drop event to a
  `layout.moveSection` Command and sends it to the server.
- **The server** returns a NEW RenderNode preview; the viewer re-renders.

The `DumbPreviewViewer` remains a pure renderer. It never holds selection
state, never interprets drag events, and never decides layout. This preserves
the Dumb Client rule (ADR-011A) and the Runtime Purity constitution
(ADR-008).

---

## Capability 3: Form / Field Editing

The editor must let a user edit structured fields (site settings, SEO, form
definitions) that map to `ThemeConfig` content. The existing admin already
uses form-based settings (GeneralSettings, PagesSettings). The question is
whether to standardize on a form library.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **React Hook Form** | MIT | **High.** The standard for React form state; actively maintained; minimal re-renders; integrates with Zod. | **High.** Large, active community; the standard. | **Free.** Zero licensing cost; tiny footprint. | **Excellent.** Minimal re-renders; efficient form state. | **Trivial.** React Hook Form is a pure form-state layer; the AWIE Adapter maps validated fields to Commands. Swapping to Formik requires changing only the adapter. | **Excellent.** Familiar form UX; minimal re-renders. | **Good.** Native form controls are keyboard-accessible; the AWIE Adapter must preserve focus and announce validation errors via a polite ARIA live region. | **WRAP** |
| **Zod** | MIT | **High.** The standard for schema validation; actively maintained; TypeScript-first. | **High.** Large, active community; the standard. | **Free.** Zero licensing cost; already adopted via ADR-007/ADR-008. | **Excellent.** Declarative, efficient validation. | **Trivial.** Zod schemas are declarative; the AWIE Adapter validates field payloads before sending Commands. | **Excellent.** TypeScript-first; clear error messages. | **Good.** Validation errors are announced via a polite ARIA live region; never interrupting. | **WRAP** |
| **Formik** | MIT | **High.** Mature and widely used; actively maintained. | **High.** Mature, widely used community. | **Free.** Zero licensing cost; heavier re-render profile than React Hook Form. | **Good.** Mature; heavier re-render profile. | **Trivial.** Formik is a pure form-state layer; swappable behind the same AWIE Adapter. | **Good.** Mature and familiar. | **Good.** Native form controls are keyboard-accessible; the AWIE Adapter must preserve focus and announce errors politely. | **WRAP (alternative)** |
| **Custom form handlers** | — | **Low.** Hand-rolled field state, validation, and error handling duplicates React Hook Form + Zod. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke field state and validation are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built form state risks unannounced validation errors and focus loss. | **BUILD (rejected)** |


### How we WRAP them

- **React Hook Form** powers field state and submission.
- **Zod** guards the field payload against the frozen `@awie/sdk` contracts.
- **The AWIE Form Adapter** maps validated fields to `EditorCommandPayload`
  Commands and sends them to the server.

The `ThemeConfig` form definition (`FormConfig.fields`) remains the
declarative source of field shape; validation and submission wiring live at
the Application Layer, never in the Runtime.

---

## Capability 4: Autosave & Optimistic UI

The existing wire contract is already **Autosave-ready** (`clientSequence`,
`commandId` for idempotent replay). The question is whether to adopt a
server-state library to manage the Command lifecycle.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **TanStack Query** | MIT | **High.** The standard for server-state in React; actively maintained; already adopted via ADR-007/ADR-008. | **High.** Large, active community; the standard. | **Free.** Zero licensing cost; already a dependency. | **Excellent.** Efficient cache and deduplication; minimal re-renders. | **Trivial.** TanStack Query is a pure server-state layer; the AWIE Adapter maps Command results to cache entries. Swapping to SWR requires changing only the adapter. | **Excellent.** Familiar hooks API; minimal boilerplate. | **Good.** Server-state is announced via a polite ARIA live region; the AWIE Adapter must preserve focus during optimistic reconciliation. | **WRAP** |
| **SWR** | MIT | **High.** Vercel-backed; actively maintained; lightweight. | **High.** Vercel-backed; large community. | **Free.** Zero licensing cost. | **Excellent.** Lightweight; efficient revalidation. | **Trivial.** SWR is a pure server-state layer; swappable behind the same AWIE Adapter. | **Excellent.** Lightweight hooks API. | **Good.** Server-state is announced via a polite ARIA live region; the AWIE Adapter must preserve focus during optimistic reconciliation. | **WRAP (alternative)** |
| **Custom autosave queue** | — | **Low.** Hand-rolling debounce, retry, idempotency, and cache invalidation duplicates TanStack Query. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke debounce, retry, and cache logic are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built autosave risks unannounced save states and focus loss. | **BUILD (rejected)** |


### How we WRAP them

- **TanStack Query** manages the Command lifecycle (pending/error/success,
  retry, cache invalidation).
- **The AWIE Command Adapter** maps a `useMutation` to an
  `EditorCommandPayload` Command and reconciles the returned RenderNode
  preview.
- **Optimistic UI** is layered on top: the editor optimistically applies the
  Command's intent while the server round-trips, then reconciles with the
  authoritative RenderNode preview.

The `clientSequence` and `commandId` in the existing wire contract enable
idempotent replay and out-of-order detection, which TanStack Query's retry
semantics consume directly.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Block Editing** | Lexical | MIT | **WRAP** | Editor Adapter maps editor output to Commands; server applies and returns RenderNode. | **Low** |
| **Block Editing** (alt) | ProseMirror / TipTap | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Block Editing** (alt) | Slate | MIT | **WRAP (rejected)** | Model differs; migration cost. | **Medium** |
| **Visual Preview** | dnd-kit | MIT | **WRAP** | Interaction Adapter maps drag events to Commands; DumbPreviewViewer stays pure. | **Low** |
| **Visual Preview** (alt) | react-dnd / react-moveable | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Form Editing** | React Hook Form + Zod | MIT | **WRAP** | Form Adapter maps validated fields to Commands. | **Low** |
| **Form Editing** (alt) | Formik | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Autosave / Optimistic** | TanStack Query | MIT | **WRAP** | Command Adapter maps mutations to Commands; consumes `clientSequence`/`commandId`. | **Low** |
| **Autosave / Optimistic** (alt) | SWR | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Editor Adapters** | AWIE Command/Editor/Interaction/Form Adapters | — | **BUILD** | AWIE core IP; map OSS output to the frozen Command model. | **Low** |

---

## Decision

**Adopt a WRAP strategy for all generic editor infrastructure, and a minimal
BUILD for the AWIE Adapters that map OSS output to the frozen Command model.**

- **Block Editing → Lexical (WRAP).** Lexical powers the rich-text/block
  surface. ProseMirror/TipTap are compatible alternatives behind the same
  Editor Adapter.
- **Visual Preview → dnd-kit (WRAP).** dnd-kit powers drag-and-drop. The
  `DumbPreviewViewer` remains a pure renderer; interaction is layered on top
  via the Interaction Adapter.
- **Form Editing → React Hook Form + Zod (WRAP).** React Hook Form powers
  field state; Zod guards payloads against the frozen contracts.
- **Autosave / Optimistic UI → TanStack Query (WRAP).** TanStack Query
  manages the Command lifecycle and consumes the existing `clientSequence` /
  `commandId` wire contract.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The AWIE Editor Adapters** — the mapping of OSS editor output (Lexical
  state, dnd-kit drop events, React Hook Form fields) to the frozen
  `EditorCommandPayload` Command model. This is AWIE's orchestration model.
- **The Command model & Preview Session** — the wire contract and the
  server-side Preview Session that decouples Draft from Published state.
- **The CMS → Runtime boundary** — only the resolved execution contract
  (`ThemeConfig`) crosses the boundary; the editor never holds it.
- **The immutable `ThemeConfig` invariant** — the editor emits Commands; it
  never mutates the SSOT.

---

## Consequences

**Positive:**
- **Reduced maintenance.** We stop maintaining hand-rolled rich-text,
  drag-and-drop, form state, and autosave infrastructure. Lexical, dnd-kit,
  React Hook Form, Zod, and TanStack Query are community-maintained and
  battle-tested.
- **Dumb Client preserved.** The editor never holds or mutates the
  `ThemeConfig`. It sends Commands and renders the RenderNode preview the
  server returns. The Phase 12.5 boundary is preserved.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP
  (the Editor Adapters and the Command model), aligning with Article VII.
- **Replaceability.** Swapping Lexical for ProseMirror, or dnd-kit for
  react-dnd, requires changing only the AWIE Adapter — never the Command
  model nor its consumers.
- **Autosave-ready.** The existing `clientSequence` / `commandId` wire
  contract is consumed directly by TanStack Query's retry and idempotency
  semantics.

**Negative:**
- **New dependencies.** Adds Lexical, dnd-kit, and React Hook Form to the
  admin dependency tree (all are small, MIT-licensed, and tree-shakeable).
  TanStack Query and Zod are already adopted.
- **Adapter indirection.** A thin AWIE Adapter layer is required to map OSS
  output to Commands. This indirection must be documented and tested.
- **Server round-trip latency.** Every edit is a Command round-trip to the
  server. Optimistic UI mitigates perceived latency but adds reconciliation
  complexity.

**Trade-off:** We accept a small admin dependency footprint and an Adapter
layer in exchange for dramatically lower maintenance cost, battle-tested
tooling, and — most importantly — an editor that is a Dumb Client by
construction, never a bypass of the frozen Core Constitution.

---

## Alternatives Considered

1. **Custom block editor (Level 3 BUILD).** Rejected: violates Article VII.
   Hand-rolling contenteditable, selection, undo/redo, and rich-text
   serialization duplicates Lexical/ProseMirror.
2. **Slate as the primary block editor.** Rejected: its model differs from
   Lexical/ProseMirror, increasing migration cost. It remains a compatible
   alternative.
3. **Custom drag-and-drop (Level 3 BUILD).** Rejected: duplicates dnd-kit /
   react-dnd (pointer tracking, hit-testing, accessibility).
4. **Custom form handlers (Level 3 BUILD).** Rejected: duplicates React Hook
   Form + Zod (field state, validation, error handling).
5. **Custom autosave queue (Level 3 BUILD).** Rejected: duplicates TanStack
   Query (debounce, retry, idempotency, cache invalidation).
6. **Enhancing DumbPreviewViewer with interaction logic.** Rejected: would
   violate the Dumb Client rule. The viewer stays a pure renderer; interaction
   is layered on top via the Interaction Adapter.

---

## Compliance

This ADR is **Proposed (Research)** and awaits ARB review. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the editor NEVER holds, mutates, or
  decides the `ThemeConfig`. It sends Commands and renders the RenderNode
  preview the server returns.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the editor never
  imports the GoldenPathOrchestrator or any Runtime service; the server is the
  sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the editor never resolves,
  edits, composes, validates, or decides presentation.
- The **Permission Snapshot strategy (ADR-009)** — the editor renders a
  permission snapshot; it never evaluates permissions itself.
- The **Buy Before Build constitution (ADR-007)** — generic editor
  infrastructure is delegated to OSS; only the AWIE Editor Adapters and the
  Command model remain custom.
- The **immutable `ThemeConfig` invariant** — the editor emits Commands; it
  never mutates the SSOT.
