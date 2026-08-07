\# AWIE MASTER DOCUMENT

Version: 1.0



\---



\# Project



AWIE (AI Website Intelligence Engine)



AWIE is NOT a website template.



AWIE is an AI Website Engine.



Its purpose is to automatically generate complete websites from a user's business description.



\---



\# Core Philosophy



Everything is data-driven.



Everything is component-driven.



ThemeConfig is the Single Source of Truth (SSOT).



Renderer never makes business decisions.



Renderer only renders ThemeConfig.



AI makes decisions.



Renderer renders.



\---



\# High Level Architecture



User



↓



Question Engine



↓



Business Brief



↓



Decision Engine



↓



Industry Registry



↓



Recipe Engine



↓



Validation Engine



↓



Content Engine



↓



Asset Engine



↓



ThemeConfig



↓



Migration Adapter



↓



Plugin Registry



↓



Renderer



↓



Website



\---



\# Responsibilities



\## Question Engine



Collect only the minimum information required.



Ask intelligent follow-up questions.



Avoid unnecessary conversation.



Generate BusinessBrief.



\---



\## Business Brief



Normalized business description.



Contains:



\- business type

\- goals

\- target audience

\- brand personality

\- optional preferences



BusinessBrief is AI-independent.



\---



\## Decision Engine



Converts BusinessBrief into design decisions.



Chooses:



\- intent

\- layout

\- navigation

\- sections

\- CTA

\- theme

\- typography



Never renders.



\---



\## Industry Registry



Contains industry knowledge.



Each industry defines:



\- intent

\- recommended pages

\- recommended sections

\- hero style

\- CTA

\- typography

\- color strategy

\- validation rules



Renderer must never contain industry knowledge.



\---



\## Recipe Engine



Reusable business recipes.



Example:



Cafe



↓



Warm



Minimal



Gallery



Instagram



Reservation



Every industry can own multiple recipes.



\---



\## Validation Engine



Checks ThemeConfig before rendering.



Must validate:



\- duplicate pages

\- duplicate sections

\- invalid ids

\- invalid layouts

\- invalid colors

\- invalid skeletons

\- invalid skins

\- menu limits

\- section limits

\- broken references



Validation should attempt safe correction where possible.



Otherwise reject.



\---



\## Content Engine



Generates website copy.



Examples:



Hero



About



Mission



Services



CTA



FAQ



Contact



\---



\## Asset Engine



Determines:



Hero image



Gallery



Icons



Patterns



Illustrations



Future providers:



Cloudflare R2



Unsplash



OpenAI Images



Flux



Midjourney



\---



\# ThemeConfig



ThemeConfig is the only renderer input.



Nothing else should influence rendering.



ThemeConfig must contain schema version.



Example:



version



intent



skin



skeleton



pages



sections



content



assets



settings



metadata



\---



\# Renderer



Renderer is completely generic.



Renderer must never contain:



business logic



industry logic



hardcoded menus



hardcoded pages



hardcoded copy



hardcoded layouts



hardcoded section mapping



Renderer reads ThemeConfig.



Nothing else.



\---



\# Plugin System



Everything should be pluggable.



Future plugins:



Industry



Section



Theme



Asset



Validation



Question



Prompt



Providers



Adding a plugin should not require renderer modification.



\---



\# AI Infrastructure



Provider independent.



Supported providers:



Gemini



Claude



OpenAI



DeepSeek



OpenRouter



Future models.



Business logic must never depend on provider.



\---



\# AI Engine



Standard interface.



Responsibilities:



Prompt Builder



Structured Generation



Streaming



Retry



Sanitization



Validation



Usage Tracking



Cost Tracking



Telemetry



Version Compatibility



\---



\# Security



Never hardcode secrets.



Use:



Environment Variables



Cloudflare Secrets



.dev.vars



Least privilege.



\---



\# Observability



Track:



Generation failures



Validation failures



JSON parse failures



Provider failures



Latency



Cost



Token usage



Retry count



\---



\# Versioning



ThemeConfig requires schema version.



Older versions migrate through adapters.



Renderer only supports current schema.



\---



\# Current Status



Completed



✔ Phase 0



\- V1 cleanup

\- dead code removal

\- mock removal

\- security improvements

\- dependency cleanup



In Progress



Phase 1



AI Infrastructure



Upcoming



Phase 2



ThemeConfig v2



Phase 3



Generic Renderer



Phase 4



Tenant Routing



Phase 5



Question Engine



Phase 6



Industry Registry



Phase 7



Recipe Engine



Phase 8



Validation Expansion



Phase 9



Simulation \& Testing



\---



\# Non-Negotiable Rules



ThemeConfig is SSOT.



Renderer never makes decisions.



Business logic never enters renderer.



Industry knowledge belongs only in Industry Registry.



Every feature must remain extensible.



Architecture is more important than shortcuts.



Design for 10 years.



\---



\# Decision Log



Decision #1



Renderer only reads ThemeConfig.



Decision #2



Question Engine is implemented only after architecture approval.



Decision #3



Industry knowledge never enters renderer.



Decision #4



Provider abstraction is mandatory.



Decision #5



Plugin architecture is preferred over branching logic.



Decision #6



Legacy V1 is permanently removed.



\---



End of Document

