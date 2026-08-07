# ADR 014 — Drag & Drop Strategy (Phase 17.4: Admin Platform)

> **Status:** Proposed (AR-0 — awaiting CTO review)
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor, Phase 17.4)
> **Scope:** Research only. This ADR evaluates the OSS landscape for the AWIE
> **Drag & Drop** capability (reordering sections in the Canvas, Zone 2 of
> ADR-011D) and records a Buy/Wrap/Build decision per capability. It does NOT
> implement the drag & drop system. It FREEZES the architectural boundary the
> drag & drop system MUST respect: the **Dumb Client** rule (ADR-011A), the
> **Semantic Component Identity** selection rule (Amendment G / ADR-012), and
> the **Server-Side Orchestrator** boundary (Phase 12.5).
>
> **Constitutional Rule (ADR-014):**
> > **"Drag & Drop is a Dumb Client interaction. It produces intent only. The
> > client previews the intended insertion; the Server performs the actual
> > Composition. Drag & Drop NEVER mutates ThemeConfig."**
>
> **Amendment J (Drag Is Intent Only) — FROZEN:**
> > **"Dragging MUST NEVER mutate ThemeConfig. Dragging only produces an
> > EditorCommandPayload. The Server performs the actual Composition. The client
> > only previews the intended insertion."**
>
> **Amendment K (Preview Is Disposable) — FROZEN:**
> > **"Ephemeral UI elements (e.g., Ghost elements, drop indicators, insertion
> > lines, placeholders) MUST NEVER be saved in ThemeConfig, RenderNode, or
> > SelectionSnapshot. They are strictly disposable visual state."**
>
> **Amendment L (Drop Target Is Semantic) — FROZEN:**
> > **"Drop targets MUST be identified ONLY by Semantic Component Identity. Drop
> > calculations MUST NEVER depend on DOM position, React keys, RenderNode ids,
> > or visual coordinates as persistent identity. Visual coordinates are
> > transient only."**
>
> **Amendment M (Preview Is Not Composition) — FROZEN:**
> > **"Drag preview MUST NEVER trigger Composition. Composition occurs ONLY after
> > the server accepts an EditorCommand. Client previews are visual
> > approximations only (using DragOverlay)."**
>
> This ADR is bound by the frozen Core Constitution:


> - **ADR-007 (Buy Before Build):** generic drag & drop infrastructure MUST be
>   delegated to mature OSS. Only AWIE's core IP (the Command model, the
>   Semantic Component Identity binding, the composition intent) remains custom.
> - **ADR-008 (Runtime Purity):** the drag & drop system never composes,
>   reorders, validates, or decides the ThemeConfig. It emits Commands; the
>   server orchestrates.
> - **ADR-009 (Permission Snapshot):** the drag & drop system renders a
>   permission snapshot; it never evaluates permissions itself.
> - **ADR-010 (DX & SDK):** the drag & drop system is a consumer of the frozen
>   `@awie/sdk` contracts, never a bypass.
> - **ADR-011A (Admin Editor Strategy):** the drag & drop system is a Dumb
>   Client; it sends Commands and renders the RenderNode preview the server
>   returns.
> - **ADR-011D (Editor Layout Contract):** the Canvas is the drag & drop zone;
>   the four-zone layout is fixed.
> - **Amendment G / ADR-012 (Semantic Component Identity):** the drag & drop
>   system binds to `selectedComponentId` (the Semantic Component Identity) —
>   the ONLY selection identity. It NEVER uses `nodeId`, DOM id, React key,
>   RenderNode id, tree index, or runtime UUID.

---

## Context

Phase 17.3 (Property Inspector) is complete and approved. The Editor Shell now
has a working Selection Model (Phase 17.2), a Property Inspector (Phase 17.3),
and a Canvas that renders the RenderNode preview. The next capability is
**Drag & Drop**: the user must be able to reorder sections in the Canvas by
dragging them to a new position.

