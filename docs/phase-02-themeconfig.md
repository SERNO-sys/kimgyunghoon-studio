# Phase 02 --- ThemeConfig v2

Version: 1.0 (Draft)

## Purpose

ThemeConfig becomes the Single Source of Truth (SSOT).

Nothing outside ThemeConfig may influence rendering.

------------------------------------------------------------------------

## Objectives

-   Eliminate duplicated business data
-   Remove legacy settings
-   Standardize schema
-   Prepare long-term compatibility
-   Support future migration

------------------------------------------------------------------------

## Core Principle

AI decides.

ThemeConfig stores.

Renderer renders.

------------------------------------------------------------------------

## ThemeConfig Responsibilities

-   Site metadata
-   Intent
-   Skin
-   Skeleton
-   Pages
-   Sections
-   Section content
-   Assets
-   Settings
-   Version metadata

------------------------------------------------------------------------

## Schema Goals

Every section should be self-contained.

Example concept:

sections: - id - type - content - settings

Pages reference section IDs.

Renderer never guesses relationships.

------------------------------------------------------------------------

## Validation Requirements

Validate before rendering:

-   duplicate pages
-   duplicate sections
-   invalid ids
-   invalid references
-   missing required fields
-   invalid skins
-   invalid skeletons
-   invalid layouts
-   invalid colors

Reject or safely repair when possible.

------------------------------------------------------------------------

## Versioning

Every ThemeConfig includes:

-   schemaVersion
-   createdVersion
-   migrationTarget

Older versions migrate through adapters.

Renderer supports only the current schema.

------------------------------------------------------------------------

## Migration Strategy

Legacy ThemeConfig

↓

Migration Adapter

↓

ThemeConfig v2

↓

Renderer

------------------------------------------------------------------------

## Definition of Done

-   ThemeConfig is SSOT
-   Legacy duplicated settings removed
-   Cross-reference validation exists
-   Versioning enabled
-   Migration adapter implemented
-   Renderer reads ThemeConfig only

------------------------------------------------------------------------

## Out of Scope

-   Renderer implementation
-   Question Engine
-   Industry Registry
-   Recipe Engine

These belong to later phases.

------------------------------------------------------------------------

## Handoff to Phase 03

Renderer consumes only validated ThemeConfig v2.
