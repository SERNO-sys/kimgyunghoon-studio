# ADR 006 — The Delivery Layer (ETag, must-revalidate, Conditional GET)

> **Status:** Accepted
> **Date:** 2026-08-06
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 12.6 — Core Freeze & ADR Lock (Pre-Phase 13)

---

## Context

The Delivery Layer serves the Released (Live) `VersionSnapshot` to the public
via a **stable URL** (`/serve`). A stable URL is NOT immutable — its content
changes whenever a new snapshot is Released.

Two caching strategies were considered:

1. **Expiration-based caching.** `Cache-Control: public, max-age=N`. The client
   caches for a fixed duration and does not revalidate until the TTL expires.
   This risks serving stale content for up to N seconds after a Release.
2. **Validation-based caching.** `Cache-Control: public, max-age=0,
   must-revalidate` with an **ETag**. The client revalidates on every request;
   the body is only transferred when the snapshot changes (via Conditional GET /
   `If-None-Match` → 304).

## Decision

**The Delivery Layer uses VALIDATION-BASED caching.**

- The stable URL (`/serve`) is served with:
  `Cache-Control: public, max-age=0, must-revalidate`
- An **ETag** is derived from the snapshot version: `ETag: "<version>"`.
- The route handles **Conditional GET**: if the client's `If-None-Match` matches
  the current ETag, it returns **304 Not Modified** (no body).
- `immutable` is reserved **strictly** for versioned snapshot URLs
  (e.g. `/serve?v={snapshotId}`), which are truly immutable.

### The Serve Flow

```
GET /serve?page=home
  -> Query Current Release Pointer
  -> Resolve pointer to Released VersionSnapshot
  -> Compute ETag = "<snapshot.version>"
  -> If If-None-Match == ETag: return 304 (no body)
  -> Else: render RenderNode via GoldenPathOrchestrator
           return 200 with RenderNode + ETag + must-revalidate
```

### Consequences

**Positive:**
- **No stale content.** Every request revalidates; a Release is immediately
  visible to the next request.
- **Bandwidth savings.** The body is only transferred when the snapshot changes;
  unchanged requests return 304.
- **Correct semantics.** `must-revalidate` prevents stale caches from serving
  content after a Release.

**Negative:**
- **Round-trip per request.** Every request incurs a revalidation round-trip
  (though 304 responses are cheap).
- **ETag must be stable.** The ETag must be derived from the snapshot version,
  not from a timestamp, to avoid spurious cache misses.

**Trade-off:** We accept a revalidation round-trip in exchange for zero stale
content and correct Release semantics.

## Alternatives Considered

1. **Expiration-based caching (max-age=N).** Rejected: risks serving stale
   content for up to N seconds after a Release.
2. **No caching.** Rejected: wasteful; every request re-renders and transfers
   the full body.
3. **`immutable` on the stable URL.** Rejected: the stable URL is NOT immutable;
   `immutable` is reserved for versioned snapshot URLs only.

## Compliance

Enforced by the Serve Delivery API route
(`src/app/api/cms/projects/[id]/serve/route.ts`) and the **Golden Journey** E2E
test (Steps 6 and 8). The Golden Journey proves that a Conditional GET with a
matching ETag returns 304, and that a changed snapshot returns 200 with a new
ETag.
