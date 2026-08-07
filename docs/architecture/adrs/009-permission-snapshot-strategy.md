# ADR 009 — Permission Snapshot Strategy (Application Runtime Foundation Review)

> **Status:** Approved (AR-1) — Implementation in Progress (Phase 16.4)
> **Date:** 2026-08-07
> **Deciders:** CTO, Lead Engineer (AWIE V2), Architecture Review Board
> **Phase:** Capability-based — Permissions
> **Scope:** Research + Implementation. This ADR evaluates the OSS landscape for
> Authentication, Session, and RBAC, and defines the **Permission Snapshot
> Contract** that the Application layer delivers to the Runtime. It prescribes
> the snapshot contract and the Runtime's pure mapping behavior.
>
> **Constitutional Rule (ADR-009):**
> > **"The Runtime NEVER evaluates authorization rules. It only consumes
> > immutable permission snapshots produced by the Application layer."**
>
> The Runtime does NOT know *why* a user has access. It only reads the Snapshot
> and generates Hydration Instructions (e.g., Hide Component A, Disable
> Button B).
>
> **Approved Amendments (AR-1):**
> - **Amendment A (Snapshot Versioning):** The `PermissionSnapshot` MUST include
>   `version` and `issuedAt` to trace and debug cache inconsistencies between
>   the Edge and the Runtime.
> - **Amendment B (Semantic Target ID):** The `targetId` MUST be a Semantic
>   Component Identity (e.g., `hero.login`, `pricing.button`). It is strictly
>   decoupled from DOM IDs, Framework IDs, or UUIDs. This is a core contract.
> - **Level B (Verdict vs. Instruction Separation):** The `PermissionSnapshot`
>   contains only minimal verdicts (`visibility`, `enabled`). The
>   `HydrationEngine` owns the responsibility of translating these raw verdicts
>   into rich UI instructions (e.g., Hide, Mask, Blur, Skeleton, Redact).


---

## Context

The AWIE V2 Core Engine is frozen (v2.0.0). We are building capabilities on top
of the immutable `ThemeConfig` and the Runtime Purity constitution (ADR-008).
The next capability is **Permissions**: controlling which UI components are
visible, enabled, or hidden for a given user.

The CTO's insight is the master key that prevents the deepest trap in
permission design: **baking a business-rule engine into the Runtime.**

If the `HydrationEngine` ever contained logic like
`if (user.role === 'admin' && resource.owner === user.id)`, the Runtime's
purity would be shattered. Policy evaluation is a business concern. It belongs
**outside** the Runtime, in the Application layer, delegated to mature OSS
(NextAuth, CASL, Cerbos, etc.). The Runtime receives only the **final verdict** —
an immutable **Permission Snapshot** — and translates it into declarative
Hydration Instructions ("hide component A", "disable button B").

This ADR follows the strict AR-0 workflow:
`Idea -> AR-0 (OSS Survey) -> ADR -> Review -> Implementation`.

It evaluates each custom implementation against industry-standard open-source
equivalents and records a decision per the three levels:

1. **Level 1 (BUY)** — adopt the library directly.
2. **Level 2 (WRAP)** — build a thin AWIE Adapter wrapping the library to
   connect it to the immutable `ThemeConfig`.
3. **Level 3 (BUILD)** — keep custom logic for AWIE's core IP (Composition,
   ThemeConfig, AI Decision, Plugin Contracts).

### Why the Runtime must never evaluate rules

The Runtime's job is **orchestration**, not **decision**. Evaluating
authorization rules would:

- **Couple the Runtime to business policy.** The Runtime would need to
  understand roles, ownership, tenancy, and resource relationships — all
  business concepts that violate ADR-008 (Runtime Purity).
- **Break the immutable `ThemeConfig` invariant.** Rule evaluation produces
  mutable, user-specific outcomes. Injecting them into the immutable SSOT would
  corrupt it.
