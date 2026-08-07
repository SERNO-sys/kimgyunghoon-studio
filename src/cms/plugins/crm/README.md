# CRM & Membership Plugin — Capability Contract

**Phase 15.6 · AWIE V2 CMS Core**

The CRM Plugin is a **DOMAIN FEATURE**, not an architectural exception. It
contributes through the **EXISTING generic `FeatureRecord<TConfig>` contract**
and is consumed by the **UNMODIFIED `DefaultCompositionService`**. It does NOT
create new SPIs, new Readers, or new Composition logic. It does NOT bypass the
Composer.

---

## Level-A Constitutional Rule: Presentation vs. Identity

> **"ThemeConfig defines WHAT to show, never TO WHOM, WHEN, FOR HOW MUCH, or
> IF POSSIBLE."**

`ThemeConfig` is a **STATIC, USER-AGNOSTIC execution contract**. It describes
**WHAT** UI to render. It **NEVER** encodes identity, session, permission, or
personalization.

### User-Agnostic Composition

- Do **NOT** extend `CompositionIdentity` with user segments.
- The Composer MUST remain **100% blind** to sessions, users, and permissions.

### No Protected Content in ThemeConfig

- The ThemeConfig MUST **NEVER** contain protected business content (to prevent
  HTML source leaks) or personalized data (e.g., "Hello John").
- It MAY **ONLY** contain gated UI components (e.g., `premiumArticleLayout`,
  `loginFormStyle`, `memberBadgeUI`).

### Hydration Strategy

Personalization and protected content fetching are **Application-level
hydration concerns** executed via APIs **AFTER the UI is rendered**.

---

## Contributes (✓)

| Capability | Channel | Notes |
| --- | --- | --- |
| **Auth UI Components** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static presentation config: `loginFormVariant`, `premiumBadgeStyle`, `memberLayout`. |
| **Member Layouts** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static gated UI layout config. NOT protected content. |
| **JSON-LD (Organization / ProfilePage)** | `FeatureRecord.seo.jsonLd` → `ThemeConfig.seo.jsonLd` | Static structured data describing the organization / profile page. |

## Excludes (✗)

| Capability | Reason |
| --- | --- |
| **Sessions** (`sessionToken`, `sessionId`) | Identity / session state. Application-level hydration. |
| **JWTs / Auth Tokens** | Identity / credential state. NEVER in ThemeConfig. |
| **User Profiles** (`userProfile`, `userEmail`, `userName`) | Personalized data. Application-level hydration. |
| **Protected Data** (`protectedContent`, `premiumContent`) | Would leak via HTML source. Application-level hydration. |
| **Permissions / Roles** | Access control. The Composer is blind to permissions. |
| **Personalization** ("Hello John") | Personalized data. Application-level hydration. |

---

## Contribution Flow

```
CrmPluginConfig ──► FeatureRecord<CrmPluginConfig>
                          │
                          ├─ config ──► ThemeConfig.resources.settings
                          └─ seo.jsonLd ──► ThemeConfig.seo.jsonLd (Organization/ProfilePage)
                          │
                          ▼
          UNMODIFIED DefaultCompositionService (SOLE ORCHESTRATOR)
```

The CRM Plugin **NEVER produces a `ThemeConfig`**. It only contributes passive,
strongly-typed domain data through the existing contract. This keeps the
Runtime pure (ADR-008): the Runtime renders what the `ThemeConfig` describes;
it NEVER resolves, edits, composes, validates, or decides on identity, session,
or permission state.
