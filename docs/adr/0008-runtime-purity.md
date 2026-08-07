# ADR-008 — Runtime Purity

> **Status:** Accepted
> **Date:** 2026-08-06
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 14 — CMS Infrastructure & Product Ecosystem

---

## Context

As the platform expands to include global CMS features, localization, and
plugin integrations, there is a recurring temptation to inject
decision-making logic or CMS states directly into the execution environment.

Two structural options were considered:

1. **A permissive Runtime.** The Runtime is allowed to resolve, edit, compose,
   validate, or decide as needed. It reads CMS state (Project, Locale,
   Plugin Settings) directly and adapts its behavior. This is convenient but
   couples the execution engine to business logic and CMS data.
2. **A pure Runtime.** The Runtime receives only execution contracts. It never
   resolves, edits, composes, validates, or decides. All business meaning is
   resolved on the CMS side before execution.

## Decision

**"Runtime receives only execution contracts. Runtime never resolves, edits,
composes, validates, or decides."**

This is the **absolute law** of the AWIE V2 architecture.

- Do **not** process `Locale` in the Runtime.
- Do **not** read `Plugin Settings` in the Runtime.
- Do **not** pass `Project` or `Aggregate Root` to the Runtime.
- Do **not** resolve routes, assets, or content in the Runtime.
- Do **not** validate or re-compose the execution contract in the Runtime.

The Runtime's sole input is the immutable execution contract (`ThemeConfig`),
produced by the CMS Composition Service. Everything the Runtime needs to
execute is already resolved, composed, and validated before it crosses the
boundary.

### What the Runtime May Do

The Runtime may only **execute** the contract it receives:

- Render the composed `ThemeConfig` into a `RenderNode` tree.
- Cache rendered execution trees (L2 Runtime Cache).
- Apply framework adapters (React / Vue / future frameworks).

It may never reach back into CMS models to obtain missing information.

## Consequences

**Positive:**
- **Permanently sealed engine.** The core execution engine is frozen and
  protected from business drift.
- **Deterministic.** Identical `ThemeConfig` input always produces identical
  output, because no hidden CMS state can influence execution.
- **Testable.** The Runtime can be tested in isolation with synthetic execution
  contracts.
- **Future-proof.** Whether an update occurs 3 years or 5 years from now, any
  architectural proposal that introduces composition or decision-making into
  the Runtime will be rejected based on this ADR.

**Negative:**
- **Upfront composition.** All resolution and validation must happen on the CMS
  side before execution, which is more work than letting the Runtime "figure it
  out."
- **Strict discipline.** Every new feature must be resolved into the execution
  contract rather than read at runtime.

**Trade-off:** We accept the cost of upfront composition in exchange for a
permanently sealed, deterministic, business-independent Runtime.

## Alternatives Considered

1. **A permissive Runtime.** Rejected: couples the execution engine to business
   logic and CMS data, breaking determinism and the frozen Core.
2. **Runtime reads Locale / Plugin Settings directly.** Rejected: violates the
   Composition Boundary (ADR-007) and Runtime Purity. All such state must be
   resolved into the execution contract on the CMS side.

## Compliance

Enforced by the **Architecture Guard** (Import Boundaries): the Runtime modules
must never import `Project`, `LocaleVariant`, `Brand`, `PluginSet`,
`ThemePointer`, or `Snapshot` models. Only the resolved execution contract
(`ThemeConfig`) may cross the CMS → Runtime boundary. The **Golden Journey** E2E
test asserts that the Runtime receives only a composed `ThemeConfig` and never
touches CMS state.
