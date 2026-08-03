import { Hero } from '@/components/sections/Hero';
import { LatestPosts } from '@/components/sections/LatestPosts';
import { Philosophy } from '@/components/sections/Philosophy';
import { getSiteData } from '@/lib/site-data';
import { parseSettings, resolveSiteConfig } from '@/lib/site-context';

export const runtime = 'edge';


interface SitePageProps {
  params: Promise<{ siteId: string }>;
}

export default async function SitePage({ params }: SitePageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings, posts } = data;
  const parsed = parseSettings(settings);
  const config = resolveSiteConfig(site, settings);

  const description =
    String(parsed.general.description || site.description || '');
  const heroTitle = String(parsed.general.hero_title ?? 'ABOUT US');
  const heroSubtitle = String(
    parsed.general.hero_subtitle ??
      '진정성 있는 기록과 이야기를 담아내는 공간입니다.'
  );
  const philosophyText = String(
    parsed.general.philosophy_text ??
      '일상의 감정과 소중한 기록들을 차곡차곡 쌓아갑니다.'
  );

  return (
    <main>
      <Hero
        siteName={site.name}
        description={description}
        imageUrl={
          String(parsed.general.hero_image_url ?? '') || '/banner.jpg'
        }
        themeColors={config.themeColors}
      />
      <LatestPosts
        posts={posts}
        emptyText=""
        themeColors={config.themeColors}
      />

      <Philosophy label={heroTitle} title={heroSubtitle} content={philosophyText} />
    </main>
  );
}
