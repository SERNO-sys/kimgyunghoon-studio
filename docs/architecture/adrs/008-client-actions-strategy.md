# ADR 008 — Client Actions Strategy (Application Runtime Foundation Review)

> **Status:** Approved (ARB) — Implementation in progress
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Client Actions
> **Scope:** Approved with REQUIRED Amendments C & D. This ADR evaluates how to
> handle Client Actions (UI events: clicks, form submissions) originating from
> the immutable `ThemeConfig`, while respecting the Core Constitution (Runtime
> never mutates presentation).
>
> **Amendments (approved):**
> - **Amendment C — Stable Action Contract:** Action identifiers are immutable
>   public contracts. They MUST NOT encode framework details, HTTP verbs, or
>   infrastructure names.
> - **Amendment D — Handler Isolation:** Action handlers consume runtime
>   payloads ONLY. ThemeConfig objects MUST NEVER be passed into execution
>   handlers.
> - **Thin Router Pattern:** Do NOT build a Dispatcher, Bus, or Queue. Build a
>   strictly thin `IActionRouter` interface that merely resolves a string to a
>   handler function.


---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). We are shifting from Phase-based
to **Capability-based** development. The next capability is **Client Actions**:
handling UI events such as "Add to Cart", "Delete", "Checkout", and
"Reservation" that originate from components defined in the immutable
`ThemeConfig`.

The CTO's hypothesis: **Do we even need a custom Action Registry or
Dispatcher?** A component in `ThemeConfig` can simply define an `actionId`
that maps directly to a TanStack Mutation or a standard React event handler
via a thin WRAP.

