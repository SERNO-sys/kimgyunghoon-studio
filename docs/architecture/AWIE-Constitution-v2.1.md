# AWIE V2 — Architecture Freeze v2.1

> **Status:** FROZEN — Pending CTO Ratification
> **Version:** 2.1.0
> **Phase:** 17.7 — Editor Interaction Convergence (Insert / Update / Delete)
> **Scope:** The supreme law of the AWIE V2 **Editor Interaction** architecture. This document FREEZES the stabilized editor architecture before Move, Duplicate, or Replace operations are introduced.
> **Supersedes:** This document extends and refines `docs/architecture/awie-runtime-constitution.md` (v1.0.0). Where a conflict exists, this document prevails for the Editor Interaction domain.

---

## Preamble

With the completion of the core triad — **Insert**, **Update**, **Delete** — the Editor Interaction architecture has fully converged. The Architecture Review Board (CTO) and the Freeze Guardian have intervened to halt further implementation and consolidate the stabilized architecture into a permanent, immutable constitution.

This document freezes **five core pillars** that govern every future editor interaction. Any new capability (Move, Duplicate, Replace, or otherwise) MUST comply with these pillars or be redesigned before implementation.

> **Freeze Directive:** Do NOT proceed to the next implementation target. Do NOT perform a Reality Check for new features. This is a pristine backup point. The next step after CTO ratification is a Git Tag of this state.

---

## Pillar I — Development Workflow Constitution

### 1.1 The Workflow

```
IDE → Summary Report → Review → (No raw code dumps)
```

### 1.2 Rules

1. **Summary Report First.** Every implementation phase concludes with a concise Summary Report describing what was built, why, and how it satisfies the Constitution. The report is the deliverable the CTO reviews.
2. **No Raw Code Dumps.** The Summary Report MUST NOT be a raw dump of source files. It describes intent, boundaries, and constitutional compliance — not line-by-line code.
3. **Review Gate.** No phase is considered complete until the CTO reviews and ratifies the Summary Report.
4. **Freeze Before Feature.** Before introducing a new interaction capability, the current architecture is frozen and documented. New capabilities are designed against the frozen pillars, never against ad-hoc conventions.

### 1.3 Consequence

Every future editor feature begins with a Summary Report and a constitutional compliance check. If a feature cannot be described in a Summary Report without violating a pillar, it is redesigned first.

---

## Pillar II — State Rule

> **"Derived data is not state."**

### 2.1 The Rule

There is a **strict separation** between:

- **Pure State** — the minimal, authoritative data that must be stored and mutated.
- **Derived UI State** — data computed from pure state on demand, NEVER stored or mutated independently.

### 2.2 Application to the Editor

| Pure State (Stored) | Derived UI State (Computed) |
|---------------------|-----------------------------|
| `ThemeConfig` (Immutable SSOT) | `RenderNode` tree (derived from ThemeConfig) |
| `SelectionSnapshot.selectedComponentId` (Semantic Component Identity) | Breadcrumb, sectionId, renderNodeId (derived from the selected identity) |
| Pending command buffer (Zustand) | Command queue status labels (derived from mutation state) |
| CommandHistoryManager stack | Undo/Redo availability (derived from stack depth) |

### 2.3 Rules

1. **Never store derived data.** If a value can be computed from pure state, it MUST be computed — never cached as independent state.
2. **Never mutate derived data.** Derived UI state is read-only. Mutating it is a constitutional violation.
3. **Single source of truth.** Each piece of pure state has exactly one owner. Derived state has zero owners.
4. **Selection is derived.** The `SelectionSnapshot` is derived from the selected Semantic Component Identity. UI components consume the snapshot; they never hold their own selection copy.

### 2.4 Consequence

The editor NEVER stores the RenderNode tree, the breadcrumb, or the selection geometry as state. These are recomputed from the immutable ThemeConfig and the selected identity. This guarantees that a framework swap, hydration, or rerender cannot desynchronize the UI from the source of truth.

---

## Pillar III — Selection Event Architecture

### 3.1 The Selection Bus

Selection flows through a **single Selection Event Bus** (Section 13 of the AWIE V2 Constitution). Canvas, Tree, Inspector, and TopBar all subscribe to the SAME bus. No UI component manipulates another directly.

```
SelectionChanged
SelectionCleared
SelectionHovered
SelectionFocused
```

### 3.2 Semantic Component Identity (Amendment G)

Selection is resolved **ONLY** by the **Semantic Component Identity** — the ONLY selection identity. It is carried on the DOM as `data-awie-id`.

```
hero
hero.title
hero.button
pricing.card.buy
```

**FORBIDDEN identities** (MUST NEVER be used for selection):

- DOM id
- React key
- RenderNode id
- Tree index
- Runtime UUID

### 3.3 Rules

1. **The bus is the single source of truth.** All selection events flow through the bus. Direct component-to-component manipulation is forbidden.
2. **Semantic identity only.** Selection events carry ONLY the Semantic Component Identity. They never carry nodeId, RenderNode id, DOM id, tree index, or runtime UUID.
3. **Snapshots only.** Selection is exposed ONLY through `SelectionSnapshot`. UI never shares component objects.
4. **Survives everything.** The Semantic Component Identity MUST survive framework swap, hydration, rerender, drag/drop, history, and undo/redo.
5. **DOM is implementation detail.** `data-awie-id` is the ONLY allowed DOM identity. `data-node-id`, `data-react-id`, and DOM id as identity are FORBIDDEN.

