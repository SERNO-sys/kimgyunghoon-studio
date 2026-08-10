# AWIE V2 Brain — Step 06
## Recipe Capability Audit & Universal HOW Gap Analysis

**Status:** AUDIT COMPLETE (no production behavior changed)
**Scope:** Existing V2.6 HOW layer only. No new recipes, no new UI components, no Renderer/ThemeConfig changes, no AI #2, no ContentPlan, no Fact Validator, no autobuild migration.
**Method:** READ → ANALYZE → REPORT.

---

## 1. Executive Summary

The V2.6 Recipe layer is **industry-keyed, not capability-keyed**. Its selection
entry point (`RecipeRegistry.match(industryId)` + `RecipeSelector.select(profile)`)
requires an `IndustryProfile` and filters recipes by `supportedIndustries`. The
Brain's `DecisionPlan` is deliberately **industry-agnostic** (semantic
capabilities only). This is the single deepest structural mismatch between the
Brain (WHAT) and the V2.6 Recipe layer (HOW).

The three observed verdicts (Bakery INCOMPATIBLE, Jazz Pianist COMPATIBLE, B2B
Security INCOMPATIBLE) are **not** caused by missing industry templates. They are
caused by three concrete, universal HOW-layer gaps:

1. **No trust-without-evidence primitive.** The only trust feature is
   `testimonials`, which implies fabricated customer data. There is no way to
   express trust from verified credentials/guarantees without inventing evidence.
2. **No generic collection primitive.** `menu`/`gallery` are product/portfolio
   oriented. A service business (B2B) cannot express "collection of offerings"
   without product semantics.
3. **No generic conversion primitive.** `purchase` has no dedicated feature
   (only `menu`); `contact` exists but is inquiry-oriented. There is no
   industry-independent conversion/CTA primitive.

These are **universal HOW primitives**, not industry templates. They must be
defined by presentation/assembly capability independent of industry.

---

## 2. Existing Recipe Inventory Inspected

| Asset | File | Role |
|---|---|---|
| `RecipeBlueprint` | `src/lib/recipe-engine/types.ts` | Modular blueprint: `supportedIndustries`, `presentation`, `content`, `strategy`, `assets`, `mapping` |
| `Feature` / `FeatureId` | `src/lib/recipe-engine/types.ts` | Semantic feature vocabulary: `menu, reservation, address, hours, contact, gallery, testimonials, team, blog, faq` |
| `RecipeRegistry` | `src/lib/recipe-engine/registry.ts` | Pure storage; `match(industryId)` filters by `supportedIndustries` |
| `RecipeSelector` | `src/lib/recipe-engine/selector.ts` | Scores recipes against `IndustryProfile` via `CapabilityCoverageRule` + `RequirementCoverageRule` |
| `RecipeMerger` | `src/lib/recipe-engine/merger.ts` | Resolves features from industry profile; delegates section construction to `SectionMapper`; emits `ThemeConfig` |
| `SectionMapper` | `src/lib/recipe-engine/section-mapper.ts` | Feature → ThemeConfig section translation; injects default sections for unmapped requirements |
| `PriorityResolver` | `src/lib/recipe-engine/priority-resolver.ts` | 5-step priority: user > brief > industry > recipe > system |
| `MODERN_BISTRO_RECIPE` | `src/lib/recipe-engine/mocks.ts` | Only concrete recipe; `supportedIndustries: ['restaurant']` |
| `IndustryProfile` | `src/lib/industry-registry/types.ts` | Capability/requirement/constraint model (industry-keyed) |
| `RecipeBridge` | `src/lib/brain/recipe-bridge.ts` | Brain-side compatibility evaluator (Step 05) |

---

## 3. Asset Classification (KEEP / EXTEND / ADAPT / RETIRE)

