# KIM GYUNG HOON STUDIO

Composer KIM GYUNG HOON's personal website and content management system, built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Dual Architecture

This project is structured as a dual architecture:

- **V1 (Public Website):** The public-facing site under `(public)` route group, including `/`, `/about`, `/music`, `/diary`, and `/contact`. This is the protected creative area that preserves the original website structure.
- **V2 (Admin Dashboard):** The administration system under `/admin`, providing content management, media library, theme system, AI writer, GitHub sync, Cloudflare deployment, custom domain management, and user/account settings.

V1 and V2 share the same Next.js build but are isolated by route groups so that admin development never affects the public website.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** Edge runtime for API routes
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Forms & Validation:** React Hook Form + Zod
- **UI Components:** Custom shadcn/ui-inspired components
- **Content:** Markdown with gray-matter, remark, remark-html
- **Icons:** Lucide React
- **Authentication:** Google OAuth with signed session cookies
- **Deployment:** Cloudflare Pages (Edge runtime build)

## Project Structure

- `src/app/(public)/` - Public website pages (V1)
- `src/app/admin/` - Admin dashboard pages and API routes (V2)
- `src/app/api/admin/` - Admin API route handlers
- `src/app/api/auth/` - Authentication API route handlers
- `src/components/admin/` - Admin dashboard components
- `src/components/ui/` - Shared UI primitives
- `src/components/layout/` - Public layout components (Header, Footer)
- `src/lib/admin/` - Admin domain logic and mock stores
- `src/lib/ai/` - AI Writer service layer and prompt templates
- `src/lib/cloudflare/` - Cloudflare deployment and domain services
- `src/lib/github/` - GitHub repository sync services
- `src/lib/security/` - Security utilities (file upload validation)
- `src/config/env.ts` - Centralized environment variable validation
- `content/` - Markdown content (music, diary)
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

4. Open [http://localhost:3000](http://localhost:3000) to view the public site, and [http://localhost:3000/admin](http://localhost:3000/admin) to access the admin dashboard.

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

## Security

- Environment variables are centralized and validated in `src/config/env.ts`.
- The env module is server-only and will throw if imported on the client.
- File uploads are validated by MIME type, extension, magic bytes, and SVG content scanning.
- Sessions are signed with HMAC-SHA-256 and stored in httpOnly cookies.
- Danger-zone actions require explicit confirmation.
