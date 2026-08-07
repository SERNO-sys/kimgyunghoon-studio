# Phase 08 --- Validation Engine

Version: 1.0 (Draft)

## Status

Design Only.

------------------------------------------------------------------------

## Purpose

Validate every ThemeConfig before it reaches the Renderer.

The Renderer must never repair invalid data.

------------------------------------------------------------------------

## Core Principle

Decision Engine

↓

Recipe Engine

↓

Validation Engine

↓

ThemeConfig (Validated)

↓

Renderer

------------------------------------------------------------------------

## Responsibilities

The Validation Engine shall:

-   Validate schema
-   Validate references
-   Validate compatibility
-   Detect duplicates
-   Detect missing requirements
-   Perform safe auto-corrections when possible
-   Reject unrecoverable configurations

------------------------------------------------------------------------

## Validation Categories

### Structure

-   Missing fields
-   Invalid schema version
-   Empty collections

### Navigation

-   Duplicate pages
-   Invalid page IDs
-   Broken page references

### Sections

-   Duplicate sections
-   Invalid section IDs
-   Missing required sections
-   Unsupported section types

### Theme

-   Invalid skin
-   Invalid skeleton
-   Invalid typography
-   Invalid layout combinations

### Content

-   Missing required content
-   Broken asset references
-   Invalid CTA bindings

------------------------------------------------------------------------

## Auto-Correction Policy

Allowed:

-   Remove duplicate entries
-   Normalize IDs
-   Restore default optional values

Not Allowed:

-   Guess business intent
-   Invent missing pages
-   Rewrite business content

If correction changes intent, reject.

------------------------------------------------------------------------

## Validation Result

Each validation returns:

-   status
-   warnings
-   errors
-   corrections
-   final ThemeConfig

------------------------------------------------------------------------

## Extensibility

Every validator is pluggable.

Future validators may be added without modifying existing validators.

------------------------------------------------------------------------

## Definition of Done

-   Validation pipeline complete
-   Cross-reference validation
-   Safe correction strategy
-   Structured validation report
-   Renderer receives only validated ThemeConfig

------------------------------------------------------------------------

## Handoff to Phase 09

Validated ThemeConfig is ready for simulation, testing and production
verification.
