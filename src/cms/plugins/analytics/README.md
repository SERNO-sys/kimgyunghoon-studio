# Analytics Plugin — Capability Contract

**Phase 15.7 · AWIE V2 CMS Core**

The Analytics Plugin is a **DOMAIN FEATURE**, not an architectural exception.
It contributes through the **EXISTING generic `FeatureRecord<TConfig>`
contract** and is consumed by the **UNMODIFIED `DefaultCompositionService`**.
It does NOT create new SPIs, new Readers, or new Composition logic. It does
NOT bypass the Composer.

---

## Level-A Constitutional Rule: Observation Without Influence

> **"ThemeConfig contains only deterministic presentation contracts. Any live,
> user-specific, transactional, observational, or mutable state belongs to the
> Application layer."**

For Analytics, the core rule is **OBSERVATION WITHOUT INFLUENCE**. Analytics is
**OUTBOUND-ONLY**: it observes and reports; it NEVER influences composition.

### Consent UI vs. Consent State

- The plugin contributes the **Consent Banner UI config**.
- It MUST **NOT** contribute the **Consent State** (User Accepted/Rejected).

### Experiment Definition vs. Assignment

- The plugin contributes **Experiment Definitions** (e.g., A/B test setups).
- It MUST **NOT** contribute the **Experiment Assignment** (Variant A/B).
- The Composer and `CompositionIdentity` remain **completely blind** to which
  variant a user sees.

### Event Schema vs. Results

- The plugin contributes **Event Definitions** (PageView, Purchase).
- It MUST **NOT** track live results or revenue within the CMS core.

### No New Core Logic

- Do **NOT** create new Readers or SPIs. Use the existing generic
  `FeatureRecord<TConfig>`.

---

## Contributes (✓)

| Capability | Channel | Notes |
| --- | --- | --- |
| **Tracking Config** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static `trackingIds`. Identifies tracking destinations. NOT live tracking state. |
| **Consent UI** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static `consentBannerStyle`. Configures the banner UI. NOT consent state. |
| **Event Schema** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static `eventSchemas` (PageView, Purchase). Describes event shape. NOT results. |
| **Experiment Definitions** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static `experimentDefinitions` (A/B setups). NOT assignments. |

## Excludes (✗)

| Capability | Reason |
| --- | --- |
| **Consent State** (`consentState`, `consentAccepted`) | Live user state. Application-layer hydration. |
| **Visitor Session** (`visitorSession`, `sessionId`) | Live observational state. Application-layer. |
| **Experiment Assignment** (`currentVariant`, `assignedVariant`) | The Composer is blind to which variant a user sees. |
| **Analytics Results** (`revenue`, `pageViews`, `conversions`) | Live results. NEVER tracked in the CMS core. |

---

## Contribution Flow

```
AnalyticsPluginConfig ──► FeatureRecord<AnalyticsPluginConfig>
                                │
                                └─ config ──► ThemeConfig.resources.settings
                                │
                                ▼
        UNMODIFIED DefaultCompositionService (SOLE ORCHESTRATOR)
```

The Analytics Plugin **NEVER produces a `ThemeConfig`**. It only contributes
passive, strongly-typed domain data through the existing contract. This keeps
the Runtime pure (ADR-008): the Runtime renders what the `ThemeConfig`
describes; it NEVER resolves, edits, composes, validates, or decides on live,
observational, or mutable state.
