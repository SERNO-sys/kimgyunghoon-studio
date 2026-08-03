import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeStyles } from '@/components/layout/ThemeStyles';
import { getDb } from '@/lib/db/client';
import { getSettingsBySiteId, getSiteById } from '@/lib/db/queries';
import { flattenPages, resolveSiteConfig } from '@/lib/site-context';


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

  // V2 modular navigation: the tenant site is a one-page (SPA) layout built
  // from `themeConfig.sections`. The header menu is driven EXCLUSIVELY by the
  // AI-generated `themeConfig.pages` array (Home, Portfolio, etc.) — we never
  // fall back to the legacy hardcoded DIARY/ABOUT/CONTACT set. Each menu item
  // maps to the matching section anchor (`#<section>`) so clicking it smooth-
  // scrolls to that section on the same page.
  const themePages = config.themeConfig.pages ?? [];
  const themeSections = config.themeConfig.sections ?? [];

  // Map a page to the section anchor it should scroll to. We prefer the page's
  // own `path` (e.g. `/portfolio` -> `#portfolio`), then fall back to a
  // type-based mapping, and finally to the first available section.
  const typeToSection: Record<string, string> = {
    home: 'hero',
    about: 'about',
    contact: 'contact',
    diary: 'blog',
    blog: 'blog',
    posts: 'blog',
    music: 'gallery',
    gallery: 'gallery',
  };

  const allPages = flattenPages(themePages).filter((page) => page.visible);

  // On the tenant subdomain all navigation links are clean relative paths
  // WITHOUT the `/sites/<siteId>` prefix; the middleware maps those clean paths
  // to the internal `/sites/<siteId>` routes. Inside the admin preview iframe
  // (main domain) we prefix every link with `/sites/<siteId>` so navigation
  // stays within the tenant site.
  const homeHref = `${linkPrefix}/`;
  const navItems = allPages
    .filter((page) => page.path !== '/')
    .map((page) => {
      // Resolve the target section anchor for this menu item.
      const pathSection = page.path.replace(/^\/+/, '').replace(/\/+$/, '');
      const mappedSection =
        (pathSection && themeSections.includes(pathSection) && pathSection) ||
        typeToSection[page.type] ||
        (themeSections.length > 0 ? themeSections[0] : 'hero');
      const anchor = `#${mappedSection}`;
      return { href: `${linkPrefix}${anchor}`, label: page.label };
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
