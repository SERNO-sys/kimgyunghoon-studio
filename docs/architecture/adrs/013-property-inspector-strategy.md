# ADR 013 — Property Inspector Strategy (Phase 17.3: Admin Platform)

> **Status:** Proposed (Research) — awaiting ARB review
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Admin Platform (Editor, Phase 17.3)
> **Scope:** Research only. This ADR evaluates the OSS landscape for the AWIE
> **Property Inspector** (the Right Sidebar zone, ADR-011D Zone 3) and records a
> Buy/Wrap/Build decision per capability. It does NOT implement the inspector.
> It FREEZES the architectural boundary the inspector MUST respect: the **Dumb
> Client** rule (ADR-011A), the **Semantic Component Identity** selection rule
> (Amendment G / ADR-012), and the **Server-Side Orchestrator** boundary
> (Phase 12.5).
>
> **Constitutional Rule (ADR-013):**
> > **"The Property Inspector is a Dumb Client. It binds to the selected
> > component's Semantic Component Identity, renders a property form, and emits
> > Commands. It NEVER holds, mutates, or decides the ThemeConfig."**
>
> **Amendment H (Adapter Boundary) — FROZEN:**
> > **"The Property Inspector MUST NEVER consume PropertySchema directly. All
> > PropertySchema access MUST occur through the AWIE PropertyAdapter. The
> > Inspector consumes only the adapter output."**
>
> **Amendment I (UI-Agnostic Schema) — FROZEN:**
> > **"PropertySchema MUST remain strictly UI-agnostic. It describes domain
> > properties only (e.g., field, type, label). It MUST NEVER contain framework
> > components, DOM structure, CSS class names, or UI implementation details."**
>
> This ADR is bound by the frozen Core Constitution:

> - **ADR-007 (Buy Before Build):** generic form/field/color infrastructure
>   MUST be delegated to mature OSS. Only AWIE's core IP (the Command model,
>   the Semantic Component Identity binding, the property schema) remains
>   custom.
> - **ADR-008 (Runtime Purity):** the inspector never resolves, edits,
>   composes, validates, or decides presentation. It emits Commands; the server
>   orchestrates.
> - **ADR-009 (Permission Snapshot):** the inspector renders a permission
>   snapshot; it never evaluates permissions itself.
> - **ADR-010 (DX & SDK):** the inspector is a consumer of the frozen `@awie/sdk`
>   contracts, never a bypass.
> - **ADR-011A (Admin Editor Strategy):** the inspector is a Dumb Client; it
>   sends Commands and renders the RenderNode preview the server returns.
> - **ADR-011D (Editor Layout Contract):** the Right Sidebar is the Property
>   Inspector zone; the four-zone layout is fixed.
> - **Amendment G / ADR-012 (Semantic Component Identity):** the inspector
>   binds to `selectedComponentId` (the Semantic Component Identity) — the ONLY
>   selection identity. It NEVER uses `nodeId`, DOM id, React key, RenderNode
>   id, tree index, or runtime UUID.

---

## Context

Phase 17.2 (Selection Model) is complete: the Selection Model resolves a
`SelectionSnapshot` by Semantic Component Identity, and the `EditorRightSidebar`
currently renders the selected element's identity (breadcrumb, component,
section) plus a **placeholder** for the property form.

Phase 17.3 (Property Inspector) activates the actual property editing form. The
inspector must let a user edit the selected component's structured properties
(text, numbers, colors, selects, toggles) that map to `SectionConfig` content
and settings in the immutable `ThemeConfig`. Every edit is a Command
(`EditorCommandPayload`) — the inspector NEVER mutates the ThemeConfig.

The CTO's hypothesis: **Do we need to build the property form infrastructure
from scratch, or can we WRAP mature OSS (React Hook Form + Zod, already adopted
via ADR-011A) behind the existing Dumb Client boundary?** The only genuinely new
OSS question is **color picking** (a small, well-solved problem).