| Asset | Verdict | Reason |
|---|---|---|
| `RecipeBlueprint` | **KEEP** | Correct modular shape; ThemeConfig is SSOT; recommendations-only. Do not rewrite. |
| `Feature` vocabulary | **EXTEND (future)** | Currently 10 features. Missing universal primitives (trust-without-evidence, generic collection, generic conversion). Extension must be additive and industry-independent. |
| `RecipeRegistry` | **KEEP** | Pure storage. No change needed. |
| `RecipeSelector` | **ADAPT (bridge-side)** | It is industry-keyed. The Brain cannot invoke it with a `DecisionPlan`. The `RecipeBridge` (Step 05) already provides the capability-keyed selection path. Do not rewrite the selector; the bridge is the adaptation layer. |
| `RecipeMerger` | **KEEP** | Correctly blind to UI; delegates to SectionMapper. No change in this step. |
| `SectionMapper` | **KEEP** | Correct feature→section translation. No change in this step. |
| `PriorityResolver` | **KEEP** | Correct policy object. No change. |
| `MODERN_BISTRO_RECIPE` | **KEEP** | Reference recipe. Not industry-specific expansion. |
| `IndustryProfile` | **KEEP** | Industry-keyed by design; not a Brain concern. |
| `RecipeBridge` | **KEEP** | The Step 05 adaptation. It carries the compatibility vocabulary and state preservation that V2.6 cannot express natively. |

**No V2.6 asset was modified in this step.** The audit found no compatibility gap
that required a tiny change to expose an already-existing capability.

---

## 4. Gap Matrix (semantic DecisionPlan requirement vs. current Recipe capability)

Legend — Compatible?:
- **YES** = an existing Recipe feature can express the meaning under the required semantic constraints.
- **NO** = no existing feature can express the meaning without violating constraints or fabricating data.
- **PARTIAL** = expressible only under narrow conditions (e.g. concrete records present).

| Capability | Current V2.6 Recipe support | Compatible? | Required semantic constraints | Missing HOW capability | Existing asset that could satisfy it | Verdict |
|---|---|---|---|---|---|---|
| **DISCOVERY** | `menu`, `gallery`, `blog` | **PARTIAL** | Must not imply product semantics for service businesses | Generic collection/narrative presentation | `menu`/`gallery`/`blog` (product/portfolio oriented) | **EXTEND** |
| **PURCHASE** (records exist) | `menu` (purchasable items) | **YES** | Concrete product records present | — | `menu` | **KEEP** |
| **PURCHASE** (records do NOT exist / GENERIC) | `menu` (empty section) | **NO** | Must not fabricate records | Generic conversion primitive that does not require records | none | **NEW** |
| **BOOKING** | `reservation` | **YES** | Booking/appointment intent | — | `reservation` | **KEEP** |
| **INQUIRY** | `contact` | **YES** | Inquiry intent | — | `contact` | **KEEP** |
| **LEAD CAPTURE** | `contact` (form) | **YES** | Lead capture intent | — | `contact` | **KEEP** |
| **LOCATION** | `address` | **YES** | Physical-location info | — | `address` | **KEEP** |
| **TRUST** (verified evidence present) | `testimonials` | **YES** | Verified testimonial/review evidence exists | — | `testimonials` | **KEEP** |
| **TRUST** (no fabricated evidence) | `testimonials` only | **NO** | Must not require testimonial/review/logo/case-study/credential unless verified | Trust/evidence presentation decoupled from fabricated data | none | **NEW** |

---

## 5. GENERIC State Test

**Finding:** The V2.6 Recipe layer has **no native GENERIC concept.**

- `RecipeMerger.resolveFeatures` materializes a feature section whenever
  `profile.capabilities[cap] === true`. It does not distinguish "concrete data
  present" from "business meaning clear but data insufficient."
- `SectionMapper` emits a section with `content: {}` (empty) for an enabled
  feature. It will happily emit an empty `menu` section for a GENERIC `purchase`.
- The `RecipeBridge` (Step 05) is the only place that enforces the GENERIC
  constraint, via the declarative `requiresConcreteRecords` profile. It correctly
  marks a recipe INCOMPATIBLE for a GENERIC capability that requires concrete
  records.

**Conclusion:** Compatibility for GENERIC is enforced **only at the bridge**, not
by the Recipe layer. The V2.6 layer cannot express "this is generic; do not
fabricate." This is a real HOW-layer gap. The bridge does **not** weaken
DecisionPlan constraints to make a recipe pass — it reports INCOMPATIBLE.

---

## 6. DORMANT State Test

**Finding:** The V2.6 Recipe layer has **no native DORMANT concept.**

- The merger materializes any enabled feature. There is no "preserve as dormant"
  path in the Recipe layer.
