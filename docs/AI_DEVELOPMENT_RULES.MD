\# AI Development Rules

Version 1.0



Project



Site Builder CMS



\---



\# 1. Purpose



This document defines mandatory rules

for every AI-assisted implementation.



All generated code must follow

these rules.



Do not violate architecture,

database schema,

API specification,

or technology stack.



\---



\# 2. General Principles



Always prioritize



Readability



Maintainability



Scalability



Reusability



Never optimize

at the cost of clarity.



\---



\# 3. Architecture Rules



Always follow



PRD



Architecture



Database Schema



API Specification



Technology Stack



Feature Specification



Never introduce

a new architecture.



Never bypass

existing layers.



\---



\# 4. Technology Rules



Always use



TypeScript



Next.js App Router



Cloudflare D1



Cloudflare R2



Cloudflare Pages



Tailwind CSS



shadcn/ui



Google OAuth



Gemini API



Never replace technologies

without explicit approval.



Never introduce



Firebase



Supabase



MongoDB



Bootstrap



jQuery



\---



\# 5. Service Rules



Business logic



must always live

inside Services.



Never place



Business Logic



Database Queries



API Calls



inside React Components.



\---



\# 6. Component Rules



Components



must be



Small



Reusable



Independent



Presentational



Components should not



Access database



Access GitHub



Access Cloudflare



Contain business logic



\---



\# 7. API Rules



Every endpoint must



Validate Session



Validate Ownership



Validate Input



Handle Errors



Write Logs



Return Standard Response



Never expose



Secrets



Tokens



Environment Variables



\---



\# 8. Database Rules



Always follow



DATABASE\_SCHEMA.md



Never modify tables

without updating

the schema document.



Never duplicate data.



Never store

Markdown content

inside D1.



\---



\# 9. Security Rules



Never expose



GitHub Token



Cloudflare Token



Gemini API Key



Repository Secrets



Environment Variables



Always use

server-side secrets.



\---



\# 10. Authentication Rules



Authentication



Google OAuth only.



Never implement



Email login



Password login



Anonymous login



Always validate



Session



Ownership



Permission



\---



\# 11. UI Rules



Always use



shadcn/ui



Tailwind CSS



Responsive Layout



Accessible Components



Never mix

multiple UI libraries.



\---



\# 12. Code Style



Prefer



Small Functions



Pure Functions



Meaningful Names



Composition



Avoid



Deep Nesting



Long Files



Magic Numbers



Duplicated Logic



\---



\# 13. File Rules



Maximum recommended size



Component



300 lines



Service



300 lines



Hook



200 lines



Utility



150 lines



Split files

when necessary.



\---



\# 14. Error Handling



Always



Catch Errors



Log Errors



Return User-friendly Messages



Never expose



Stack Trace



Internal Errors



\---



\# 15. Documentation Rules



Every major change



must update



Architecture



Database Schema



API Specification



Feature Specification



Task List



when applicable.



\---



\# 16. Performance Rules



Avoid



Unnecessary Re-renders



Duplicate API Calls



Large Components



Repeated Queries



Prefer



Lazy Loading



Memoization



Efficient Caching



\---



\# 17. Testing Rules



Every feature should include



Validation



Error Handling



Manual Testing



Edge Case Consideration



Do not mark

a feature complete

without testing.



\---



\# 18. AI Behavior Rules



Before generating code



Understand existing architecture.



Never rewrite

working code

without reason.



Prefer extending

existing modules.



When uncertain



Ask for clarification



instead of making assumptions.



\---



\# 19. Forbidden Actions



Never



Change architecture



Replace technology stack



Create circular dependencies



Hardcode secrets



Duplicate business logic



Access infrastructure

from UI



Skip validation



Ignore ownership



\---



\# 20. Definition of Done



A task is complete only if



Code Compiles



Lint Passes



No Type Errors



Architecture Preserved



API Rules Followed



Database Rules Followed



Responsive UI



Error Handling Included



Documentation Updated



\---



\# 21. Final Principle



The AI is an implementation assistant.



The architecture,

design decisions,

and business rules

defined by this project

always take precedence

over AI assumptions.



If a conflict exists,



follow the project documentation,

not the AI's preference.



End of Document.

