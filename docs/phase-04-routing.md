# Phase 04 --- Tenant Routing & Multi-site Architecture

Version: 1.0 (Draft)

## Purpose

Provide a scalable routing architecture for unlimited tenant websites.

------------------------------------------------------------------------

## Objectives

-   Support subdomains
-   Support custom domains
-   Support preview mode
-   Support future multi-page sites
-   Keep routing independent from business logic

------------------------------------------------------------------------

## Core Principle

Routing resolves tenants.

ThemeConfig resolves websites.

Renderer resolves UI.

------------------------------------------------------------------------

## Routing Flow

Request

↓

Middleware

↓

Tenant Resolver

↓

ThemeConfig Loader

↓

Renderer

↓

Website

------------------------------------------------------------------------

## Responsibilities

### Middleware

-   Resolve tenant
-   Resolve preview
-   Resolve custom domain
-   Reject invalid tenants

### Tenant Resolver

-   Load tenant metadata
-   Resolve active domain
-   Resolve publication state

### Renderer

-   Never resolve tenants
-   Never resolve domains

------------------------------------------------------------------------

## Preview Mode

Requirements:

-   Draft rendering
-   Secure preview
-   No public indexing
-   Preview bypasses publication checks

------------------------------------------------------------------------

## Custom Domains

Support:

-   Subdomains
-   Custom domains
-   Future domain providers

No hardcoded domains.

------------------------------------------------------------------------

## URL Strategy

Support:

-   /
-   Dynamic pages
-   SPA anchors
-   Future multi-page expansion

------------------------------------------------------------------------

## Validation

Validate:

-   Tenant exists
-   Domain mapping
-   ThemeConfig exists
-   Published state
-   Preview permission

------------------------------------------------------------------------

## Definition of Done

-   Generic middleware
-   Tenant resolver
-   Preview routing
-   Custom domain support
-   No hardcoded routing rules

------------------------------------------------------------------------

## Out of Scope

-   Question Engine
-   Industry Registry

------------------------------------------------------------------------

## Handoff to Phase 05

Routing is complete and ready for intelligent website generation.
