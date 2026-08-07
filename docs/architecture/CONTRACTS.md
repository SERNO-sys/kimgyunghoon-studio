# AWIE V2 — Strict Technical Contracts

> **Status:** Pending CTO Ratification
> **Date:** 2026-08-06
> **Phase:** 12.6 — Core Freeze & ADR Lock (Pre-Phase 13)
>
> This document defines the **Strict Technical Contracts** of the AWIE V2
> platform. Each contract names the exact **Producer**, the exact **Consumers**,
> and the exact **Rules** that must never break.
>
> These are NOT architectural philosophy. They are enforceable, testable
> contracts. A contract is broken the moment any rule is violated.

---

## Contract 001: ThemeConfig

**Producer:** Decision Layer

**Consumers:** Runtime, Application, Delivery

**Rules (must never break):**

1. **Immutable.** A ThemeConfig, once produced, is never mutated in place.
   Any change produces a new ThemeConfig.
2. **Single Source of Truth (SSOT).** ThemeConfig is the ONLY source of truth
   for presentation. No duplicated state exists anywhere else.
3. **Backward compatible.** A consumer written against an older ThemeConfig
   schema MUST continue to function against a newer ThemeConfig.
4. **`schemaVersion` required.** Every ThemeConfig MUST carry a
   `schemaVersion` field. A ThemeConfig without a `schemaVersion` is invalid.
5. **No duplicated state.** No other layer may hold a parallel copy of
   presentation state that can diverge from ThemeConfig.

---

## Contract 002: RenderNode

**Producer:** ThemeEngine

**Consumers:** React Adapter, Vue Adapter, Future Adapters

**Rules (must never break):**

1. **Pure.** A RenderNode is a pure, declarative data structure. It performs
   no side effects and holds no behavior.
2. **Serializable.** A RenderNode MUST be serializable to a plain JSON
   representation and back without loss of meaning.
3. **Deterministic.** The same ThemeConfig MUST always produce the same
   RenderNode. (Same ThemeConfig → Same RenderNode, always.)
4. **Framework agnostic.** A RenderNode MUST NOT reference any framework
   (React, Vue, etc.). It is framework independent by construction.

---

## Contract 003: Command

**Producer:** CMS

**Consumer:** EditorService

**Rules (must never break):**

1. **Immutable.** A Command, once issued, is never mutated.
2. **`commandId` required.** Every Command MUST carry a `commandId`. A Command
   without a `commandId` is invalid.
3. **Idempotent.** Replaying the same Command (same `commandId`) MUST produce
   the same result and MUST NOT create duplicate effects.
4. **Produces ThemePatch.** A Command MUST produce a `ThemePatch` as its
   output. The `ThemePatch` is the only mechanism by which a Command mutates
   the ThemeConfig.

---

## Contract 004: Runtime Events

**Rules (must never break):**

1. **Strictly Infrastructure.** Runtime Events carry ONLY infrastructure
   facts: Health, Metrics, Trace.
2. **NEVER Domain logic.** A Runtime Event MUST NOT carry, imply, or trigger
   business/domain logic. It describes HOW the infrastructure behaves, never
   WHAT the business did.

---

## Contract 005: Application Events

**Rules (must never break):**

1. **Strictly Business.** Application Events carry ONLY business facts:
   Publish, Update, Webhook, Notification.
2. **NEVER Runtime logic.** An Application Event MUST NOT carry, imply, or
   trigger runtime/infrastructure logic. It describes WHAT happened in the
   business, never HOW the infrastructure behaves.

---

## Contract 006: The Golden Journey

**Rules (must never break):**

1. The E2E sequence MUST always pass:
   `Create → Edit → Undo → Redo → Publish → Release → Serve → 304 → Rollback`.
2. It is the **ultimate regression test**. Any change to the platform that
   breaks the Golden Journey is a breaking change and MUST be rejected.
3. The Golden Journey proves the integrity of the entire pipeline end-to-end.
   It is the final gate before any release.

---

## Change Policy (Plugin Era)

This policy governs how the frozen contracts may evolve as the Developer
Platform (Phase 13) introduces plugins.

### MINOR Changes

- MUST be strictly backward compatible.
- Existing consumers MUST continue to function without modification.
- No new required fields on existing contracts.
- No removal or renaming of existing fields.
- No change to the meaning of existing fields.

### MAJOR Changes

- **Requires an ADR.** A MAJOR change MUST be ratified via a new Architecture
  Decision Record before implementation.
- **Requires a Migration strategy.** A MAJOR change MUST ship a migration
  strategy that converts existing artifacts to the new contract.
- **Requires an update to the Compatibility Matrix.** A MAJOR change MUST
  update the Compatibility Matrix so that plugins can be re-validated against
  the new contract version.

---

## Enforcement

- **Contract 001–005** are enforced by the CI Architecture Guard (Import
  Boundaries, Immutability, Registry Compliance).
- **Contract 006** is enforced by the Golden Journey E2E test suite
  (`scripts/golden-journey-e2e.ts`).
- **Change Policy** is enforced by the ADR process and the Compatibility
  Matrix schema (`src/lib/compatibility-matrix/`).

A contract is broken the moment any rule is violated. A broken contract is a
blocking defect and MUST be fixed before any further work proceeds.
