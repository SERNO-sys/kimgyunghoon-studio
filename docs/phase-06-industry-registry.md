# Phase 06 --- Industry Registry Design

Version: 1.0 (Draft)

## Status

Design Only.

------------------------------------------------------------------------

## Purpose

Create a data-driven Industry Registry.

The renderer must never contain industry knowledge.

------------------------------------------------------------------------

## Core Principle

BusinessBrief

↓

Decision Engine

↓

Industry Registry

↓

Recipe

↓

ThemeConfig

------------------------------------------------------------------------

## Responsibilities

The registry defines recommended:

-   Intent
-   Pages
-   Sections
-   CTA
-   Hero
-   Layout
-   Skeleton
-   Skin
-   Typography
-   Validation rules

No rendering logic.

------------------------------------------------------------------------

## Registry Structure

Each industry entry contains:

-   industryId
-   aliases
-   intent
-   recommendedPages
-   recommendedSections
-   recommendedCTA
-   heroStyle
-   layout
-   skeleton
-   skin
-   typography
-   validationProfile

------------------------------------------------------------------------

## Supported Examples

-   Cafe
-   Restaurant
-   Bakery
-   Hospital
-   Law Firm
-   Portfolio
-   Corporate
-   Education
-   Beauty
-   Fitness
-   Real Estate
-   Non-profit
-   Religious Organization

Designed for unlimited expansion.

------------------------------------------------------------------------

## Decision Rules

Registry provides recommendations.

Decision Engine may override when justified.

Renderer never overrides.

------------------------------------------------------------------------

## Validation

Check:

-   missing recipes
-   duplicate industries
-   invalid references
-   incompatible skeletons
-   unsupported sections

------------------------------------------------------------------------

## Extensibility

Adding a new industry requires:

1.  Add registry definition
2.  Optional recipe
3.  Optional validation profile

Renderer remains unchanged.

------------------------------------------------------------------------

## Definition of Done

-   Registry specification complete
-   Industry metadata standardized
-   Recommendation model defined
-   Validation profile supported

------------------------------------------------------------------------

## Handoff to Phase 07

Industry Registry supplies normalized inputs to the Recipe Engine.