- The `RecipeBridge.preserveStates` records DORMANT as metadata for downstream
  layers. The bridge correctly returns COMPATIBLE for DORMANT (it must not be
  rendered as active content) and does **not** activate it.

**Conclusion:** DORMANT is preserved only as bridge metadata. The Recipe layer
cannot honor it natively. No CMS activation was implemented (per scope).

---

## 7. TRUST Test

**Finding:** Trust presentation is **coupled to `testimonials`**, which implies
fabricated customer data.

- The only trust feature is `testimonials`. There is no feature for trust from
  verified credentials, certifications, guarantees, or "trust without
  testimonials."
- The `RecipeBridge` maps `trust → ['testimonials']`. A recipe that maps
  `testimonials` can express ACTIVE trust **only if** the DecisionPlan has
  corresponding verified evidence. The bridge does not invent evidence.
- A recipe that does **not** map `testimonials` (e.g. `MODERN_BISTRO_RECIPE`)
  is INCOMPATIBLE for ACTIVE trust.

**Conclusion:** This is a genuine HOW-layer compatibility gap. The Recipe layer
cannot express trust without coupling to a specific evidence type. This is
reported, not solved by inventing evidence.

---

## 8. No Capability Expansion by Recipe — Verification

Verified against the real implementation:

- `RecipeRegistry`: storage only; cannot add/remove capabilities.
- `RecipeSelector`: scores only; cannot mutate a plan.
- `RecipeMerger`: resolves features from the industry profile; never adds a
  capability, never converts a state, never resurrects DROP.
- `SectionMapper`: translates features to sections; never invents evidence or
  facts.
- `RecipeBridge`: never mutates the `DecisionPlan`; never adds a capability;
  never converts GENERIC→ACTIVE or DORMANT→ACTIVE; never resurrects DROP.

**Conclusion:** The Recipe layer is an implementation layer, not a decision
layer. The boundary holds.

---

## 9. Universal HOW Primitive Classification

For each missing concept, classification per the Step 06 rubric
(A = already supported, B = supported through composition, C = missing but
requires a universal HOW primitive, D = actually a semantic Brain problem,
E = unnecessary abstraction):

| Concept | Classification | Rationale |
|---|---|---|
| Collection presentation | **C** | `menu`/`gallery` are product/portfolio oriented. A generic, industry-independent collection primitive is missing. |
| Narrative presentation | **C** | `blog` is content-oriented. A generic positioning/narrative primitive is missing. |
| Contact/inquiry presentation | **A** | `contact` fully supports inquiry and lead capture. |
| Location presentation | **A** | `address` fully supports physical-location info. |
| Trust/evidence presentation | **C** | Only `testimonials` exists; it couples trust to fabricated data. A trust-without-evidence primitive is missing. |
| Schedule presentation | **B** | `hours` (opening hours) + `reservation` (booking) cover schedule via composition. |
| Conversion presentation | **C** | `purchase` has no dedicated feature; `contact` is inquiry-oriented. A generic conversion/CTA primitive is missing. |

**No concept was classified D or E.** All gaps are genuine universal HOW
primitives, not semantic Brain problems and not unnecessary abstractions.

---

## 10. Root-Cause Analysis of the Three Verdicts

### 10.1 Bakery → INCOMPATIBLE
A bakery `DecisionPlan` typically includes `discovery` (ACTIVE), `purchase`
(ACTIVE or GENERIC), `location`, `trust`, `inquiry`. The only recipe
(`MODERN_BISTRO_RECIPE`) maps `menu, reservation, address, hours, contact` but
**not** `testimonials`. Therefore:
- `trust` (ACTIVE) → INCOMPATIBLE (no `testimonials` feature).
- `purchase` (GENERIC) → INCOMPATIBLE if the bridge profile declares it requires
  concrete records (menu implies product records).
- `discovery` via `menu` is expressible, but the overall verdict is INCOMPATIBLE
  because any single INCOMPATIBLE capability fails the plan.

### 10.2 Jazz Pianist → COMPATIBLE
A jazz pianist `DecisionPlan` maps cleanly onto the features `MODERN_BISTRO_RECIPE`
provides: `discovery`→`menu`/`gallery`, `booking`→`reservation`, `inquiry`→`contact`,
`location`→`address`. It does **not** require `trust` (no `testimonials` needed)
and does not require `purchase` with concrete records. Every capability is
expressible under its state → COMPATIBLE.