- **Duplicate OSS.** Authorization engines (CASL, Cerbos) are mature,
  battle-tested, and policy-as-code. Rebuilding them is generic infrastructure,
  not AWIE IP, violating Article VII (Buy Before Build).

The correct model: **the Application layer evaluates, the Runtime consumes.**
The Application layer produces an immutable `PermissionSnapshot`; the Runtime
maps that snapshot to UI components defined in `ThemeConfig` **without
evaluating any rule**.

---

## OSS Survey (WRAP)

The following libraries are evaluated for the Authentication, Session, JWT,
and RBAC engines. All are candidates for **WRAP** — isolated behind AWIE-owned
adapters so they never leak into the Core Constitution.

| Capability | OSS Equivalent | Decision | Architectural impact (Runtime Purity) | Maintenance cost |
| --- | --- | --- | --- | --- |
| **Authentication** (login, OAuth, credentials) | **NextAuth.js (Auth.js)** | **WRAP** | NextAuth handles the full auth flow (OAuth providers, credentials, JWT/session callbacks) at the Application layer. It produces a session object that the Application layer converts into a `PermissionSnapshot`. The Runtime never sees NextAuth types — only the snapshot. | **Low.** NextAuth is the de-facto standard for Next.js auth, community-maintained, and already the natural fit for this stack. |
| **Authentication** (alternative) | **Supabase Auth** | **WRAP (optional)** | Supabase Auth provides hosted auth + session management. If adopted, it is wrapped behind the same AWIE adapter so the Runtime still consumes only the snapshot. | **Low.** Hosted, but adds a Supabase dependency and couples to their platform. |
| **Authentication** (alternative) | **Auth0** | **WRAP (optional)** | Auth0 is a commercial identity platform. It is wrapped behind the same adapter; the snapshot contract is unchanged. | **Low.** Commercial cost; strong enterprise features. |
| **Session / JWT** | **jose** (JWT verify) + **iron-session** / **NextAuth session** | **WRAP** | Session tokens are verified and decoded at the Application layer. The decoded identity is mapped into the snapshot. The Runtime never parses JWTs or manages session state. | **Low.** `jose` is a small, audited JWT library; session handling is delegated to the chosen auth provider. |
| **RBAC / Policy Engine** | **CASL** | **WRAP** | CASL is a policy-as-code library (`Ability`). The Application layer builds an `Ability` from the user's roles/permissions and evaluates it against resources. The **result** is a `PermissionSnapshot`; CASL never runs inside the Runtime. | **Low.** CASL is mature, tree-shakeable, and ideal for frontend permission checks. |
| **RBAC / Policy Engine** (alternative) | **Cerbos** | **WRAP (optional)** | Cerbos is a hosted/self-hosted policy engine with a REST/gRPC API. The Application layer calls Cerbos to evaluate a request and receives an `allow`/`deny` verdict, which becomes the snapshot. | **Medium.** Adds a policy server dependency; powerful for complex, centralized policy. |
| **RBAC / Policy Engine** (alternative) | **Custom Permission Evaluator** | **BUILD (rejected)** | A bespoke role/ownership/tenancy evaluator duplicates CASL/Cerbos. It is generic infrastructure, not AWIE IP, and would risk leaking business rules into the Runtime. | **High.** Hand-rolled policy evaluation, role hierarchy, and resource ownership. |

### How we WRAP them (keeping OSS out of the Core Constitution)

Following ADR-007 (Buy Before Build), every OSS library is isolated behind an
AWIE-owned adapter. The Core Constitution (`src/runtime/core`) depends only on
AWIE interfaces — never on NextAuth, CASL, Cerbos, or `jose` types.

- **The Application layer** owns the auth provider (NextAuth/Supabase/Auth0),
  the session/JWT handling (`jose`/iron-session), and the policy engine
  (CASL/Cerbos).
