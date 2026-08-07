# ADR 002 — Framework-Agnostic Renderer

> **Status:** Accepted
> **Date:** 2026-08-05
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 10.5 — Architecture Freeze

---

## Context

The rendering pipeline must produce UI. The question is: what does the core engine output?

Two options were considered:

1. **The engine returns React elements directly.** This couples the entire rendering pipeline to React. Every component, layout, and the engine itself must import React types. A future Vue or Vanilla target would require a full rewrite of the rendering core.
2. **The engine returns a framework-agnostic virtual node structure (`RenderNode`).** The engine produces a plain, serializable data structure. A separate adapter layer materializes it into the target framework.

## Decision

The ThemeEngine produces a **framework-agnostic `RenderNode` tree**, never React/Vue elements.

`RenderNode` is a plain, serializable data structure with three node types:

- **`element`** — a virtual element backed by a registered component (`componentId`, `props`, `children`).
- **`text`** — a plain text leaf.
- **`fragment`** — an ordered list of child RenderNodes.

The pipeline is:

```
ThemeEngine → RenderNode → React Adapter → React UI
                          → Vue Adapter (future) → Vue UI
                          → Vanilla Adapter (future) → DOM
```

### Consequences

**Positive:**
- **Framework independence.** React is just one adapter. Vue, Vanilla, and future frameworks consume the same RenderNode tree.
- **Serializability.** RenderNode is plain data — it can be persisted, transmitted, snapshotted, and diffed.
- **Testability.** The core engine is tested without any framework runtime (as proven by the renderer snapshot tests).
- **Editor readiness.** The optional `id`, `key`, and `metadata` fields prepare the tree for visual editors, drag-and-drop, and hydration.

**Negative:**
- An extra indirection layer: RenderNode must be walked and materialized by an adapter.
- Adapters must be maintained for each target framework.

**Trade-off:** We accept the adapter maintenance cost in exchange for a framework-agnostic core that survives framework churn.

## Alternatives Considered

1. **Engine returns React elements.** Rejected: framework lock-in, cannot render to other frameworks, React types leak into the core.
2. **Engine returns HTML strings.** Rejected: no structure, no reconciliation, no O(1) component resolution, injection risk.

## Compliance

Enforced by the AWIE Runtime Constitution (Article IV). The core engine returns RenderNode. React lives in `src/lib/renderer-react/` as a concrete adapter and MUST NOT contain business logic, AI, or ThemeConfig mutation.
