\# Development Guide

Version 1.0



Project



Site Builder CMS



\---



\# 1. Purpose



This document defines the official development order.



Every implementation must follow this sequence.



Do not implement later features

before completing earlier phases.



\---



\# 2. Development Principles



Build from foundation to features.



Never skip dependencies.



Every phase must be functional

before moving to the next.



\---



\# 3. Phase 1



Project Setup



Tasks



Initialize Next.js



Configure TypeScript



Configure Tailwind CSS



Install shadcn/ui



Configure ESLint



Configure Prettier



Configure Environment Variables



Create Folder Structure



Completion Criteria



Project builds successfully.



\---



\# 4. Phase 2



Authentication



Tasks



Google OAuth



Session Management



Protected Routes



Current User



Logout



Newsletter Consent



Completion Criteria



Users can securely log in.



\---



\# 5. Phase 3



Database



Tasks



Cloudflare D1



Users Table



Sites Table



Sessions Table



Deployment Table



Activity Logs



Completion Criteria



Database schema deployed.



\---



\# 6. Phase 4



Site Management



Tasks



Create Site



Edit Site



Delete Site



Site Settings



Logo



Favicon



Completion Criteria



Users can manage websites.



\---



\# 7. Phase 5



Content Management



Tasks



Posts



Pages



Drafts



Publishing



Slug Generation



Markdown Generation



Completion Criteria



Content can be created and published.



\---



\# 8. Phase 6



Media Library



Tasks



Upload



Compression



WebP



Cloudflare R2



Search



Delete



Completion Criteria



Images are stored in R2.



\---



\# 9. Phase 7



Theme



Tasks



Theme Settings



Typography



Colors



Navigation



Footer



Completion Criteria



Website appearance configurable.



\---



\# 10. Phase 8



SEO



Tasks



Meta



Open Graph



Twitter Card



Schema



Robots



Completion Criteria



SEO fully configurable.



\---



\# 11. Phase 9



Deployment



Tasks



Git Commit



Git Push



Cloudflare Build



Deployment History



Rollback



Completion Criteria



Automatic deployment works.



\---



\# 12. Phase 10



AI



Tasks



Gemini Integration



Generate



Rewrite



Translate



Summarize



Completion Criteria



AI assistant operational.



\---



\# 13. Phase 11



Domain



Tasks



Connect Domain



DNS Validation



SSL Verification



Completion Criteria



Custom domains supported.



\---



\# 14. Testing



Every phase requires



Unit Test



Integration Test



Manual Test



Regression Test



\---



\# 15. Documentation



Every completed phase must update



PRD



Architecture



Database Schema



API Specification



Feature Specification



\---



\# 16. Release Policy



Development



↓



Testing



↓



Staging



↓



Production



No feature is released

without testing.



\---



\# 17. Final Goal



The project progresses

through stable, incremental phases.



Every phase must remain

deployable,

testable,

and documented.



End of Document.