This ADR evaluates each custom implementation against industry-standard
open-source equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig` via the Command model.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (the Command
   model, the Semantic Component Identity binding, the property schema).

### The inspector's constitutional duty

The inspector is a **Dumb Client**. It is bound by the same constitution it
serves:

- The inspector NEVER holds the `ThemeConfig`. It binds to the selected
  component's Semantic Component Identity, renders a property form, and emits
  Commands. The server applies the Command and returns a NEW RenderNode preview.
- The inspector NEVER resolves, edits, composes, validates, or decides
  presentation. Those responsibilities live in the Application Layer
  (EditorService → PatchPipeline) and the Runtime Layer
  (GoldenPathOrchestrator → RenderNode), both server-side.
- The inspector renders a **permission snapshot** (ADR-009); it never evaluates
  permissions itself.
- The inspector is a consumer of the frozen `@awie/sdk` contracts (ADR-010); it
  never bypasses them.
- The inspector binds to `selectedComponentId` (the Semantic Component
  Identity, Amendment G / ADR-012) — the ONLY selection identity. It NEVER uses
  `nodeId`, DOM id, React key, RenderNode id, tree index, or runtime UUID.

---

## Capability 1: Property Form / Field Editing

The core inspector capability. The user edits structured fields (headings,
body text, colors, numbers, selects, toggles) that map to `SectionConfig`
content and settings in the immutable `ThemeConfig`. The inspector MUST NOT edit
the ThemeConfig directly — it emits Commands (`content.update-heading`, etc.)
that the server applies.

### OSS Survey (WRAP)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **React Hook Form** | MIT | **High.** The standard for React form state; actively maintained; minimal re-renders; integrates with Zod. **Already adopted** (package.json, ADR-011A Capability 3). | **High.** Large, active community; the standard. | **Free.** Zero licensing cost; tiny footprint; already a dependency. | **Excellent.** Minimal re-renders; efficient form state. | **Trivial.** React Hook Form is a pure form-state layer; the AWIE Property Adapter maps validated fields to Commands. Swapping to Formik requires changing only the adapter. | **Excellent.** Familiar form UX; minimal re-renders. | **Good.** Native form controls are keyboard-accessible; the AWIE Property Adapter must preserve focus and announce validation errors via a polite ARIA live region. | **WRAP** |
| **Zod** | MIT | **High.** The standard for schema validation; actively maintained; TypeScript-first. **Already adopted** (package.json, ADR-007/ADR-008). | **High.** Large, active community; the standard. | **Free.** Zero licensing cost; already a dependency. | **Excellent.** Declarative, efficient validation. | **Trivial.** Zod schemas are declarative; the AWIE Property Adapter validates field payloads before sending Commands. | **Excellent.** TypeScript-first; clear error messages. | **Good.** Validation errors are announced via a polite ARIA live region; never interrupting. | **WRAP** |
| **Formik** | MIT | **High.** Mature and widely used; actively maintained. | **High.** Mature, widely used community. | **Free.** Zero licensing cost; heavier re-render profile than React Hook Form. | **Good.** Mature; heavier re-render profile. | **Trivial.** Formik is a pure form-state layer; swappable behind the same AWIE Property Adapter. | **Good.** Mature and familiar. | **Good.** Native form controls are keyboard-accessible; the AWIE Property Adapter must preserve focus and announce errors politely. | **WRAP (alternative)** |
| **Custom form handlers** | — | **Low.** Hand-rolled field state, validation, and error handling duplicates React Hook Form + Zod. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke field state and validation are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built form state risks unannounced validation errors and focus loss. | **BUILD (rejected)** |

### How we WRAP them

- **React Hook Form** powers field state and submission.
- **Zod** guards the field payload against the frozen `@awie/sdk` contracts.
- **The AWIE Property Adapter** maps validated fields to `EditorCommandPayload`
  Commands and sends them to the server.

The `SectionConfig` content/settings shape remains the declarative source of
field shape; validation and submission wiring live at the Application Layer,
never in the Runtime.

---

## Capability 2: Color Picking

The inspector must let a user edit color properties (theme colors, section
backgrounds, text colors). This is a small, well-solved problem. The question is
whether to adopt a color-picker library or use the native HTML color input.

### OSS Survey (WRAP / BUY)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native `<input type="color">`** | — (platform) | **High.** Browser-native; zero maintenance; no dependency. | **N/A.** Platform feature. | **Free.** Zero licensing cost; zero bundle weight. | **Excellent.** Native; no JS overhead. | **Trivial.** Native input; the AWIE Property Adapter maps the value to a Command. Swapping to a library requires changing only the adapter. | **Good.** Familiar native picker; limited to simple swatch + hex. | **Good.** Native color input is keyboard-accessible and screen-reader-announced by default. | **BUY (default)** |
| **react-colorful** | MIT | **High.** Small, modern, accessible color picker; actively maintained; tree-shakeable. | **High.** Popular, active community. | **Free.** Zero licensing cost; tiny footprint (~3KB). | **Excellent.** Lightweight; efficient. | **Trivial.** A pure color-picker component; the AWIE Property Adapter maps the value to a Command. Swapping to another picker requires changing only the adapter. | **Excellent.** Rich picker UX (HSV/HSL/RGB/hex); keyboard-accessible. | **Excellent.** Keyboard- and screen-reader-accessible by default; the AWIE Property Adapter must preserve focus and announce color changes politely. | **WRAP (optional)** |
| **react-color** | MIT | **Medium.** Mature but heavier; historically slower to evolve. | **Medium.** Mature but heavier. | **Free.** Zero licensing cost; larger bundle. | **Good.** Mature; heavier bundle. | **Trivial.** A pure color-picker component; swappable behind the same AWIE Property Adapter. | **Good.** Rich picker UX. | **Good.** Keyboard-accessible; the AWIE Property Adapter must preserve focus and announce changes politely. | **WRAP (rejected)** |
| **Custom color picker** | — | **Low.** Hand-rolling HSV/HSL/RGB conversion, swatch rendering, and accessibility duplicates react-colorful. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke color math and swatch rendering are error-prone. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built color picker risks focus traps and unannounced changes. | **BUILD (rejected)** |

### How we WRAP them

- **Native `<input type="color">`** is the default (BUY): zero dependency, zero
  maintenance, keyboard-accessible, and sufficient for the initial inspector.
- **react-colorful** is the optional upgrade (WRAP) if a richer picker UX is
  needed later. The AWIE Property Adapter is unchanged — it maps the color value
  to a Command regardless of which picker renders it.

The color value is a plain string (hex) that maps to a `SectionConfig` setting;
the AWIE Property Adapter validates it with Zod before sending a Command.

---

## Capability 3: Property Schema (the field descriptor)

The inspector must know WHICH fields to render for a given selected component.
This is the **property schema** — a declarative descriptor of the editable
fields (label, type, default, validation) for each component type. This is
**AWIE core IP** (BUILD): it is derived from the frozen `SectionConfig` shape and
the Semantic Component Identity, and it is the contract that binds the inspector
to the Command model.

### OSS Survey (BUILD)

| OSS | License | Maintenance | Community | Cost | Performance | Replaceability | DX/UX | Accessibility (A11y) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **JSON Schema / Zod schema** | MIT | **High.** Zod is already adopted; a Zod schema is the natural declarative descriptor. | **High.** Large, active community. | **Free.** Zero licensing cost; already a dependency. | **Excellent.** Declarative, efficient. | **Trivial.** The property schema is a Zod schema; it is swappable and versionable. | **Excellent.** TypeScript-first; clear error messages. | **Good.** Field descriptors drive accessible form controls. | **BUILD (Zod-backed)** |
| **Custom hand-coded field maps** | — | **Low.** Hand-rolled per-component field descriptors duplicate a declarative schema. | **Low.** No community; AWIE-only. | **High.** Ongoing maintenance of generic infrastructure. | **Poor.** Bespoke field maps are error-prone and hard to version. | **N/A.** Unjustified cost. | **Poor.** Reinvents a solved problem. | **Poor.** Hand-built field maps risk inconsistent accessibility. | **BUILD (rejected)** |

### How we BUILD it

- **The AWIE Property Schema** is a Zod-backed declarative descriptor of the
  editable fields for each component type. It is derived from the frozen
  `SectionConfig` shape and the Semantic Component Identity.
- **The AWIE Property Adapter** consumes the schema to render the form (via
  React Hook Form) and to validate the payload (via Zod) before emitting a
  Command.

The property schema is AWIE's orchestration model — it is the contract that
binds the inspector to the Command model. It is NOT delegated to OSS.

---

## Comparison Table (Summary)

| Capability | OSS / Strategy | License | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- | --- |
| **Property Form** | React Hook Form + Zod | MIT | **WRAP** | Property Adapter maps validated fields to Commands. | **Low** |
| **Property Form** (alt) | Formik | MIT | **WRAP (alternative)** | Same Adapter boundary; swappable. | **Low** |
| **Color Picking** | Native `<input type="color">` | — | **BUY** | Zero dependency; Property Adapter maps value to Command. | **Low** |
| **Color Picking** (alt) | react-colorful | MIT | **WRAP (optional)** | Same Adapter boundary; swappable. | **Low** |
| **Color Picking** (alt) | react-color | MIT | **WRAP (rejected)** | Heavier bundle; same Adapter boundary. | **Medium** |
| **Property Schema** | Zod-backed descriptor | MIT | **BUILD** | AWIE core IP; binds inspector to Command model. | **Low** |
| **Property Adapter** | AWIE Property Adapter | — | **BUILD** | AWIE core IP; maps OSS form output to the frozen Command model. | **Low** |

---

## Decision

**Adopt a WRAP strategy for all generic inspector infrastructure, and a minimal
BUILD for the AWIE Property Adapter and the AWIE Property Schema.**

- **Property Form → React Hook Form + Zod (WRAP).** React Hook Form powers field
  state; Zod guards payloads against the frozen contracts. Both are already
  adopted (package.json, ADR-011A Capability 3).
- **Color Picking → Native `<input type="color">` (BUY).** Zero dependency, zero
  maintenance, keyboard-accessible. react-colorful is the optional upgrade
  (WRAP) behind the same Property Adapter.
- **Property Schema → Zod-backed descriptor (BUILD).** The declarative field
  descriptor is AWIE core IP; it binds the inspector to the Command model.
- **Property Adapter → AWIE Property Adapter (BUILD).** The mapping of validated
  form fields to the frozen `EditorCommandPayload` Command model is AWIE's
  orchestration model.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The AWIE Property Adapter** — the mapping of validated form fields (React
  Hook Form) to the frozen `EditorCommandPayload` Command model. This is AWIE's
  orchestration model.
- **The AWIE Property Schema** — the Zod-backed declarative descriptor of the
  editable fields for each component type, derived from the frozen
  `SectionConfig` shape and the Semantic Component Identity.
- **The Semantic Component Identity binding** — the inspector binds to
  `selectedComponentId` (Amendment G / ADR-012); it never uses `nodeId`, DOM id,
  React key, RenderNode id, tree index, or runtime UUID.
- **The immutable `ThemeConfig` invariant** — the inspector emits Commands; it
  never mutates the SSOT.

---

## Consequences

**Positive:**
- **Reduced maintenance.** We stop maintaining hand-rolled form state,
  validation, and color-picker infrastructure. React Hook Form, Zod, and the
  native color input are battle-tested and (for the first two) already adopted.
- **Dumb Client preserved.** The inspector never holds or mutates the
  `ThemeConfig`. It binds to the Semantic Component Identity, renders a property
  form, and emits Commands. The Phase 12.5 boundary is preserved.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP (the
  Property Adapter and the Property Schema), aligning with Article VII.
- **Replaceability.** Swapping React Hook Form for Formik, or the native color
  input for react-colorful, requires changing only the AWIE Property Adapter —
  never the Command model nor its consumers.
- **Zero new dependencies for the default path.** React Hook Form and Zod are
  already adopted; the native color input adds nothing. react-colorful is
  optional and tiny (~3KB).

**Negative:**
- **Adapter indirection.** A thin AWIE Property Adapter layer is required to map
  OSS form output to Commands. This indirection must be documented and tested.
- **Server round-trip latency.** Every edit is a Command round-trip to the
  server. Optimistic UI (ADR-011A Capability 4) mitigates perceived latency but
  adds reconciliation complexity.

**Trade-off:** We accept a thin Adapter layer in exchange for dramatically lower
maintenance cost, battle-tested tooling, and — most importantly — an inspector
that is a Dumb Client by construction, never a bypass of the frozen Core
Constitution.

---

## Alternatives Considered

1. **Custom form handlers (Level 3 BUILD).** Rejected: duplicates React Hook
   Form + Zod (field state, validation, error handling).
2. **Custom color picker (Level 3 BUILD).** Rejected: duplicates react-colorful
   (HSV/HSL/RGB conversion, swatch rendering, accessibility).
3. **react-color as the primary color picker.** Rejected: heavier bundle than
   react-colorful; the native input is sufficient for the initial inspector.
4. **Hand-coded per-component field maps (Level 3 BUILD).** Rejected: duplicates
   a declarative Zod schema; error-prone and hard to version.

---

## Compliance

This ADR is **Proposed (Research)** and awaits ARB review. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Dumb Client rule (ADR-011A)** — the inspector NEVER holds, mutates, or
  decides the `ThemeConfig`. It binds to the Semantic Component Identity,
  renders a property form, and emits Commands.
- The **Semantic Component Identity rule (Amendment G / ADR-012)** — the
  inspector binds to `selectedComponentId`; it NEVER uses `nodeId`, DOM id,
  React key, RenderNode id, tree index, or runtime UUID.
- The **Server-Side Orchestrator boundary (Phase 12.5)** — the inspector never
  imports the GoldenPathOrchestrator or any Runtime service; the server is the
  sole orchestrator.
- The **Runtime Purity constitution (ADR-008)** — the inspector never resolves,
  edits, composes, validates, or decides presentation.
- The **Permission Snapshot strategy (ADR-009)** — the inspector renders a
  permission snapshot; it never evaluates permissions itself.
- The **Buy Before Build constitution (ADR-007)** — generic inspector
  infrastructure is delegated to OSS; only the AWIE Property Adapter and the
  Property Schema remain custom.
- The **immutable `ThemeConfig` invariant** — the inspector emits Commands; it
  never mutates the SSOT.
