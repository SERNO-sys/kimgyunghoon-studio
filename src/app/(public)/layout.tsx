import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ThemeStyles } from '@/components/layout/ThemeStyles';
import { getSession } from '@/lib/admin/session';
import {
  flattenPages,
  getPublicSiteContext,
  resolveSiteConfig,
} from '@/lib/site-context';

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { site, settings } = await getPublicSiteContext();
  const config = resolveSiteConfig(site, settings);

  const allPages = flattenPages(config.pages)
    .filter((page) => page.visible)
    .sort((a, b) => a.order - b.order);
  const homeHref = '/';
  const navItems = allPages
    .filter((page) => page.path !== '/')
    .map((page) => ({ href: page.path, label: page.label }));

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
