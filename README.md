# KIM GYUNG HOON STUDIO

A multi-tenant homepage SaaS platform built with Next.js (App Router), TypeScript, and Tailwind CSS. Anyone can sign up, create a personal site, connect a custom domain, and manage content from a single admin dashboard.

## Dual Architecture

The codebase is structured as a dual architecture:

- **SaaS Platform:** The platform entrypoint at `/` (when accessed via `PLATFORM_HOST`) welcomes visitors and routes authenticated users into the admin dashboard. It lives under `src/app/platform` and is served through middleware rewrites.
- **Tenant Public Sites:** Custom domains render the owner&apos;s public website. Pages in `src/app/(public)` resolve the correct `site_id` from the request domain and load site settings, theme, and published posts from the database in real time.
- **V2 Admin Dashboard:** The administration system under `/admin` provides multi-tenant content management, media library, theme system, AI writer, GitHub sync, Cloudflare deployment, custom domain management, and user/account settings.

The public tenant renderer and the admin dashboard share the same Next.js build but are isolated by route groups and middleware logic so that admin development never affects live tenant sites.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** Edge runtime for API routes
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Cloudflare D1 (with an in-memory local adapter for development)
- **Forms & Validation:** React Hook Form + Zod
- **UI Components:** Custom shadcn/ui-inspired components
- **Content:** Markdown + DB-backed posts
- **Icons:** Lucide React
- **Authentication:** Google OAuth with signed session cookies
- **Deployment:** Cloudflare Pages (Edge runtime build)

## Project Structure

- `src/app/(public)/` - Tenant public website pages (rendered on custom domains)
- `src/app/platform/` - SaaS platform landing page (rendered on `PLATFORM_HOST`)
- `src/app/admin/` - Admin dashboard pages and API routes
- `src/app/api/admin/` - Admin API route handlers
- `src/app/api/auth/` - Authentication API route handlers
- `src/middleware.ts` - Platform vs tenant routing and admin auth guard
- `src/components/admin/` - Admin dashboard components
- `src/components/ui/` - Shared UI primitives
- `src/components/layout/` - Public layout components (Header, Footer)
- `src/lib/db/` - D1 database schema, types, local adapter, and query layer
- `src/lib/admin/` - Admin domain logic
- `src/lib/ai/` - AI Writer service layer and prompt templates
- `src/lib/cloudflare/` - Cloudflare deployment services
- `src/lib/github/` - GitHub repository sync services
- `src/lib/security/` - Security utilities (file upload validation)
- `src/config/env.ts` - Centralized environment variable validation
- `content/` - Markdown content (music archive)
- `public/` - Static assets

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment variable example and fill in your values:

```bash
cp .env.example .env.local
```

At minimum, set `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the SaaS platform landing page, and [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin dashboard.

## Database

The schema is defined in `src/lib/db/schema.sql`. In production on Cloudflare Pages, bind the D1 database to the worker environment. For local development, the app ships with an in-memory adapter (`src/lib/db/memory.ts`) so you can iterate without a live D1 binding.

To switch to the real D1 binding, update `src/lib/db/client.ts` to return `getRequestContext().env.DB` (or your platform&apos;s equivalent) instead of the in-memory store.

## Multi-Tenant Routing

`src/middleware.ts` decides how each request is handled:

- `PLATFORM_HOST` (e.g. `localhost`, `kimgyunghoon.studio`): `/` renders the SaaS landing page.
- Custom domains: the middleware resolves the domain to a `site_id`, attaches `x-site-id`/`x-site-domain` headers, and `src/app/(public)` pages render that tenant&apos;s settings and posts.
- `/admin/*` always requires a valid session cookie, except `/admin/login`.

## Build

```bash
npm run build
```

This project uses the standard Next.js build with Edge runtime for API routes, not static export.

## Admin Features

- **Dashboard:** Overview stats, quick actions, GitHub sync status, and AI quick generate.
- **Content Manager:** Create, edit, filter, and publish posts with slug auto-generation.
- **Media Manager:** Drag-and-drop image uploads with secure validation.
- **Theme System:** Select and preview site themes.
- **Site & Account Settings:** Tabbed forms with validation.
- **AI Writer:** Generate About, SEO, Copyright, and Hero text with structured prompts.
- **GitHub Sync:** Push content changes to a GitHub repository.
- **Cloudflare Deployment:** Trigger and monitor Cloudflare Pages deployments.
- **Custom Domain:** Connect and manage custom domains.
- **User Management:** Owned sites list, data export, and account deletion.

## Mock Integrations

External service integrations (Google OAuth, Gemini, GitHub, Cloudflare R2/Pages) are currently mocked where credentials are not configured. Each service layer has `TODO` markers indicating where to implement real API calls once the corresponding environment variables are provided.

The local database adapter is also a mock implementation. To use Cloudflare D1 in production, bind the database and update `src/lib/db/client.ts`.

## Security

- Environment variables are centralized and validated in `src/config/env.ts`.
- The env module is server-only and will throw if imported on the client.
- All tenant data is scoped by `site_id`; admin APIs only return data belonging to the authenticated user&apos;s sites.
- File uploads are validated by MIME type, extension, magic bytes, and SVG content scanning.
- Sessions are signed with HMAC-SHA-256 and stored in httpOnly cookies.
- Danger-zone actions require explicit confirmation.
