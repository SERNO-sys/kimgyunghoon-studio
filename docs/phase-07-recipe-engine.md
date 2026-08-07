# Phase 07 --- Recipe Engine Design

Version: 1.0 (Draft)

## Status

Design Only.

------------------------------------------------------------------------

## Purpose

Transform Industry Registry recommendations into reusable website
recipes.

A Recipe is a reusable blueprint that converts a BusinessBrief into a
ThemeConfig.

------------------------------------------------------------------------

## Core Pipeline

BusinessBrief

↓

Decision Engine

↓

Industry Registry

↓

Recipe Engine

↓

ThemeConfig

↓

Renderer

------------------------------------------------------------------------

## Responsibilities

The Recipe Engine:

-   Selects the best recipe
-   Merges industry defaults
-   Applies user preferences
-   Resolves conflicts
-   Produces a complete ThemeConfig

It never renders UI.

------------------------------------------------------------------------

## Recipe Structure

Each recipe defines:

-   recipeId
-   supportedIndustries
-   intent
-   pages
-   sections
-   CTA strategy
-   hero strategy
-   layout
-   skin
-   skeleton
-   typography
-   assets
-   default content strategy

------------------------------------------------------------------------

## Decision Priority

1.  User requirements
2.  BusinessBrief
3.  Industry Registry
4.  Recipe defaults
5.  System defaults

Lower priorities never override higher priorities.

------------------------------------------------------------------------

## Conflict Resolution

Handle conflicts between:

-   user preference vs recipe
-   recipe vs registry
-   layout vs section compatibility
-   skin vs typography

Always produce one valid ThemeConfig.

------------------------------------------------------------------------

## Extensibility

Adding a new recipe requires:

1.  Create recipe definition
2.  Register recipe

No renderer modification.

------------------------------------------------------------------------

## Validation

Validate:

-   recipe exists
-   compatible industry
-   compatible skeleton
-   valid page structure
-   valid section structure
-   ThemeConfig completeness

------------------------------------------------------------------------

## Definition of Done

-   Recipe specification complete
-   Selection strategy defined
-   Merge strategy defined
-   Conflict resolution defined
-   Validation integrated

------------------------------------------------------------------------

## Out of Scope

-   Rendering
-   Question Engine
-   Industry implementation

------------------------------------------------------------------------

## Handoff to Phase 08

Recipe Engine outputs a complete ThemeConfig for Validation Engine
verification.