The CTO's hypothesis: **Do we need to build the drag & drop infrastructure from
scratch, or can we WRAP mature OSS (dnd-kit) behind the existing Dumb Client
boundary?** The drag & drop interaction is a well-solved problem in the OSS
ecosystem; the genuinely AWIE-specific part is the **composition intent** — the
mapping of a drop position to an `EditorCommandPayload` that the Server applies.

This ADR evaluates each custom implementation against industry-standard
open-source equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig` via the Command model.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (the Command
   model, the Semantic Component Identity binding, the composition intent).

### The drag & drop system's constitutional duty

The drag & drop system is a **Dumb Client**. It is bound by the same
constitution it serves:

- The drag & drop system NEVER holds or mutates the `ThemeConfig`. It binds to
  the Semantic Component Identity, tracks the drag gesture, and emits a Command
  describing the intended insertion. The server applies the Command and returns
  a NEW RenderNode preview.
- The drag & drop system NEVER composes, reorders, validates, or decides
  presentation. Those responsibilities live in the Application Layer
  (EditorService → PatchPipeline) and the Runtime Layer
  (GoldenPathOrchestrator → RenderNode), both server-side.
- The drag & drop system renders a **permission snapshot** (ADR-009); it never
  evaluates permissions itself.
- The drag & drop system is a consumer of the frozen `@awie/sdk` contracts
  (ADR-010); it never bypasses them.
- The drag & drop system binds to `selectedComponentId` (the Semantic Component
  Identity, Amendment G / ADR-012) — the ONLY selection identity. It NEVER uses
  `nodeId`, DOM id, React key, RenderNode id, tree index, or runtime UUID.

---

## Capability 1: Drag & Drop Interaction (reordering sections)

The core drag & drop capability. The user drags a section in the Canvas to a
new position. The system tracks the gesture, computes the intended insertion
point, and emits a Command. The server performs the actual reorder.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **dnd-kit** | MIT | **High.** The modern standard for React drag & drop; actively maintained; headless, framework-agnostic core; supports sortable, draggable, droppable, sensors (pointer, keyboard, touch), and collision detection. | **High.** Large, active community; the current standard. | **Free.** Zero licensing cost; small, tree-shakeable footprint. | **Excellent.** Optimized for React; minimal re-renders; uses sensors and collision detection. | **Trivial.** dnd-kit is a pure interaction layer; the AWIE Drag & Drop Adapter maps the drop result to a Command. Swapping to React DnD requires changing only the adapter. | **Excellent.** Headless; full control over the drag UX; keyboard sensor built in. | **Excellent.** Keyboard sensor and screen-reader support built in; the AWIE Drag & Drop Adapter must preserve focus and announce drop results politely. | **WRAP** |
| **React DnD** | MIT | **Medium.** Mature and widely used; historically slower to evolve; requires HTML5 backend or touch backend. | **High.** Mature, widely used community. | **Free.** Zero licensing cost; heavier footprint. | **Good.** Mature; heavier re-render profile. | **Trivial.** React DnD is a pure interaction layer; swappable behind the same AWIE Drag & Drop Adapter. | **Good.** Mature and familiar. | **Good.** Keyboard support via the HTML5 backend; the AWIE Drag & Drop Adapter must preserve focus and announce drop results politely. | **WRAP (alternative)** |
| **Atlassian Pragmatic Drag and Drop** | Apache-2.0 | **High.** Modern, framework-agnostic, actively maintained by Atlassian; designed for complex, accessible drag & drop. | **Medium.** Growing community; newer than dnd-kit. | **Free.** Zero licensing cost; small footprint. | **Excellent.** Framework-agnostic; efficient. | **Trivial.** Pragmatic DnD is a pure interaction layer; swappable behind the same AWIE Drag & Drop Adapter. | **Excellent.** Strong accessibility focus; keyboard and screen-reader support. | **Excellent.** Accessibility-first design; the AWIE Drag & Drop Adapter must preserve focus and announce drop results politely. | **WRAP (alternative)** |
| **Native HTML5 DnD** | — (platform) | **High.** Browser-native; zero maintenance; no dependency. | **N/A.** Platform feature. | **Free.** Zero licensing cost; zero bundle weight. | **Good.** Native; no JS overhead. | **Trivial.** Native DnD; the AWIE Drag & Drop Adapter maps the drop result to a Command. | **Poor.** Native HTML5 DnD has inconsistent cross-browser UX and poor touch support. | **Poor.** Native HTML5 DnD has poor keyboard and screen-reader support. | **BUY (rejected)** |
| **Custom drag & drop handlers** | — | **Low.** Hand-rolled pointer tracking, collision detection, sensors, and accessibility duplicates dnd-kit. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke pointer math and collision detection are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built drag & drop risks focus traps and unannounced drop results. | **BUILD (rejected)** |

### How we WRAP them

- **dnd-kit** powers the drag gesture: sensors (pointer, keyboard, touch),
  draggable/droppable/sortable primitives, and collision detection.
- **The AWIE Drag & Drop Adapter** maps the drop result (the dragged section's
  Semantic Component Identity + the target insertion point) to an
  `EditorCommandPayload` Command and sends it to the server.
- **The AWIE Drag & Drop Adapter** is the ONLY consumer of dnd-kit. No other
  editor component imports dnd-kit.

The `SectionConfig` order remains the declarative source of composition; the
reorder logic lives at the Application Layer (EditorService → PatchPipeline),
never in the Runtime.

---

## Capability 2: Composition Intent (the drop → Command mapping)

The drag & drop system must translate a drop position into a **composition
intent** — a Command that tells the server to reorder a section. This is
**AWIE core IP** (BUILD): it is derived from the Semantic Component Identity and
the frozen `SectionConfig` order, and it is the contract that binds the drag &
drop system to the Command model.

### OSS Survey (BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Zod schema** | MIT | **High.** Zod is already adopted; a Zod schema is the natural declarative guard for the Command payload. | **High.** Large, active community. | **Free.** Zero licensing cost; already a dependency. | **Excellent.** Declarative, efficient. | **Trivial.** The composition intent is a Zod-guarded Command; it is swappable and versionable. | **Excellent.** TypeScript-first; clear error messages. | **Good.** Command payloads drive accessible drop announcements. | **BUILD (Zod-backed)** |
| **Custom hand-coded reorder logic** | — | **Low.** Hand-rolled reorder math duplicates a declarative Command model. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke reorder logic is error-prone and hard to version. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built reorder logic risks inconsistent drop announcements. | **BUILD (rejected)** |

### How we BUILD it

- **The AWIE Drag & Drop Adapter** maps the drop result to a Zod-guarded
  `EditorCommandPayload` (e.g., `composition.reorder-section`). It binds to the
  Semantic Component Identity of the dragged section and the target insertion
  point.
- **The AWIE Drag & Drop Adapter** validates the payload with Zod before sending
  the Command to the server.

The composition intent is AWIE's orchestration model — it is the contract that
binds the drag & drop system to the Command model. It is NOT delegated to OSS.

---

## Capability 3: Disposable Preview State (Ghost, Drop Indicator, Insertion Line)

The drag & drop system must render ephemeral UI elements during the gesture: a
**ghost** of the dragged section, a **drop indicator**, and an **insertion
line** showing where the section will land. These are **strictly disposable
visual state** (Amendment K). They MUST NEVER be saved in ThemeConfig,
RenderNode, or SelectionSnapshot.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **dnd-kit (DragOverlay)** | MIT | **High.** dnd-kit ships a `DragOverlay` primitive for rendering the ghost element; it is disposable by design. | **High.** Large, active community. | **Free.** Zero licensing cost; already the chosen library. | **Excellent.** Optimized for React; minimal re-renders. | **Trivial.** The overlay is a pure visual layer; the AWIE Drag & Drop Adapter keeps it out of the Command model. | **Excellent.** Headless; full control over the ghost UX. | **Excellent.** Keyboard sensor and screen-reader support built in. | **WRAP** |
| **Custom ghost/indicator rendering** | — | **Low.** Hand-rolled overlay, drop indicator, and insertion-line rendering duplicates dnd-kit's DragOverlay. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke overlay rendering is error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built overlays risk focus traps and unannounced drop results. | **BUILD (rejected)** |

### How we WRAP them

- **dnd-kit's `DragOverlay`** renders the ghost element during the gesture.
- **The AWIE Drag & Drop Adapter** keeps all ephemeral UI state (ghost, drop
  indicator, insertion line) in a **disposable local store** that is cleared on
  drop or cancel. It NEVER writes this state to ThemeConfig, RenderNode, or
  SelectionSnapshot (Amendment K).

The disposable preview state is a pure visual concern; it is delegated to
dnd-kit and kept strictly out of the persistent model.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Drag & Drop Interaction** | dnd-kit | MIT | **WRAP** | Drag & Drop Adapter maps drop result to a Command. | **Low** |
| **Drag & Drop Interaction** (alt) | React DnD | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Drag & Drop Interaction** (alt) | Pragmatic Drag and Drop | Apache-2.0 | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Drag & Drop Interaction** (alt) | Native HTML5 DnD | — | **BUY (rejected)** | Poor touch/a11y; inconsistent cross-browser. | **Low** |
| **Composition Intent** | Zod-guarded Command | MIT | **BUILD** | AWIE core IP; binds drag & drop to Command model. | **Low** |
| **Disposable Preview State** | dnd-kit DragOverlay | MIT | **WRAP** | Ghost/indicator/insertion line kept out of the model. | **Low** |
| **Drag & Drop Adapter** | AWIE Drag & Drop Adapter | — | **BUILD** | AWIE core IP; maps OSS drop result to the frozen Command model. | **Low** |

---

## Decision

**Adopt a WRAP strategy for all generic drag & drop infrastructure, and a
minimal BUILD for the AWIE Drag & Drop Adapter and the composition intent.**

- **Drag & Drop Interaction → dnd-kit (WRAP).** dnd-kit powers the drag gesture
  (sensors, draggable/droppable/sortable primitives, collision detection). It is
  headless, framework-agnostic, accessible, and the modern standard.
- **Disposable Preview State → dnd-kit DragOverlay (WRAP).** The ghost element,
  drop indicator, and insertion line are rendered by dnd-kit and kept strictly
  out of the persistent model (Amendment K).
- **Composition Intent → Zod-guarded Command (BUILD).** The mapping of a drop
  result to an `EditorCommandPayload` is AWIE core IP; it binds the drag & drop
  system to the Command model.
- **Drag & Drop Adapter → AWIE Drag & Drop Adapter (BUILD).** The mapping of the
  OSS drop result to the frozen `EditorCommandPayload` Command model is AWIE's
  orchestration model.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The AWIE Drag & Drop Adapter** — the mapping of the OSS drop result (dnd-kit)
  to the frozen `EditorCommandPayload` Command model. This is AWIE's
  orchestration model.
- **The composition intent** — the Zod-guarded Command that tells the server to
  reorder a section, derived from the Semantic Component Identity and the frozen
  `SectionConfig` order.
- **The Semantic Component Identity binding** — the drag & drop system binds to
  `selectedComponentId` (Amendment G / ADR-012); it never uses `nodeId`, DOM id,
  React key, RenderNode id, tree index, or runtime UUID.
- **The immutable `ThemeConfig` invariant** — the drag & drop system emits
  Commands; it never mutates the SSOT (Amendment J).

---

## Consequences

**Positive:**
- **Reduced maintenance.** We stop maintaining hand-rolled pointer tracking,
  collision detection, sensors, and accessibility. dnd-kit is battle-tested and
  the modern standard.
- **Dumb Client preserved.** The drag & drop system never holds or mutates the
  `ThemeConfig`. It binds to the Semantic Component Identity, tracks the drag
  gesture, and emits a Command. The Phase 12.5 boundary is preserved.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP (the
  Drag & Drop Adapter and the composition intent), aligning with Article VII.
- **Replaceability.** Swapping dnd-kit for React DnD or Pragmatic Drag and Drop
  requires changing only the AWIE Drag & Drop Adapter — never the Command model
  nor its consumers.
- **Accessibility.** dnd-kit ships a keyboard sensor and screen-reader support
  built in, satisfying the a11y requirement without custom work.
- **Disposable preview state.** Ghost elements, drop indicators, and insertion
  lines are strictly disposable (Amendment K); they never pollute the persistent
  model.

**Negative:**
- **Adapter indirection.** A thin AWIE Drag & Drop Adapter layer is required to
  map OSS drop results to Commands. This indirection must be documented and
  tested.
- **Server round-trip latency.** Every drop is a Command round-trip to the
  server. Optimistic UI (ADR-011A Capability 4) mitigates perceived latency but
  adds reconciliation complexity.

**Trade-off:** We accept a thin Adapter layer in exchange for dramatically lower
maintenance cost, battle-tested tooling, and — most importantly — a drag & drop
system that is a Dumb Client by construction, never a bypass of the frozen Core
Constitution.

---

## Alternatives Considered

1. **Custom drag & drop handlers (Level 3 BUILD).** Rejected: duplicates dnd-kit
   (pointer tracking, collision detection, sensors, accessibility).
2. **Native HTML5 DnD (Level 1 BUY).** Rejected: poor touch support, inconsistent
   cross-browser UX, and poor keyboard/screen-reader support.
3. **React DnD as the primary library.** Considered: mature but heavier and
   slower to evolve; dnd-kit is the modern standard with a keyboard sensor built
   in.
4. **Atlassian Pragmatic Drag and Drop as the primary library.** Considered:
   excellent accessibility, but newer and with a smaller community than dnd-kit.
5. **Hand-coded reorder logic (Level 3 BUILD).** Rejected: duplicates a
   declarative Command model; error-prone and hard to version.

---

## Compliance

This ADR is **Proposed (AR-0)** and awaits CTO review. The following invariants
MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the drag & drop system NEVER holds,
  mutates, or decides the `ThemeConfig`. It binds to the Semantic Component
  Identity, tracks the drag gesture, and emits Commands.
- **Amendment J (Drag Is Intent Only)** — dragging NEVER mutates ThemeConfig.
  Dragging only produces an `EditorCommandPayload`. The Server performs the
  actual Composition. The client only previews the intended insertion.
- **Amendment K (Preview Is Disposable)** — ephemeral UI elements (Ghost
  elements, drop indicators, insertion lines, placeholders) MUST NEVER be saved
  in ThemeConfig, RenderNode, or SelectionSnapshot. They are strictly disposable
  visual state.
- The **Semantic Component Identity rule (Amendment G / ADR-012)** — the drag &
  drop system binds to `selectedComponentId`; it NEVER uses `nodeId`, DOM id,
  React key, RenderNode id, tree index, or runtime UUID.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the drag & drop
  system never imports the GoldenPathOrchestrator or any Runtime service; the
  server is the sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the drag & drop system never
  composes, reorders, validates, or decides presentation.
- The **Permission Snapshot strategy (ADR-009)** — the drag & drop system
  renders a permission snapshot; it never evaluates permissions itself.
- The **Buy Before Build constitution (ADR-007)** — generic drag & drop
  infrastructure is delegated to OSS; only the AWIE Drag & Drop Adapter and the
  composition intent remain custom.
- The **immutable `ThemeConfig` invariant** — the drag & drop system emits
  Commands; it never mutates the SSOT.
