# Phase 03 --- Generic Renderer

Version: 1.0 (Draft)

## Purpose

Build a completely generic renderer.

The renderer must never contain business logic.

------------------------------------------------------------------------

## Core Principle

AI decides.

ThemeConfig describes.

Renderer renders.

Nothing else.

------------------------------------------------------------------------

## Responsibilities

Renderer may:

-   Read ThemeConfig
-   Resolve registered components
-   Render pages
-   Render sections
-   Apply themes
-   Apply layouts

Renderer must never:

-   Detect industries
-   Infer layouts
-   Choose menus
-   Create content
-   Generate defaults based on business type

------------------------------------------------------------------------

## Architecture

ThemeConfig

↓

Section Registry

↓

Component Resolver

↓

Renderer

↓

Website

------------------------------------------------------------------------

## Section Registry

Every section type is registered.

Example:

-   hero
-   about
-   services
-   gallery
-   pricing
-   faq
-   contact

Adding a new section must only require:

1.  Create component
2.  Register component

Renderer code remains unchanged.

------------------------------------------------------------------------

## Rendering Pipeline

ThemeConfig

↓

Page

↓

Section

↓

Component

↓

Rendered UI

------------------------------------------------------------------------

## Navigation

Navigation comes only from:

ThemeConfig.pages

No hardcoded menus.

No inferred routes.

------------------------------------------------------------------------

## Theme System

Renderer consumes:

-   skin
-   skeleton
-   typography
-   colors

Renderer never selects them.

------------------------------------------------------------------------

## Generic Fallback

Unknown section:

↓

GenericSection

↓

Safe rendering

↓

Validation warning

Never crash.

------------------------------------------------------------------------

## Definition of Done

-   Registry-based renderer
-   No business switch statements
-   No hardcoded page mappings
-   Dynamic navigation
-   Generic fallback
-   ThemeConfig-only rendering

------------------------------------------------------------------------

## Out of Scope

-   Question Engine
-   Industry Registry
-   Recipe Engine

------------------------------------------------------------------------

## Handoff to Phase 04

Renderer is generic and ready for multi-tenant routing.