- **The AWIE adapter** converts the OSS output (session, `Ability`, verdict)
  into an AWIE-owned `PermissionSnapshot`.
- **The Runtime** consumes only the `PermissionSnapshot` and emits Hydration
  Instructions.

This preserves **replaceability** (Amendment A) and **exit strategy**
(Amendment B): swapping NextAuth for Auth0, or CASL for Cerbos, requires
changing only the concrete adapter — never the Core Constitution nor its
consumers.

---

## The Snapshot Contract (BUILD)

The `PermissionSnapshot` is the **only** permission artifact that crosses the
Application → Runtime boundary. It is immutable, declarative, and
**rule-free** — it contains verdicts, not logic.

### Conceptual schema

```ts
/**
 * A single permission verdict for a UI target.
 *
 * This is a RESULT, not a rule. It does NOT say WHY the user has access; it
 * only states WHAT the Runtime may do with the target.
 *
 * ============================================================================
 * ADR-009 (Permission Snapshot) — Amendment B: SEMANTIC TARGET ID
 * ============================================================================
 * The `targetId` MUST be a Semantic Component Identity (e.g., 'hero.login',
 * 'pricing.button'). It is strictly decoupled from DOM IDs, Framework IDs, or
 * UUIDs. This is a core contract.
 */
interface PermissionVerdict {
  /**
   * The Semantic Component Identity of the target (e.g., 'hero.login',
   * 'pricing.button'). Strictly decoupled from DOM IDs, Framework IDs, or
   * UUIDs (Amendment B).
   */
  readonly targetId: string;

  /** The resolved visibility for this target. */
  readonly visibility: 'visible' | 'hidden';

  /** The resolved interactivity for this target. */
  readonly enabled: boolean;
}

/**
 * The immutable permission snapshot produced by the Application layer.
 *
 * The Runtime consumes this snapshot and maps it to UI components defined in
 * ThemeConfig WITHOUT evaluating any rule. The snapshot is a pure data
 * carrier — it carries verdicts, never policy.
 *
 * ============================================================================
 * ADR-009 (Permission Snapshot) — Amendment A: SNAPSHOT VERSIONING
 * ============================================================================
 * The snapshot MUST include `version` and `issuedAt` to trace and debug cache
 * inconsistencies between the Edge and the Runtime.
 */
interface PermissionSnapshot {
  /**
   * The version of the snapshot contract (for forward compatibility and to
   * trace cache inconsistencies between the Edge and the Runtime).
   */
  readonly version: string;

  /**
   * The ISO timestamp when the snapshot was issued (for cache debugging).
   */
  readonly issuedAt: string;

  /** The verdicts for each UI target. */
  readonly verdicts: readonly PermissionVerdict[];
}
```


### How the Application layer delivers the snapshot to the HydrationEngine

The delivery follows the same **Overlay Pattern** established in the Runtime
Core (ADR-008 / Phase 16.1):

1. **Evaluate (Application layer).** The Application layer authenticates the
   user (NextAuth/Supabase/Auth0), builds an `Ability` (CASL) or calls Cerbos,
   and evaluates each UI target referenced in `ThemeConfig`.
2. **Produce (Application layer).** The evaluation result is serialized into an
   immutable `PermissionSnapshot` — a flat list of `PermissionVerdict`s keyed by
   `targetId`.
3. **Deliver (Application layer → Runtime).** The snapshot is passed to the
   `HydrationEngine` as part of the runtime context, alongside the immutable
   `ThemeConfig` and the mutable `RuntimeState` overlay.
4. **Consume (Runtime).** The `HydrationEngine` reads the snapshot and emits
   Hydration Instructions. It performs a **pure lookup** — matching each
   `targetId` in the snapshot to the corresponding component in `ThemeConfig` —
   and never evaluates a rule.

### How the engine maps the snapshot to UI components WITHOUT evaluating rules

The mapping is a **pure dictionary join**, not a decision:

