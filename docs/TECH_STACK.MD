\# Technology Stack

Version 1.0



Project



Site Builder CMS



\---



\# 1. Purpose



This document defines the official technology stack

used by Site Builder CMS.



All implementation must follow this stack.



Do not replace technologies without updating this document.



\---



\# 2. Design Goals



Modern



Simple



Fast



Edge First



Cloud Native



Serverless



Low Maintenance



Scalable



Cost Efficient



\---



\# 3. Frontend



Framework



Next.js 15 (App Router)



Language



TypeScript



UI



React 19



Styling



Tailwind CSS



Component Library



shadcn/ui



Icons



Lucide React



Animation



Framer Motion



\---



\# 4. Backend



API



Next.js Route Handlers



Runtime



Cloudflare Workers Compatible



Authentication



Google OAuth



Validation



Zod



\---



\# 5. Database



Database



Cloudflare D1



Purpose



Users



Sites



Sessions



Deployments



Logs



Newsletter



No content is stored in database.



\---



\# 6. Storage



Cloudflare R2



Purpose



Images



Media Files



Generated Assets



\---



\# 7. Content



GitHub Repository



Markdown



JSON



Git Version Control



GitHub API



Markdown remains

the source of truth.



\---



\# 8. Deployment



Hosting



Cloudflare Pages



Automatic Deployment



Git Push



↓



Cloudflare Build



↓



Production



\---



\# 9. AI Provider



Primary



Google Gemini



Purpose



Writing



SEO



Translation



Summarization



Future



Multi Provider Support



\---



\# 10. Authentication



Google OAuth



Session Authentication



Ownership Validation



Password Login



Not Supported



\---



\# 11. State Management



Global State



Zustand



Server State



React Query (TanStack Query)



Temporary State



React State



\---



\# 12. Forms



React Hook Form



Validation



Zod



\---



\# 13. Image Processing



Resize



Compression



WebP Conversion



Upload



Cloudflare R2



\---



\# 14. Editor



Markdown Editor



Tiptap



Future



Visual Builder



\---



\# 15. Logging



Application Logs



Cloudflare



Activity Logs



Cloudflare D1



\---



\# 16. Security



Environment Variables



Cloudflare Secrets



HTTPS Only



Server-side Tokens



Never expose



GitHub Token



Cloudflare Token



Gemini API Key



\---



\# 17. Development Tools



Package Manager



pnpm



Lint



ESLint



Formatter



Prettier



Git



GitHub



\---



\# 18. Browser Support



Latest Chrome



Latest Edge



Latest Safari



Latest Firefox



Responsive Design



Desktop First



Tablet



Mobile



\---



\# 19. Future Technologies



Cloudflare Queues



Cloudflare KV



Cloudflare Analytics



Cloudflare Images



Cloudflare AI



without changing business logic.



\---



\# 20. Technology Rules



Always use



TypeScript



Never use



JavaScript



Always use



Server Actions or Route Handlers



Never call infrastructure directly

from React Components.



Business logic belongs

inside Services.



\---



\# 21. Architecture Compatibility



This technology stack follows



PRD



Architecture



Database Schema



API Specification



No implementation may violate

these documents.



\---



\# 22. Final Summary



Frontend



Next.js



Backend



Next.js Route Handlers



Database



Cloudflare D1



Storage



Cloudflare R2



Content



GitHub



Deployment



Cloudflare Pages



Authentication



Google OAuth



AI



Gemini



The technology stack is optimized

for serverless deployment,

low maintenance,

and future scalability.



End of Document.

