# ADR 007 — Buy Before Build (Application Runtime Foundation Review)

> **Status:** Proposed (AR-0 — awaiting CTO review)
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 16.3 — Architecture Review 0 (AR-0)
> **Scope:** RESEARCH ONLY. No code changes. This ADR evaluates whether the
> custom Application Runtime Foundation (Phase 16.1 & 16.2) can be simplified
> by integrating mature open-source libraries.

---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). Phase 16 introduced a custom
**Application Runtime Foundation** under `src/runtime/`:

- **Custom StateStore** — a framework-agnostic observable store holding
  `RuntimeState` (feature slices + live data), with `patchSlice()` for
  slice-scoped immutable updates.
- **Custom AdapterRegistry** — registers domain live-data adapters
  (commerce, reservation, crm, analytics) and routes fetched data into the
  correct feature slice.
- **Custom LiveDataAdapter / Fetch Pipeline** — domain adapters that fetch
  live data and patch it into the store, which the HydrationEngine then
  overlays onto the immutable `ThemeConfig`.

The CTO has established **Article VII — Buy Before Build**: *AWIE builds only
what makes AWIE unique. Everything else should be adopted, wrapped, or
delegated whenever practical.*

This ADR evaluates each custom implementation against industry-standard
open-source equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig`.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (Composition,
   ThemeConfig, AI Decision, Plugin Contracts).

---

## Comparison Table

| Custom implementation | Equivalent open-source capability | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- |
| **Custom StateStore** (`src/runtime/core/StateStore.ts`) | **Zustand** (vanilla store, framework-agnostic, `subscribe`, immutable updates, middleware) | **WRAP** | Zustand provides a battle-tested store with pub/sub, selectors, and middleware (persist, devtools). We keep a thin AWIE Adapter that (a) enforces the **immutable ThemeConfig** invariant and (b) exposes our `RuntimeState` + `patchSlice()` contract. The store internals (subscription, equality, middleware) are delegated to Zustand. | **Low.** We delete ~100 LOC of hand-rolled pub/sub/equality logic. Zustand is ~1kB, zero-dependency, and maintained by the community. |
| **Custom AdapterRegistry** (`src/runtime/core/AdapterRegistry.ts`) | **TanStack Query** (query client, query keys, mutation cache, background refetch) | **WRAP** | TanStack Query owns the fetch lifecycle (caching, dedup, retry, invalidation, background refetch). Our AdapterRegistry becomes a thin AWIE Adapter that maps each domain adapter to a TanStack Query key and routes the resolved data into the correct feature slice. The registry's *orchestration* (which adapter owns which slice) remains AWIE-specific. | **Low.** We remove hand-rolled fetch orchestration and gain retry/dedup/invalidation for free. TanStack Query is framework-agnostic (core) and widely maintained. |
| **Custom LiveDataAdapter / Fetch Pipeline** (`src/runtime/providers/*LiveAdapter.ts`) | **TanStack Query** (data fetching) + **Zod** (response validation) | **WRAP** | Each domain adapter becomes a TanStack Query fetcher with a **Zod** schema guarding the response shape. The AWIE Adapter still maps the validated payload into the feature slice and preserves the **ThemeConfig immutability** boundary. The *domain mapping* (raw API → slice shape) is AWIE IP and stays custom. | **Low.** We replace hand-rolled fetch + ad-hoc validation with TanStack Query + Zod. Zod gives compile-time + runtime schema safety for external API responses. |

---

## Decision

**Adopt a WRAP strategy for all three custom implementations.** None of them
are AWIE core IP (Composition, ThemeConfig, AI Decision, Plugin Contracts).
They are generic infrastructure that mature libraries already solve better.

- **StateStore → Zustand (WRAP).** Keep a thin AWIE Adapter enforcing the
  immutable `ThemeConfig` invariant and exposing `RuntimeState` +
  `patchSlice()`. Delegate subscription/equality/middleware to Zustand.
- **AdapterRegistry → TanStack Query (WRAP).** Keep the AWIE slice-routing
  orchestration; delegate fetch lifecycle (cache, dedup, retry, invalidation)
  to TanStack Query.
- **LiveDataAdapter / Fetch Pipeline → TanStack Query + Zod (WRAP).** Keep the
  AWIE domain-mapping logic; delegate fetching to TanStack Query and response
  validation to Zod.

 ### What remains BUILD (AWIE core IP)

 The following are NOT delegated and remain custom:

 - **HydrationEngine** — the overlay of live data onto the immutable
   `ThemeConfig` without mutation. This is the heart of the Runtime Purity
   constitution (ADR-008) and is AWIE-specific.
 - **Feature-slice routing** — the mapping of domain adapters to slices is
   AWIE's orchestration model.
 - **The CMS → Runtime boundary** — only the resolved execution contract
   (`ThemeConfig`) crosses the boundary; this is enforced by the Architecture
   test and is non-negotiable.

 ---

 ## Amendment A — Replaceability

 The OSS libraries adopted under this ADR are **isolated behind AWIE-owned
 adapters**:

 - **Zustand** is wrapped by `ZustandStateStore`, which exposes the AWIE
   `IStateStore` contract (`getState`, `setState`, `subscribe`, `patchSlice`).
   No consumer of `IStateStore` ever imports `zustand`.
 - **TanStack Query** is wrapped by `QueryClientLiveDataAdapter`, which exposes
   the AWIE `IDomainLiveDataAdapter` contract (`sliceName`, `fetchSlice`). No
   consumer of `IDomainLiveDataAdapter` ever imports `@tanstack/react-query`.

 **Replaceability rule:** Swapping the backing library requires changing ONLY
 the adapter implementations — never the AWIE interfaces (`IStateStore`,
 `IDomainLiveDataAdapter`) nor any of their consumers. The Core Constitution
 (`HydrationEngine`, `AdapterRegistry`, `ThemeConfig` immutability) is
 untouched by a library swap.

 ---

 ## Amendment B — Exit Strategy

 Because consumers depend only on the AWIE-owned contracts, the backing
 libraries can be replaced **within one week** without changing any core
 contract:

 1. Implement a new adapter satisfying the same AWIE interface (e.g., a
    `ReduxStateStore` or a `SWRLiveDataAdapter`).
 2. Swap the adapter wiring at the composition root.
 3. Re-run the full test suite — the Architecture test, HydrationEngine test,
    and AdapterRegistry test remain green because they assert against the AWIE
    contracts, not the library.

 This exit strategy guarantees that AWIE is never locked into a specific OSS
 dependency, preserving the framework-agnostic constitution.

 ---

## Consequences

**Positive:**
- **Reduced maintenance.** We stop maintaining hand-rolled pub/sub, fetch
  orchestration, and validation. Zustand, TanStack Query, and Zod are
  community-maintained and battle-tested.
- **Battle-tested correctness.** Retry, dedup, cache invalidation, and schema
  validation are solved by mature libraries rather than bespoke code.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP,
  aligning with Article VII.

**Negative:**
- **New dependencies.** Adds Zustand, TanStack Query, and Zod to the runtime
  dependency tree. Bundle size increases slightly (all three are small and
  tree-shakeable).
- **Adapter indirection.** A thin AWIE Adapter layer is required to preserve
  the immutable `ThemeConfig` invariant and the slice-routing contract. This
  indirection must be documented and tested.
- **Migration effort.** The existing Phase 16.1/16.2 code and tests must be
  refactored to route through the new adapters. The Architecture test and
  HydrationEngine tests must remain green.

**Trade-off:** We accept a small dependency footprint and an adapter layer in
exchange for dramatically lower maintenance cost and battle-tested
infrastructure. The immutable `ThemeConfig` invariant and the CMS → Runtime
boundary are preserved by the AWIE Adapter layer.

---

## Alternatives Considered

1. **Keep all custom (Level 3 BUILD).** Rejected: violates Article VII. The
   StateStore, AdapterRegistry, and fetch pipeline are generic infrastructure,
   not AWIE IP.
2. **Replace wholesale (Level 1 BUY).** Rejected: adopting Zustand/TanStack
   Query directly would leak library concepts into the Runtime and risk
   violating the immutable `ThemeConfig` invariant. A thin AWIE Adapter is
   required to preserve the constitution.
3. **Use SWR instead of TanStack Query.** Considered: SWR is lighter but
   React-oriented and less framework-agnostic. TanStack Query's framework-
   agnostic core better matches AWIE's framework-agnostic Runtime.

---

## Compliance

This ADR is **Proposed** and awaits CTO review. If approved, the migration
will be tracked as a follow-up task. The following invariants MUST remain
enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **HydrationEngine test** — the `ThemeConfig` remains strictly unmodified
  after overlaying live data.
- The **AdapterRegistry test** — slice isolation and correct slice routing.
