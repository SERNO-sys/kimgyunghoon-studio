# Phase 01 --- AI Engine Architecture

Version: 1.0 (Draft)

## Purpose

Build AWIE's provider-independent AI infrastructure.

This phase creates infrastructure only. No Question Engine, Industry
Registry, or business logic belongs here.

------------------------------------------------------------------------

## Goal

Create a reusable AI Engine that can support:

-   Gemini
-   Claude
-   OpenAI
-   DeepSeek
-   OpenRouter
-   Future providers

Business logic must never depend on a provider.

------------------------------------------------------------------------

## Principles

-   Provider Independent
-   Structured Generation First
-   ThemeConfig-safe
-   Extensible
-   Observable
-   Testable

------------------------------------------------------------------------

## Target Architecture

User Request

↓

Prompt Builder

↓

AI Engine

↓

Provider Adapter

↓

Structured Generation

↓

Sanitization

↓

Validation

↓

Usage / Cost Tracking

↓

Telemetry

↓

Result

------------------------------------------------------------------------

## Responsibilities

### AI Engine

-   Orchestrates generation
-   Selects provider
-   Runs retry policy
-   Applies sanitization
-   Performs validation
-   Returns structured result

### Provider Adapter

-   One adapter per provider
-   Common interface
-   No business logic

### Prompt Builder

-   Builds prompts from higher-level engines
-   No provider-specific formatting outside adapters

### Sanitizer

-   Removes markdown fences
-   Repairs safe JSON issues
-   Rejects invalid payloads

### Validator

-   Schema validation
-   Cross-field validation
-   Reject invalid output

### Telemetry

-   Latency
-   Token usage
-   Cost
-   Retries
-   Errors

------------------------------------------------------------------------

## Suggested Folder Structure

src/lib/ai/

-   engine/
-   providers/
-   prompts/
-   validation/
-   sanitize/
-   retry/
-   telemetry/
-   usage/
-   cost/
-   streaming/
-   compatibility/

------------------------------------------------------------------------

## Definition of Done

-   Provider abstraction completed
-   Unified AI interface completed
-   Structured generation implemented
-   Shared sanitizer implemented
-   Shared validator implemented
-   Retry strategy implemented
-   Usage tracking implemented
-   Cost tracking implemented
-   Telemetry hooks implemented
-   No provider-specific logic outside adapters

------------------------------------------------------------------------

## Out of Scope

Do NOT implement:

-   Question Engine
-   BusinessBrief
-   Industry Registry
-   Recipe Engine
-   ThemeConfig Decision Logic

These belong to later phases.

------------------------------------------------------------------------

## Handoff to Phase 02

Output of Phase 01:

A provider-independent AI infrastructure ready to generate validated
structured data for ThemeConfig.
