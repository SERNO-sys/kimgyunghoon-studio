# AWIE V2 - Architecture Freeze v2
Version: 2.0
Status: FROZEN
Purpose: Bootstrap any new AI session.
Audience: DeepSeek / GPT / Gemini

---

# 0. Mission

AWIE V2 is NOT a website builder.

It is a deterministic website generation framework.

Our IP is NOT React.

Our IP is NOT State Management.

Our IP is NOT Forms.

Our IP is NOT HTTP.

Our IP is the deterministic pipeline.

Everything else should be WRAPPED.

---

# 1. Core Constitution (FROZEN)

The following architecture is permanently frozen.

AI
↓

BusinessBrief

↓

Recipe Engine

↓

ThemeConfig (Immutable SSOT)

↓

Runtime Overlay

↓

RenderNode

↓

Framework Adapter

↓

React / Vue / Future Frameworks

ThemeConfig MUST NEVER mutate.

Runtime MUST NEVER mutate ThemeConfig.

Plugins MUST NEVER modify Core.

---

# 2. Constitutional Rules

Always preserve:

✓ Runtime Purity

✓ Dumb Client

✓ Immutable ThemeConfig

✓ Deterministic Rendering

✓ Zero Core Imports

✓ Buy Before Build

✓ Thin Wrapper

✓ Replaceability

✓ Exit Strategy

If a feature violates one rule,

STOP.

Redesign first.

---

# 3. Buy Before Build

Every new capability follows:

Research

↓

OSS Survey

↓

Business Evaluation

↓

WRAP

↓

Exit Strategy

↓

Architecture Review

↓

Implementation

Never build infrastructure already solved by OSS.

Examples

State

→ Zustand

Async

→ TanStack Query

Forms

→ React Hook Form

Validation

→ Zod

Rich Text

→ Lexical

UI

→ Shadcn

Only AWIE IP is BUILD.

---

# 4. What AWIE Owns

BUILD

Composition

ThemeConfig

Hydration Engine

Composition Identity

Semantic Component Identity

Permission Snapshot Mapping

Command Model

Patch Pipeline

Everything else

WRAP

---

# 5. Runtime Rules

Runtime NEVER

- composes

- renders

- prices

- books

- authenticates

- evaluates permissions

- calculates inventory

Runtime consumes snapshots only.

---

# 6. Permission Rule

Application

↓

PermissionSnapshot

↓

HydrationEngine

↓

HydrationInstruction

↓

UI

HydrationEngine NEVER evaluates permission logic.

---

# 7. Client Actions

ThemeConfig contains

actionId only.

Runtime

↓

Map(actionId)

↓

Application

↓

TanStack Mutation

Runtime never executes business logic.

---

# 8. Plugin Rules

Plugins contribute data.

Plugins NEVER

compose ThemeConfig

modify Core

import Core

Runtime owns hydration.

Composer owns composition.

---

# 9. Editor Constitution

Editor is Dumb Client.

Editor NEVER edits ThemeConfig.

Editor emits only

EditorCommandPayload

↓

ServerSideOrchestrator

↓

Patch Pipeline

↓

NEW ThemeConfig

---

# 10. Selection Constitution (NEW)

Selection Identity is permanently frozen.

Selection MUST use

Semantic Component Identity.

NEVER use

DOM id

React key

RenderNode id

Tree index

Runtime UUID

Example

hero

hero.title

hero.button

pricing.card.buy

These identities MUST survive

framework swap

hydration

rerender

drag/drop

history

undo/redo

---

# 11. Selection Snapshot

Selection is exposed ONLY through

SelectionSnapshot

Example

SelectionSnapshot

selectedComponentId

breadcrumb

sectionId

renderNodeId

UI never shares component objects.

Canvas

Tree

Inspector

TopBar

consume snapshots only.

---

# 12. DOM Rule

DOM is implementation detail.

DOM MUST NEVER become architecture.

Allowed

data-awie-id="hero.title"

Forbidden

data-node-id

data-react-id

DOM id as identity

---

# 13. Selection Events

SelectionChanged

SelectionCleared

SelectionHovered

SelectionFocused

UI components never manipulate each other directly.

Everything flows through events.

---

# 14. Editor UX Contract

Frozen.

Layout

Top Bar

Left Tree

Canvas

Right Inspector

Bottom Status

Inline Editing

Lexical

UI

Shadcn

History

Local

Lexical

Global

CommandHistoryManager

Autosave

Draft only

Never creates Versions

Silent UX

---

# 15. Current Project State

Completed

✓ Phase 14

Core Constitution

✓ Phase 15

Plugin Platform

✓ Phase 16

Application Runtime

✓ Phase 17.1

Editor Shell

Current

Phase 17.2

Selection Model

Next

Bidirectional Selection

Inspector Binding

Drag & Drop

Inline Editing

Command Generation

Autosave

History

Publish Workflow

---

# 16. CTO Rules

Before coding ask

Can this be WRAPPED?

Can this be replaced in one week?

Does this touch ThemeConfig?

Does this leak business logic?

Does this modify Core?

If yes,

STOP.

Redesign.

---

# 17. AI Rules

Never assume architecture.

If a constitutional rule is missing,

ASK.

Do not invent new abstractions.

Prefer existing boundaries.

Core is frozen.

Everything else adapts.

---

END