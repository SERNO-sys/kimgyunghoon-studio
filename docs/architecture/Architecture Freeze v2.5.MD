# 🧊 Product Freeze v2.5 — Security Hardening (Phase J.3)

> **Status:** FROZEN
> **Version:** 2.5.0
> **Phase:** J.3 — Security Hardening
> **Scope:** Secures the perimeter of the Delivery Layer and Publishing Pipeline as **boundaries**, not scattered inside business logic.

---

## 1. Frozen Architectural Decisions (핵심 동결 자산)

### 1.1 Security Is a Boundary, Not Scattered Logic
All security controls (guards, validators, masking, rate limiting) live in **ONE module** — `src/lib/security`. Core services (`PublishOrchestrator`, `DeploymentService`, `ProjectRepository`, `VersionRollbackService`, `VersionHistoryService`) MUST NOT contain inline security checks. This is enforced by a constitutional test that scans core files for `@/lib/security` imports, `getSessionFromRequest`, and `ownerId !==` patterns.

### 1.2 No New Authentication System (Buy Before Build)
The boundary **REUSES** the existing Google OAuth session mechanism. It does NOT invent a new auth system. Authentication remains the existing session architecture; Phase J.3 hardens the enforcement boundary around it.

### 1.3 Thin Wrapper
Each guard is a thin, replaceable adapter. Guards never render, never decide, and never touch ThemeConfig.

### 1.4 Runtime Purity
The security boundary NEVER touches ThemeConfig and NEVER evaluates business meaning. It is pure Application-layer enforcement.

### 1.5 Secret Masking Choke Point
API keys, cookies, tokens, and signatures are NEVER printed in logs. Masking is enforced at **two** choke points:
1. `DeliveryLogger` masks at its emit boundary.
2. `AuditLogRepository.record()` masks at its **write boundary** (the FINAL defense line) — every record's `detail` field is passed through `maskSecrets` before persistence, regardless of what a caller passes in.

### 1.6 Failed-Attempt Audit
Unauthorized / failed attempts are recorded to the durable Audit Repository (`AuditLogRepository`), preserving WHO/WHAT/WHEN for non-repudiation.

---

## 2. Security Boundary Inventory

| Control | Boundary | Location |
|---------|----------|----------|
| Input Validation | `isValidId` / `isValidVersion` / `isValidPageId` | `src/lib/security` |
| Secret Masking | `maskSecrets` (recursive, immutable) | `src/lib/security` |
| Rate Limiting | `RateLimitGuard` / `publishRateLimit` | `src/lib/security` |
| Audit Trail | `AuditLogRepository.record()` (masked write) | `src/lib/editor-integration/server/audit-log-repository.ts` |
| Structured Logging | `DeliveryLogger` (masked emit) | `src/lib/editor-integration/server/delivery-logger.ts` |

---

## 3. Rate Limiting Reality (Accurate Claims)

**IMPORTANT — Do not overstate rate limiting.**

The `RateLimitGuard` is an **in-memory, per-isolate, atomic-within-isolate** boundary. It is a **PREPARATION** boundary, not a durable cross-isolate enforcement mechanism.

- ✅ **Atomic within an isolate:** The guard's counter increment is synchronous and atomic within a single isolate's event loop.
- ✅ **Isolated per actor+route key:** `allow('u1:publish')` does not affect `u2:publish` or `u1:rollback`.
- ✅ **Thin, replaceable adapter:** It is a boundary, not scattered logic.
- ⚠️ **NOT durable across isolates:** Cloudflare Workers are stateless and multi-isolate. In-memory counters do NOT persist across isolates or edge locations. This guard is NOT a substitute for a platform-level rate limiter (e.g., Cloudflare WAF / Rate Limiting Rules).

**Constitutional claim (accurate):** Rate limiting is implemented as a **preparation boundary** — the guard exists, is atomic within an isolate, and is wired as a thin adapter. It is NOT claimed to be a durable cross-isolate enforcement mechanism. A platform-level rate limiter (Cloudflare Rate Limiting Rules) is the recommended production enforcement layer and is OUT OF SCOPE for this phase.

---

## 4. Security Verification Evidence

The following constitutional tests MUST pass before Phase J.3 is considered complete:

| Test | Verifies | Status |
|------|----------|--------|
| `scripts/security-constitution.test.ts` | Input validation, secret masking, rate-limit boundary (preparation), no inline security in core | ✅ PASS (4/4) |
| `scripts/security-verification.test.ts` | Real attack vectors: rate-limit atomicity, health/metrics consumers, serve SSRF reality, deep secret masking, audit repo nested masking, input validation attack vectors, core purity | ✅ PASS (7/7) |
| `scripts/observability-constitution.test.ts` | Durable audit trail, structured logging, delivery metrics, orchestrator instrumentation, thin-wrapper health/metrics routes | ✅ PASS (15/15) |
| `tsc --noEmit` | Type safety across the project | ✅ PASS (exit 0) |

---

## 5. Constitutional Compliance

- ✅ **Dumb Client** — Security is enforced server-side; the client never enforces security.
- ✅ **Thin Wrapper** — Guards are thin, replaceable adapters.
- ✅ **Runtime Purity** — Core services contain no inline security checks.
- ✅ **Buy Before Build** — No new authentication system; reuses existing Google OAuth session.
- ✅ **No Core Mutation** — The core architecture is unchanged; security is added as boundaries.
- ✅ **Product Freeze v2.4 honored** — Unified Publishing Pipeline, D1 Repository Adapter, Repository Port Freeze, HMR-safe SSOT Singleton all preserved.

---

## 6. Milestone J Candidates (Next Steps)

1. **Platform-level Rate Limiting** — Wire Cloudflare Rate Limiting Rules (or equivalent) for durable cross-isolate enforcement of publish/rollback endpoints.
2. **Tenant Isolation Enforcement** — Apply the ownership guard (`ownerId` check) as a boundary guard on all project-scoped admin routes.
3. **Route-Level Guard Wiring** — Attach the session/ownership guards to the remaining unprotected admin routes as thin middleware.
4. **Secret Rotation & Key Management** — Move long-lived secrets to a managed secret store.

---

## 7. Ratification

- **Author:** Lead Engineer (AWIE V2)
- **Reviewer:** CTO / Architecture Review Board / Freeze Guardian
- **Status:** ⏳ Pending CTO Ratification
- **Next Step:** Upon ratification, Git Tag this state before proceeding to Milestone J candidates.

*This Freeze takes effect immediately upon CTO ratification.*
