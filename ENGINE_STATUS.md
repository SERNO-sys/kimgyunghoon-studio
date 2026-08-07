# AWIE V2 — ENGINE STATUS

> **STATUS: FROZEN — v2.0.0**
>
> The AWIE V2 Engine is **FROZEN**. No further engine modifications are permitted
> without explicit CTO approval. The engine is now a **dependency**, never a
> target. All forward work happens **ON TOP** of the frozen engine.

---

## 1. FROZEN DECLARATION

The AWIE V2 Engine is declared **FROZEN** at **v2.0.0**.

This is the **Architecture Freeze** (Phase 10.5) made operational. The engine's
core pipeline, constitution, and ADRs are **RATIFIED** and **IMMUTABLE**.

### What "FROZEN" means

- The engine **does not change**.
- The engine is consumed as a **dependency**.
- New capabilities are built **on top** of the engine (products, plugins, SDK
  extensions, adapters).
- Any engine change requires an **explicit CTO override** and a new ADR.

### What is frozen

| Layer | Status |
|-------|--------|
| AI Infrastructure (Phase 01) | ✅ FROZEN |
| ThemeConfig SSOT (Phase 02) | ✅ FROZEN |
| Generic Renderer (Phase 03) | ✅ FROZEN |
| Tenant Routing (Phase 04) | ✅ FROZEN |
| Question Engine (Phase 05) | ✅ FROZEN |
| Industry Registry (Phase 06) | ✅ FROZEN |
| Recipe Engine (Phase 07) | ✅ FROZEN |
| Renderer Foundation (Phase 08) | ✅ FROZEN |
| System Integration (Phase 09A) | ✅ FROZEN |
| UI Component System (Phase 09B) | ✅ FROZEN |
| Theme Ecosystem (Phase 10) | ✅ FROZEN |
| Architecture Freeze (Phase 10.5) | ✅ FROZEN |
| Runtime Services (Phase 11) | ✅ FROZEN |
| CMS Core (Phase 12) | ✅ FROZEN |
| Golden Path (Phase 12) | ✅ FROZEN |
| SDK (Phase 13) | ✅ FROZEN |
| CLI (Phase 13) | ✅ FROZEN |

---

## 2. THE FROZEN PIPELINE

```
User Input
    ↓
Question Engine
    ↓
BusinessBrief
    ↓
Industry Registry
    ↓
Recipe Engine
    ↓
ThemeConfig (SSOT)
    ↓
Theme Validator
    ↓
Theme Resource Builder
    ↓
Theme Engine
    ↓
RenderNode
    ↓
Framework Adapter
    ↓
React / Vue / ...
```

**DO NOT CHANGE THIS PIPELINE.**

---

## 3. THE CORE CONSTITUTION (IMMUTABLE)

1. **AI decides. Never renders.**
2. **ThemeConfig is the ONLY SSOT.** No duplicated state.
3. **Renderer renders. Never decides.**
4. **Industry Registry describes capabilities. Never presentation.**
5. **Recipe recommends. Never becomes ThemeConfig.**
6. **ThemeEngine only orchestrates. Never interprets business meaning.**
7. **RenderNode is framework independent.**
8. **Framework Adapters never contain business logic.**
9. **Everything uses Registry Pattern.**
10. **No business logic inside Renderer.**
11. **No Provider dependency inside Core Runtime.**
12. **All rendering must be deterministic.** Same ThemeConfig → Same RenderNode. Always.

---

## 4. THE FROZEN GOLDEN PATH

The **Golden Path** is the single, ratified end-to-end composition:

```
CMS Command (Application)
    ↓
ThemeConfig (SSOT)
    ↓
ThemeEngine (Runtime)
    ↓
RenderNode
    ↓
React Adapter (Framework)
    ↓
React UI
```

The Golden Path is **pure orchestration**. It never decides; it only wires the
existing, ratified components. It is **deterministic**: the same ThemeConfig
always produces the same RenderNode tree and the same React element tree.

---

## 5. WHAT IS BUILT ON TOP (NOT FROZEN)

The following are **products and extensions** built **on top** of the frozen
engine. They are **not** part of the engine and may evolve freely:

- **Reference Products** (`products/`) — 6 Business Reference Websites, each a
  complete ThemeConfig (the SSOT) rendered by the frozen Golden Path.
- **Plugins** (`src/plugins/`) — SDK extensions loaded at runtime.
- **SDK extensions** — renderer, theme, and component extensions.
- **CLI commands** — developer tooling that consumes the engine.

---

## 6. THE 6 REFERENCE PRODUCTS

Each Reference Product is a complete, production-ready ThemeConfig (the SSOT)
that the frozen Golden Path renders. Each is driven by a single "One-Line UX"
Golden Prompt.

| # | Product | Focus | Golden Prompt (One-Line UX) |
|---|---------|-------|------------------------------|
| 1 | **Bloom & Stem** (Flower Shop) | Visuals, Product Gallery | "Build a flower shop website that feels like walking into a sunlit greenhouse — a full-bleed hero of fresh blooms, a gallery of signature bouquets, a story section about our growers, and a contact form for custom orders." |
| 2 | **Hartwell & Associates** (Law Firm) | Trust, Typography, Contact Forms | "Build a law firm website that projects quiet authority — a restrained serif hero with a clear practice-area list, a credentials section that builds trust, and a prominent consultation request form." |
| 3 | **Ember & Oak** (Restaurant) | Menu, Location, Reservation UX | "Build a restaurant website that makes you hungry — a warm hero of the signature dish, a full menu section, our location and hours, and a one-tap reservation form." |
| 4 | **Grace Community Church** (Church) | Community, Audio/Video integration | "Build a church website that feels like a warm welcome — a hero inviting people to join us, a section for this week's sermon with audio and video, a community events list, and a way to get connected." |
| 5 | **Lena Park Photography** (Photographer) | Portfolio, High-res layouts | "Build a photographer's portfolio that lets the work speak — a full-bleed hero image, a high-resolution gallery of signature shoots, a services section, and a booking inquiry form." |
| 6 | **Mercy General Hospital** (Hospital) | Information architecture, FAQ, Booking | "Build a hospital website that is calm and easy to navigate — a clear hero with a prominent Book an appointment action, a departments overview, a reassuring FAQ, and a simple appointment booking form." |

---

## 7. VERIFICATION

The Reference Products are verified by rendering each product's ThemeConfig
through the frozen Golden Path:

```bash
npx tsx scripts/products-test.ts
```

This proves:
- **MANDATE 1:** Each product is a complete, valid ThemeConfig (the SSOT).
- **MANDATE 2:** Each product renders through the frozen Golden Path with **NO
  engine modification**. The engine is a dependency, never a target.
- **MANDATE 3:** **DETERMINISM.** The same product always produces the same
  RenderNode tree.

---

## 8. GOVERNANCE

- **Architecture Guard:** ACTIVE. Architecture rules are enforced and never
  weakened.
- **ADR:** RATIFIED. New ADRs are required for any engine change.
- **CTO Override:** The ONLY path to modify the frozen engine.

---

*AWIE V2 — Engine FROZEN at v2.0.0. Only implementations evolve. Never redesign
the platform without explicit CTO approval.*
