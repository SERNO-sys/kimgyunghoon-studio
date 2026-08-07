# Phase 05 --- Question Engine Design

Version: 1.0 (Draft)

## Status

Design Only. Implementation is intentionally postponed.

------------------------------------------------------------------------

## Purpose

Collect only the minimum information required to generate a high-quality
website.

The Question Engine never designs websites.

It builds a normalized BusinessBrief.

------------------------------------------------------------------------

## Core Philosophy

Ask less.

Learn more.

Stop as soon as enough information has been collected.

------------------------------------------------------------------------

## Pipeline

User Prompt

↓

Business Classification

↓

Information Analysis

↓

Dynamic Questions

↓

BusinessBrief

↓

Decision Engine

------------------------------------------------------------------------

## Responsibilities

-   Detect missing information
-   Avoid duplicate questions
-   Skip already answered topics
-   Ask industry-aware follow-up questions
-   Stop automatically when confidence is sufficient

------------------------------------------------------------------------

## Question Categories

1.  Business identity
2.  Goal
3.  Target audience
4.  Brand personality
5.  Core services
6.  Contact / CTA
7.  Optional preferences

------------------------------------------------------------------------

## Branching Logic

Questions depend on:

-   Industry
-   Intent
-   Missing information
-   Previous answers

No fixed questionnaire.

------------------------------------------------------------------------

## Stop Conditions

Stop asking when:

-   Required fields complete
-   Confidence threshold reached
-   Maximum question limit reached

Target: 2--5 follow-up questions.

------------------------------------------------------------------------

## BusinessBrief Schema

-   businessType
-   goals
-   audience
-   personality
-   services
-   contactPreference
-   optionalPreferences

Provider independent.

------------------------------------------------------------------------

## Validation

Reject:

-   Empty answers
-   Duplicate questions
-   Contradictory information

------------------------------------------------------------------------

## Definition of Done

-   Dynamic questioning
-   Branching logic
-   Skip logic
-   BusinessBrief generation
-   Maximum question control

------------------------------------------------------------------------

## Handoff to Phase 06

BusinessBrief becomes the only input to the Decision Engine.
