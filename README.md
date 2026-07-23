# KIM GYUNG HOON STUDIO

A static homepage for composer KIM GYUNG HOON, built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Content:** Markdown with gray-matter, remark, remark-html
- **Icons:** Lucide React
- **Deployment:** Cloudflare Pages (static export)

## Project Structure

- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Core data/logic modules
- `src/types/` - Shared TypeScript types
- `content/` - Markdown content (music, diary)
- `public/` - Static assets

## Getting Started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Build

```bash
npm run build
```

The static export is written to the `out/` directory.
