\# AI Development Rules

Version: 2.0



\---



\# Purpose



This document defines the mandatory development rules for every AI agent

working on this project.



These rules override any implementation decision.



Every task must follow these rules before writing code.



\---



\# Project Philosophy



Version 1 is COMPLETE.



Version 2 is NOT a rewrite.



Version 2 is NOT a refactor.



Version 2 is an Extension Layer built on top of Version 1.



The goal is to build a CMS and Site Builder while preserving Version 1.



\---



\# Core Principles



\## Rule 1



Never recreate Version 1.



\---



\## Rule 2



Never refactor Version 1

unless the user explicitly requests it.



\---



\## Rule 3



Reuse existing components whenever possible.



Do not duplicate code.



\---



\## Rule 4



If an existing component is sufficient,



reuse it.



If not,



create a new component.



\---



\## Rule 5



Every new feature must exist independently.



Do not tightly couple Version 2 features into Version 1.



\---



\# Protected Area



The following resources are protected.



AI MUST NOT modify them.



• Existing pages



• Existing layouts



• Existing UI



• Existing components



• Existing markdown system



• Existing architecture



• Existing styles



• Existing routing



• Existing deployment configuration



Unless the user explicitly approves.



\---



\# Allowed Area



AI may create new resources only under

the following locations.



src/app/admin/



src/components/admin/



src/lib/admin/



src/server/



src/types/admin/



docs/



Additional folders require approval.



\---



\# Modification Policy



If AI believes an existing file

must be modified,



STOP.



Explain



1\. Which file



2\. Why



3\. What changes



4\. Why extension is impossible



Wait for approval.



Never modify first.



\---



\# Development Strategy



Always follow this order.



Analysis



↓



Design



↓



Documentation



↓



Implementation



↓



Testing



Never skip documentation.



\---



\# Coding Rules



Never write temporary code.



Never write placeholder implementations.



Never create duplicate utilities.



Never move existing files.



Never rename existing files.



Never change existing folder structures.



Never introduce breaking changes.



\---



\# Documentation Rules



Every new module requires



Purpose



Dependencies



Input



Output



Error Handling



Future Extension



\---



\# Task Rules



Implement only ONE phase at a time.



Wait for approval.



Never continue automatically.



\---



\# Completion Rules



Every completed phase must include



✔ Build Success



✔ Type Check



✔ Lint



✔ Documentation Updated



✔ Git Commit Suggestion



before moving to the next phase.



\---



\# Final Objective



The objective is NOT to improve Version 1.



The objective is to build a professional CMS

on top of Version 1.



Version 1 must remain stable forever.