- `ThemeConfig` declares components with stable Semantic `targetId`s (e.g.,
  `hero.login`, `pricing.button`).
- The `PermissionSnapshot` carries `PermissionVerdict`s keyed by the same
  Semantic `targetId`s.
- The `HydrationEngine` joins the two by `targetId` and emits a Hydration
  Instruction.

The engine does **not** know *why* `hero.login` is hidden. It only knows that
the snapshot says `visibility: 'hidden'`, so it emits "hide component A". The
*why* (role, ownership, tenancy) lives entirely in the Application layer.

#### Level B: Verdict vs. Instruction Separation

The `PermissionSnapshot` carries only **minimal verdicts** (`visibility`,
`enabled`). The `HydrationEngine` owns the responsibility of translating these
raw verdicts into **rich UI instructions** (e.g., Hide, Mask, Blur, Skeleton,
Redact).

This is a **pure translation**, not a decision:

- `visibility: 'hidden'` → `hide` (fully remove the component from the UI).
- `visibility: 'visible'` + `enabled: false` → `skeleton` (render a disabled
  placeholder).
- `visibility: 'visible'` + `enabled: true` → `show` (no special treatment).

The engine performs a **pure dictionary join**: `targetId -> ThemeConfig ->
HydrationInstruction`. It NEVER evaluates authorization rules (Zero Engine
Rule). It does not inspect the user, the session, or any policy — it blindly
trusts the snapshot.

This preserves the Core Constitution:
- **Runtime Purity (ADR-008):** the Runtime receives only execution contracts
  (the snapshot) and never resolves, edits, composes, validates, or decides.
- **Immutable `ThemeConfig`:** the snapshot is an overlay, never written into
  the immutable SSOT.
- **Buy Before Build (ADR-007):** policy evaluation is delegated to OSS; the
  snapshot contract is the only custom piece.


---

## Comparison Table (Summary)

| Capability | OSS Equivalent / Strategy | Decision | Architectural impact | Maintenance cost |
| --- | --- | --- | --- | --- |
| **Authentication** | NextAuth.js (Auth.js) | **WRAP** | Auth flow lives at the Application layer; Runtime sees only the snapshot. | **Low** |
| **Session / JWT** | `jose` + iron-session / NextAuth session | **WRAP** | Tokens verified/decoded at Application layer; Runtime never parses JWTs. | **Low** |
| **RBAC / Policy Engine** | CASL | **WRAP** | `Ability` built and evaluated at Application layer; result becomes the snapshot. | **Low** |
| **RBAC / Policy Engine** (alt) | Cerbos | **WRAP (optional)** | Policy server evaluates; verdict becomes the snapshot. | **Medium** |
| **RBAC / Policy Engine** (alt) | Custom evaluator | **BUILD (rejected)** | Duplicates CASL/Cerbos; risks leaking business rules into the Runtime. | **High** |
| **Snapshot Contract** | AWIE `PermissionSnapshot` | **BUILD** | The only custom piece — a rule-free, immutable verdict carrier. | **Low** |

---

## Decision

**Adopt a WRAP strategy for all OSS, and a minimal BUILD for the snapshot
contract.**

- **Authentication → NextAuth.js (Auth.js) (WRAP).** The Application layer
  owns the auth flow and produces a session.
- **Session / JWT → `jose` + iron-session / NextAuth session (WRAP).** Tokens
  are verified and decoded at the Application layer.
- **RBAC / Policy Engine → CASL (WRAP).** The Application layer builds an
  `Ability` and evaluates it; the result becomes the snapshot. Cerbos is an
  optional alternative for centralized policy.
- **Snapshot Contract → AWIE `PermissionSnapshot` (BUILD).** A rule-free,
  immutable verdict carrier that the Runtime consumes to emit Hydration
  Instructions.

### What remains BUILD (AWIE core IP)

The following are NOT delegated and remain custom:

- **The `PermissionSnapshot` contract** — the rule-free verdict carrier that
  crosses the Application → Runtime boundary.
- **The snapshot → Hydration Instruction mapping** — the pure `targetId` join
  that translates verdicts into "hide component A" / "disable button B".
- **The CMS → Runtime boundary** — only the resolved execution contract
  (`ThemeConfig`) and the `PermissionSnapshot` cross the boundary; the Runtime
  never evaluates rules.

---

## Consequences

**Positive:**
- **Runtime Purity preserved.** The Runtime never evaluates authorization
  rules. It consumes only immutable verdicts, keeping the business engine out
  of the Runtime.
- **Reduced maintenance.** We stop maintaining hand-rolled auth, session, and
  policy evaluation. NextAuth, CASL, and `jose` are community-maintained and
  battle-tested.
- **Smaller custom surface.** AWIE's custom code shrinks to its actual IP (the
  snapshot contract and the targetId join), aligning with Article VII.
- **Replaceability.** Swapping auth providers or policy engines requires
  changing only the AWIE adapter, never the Core Constitution.

**Negative:**
- **New dependencies.** Adds NextAuth, CASL, and `jose` to the dependency tree
  (all are small and tree-shakeable).
- **Adapter indirection.** A thin AWIE Adapter layer is required to convert OSS
  output into the `PermissionSnapshot`. This indirection must be documented and
  tested.
- **Application Layer wiring.** The snapshot must be produced and delivered at
  the Application layer, which requires a clear composition boundary.

**Trade-off:** We accept a small dependency footprint and an Application Layer
wiring step in exchange for dramatically lower maintenance cost, battle-tested
infrastructure, and — most importantly — a Runtime that stays pure and never
becomes a business engine.

---

## Alternatives Considered

1. **Custom Permission Evaluator (Level 3 BUILD).** Rejected: violates Article
   VII. A bespoke role/ownership/tenancy evaluator duplicates CASL/Cerbos and
   risks leaking business rules into the Runtime.
2. **Evaluating rules inside the HydrationEngine.** Rejected: would couple the
   Runtime to business policy, break the immutable `ThemeConfig` invariant, and
   violate ADR-008 (Runtime Purity).
3. **Cerbos as the primary policy engine (Level 2 WRAP).** Deferred: powerful
   for centralized policy but adds a policy-server dependency. CASL is the
   default; Cerbos remains an optional alternative.
4. **Supabase Auth / Auth0 as the primary auth provider.** Deferred: NextAuth
   is the natural fit for this Next.js stack. Supabase/Auth0 remain optional
   alternatives behind the same adapter.

---

## Compliance

This ADR is **Approved (AR-1)** and implementation is in progress (Phase 16.4).
The following invariants MUST remain enforced:

- The **Architecture test** (`src/runtime/core/Architecture.test.ts`) — no
  `src/runtime` file imports from `src/cms`.
- The **Runtime Purity constitution (ADR-008)** — the Runtime receives only
  execution contracts (the `PermissionSnapshot`) and never resolves, edits,
  composes, validates, or decides.
- The **immutable `ThemeConfig` invariant** — the snapshot is an overlay, never
  written into the immutable SSOT.
- The **Buy Before Build constitution (ADR-007)** — policy evaluation is
  delegated to OSS; the snapshot contract is the only custom piece.
- **Amendment A (Snapshot Versioning)** — the `PermissionSnapshot` MUST carry
  `version` and `issuedAt` for cache debugging between the Edge and the Runtime.
- **Amendment B (Semantic Target ID)** — every `targetId` MUST be a Semantic
  Component Identity, strictly decoupled from DOM IDs, Framework IDs, or UUIDs.
- **Level B (Verdict vs. Instruction Separation)** — the `HydrationEngine`
  translates raw verdicts into rich UI instructions via a pure dictionary join,
  and NEVER evaluates authorization rules (Zero Engine Rule).


