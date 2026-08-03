import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeStyles } from '@/components/layout/ThemeStyles';
import { getDb } from '@/lib/db/client';
import { getSettingsBySiteId, getSiteById } from '@/lib/db/queries';
import { getSession } from '@/lib/admin/session';
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

  // Fixed/basic menu types (home, diary, about, contact) are always shown
  // before AI-generated custom pages, matching the admin sidebar order
  // [기본 메뉴 -> 커스텀 메뉴]. Within each group the stored `order` is kept.
  const fixedTypes = new Set(['home', 'diary', 'about', 'contact']);
  const allPages = flattenPages(config.pages)
    .filter((page) => page.visible)
    .sort((a, b) => {
      const aFixed = fixedTypes.has(a.type) ? 0 : 1;
      const bFixed = fixedTypes.has(b.type) ? 0 : 1;
      if (aFixed !== bFixed) return aFixed - bFixed;
      return a.order - b.order;
    });


  // On the tenant subdomain all navigation links must be clean relative paths
  // (e.g. `/`, `/notes`, `/gallery`) WITHOUT the `/sites/<siteId>` prefix; the
  // middleware maps those clean paths to the internal `/sites/<siteId>` routes.
  // Inside the admin preview iframe (main domain) we instead prefix every link
  // with `/sites/<siteId>` so navigation stays within the tenant site and never
  // escapes to a clean path on the main domain.
  const homeHref = `${linkPrefix}/`;
  const navItems = allPages
    .filter((page) => page.path !== '/')
    .map((page) => {
      const basePath = page.path === '/' ? '' : page.path;
      return { href: `${linkPrefix}${basePath}`, label: page.label };
    });


  const session = await getSession();
  if (session) {
    navItems.push({ href: '/admin', label: 'Dashboard' });
  }


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
