# ADR 011D — Editor Layout & UI Framework Contract

> **Status:** Proposed (Research) — awaiting CTO review
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor Layout & UI Framework)
> **Scope:** Research only. This ADR FREEZES the **Editor Layout Contract** and
> records the **UI Component Library AR-0** decision per the upgraded 10-column
> AR-0 schema. It does NOT implement the editor shell. It establishes the
> non-negotiable layout paradigm and the UI framework boundary that Phase 17.1
> MUST respect.
>
> **Constitutional Rule (ADR-011D):**
> > **"The Editor Shell MUST implement the exact Layout Contract defined in
> > Section A. No inventing layouts during implementation. The UI Component
> > Library is a WRAP behind a framework-agnostic core, never a lock-in."**
>
> This ADR is bound by the frozen Core Constitution:
> - **ADR-007 (Buy Before Build):** generic UI infrastructure MUST be delegated
>   to mature OSS. Only AWIE's core IP (the Command model, the Preview Session,
>   the Layout Contract) remains custom.
> - **ADR-008 (Runtime Purity):** the editor never resolves, edits, composes,
>   validates, or decides presentation. The shell is a Dumb Client; it renders
>   the RenderNode preview the server returns.
> - **ADR-011A (Admin Editor Strategy):** the editor is a Dumb Client. It sends
>   Commands and renders the RenderNode preview the server returns.
> - **ADR-011B (Editor History):** Undo/Redo is a server-side, Command-scoped
>   operation. Local history is ephemeral.
> - **ADR-011C (Autosave):** Autosave is silent, non-blocking, and Drafts-only.
> - **Accessibility (A11y):** The Editor Shell MUST be fully keyboard- and
>   screen-reader-accessible. The chosen UI library MUST have supreme A11y.

---

## Section A — The Layout Paradigm

The CTO has mandated a **hybrid UX paradigm** that combines the strongest
interaction models from Elementor, Figma, and Notion. This is the **exact
contract** the Editor Shell MUST implement. No alternative layout may be
invented during implementation.

### A.1 The four-zone shell

