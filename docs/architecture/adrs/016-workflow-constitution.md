# ADR-016: Development Workflow Constitution

- **Status:** FROZEN
- **Date:** 2026-08-07
- **Applies to:** Every Phase from Phase 17.9 onward (including heavy OSS integrations in Phase 18: Lexical, DnD Kit, etc.)

## Context

As AWIE V2 transitions from "designing the architecture" to "building the product," the CTO and Architect elevate the development process into a permanent, codified constitution. This prevents premature implementation, dead-code accumulation, and binding the engine to unmaintained OSS.

## Decision

### 1. The State Rule (FROZEN)

> **"Derived data is not state. Do not store what can be derived."**

- AWIE favors **NO STATE** over Minimal State.
- Only **true persistent, shared client state** justifies a store (e.g. Selection, Autosave buffer).
- Data that is a pure function of an existing response (e.g. `canUndo`/`canRedo` from a mutation result) MUST be derived, never stored.

### 2. Operational Risk in OSS Survey (FROZEN)

Every OSS Survey MUST now explicitly evaluate and report **Operational Risk**:

1. **Bundle Size & Tree-shaking capability**
2. **SSR / React 19 Compatibility**
3. **Maintenance Frequency & Community Health** (Stars, Last Commit/Release)
4. **License Compatibility**
5. **Migration/Removal Cost**

### 3. The 7-Step Phase Pipeline (FROZEN)

Every Phase MUST execute strictly in this order. **Never jump to implementation.**

1. **Reality Check** — Analyze existing codebase / dead code.
2. **Architecture Review** — Align with the Constitution.
3. **OSS Survey** — Including Operational Risk.
4. **Constitution Check** — Verify Buy Before Build & Exit Strategy.
5. **Implementation** — Write code.
6. **Code Review** — Leader/CTO approval.
7. **Merge**

## Consequences

- No dependency is introduced without a documented one-week exit strategy.
- No derived value is stored in a store.
- No phase begins implementation before steps 1–4 are approved.
- The Core (Composition, ThemeConfig, Hydration, Command Model) remains frozen; everything else adapts.

## Exit Strategy

This ADR is process, not product. It can be amended only by a new ADR approved by the CTO. It introduces no runtime dependency and no Core coupling.
