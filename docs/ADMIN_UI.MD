\# Admin UI Specification



Version 2.0 (Dynamic SaaS WebApp Architecture)



Project

Site Builder CMS



\---



\# 1. Overview



The Admin Dashboard is the control center of Version 2.



Every management feature begins here.



The dashboard must allow complete beginners to manage their website without editing source code, Markdown files, or infrastructure settings.



No GitHub UI required.

No Cloudflare UI required.

No Markdown manual editing.

No Hardcoded Static Templates in React Components.



Everything is dynamically managed through UI and bound to Cloudflare D1 Database and JSON Configurations.



\---



\# 2. Design Principles \& SaaS Architecture Rules



The interface and component architecture MUST follow these strict principles:



\- \*\*Zero Hardcoding\*\*: Never place static texts, personal names, specific template content, audio paths, or fixed image URLs inside React components.

\- \*\*Pure Presentational Components\*\*: Components only render data passed dynamically from the Service Layer, Cloudflare D1 Database, or JSON configs for the given `siteId`.

\- \*\*Dynamic Site Isolation\*\*: Every site created via `/admin/setup` operates as an independent dynamic web app.

\- \*\*Simple \& Beginner Friendly\*\*: Every screen has one clear purpose with minimal clicks.



\---



\# 3. Dashboard Layout



+----------------------------------------------------------+

| Logo | Site Name | Search | Notification | User Profile  |

+----------------------+-----------------------------------+

| Sidebar              |                                   |

| - Dashboard          | Main Workspace Area               |

| - Posts              | (Pure Dynamic Presentational UI)  |

| - Pages              |                                   |

| - Media              |                                   |

| - Appearance         |                                   |

| - Site Settings      |                                   |

| - SEO                |                                   |

| - AI Assistant       |                                   |

| - Deployment         |                                   |

| - Domain             |                                   |

| - Account            |                                   |

+----------------------+-----------------------------------+





\---



\# 4. Sidebar Navigation



\- Dashboard

\- Posts

\- Pages

\- Media

\- Appearance

\- Site Settings

\- SEO

\- AI Assistant

\- Deployment

\- Domain

\- Account



Each menu owns one single responsibility and handles data exclusively via APIs and D1 database queries.



\---



\# 5. Dashboard Home



Purpose: Provide overall project status for the currently active site (`siteId`).



Widgets (Dynamic Data Only):

\- Recent Posts (Fetched from D1)

\- Deployment Status

\- Storage Usage (Cloudflare R2)

\- Latest Activity Log

\- Website Status

\- Quick Actions

\- Recent AI Activity



Quick Actions:

\- Create Post

\- Upload Image

\- Deploy Site

\- Open Public Website (`/sites/\[siteId]`)

\- Site Settings



\---



\# 6. Posts (Content Management)



Purpose: Manage blog articles and content entries dynamically.



Functions:

\- Create, Edit, Delete, Preview, Draft, Publish, Unpublish, Duplicate, Search, Filter, Sort



Data Rule:

\- All post lists and contents are retrieved from D1 or synchronized Markdown repositories via API. No static dummy posts inside code.



\---



\# 7. Post Editor



Purpose: Dynamic article creation and editing interface.



Sections:

\- Title, Slug (Auto-generated), Category, Tags, Featured Image, Editor (Tiptap/Markdown), SEO Metadata, Publishing Controls



Editor Toolbar:

\- Formatting tools, Image insertion (R2 URL bound), AI Assist Modal



\---



\# 8. Pages



Purpose: Manage static page configurations dynamically.



Supported Dynamic Types:

\- Standard Page, Landing Page, Portfolio Page, Contact Page



Rule:

\- Page layouts render dynamically based on D1/JSON definitions (`site.json`, `pages` table in D1). Do not hardcode static layout components for specific templates.



\---



\# 9. Media Library (Cloudflare R2)



Purpose: Centralized media asset management with automatic WebP compression.



Upload Flow:

Drag \& Drop -> Validation -> Compression/WebP -> Upload to Cloudflare R2 -> Store Metadata in D1 -> Return Public R2 URL -> Bind to Editor/Settings



\---



\# 10. Appearance \& Theme Engine



Purpose: Customize website design without changing source code.



Modules:

\- Themes Selection (Updates `theme.json` dynamic config)

\- Navigation Manager (Updates `navigation.json` dynamically)

\- Footer Manager (Updates `footer` dynamic settings)

\- Homepage Hero / Banner Settings



Rule:

\- Changing themes or appearance MUST only update JSON configuration values or D1 rows. It must NEVER modify or rewrite React component source files.



\---



\# 11. Site Settings



Purpose: Configure global website metadata for the active `siteId`.



Sections (Stored in D1 / `site.json`):

\- General: Site Name, Description, Language, Timezone

\- Contact: Public Email, Phone, Address

\- Social: Links to YouTube, Instagram, GitHub, etc.

\- Localization \& Maintenance Mode



\---



\# 12. SEO



Purpose: Manage search engine optimization metadata dynamically.



Features:

\- Global SEODefaults, Open Graph Images, Twitter Cards, Schema.org Structured Data

\- All fields dynamically read from `seo.json` or D1 `sites` table.



\---



\# 13. AI Assistant (Google Gemini)



Purpose: Assist in generating and improving content safely.



Rules:

\- AI is strictly a writing assistant. It NEVER publishes content automatically.

\- Generated text is presented for preview and inserted into the editor only upon user confirmation.



\---



\# 14. Deployment



Purpose: Manage Cloudflare Pages deployment status transparently without requiring Git terminal knowledge.



Features:

\- Current Build Status, Deployment History, Trigger Deployment, Build Logs



\---



\# 15. Domain Manager



Purpose: Connect custom domains via Cloudflare API.



Features:

\- Domain Format Validation, Ownership Check, DNS / SSL Status Display



\---



\# 16. Account \& Security



Purpose: Manage authenticated user profile.



Authentication Rule:

\- \*\*Google OAuth Only\*\* (or System Secret Key).

\- \*\*NO Password Login, NO Password Reset/Change Forms\*\*.



Features:

\- Display Name, Profile Avatar (Google OAuth sync), Session Info, Current Active Sites, Logout



\---



\# 17. User Journey \& Public Site Routing



1\. \*\*Setup Journey\*\*: First-time user completes `/admin/setup` -> D1 inserts initial dynamic site record and seed data -> Redirects to Dashboard.

2\. \*\*Public Viewing Journey\*\*: Clicking `Open Website` or navigating to `/sites/\[siteId]` renders the pure dynamic public view using ONLY the active D1/JSON data. Fallback UI appears gracefully if no content exists, with zero hardcoded legacy text.



\---



\# End of Document

