# ADR-007 — CMS Composition Boundary

> **Status:** Accepted
> **Date:** 2026-08-06
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 14 — CMS Infrastructure & Product Ecosystem

---

## Context

The Runtime must never understand CMS domain concepts. Examples include:

- Project
- Brand
- Locale Variant
- Theme Pointer
- Plugin Configuration
- Revision History

These belong exclusively to the CMS domain. As the platform expands into global
localization and multi-tenant product ecosystems, there is a recurring
temptation to let the Runtime reach into CMS models to compose its own
execution input. This must be structurally prevented.

Two structural options were considered:

1. **Runtime composes its own input.** The Runtime reads Project, Brand, Locale
   Variant, and Plugin models directly and assembles whatever it needs to
   render. This couples the execution engine to the CMS data model and forces
   the Runtime to understand business concepts.
2. **A Composition Boundary.** The CMS side composes multiple domain models
   into a single immutable execution contract. The Runtime consumes only that
   contract and never performs composition.

## Decision

**Introduce a Composition Boundary.**

The **CMS side is responsible for composition.** It composes multiple domain
models into a single immutable execution contract. The **Runtime consumes only
the execution contract.** It never performs composition.

### The Execution Contract

The execution contract remains **`ThemeConfig`**.

`ThemeConfig` is redefined as:

- The **immutable presentation contract** consumed by the Runtime.
- It is **not** the CMS data model.
- It is **not** the Aggregate Root.
- It is **not** the editing model.
- It exists **solely for deterministic execution.**

### The Composition Service

Any service responsible for producing `ThemeConfig` belongs to the **CMS
infrastructure** and is **outside the Runtime**:

- `ProjectResolver` (today)
- `EdgeResolver` (tomorrow)
- `BuildResolver` (later)

All of these live on the CMS side of the boundary.

### Dual-Tier Cache

Two cache layers are defined.

**L1 — Composition Cache (CMS Side)**

```
Project -> Composition -> ThemeConfig
```

- Stores immutable execution contracts.
- Invalidated **only** when the Project changes.

**L2 — Runtime Cache (Runtime Side)**

```
ThemeConfig -> RenderNode
```

- Stores rendered execution trees.
- Invalidated **only** when ThemeConfig changes.

The two tiers are strictly separated by the Composition Boundary. The CMS owns
L1; the Runtime owns L2. Neither tier may reach across the boundary.

### CRITICAL ADDITION — LocaleVariant MUST NEVER Hold a ThemeConfig

A **`LocaleVariant` MUST NEVER hold a `ThemeConfig`.**

`ThemeConfig` is **ONLY** generated dynamically via:

```
Project -> Composition -> ThemeConfig
```

- A `LocaleVariant` is a **strict reference model** (locale, status, revisions,
  and references to content, assets, SEO, and routing). It is **not** a
  container for presentation state.
- Storing a `ThemeConfig` on a `LocaleVariant` would (a) duplicate the SSOT,
  (b) allow a locale to drift from the composed contract, and (c) invite the
  Runtime to read presentation state directly from a CMS model.
- The **only** path to a `ThemeConfig` is the Composition Service, which
  resolves the Project's active Theme Pointer and composes the execution
  contract dynamically.

## Consequences

**Positive:**
- **Runtime purity.** The Runtime remains stateless, deterministic,
  framework-independent, locale-independent, and business-independent.
- **Future-proof.** Future CMS evolution (new locales, new plugins, new
  products) never requires Runtime modification.
- **Single source of truth.** `ThemeConfig` is produced in exactly one place,
  eliminating drift and duplication.
- **Cache correctness.** L1 and L2 have disjoint invalidation triggers, so a
  Project change and a ThemeConfig change can never collide.

**Negative:**
- **Composition cost.** Every Project change requires a re-composition into a
  fresh `ThemeConfig` (mitigated by the L1 Composition Cache).
- **Indirection.** The Runtime cannot read CMS state directly; it must trust the
  composed contract.

**Trade-off:** We accept a composition indirection layer in exchange for a
permanently sealed, business-independent Runtime.

## Alternatives Considered

1. **Runtime composes its own input.** Rejected: couples the execution engine
   to the CMS data model and forces the Runtime to understand business
   concepts.
2. **LocaleVariant holds a ThemeConfig.** Rejected: duplicates the SSOT, allows
   locale drift, and invites the Runtime to read presentation state from a CMS
   model. `ThemeConfig` is generated only via
   `Project -> Composition -> ThemeConfig`.

## Compliance

Enforced by the **Architecture Guard** (Import Boundaries): the Runtime modules
must never import `Project`, `LocaleVariant`, `Brand`, `PluginSet`,
`ThemePointer`, or `Snapshot` models. Only the resolved execution contract
(`ThemeConfig`) may cross the CMS → Runtime boundary. The **Golden Journey** E2E
test exercises the Composition Service path and asserts that the Runtime
receives only a composed `ThemeConfig`.
