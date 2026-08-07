# Phase 01 - AI Engine Specification

> Status: CTO Specification (Authoritative)

## 1. Purpose

This document defines the implementation specification for the AWIE AI
Engine.

This is infrastructure only.

This phase MUST NOT contain:

-   Question Engine
-   BusinessBrief
-   Industry Registry
-   Recipe Engine
-   ThemeConfig business decisions

------------------------------------------------------------------------

## 2. Problem Statement

Current issues identified during architecture audit:

-   AI provider is tightly coupled.
-   JSON parsing logic is duplicated.
-   Retry logic is duplicated.
-   Validation is inconsistent.
-   Prompt generation is mixed with business logic.

This phase removes those problems.

------------------------------------------------------------------------

## 3. Architecture Principles

1.  Provider Independence
2.  Structured Generation First
3.  Single AI Entry Point
4.  Shared Validation
5.  Shared Sanitization
6.  Observable Infrastructure
7.  Testable Components

------------------------------------------------------------------------

## 4. Target Architecture

User Request ↓ Prompt Builder ↓ AI Engine ↓ Provider Adapter ↓
Structured Output ↓ Sanitizer ↓ Validator ↓ Telemetry ↓ Result

------------------------------------------------------------------------

## 5. Folder Structure

``` text
src/lib/ai/
    engine/
    providers/
    prompts/
    sanitize/
    validation/
    retry/
    telemetry/
    usage/
    cost/
    compatibility/
    streaming/
```

------------------------------------------------------------------------

## 6. Responsibilities

### AI Engine

-   orchestration
-   lifecycle
-   retry
-   validation
-   provider selection

### Provider Adapter

One adapter per provider.

Never contain business logic.

### Prompt Builder

Converts higher-level requests into provider requests.

### Sanitizer

Normalizes raw provider output.

### Validator

Accepts only schema-valid output.

### Telemetry

Tracks latency, tokens, failures and provider metrics.

------------------------------------------------------------------------

## 7. Implementation Plan

### Step 1

Create folder structure.

Create interfaces only.

No implementations.

### Step 2

Implement provider abstraction.

### Step 3

Implement Prompt Builder.

### Step 4

Implement Sanitizer.

### Step 5

Implement Validator.

### Step 6

Implement Retry Strategy.

### Step 7

Implement Usage & Cost Tracking.

### Step 8

Implement Telemetry.

### Step 9

Integrate AI Engine.

### Step 10

Run validation and tests.

------------------------------------------------------------------------

## 8. Definition of Done

-   Provider independent
-   Shared AI pipeline
-   Shared validation
-   Shared sanitizer
-   Retry implemented
-   Usage tracking implemented
-   Cost tracking implemented
-   Telemetry implemented
-   Ready for Phase 02

------------------------------------------------------------------------

## 9. Instructions for CLINE / DeepSeek

Read this specification before coding.

Implement ONE step only.

Stop after completing the current step.

Do not continue automatically.

Wait for approval before the next step.
