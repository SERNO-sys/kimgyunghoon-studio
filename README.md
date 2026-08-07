# AWIE V2

> **AI Website Intelligence Engine V2**  
> An enterprise-grade, deterministic website generation platform that separates **AI decision-making** from **presentation rendering**.

---

# Why AWIE?

Most AI website builders generate HTML directly from an LLM response.

AWIE takes a fundamentally different approach.

Instead of letting AI produce the final website, AI only makes **decisions**.

Those decisions are transformed into a deterministic, framework-agnostic rendering pipeline.

```
AI
    ↓
Business Brief
    ↓
Recipe Engine
    ↓
ThemeConfig (SSOT)
    ↓
Runtime Services
    ↓
Theme Engine
    ↓
RenderNode
    ↓
Framework Adapter
    ↓
React / Vue / Future Frameworks
```

This architecture makes the platform deterministic, testable, extensible, and maintainable.

---

# Core Principles

The platform is built on several immutable architectural contracts.

## AI decides. Runtime executes.

AI never renders UI.

The Runtime never makes business decisions.

Each layer has exactly one responsibility.

## ThemeConfig is the SSOT

Every rendering operation originates from a single immutable ThemeConfig.

No duplicated presentation state exists anywhere in the pipeline.

## Deterministic Rendering

Identical ThemeConfig input always produces identical RenderNode output.

Rendering is completely framework-agnostic.

## Zero Core Imports

Plugins never import internal Core modules.

External developers interact only through the public SDK.

The Core remains frozen and protected.

---

# Architecture Overview

```
Decision Layer
    │
    ▼
Business Brief
    │
    ▼
Recipe Engine
    │
    ▼
ThemeConfig
    │
    ▼
Runtime Services
    │
    ▼
Theme Engine
    │
    ▼
RenderNode
    │
    ▼
React / Vue / Future Adapters
```

---

# Runtime Platform

The Runtime is independent platform infrastructure.

Included services:

- Asset Resolver
- Localization
- Cache
- Media Pipeline
- SEO
- Accessibility
- Analytics
- Performance
- Security
- Feature Flags
- Migration Pipeline
- Diagnostics
- Metrics
- Circuit Breaker
- Retry Policy

None of these services contain business logic.

---

# CMS Platform

The Application Layer provides:

- Multi-tenant Project Model
- Command Pattern
- Immutable Patch Pipeline
- Undo / Redo
- Audit Trail
- Version Snapshots
- Publish / Release separation
- Release Pointer
- Application Event Bus

Editing and rendering remain completely separated.

---

# Delivery Layer

Released content is served through immutable snapshots.

Features include:

- Conditional GET
- ETag
- HTTP 304
- Release Pointer
- Rollback by pointer update
- CDN-friendly caching

---

# Plugin Platform

AWIE V2 is designed to be extended without modifying the Core.

```
Plugin
    ↓
SDK
    ↓
Plugin Loader
    ↓
Core Registry
```

Plugins:

- never import Core modules
- receive a scoped PluginContext
- pass SemVer validation
- pass Compatibility Matrix validation
- cannot overwrite existing resources

---

# CLI

The Developer Platform includes a dependency-free CLI.

```
awie create
awie validate
awie build
awie install
awie doctor
```

The CLI performs offline validation before a plugin is allowed into the platform.

---

# Reference Products

The engine has been validated with production-style reference websites:

- Flower Shop
- Restaurant
- Law Firm
- Church
- Photographer
- Hospital

All products are rendered through the Plugin System without modifying the frozen Core.

---

# Verification

Current platform verification includes:

- TypeScript strict compilation
- Architecture Guard
- Golden Journey End-to-End validation
- Runtime tests
- CMS tests
- Plugin SDK tests
- Reference Product tests

The engine is validated through hundreds of automated assertions across the complete pipeline.

---

# Developer Philosophy

**Core owns contracts. Plugins own implementations.**

The Core Platform is frozen.

Future functionality is expected to be added through plugins, application features, and product modules—not by modifying the engine itself.

---

# Roadmap

## v2.0

Core Platform

- AI Decision Engine
- Runtime Platform
- CMS Platform
- Delivery Layer
- Plugin SDK
- Plugin Loader
- CLI Toolkit
- Official Business Components
- Reference Products

## Future

The engine is complete.

Future releases focus on product capabilities:

- Global localization
- Commerce
- Booking
- CRM
- Music
- Marketing Automation
- AI Workflow
- Product Templates

---

Built for deterministic AI-driven website generation.