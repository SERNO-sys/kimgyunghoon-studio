# Commerce Plugin — Capability Contract

**Phase 15.5 · AWIE V2 CMS Core**

The Commerce Plugin is a **DOMAIN FEATURE**, not an architectural exception. It
contributes through the **EXISTING generic `FeatureRecord<TConfig>` contract**
and is consumed by the **UNMODIFIED `DefaultCompositionService`**. It does NOT
create new SPIs, new Readers, or new Composition logic. It does NOT bypass the
Composer.

---

## Level-A Constitutional Rule: Commercial State Separation

> **PRICE IS LIVE BUSINESS STATE.**

`ThemeConfig` is a **STATIC execution contract** for rendering the UI (product
gallery, review widgets, variant selectors). It is **NOT** a live-state
container.

Pricing is **dynamic** — resolved per user, per locale, per promotion — and is
fetched by the **Application layer AFTER the initial render**. It is **NEVER**
part of the `ThemeConfig`.

---

## Contributes (✓)

| Capability | Channel | Notes |
| --- | --- | --- |
| **Catalog UI configuration** | `FeatureRecord.config` → `ThemeConfig.resources.settings` | Static presentation config: `productGalleryStyle`, `enableReviews`, `maxVariantsDisplay`. |
| **Product JSON-LD (static structure)** | `FeatureRecord.seo.jsonLd` → `ThemeConfig.seo.jsonLd` | Only the **static structural parts** of the Product schema. Dynamic live pricing for SEO is handled by the Application layer, NOT the CMS Core. |
| **Assets** | (via existing asset pipeline) | Static media referenced by the catalog UI. |

## Excludes (✗)

| Capability | Reason |
| --- | --- |
| **Pricing** (`price`, `priceRange`, `currency`) | Dynamic — per user / locale / promotion. Resolved by the Application layer after render. |
| **Inventory** (`stock`, `quantity`, `availability`) | Mutable availability. Live business state. |
| **Promotions / Discounts** | Dynamic commercial state. |
| **Cart** (`cart`, `cartItems`) | Transaction state. |
| **Checkout / Payment** (`checkout`, `paymentStatus`) | Transaction state. |

---

## Contribution Flow

```
CommercePluginConfig ──► FeatureRecord<CommercePluginConfig>
                              │
                              ├─ config ──► ThemeConfig.resources.settings
                              └─ seo.jsonLd ──► ThemeConfig.seo.jsonLd (Product)
                              │
                              ▼
              UNMODIFIED DefaultCompositionService (SOLE ORCHESTRATOR)
```

The Commerce Plugin **NEVER produces a `ThemeConfig`**. It only contributes
passive, strongly-typed domain data through the existing contract. This keeps
the Runtime pure (ADR-008): the Runtime renders what the `ThemeConfig`
describes; it NEVER resolves, edits, composes, validates, or decides on live
commercial state.