### 3.4 Consequence

Because selection is bound to the Semantic Component Identity (not to a DOM node or React key), the selection remains valid across any re-render, framework swap, or history operation. The bus decouples all editor zones from each other, making each zone independently replaceable.

---

## Pillar IV — Command Handler Architecture

### 4.1 The Immutable Pipeline

Every editor mutation flows through a strict, immutable pipeline:

```
EditorCommandPayload
        ↓
   CommandHandler
        ↓
    ThemePatch
        ↓
   NEW ThemeConfig
```

### 4.2 Rules

1. **Dumb Client.** The client produces `EditorCommandPayload` (intent only). It NEVER mutates ThemeConfig. It NEVER applies the Command itself.
2. **Server-side Composition.** The `ServerSideOrchestrator` translates the payload into a full Command (adding actorId, createdAt, requiredCapability) and routes it to the correct `CommandHandler`.
3. **Immutable ThemeConfig.** The `CommandHandler` produces a `ThemePatch` (a list of operations). Applying the patch produces a **NEW** ThemeConfig. The original is NEVER mutated in place.
4. **Pure Intent.** The payload carries intent only — no rendering, pricing, permission, or business logic.
5. **Deterministic.** The same Command + ThemeConfig always produces the same patch operations.
6. **Semantic binding.** Patch paths are derived from the Semantic Component Identity. They NEVER use nodeId, RenderNode id, React key, tree index, or runtime UUID.

### 4.3 The Core Triad (Frozen)

| Command | Handler | Patch Shape |
|---------|---------|-------------|
| Insert | `InsertComponentHandler` | add section to resources + insert id into page order |
| Update | `UpdateComponentHandler` | replace value at semantic path |
| Delete | `DeleteComponentHandler` | remove section from resources + remove id from page order |

### 4.4 Consequence

Because every mutation is a pure `ThemePatch` applied to an immutable ThemeConfig, the editor is fully deterministic and auditable. The same pipeline serves Insert, Update, and Delete — and will serve Move, Duplicate, and Replace with NO new infrastructure.

---

## Pillar V — History Integration

### 5.1 InversePatch via CommandHistoryManager

History is built on **inverse patches**, not fake commands.

```
CommandHandler → ThemePatch
                      ↓
              InversePatchGenerator
                      ↓
              InversePatch (stored)
                      ↓
            CommandHistoryManager
```

### 5.2 Rules

1. **No fake Undo/Redo commands.** Undo/Redo are NOT editor commands. They are history operations that apply a stored inverse patch. There is NO `UndoCommand` / `RedoCommand` in the command pipeline.
2. **InversePatchGenerator.** Every `ThemePatch` is invertible. The `InversePatchGenerator` derives the inverse patch from the forward patch. Delete produces ONLY `remove` operations, which are trivially invertible.
3. **CommandHistoryManager owns the stack.** The history stack (undo/redo) is owned by `CommandHistoryManager`. It stores inverse patches, not commands.
4. **Dumb Client trigger.** The client triggers Undo/Redo via a history endpoint (e.g., `/history/undo`, `/history/redo`). The client NEVER constructs or applies inverse patches itself.
5. **Semantic identity survives.** Because patches bind to Semantic Component Identity, undo/redo preserves selection correctness across history operations.

### 5.3 Consequence

History is a pure, deterministic replay of inverse patches. There is no special-casing per command type — Insert, Update, and Delete are all undoable through the SAME `InversePatchGenerator` + `CommandHistoryManager` mechanism. This is why Delete was designed to produce ONLY `remove` operations: it is invertible with zero new history infrastructure.

---

## Freeze Declaration

The five pillars above are **permanently frozen** as of Architecture Freeze v2.1:

1. **Development Workflow Constitution** — IDE → Summary Report → Review → No raw code dumps.
2. **State Rule** — Derived data is not state.
3. **Selection Event Architecture** — Selection Bus + Semantic Component Identity (`data-awie-id`).
4. **Command Handler Architecture** — EditorCommandPayload → CommandHandler → ThemePatch → NEW ThemeConfig.
5. **History Integration** — InversePatch via CommandHistoryManager, no fake Undo/Redo commands, Dumb Client trigger.

Any future editor capability (Move, Duplicate, Replace, or otherwise) MUST comply with all five pillars. If a feature violates one pillar, **STOP. Redesign first.**

---

## Amendment Process

This Constitution is immutable in spirit but may be amended through the formal process defined in `docs/architecture/awie-runtime-constitution.md` (Article VI):

1. **Proposal** — An ADR is written describing the proposed change.
2. **Review** — The CTO and external GPT review the ADR.
3. **Ratification** — The CTO ratifies the amendment.
4. **Recording** — The amendment is recorded and this Constitution is versioned.

No single engineer may amend this Constitution unilaterally.

---

## Ratification

- **Author:** Lead Engineer (AWIE V2)
- **Reviewer:** CTO / Architecture Review Board / Freeze Guardian
- **Status:** ⏳ Pending CTO Ratification
- **Next Step:** Upon ratification, Git Tag this state before introducing Move, Duplicate, or Replace.

*This Constitution takes effect immediately upon CTO ratification.*
