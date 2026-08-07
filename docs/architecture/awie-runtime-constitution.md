# AWIE Runtime Constitution

> **Status:** Ratification Pending — CTO Review
> **Version:** 1.0.0
> **Phase:** 10.5 — Architecture Freeze & Constitution
> **Scope:** The supreme law of the AWIE V2 codebase. All future features, runtime services, and CMS integration MUST comply with this document.

---

## Preamble

AWIE V2 has transitioned from an "AI Website Builder" to a true **Website Runtime Platform**. The core architecture (Phases 01–10) has received a 9.9/10 final sign-off. This Constitution freezes the architectural laws so that every future contribution — whether a new Industry, a new Recipe, a new Theme, or a new Framework Adapter — is governed by the same immutable principles.

This document is the **supreme law**. Where any other document, code comment, or implementation conflicts with this Constitution, this Constitution prevails.

---

## Article I — The Ultimate Law

> **"AI decides. Runtime executes."**

The AI's authority **ends** at the BusinessBrief / Recipe layer. Everything downstream — Themes, Renderers, Components, Layouts — is **pure data** and **pure execution**.

### 1.1 The Decision Boundary

```
┌─────────────────────────────────────────────────────────────┐
│  AI LAYER (Decides)                                          │
│  Question Engine → BusinessBrief                             │
│  Industry Registry → IndustryProfile                         │
│  Recipe Engine → RecipeBlueprint                             │
│  ─────────────────────────────────────────────────────────── │
│  THE DECISION BOUNDARY (AI ENDS HERE)                        │
│  ─────────────────────────────────────────────────────────── │
│  RUNTIME LAYER (Executes)                                    │
│  ThemeConfig (SSOT) → Renderer → RenderNode → Adapter → UI   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Consequences

1. **Themes and Renderers are pure data.** A Theme MUST NEVER call an AI API. A Component MUST NEVER call an AI API.
2. **The Renderer is dumb.** It ONLY looks up, composes, and outputs. It never decides.
3. **Determinism.** Rendering the same validated ThemeConfig always produces the same RenderNode tree. No AI, no randomness, no side effects.

---

## Article II — Layer Separation & Forbidden Imports

### 2.1 The Layer Map

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| AI Infrastructure | `src/lib/ai/` | Provider abstraction, prompts, sanitize, validation, retry, telemetry, usage, cost |
| Decision Engines | `src/lib/question-engine/`, `src/lib/industry-registry/`, `src/lib/recipe-engine/` | Produce BusinessBrief, IndustryProfile, RecipeBlueprint |
| Configuration | `src/lib/theme-config/` | The SSOT (ThemeConfig) |
| Rendering | `src/lib/renderer-foundation/`, `src/lib/renderer-react/` | RenderNode production + framework adapters |
| Theme Ecosystem | `src/lib/theme-ecosystem/` | Semantic contracts, pure JSON assets, certification, previews |
| Routing | `src/lib/routing/` | Route resolution |

### 2.2 Forbidden Imports (The Ignorance Principle)

The following imports are **STRICTLY FORBIDDEN**:

| Module | MUST NEVER import |
|--------|-------------------|
| Renderer Foundation | `BusinessBrief`, `IndustryProfile`, `RecipeBlueprint`, `IndustryRegistry`, `RecipeEngine` |
| Renderer React | `BusinessBrief`, `IndustryProfile`, `RecipeBlueprint` |
| Theme Ecosystem | `BusinessBrief` (full), `IndustryProfile`, `RecipeBlueprint` |
| ThemeConfig | `BusinessBrief`, `IndustryProfile`, `RecipeBlueprint` |
| Any Theme / Component | Any AI API, any Decision Engine |

> **Rationale:** The Renderer ONLY knows ThemeConfig, trusts ThemeConfig, and renders ThemeConfig. If a Renderer imports a BusinessBrief, it has leaked business logic into the presentation layer and the architecture is broken.

### 2.3 The Presentation Projection Exception

The Preview Pipeline (`src/lib/theme-ecosystem/preview/`) consumes a **minimal presentation-facing projection** of the BusinessBrief (title, tagline, description). This is an intentional, narrow exception. The full BusinessBrief (with business decisions) MUST NEVER cross the decision boundary.

---

## Article III — SSOT Rules

### 3.1 ThemeConfig is the ONLY Source of Truth

- ThemeConfig is a **flat, immutable data structure** — never a nested object tree.
- The Renderer reads **only** ThemeConfig. It never reconstructs business meaning.
- All UI resolution is driven by ThemeConfig's flat arrays (pages, sections, assets, skins, typographies, layouts, componentMappings).

### 3.2 No Business Logic in the Renderer

- The Renderer MUST NOT branch on business semantics (e.g., "if industry is restaurant, show menu").
- The Renderer MUST NOT evaluate Capability, Industry, or Recipe.
- Business decisions are resolved **before** rendering and materialized into ThemeConfig.

### 3.3 Validation is External

- Validation lives in a dedicated `ThemeValidator`, **outside** the engine.
- The engine ONLY accepts already-validated configs.
- The engine NEVER validates, NEVER resolves routes, NEVER builds its own ResourceMap.

---

## Article IV — Registry & Adapter Rules

### 4.1 O(1) Resolution via ResourceRegistry<T>

- All UI resolution MUST be **O(1) map lookups** via the universal `ResourceRegistry<T>`.
- `Array.find()` and heavy `switch/case` resolution are **BANNED**.
- The SAME generic `ResourceRegistry<T>` instantiates ComponentRegistry, LayoutRegistry, SkinRegistry, and TypographyRegistry.
- Registries can be **frozen** to guarantee reproducible renders. Freezing is the responsibility of an external Bootstrap layer, never the engine.

### 4.2 The Core Engine Returns RenderNode (Framework Agnostic)

- The ThemeEngine produces a **framework-agnostic virtual node structure** (`RenderNode`).
- The ThemeEngine **NEVER** returns React/Vue elements.
- `RenderNode` is a plain, serializable data structure: `element` | `text` | `fragment`.

### 4.3 React is Just an Adapter

- React is a **concrete adapter** that consumes the RenderNode tree and materializes it into React UI.
- A future Vue Adapter, Vanilla Adapter, or any other adapter consumes the SAME RenderNode tree.
- No business logic, no AI, no ThemeConfig mutation lives in any adapter.

---

## Article V — Component & Theme Contracts

### 5.1 Semantic Naming Rules

- Component contracts use **generic, semantic vocabulary**: `heading`, `body`, `items`, `question`, `answer`, `actions`, `label`, `target`.
- **Business-specific names are FORBIDDEN** in contracts: `businessName`, `imageUrl`, `company`, `restaurant`, `menu`, `reservation`.
- Contracts are designed to be **stable for 5 years** — they must not encode any single industry's vocabulary.

### 5.2 Pure JSON Requirements for Skin / Typography

- **Skins** are pure JSON design tokens: `colors`, `radius`, `shadows`, `motion`. No logic, no functions.
- **Typography** is defined by **logical semantics** (Heading XL, Body M, Caption), completely decoupled from physical font names.
- The font family is a **token VALUE**, never a structural key. This allows swapping fonts without changing structure.

### 5.3 Certification

- Every Theme MUST pass the `ThemeCertifier` before it is usable.
- Certification validates: required Skins, Typographies, Layouts, Component Mappings, and Accessibility tokens.
- A Theme that fails certification is **not** part of the runtime platform.

---

## Article VI — Amendment Process

This Constitution is immutable in spirit but may be amended through a formal process:

1. **Proposal** — An ADR (Architecture Decision Record) is written describing the proposed change.
2. **Review** — The CTO and external GPT review the ADR.
3. **Ratification** — The CTO ratifies the amendment.
4. **Recording** — The amendment is recorded in the ADR log and this Constitution is versioned.

No single engineer may amend this Constitution unilaterally.

---

## Ratification

- **Author:** Lead Engineer (AWIE V2)
- **Reviewer:** CTO
- **Status:** ⏳ Pending CTO Ratification

*This Constitution takes effect immediately upon CTO ratification.*