This ADR evaluates each custom implementation against industry-standard
open-source equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig`.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (Composition,
   ThemeConfig, AI Decision, Plugin Contracts).

### How actions attach to ThemeConfig (without breaking immutability)

The `ThemeConfig` is an immutable SSOT. Actions are **declarative references**,
not executable code:

- A **Section** (`SectionConfig.content: Record<string, unknown>`) may carry an
  `actionId` string (e.g. `"commerce.addToCart"`).
- A **Form** (`FormConfig.submitTo?: string`) already carries a handler key for
  submission.

The Runtime NEVER executes, resolves, or decides these actions. It only
**emits** the declarative `actionId` as part of the hydration instruction. The
**Application Layer** (outside the Runtime) maps the `actionId` to an actual
execution. This preserves ADR-008 (Runtime Purity): the Runtime receives only
execution contracts and never resolves, edits, composes, validates, or decides.

---

## Comparison Table

| Capability | OSS Equivalent / Strategy | Decision | Architectural impact (ThemeConfig immutability) | Maintenance cost |
| --- | --- | --- | --- | --- |
| **Simple Actions** (Add to Cart, Delete) | **TanStack Query Mutations** (`useMutation`) | **WRAP** | A component's `actionId` maps to a TanStack Mutation via a thin AWIE Adapter. The mutation owns the async lifecycle (pending/error/success, cache invalidation, optimistic updates). The `ThemeConfig` stays immutable — the `actionId` is a declarative string, and the mutation is wired at the Application Layer, never inside the Runtime. | **Low.** We delete any hand-rolled async action orchestration. TanStack Query is already adopted (ADR-007) and battle-tested. |
| **Simple Actions** (alternative) | **Custom Action Registry** | **BUILD (rejected)** | A bespoke registry of action handlers duplicates what TanStack Query Mutations already provide (pending/error/success, retry, cache). It would be generic infrastructure, not AWIE IP, violating Article VII (Buy Before Build). | **High.** Hand-rolled async state, retry, and cache invalidation. |
| **Simple Actions** (alternative) | **XState** (state machines) | **BUY (rejected)** | XState is powerful for complex orchestration but is overkill for simple one-shot actions (Add to Cart, Delete). It introduces a state-machine paradigm that does not map cleanly to the declarative `actionId` model and adds conceptual weight. | **Medium.** XState adds a state-machine runtime and learning curve for simple actions. |
| **Form Submissions** (Checkout, Reservation) | **React Hook Form + Zod** | **WRAP** | A form's `submitTo` key maps to a React Hook Form controller with a **Zod** schema guarding the payload. The validated payload is then handed to a TanStack Mutation. The `ThemeConfig` form definition (`FormConfig.fields`) remains the declarative source of field shape; validation and submission wiring live at the Application Layer. | **Low.** React Hook Form + Zod are mature, tree-shakeable, and already the industry standard for form state + validation. |
| **Form Submissions** (alternative) | **Custom Form Handlers** | **BUILD (rejected)** | Hand-rolled form state, validation, and submission orchestration duplicates React Hook Form + Zod. It is generic infrastructure, not AWIE IP. | **High.** Hand-rolled field state, validation rules, and error handling. |
| **Action Routing** (mapping `actionId` string to execution) | **Thin AWIE Mapper** (a `Map<actionId, handler>`) | **BUILD** | A minimal, declarative `Map<string, ActionHandler>` that resolves an `actionId` to a TanStack Mutation or React event handler. This is AWIE's orchestration model (which action owns which behavior) and is the ONLY piece that must be custom. It is a thin, pure mapping — no async state, no cache, no validation. | **Low.** A single `Map` with typed keys. No OSS command-bus is needed for this scale. |
| **Action Routing** (alternative) | **OSS Command Bus** (e.g. `@nestjs/cqrs`, `command-bus` libs) | **BUY (rejected)** | Command-bus libraries are designed for server-side CQRS with decorators, handlers, and event sourcing. They are heavyweight for a client-side `actionId -> handler` mapping and would leak framework concepts into the Runtime. | **Medium.** Adds a command-bus runtime and decorator infrastructure for a simple map. |

---

## Decision

**Adopt a WRAP strategy for execution, and a minimal BUILD for routing.**

- **Simple Actions → TanStack Query Mutations (WRAP).** A component's
  `actionId` maps to a TanStack Mutation via a thin AWIE Adapter. The mutation
  owns the async lifecycle; the `ThemeConfig` stays immutable.
- **Form Submissions → React Hook Form + Zod (WRAP).** A form's `submitTo` key
  maps to a React Hook Form controller with a Zod schema. The validated payload
  is handed to a TanStack Mutation.
- **Action Routing → Thin AWIE Mapper (BUILD).** A minimal
  `Map<actionId, ActionHandler>` resolves the declarative `actionId` to a
  TanStack Mutation or React event handler. This is AWIE's orchestration model
  and is the only custom piece.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The `actionId` → handler Mapper** — the mapping of declarative action
  strings to execution is AWIE's orchestration model.
- **The CMS → Runtime boundary** — only the resolved execution contract
  (`ThemeConfig`) crosses the boundary; the Runtime emits declarative
  `actionId`s and never executes them.
- **The immutable `ThemeConfig` invariant** — actions are declarative
  references, never executable code, preserving ADR-008 (Runtime Purity).

---

## Consequences

**Positive:**
- **Reduced maintenance.** We stop maintaining hand-rolled async action
  orchestration, form state, and validation. TanStack Query, React Hook Form,
  and Zod are community-maintained and battle-tested.
- **Battle-tested correctness.** Async lifecycle (pending/error/success,
  retry, cache invalidation), form state, and schema validation are solved by
  mature libraries rather than bespoke code.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP
  (the `actionId` mapper), aligning with Article VII.
- **ThemeConfig immutability preserved.** Actions are declarative strings in
  the immutable SSOT; execution is wired at the Application Layer, never in
  the Runtime.

**Negative:**
- **New dependencies.** Adds React Hook Form to the runtime dependency tree
  (TanStack Query and Zod are already adopted via ADR-007). Bundle size
  increases slightly (all are small and tree-shakeable).
- **Adapter indirection.** A thin AWIE Adapter layer is required to map
  `actionId`/`submitTo` to mutations and form controllers. This indirection
  must be documented and tested.
- **Application Layer wiring.** The `actionId` mapper must be registered at
  the Application Layer (outside the Runtime), which requires a clear
  composition boundary.

**Trade-off:** We accept a small dependency footprint and an Application Layer
wiring step in exchange for dramatically lower maintenance cost and
battle-tested infrastructure. The immutable `ThemeConfig` invariant and the
CMS → Runtime boundary are preserved by the declarative `actionId` model.

---

## Alternatives Considered

1. **Custom Action Registry (Level 3 BUILD).** Rejected: violates Article VII.
   A bespoke registry of async action handlers duplicates TanStack Query
   Mutations (pending/error/success, retry, cache).
2. **XState for simple actions (Level 1 BUY).** Rejected: overkill for
   one-shot actions; introduces a state-machine paradigm that does not map
   cleanly to the declarative `actionId` model.
3. **OSS Command Bus for routing (Level 1 BUY).** Rejected: command-bus
   libraries are designed for server-side CQRS and are heavyweight for a
   client-side `actionId -> handler` map.
4. **Custom Form Handlers (Level 3 BUILD).** Rejected: duplicates React Hook
   Form + Zod (form state, validation, error handling).

---

## Approved Amendments (ARB)

The Architecture Review Board approved ADR-008 with the following REQUIRED
amendments. These amendments are binding and MUST be enforced by the
implementation.

### Amendment C — Stable Action Contract

Action identifiers (e.g., `cart.add`, `reservation.submit`) are **immutable
public contracts**. They are the stable, versioned vocabulary that the
immutable `ThemeConfig` references and that the `IActionRouter` resolves.

**Rules:**
- Action IDs MUST be stable, human-readable, domain-scoped strings
  (e.g., `cart.add`, `reservation.submit`, `crm.createLead`).
- Action IDs MUST NOT encode framework details, HTTP verbs, or infrastructure
  names. Forbidden examples: `POST_/api/cart`, `reactMutation42`,
  `useMutation_addToCart`.
- Action IDs are part of the public contract. Renaming an action ID is a
  breaking change and MUST be versioned.

**Rationale:** Because `ThemeConfig` is immutable and may be cached (L1/L2),
action IDs must remain stable across releases. Encoding framework or
infrastructure details into the ID couples the immutable SSOT to a specific
implementation, violating the CMS → Runtime boundary and ADR-008 (Runtime
Purity).

### Amendment D — Handler Isolation

Action handlers consume **runtime payloads ONLY**. The immutable `ThemeConfig`
object MUST NEVER be passed into an execution handler.

**Rules:**
- An `ActionHandler` receives a single payload argument (e.g.,
  `{ productId, quantity }`).
- The `ThemeConfig` object MUST NOT be passed to, or captured by, an
  `ActionHandler`.
- Handlers MUST NOT mutate the `ThemeConfig`. They operate on the mutable
  `RuntimeState` overlay (via the StateStore) or perform side effects
  (e.g., a TanStack Mutation).

**Rationale:** Passing the `ThemeConfig` into a handler would allow the handler
to read or mutate presentation, breaking the immutable SSOT invariant and the
Runtime Purity constitution. Handlers are execution-only; they never resolve,
edit, compose, validate, or decide presentation.

### Thin Router Pattern

Do NOT build a Dispatcher, Bus, or Queue. Build a **strictly thin**
`IActionRouter` interface that merely resolves a string to a handler function.

**Rules:**
- `IActionRouter.resolve(actionId: string): ActionHandler | undefined` — a
  pure dictionary lookup.
- The router MUST NOT execute handlers, manage async state, apply retries, or
  perform validation. Those concerns belong to the WRAP layer (TanStack Query
  Mutations, React Hook Form + Zod).
- The router is the ONLY custom piece (BUILD) in the Client Actions capability.

---

## Compliance

This ADR is **Approved** and the implementation is in progress. The following
invariants MUST remain enforced regardless of the decision:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **HydrationEngine test** — the `ThemeConfig` remains strictly unmodified
  after overlaying live data.
- The **Runtime Purity constitution (ADR-008)** — the Runtime emits declarative
  `actionId`s and never resolves, edits, composes, validates, or decides.
- The **immutable `ThemeConfig` invariant** — actions are declarative
  references, never executable code.
