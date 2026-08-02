# Deployment Guide

## Prerequisites

- A Git repository connected to Cloudflare Pages
- A Cloudflare account
- The production domain and official contact email

## Configure the Site

Before deployment, update `src/lib/site.ts` with the real values:

- `url`: the full canonical production URL, including `https://`
- `contactEmail`: the official email address used by the contact page and footer

The `url` value is used by canonical metadata, OpenGraph metadata, JSON-LD, `sitemap.xml`, and `robots.txt`.

Update the channel URLs in `src/app/contact/page.tsx` and `src/components/layout/Footer.tsx` to their official destinations before publishing.

## Build Locally

```bash
npm install
npm run pages:build
```

This project uses `@cloudflare/next-on-pages` to build an **edge application** (dynamic routes, API routes, middleware, D1/R2 bindings). The build produces the deployable output in `.vercel/output/static` plus a `_worker.js` edge function.

> **Windows note:** `@cloudflare/next-on-pages` internally invokes the Vercel CLI, which requires WSL on Windows. If you are on Windows, run the build inside WSL or rely on Cloudflare's Linux build servers (git integration). The Cloudflare Pages build itself runs on Linux and works fine.

## Cloudflare Pages

1. In Cloudflare Dashboard, open **Workers & Pages** and select **Create application**.
2. Select **Pages** and connect the repository.
3. Use the following build settings (this is critical — using the wrong build command/output directory will deploy only static files and no edge functions):
   - Framework preset: `None`
   - Build command: `npm run pages:build`
   - Build output directory: `.vercel/output/static`
   - Node.js version: `20` or later
4. Save and deploy.
5. Open the generated `*.pages.dev` URL and verify the home, music, diary, about, contact, sitemap, and robots routes.

> **Important:** The build output directory **must** be `.vercel/output/static` (not `out`). This is where `@cloudflare/next-on-pages` writes the static assets alongside the generated `_worker.js` edge function. If the output directory is wrong, Cloudflare Pages will upload only static files and no Functions/Workers will appear in **Deployment Details → Functions**, causing 500 errors on dynamic routes.


## Custom Domain

1. In the Cloudflare Pages project, open **Custom domains**.
2. Add the production domain and complete the DNS instructions.
3. Confirm that HTTPS is active.
4. Update `src/lib/site.ts` with that exact HTTPS domain and deploy again.
5. Confirm the canonical URL, OpenGraph URL, `https://<domain>/sitemap.xml`, and `https://<domain>/robots.txt`.

## Deployment Verification

- Confirm all navigation links work on mobile and desktop.
- Confirm `/sitemap.xml` includes static, music, and diary pages.
- Confirm `/robots.txt` references the production sitemap.
- Confirm contact email and external channel links use their official values.
- Confirm social previews use the favicon-based OpenGraph image.
