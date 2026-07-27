# KIM GYUNG HOON STUDIO - Architecture Specification

## 1. Tech Stack
- **Framework**: Next.js (Latest Stable, App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Content Engine**: File-based Pure Markdown Architecture (`gray-matter`, `remark`, `remark-html`)
- **Icons**: Lucide React
- **Deployment**: Cloudflare Pages (Static Export)

## 2. Directory Structure
```text
kimgyunghoon-studio/
├── docs/                       # Project Documentation
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Tasks.md
│   └── Roadmap.md
├── public/                     # Static Public Assets
│   └── images/
│       ├── covers/             # Album Covers
│       ├── banners/            # Hero & Site Banners
│       └── photos/             # Profile & Gallery Photos
├── content/                    # Pure Markdown Content Store
│   ├── music/                  # Music Items (.md)
│   │   ├── 2026-07-01-baekjung-prayer.md
│   │   └── 2026-07-15-waiting-for-you.md
│   └── diary/                  # Composition Diary Items (.md)
│       ├── 2026-07-20-diatonic.md
│       └── 2026-07-24-voicing.md
├── src/
│   ├── app/                    # App Router Pages
│   │   ├── page.tsx            # Home
│   │   ├── music/
│   │   │   ├── page.tsx        # Music List
│   │   │   └── [slug]/page.tsx # Music Detail
│   │   ├── diary/
│   │   │   ├── page.tsx        # Diary List
│   │   │   └── [slug]/page.tsx # Diary Detail
│   │   ├── about/page.tsx
│   │   └── contact/page.tsx
│   ├── components/             # Component Architecture
│   │   ├── sections/           # Home Sections (Hero, FeaturedMusic, LatestDiary, Philosophy)
│   │   ├── layout/             # Header, Footer, Nav
│   │   ├── music/              # Music UI Components
│   │   ├── diary/              # Diary UI Components
│   │   └── ui/                 # Atomic UI Components
│   ├── lib/                    # Decoupled Core Logic
│   │   ├── markdown.ts         # Generic Markdown Parser
│   │   ├── music.ts            # Music Data Fetchers
│   │   ├── diary.ts            # Diary Data Fetchers
│   │   └── relations.ts        # Cross-Referencing Engine
│   ├── types/                  # Shared TypeScript Types
│   │   ├── music.ts
│   │   ├── diary.ts
│   │   ├── navigation.ts
│   │   └── common.ts
│   └── styles/
│       └── globals.css