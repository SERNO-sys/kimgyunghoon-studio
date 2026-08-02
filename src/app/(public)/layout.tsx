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
  const { site, settings, isMissing } = await getPublicSiteContext();

  // Unpublished or unknown sites render a minimal "not published" notice
  // instead of leaking draft content.
  if (isMissing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#fffdf8] p-8 text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Site not published
        </h1>
        <p className="mt-3 max-w-md text-stone-600">
          This site has not been published yet. Please publish it from the
          dashboard to make it publicly available.
        </p>
      </main>
    );
  }

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
