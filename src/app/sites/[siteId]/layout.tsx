import { notFound } from 'next/navigation';

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

  const settings = await getSettingsBySiteId(db, site.id);
  const config = resolveSiteConfig(site, settings);

  const allPages = flattenPages(config.pages)
    .filter((page) => page.visible)
    .sort((a, b) => a.order - b.order);

  // The tenant site is served on its own subdomain (e.g.
  // `50bd00da.lucidworker.com`), so all navigation links must be clean relative
  // paths (e.g. `/`, `/notes`, `/gallery`) WITHOUT the `/sites/<siteId>` prefix.
  // The middleware maps these clean paths to the internal `/sites/<siteId>`
  // routes. Prefixing them here would cause a double-prefix 404.
  const homeHref = '/';
  const navItems = allPages
    .filter((page) => page.path !== '/')
    .map((page) => {
      const basePath = page.path === '/' ? '' : page.path;
      return { href: basePath, label: page.label };
    });


  const session = await getSession();
  if (session) {
    navItems.push({ href: '/admin', label: 'Dashboard' });
  }

  return (
    <>
      <ThemeStyles themeColors={config.themeColors} />
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
