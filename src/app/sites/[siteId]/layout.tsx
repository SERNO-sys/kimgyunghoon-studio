import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeStyles } from '@/components/layout/ThemeStyles';
import { getDb } from '@/lib/db/client';
import { getSettingsBySiteId, getSiteById } from '@/lib/db/queries';
import { flattenPages, resolveSiteConfig } from '@/lib/site-context';
import type { SitePage } from '@/lib/db/types';

/**
 * Merges the legacy navigation pages (config.pages from resolvePages, which
 * falls back to HOME/DIARY/ABOUT/CONTACT) with the AWIE-generated pages
 * (themeConfig.pages). Legacy entries win for the same path so the core
 * ABOUT/DIARY/CONTACT navigation is always preserved, while AWIE pages
 * (Gallery, Products, etc.) are appended as additional navigation entries.
 */
function mergeNavigationPages(
  legacyPages: SitePage[],
  themePages: SitePage[]
): SitePage[] {
  const byPath = new Map<string, SitePage>();
  for (const page of legacyPages) {
    byPath.set(page.path, page);
  }
  for (const page of themePages) {
    if (!byPath.has(page.path)) {
      byPath.set(page.path, page);
    }
  }
  return Array.from(byPath.values());
}



interface SiteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}

export default async function SiteLayout({
  children,
  params,
}: SiteLayoutProps) {
  const { siteId } = await params;
  const db = getDb();
  const site = await getSiteById(db, siteId);
  if (!site) {
    notFound();
  }

  // Detect whether this tenant site is being served through the admin preview
  // iframe (main domain, `/sites/<siteId>`) or on its own tenant subdomain.
  // The middleware sets `x-site-id` ONLY when it rewrites a tenant subdomain /
  // custom-domain request. A direct `/sites/<siteId>` request (the preview
  // iframe src) passes through WITHOUT that header, so its absence tells us we
  // are inside the preview. In preview mode every internal link must be
  // prefixed with `/sites/<siteId>` so clicking a nav item stays inside the
  // tenant site instead of navigating the iframe to a clean path on the main
  // domain (the "frame-in-frame" bug).
  const headersList = await headers();
  const isPreview = !headersList.get('x-site-id');
  const linkPrefix = isPreview ? `/sites/${site.id}` : '';


  const settings = await getSettingsBySiteId(db, site.id);
  const config = resolveSiteConfig(site, settings);

  // Navigation restoration: the tenant site header menu is driven by the
  // legacy navigation pages (config.pages from resolvePages, which falls back
  // to HOME/DIARY/ABOUT/CONTACT) MERGED with the AI-generated
  // `themeConfig.pages` array (Gallery, Products, Services, etc.). Each menu
  // item links to a REAL page route (`/about`, `/diary`, `/contact`,
  // `/gallery`, ...) so every menu is a genuine entry point that renders its
  // own page — not a `#section` anchor on a single-page layout. The HOME item
  // stays at `/` (the tenant homepage).
  const legacyPages = config.pages ?? [];
  const themePages = config.themeConfig.pages ?? [];

  const allPages = flattenPages(
    mergeNavigationPages(legacyPages, themePages)
  ).filter((page) => page.visible);


  // On the tenant subdomain all navigation links are clean relative paths
  // WITHOUT the `/sites/<siteId>` prefix; the middleware maps those clean paths
  // to the internal `/sites/<siteId>` routes. Inside the admin preview iframe
  // (main domain) we prefix every link with `/sites/<siteId>` so navigation
  // stays within the tenant site.
  const homeHref = `${linkPrefix}/`;
  const navItems = allPages
    .filter((page) => page.path !== '/')
    .map((page) => {
      // Each menu item is a real page route. Normalize the path so it is a
      // clean relative path (e.g. `/about`, `/gallery`) that the middleware
      // maps to the internal `/sites/<siteId>/<path>` route.
      const cleanPath = page.path.startsWith('/')
        ? page.path
        : `/${page.path}`;
      return { href: `${linkPrefix}${cleanPath}`, label: page.label };
    });




  return (

    <>
      <ThemeStyles
        themeColors={config.themeColors}
        themeConfig={config.themeConfig}
        fontPairing={config.fontPairing}
      />

      <Header
        siteName={config.name}
        homeHref={homeHref}
        navItems={navItems}
        themeColors={config.themeColors}
      />
      <div
        className="theme-content flex flex-1 flex-col"
        style={{
          backgroundColor: config.themeColors.background,
          color: config.themeColors.foreground,
        }}
      >
        {children}
      </div>
      <Footer
        siteName={config.name}
        email={config.email}
        phone={config.phone}
        themeColors={config.themeColors}
        socialUrls={{
          youtubeUrl: config.youtubeUrl,
          instagramUrl: config.instagramUrl,
          twitterUrl: config.twitterUrl,
          tiktokUrl: config.tiktokUrl,
          facebookUrl: config.facebookUrl,
          soundcloudUrl: config.soundcloudUrl,
          spotifyUrl: config.spotifyUrl,
          threadsUrl: config.threadsUrl,
        }}
      />
    </>
  );
}
