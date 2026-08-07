# Extension Points & Versioning Strategy

> **Status:** Ratification Pending — CTO Review
> **Version:** 1.0.0
> **Phase:** 10.5 — Architecture Freeze
> **Scope:** How to extend the AWIE V2 runtime platform without violating the Constitution.

---

## Introduction

The AWIE V2 platform is designed to be extended **without touching the renderer**. This document is the operator's manual for adding new capabilities. Every extension point below respects the Ultimate Law: **"AI decides. Runtime executes."**

---

## 1. Adding a New Industry

### Goal
Add a new industry (e.g., "Dental Clinic") so the AI can generate sites for it.

### Where the change lives
**Entirely in the Decision Layer.** No renderer, theme, or component changes.

### Steps
1. **Register the industry** in `src/lib/industry-registry/registry.ts` with its id, name, and capabilities.
2. **Define the capabilities** the industry needs (e.g., `appointments`, `services`, `insurance`).
3. **Map capabilities to Recipes** in the Recipe Engine. Each capability resolves to a Recipe that produces a RecipeBlueprint.
4. **Add mock data** in `src/lib/industry-registry/mocks.ts` for testing.

### What you MUST NOT do
- ❌ Add a new component to the renderer for this industry.
- ❌ Add business-specific props (`dentalService`, `insurancePlan`) to any semantic contract.
- ❌ Import the industry into the renderer or theme ecosystem.

### Why it works
The renderer only knows semantic components (`hero`, `featureGrid`, `faq`, `cta`). A Dental Clinic's "services" capability maps to the generic `featureGrid` component. The renderer renders it identically to a restaurant's "menu" — because both are just `featureGrid` with different data.

---

## 2. Adding a New Recipe and Semantic Feature

### Goal
Add a new Recipe (a reusable section blueprint) or a new semantic Feature.

### Where the change lives
**Decision Layer + Theme Ecosystem (contracts only).**

### Steps for a new Recipe
1. **Define the Recipe** in `src/lib/recipe-engine/registry.ts` — its id, required capabilities, and the ordered sections it produces.
2. **Map sections to semantic components** via the section-mapper. A Recipe section maps to an existing semantic component (`hero`, `featureGrid`, `faq`, `cta`, `footer`).
3. **Register priority** in the priority-resolver if it competes with other recipes.

### Steps for a new semantic Feature (a new component type)
1. **Add a semantic contract** in `src/lib/theme-ecosystem/components/contracts.ts` using **generic vocabulary only** (`heading`, `body`, `items`, `actions`).
2. **Add the component to `REQUIRED_COMPONENTS`** so every Theme must map it.
3. **Add a component mapping** to every Theme in `src/lib/theme-ecosystem/assets/registry.ts`.
4. **Add a layout** for the new component in the Theme's `layouts`.
5. **Run the Theme Ecosystem test** — the Compatibility Matrix will verify the new component renders across all Themes with 0 crashes.

### What you MUST NOT do
- ❌ Add business-specific vocabulary to a contract.
- ❌ Add a component that only one industry uses.
- ❌ Skip the certification step.

---

## 3. Implementing a New Framework Adapter (e.g., Vue Adapter)

### Goal
Render the same RenderNode tree to a new framework (Vue, Vanilla, Svelte, ...).

### Where the change lives
**A new adapter directory** (e.g., `src/lib/renderer-vue/`). The core engine and RenderNode are untouched.

### Steps
1. **Create the adapter directory** mirroring `src/lib/renderer-react/`.
2. **Implement the adapter** that walks a `RenderNode` tree and materializes it into the target framework's UI.
3. **Handle the three node types**: `element` (resolve via ComponentRegistry → render component), `text` (render text leaf), `fragment` (render ordered children).
4. **Consume the pure RenderContext** (locale, theme, resource map, asset resolver, registries). Never import business types.
5. **Register the adapter's components** in its own ComponentRegistry. The adapter maps semantic component ids to its framework's components.

### The Adapter Contract (from the Constitution)
- The adapter MUST NOT contain business logic.
- The adapter MUST NOT call an AI API.
- The adapter MUST NOT mutate ThemeConfig.
- The adapter consumes the SAME RenderNode tree as every other adapter.

### Why it works
Because the core engine returns a framework-agnostic `RenderNode` (ADR 002), adding Vue is purely additive. The React adapter, the engine, and all Themes remain unchanged.

---

## Versioning Strategy

### Semantic Versioning (SemVer)
The platform uses `MAJOR.MINOR.PATCH`:

- **MAJOR** — Breaking change to a public contract, ThemeConfig shape, or the Constitution.
- **MINOR** — Backward-compatible addition (new Industry, new Recipe, new Theme, new semantic component).
- **PATCH** — Backward-compatible bug fix.

### What is versioned
| Artifact | Versioning Rule |
|----------|-----------------|
| **Semantic Component Contracts** | MAJOR bump on any breaking change. Designed to be stable for 5 years. |
| **ThemeConfig schema** | MAJOR bump on shape change. A migration layer (`theme-config/v2/migration.ts`) handles upgrades. |
| **Themes (Skins/Typographies)** | MINOR bump on new Theme. PATCH on token fixes. |
| **Industries / Recipes** | MINOR bump on addition. Never a MAJOR bump (they are additive data). |
| **Framework Adapters** | Independently versioned. A new adapter does not bump the core. |

### The Constitution is versioned separately
The AWIE Runtime Constitution has its own version. Any amendment requires a formal ADR + CTO ratification (Constitution Article VI).

### Migration Policy
- ThemeConfig carries a `version` field. The migration layer (`theme-config/v2/migration.ts`) upgrades older configs to the current schema.
- A MAJOR ThemeConfig change MUST ship a migration path. No silent breaking changes.

---

## Summary of Extension Points

| I want to... | I touch... | I never touch... |
|--------------|------------|------------------|
| Add an Industry | Industry Registry, Recipe Engine | Renderer, Themes |
| Add a Recipe | Recipe Engine, section-mapper | Renderer |
| Add a semantic Feature | Component contracts, Theme mappings, layouts | Renderer core |
| Add a Theme | Theme Ecosystem assets | Renderer, AI |
| Add a Framework Adapter | New adapter directory | Core engine, RenderNode |
| Change a contract | Contracts + all Themes + certification | AI layer |

---

## Ratification

- **Author:** Lead Engineer (AWIE V2)
- **Reviewer:** CTO
- **Status:** ⏳ Pending CTO Ratification

*This document takes effect immediately upon CTO ratification.*
