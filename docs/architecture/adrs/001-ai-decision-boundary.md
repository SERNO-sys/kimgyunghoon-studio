# ADR 001 — AI Decision Boundary

> **Status:** Accepted
> **Date:** 2026-08-05
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 10.5 — Architecture Freeze

---

## Context

AWIE V2 generates complete websites from a business brief. A naive architecture would let the AI directly produce React components or HTML, coupling the AI's output format to a specific rendering framework and to specific business semantics.

This coupling creates three problems:

1. **Framework lock-in.** If the AI emits React, we cannot render to Vue, Vanilla, or any future framework without rewriting the AI layer.
2. **Business leakage.** If the AI emits business-specific sections ("menu", "reservation"), the renderer must understand business semantics, violating the separation of concerns.
3. **Non-determinism.** If the AI is invoked during rendering, the same input can produce different output on every render, making the platform unpredictable and untestable.

## Decision

We establish a **hard decision boundary**. The AI's authority ends at the BusinessBrief / Recipe layer. Everything downstream — Themes, Renderers, Components, Layouts — is **pure data** and **pure execution**.

```
AI LAYER (Decides)          → BusinessBrief, IndustryProfile, RecipeBlueprint
──────────────────────────── THE DECISION BOUNDARY ────────────────────────────
RUNTIME LAYER (Executes)    → ThemeConfig → Renderer → RenderNode → Adapter → UI
```

### Consequences

**Positive:**
- The Renderer is deterministic and side-effect free. Rendering the same validated ThemeConfig always produces the same RenderNode tree.
- The AI layer is swappable and testable in isolation. It produces data, not UI.
- New frameworks are added by writing a new adapter, never by touching the AI layer.
- Business semantics live only in the decision layer, never in the presentation layer.

**Negative:**
- The AI cannot directly control pixel-level presentation. It must express intent through the BusinessBrief and Recipe, which the runtime materializes.
- There is an indirection cost: AI intent → ThemeConfig → RenderNode → Adapter → UI.

**Trade-off:** We accept the indirection cost in exchange for a stable, framework-agnostic, deterministic runtime platform. This is the core of the "Website Runtime Platform" identity.

## Alternatives Considered

1. **AI emits React directly.** Rejected: framework lock-in, business leakage, non-determinism.
2. **AI emits HTML strings.** Rejected: no structure, no O(1) resolution, no framework-agnosticism, injection risk.
3. **AI invoked at render time.** Rejected: non-deterministic, expensive, untestable.

## Compliance

Enforced by the **Forbidden Imports** table in the AWIE Runtime Constitution (Article II). The Renderer, Theme Ecosystem, and ThemeConfig MUST NEVER import BusinessBrief, IndustryProfile, or RecipeBlueprint.
