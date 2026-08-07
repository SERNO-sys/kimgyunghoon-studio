# ADR 003 — SSOT ThemeConfig

> **Status:** Accepted
> **Date:** 2026-08-05
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 10.5 — Architecture Freeze

---

## Context

The renderer needs a single, authoritative description of what to render. Two structural options were considered:

1. **A nested object tree.** A deeply nested structure where pages contain sections, sections contain components, and components contain their own styling. This mirrors the visual hierarchy but is hard to validate, hard to index, and hard to version.
2. **A flat, immutable data structure.** A top-level object with flat arrays (`pages`, `sections`, `assets`, `skins`, `typographies`, `layouts`, `componentMappings`). Referential integrity is expressed through ids, not nesting.

## Decision

ThemeConfig is a **flat, immutable data structure** — the **Single Source of Truth (SSOT)** for rendering.

- Pages, sections, assets, skins, typographies, layouts, and componentMappings are **flat arrays**.
- Cross-references are expressed through **stable ids**, not object nesting.
- The structure is **immutable**: the renderer never mutates it.
- The renderer reads **only** ThemeConfig and never reconstructs business meaning.

### Consequences

**Positive:**
- **O(1) resolution.** Flat arrays are indexed into `ResourceMap` (a `ReadonlyMap` keyed by id). All lookups are O(1) map lookups, never `Array.find()`.
- **Validatable.** A dedicated `ThemeValidator` can check referential integrity (every section id exists, every layout id exists) without traversing a deep tree.
- **Serializable & versionable.** A flat structure is trivially serialized to JSON, diffed, and versioned.
- **Business-agnostic.** The flat structure carries no business semantics — it is pure presentation data.

**Negative:**
- Referential integrity must be maintained manually (via ids) rather than guaranteed by nesting.
- The flat structure is less "obvious" to read than a nested tree.

**Trade-off:** We accept manual id management in exchange for O(1) resolution, robust validation, and clean versioning.

## Alternatives Considered

1. **Nested object tree.** Rejected: hard to validate, hard to index (requires deep traversal), hard to version, and encourages business logic to leak into the structure.
2. **Renderer builds its own structure.** Rejected: violates the SSOT principle; the renderer must consume a pre-built, validated config.

## Compliance

Enforced by the AWIE Runtime Constitution (Article III). ThemeConfig is the ONLY source of truth. Validation lives in a dedicated `ThemeValidator` outside the engine. The engine NEVER validates, NEVER resolves routes, and NEVER builds its own ResourceMap.
