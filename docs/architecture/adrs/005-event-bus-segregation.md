# ADR 005 — Event Bus Segregation (Application vs. Runtime)

> **Status:** Accepted
> **Date:** 2026-08-06
> **Deciders:** CTO, Lead Engineer (AWIE V2)
> **Phase:** 12.6 — Core Freeze & ADR Lock (Pre-Phase 13)

---

## Context

The platform has two fundamentally different kinds of events:

1. **Application (Domain) Events** — business domain facts that have already
   occurred (ProjectPublished, HeadingUpdated). They are emitted AFTER a Command
   executes successfully. They describe WHAT happened in the business.
2. **Runtime (Infrastructure) Events** — observability facts about the runtime
   (cache:miss, service:initialized, asset:resolved). They describe HOW the
   infrastructure is behaving.

Two structural options were considered:

1. **A single unified event bus.** One bus carries both domain and
   infrastructure events. Subscribers filter by event type.
2. **Two strictly segregated buses.** An `ApplicationEventBus` for domain events
   and a `RuntimeEventBus` for infrastructure events. They are never merged.

## Decision

**The two event buses are STRICTLY SEGREGATED.**

- **ApplicationEventBus** (`src/lib/cms-core/events/`) carries `DomainEvent`
  envelopes. The Application Layer is the SOLE publisher.
- **RuntimeEventBus** (`src/lib/runtime-services/core/`) carries `RuntimeEvent`
  envelopes. Runtime services emit; diagnostics subscribe.

They are **NEVER merged or reused interchangeably.**

### The DomainEvent Envelope (Application)

```ts
interface DomainEvent {
  readonly eventId: CmsId;
  readonly eventType: string;      // e.g. "project.published"
  readonly occurredAt: Timestamp;
  readonly aggregateId: CmsId;
  readonly payload: Readonly<unknown>;
  readonly metadata: Readonly<Record<string, unknown>>;
}
```

### The RuntimeEvent Envelope (Runtime)

```ts
interface RuntimeEvent {
  readonly name: RuntimeEventName; // e.g. "cache:miss"
  readonly serviceId: string;
  readonly timestamp: string;
  readonly payload?: Record<string, unknown>;
}
```

### Fail-Open Design

Both buses are **fail-open** (never fail-fast): a throwing subscriber is
isolated and does not prevent other subscribers from receiving the event. This
guarantees that a misbehaving diagnostic (Runtime) or side-effect handler
(Application) can never break the core pipeline.

### Deep-Freeze

Both buses **deep-freeze** every event before delivery. Subscribers receive a
read-only view and cannot corrupt the event for other subscribers or the
emitting service.

### Consequences

**Positive:**
- **Clear ownership.** Domain events are business; runtime events are
  infrastructure. No ambiguity about which layer owns an event.
- **Isolation.** A runtime diagnostic failure cannot affect business event
  delivery, and vice versa.
- **Enforces the Golden Rule.** The CMS (Application) handles Users, Commands,
  Audits, Permissions; the Core Engine (Runtime) handles Rendering, Caching,
  Executing. Segregated buses make this boundary structural.

**Negative:**
- **Two buses to maintain.** Slightly more infrastructure than a single bus.
- **No cross-layer correlation by default.** Correlation must be explicit via
  metadata (e.g. a shared trace id).

**Trade-off:** We accept two buses in exchange for strict layer ownership,
isolation, and structural enforcement of the Golden Rule.

## Alternatives Considered

1. **Single unified bus.** Rejected: blurs the Application/Runtime boundary and
   risks business logic leaking into infrastructure (and vice versa).
2. **Shared bus with type filtering.** Rejected: filtering is fragile and does
   not structurally prevent cross-layer coupling.

## Compliance

Enforced by the CI Architecture Guard (Import Boundaries) and the two distinct
event modules. The **Golden Journey** E2E test exercises the Application
(DomainEvent) path; the RuntimeEventBus is exercised by the runtime-services
test suite. The two buses are never imported interchangeably.