### 10.3 B2B Security Consulting → INCOMPATIBLE
A B2B security consulting `DecisionPlan` typically includes `trust` (ACTIVE) and
`discovery` for a **service** offering. `MODERN_BISTRO_RECIPE`:
- does **not** map `testimonials` → `trust` (ACTIVE) INCOMPATIBLE.
- `discovery` via `menu` is semantically wrong for a service business (menu is
  product-oriented) → the generic collection gap.
- `lead_capture`/`inquiry` via `contact` is expressible, but the overall verdict
  is INCOMPATIBLE.

---

## 11. Universal HOW Gaps (consolidated)

1. **Trust/evidence presentation** — trust cannot be expressed without coupling
   to fabricated testimonial data. Requires a universal trust primitive that
   renders only verified evidence (or a trust placeholder that does not invent
   facts).
2. **Generic collection presentation** — no industry-independent way to present
   "a collection of offerings" for service businesses.
3. **Generic conversion presentation** — no industry-independent conversion/CTA
   primitive; `purchase` is only expressible via product-oriented `menu`.
4. **GENERIC/DORMANT state honoring** — the Recipe layer has no native concept of
   GENERIC or DORMANT; these are preserved only as bridge metadata.

---

## 12. Industry-Specific Implementation Risks

- **Risk 1 — Industry→recipe coupling.** The V2.6 selector is industry-keyed.
  If Step 07 naively adds recipes per industry (bakery, musician, security), it
  would reintroduce the exact industry→recipe mapping the architecture forbids.
- **Risk 2 — Trust fabrication.** Any recipe that renders `testimonials` without
  verified evidence would manufacture trust. This must be prevented at the
  bridge/recipe boundary.
- **Risk 3 — GENERIC weakening.** If a recipe is made "compatible" by weakening
  the DecisionPlan's GENERIC constraint (e.g. treating GENERIC purchase as
  ACTIVE), the semantic meaning is corrupted. Compatibility must be based on
  actual semantic constraints.
- **Risk 4 — DORMANT activation.** A recipe that materializes a DORMANT
  capability as active content would violate the state contract.

---

## 13. Recommendation for Step 07

1. **Do NOT create industry recipes.** The three test businesses are validation
   scenarios, not architectural categories.
2. **Introduce universal HOW primitives** (trust-without-evidence, generic
   collection, generic conversion) as **additive `Feature` extensions** in the
   V2.6 Recipe vocabulary — defined by presentation/assembly capability,
   independent of industry.
3. **Keep the `RecipeBridge` as the compatibility boundary.** It already enforces
   GENERIC/DORMANT/DROP semantics and never mutates the DecisionPlan.
4. **Add a native GENERIC/DORMANT honoring path** in the Recipe layer (or keep it
   as bridge metadata) so the Recipe layer does not fabricate content for
   GENERIC capabilities and does not activate DORMANT capabilities.
5. **Decouple trust from fabricated evidence.** A trust primitive must render
   only verified evidence; otherwise it must render a non-fabricating placeholder.
6. **Do not weaken DecisionPlan constraints** to make a recipe pass.

---

## 14. Test Requirement

Re-ran the full Brain test suite (Steps 01–05) and the full TypeScript compiler.
No production behavior changed in this step.

- Step 01 tests (`scripts/brain-contracts-test.ts`)
- Step 02 tests (`scripts/brain-capability-vocabulary-test.ts`)
- Step 03 tests (`scripts/brain-decision-engine-test.ts`)
- Step 04 tests (`scripts/brain-decision-planner-test.ts`)
- Step 05 tests (`scripts/brain-recipe-bridge-test.ts`)
- Full TypeScript compiler (`tsc --noEmit`)

All passed. No V2.6 asset was modified.

---

## 15. STOP

This is the end of Step 06. The audit is complete. No new industry recipes, no
new UI components, no Renderer/ThemeConfig changes, no AI #2, no ContentPlan, no
Fact Validator, and no production autobuild migration were implemented.

The Lead Architect now has an accurate account of what the existing V2.6 body can
and cannot do. Awaiting the next implementation order.