The Editor Shell is a **four-zone workspace**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Top Bar (global actions: Publish, Preview, Undo/Redo, Settings)    │
├───────────────┬──────────────────────────────────┬──────────────────┤
│  LEFT         │                                  │  RIGHT           │
│  SIDEBAR      │        MAIN CANVAS              │  SIDEBAR         │
│  Component    │   Responsive Preview &           │  Property        │
│  Tree /       │   Selection Model                │  Inspector       │
│  Hierarchy    │                                  │  (Figma style)   │
│  (Elementor)  │   [Inline Editing: Lexical       │                  │
│               │    activates on double-click]    │                  │
│               │                                  │                  │
└───────────────┴──────────────────────────────────┴──────────────────┘
```

### A.2 Zone responsibilities (MANDATORY)

1. **Left Sidebar — Component Tree / Hierarchy (Elementor style).**
   - Displays the Project's section/component hierarchy as a navigable tree.
   - Each node maps to a `SectionConfig` entry in the immutable `ThemeConfig`.
   - Selecting a node in the tree selects the corresponding element on the
     Main Canvas (bidirectional selection).
   - The tree is a **Dumb Client** view: it renders the hierarchy the server
     returns; it never holds or mutates the ThemeConfig.

2. **Main Canvas — Responsive Preview & Selection Model.**
   - Renders the live RenderNode preview via the existing `DumbPreviewViewer`.
   - Supports **responsive breakpoints** (desktop / tablet / mobile) so the
     user can preview the site at each viewport.
   - Implements the **Selection Model**: clicking an element selects it;
     the selection is reflected in the Left Sidebar tree and the Right
     Sidebar Property Inspector.
   - The canvas is a **pure renderer + selection layer**. It never holds the
     ThemeConfig and never decides layout.

3. **Right Sidebar — Property Inspector (Figma style).**
   - Displays the properties of the currently selected element.
   - Properties map to `SectionConfig` fields (content, style, layout,
     spacing, etc.).
   - Editing a property emits a **Command** (`content.update-heading`,
     `style.update`, `layout.moveSection`, etc.) to the server; the server
     returns a NEW RenderNode preview.
   - The inspector is a **Dumb Client**: it renders the selected element's
     properties and emits Commands; it never mutates the ThemeConfig.

4. **Inline Editing — Lexical on double-click (Notion style).**
   - Double-clicking a text element on the Main Canvas activates **Lexical**
     inline editing in place.
   - The user edits text directly on the canvas (Notion-style), with Lexical's
     native local history handling in-flight typing (ADR-011B).
   - On commit (blur), the edit is mapped to a Command and sent to the server
     (ADR-011C Autosave / ADR-011B History).
   - Inline editing is a **Dumb Client** interaction: Lexical edits local
     state; the committed result is a Command.

### A.3 The shell's constitutional duty

The Editor Shell is a **Dumb Client** (ADR-011A). It is bound by the same
constitution it serves:

- The shell NEVER holds, mutates, or decides the `ThemeConfig`. It sends
  Commands and renders the RenderNode preview the server returns.
- The shell NEVER resolves, edits, composes, validates, or decides
  presentation. Those responsibilities live in the Application Layer
  (EditorService → PatchPipeline) and the Runtime Layer
  (GoldenPathOrchestrator → RenderNode), both server-side.
- The shell renders a **permission snapshot** (ADR-009); it never evaluates
  permissions itself.
- The shell is a consumer of the frozen `@awie/sdk` contracts (ADR-010); it
  never bypasses them.

### A.4 Non-negotiable layout rules

1. **The four-zone shell is fixed.** Left Sidebar, Main Canvas, Right
   Sidebar, and Inline Editing are the ONLY layout paradigm. No alternative
   layout may be invented during implementation.
2. **Bidirectional selection is mandatory.** Selecting in the tree selects on
   the canvas; selecting on the canvas selects in the tree and populates the
   inspector.
3. **Responsive preview is mandatory.** The Main Canvas MUST support
   desktop / tablet / mobile breakpoints.
4. **Inline editing is mandatory.** Double-click on a text element MUST
   activate Lexical inline editing in place.
5. **The shell is a Dumb Client.** Every interaction that changes state is a
   Command; the server is the sole orchestrator.

---

## Section B — UI Component Library AR-0

To prevent **"UI Framework Lock-in,"** the CTO requires an explicit AR-0
decision on the UI Component Library. The chosen library MUST be a **WRAP**,
keeping the core Editor logic framework-agnostic, and MUST have **supreme
Accessibility (A11y)**.

### B.1 The evaluation constraint

- **WRAP, not BUY.** The library is adopted behind an AWIE-owned **UI Adapter**
  that maps library components to the frozen Command model. The core Editor
  logic depends only on AWIE interfaces — never on the library's types.
- **Supreme A11y.** The library MUST be WCAG 2.1 AA (or better) compliant,
  keyboard-accessible, and screen-reader-friendly out of the box.
- **Replaceability.** Swapping the library MUST require changing only the UI
  Adapter, never the Command model nor its consumers.

### B.2 OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Shadcn UI** | MIT | **High.** Radix UI primitives + Tailwind; actively maintained; copy-paste model; no runtime dependency. | **High.** Explosive growth; the modern React standard. | **Free.** Zero licensing cost; no runtime dependency (components are copied into your repo). | **Excellent.** Tree-shakeable by construction; only the components you copy are bundled. | **Trivial.** Components are copied into the repo; the AWIE UI Adapter maps them to Commands. Swapping to Mantine requires changing only the adapter. | **Excellent.** Copy-paste model; full control; Tailwind-based styling. | **Excellent.** Built on Radix UI primitives, which are WCAG 2.1 AA compliant, keyboard- and screen-reader-accessible by default. | **WRAP (recommended)** |
| **Mantine** | MIT | **High.** Actively maintained; comprehensive component suite; hooks-based. | **High.** Large, active community. | **Free.** Zero licensing cost; adds a runtime dependency. | **Good.** Efficient; tree-shakeable; slightly heavier than Shadcn. | **Trivial.** Mantine is a pure component layer; the AWIE UI Adapter maps components to Commands. Swapping to Shadcn requires changing only the adapter. | **Excellent.** Rich component suite; excellent hooks; great defaults. | **Excellent.** WCAG 2.1 AA compliant; keyboard- and screen-reader-accessible; strong focus management. | **WRAP (alternative)** |
| **MUI (Material UI)** | MIT | **High.** Mature and widely used; actively maintained; large ecosystem. | **High.** Very large, mature community. | **Free.** Zero licensing cost; adds a runtime dependency. | **Good.** Mature; heavier bundle; Emotion-based styling. | **Trivial.** MUI is a pure component layer; the AWIE UI Adapter maps components to Commands. Swapping requires changing only the adapter. | **Good.** Familiar Material Design; comprehensive components. | **Good.** WCAG 2.1 AA compliant; keyboard- and screen-reader-accessible; some components require manual A11y wiring. | **WRAP (alternative)** |
| **Ant Design** | MIT | **High.** Mature and widely used; actively maintained; enterprise-focused. | **High.** Very large, mature community (esp. in Asia). | **Free.** Zero licensing cost; adds a runtime dependency. | **Good.** Mature; heavier bundle; CSS-in-JS styling. | **Trivial.** Ant Design is a pure component layer; the AWIE UI Adapter maps components to Commands. Swapping requires changing only the adapter. | **Good.** Enterprise-grade components; comprehensive. | **Good.** WCAG 2.1 AA compliant; keyboard- and screen-reader-accessible; some components require manual A11y wiring. | **WRAP (alternative)** |

### B.3 How we WRAP them

- **The AWIE UI Adapter** is the ONLY coupling point. It maps library
  components (buttons, inputs, trees, inspectors) to the frozen Command model
  and the RenderNode preview.
- **The core Editor logic** depends only on AWIE interfaces — never on the
  library's types. This preserves **replaceability** (Amendment A) and
  **exit strategy** (Amendment B): swapping Shadcn for Mantine, MUI, or Ant
  Design requires changing only the UI Adapter — never the Command model nor
  its consumers.
- **The Layout Contract (Section A)** is implemented with the chosen library's
  primitives, but the four-zone shell structure is AWIE-owned and
  framework-agnostic.

### B.4 AR-0 Decision

**Adopt Shadcn UI (WRAP) as the primary UI Component Library.**

- **Shadcn UI (WRAP, recommended).** Built on Radix UI primitives, which are
  WCAG 2.1 AA compliant, keyboard- and screen-reader-accessible by default.
  The copy-paste model means no runtime dependency and full control over the
  components. This gives AWIE **supreme A11y** with **zero lock-in**.
- **Mantine (WRAP, alternative).** A comprehensive, hooks-based suite with
  excellent A11y defaults. A compatible alternative behind the same UI Adapter.
- **MUI / Ant Design (WRAP, alternatives).** Mature, enterprise-grade suites
  with good A11y. Compatible alternatives behind the same UI Adapter.

### B.5 What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The Layout Contract (Section A)** — the four-zone shell (Left Sidebar,
  Main Canvas, Right Sidebar, Inline Editing). This is AWIE's orchestration
  model.
- **The AWIE UI Adapter** — the mapping of library components to the frozen
  Command model and the RenderNode preview.
- **The bidirectional Selection Model** — the tree ↔ canvas ↔ inspector
  selection synchronization.
- **The Command model & Preview Session** — the wire contract and the
  server-side Draft state that every shell interaction writes to.

---

## Consequences

**Positive:**
- **No UI lock-in.** The chosen library is a WRAP behind the AWIE UI Adapter.
  Swapping Shadcn for Mantine, MUI, or Ant Design requires changing only the
  adapter — never the Command model nor its consumers.
- **Supreme A11y.** Shadcn UI (Radix primitives) is WCAG 2.1 AA compliant,
  keyboard- and screen-reader-accessible by default. The Editor Shell is
  accessible to all users.
- **Fixed Layout Contract.** The four-zone shell is frozen. No inventing
  layouts during implementation. The Elementor / Figma / Notion hybrid is
  implemented exactly as specified.
- **Dumb Client preserved.** The shell never holds or mutates the ThemeConfig.
  Every interaction that changes state is a Command; the server orchestrates.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP (the
  Layout Contract, the UI Adapter, the Selection Model, the Command model).

**Negative:**
- **New dependency.** Adds Shadcn UI (Radix primitives + Tailwind) to the
  admin dependency tree. Shadcn's copy-paste model minimizes this, but the
  components are still in the repo.
- **Adapter indirection.** A thin AWIE UI Adapter layer is required to map
  library components to Commands. This indirection must be documented and
  tested.
- **Layout complexity.** The four-zone shell (tree + canvas + inspector +
  inline editing) is a complex UI to build and maintain. The bidirectional
  Selection Model adds synchronization complexity.

**Trade-off:** We accept a UI Adapter layer and a complex four-zone shell in
exchange for zero UI lock-in, supreme A11y, and a fixed, reviewable Layout
Contract that keeps the editor a Dumb Client by construction.

---

## Alternatives Considered

1. **Mantine as the primary library.** Rejected as primary: excellent A11y and
   DX, but Shadcn's copy-paste model (no runtime dependency, full control)
   gives AWIE zero lock-in. Mantine remains a compatible alternative.
2. **MUI as the primary library.** Rejected as primary: mature and
   enterprise-grade, but heavier bundle and Emotion-based styling add
   indirection. Remains a compatible alternative.
3. **Ant Design as the primary library.** Rejected as primary: mature and
   enterprise-focused, but heavier bundle and CSS-in-JS styling add
   indirection. Remains a compatible alternative.
4. **Custom UI components (Level 3 BUILD).** Rejected: violates Article VII.
   Hand-rolling buttons, inputs, trees, and inspectors duplicates Radix /
   Mantine / MUI.
5. **Inventing a new layout during implementation.** Rejected: the four-zone
   shell is the CTO-mandated contract. No alternative layout may be invented.

---

## Compliance

This ADR is **Proposed (Research)** and awaits CTO review. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the shell NEVER holds, mutates, or
  decides the `ThemeConfig`. Every interaction that changes state is a
  Command; the server orchestrates.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the shell never
  imports the GoldenPathOrchestrator or any Runtime service; the server is the
  sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the shell never resolves,
  edits, composes, validates, or decides presentation.
- The **Layout Contract (ADR-011D, Section A)** — the four-zone shell is
  fixed. No inventing layouts during implementation.
- The **UI Framework WRAP (ADR-011D, Section B)** — the chosen library is a
  WRAP behind the AWIE UI Adapter; the core Editor logic is framework-agnostic.
- The **Buy Before Build constitution (ADR-007)** — generic UI infrastructure
  is delegated to OSS (Shadcn UI / Radix); only the Layout Contract, the UI
  Adapter, and the Selection Model remain custom.
- The **immutable `ThemeConfig` invariant** — the shell emits Commands; it
  never mutates the SSOT.
